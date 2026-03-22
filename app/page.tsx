"use client";

import { useEffect, useState } from "react";
import { AgentCard } from "@/components/AgentCard";
import { HeartbeatCard } from "@/components/HeartbeatCard";
import { CronCard, type CronJob } from "@/components/CronCard";
import { SubagentCard, type SubAgent } from "@/components/SubagentCard";

// --- Mock data (TODO: replace with real OpenClaw gateway API calls) ---
// Gateway: http://127.0.0.1:18789
// Auth: Authorization: Bearer <token>
// Endpoints: GET /health, POST /hooks/wake, WebSocket for live session data

function getMockData() {
  const now = new Date();
  const lastHeartbeat = new Date(now.getTime() - 8 * 60 * 1000); // 8 min ago
  const nextHeartbeat = new Date(now.getTime() + 22 * 60 * 1000); // 22 min from now

  const cronJobs: CronJob[] = [
    {
      id: "heartbeat",
      name: "Heartbeat Poll",
      schedule: "*/30 * * * *",
      scheduleLabel: "Every 30 min",
      lastRun: lastHeartbeat,
      nextRun: nextHeartbeat,
      status: "ok",
    },
    {
      id: "memory-review",
      name: "Memory Review",
      schedule: "0 9 * * *",
      scheduleLabel: "Daily at 09:00",
      lastRun: new Date(now.getTime() - 60 * 60 * 1000),
      nextRun: new Date(now.getTime() + 16 * 60 * 60 * 1000),
      status: "ok",
    },
  ];

  const subAgents: SubAgent[] = [
    {
      id: "sa-1",
      task: "Build Mission Control dashboard (Next.js + Tailwind)",
      model: "minimax/MiniMax-M2.7",
      status: "completed",
      startedAt: new Date(now.getTime() - 90 * 60 * 1000),
      completedAt: new Date(now.getTime() - 5 * 60 * 1000),
      parentSession: "agent:main:main",
    },
  ];

  return { lastHeartbeat, nextHeartbeat, cronJobs, subAgents };
}

export default function Home() {
  const [tick, setTick] = useState(0);

  // Refresh every 30s (TODO: replace with real gateway polling)
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const { lastHeartbeat, nextHeartbeat, cronJobs, subAgents } = getMockData();

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* Header */}
      <header className="border-b border-white/5 bg-white/3 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1
              className="text-2xl tracking-widest"
              style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
            >
              <span className="text-accent">JARVIS</span>
              <span className="text-text-muted mx-3">//</span>
              <span className="text-text-primary">MISSION CONTROL</span>
            </h1>
            <p
              className="text-xs mt-1 text-text-secondary tracking-wide"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              Invictus Physiques AI Stack · Operations Dashboard
            </p>
          </div>
          {/* LIVE indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ backgroundColor: "#06b6d4", opacity: 0.4 }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: "#06b6d4" }}
              />
            </span>
            <span
              className="text-xs tracking-[0.2em] text-accent uppercase"
              style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
            >
              Live
            </span>
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Agent Status */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <AgentCard
              agent={{
                name: "Jarvis",
                model: "claude-sonnet-4-6",
                status: "idle",
                session: "agent:main:main",
                uptime: "2h 14m",
              }}
            />
          </div>
        </div>

        {/* Heartbeat */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <HeartbeatCard
              data={{
                lastHeartbeat,
                nextHeartbeat,
                status: "ok",
                intervalMinutes: 30,
              }}
            />
          </div>
        </div>

        {/* Cron Jobs */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <CronCard jobs={cronJobs} />
          </div>
        </div>

        {/* Sub-agent Activity */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <SubagentCard agents={subAgents} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-4 mt-4">
        <p
          className="text-xs text-text-muted tracking-wide"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          Last refreshed:{" "}
          {new Date().toLocaleTimeString("en-AU", { hour12: false })} · Auto-refresh
          every 30s · v1.0.0
        </p>
      </footer>
    </div>
  );
}
