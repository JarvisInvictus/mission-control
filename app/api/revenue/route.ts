import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// GET /api/revenue
// Returns MTD revenue, projection, and vs last month
export async function GET() {
  const raw = await redis.get("jarvis:clients");
  const clients: any[] = raw ? JSON.parse(raw as string) : [];
  const activeClients = clients.filter((c: any) => c.status === "active");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const dayOfMonth = now.getDate();
  const daysInMonth = getDaysInMonth(year, month);

  const weeklyTotal = activeClients.reduce((sum: number, c: any) => sum + (c.weeklyCharge || 0), 0);
  const monthlyRate = weeklyTotal * 52 / 12;
  const mtdRevenue = Math.round(monthlyRate * (dayOfMonth / daysInMonth));
  const eofmProjection = Math.round(monthlyRate);
  const lastMonthRevenue = await redis.get<string>("jarvis:revenue:last_month");
  const lastMonthNum = lastMonthRevenue ? parseFloat(lastMonthRevenue) : null;

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
}

// POST /api/revenue
// Body: { action: "record_last_month", revenue: number }
// Records the current monthly revenue as last month's snapshot
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.action === "record_last_month") {
    const revenue = parseFloat(body.revenue);
    if (isNaN(revenue)) {
      return NextResponse.json({ error: "invalid revenue" }, { status: 400 });
    }
    await redis.set("jarvis:revenue:last_month", String(revenue));
    // Also archive with month key
    const now = new Date();
    const lastMonthKey = `jarvis:revenue:${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;
    await redis.set(lastMonthKey, String(revenue));
    return NextResponse.json({ ok: true, lastMonth: revenue });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
