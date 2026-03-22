function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className}`}
      style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
    />
  );
}

interface BusinessCardProps {
  data: {
    clientCount: number;
    leads: { enquiry: number; consulted: number; converted: number };
    lastUpdated: string;
  } | null;
  loading?: boolean;
}

export function BusinessCard({ data, loading = false }: BusinessCardProps) {
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-3 w-28" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-12 w-16" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-12 w-16" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-12 w-16" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-12 w-16" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
        </div>
        <SkeletonBlock className="h-3 w-24" />
      </div>
    );
  }

  const effectiveData = data ?? {
    clientCount: 0,
    leads: { enquiry: 0, consulted: 0, converted: 0 },
    lastUpdated: new Date().toISOString(),
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs text-text-muted uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          Business Stats
        </span>
        <div
          className="h-px flex-1 mx-4"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0.05) 100%)",
          }}
        />
        {effectiveData.lastUpdated && (
          <span
            className="text-xs text-text-muted"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            {relativeTime(effectiveData.lastUpdated)}
          </span>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Client Count */}
        <div className="flex flex-col gap-1">
          <span
            className="text-xs text-text-muted uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-bebas-neue), sans-serif",
              letterSpacing: "0.1em",
            }}
          >
            Client Count
          </span>
          <span
            className="text-5xl text-accent tabular-nums"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
          >
            {effectiveData.clientCount}
          </span>
          <span
            className="text-xs text-text-secondary"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            Active Clients
          </span>
        </div>

        {/* Divider */}
        <div
          className="hidden sm:block h-full w-px self-stretch"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />

        {/* Lead Pipeline */}
        <div className="col-span-1 sm:col-span-2 flex flex-col gap-3">
          <span
            className="text-xs text-text-muted uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-bebas-neue), sans-serif",
              letterSpacing: "0.1em",
            }}
          >
            Lead Pipeline
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Enquiry", value: effectiveData.leads.enquiry },
              { label: "Consulted", value: effectiveData.leads.consulted },
              { label: "Converted", value: effectiveData.leads.converted },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center p-3 rounded"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  className="text-3xl text-text-primary"
                  style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                >
                  {value}
                </span>
                <span
                  className="text-[10px] text-text-muted uppercase tracking-wider mt-1"
                  style={{
                    fontFamily: "var(--font-bebas-neue), sans-serif",
                    letterSpacing: "0.1em",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
