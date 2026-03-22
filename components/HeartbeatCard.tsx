"use client";

interface HeartbeatData {
  lastHeartbeat: Date;
  nextHeartbeat: Date;
  status: "ok" | "alert";
  intervalMinutes: number;
}

interface HeartbeatCardProps {
  // TODO: replace with real heartbeat data
  // GET /health endpoint: { ok: boolean, status: string }
  // and scheduled heartbeat cron state
  data: HeartbeatData;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 0) return "overdue";
  if (diffSec < 60) return `in ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  return `in ${Math.round(diffMin / 60)}h`;
}

export function HeartbeatCard({ data }: HeartbeatCardProps) {
  const { lastHeartbeat, nextHeartbeat, status, intervalMinutes } = data;
  const isAlert = status === "alert";

  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
          Heartbeat Monitor
        </span>
        <span
          className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
            isAlert
              ? "text-status-red bg-status-red/10"
              : "text-status-green bg-status-green/10"
          }`}
        >
          {isAlert ? "ALERT" : "OK"}
        </span>
      </div>

      {/* Status pulse */}
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            isAlert
              ? "bg-status-red shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse"
              : "bg-status-green shadow-[0_0_12px_rgba(34,197,94,0.6)]"
          }`}
        />
        <p className={`text-sm font-medium ${isAlert ? "text-status-red" : "text-status-green"}`}>
          {isAlert ? "Connection lost — re-establishing..." : "Gateway is alive"}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Last heartbeat
          </p>
          <p className="text-sm font-mono text-text-primary">{formatTime(lastHeartbeat)}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {formatRelative(lastHeartbeat)} ago
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Next scheduled
          </p>
          <p className="text-sm font-mono text-text-primary">{formatTime(nextHeartbeat)}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {formatRelative(nextHeartbeat)}
          </p>
        </div>
      </div>

      {/* Interval bar */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Poll interval</span>
          <span className="text-text-secondary">{intervalMinutes}m</span>
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-accent/60 rounded-full" style={{ width: "35%" }} />
        </div>
      </div>
    </div>
  );
}
