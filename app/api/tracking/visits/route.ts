import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export async function GET() {
  try {
    // Get all keys matching tracking pattern
    const keys = await redis.keys("tracking:*:total");

    const counts: Record<string, number> = {};
    for (const key of keys) {
      const count = await redis.get<number>(key);
      const match = key.match(/tracking:(.+):total/);
      if (match) {
        counts[match[1]] = count || 0;
      }
    }

    return NextResponse.json({
      landing: counts["/"] || 0,
      calculator: counts["/calculator"] || 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    });
  } catch (e) {
    return NextResponse.json({ landing: 0, calculator: 0, total: 0, error: String(e) }, { status: 200 });
  }
}