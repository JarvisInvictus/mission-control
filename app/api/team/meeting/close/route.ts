import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonArray } from "@/lib/redis";
import type { MeetingRecord } from "../route";

export const dynamic = "force-dynamic";

// POST /api/team/meeting/close → body: { id }
// Closes the meeting (status="closed"), auto-generates a summary title from the date,
// and creates a fresh empty draft as the new active meeting.
export async function POST(req: NextRequest) {
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
    const closed: MeetingRecord = {
      ...meetings[idx],
      status: "closed",
      title: autoTitle(meetings[idx]),
      closedAt: now,
      updatedAt: now,
    };
    meetings[idx] = closed;

    // Create the next draft (unless one already exists — shouldn't, but be safe)
    const alreadyDraft = meetings.some((m) => m.status === "draft" && m.id !== body.id);
    if (!alreadyDraft) {
      const draft: MeetingRecord = {
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
        updatedBy: closed.updatedBy || "Milzzy",
      };
      meetings.unshift(draft);
    }

    await redis.set(TEAM_KEYS.meeting, JSON.stringify(meetings));
    return NextResponse.json({ closed, meetings });
  } catch (err) {
    console.error("POST /api/team/meeting/close error:", err);
    return NextResponse.json({ error: "Failed to close meeting" }, { status: 500 });
  }
}

// Generate a summary title like "Monday 15th September 2026 - Summary of the Meeting"
function autoTitle(m: MeetingRecord): string {
  const dateStr = m.date || new Date().toISOString().slice(0, 10);
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return `Meeting - ${dateStr}`;
  const weekday = d.toLocaleDateString("en-AU", { weekday: "long" });
  const day = d.getDate();
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  const month = d.toLocaleDateString("en-AU", { month: "long" });
  const year = d.getFullYear();
  return `${weekday} ${day}${ordinal(day)} ${month} ${year} - Summary of the Meeting`;
}
