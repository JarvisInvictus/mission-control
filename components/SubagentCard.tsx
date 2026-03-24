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
  output?: string; // full log output, if available
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function shortModel(model: string): string {
  return model.replace("minimax/", "").replace("anthropic/", "").replace("kimi/", "").replace("kimi/kimi-", "kimi-");
}

function getAgentName(task: string, parentSession: string, model: string): string {
  // If task is generic, try to derive from parentSession label
  if (!task || task === "Subagent task" || task === "Task") {
    // Derive from session label
    if (parentSession.includes("sales")) return "Sales";
    if (parentSession.includes("content")) return "Content";
    if (parentSession.includes("admin")) return "Admin";
    if (parentSession.includes("client") || parentSession.includes("success")) return "Client Success";
    return shortModel(model);
  }
  return task;
}

function StatusDot({ status }: { status: SubAgent["status"] }) {
  if (status === "active") {
    return (
      <span style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
        <span style={{ position: "absolute", display: "inline-flex", width: "100%", height: "100%", borderRadius: "50%", backgroundColor: "#fbbf24", opacity: 0.4, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
        <span style={{ position: "relative", display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#fbbf24" }} />
      </span>
    );
  }
  if (status === "completed") {
    return <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#34d399", flexShrink: 0 }} />;
  }
  return <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f87171", flexShrink: 0 }} />;
}

function AgentEntry({ agent }: { agent: SubAgent }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = !!agent.output && agent.output.length > 0;
  const agentName = getAgentName(agent.task, agent.parentSession, agent.model);
  const modelShort = shortModel(agent.model);
  const isActive = agent.status === "active";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Main row */}
      <div
        style={{
          padding: "10px 12px",
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          cursor: hasOutput ? "pointer" : "default",
        }}
        onClick={() => hasOutput && setExpanded(!expanded)}
      >
        <StatusDot status={agent.status} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Agent name */}
          <p
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.60)",
              margin: 0,
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {agentName}
          </p>

          {/* Sub-info row */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "2px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "system-ui, monospace",
                fontSize: "10px",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {modelShort}
            </span>
            <span style={{ fontFamily: "system-ui, monospace", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>·</span>
            <span
              style={{
                fontFamily: "system-ui, monospace",
                fontSize: "10px",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {formatDuration(agent.startedAt, agent.completedAt)}
            </span>
            <span style={{ fontFamily: "system-ui, monospace", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>·</span>
            <span
              style={{
                fontFamily: "system-ui, monospace",
                fontSize: "10px",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              {formatDate(agent.startedAt)}
            </span>
          </div>
        </div>

        {/* Expand toggle for entries with output */}
        {hasOutput && (
          <span
            style={{
              fontFamily: "system-ui",
              fontSize: "11px",
              color: "rgba(255,255,255,0.30)",
              flexShrink: 0,
              marginTop: "2px",
              transition: "transform 0.2s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              display: "inline-block",
            }}
          >
            ▼
          </span>
        )}
      </div>

      {/* Expandable log output */}
      {hasOutput && expanded && (
        <div
          style={{
            padding: "8px 12px 10px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <p
            style={{
              fontFamily: "system-ui, monospace",
              fontSize: "10px",
              color: "rgba(255,255,255,0.40)",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {agent.output}
          </p>
        </div>
      )}

      {/* View Log button for entries without structured output */}
      {agent.task && agent.task !== "Subagent task" && !hasOutput && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "transparent",
            border: "none",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.30)",
            cursor: "pointer",
            fontSize: "11px",
            fontFamily: "system-ui",
            padding: "6px 12px",
            width: "100%",
            textAlign: "left",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = Tiffany)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.30)")}
        >
          {expanded ? "▲ Hide Log" : "▼ View Log"}
        </button>
      )}
    </div>
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

const Tiffany = "#0abab5";

export function SubagentCard({ agents, loading = false }: SubagentCardProps) {
  const isLoading = loading && agents.length === 0;
  const active = agents.filter((a) => a.status === "active");
  const recent = agents
    .filter((a) => a.status !== "active")
    .slice(0, 5);

  // Determine if data is real or just placeholder entries
  const hasRealData =
    agents.length > 0 && agents.some((a) => a.task && a.task !== "Subagent task");

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
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: "#fbbf24", animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }}
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
      ) : agents.length === 0 || !hasRealData ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.30)", margin: "0 0 6px" }}>
            No agent activity yet
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.20)", margin: 0 }}>
            Sub-agents appear here when Jarvis runs tasks
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(251,191,36,0.70)" }}
              >
                Active
              </p>
              {active.map((agent) => (
                <AgentEntry key={agent.id} agent={agent} />
              ))}
            </div>
          )}

          {recent.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-[10px] uppercase tracking-[0.15em]"
                style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
              >
                Recent
              </p>
              {recent.map((agent) => (
                <AgentEntry key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
