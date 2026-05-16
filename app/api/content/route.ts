import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPSTASH_REDIS_REST_URL = process.env.KV_REST_API_URL!;
const UPSTASH_REDIS_REST_TOKEN = process.env.KV_REST_API_TOKEN!;

async function redisGet(key: string): Promise<unknown> {
  const res = await fetch(
    `${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` } }
  );
  if (!res.ok) throw new Error(`Redis GET failed: ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  const res = await fetch(
    `${UPSTASH_REDIS_REST_URL}/set/${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }
  );
  if (!res.ok) throw new Error(`Redis SET failed: ${res.status}`);
}

export async function GET() {
  try {
    const raw = await redisGet("jarvis:content");
    if (!raw) return NextResponse.json({ cards: [] });
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return NextResponse.json({ cards: typeof parsed === "string" ? JSON.parse(parsed) : parsed });
      } catch {
        return NextResponse.json({ cards: [] });
      }
    }
    return NextResponse.json({ cards: raw });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { cards } = await req.json();
    if (!Array.isArray(cards)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    await redisSet("jarvis:content", JSON.stringify(cards));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}