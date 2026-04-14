import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

// GET /api/referrals/paid — returns set of paid referral codes
export async function GET() {
  try {
    const members = await redis.smembers("referrals:paid") as string[];
    return NextResponse.json({ paid: members || [] });
  } catch (e) {
    return NextResponse.json({ paid: [], error: String(e) }, { status: 200 });
  }
}

// POST /api/referrals/paid — mark a code as paid
// Body: { code: string }
export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });
    await redis.sadd("referrals:paid", code);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
