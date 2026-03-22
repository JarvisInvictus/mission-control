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
        <div className="h-px w-full" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
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
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}
        >
          Heartbeat Monitor
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-[999px]"
          style={{
            fontFamily: "system-ui, -apple-system, Inter, sans-serif",
            letterSpacing: "0.08em",
            backgroundColor: isAlert ? "rgba(248,113,113,0.15)" : "rgba(52,211,153,0.15)",
            color: isAlert ? "#f87171" : "#34d399",
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
                  backgroundColor: "#f87171",
                  boxShadow: "0 0 12px rgba(248,113,113,0.7)",
                }
              : {
                  backgroundColor: "#3b82f6",
                  boxShadow: "0 0 12px rgba(59,130,246,0.6)",
                }
          }
        />
        <p
          className="text-sm font-medium"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: isAlert ? "#f87171" : "#3b82f6" }}
        >
          {isAlert ? "Connection lost — re-establishing..." : "Gateway is alive"}
        </p>
      </div>

      {/* Blue accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #3b82f6 0%, rgba(59,130,246,0.1) 100%)" }} />

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-1"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
          >
            Last heartbeat
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "system-ui, monospace", color: "rgba(255,255,255,0.90)" }}
          >
            {formatTime(lastHeartbeat)}
          </p>
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)", fontSize: "11px", marginTop: "2px" }}>
            {formatRelative(lastHeartbeat)} ago
          </p>
        </div>
        <div>
          <p
            className="text-[10px] uppercase tracking-[0.15em] mb-1"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
          >
            Next scheduled
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "system-ui, monospace", color: "rgba(255,255,255,0.90)" }}
          >
            {formatTime(nextHeartbeat)}
          </p>
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)", fontSize: "11px", marginTop: "2px" }}>
            {formatRelative(nextHeartbeat)}
          </p>
        </div>
      </div>

      {/* Interval bar */}
      <div>
        <div className="flex justify-between text-[11px] mb-1.5">
          <span style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}>Poll interval</span>
          <span style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.60)" }}>{data?.intervalMinutes ?? 30}m</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full"
            style={{ width: "35%", background: "linear-gradient(90deg, #3b82f6, rgba(59,130,246,0.4))" }}
          />
        </div>
      </div>
    </div>
  );
}
