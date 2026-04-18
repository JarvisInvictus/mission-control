import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

// GET /api/clients/[id]/checkin?weekKey=2026-W17
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const weekKey = searchParams.get("weekKey");

  if (!weekKey) {
    return NextResponse.json({ error: "weekKey required" }, { status: 400 });
  }

  const status = await redis.hget(`jarvis:checkins:${weekKey}`, id);
  return NextResponse.json({ clientId: id, weekKey, status: status || null });
}

// PATCH /api/clients/[id]/checkin
// Body: { weekKey: "2026-W17", status: "ontime" | "submitted" | "late" | ... }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { weekKey, status } = body;

  if (!weekKey || !status) {
    return NextResponse.json({ error: "weekKey and status required" }, { status: 400 });
  }

  const valid = ["ontime", "submitted", "late", "unset", "skip-l", "sick", "paused"];
  if (!valid.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  await redis.hset(`jarvis:checkins:${weekKey}`, { [id]: status });
  return NextResponse.json({ clientId: id, weekKey, status });
}
