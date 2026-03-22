"use client";

interface HeartbeatData {
  lastHeartbeat: Date | string;
  nextHeartbeat: Date | string;
  status: "ok" | "alert";
  intervalMinutes: number;
}

interface HeartbeatCardProps {
  data: {
    lastRun: string;
    nextRun: string;
    status: "ok" | "alert";
    intervalMinutes: number;
  } | null;
  loading?: boolean;
}

function formatTime(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatRelative(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 0) return "overdue";
  if (diffSec < 60) return `in ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  return `in ${Math.round(diffMin / 60)}h`;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

export function HeartbeatCard({ data, loading = false }: HeartbeatCardProps) {
  const isAlert = data?.status === "alert";

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="h-5 w-12" />
        </div>
        <SkeletonBlock className="h-8 w-full" />
        <SkeletonBlock className="h-px w-full" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
        </div>
        <SkeletonBlock className="h-4 w-full" />
      </div>
    );
  }

  const lastHeartbeat = data?.lastRun ? new Date(data.lastRun) : new Date();
  const nextHeartbeat = data?.nextRun ? new Date(data.nextRun) : new Date(Date.now() + 30 * 60 * 1000);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs text-text-muted uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          Heartbeat Monitor
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-bebas-neue), sans-serif",
            letterSpacing: "0.1em",
            backgroundColor: isAlert ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            color: isAlert ? "#ef4444" : "#22c55e",
          }}
        >
          {isAlert ? "ALERT" : "OK"}
        </span>
      </div>

      {/* Status pulse */}
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={
            isAlert
              ? {
                  backgroundColor: "#ef4444",
                  boxShadow: "0 0 12px rgba(239,68,68,0.7)",
                  animation: "pulse 1.5s infinite",
                }
              : {
                  backgroundColor: "#06b6d4",
                  boxShadow: "0 0 12px rgba(6,182,212,0.6)",
                }
          }
        />
        <p
          className="text-sm font-medium"
          style={{ color: isAlert ? "#ef4444" : "#06b6d4" }}
        >
          {isAlert ? "Connection lost — re-establishing..." : "Gateway is alive"}
        </p>
      </div>

      {/* Cyan accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #06b6d4 0%, rgba(6,182,212,0.1) 100%)" }} />

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p
            className="text-xs text-text-muted uppercase tracking-wider mb-1"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
          >
            Last heartbeat
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "var(--font-dm-sans), monospace", color: "#f5f5f5" }}
          >
            {formatTime(lastHeartbeat)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {formatRelative(lastHeartbeat)} ago
          </p>
        </div>
        <div>
          <p
            className="text-xs text-text-muted uppercase tracking-wider mb-1"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
          >
            Next scheduled
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "var(--font-dm-sans), monospace", color: "#f5f5f5" }}
          >
            {formatTime(nextHeartbeat)}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {formatRelative(nextHeartbeat)}
          </p>
        </div>
      </div>

      {/* Interval bar */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Poll interval</span>
          <span className="text-text-secondary">{data?.intervalMinutes ?? 30}m</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: "35%", background: "linear-gradient(90deg, #06b6d4, rgba(6,182,212,0.4))" }}
          />
        </div>
      </div>
    </div>
  );
}
