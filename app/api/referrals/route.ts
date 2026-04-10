import { NextRequest, NextResponse } from "next/server";

const REFERRAL_UPSTASH = "https://healthy-seahorse-82183.upstash.io";
const REFERRAL_TOKEN = process.env.REFERRAL_UPSTASH_TOKEN || "";

async function redisGet(key: string) {
  try {
    const res = await fetch(`${REFERRAL_UPSTASH}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REFERRAL_TOKEN}` },
    });
    const data = await res.json();
    return data.result as string | null;
  } catch { return null; }
}

// GET ?codes=CODE1,CODE2 — returns owner names for each code
export async function GET(req: NextRequest) {
  if (!REFERRAL_TOKEN) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const { searchParams } = new URL(req.url);
  const codesParam = searchParams.get("codes");
  if (!codesParam) return NextResponse.json({ error: "codes required" }, { status: 400 });

  const codes = codesParam.split(",").filter(Boolean);
  const owners: Record<string, { name: string; email: string } | null> = {};

  await Promise.all(codes.map(async (code) => {
    const raw = await redisGet(`ref:owner:${code.trim()}`);
    owners[code.trim()] = raw ? JSON.parse(raw) : null;
  }));

  return NextResponse.json({ owners });
}
