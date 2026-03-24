"use client";

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  scheduleLabel: string;
  lastRun: string | null;
  nextRun: string;
  status: "ok" | "running" | "failed" | "pending";
}

interface CronCardProps {
  jobs: CronJob[];
  loading?: boolean;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 0) return "overdue";
  if (diffSec < 60) return `in ${diffSec}s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `in ${diffMin}m`;
  return `in ${Math.round(diffMin / 60)}h ${diffMin % 60}m`;
}

function StatusBadge({ status }: { status: CronJob["status"] }) {
  const config = {
    ok: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
    running: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },
    failed: { bg: "rgba(248,113,113,0.15)", color: "#f87171" },
    pending: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" },
  };
  const c = config[status];
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-[999px]"
      style={{
        fontFamily: "system-ui, -apple-system, Inter, sans-serif",
        letterSpacing: "0.06em",
        backgroundColor: c.bg,
        color: c.color,
      }}
    >
      {status.toUpperCase()}
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

export function CronCard({ jobs, loading = false }: CronCardProps) {
  const isLoading = loading && jobs.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}
        >
          Cron Jobs
        </span>
        <span
          className="text-[11px]"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
        >
          {isLoading ? "—" : `${jobs.length} registered`}
        </span>
      </div>

      {/* Blue accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #3b82f6 0%, rgba(59,130,246,0.1) 100%)" }} />

      {/* Job list */}
      <div className="flex flex-col gap-2">
        {isLoading
          ? [0, 1].map((i) => (
              <div
                key={i}
                className="rounded-[10px] p-3"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <SkeletonBlock className="h-4 w-32 mb-2" />
                <SkeletonBlock className="h-3 w-24" />
                <div className="flex justify-between mt-2">
                  <SkeletonBlock className="h-3 w-16" />
                  <SkeletonBlock className="h-3 w-16" />
                </div>
              </div>
            ))
          : jobs.length === 0 ? (
              <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.30)", textAlign: "center", padding: "20px 0" }}>
                No cron jobs configured. Add scheduled tasks to automate Jarvis.
              </p>
            )
          : jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-[10px] p-3 transition-all duration-200 cursor-default"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.35)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 12px rgba(59,130,246,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.90)" }}
                      >
                        {job.name}
                      </p>
                      <StatusBadge status={job.status} />
                    </div>
                    <p
                      className="text-[11px]"
                      style={{ fontFamily: "system-ui, monospace", color: "rgba(59,130,246,0.70)" }}
                    >
                      {job.scheduleLabel}
                    </p>
                  </div>
                </div>

                <div
                  className="flex justify-between mt-2 text-[11px]"
                  style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif" }}
                >
                  <div className="flex flex-col">
                    <span
                      className="uppercase tracking-[0.1em] text-[10px] mb-0.5"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      Last run
                    </span>
                    <span
                      style={{ fontFamily: "system-ui, monospace", color: "rgba(255,255,255,0.60)" }}
                    >
                      {job.lastRun ? formatTime(job.lastRun) : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span
                      className="uppercase tracking-[0.1em] text-[10px] mb-0.5"
                      style={{ color: "rgba(255,255,255,0.30)" }}
                    >
                      Next run
                    </span>
                    <span
                      style={{ fontFamily: "system-ui, monospace", color: "rgba(255,255,255,0.60)" }}
                    >
                      {job.nextRun ? formatRelative(job.nextRun) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
