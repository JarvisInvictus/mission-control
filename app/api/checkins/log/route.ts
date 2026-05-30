import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Direct Upstash REST API credentials
const UPSTASH_REDIS_REST_URL = "https://subtle-oryx-80524.upstash.io";
const UPSTASH_REDIS_REST_TOKEN = "gQAAAAAAATqMAAIncDFjYjI1NGY2ZDIyMmQ0OWM1OGJhZjM3MTc4OTkyODE5Y3AxODA1MjQ";

const CACHE_BUST = { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" };

async function redisGet(key: string): Promise<unknown> {
  const res = await fetch(`${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  await fetch(`${UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: value,
    cache: "no-store",
  });
}

export async function GET() {
  try {
    const raw = await redisGet("jarvis:checkin_log");
    console.log("[checkins/log] Upstash raw:", typeof raw, ", preview:", typeof raw === "string" ? (raw as string).slice(0, 100) : String(raw).slice(0, 100));
    if (!raw) {
      console.log("[checkins/log] No raw, returning empty");
      return NextResponse.json({ log: {} }, { headers: CACHE_BUST });
    }
    if (typeof raw === "string") {
      try {
        let parsed = JSON.parse(raw);
        // Handle double-encoded or old wrapped format
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
        // Support both raw log objects and old {log: {...}} wrappers
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          const asAny = parsed as Record<string, unknown>;
          if ("log" in asAny && typeof (asAny.log) === "object" && asAny.log !== null) {
            return NextResponse.json({ log: asAny.log }, { headers: CACHE_BUST });
          }
          return NextResponse.json({ log: parsed }, { headers: CACHE_BUST });
        }
        return NextResponse.json({ log: {} }, { headers: CACHE_BUST });
      } catch {
        return NextResponse.json({ log: {} }, { headers: CACHE_BUST });
      }
    }
    return NextResponse.json({ log: raw }, { headers: CACHE_BUST });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    // Guard: if body is empty object, skip save to prevent cold-start wipes
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    await redisSet("jarvis:checkin_log", JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}