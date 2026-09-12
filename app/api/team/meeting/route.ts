import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonObject } from "@/lib/redis";

export const dynamic = "force-dynamic";

// Single "current" meeting record — saves over itself. History is implicit
// (we'll add a snapshot mechanism later if Milzzy wants previous meetings).

// GET /api/team/meeting
export async function GET() {
  try {
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.meeting);
    const meeting = parseJsonObject<TeamMeeting>(raw);
    return NextResponse.json({ meeting: meeting ?? DEFAULT_MEETING });
  } catch (err) {
    console.error("GET /api/team/meeting error:", err);
    return NextResponse.json({ meeting: DEFAULT_MEETING });
  }
}

// PUT /api/team/meeting — full replacement (auto-save writes whole object)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const redis = getRedis();

    // Accept agenda as either a string (legacy) or an array of items.
    // Coerce to the new array shape so the client doesn't have to worry about it.
    let agenda: AgendaItem[];
    if (Array.isArray(body.agenda)) {
      agenda = body.agenda
        .filter((it: { text?: string }) => typeof it?.text === "string")
        .map((it: { id?: string; text: string; done?: boolean }) => ({
          id: typeof it.id === "string" ? it.id : `ag_${Math.random().toString(36).slice(2, 8)}`,
          text: it.text,
          done: !!it.done,
        }));
    } else if (typeof body.agenda === "string" && body.agenda.trim()) {
      // Legacy: each non-empty line becomes an unchecked item
      agenda = body.agenda
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((text: string) => ({ id: `ag_${Math.random().toString(36).slice(2, 8)}`, text, done: false }));
    } else {
      agenda = [];
    }

    const meeting: TeamMeeting = {
      title: body.title ?? "Team Sync",
      date: body.date ?? new Date().toISOString().slice(0, 10),
      attendees: Array.isArray(body.attendees) ? body.attendees : [],
      agenda,
      notes: typeof body.notes === "string" ? body.notes : "",
      actionItems: Array.isArray(body.actionItems) ? body.actionItems : [],
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || "Milzzy",
    };

    await redis.set(TEAM_KEYS.meeting, JSON.stringify(meeting));
    return NextResponse.json({ meeting });
  } catch (err) {
    console.error("PUT /api/team/meeting error:", err);
    return NextResponse.json({ error: "Failed to save meeting" }, { status: 500 });
  }
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

export interface TeamMeeting {
  title: string;
  date: string;
  attendees: ("Milzzy" | "Miggy" | "Sonta")[];
  agenda: AgendaItem[];
  notes: string;
  actionItems: ActionItem[];
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT_MEETING: TeamMeeting = {
  title: "Team Sync",
  date: new Date().toISOString().slice(0, 10),
  attendees: ["Milzzy", "Miggy", "Sonta"],
  agenda: [],
  notes: "",
  actionItems: [],
  updatedAt: "",
  updatedBy: "",
};
