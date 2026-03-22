"use client";

interface Agent {
  name: string;
  model: string;
  status: "active" | "idle";
  session: string;
  uptime: string;
}

interface AgentCardProps {
  agent: Agent;
}

function StatusDot({ status }: { status: "active" | "idle" }) {
  const color =
    status === "active"
      ? "bg-accent shadow-[0_0_8px_rgba(6,182,212,0.6)]"
      : "bg-status-yellow shadow-[0_0_8px_rgba(234,179,8,0.4)]";
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color}`} />
      {status === "active" && (
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent animate-pulse" />
      )}
    </span>
  );
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-xs text-text-muted uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
          >
            Primary Agent
          </span>
          <StatusDot status={agent.status} />
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-bebas-neue), sans-serif",
            letterSpacing: "0.1em",
            backgroundColor: "rgba(6,182,212,0.1)",
            color: "#06b6d4",
          }}
        >
          {agent.status.toUpperCase()}
        </span>
      </div>

      {/* Agent name */}
      <div>
        <h2
          className="text-4xl text-text-primary tracking-wide"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          {agent.name}
        </h2>
        <p
          className="text-xs text-text-secondary mt-1"
          style={{ fontFamily: "var(--font-dm-sans), monospace" }}
        >
          {agent.session}
        </p>
      </div>

      {/* Cyan accent line */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, #06b6d4 0%, rgba(6,182,212,0.1) 100%)" }} />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p
            className="text-xs text-text-muted uppercase tracking-wider mb-1"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
          >
            Model
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "var(--font-dm-sans), monospace", color: "#06b6d4" }}
          >
            {agent.model}
          </p>
        </div>
        <div>
          <p
            className="text-xs text-text-muted uppercase tracking-wider mb-1"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif", letterSpacing: "0.1em" }}
          >
            Uptime
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "var(--font-dm-sans), monospace", color: "#f5f5f5" }}
          >
            {agent.uptime}
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Session health</span>
          <span style={{ color: "#22c55e" }}>100%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: "100%", background: "linear-gradient(90deg, #06b6d4, rgba(6,182,212,0.6))" }}
          />
        </div>
      </div>
    </div>
  );
}
