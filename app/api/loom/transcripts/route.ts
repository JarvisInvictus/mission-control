import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const redis = Redis.fromEnv();
  const data = (await redis.get("jarvis:transcripts")) as unknown;
  const transcripts = Array.isArray(data) ? data : [];
  return NextResponse.json({ transcripts });
}
