import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const TASKS_KEY = "jarvis:tasks";

function parseTasks(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return JSON.parse(parsed);
      return parsed;
    } catch { return []; }
  }
  return [];
}

/** AU date string (YYYY-MM-DD) for a given Date in Australia/Sydney tz */
function auDateStr(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

/** Build a UTC ISO for "midnight in Australia/Sydney on the given YYYY-MM-DD date". */
function sydneyMidnightUtcIso(dateYmd: string): string {
  // dateYmd like "2026-09-07" — we want Sydney midnight (00:00) on that calendar date
  // in UTC. DST-safe: converge via Intl-format offsets.
  const tz = "Australia/Sydney";
  let utcMs = Date.UTC(
    parseInt(dateYmd.slice(0, 4)),
    parseInt(dateYmd.slice(5, 7)) - 1,
    parseInt(dateYmd.slice(8, 10))
  );
  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(utcMs));
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
    const wallYmd = `${get("year")}-${get("month")}-${get("day")}`;
    const wallHms = `${get("hour")}:${get("minute")}:${get("second")}`;
    if (wallYmd === dateYmd && wallHms === "00:00:00") {
      return new Date(utcMs).toISOString();
    }
    const diffYmdDays = (Date.UTC(
      parseInt(dateYmd.slice(0,4)),
      parseInt(dateYmd.slice(5,7)) - 1,
      parseInt(dateYmd.slice(8,10))
    ) - Date.UTC(
      parseInt(get("year")),
      parseInt(get("month")) - 1,
      parseInt(get("day"))
    )) / 86400000;
    const targetWallHmsMs =
      parseInt(get("hour")) * 3600000 +
      parseInt(get("minute")) * 60000 +
      parseInt(get("second")) * 1000;
    const wallShiftMs = diffYmdDays * 86400000 - targetWallHmsMs;
    utcMs += wallShiftMs;
  }
  return new Date(utcMs).toISOString();
}

async function getAccessToken(): Promise<string | null> {
  const accessToken = await redis.get<string>("jarvis:google_access_token");
  const expiry = await redis.get<string>("jarvis:google_token_expiry");
  if (accessToken && expiry && Date.now() < parseInt(expiry)) return accessToken;

  const refreshToken = await redis.get<string>("jarvis:google_refresh_token");
  if (!refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const tokens = await res.json();
  await redis.set("jarvis:google_access_token", tokens.access_token);
  if (tokens.expiry_date) await redis.set("jarvis:google_token_expiry", String(tokens.expiry_date));
  return tokens.access_token;
}

/** Decide which coach owns this calendar event. Default = Milzzy (does initial consults). */
function inferOwner(_event: any): "Milzzy" | "Miggy" {
  // Future enhancement: parse attendees / organizer / title for "Miggy" string.
  // For now, all auto-synced tasks land on Milzzy's queue — easy to reassign manually.
  return "Milzzy";
}

/**
 * POST /api/tasks/sync-calendar
 * Pulls today's meetings from Google Calendar and reconciles them with tasks in Redis.
 * - Creates a task for each new meeting
 * - Updates existing tasks if time/title changed
 * - Archives auto-created tasks whose meeting no longer exists for today
 *
 * Query params:
 *   ?days=N  — sync the next N days (default 1 = today only; pass 7 for the week)
 *   ?owner=Miggy  — assign new tasks to Miggy instead of Milzzy (used for Miggy's coach view)
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(14, Math.max(1, parseInt(searchParams.get("days") || "1")));
  const forcedOwner = (searchParams.get("owner") === "Miggy" ? "Miggy" : null) as "Miggy" | null;

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ ok: false, error: "not_authorized", created: 0, updated: 0, archived: 0 });
  }

  // Window: start of "today" in Sydney → start of (today + days) Sydney
  const todayYmd = auDateStr(new Date());
  const startIso = sydneyMidnightUtcIso(todayYmd);
  const endDate = new Date(`${todayYmd}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + days);
  const endYmd = auDateStr(endDate);
  const endIso = sydneyMidnightUtcIso(endYmd);

  const calendarRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: startIso,
        timeMax: endIso,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!calendarRes.ok) {
    return NextResponse.json({ ok: false, error: "calendar_api_error", created: 0, updated: 0, archived: 0 }, { status: 200 });
  }

  const data = await calendarRes.json();
  const allItems: any[] = data.items || [];

  // Same meeting filter as the dashboard panel
  const MEETING_TITLE_RE = /\b(call|meet|meeting|consult|consultation|consulting|zoom|teams|sync|standup|stand-up|interview|chat|1[\s-]?on[\s-]?1)\b/i;
  const isMeeting = (e: any): boolean => {
    if (e.hangoutLink) return true;
    if (e.conferenceData?.entryPoints?.length) return true;
    if (Array.isArray(e.attendees) && e.attendees.length > 0) return true;
    if (typeof e.summary === "string" && MEETING_TITLE_RE.test(e.summary)) return true;
    return false;
  };

  const meetings = allItems.filter(isMeeting);

  // Map meeting → { calendarEventId, title, startISO, startDateSydney, timeStr, meetLink, owner }
  const syncedMeetings = meetings.map((e: any) => {
    const startStr = e.start?.dateTime || e.start?.date;
    const startDate = new Date(startStr);
    const timeStr = startDate.toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit" });
    const startDateSydney = auDateStr(startDate);
    return {
      calendarEventId: e.id,
      title: e.summary || "(No title)",
      startISO: startStr,
      startDateSydney,
      timeStr,
      meetLink: e.hangoutLink || null,
      owner: forcedOwner || inferOwner(e),
    };
  });

  const syncedIds = new Set(syncedMeetings.map((m) => m.calendarEventId));

  // Load existing tasks
  const raw = await redis.get(TASKS_KEY);
  let tasks = parseTasks(raw);
  if (!Array.isArray(tasks)) tasks = [];

  let created = 0, updated = 0, archived = 0;

  // 1) Create or update for each meeting
  for (const m of syncedMeetings) {
    const existing = tasks.find((t: any) => t.calendarEventId === m.calendarEventId);

    if (!existing) {
      const task = {
        id: `cal_${m.calendarEventId}`,
        title: m.title,
        text: m.title,
        done: false,
        createdAt: new Date().toISOString(),
        day: m.startDateSydney,
        author: m.owner,
        owner: m.owner,
        clientId: null,
        category: "Meeting",
        priority: "high",
        dueDate: m.startDateSydney,
        sortOrder: -100, // pin near top of its day column
        notes: `📅 Auto-added from Google Calendar · ${m.timeStr} AEST/AEDT\n🔗 ${m.meetLink || "(no link)"}`,
        meetLink: m.meetLink,
        calendarEventId: m.calendarEventId,
        source: "google-calendar",
        eventStart: m.startISO,
        status: "open",
      };
      tasks.push(task);
      created++;
    } else {
      // Update time/title/owner if anything changed
      const next: Record<string, unknown> = {};
      if (existing.title !== m.title) next.title = m.title;
      if (existing.text !== m.title) next.text = m.title;
      if (existing.dueDate !== m.startDateSydney) next.dueDate = m.startDateSydney;
      if (existing.day !== m.startDateSydney) next.day = m.startDateSydney;
      if (existing.meetLink !== m.meetLink) next.meetLink = m.meetLink;
      if (existing.eventStart !== m.startISO) next.eventStart = m.startISO;
      if (existing.owner !== m.owner) { next.owner = m.owner; next.author = m.owner; }
      // Keep notes in sync so the time badge stays current
      const expectedNotes = `📅 Auto-added from Google Calendar · ${m.timeStr} AEST/AEDT\n🔗 ${m.meetLink || "(no link)"}`;
      if (existing.notes !== expectedNotes) next.notes = expectedNotes;

      if (Object.keys(next).length > 0) {
        const idx = tasks.indexOf(existing);
        tasks[idx] = { ...existing, ...next };
        updated++;
      }
    }
  }

  // 2) Archive any auto-created task whose meeting is no longer in the synced window
  for (let i = 0; i < tasks.length; i++) {
    const t: any = tasks[i];
    if (t.source !== "google-calendar") continue;
    if (!t.calendarEventId) continue;
    if (syncedIds.has(t.calendarEventId)) continue;
    // Only auto-archive tasks in the upcoming window (not historical ones from past days)
    if (t.dueDate && t.dueDate < auDateStr(new Date())) continue;
    if (!t.archived) {
      tasks[i] = { ...t, archived: true };
      archived++;
    }
  }

  await redis.set(TASKS_KEY, JSON.stringify(tasks));

  return NextResponse.json({
    ok: true,
    created,
    updated,
    archived,
    meetings: syncedMeetings.map((m) => ({
      title: m.title,
      time: m.timeStr,
      date: m.startDateSydney,
      meetLink: m.meetLink,
    })),
  });
}
