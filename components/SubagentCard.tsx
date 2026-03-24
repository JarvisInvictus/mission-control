"use client";

import { useState } from "react";

export interface SubAgent {
  id: string;
  task: string;
  model: string;
  status: "active" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  parentSession: string;
}

interface SubagentCardProps {
  agents: SubAgent[];
  loading?: boolean;
}

function formatDuration(startStr: string, endStr: string | null): string {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`;
  return `${Math.round(diffMin / 60)}h ${diffMin % 60}m`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatusIndicator({ status }: { status: SubAgent["status"] }) {
  if (status === "active") {
    // In Progress — amber
    return (
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
          style={{ backgroundColor: "#fbbf24", opacity: 0.4 }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: "#fbbf24" }}
        />
      </span>
    );
  }
  if (status === "completed") {
    return <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#34d399" }} />;
  }
  // Failed
  return <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#f87171" }} />;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

export function SubagentCard({ agents, loading = false }: SubagentCardProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const isLoading = loading && agents.length === 0;
  const active = agents.filter((a) => a.status === "active");
  const recent = agents.filter((a) => a.status !== "active").slice(0, 4);

  function toggleLog(id: string) {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}
        >
          Sub-agent Activity
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "#fbbf24" }}
            />
            <span
              className="text-[11px]"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
            >
              {isLoading ? "—" : `${active.length} active`}
            </span>
          </div>
          <span
            className="text-[11px]"
            style={{ fontFamily: "system-ui, monospace", color: "rgba(255,255,255,0.35)" }}
          >
            {isLoading ? "—" : `${agents.length} total`}
          </span>
        </div>
      </div>

      {/* Amber accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #fbbf24 0%, rgba(251,191,36,0.1) 100%)" }} />

      {isLoading ? (
        <>
          <div className="rounded-[10px] p-3" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
            <SkeletonBlock className="h-4 w-3/4 mb-2" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="rounded-[10px] p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <SkeletonBlock className="h-4 w-2/3 mb-1" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          ))}
        </>
      ) : (
        <>
          {/* Active agents */}
          {active.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
              >
                Active
              </p>
              {active.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-[10px] p-3"
                  style={{
                    background: "rgba(251,191,36,0.05)",
                    border: "1px solid rgba(251,191,36,0.25)",
                    boxShadow: "0 0 16px rgba(251,191,36,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusIndicator status={agent.status} />
                    <p
                      className="text-sm font-medium truncate"
                      style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.92)" }}
                    >
                      {agent.task}
                    </p>
                  </div>
                  <div
                    className="flex justify-between text-[11px]"
                    style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif" }}
                  >
                    <span style={{ fontFamily: "system-ui, monospace", color: "rgba(251,191,36,0.70)" }}>
                      {agent.model.replace("minimax/", "").replace("anthropic/", "").replace("kimi/", "")}
                    </span>
                    <span style={{ fontFamily: "system-ui, monospace", color: "rgba(255,255,255,0.40)" }}>
                      {formatDuration(agent.startedAt, null)} elapsed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent agents */}
          {recent.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
              >
                Recent
              </p>
              {recent.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-[10px] p-3 transition-all duration-200 cursor-default"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusIndicator status={agent.status} />
                    <p
                      className="text-sm truncate"
                      style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.60)" }}
                    >
                      {agent.task}
                    </p>
                  </div>
                  <div
                    className="flex justify-between text-[11px]"
                    style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
                  >
                    <span style={{ fontFamily: "system-ui, monospace", opacity: 0.6 }}>
                      {agent.model.replace("minimax/", "").replace("anthropic/", "").replace("kimi/", "")}
                    </span>
                    <span style={{ fontFamily: "system-ui, monospace" }}>
                      {formatDuration(agent.startedAt, agent.completedAt)} · {formatTime(agent.startedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(agents.length === 0 || agents.every((a) => !a.task || a.task === "Subagent task")) && (
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.30)", textAlign: "center", padding: "20px 0" }}>
              No agent activity yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
