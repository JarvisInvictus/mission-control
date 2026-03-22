"use client";

export interface SubAgent {
  id: string;
  task: string;
  model: string;
  status: "active" | "completed" | "failed";
  startedAt: Date;
  completedAt: Date | null;
  parentSession: string;
}

interface SubagentCardProps {
  // TODO: replace with real sub-agent data from OpenClaw gateway
  // Likely from /api/subagents or active sessions endpoint
  agents: SubAgent[];
}

function formatDuration(start: Date, end: Date | null): string {
  const endTime = end ?? new Date();
  const diffMs = endTime.getTime() - start.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`;
  return `${Math.round(diffMin / 60)}h ${diffMin % 60}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatusIndicator({ status }: { status: SubAgent["status"] }) {
  if (status === "active") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
    );
  }
  if (status === "completed") {
    return <span className="h-2 w-2 rounded-full bg-status-green block" />;
  }
  return <span className="h-2 w-2 rounded-full bg-status-red block" />;
}

export function SubagentCard({ agents }: SubagentCardProps) {
  const active = agents.filter((a) => a.status === "active");
  const recent = agents.filter((a) => a.status !== "active").slice(0, 4);

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
          Sub-agent Activity
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs text-text-muted">{active.length} active</span>
          </div>
          <span className="text-xs font-mono text-text-muted">
            {agents.length} total
          </span>
        </div>
      </div>

      {/* Active agents */}
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted uppercase tracking-wider">Active</p>
          {active.map((agent) => (
            <div
              key={agent.id}
              className="bg-bg-base border border-accent/30 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <StatusIndicator status={agent.status} />
                <p className="text-sm font-medium text-text-primary truncate">
                  {agent.task}
                </p>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span className="font-mono text-accent/80">{agent.model}</span>
                <span className="font-mono">
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
          <p className="text-xs text-text-muted uppercase tracking-wider">Recent</p>
          {recent.map((agent) => (
            <div
              key={agent.id}
              className="bg-bg-base border border-border rounded-lg p-3 hover:border-border/80 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <StatusIndicator status={agent.status} />
                <p className="text-sm text-text-secondary truncate">{agent.task}</p>
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span className="font-mono text-text-muted/80">
                  {agent.model}
                </span>
                <span className="font-mono">
                  {formatDuration(agent.startedAt, agent.completedAt)}{" "}
                  · {formatTime(agent.startedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {agents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-text-muted gap-2">
          <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
            <span className="text-lg opacity-40">◎</span>
          </div>
          <p className="text-sm">No sub-agents running</p>
        </div>
      )}
    </div>
  );
}
