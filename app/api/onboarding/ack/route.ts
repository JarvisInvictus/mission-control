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

const SEEN_KEY = "jarvis:onboarding:seen";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: unknown[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ added: 0 });
    }

    const redis = Redis.fromEnv();
    let added = 0;
    for (const id of ids) {
      if (typeof id !== "string" || !id) continue;
      try {
        const result = await redis.sadd(SEEN_KEY, id);
        if (result) added++;
      } catch { /* ignore individual failures */ }
    }

    return NextResponse.json({ added, total: ids.length });
  } catch (err) {
    console.error("[onboarding/ack] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  // Allow un-acking (e.g. if user wants to re-open the popup)
  try {
    const body = await req.json().catch(() => ({}));
    const ids: unknown[] = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length === 0) {
      return NextResponse.json({ removed: 0 });
    }
    const redis = Redis.fromEnv();
    let removed = 0;
    for (const id of ids) {
      if (typeof id !== "string" || !id) continue;
      try {
        const result = await redis.srem(SEEN_KEY, id);
        if (result) removed++;
      } catch { /* ignore */ }
    }
    return NextResponse.json({ removed, total: ids.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}