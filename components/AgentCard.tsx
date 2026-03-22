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
      ? "#3b82f6"
      : status === "alert"
      ? "#f87171"
      : "#fbbf24";
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="absolute inline-flex h-full w-full rounded-full"
        style={{ backgroundColor: color }}
      />
      {status === "active" && (
        <span
          className="relative inline-flex rounded-full h-2.5 w-2.5 animate-pulse"
          style={{ backgroundColor: color }}
        />
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
        <div className="h-px w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
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
        setCurrentModel(effectiveAgent.model);
      }
    } catch {
      setCurrentModel(effectiveAgent.model);
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
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}
          >
            Primary Agent
          </span>
          <StatusDot status={effectiveAgent.status} />
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-[999px]"
          style={{
            fontFamily: "system-ui, -apple-system, Inter, sans-serif",
            letterSpacing: "0.08em",
            backgroundColor: "var(--accent-soft)",
            color: "#3b82f6",
          }}
        >
          {effectiveAgent.status.toUpperCase()}
        </span>
      </div>

      {/* Agent name */}
      <div>
        <h2
          className="text-4xl font-bold tracking-wide"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.92)" }}
        >
          {effectiveAgent.name}
        </h2>
        <p
          className="text-[11px] mt-1"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.50)" }}
        >
          {effectiveAgent.session}
        </p>
      </div>

      {/* Blue accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #3b82f6 0%, rgba(59,130,246,0.1) 100%)" }} />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-1"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
          >
            Model
          </p>
          {switching ? (
            <p
              className="text-sm animate-pulse"
              style={{ fontFamily: "system-ui, monospace", color: "#3b82f6" }}
            >
              switching...
            </p>
          ) : (
            <select
              value={displayModel}
              onChange={handleModelSwitch}
              className="text-sm w-full bg-transparent border-none outline-none cursor-pointer"
              style={{
                fontFamily: "system-ui, monospace",
                color: "#3b82f6",
              }}
            >
              {MODELS.map((m) => (
                <option
                  key={m.value}
                  value={m.value}
                  style={{ background: "#0a0e1a", color: "#f5f5f5" }}
                >
                  {m.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-1"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
          >
            Uptime
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "system-ui, monospace", color: "rgba(255,255,255,0.90)" }}
          >
            {effectiveAgent.uptime}
          </p>
        </div>
      </div>

      {/* Model info badge */}
      {selectedModel && (
        <div
          className="text-[11px] px-2 py-1 rounded-[8px]"
          style={{
            fontFamily: "system-ui, monospace",
            backgroundColor: "rgba(59,130,246,0.08)",
            color: "rgba(59,130,246,0.70)",
          }}
        >
          {selectedModel.value}
        </div>
      )}

      {/* Status bar */}
      <div>
        <div className="flex justify-between text-[11px] mb-1.5">
          <span style={{ color: "rgba(255,255,255,0.35)", fontFamily: "system-ui, -apple-system, Inter, sans-serif" }}>Session health</span>
          <span
            style={{
              fontFamily: "system-ui, -apple-system, Inter, sans-serif",
              color: effectiveAgent.status === "alert" ? "#f87171" : "#34d399",
            }}
          >
            {effectiveAgent.status === "alert" ? "DEGRADED" : "100%"}
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: effectiveAgent.status === "alert" ? "60%" : "100%",
              background: effectiveAgent.status === "alert"
                ? "linear-gradient(90deg, #f87171, rgba(248,113,113,0.4))"
                : "linear-gradient(90deg, #3b82f6, rgba(59,130,246,0.6))",
            }}
          />
        </div>
      </div>
    </div>
  );
}
