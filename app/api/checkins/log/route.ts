import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REDIS_URL = process.env.KV_REST_API_URL!;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN!;

async function redisGet(key: string): Promise<unknown> {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

export async function GET() {
  try {
    const raw = await redisGet("jarvis:checkin_log");
    if (!raw) return NextResponse.json({ log: {} });
    if (typeof raw === "string") {
      try {
        return NextResponse.json({ log: JSON.parse(raw) });
      } catch {
        return NextResponse.json({ log: {} });
      }
    }
    return NextResponse.json({ log: raw });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { log } = await req.json();
    if (typeof log !== "object" || log === null) return NextResponse.json({ error: "invalid" }, { status: 400 });
    await redisSet("jarvis:checkin_log", JSON.stringify(log));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}