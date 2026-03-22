import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

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
    pushedAt: now.toISOString(),
  };
}

export async function GET() {
  try {
    const raw = await redis.get<string>("jarvis:status");

    if (!raw) {
      return NextResponse.json(getMockStatus());
    }

    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/status] Error:", err);
    return NextResponse.json(getMockStatus());
  }
}
