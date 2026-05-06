import { NextRequest, NextResponse } from "next/server";

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisGet(key: string): Promise<unknown> {
  const res = await fetch(`${REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}` },
  });
  const data = await res.json() as { result: unknown };
  return data.result;
}

async function redisSet(key: string, value: string): Promise<void> {
  await fetch(`${REDIS_REST_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function parseClients(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return JSON.parse(parsed);
      return parsed;
    } catch { return []; }
  }
  return [];
}

// GET /api/revenue
export async function GET() {
  try {
    const raw = await redisGet("jarvis:clients");
    const clients = parseClients(raw);
    const activeClients = clients.filter((c: any) => c.status === "active");

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(year, month);

    const weeklyTotal = activeClients.reduce((sum: number, c: any) => sum + (c.weeklyCharge || 0), 0);
    const monthlyRate = weeklyTotal * 52 / 12;
    const mtdRevenue = Math.round(monthlyRate * (dayOfMonth / daysInMonth));
    const eofmProjection = Math.round(monthlyRate);

    const lastMonthRaw = await redisGet("jarvis:revenue:last_month");
    const lastMonthNum = typeof lastMonthRaw === "string" ? parseFloat(lastMonthRaw) : (typeof lastMonthRaw === "number" ? lastMonthRaw : null);

    const lastMonthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", month: "long", year: "numeric" });

    return NextResponse.json({
      weeklyTotal,
      monthlyRate: Math.round(monthlyRate),
      mtdRevenue,
      eofmProjection,
      lastMonthRevenue: lastMonthNum,
      lastMonthLabel,
      activeClients: activeClients.length,
      dayOfMonth,
      daysInMonth,
      pctOfMonth: Math.round((dayOfMonth / daysInMonth) * 100),
    });
  } catch (err) {
    console.error("GET /api/revenue error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/revenue
// Body: { action: "record_last_month", revenue: number }
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action === "record_last_month") {
    const revenue = parseFloat(body.revenue);
    if (isNaN(revenue)) {
      return NextResponse.json({ error: "invalid revenue" }, { status: 400 });
    }
    await redisSet("jarvis:revenue:last_month", String(revenue));
    const now = new Date();
    const lastMonthKey = `jarvis:revenue:${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
    await redisSet(lastMonthKey, String(revenue));
    return NextResponse.json({ ok: true, lastMonth: revenue });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}