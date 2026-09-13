import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonArray } from "@/lib/redis";

export const dynamic = "force-dynamic";

// All meetings — list of MeetingRecord objects (drafts + closed history).
// Schema:
//   { id, title, date, attendees, agenda, notes, actionItems,
//     status: "draft" | "closed", createdAt, closedAt?, updatedAt, updatedBy }

// GET /api/team/meeting → returns all meetings (newest first), with a derived `active`
//   pointer to the current draft (most-recent draft) or null if none.
export async function GET() {
  try {
    const redis = getRedis();

    // One-time migration: if legacy single-meeting key exists and new list is empty,
    // seed the list with that meeting as a draft and delete the legacy key.
    const [rawList, rawLegacy] = await Promise.all([
      redis.get(TEAM_KEYS.meeting),
      redis.get(TEAM_KEYS.meetingLegacy),
    ]);
    let meetings = parseJsonArray<MeetingRecord>(rawList);
    if (meetings.length === 0 && rawLegacy) {
      const legacy = typeof rawLegacy === "object" ? rawLegacy as any : parseJsonObject<MeetingRecord>(rawLegacy);
      if (legacy && (legacy.title || legacy.agenda?.length || legacy.notes || legacy.actionItems?.length)) {
        const migrated: MeetingRecord = normaliseMeeting({
          ...legacy,
          id: legacy.id || `meet_${Math.random().toString(36).slice(2, 8)}`,
          status: "draft",
          createdAt: legacy.createdAt || legacy.updatedAt || new Date().toISOString(),
        });
        meetings = [migrated];
        await redis.set(TEAM_KEYS.meeting, JSON.stringify(meetings));
      }
      await redis.del(TEAM_KEYS.meetingLegacy);
    }

    // Sort newest first (by createdAt/updatedAt desc)
    meetings.sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
    const active = meetings.find((m) => m.status === "draft") || null;

    return NextResponse.json({ meetings, active });
  } catch (err) {
    console.error("GET /api/team/meeting error:", err);
    return NextResponse.json({ meetings: [], active: null });
  }
}

// POST /api/team/meeting → create a fresh draft (empty meeting). Returns the new draft.
export async function POST() {
  try {
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.meeting);
    const meetings = parseJsonArray<MeetingRecord>(raw);
    const now = new Date().toISOString();
    const draft: MeetingRecord = normaliseMeeting({
      id: `meet_${Math.random().toString(36).slice(2, 8)}`,
      title: "",
      date: now.slice(0, 10),
      attendees: ["Milzzy", "Miggy", "Sonta"],
      agenda: [],
      notes: "",
      actionItems: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
      updatedBy: "Milzzy",
    });
    // If there's already an active draft, refuse (caller should close it first).
    if (meetings.some((m) => m.status === "draft")) {
      return NextResponse.json({ error: "An active draft already exists — close it first" }, { status: 409 });
    }
    meetings.unshift(draft);
    await redis.set(TEAM_KEYS.meeting, JSON.stringify(meetings));
    return NextResponse.json({ meeting: draft, meetings });
  } catch (err) {
    console.error("POST /api/team/meeting error:", err);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}

// PUT /api/team/meeting → body: { id, patch } — partial update of a meeting (auto-save).
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.meeting);
    const meetings = parseJsonArray<MeetingRecord>(raw);
    const idx = meetings.findIndex((m) => m.id === body.id);
    if (idx < 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    meetings[idx] = normaliseMeeting({ ...meetings[idx], ...body.patch, updatedAt: now, updatedBy: body.updatedBy || meetings[idx].updatedBy || "Milzzy" });
    await redis.set(TEAM_KEYS.meeting, JSON.stringify(meetings));
    return NextResponse.json({ meeting: meetings[idx], meetings });
  } catch (err) {
    console.error("PUT /api/team/meeting error:", err);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

// DELETE /api/team/meeting → body: { id } — remove from history.
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.meeting);
    const meetings = parseJsonArray<MeetingRecord>(raw);
    const filtered = meetings.filter((m) => m.id !== body.id);
    await redis.set(TEAM_KEYS.meeting, JSON.stringify(filtered));
    return NextResponse.json({ meetings: filtered });
  } catch (err) {
    console.error("DELETE /api/team/meeting error:", err);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}

function parseJsonObject<T = unknown>(raw: unknown): T | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as T;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed as T;
    } catch {
      return null;
    }
  }
  return null;
}

function normaliseMeeting(m: any): MeetingRecord {
  return {
    id: typeof m?.id === "string" ? m.id : `meet_${Math.random().toString(36).slice(2, 8)}`,
    title: typeof m?.title === "string" ? m.title : "",
    date: typeof m?.date === "string" ? m.date : new Date().toISOString().slice(0, 10),
    attendees: Array.isArray(m?.attendees) ? m.attendees.filter((a: any) => ["Milzzy", "Miggy", "Sonta"].includes(a)) : ["Milzzy", "Miggy", "Sonta"],
    agenda: normaliseAgenda(m?.agenda),
    notes: typeof m?.notes === "string" ? m.notes : "",
    actionItems: normaliseActions(m?.actionItems),
    status: m?.status === "closed" ? "closed" : "draft",
    createdAt: typeof m?.createdAt === "string" ? m.createdAt : new Date().toISOString(),
    closedAt: typeof m?.closedAt === "string" ? m.closedAt : undefined,
    updatedAt: typeof m?.updatedAt === "string" ? m.updatedAt : new Date().toISOString(),
    updatedBy: typeof m?.updatedBy === "string" ? m.updatedBy : "Milzzy",
  };
}

function normaliseAgenda(raw: any): AgendaItem[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((it: any) => typeof it?.text === "string")
      .map((it: any) => ({
        id: typeof it.id === "string" ? it.id : `ag_${Math.random().toString(36).slice(2, 8)}`,
        text: it.text,
        done: !!it.done,
      }));
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean)
      .map((text: string) => ({ id: `ag_${Math.random().toString(36).slice(2, 8)}`, text, done: false }));
  }
  return [];
}

function normaliseActions(raw: any): ActionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it: any) => typeof it?.text === "string")
    .map((it: any) => ({
      id: typeof it.id === "string" ? it.id : `a_${Math.random().toString(36).slice(2, 8)}`,
      text: it.text,
      owner: ["Milzzy", "Miggy", "Sonta", "Shared"].includes(it.owner) ? it.owner : "Shared",
      done: !!it.done,
    }));
}

export interface AgendaItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ActionItem {
  id: string;
  text: string;
  owner: "Milzzy" | "Miggy" | "Sonta" | "Shared";
  done: boolean;
}

export interface MeetingRecord {
  id: string;
  title: string;
  date: string;
  attendees: ("Milzzy" | "Miggy" | "Sonta")[];
  agenda: AgendaItem[];
  notes: string;
  actionItems: ActionItem[];
  status: "draft" | "closed";
  createdAt: string;
  closedAt?: string;
  updatedAt: string;
  updatedBy: string;
}
