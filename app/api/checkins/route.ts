import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

// GET /api/checkins?weekKey=2026-W17
// Returns { [clientId]: status }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekKey = searchParams.get("weekKey");

  if (!weekKey) {
    return NextResponse.json({ error: "weekKey required" }, { status: 400 });
  }

  const data = await redis.hgetall(`jarvis:checkins:${weekKey}`);
  return NextResponse.json(data ?? {});
}
