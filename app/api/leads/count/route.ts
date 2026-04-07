import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET() {
  try {
    const keys = await redis.keys("jarvis:leads:*");
    return NextResponse.json({ total: keys.length });
  } catch (e) {
    return NextResponse.json({ total: 0, error: String(e) }, { status: 200 });
  }
}
