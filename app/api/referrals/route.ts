import { NextResponse } from "next/server";

const REFERRAL_UPSTASH = "https://healthy-seahorse-82183.upstash.io";
const REFERRAL_TOKEN = process.env.REFERRAL_UPSTASH_TOKEN || "";

async function redisHgetall(key: string) {
  try {
    const res = await fetch(`${REFERRAL_UPSTASH}/hgetall/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REFERRAL_TOKEN}` },
    });
    return res.json();
  } catch { return { result: null }; }
}

export async function GET() {
  if (!REFERRAL_TOKEN) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  // We can't scan keys with Upstash REST, so we maintain a known-codes list
  // The referral codes are deterministic: hash of email
  // For now, return empty — codes are created client-side
  return NextResponse.json({ codes: [] });
}

export async function POST() {
  // Called by Fillout webhook via Mission Control — capture referral code from lead
  return NextResponse.json({ ok: true });
}
