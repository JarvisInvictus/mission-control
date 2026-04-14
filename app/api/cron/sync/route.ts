import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

// POST /api/cron/sync — receives cron job state from Mac mini gateway
// Body: { jobs: CronJob[] }
export async function POST(req: Request) {
  try {
    const { jobs } = await req.json();
    if (!Array.isArray(jobs)) return NextResponse.json({ error: "jobs array required" }, { status: 400 });
    await redis.set("jarvis:cron:jobs", JSON.stringify(jobs), { ex: 300 }); // 5 min TTL
    return NextResponse.json({ ok: true, count: jobs.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/cron/sync — returns latest synced cron jobs
export async function GET() {
  try {
    const raw = await redis.get<string>("jarvis:cron:jobs");
    const jobs = raw ? JSON.parse(raw) : [];
    return NextResponse.json({ jobs, source: "sync" });
  } catch (e) {
    return NextResponse.json({ jobs: [], error: String(e) }, { status: 200 });
  }
}
