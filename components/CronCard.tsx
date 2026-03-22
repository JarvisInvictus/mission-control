"use client";

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  scheduleLabel: string;
  lastRun: Date | null;
  nextRun: Date;
  status: "ok" | "running" | "failed" | "pending";
}

interface CronCardProps {
  jobs: CronJob[];
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
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
  return `in ${Math.round(diffMin / 60)}h ${diffMin % 60}m`;
}

function StatusBadge({ status }: { status: CronJob["status"] }) {
  const config = {
    ok: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
    running: { bg: "rgba(6,182,212,0.1)", color: "#06b6d4" },
    failed: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
    pending: { bg: "rgba(234,179,8,0.1)", color: "#eab308" },
  };
  const c = config[status];
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{
        fontFamily: "var(--font-bebas-neue), sans-serif",
        letterSpacing: "0.08em",
        backgroundColor: c.bg,
        color: c.color,
      }}
    >
      {status.toUpperCase()}
    </span>
  );
}

export function CronCard({ jobs }: CronCardProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs text-text-muted uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          Cron Jobs
        </span>
        <span
          className="text-xs text-text-muted"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          {jobs.length} registered
        </span>
      </div>

      {/* Cyan accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #06b6d4 0%, rgba(6,182,212,0.1) 100%)" }} />

      {/* Job list */}
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-lg p-3 transition-all duration-200 cursor-default"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(6,182,212,0.4)";
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 12px rgba(6,182,212,0.08)";
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
                    className="text-sm font-medium text-text-primary truncate"
                    style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                  >
                    {job.name}
                  </p>
                  <StatusBadge status={job.status} />
                </div>
                <p
                  className="text-xs"
                  style={{ fontFamily: "var(--font-dm-sans), monospace", color: "rgba(6,182,212,0.7)" }}
                >
                  {job.scheduleLabel}
                </p>
              </div>
            </div>

            <div
              className="flex justify-between mt-2 text-xs"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              <div className="flex flex-col">
                <span
                  className="uppercase tracking-wider text-[10px] mb-0.5 text-text-muted"
                  style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
                >
                  Last run
                </span>
                <span
                  className="font-mono text-text-secondary"
                  style={{ fontFamily: "var(--font-dm-sans), monospace" }}
                >
                  {job.lastRun ? formatTime(job.lastRun) : "—"}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span
                  className="uppercase tracking-wider text-[10px] mb-0.5 text-text-muted"
                  style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
                >
                  Next run
                </span>
                <span
                  className="font-mono text-text-secondary"
                  style={{ fontFamily: "var(--font-dm-sans), monospace" }}
                >
                  {formatRelative(job.nextRun)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
