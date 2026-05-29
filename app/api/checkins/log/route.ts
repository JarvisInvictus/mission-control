import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Direct Upstash REST API credentials
const UPSTASH_REDIS_REST_URL = "https://subtle-oryx-80524.upstash.io";
const UPSTASH_REDIS_REST_TOKEN = "gQAAAAAAATqMAAIncDFjYjI1NGY2ZDIyMmQ0OWM1OGJhZjM3MTc4OTkyODE5Y3AxODA1MjQ";

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
    body: JSON.stringify(value),
    cache: "no-store",
  });
}

export async function GET() {
  try {
    const raw = await redisGet("jarvis:checkin_log");
    if (!raw) return NextResponse.json({ log: {} }, {
      headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" }
    });
    if (typeof raw === "string") {
      try {
        let parsed = JSON.parse(raw);
        if (typeof parsed === "string") parsed = JSON.parse(parsed);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return NextResponse.json({ log: {} }, {
            headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" }
          });
        }
        return NextResponse.json({ log: parsed }, {
          headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" }
        });
      } catch {
        return NextResponse.json({ log: {} }, {
          headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" }
        });
      }
    }
    return NextResponse.json({ log: raw }, {
      headers: { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache" }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { log } = await req.json();
    if (typeof log !== "object" || log === null || Array.isArray(log)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    await redisSet("jarvis:checkin_log", JSON.stringify(log));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}