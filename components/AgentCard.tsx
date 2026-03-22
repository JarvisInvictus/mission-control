"use client";

import { useState } from "react";

interface Agent {
  name: string;
  model: string;
  status: "active" | "idle" | "alert";
  session: string;
  uptime: string;
}

interface AgentCardProps {
  agent: Agent | null;
  loading?: boolean;
}

const MODELS = [
  { label: "Claude Sonnet 4-6", value: "anthropic/claude-sonnet-4-6" },
  { label: "MiniMax M2.7", value: "minimax/MiniMax-M2.7" },
  { label: "Kimi K2.5", value: "kimi/kimi-k2-5" },
];

function StatusDot({ status }: { status: Agent["status"] }) {
  const color =
    status === "active"
      ? "bg-accent shadow-[0_0_8px_rgba(6,182,212,0.6)]"
      : status === "alert"
      ? "bg-status-red shadow-[0_0_8px_rgba(239,68,68,0.6)]"
      : "bg-status-yellow shadow-[0_0_8px_rgba(234,179,8,0.4)]";
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color}`} />
      {status === "active" && (
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent animate-pulse" />
      )}
    </span>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

export function AgentCard({ agent, loading = false }: AgentCardProps) {
  const [switching, setSwitching] = useState(false);
  const [currentModel, setCurrentModel] = useState(agent?.model ?? "");

  if (loading && !agent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-5 w-16" />
        </div>
        <SkeletonBlock className="h-10 w-32" />
        <SkeletonBlock className="h-px w-full" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
        </div>
        <SkeletonBlock className="h-8 w-full" />
      </div>
    );
  }

  const effectiveAgent = agent ?? {
    name: "Jarvis",
    model: "anthropic/claude-sonnet-4-6",
    status: "idle" as const,
    session: "agent:main:main",
    uptime: "—",
  };

  const displayModel = currentModel || effectiveAgent.model;
  const selectedModel = MODELS.find((m) => m.value === effectiveAgent.model);

  async function handleModelSwitch(e: React.ChangeEvent<HTMLSelectElement>) {
    const newModel = e.target.value;
    setCurrentModel(newModel);
    setSwitching(true);
    try {
      const res = await fetch("/api/switch-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: newModel }),
      });
      const json = await res.json();
      if (!json.ok) {
        setCurrentModel(effectiveAgent.model); // revert on failure
      }
    } catch {
      setCurrentModel(effectiveAgent.model); // revert on error
    } finally {
      setTimeout(() => setSwitching(false), 1500);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs text-text-muted uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
          >
            Primary Agent
          </span>
          <StatusDot status={effectiveAgent.status} />
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-bebas-neue), sans-serif",
            letterSpacing: "0.1em",
            backgroundColor: "rgba(6,182,212,0.1)",
            color: "#06b6d4",
          }}
        >
          {effectiveAgent.status.toUpperCase()}
        </span>
      </div>

      {/* Agent name */}
      <div>
        <h2
          className="text-4xl text-text-primary tracking-wide"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          {effectiveAgent.name}
        </h2>
        <p
          className="text-xs text-text-secondary mt-1"
          style={{ fontFamily: "var(--font-dm-sans), monospace" }}
        >
          {effectiveAgent.session}
        </p>
      </div>

      {/* Cyan accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #06b6d4 0%, rgba(6,182,212,0.1) 100%)" }} />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p
            className="text-xs text-text-muted uppercase tracking-wider mb-1"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
          >
            Model
          </p>
          {switching ? (
            <p
              className="text-sm animate-pulse"
              style={{ fontFamily: "var(--font-dm-sans), monospace", color: "#06b6d4" }}
            >
              switching...
            </p>
          ) : (
            <select
              value={displayModel}
              onChange={handleModelSwitch}
              className="text-sm w-full bg-transparent border-none outline-none cursor-pointer"
              style={{
                fontFamily: "var(--font-dm-sans), monospace",
                color: "#06b6d4",
              }}
            >
              {MODELS.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                  style={{ background: "#080808", color: "#f5f5f5" }}
                >
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <p
            className="text-xs text-text-muted uppercase tracking-wider mb-1"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
          >
            Uptime
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "var(--font-dm-sans), monospace", color: "#f5f5f5" }}
          >
            {effectiveAgent.uptime}
          </p>
        </div>
      </div>

      {/* Model info badge */}
      {selectedModel && (
        <div
          className="text-xs px-2 py-1 rounded"
          style={{
            fontFamily: "var(--font-dm-sans), monospace",
            backgroundColor: "rgba(6,182,212,0.05)",
            color: "rgba(6,182,212,0.6)",
          }}
        >
          {selectedModel.value}
        </div>
      )}

      {/* Status bar */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Session health</span>
          <span style={{ color: effectiveAgent.status === "alert" ? "#ef4444" : "#22c55e" }}>
            {effectiveAgent.status === "alert" ? "DEGRADED" : "100%"}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: effectiveAgent.status === "alert" ? "60%" : "100%",
              background: effectiveAgent.status === "alert"
                ? "linear-gradient(90deg, #ef4444, rgba(239,68,68,0.4))"
                : "linear-gradient(90deg, #06b6d4, rgba(6,182,212,0.6))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
