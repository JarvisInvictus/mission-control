import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, data } = body;

    if (!secret || secret !== process.env.PUSH_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "No data provided" }, { status: 400 });
    }

    await redis.set("jarvis:status", JSON.stringify(data), { ex: 300 }); // 5 min TTL

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/push] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
