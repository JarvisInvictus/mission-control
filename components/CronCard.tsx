"use client";

export interface CronJob {
  id: string;
  name: string;
  schedule: string; // e.g. "*/30 * * * *"
  scheduleLabel: string; // e.g. "Every 30 min"
  lastRun: Date | null;
  nextRun: Date;
  status: "ok" | "running" | "failed" | "pending";
}

interface CronCardProps {
  // TODO: replace with real cron job data from OpenClaw gateway
  // Likely from /api/cron or /api/jobs endpoint
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
  const styles = {
    ok: "text-status-green bg-status-green/10",
    running: "text-accent bg-accent/10",
    failed: "text-status-red bg-status-red/10",
    pending: "text-status-yellow bg-status-yellow/10",
  };
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}

export function CronCard({ jobs }: CronCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
          Cron Jobs
        </span>
        <span className="text-xs font-mono text-text-muted">
          {jobs.length} registered
        </span>
      </div>

      {/* Job list */}
      <div className="flex flex-col gap-2">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-bg-base border border-border rounded-lg p-3 hover:border-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {job.name}
                  </p>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-xs font-mono text-accent/80">{job.scheduleLabel}</p>
              </div>
            </div>

            <div className="flex justify-between mt-2 text-xs text-text-muted">
              <div className="flex flex-col">
                <span className="uppercase tracking-wider text-[10px] mb-0.5">Last run</span>
                <span className="font-mono text-text-secondary">
                  {job.lastRun ? formatTime(job.lastRun) : "—"}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="uppercase tracking-wider text-[10px] mb-0.5">Next run</span>
                <span className="font-mono text-text-secondary">
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
