import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, data } = body;

    const expectedSecret = (process.env.PUSH_SECRET ?? "").trim();
    const receivedSecret = (secret ?? "").trim();
    if (!receivedSecret || receivedSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "No data provided" }, { status: 400 });
    }

    // Read existing data and merge (incoming wins for overlapping keys)
    const existingRaw = await redis.get<string>("jarvis:status");
    let existing: Record<string, unknown> = {};
    if (existingRaw) {
      try {
        existing = typeof existingRaw === "string" ? JSON.parse(existingRaw) : existingRaw;
      } catch {
        // ignore parse errors, start fresh
      }
    }
    const merged = { ...existing, ...data };

    await redis.set("jarvis:status", JSON.stringify(merged), { ex: 300 }); // 5 min TTL

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/push] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
