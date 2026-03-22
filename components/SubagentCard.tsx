"use client";

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
    return (
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
          style={{ backgroundColor: "#06b6d4", opacity: 0.4 }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: "#06b6d4" }}
        />
      </span>
    );
  }
  if (status === "completed") {
    return <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#22c55e" }} />;
  }
  return <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#ef4444" }} />;
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
  const isLoading = loading && agents.length === 0;
  const active = agents.filter((a) => a.status === "active");
  const recent = agents.filter((a) => a.status !== "active").slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs text-text-muted uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          Sub-agent Activity
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: "#06b6d4" }}
            />
            <span
              className="text-xs text-text-muted"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              {isLoading ? "—" : `${active.length} active`}
            </span>
          </div>
          <span
            className="text-xs text-text-muted"
            style={{ fontFamily: "var(--font-dm-sans), monospace" }}
          >
            {isLoading ? "—" : `${agents.length} total`}
          </span>
        </div>
      </div>

      {/* Cyan accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #06b6d4 0%, rgba(6,182,212,0.1) 100%)" }} />

      {isLoading ? (
        <>
          <div className="rounded-lg p-3" style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)" }}>
            <SkeletonBlock className="h-4 w-3/4 mb-2" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
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
                className="text-xs text-text-muted uppercase tracking-wider"
                style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
              >
                Active
              </p>
              {active.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(6,182,212,0.05)",
                    border: "1px solid rgba(6,182,212,0.25)",
                    boxShadow: "0 0 16px rgba(6,182,212,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusIndicator status={agent.status} />
                    <p
                      className="text-sm font-medium text-text-primary truncate"
                      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                    >
                      {agent.task}
                    </p>
                  </div>
                  <div
                    className="flex justify-between text-xs"
                    style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                  >
                    <span style={{ color: "rgba(6,182,212,0.7)", fontFamily: "var(--font-dm-sans), monospace" }}>
                      {agent.model}
                    </span>
                    <span className="text-text-muted font-mono">
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
                className="text-xs text-text-muted uppercase tracking-wider"
                style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
              >
                Recent
              </p>
              {recent.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-lg p-3 transition-all duration-200 cursor-default"
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
                      className="text-sm text-text-secondary truncate"
                      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                    >
                      {agent.task}
                    </p>
                  </div>
                  <div
                    className="flex justify-between text-xs text-text-muted"
                    style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                  >
                    <span
                      style={{ fontFamily: "var(--font-dm-sans), monospace", opacity: 0.6 }}
                    >
                      {agent.model}
                    </span>
                    <span style={{ fontFamily: "var(--font-dm-sans), monospace" }}>
                      {formatDuration(agent.startedAt, agent.completedAt)} · {formatTime(agent.startedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {agents.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-6 gap-2"
              style={{ color: "#525252" }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-lg opacity-40">◎</span>
              </div>
              <p className="text-sm" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
                No sub-agents running
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
