"use client";

interface Agent {
  name: string;
  model: string;
  status: "active" | "idle";
  session: string;
  uptime: string;
}

interface AgentCardProps {
  // TODO: replace with real API data from OpenClaw gateway
  // GET /api/agents or similar endpoint
  agent: Agent;
}

function StatusDot({ status }: { status: "active" | "idle" }) {
  const color =
    status === "active"
      ? "bg-status-green shadow-[0_0_8px_rgba(34,197,94,0.6)]"
      : "bg-status-yellow shadow-[0_0_8px_rgba(234,179,8,0.4)]";
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`absolute inline-flex h-full w-full rounded-full ${color}`} />
      {status === "active" && (
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-green animate-pulse" />
      )}
    </span>
  );
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-muted uppercase tracking-widest">
            Primary Agent
          </span>
          <StatusDot status={agent.status} />
        </div>
        <span className="text-xs font-mono text-accent bg-accent/10 px-2 py-0.5 rounded">
          {agent.status.toUpperCase()}
        </span>
      </div>

      {/* Agent name */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
          {agent.name}
        </h2>
        <p className="text-text-secondary text-sm mt-0.5">{agent.session}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Model</p>
          <p className="text-sm font-mono text-accent">{agent.model}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Uptime</p>
          <p className="text-sm font-mono text-text-primary">{agent.uptime}</p>
        </div>
      </div>

      {/* Status bar */}
      <div>
        <div className="flex justify-between text-xs text-text-muted mb-1.5">
          <span>Session health</span>
          <span className="text-status-green">100%</span>
        </div>
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
