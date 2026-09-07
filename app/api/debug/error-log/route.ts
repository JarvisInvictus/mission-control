import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!;
const ERRORS_KEY = "jarvis:errors";

/**
 * POST /api/debug/error-log
 * Stores client-side render errors in a capped Redis list so we can see what
 * crashed remotely. Each entry auto-trims to the last 100 events.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const entry = {
      ts: body.timestamp || new Date().toISOString(),
      label: typeof body.label === "string" ? body.label.slice(0, 80) : "unknown",
      message: typeof body.message === "string" ? body.message.slice(0, 1000) : "(empty)",
      stack: typeof body.stack === "string" ? body.stack.slice(0, 4000) : null,
      ua: typeof body.ua === "string" ? body.ua.slice(0, 300) : null,
    };
    try {
      const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
      await redis.lpush(ERRORS_KEY, JSON.stringify(entry));
      await redis.ltrim(ERRORS_KEY, 0, 99); // keep last 100
    } catch { /* fall through — still return OK so client doesn't retry */ }
    // Always log to stdout for visibility
    console.error(`[error-log][${entry.label}] ${entry.message}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
