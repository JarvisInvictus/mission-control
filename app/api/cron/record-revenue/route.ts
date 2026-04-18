import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

// Vercel Cron — runs on 1st of each month at midnight AEST (1pm UTC)
// Records the previous month's total revenue for vs-last-month comparison
export async function GET(req: NextRequest) {
  // Vercel cron sends a verification header
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const raw = await redis.get("jarvis:clients");
  const clients: any[] = raw ? JSON.parse(raw as string) : [];
  const activeClients = clients.filter((c: any) => c.status === "active");
  const weeklyTotal = activeClients.reduce((sum: number, c: any) => sum + (c.weeklyCharge || 0), 0);
  const monthlyRate = weeklyTotal * 52 / 12;
  const mtdRevenue = Math.round(monthlyRate);

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `jarvis:revenue:${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  const label = lastMonth.toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", month: "long", year: "numeric" });

  // Save the previous month's actual as last_month
  // (We use monthlyRate as a proxy — in practice this would come from Newbie/ payment data)
  await redis.set("jarvis:revenue:last_month", String(mtdRevenue));
  await redis.set(lastMonthKey, String(mtdRevenue));

  return NextResponse.json({
    ok: true,
    recorded: label,
    revenue: mtdRevenue,
    source: "active_clients_runrate",
  });
}
