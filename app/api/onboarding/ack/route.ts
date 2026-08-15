/**
 * app/api/onboarding/ack/route.ts
 *
 * POST { ids: string[] }  → mark onboarding submission IDs as acknowledged
 *                            (so they stop appearing in the Tasks tab popup).
 */

import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!;

function getRedis() {
  if (!REDIS_REST_URL || !REDIS_REST_TOKEN) return null;
  try {
    return new Redis({ url: REDIS_REST_URL, token: REDIS_REST_TOKEN });
  } catch {
    return null;
  }
}

const SEEN_KEY = "jarvis:onboarding:seen";

async function handleAck(req: NextRequest, action: "add" | "remove") {
  const body = await req.json().catch(() => ({}));
  const ids: unknown[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json(action === "add" ? { added: 0 } : { removed: 0 });
  }

  const redis = getRedis();
  if (!redis) {
    console.error("[onboarding/ack] Redis unavailable");
    return NextResponse.json({ error: "Redis unavailable" }, { status: 503 });
  }

  let count = 0;
  for (const id of ids) {
    if (typeof id !== "string" || !id) continue;
    try {
      const result = action === "add"
        ? await redis.sadd(SEEN_KEY, id)
        : await redis.srem(SEEN_KEY, id);
      if (result) count++;
    } catch { /* ignore individual failures */ }
  }
  return NextResponse.json(action === "add" ? { added: count, total: ids.length } : { removed: count, total: ids.length });
}

export async function POST(req: NextRequest) {
  try {
    return await handleAck(req, "add");
  } catch (err) {
    console.error("[onboarding/ack] POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await handleAck(req, "remove");
  } catch (err) {
    console.error("[onboarding/ack] DELETE error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
