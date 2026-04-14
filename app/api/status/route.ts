import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

function getMockStatus() {
  const now = new Date();
  const lastHeartbeat = new Date(now.getTime() - 8 * 60 * 1000);
  const nextHeartbeat = new Date(now.getTime() + 22 * 60 * 1000);

  return {
    agent: {
      name: "Jarvis",
      status: "idle",
      model: "anthropic/claude-sonnet-4-6",
      session: "agent:main:main",
      lastActivity: lastHeartbeat.toISOString(),
      uptime: "—",
    },
    heartbeat: {
      lastRun: lastHeartbeat.toISOString(),
      nextRun: nextHeartbeat.toISOString(),
      status: "ok",
      intervalMinutes: 30,
    },
    cron: [
      {
        id: "heartbeat",
        name: "Heartbeat Poll",
        schedule: "*/30 * * * *",
        scheduleLabel: "Every 30 min",
        lastRun: lastHeartbeat.toISOString(),
        nextRun: nextHeartbeat.toISOString(),
        status: "ok",
      },
      {
        id: "memory-review",
        name: "Memory Review",
        schedule: "0 9 * * *",
        scheduleLabel: "Daily at 09:00",
        lastRun: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
        nextRun: new Date(now.getTime() + 16 * 60 * 60 * 1000).toISOString(),
        status: "ok",
      },
    ],
    subagents: [],
    business: {
      clientCount: 75,
      leads: {
        enquiry: 3,
        consulted: 2,
        converted: 1,
      },
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    pushedAt: now.toISOString(),
  };
}

export async function GET() {
  try {
    // Try to get real cron state synced from Mac mini gateway
    const cronRaw = await redis.get<string>("jarvis:cron:jobs");
    const cronJobs = cronRaw ? JSON.parse(cronRaw) : null;

    // Try full status cache
    const raw = await redis.get<string>("jarvis:status");

    if (!raw) {
      const status = getMockStatus();
      // Inject real cron jobs if available
      if (cronJobs && Array.isArray(cronJobs) && cronJobs.length > 0) {
        status.cron = cronJobs.map((j: any) => ({
          id: j.id || j.name?.toLowerCase().replace(/\s+/g, "-"),
          name: j.name,
          schedule: j.cron || j.schedule || "?",
          scheduleLabel: j.name || j.description || j.cron || "?",
          lastRun: j.lastRun || null,
          nextRun: j.nextRun || null,
          status: j.state?.status || (j.lastRun ? "ok" : "pending"),
        }));
      }
      return NextResponse.json(status);
    }

    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/status] Error:", err);
    return NextResponse.json(getMockStatus());
  }
}
