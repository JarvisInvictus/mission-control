import { NextResponse } from "next/server";

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisGet(key: string): Promise<unknown> {
  const res = await fetch(
    `${REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}` } }
  );
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  await fetch(
    `${REDIS_REST_URL}/set/${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(value),
    }
  );
}

export async function GET() {
  try {
    const raw = await redisGet("jarvis:content");
    if (!raw) return NextResponse.json({ cards: [] });
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string") return NextResponse.json({ cards: JSON.parse(parsed) });
        return NextResponse.json({ cards: parsed });
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