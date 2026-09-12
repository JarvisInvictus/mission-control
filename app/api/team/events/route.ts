import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonArray } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET /api/team/events
export async function GET() {
  try {
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.events);
    const items = parseJsonArray<TeamEvent>(raw);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/team/events error:", err);
    return NextResponse.json({ items: [] });
  }
}

// POST /api/team/events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const redis = getRedis();
    const items = parseJsonArray<TeamEvent>(await redis.get(TEAM_KEYS.events));

    const newEvent: TeamEvent = {
      id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      title: (body.title || "").trim() || "Untitled event",
      description: (body.description || "").trim(),
      date: body.date || new Date().toISOString().slice(0, 10),
      time: body.time || "",
      location: (body.location || "").trim(),
      attendees: Array.isArray(body.attendees) ? body.attendees : [],
      clientIds: Array.isArray(body.clientIds) ? body.clientIds : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || "Milzzy",
    };

    items.unshift(newEvent);
    await redis.set(TEAM_KEYS.events, JSON.stringify(items));
    return NextResponse.json({ item: newEvent });
  } catch (err) {
    console.error("POST /api/team/events error:", err);
    return NextResponse.json({ error: "Failed to save event" }, { status: 500 });
  }
}

export interface TeamEvent {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (optional)
  location: string;
  attendees: ("Milzzy" | "Miggy" | "Sonta")[];
  clientIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
