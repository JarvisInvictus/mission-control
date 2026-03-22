"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/AgentCard";
import { HeartbeatCard } from "@/components/HeartbeatCard";
import { CronCard, type CronJob } from "@/components/CronCard";
import { SubagentCard, type SubAgent } from "@/components/SubagentCard";

interface StatusData {
  agent: {
    name: string;
    model: string;
    status: "active" | "idle" | "alert";
    session: string;
    lastActivity: string;
    uptime: string;
  };
  heartbeat: {
    lastRun: string;
    nextRun: string;
    status: "ok" | "alert";
    intervalMinutes: number;
  };
  cron: CronJob[];
  subagents: SubAgent[];
  pushedAt: string;
}

function useStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error("Non-OK");
      const json = await res.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { data, loading, error };
}

export default function Home() {
  const { data, loading, error } = useStatus();

  const pushedAt = data?.pushedAt ? new Date(data.pushedAt) : null;
  const secondsAgo = pushedAt
    ? Math.round((Date.now() - pushedAt.getTime()) / 1000)
    : null;

  // Stale if data older than 2 minutes
  const isStale = secondsAgo !== null && secondsAgo > 120;

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
          {/* LIVE / STALE indicator */}
          <div className="flex items-center gap-2">
            {isStale || error ? (
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: "#ef4444" }}
                />
                <span
                  className="text-xs tracking-[0.2em] uppercase"
                  style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#ef4444" }}
                >
                  Stale
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
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
              </span>
            )}
            {secondsAgo !== null && (
              <span
                className="text-xs text-text-muted ml-2"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              >
                {secondsAgo}s ago
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Agent Status */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <AgentCard
              agent={data?.agent ?? null}
              loading={loading}
            />
          </div>
        </div>

        {/* Heartbeat */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <HeartbeatCard
              data={data?.heartbeat ?? null}
              loading={loading}
            />
          </div>
        </div>

        {/* Cron Jobs */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <CronCard jobs={data?.cron ?? []} loading={loading} />
          </div>
        </div>

        {/* Sub-agent Activity */}
        <div className="xl:col-span-1 group">
          <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
            <SubagentCard agents={data?.subagents ?? []} loading={loading} />
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
          {pushedAt
            ? pushedAt.toLocaleTimeString("en-AU", { hour12: false })
            : "—"}{" "}
          · Auto-refresh every 30s · v2.0.0
        </p>
      </footer>
    </div>
  );
}
