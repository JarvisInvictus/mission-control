"use client";

import { useEffect, useState } from "react";

// ─── Design tokens (match Mission Control) ────────────────────────────────────
const Tiffany = "#0abab5";
const TiffanySoft = "rgba(10,186,181,0.12)";
const TiffanyBorder = "rgba(10,186,181,0.25)";
const GlassBg = "rgba(255,255,255,0.05)";
const GlassBorder = "rgba(255,255,255,0.10)";

const GlassCard: React.CSSProperties = {
  background: GlassBg,
  border: `1px solid ${GlassBorder}`,
  borderRadius: "16px",
  padding: "16px 18px",
};

const SectionLabel: React.CSSProperties = {
  fontFamily: "system-ui",
  fontSize: "10px",
  color: "rgba(255,255,255,0.35)",
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  margin: "0 0 12px",
};

// ─── Types (mirror server payload) ────────────────────────────────────────────

interface KPIWeeklyCheckIn {
  weekKey: string;
  rate: number;
  submitted: number;
  total: number;
}

interface KPIData {
  coach: "Milzzy" | "Miggy";
  activeClients: number;
  pausedClients: number;
  cancelledClients: number;
  weeklyRevenue: number;
  coachEarnings: number;
  activeRevenue: number;
  checkIn: {
    thisWeek: { total: number; submitted: number; late: number; missed: number; rate: number };
    last4Weeks: { total: number; submitted: number; late: number; missed: number; rate: number };
    weekly: KPIWeeklyCheckIn[];
  };
  tasks: {
    totalLast30d: number;
    doneLast30d: number;
    overdueOpen: number;
    completionRate: number;
  };
  clientHealth: {
    staleCount: number;
    staleClients: { id: string; name: string; lastCheckIn: string | null }[];
    avgTenureWeeks: number;
    newLast30d: number;
    cancelledLast30d: number;
  };
  pipeline: {
    newLeads: number;
    inConsult: number;
    followUp: number;
    signed: number;
    lost: number;
  };
}

interface Payload {
  generatedAt: string;
  weekKeys: string[];
  coaches: KPIData[];
}

const COACHES: ("Milzzy" | "Miggy")[] = ["Milzzy", "Miggy"];

const COACH_META: Record<"Milzzy" | "Miggy", { label: string; color: string; accentBg: string; accentBorder: string }> = {
  Milzzy: {
    label: "Milzzy",
    color: Tiffany,
    accentBg: "rgba(10,186,181,0.10)",
    accentBorder: "rgba(10,186,181,0.30)",
  },
  Miggy: {
    label: "Coach Miggy",
    color: "#a855f7",
    accentBg: "rgba(168,85,247,0.10)",
    accentBorder: "rgba(168,85,247,0.30)",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  hint,
  color = "rgba(255,255,255,0.92)",
}: {
  label: string;
  value: string | number;
  hint?: string;
  color?: string;
}) {
  return (
    <div style={{ ...GlassCard, padding: "14px 16px" }}>
      <p style={{ ...SectionLabel, margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontFamily: "system-ui", fontSize: "26px", fontWeight: 700, color, margin: 0, lineHeight: 1.1 }}>
        {value}
      </p>
      {hint && (
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "4px 0 0" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 75 ? "#34d399" : rate >= 50 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "999px", height: "6px", overflow: "hidden", marginTop: "6px" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, rate))}%`, height: "100%", background: color, borderRadius: "999px", transition: "width 0.4s ease" }} />
    </div>
  );
}

function WeeklyBars({ data, color }: { data: KPIWeeklyCheckIn[]; color: string }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "60px", marginTop: "8px" }}>
      {data.map((w) => (
        <div key={w.weekKey} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: `${Math.max(0, Math.min(100, w.rate))}%`,
                minHeight: w.total > 0 ? "4px" : "0",
                background: w.total === 0 ? "rgba(255,255,255,0.10)" : color,
                borderRadius: "6px 6px 2px 2px",
                opacity: w.total === 0 ? 0.5 : 1,
                transition: "height 0.4s ease",
              }}
              title={`${w.weekKey}: ${w.submitted}/${w.total} (${w.rate}%)`}
            />
          </div>
          <span style={{ fontFamily: "system-ui", fontSize: "9px", color: "rgba(255,255,255,0.35)" }}>
            {w.weekKey.slice(-2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CoachColumn({ data }: { data: KPIData }) {
  const meta = COACH_META[data.coach];
  const ci = data.checkIn.thisWeek;
  const ci4 = data.checkIn.last4Weeks;
  const tasks = data.tasks;
  const health = data.clientHealth;
  const pipe = data.pipeline;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
      {/* Coach header */}
      <div
        style={{
          ...GlassCard,
          background: meta.accentBg,
          border: `1px solid ${meta.accentBorder}`,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
            Coach
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "20px", fontWeight: 700, color: meta.color, margin: "2px 0 0", letterSpacing: "0.02em" }}>
            {meta.label}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.10em", margin: 0 }}>
            Weekly Rev
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.92)", margin: "2px 0 0", fontVariantNumeric: "tabular-nums" }}>
            ${data.weeklyRevenue.toLocaleString("en-AU")}
          </p>
        </div>
      </div>

      {/* Headline metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
        <MetricTile label="Active Clients" value={data.activeClients} hint={`${data.pausedClients} paused · ${data.cancelledClients} cancelled`} />
        <MetricTile label="Coach Earnings" value={`$${data.coachEarnings.toLocaleString("en-AU")}`} hint="per week" color={meta.color} />
        <MetricTile label="Avg Tenure" value={`${health.avgTenureWeeks}w`} hint={`${health.newLast30d} new · ${health.cancelledLast30d} lost · 30d`} />
      </div>

      {/* Check-in performance */}
      <div style={GlassCard}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "4px" }}>
          <p style={SectionLabel}>Check-In Compliance</p>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)" }}>this week / 4-wk avg</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "30px", fontWeight: 700, color: ci.rate >= 75 ? "#34d399" : ci.rate >= 50 ? "#fbbf24" : "#f87171", margin: 0, lineHeight: 1 }}>
              {ci.rate}%
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "2px 0 0" }}>
              {ci.submitted}/{ci.total} on time
            </p>
          </div>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "20px", fontWeight: 600, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1 }}>
              {ci4.rate}%
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "2px 0 0" }}>
              4-wk avg ({ci4.submitted}/{ci4.total})
            </p>
          </div>
        </div>

        <RateBar rate={ci.rate} />

        <div style={{ display: "flex", gap: "10px", marginTop: "10px", fontFamily: "system-ui", fontSize: "11px", flexWrap: "wrap" }}>
          <span style={{ color: "#f87171" }}>● {ci.missed} missed</span>
          <span style={{ color: "#fbbf24" }}>● {ci.late} late</span>
          <span style={{ color: "#34d399" }}>● {ci.submitted} on time</span>
        </div>

        <p style={{ ...SectionLabel, margin: "16px 0 0" }}>4-Week Trend</p>
        <WeeklyBars data={data.checkIn.weekly} color={meta.color} />
      </div>

      {/* Tasks */}
      <div style={GlassCard}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" }}>
          <p style={SectionLabel}>Task Performance · Last 30 Days</p>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)" }}>{tasks.totalLast30d} tasks</span>
        </div>

        <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "30px", fontWeight: 700, color: tasks.completionRate >= 75 ? "#34d399" : tasks.completionRate >= 50 ? "#fbbf24" : "#f87171", margin: 0, lineHeight: 1 }}>
              {tasks.completionRate}%
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "2px 0 0" }}>
              completion
            </p>
          </div>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "20px", fontWeight: 600, color: tasks.overdueOpen > 0 ? "#f87171" : "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1 }}>
              {tasks.overdueOpen}
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "2px 0 0" }}>
              overdue open
            </p>
          </div>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "20px", fontWeight: 600, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1 }}>
              {tasks.doneLast30d}
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "2px 0 0" }}>
              completed
            </p>
          </div>
        </div>

        <RateBar rate={tasks.completionRate} />
      </div>

      {/* Client health + Pipeline side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {/* Stale clients */}
        <div style={GlassCard}>
          <p style={SectionLabel}>Stale Clients</p>
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "26px",
              fontWeight: 700,
              color: health.staleCount > 0 ? "#f87171" : "#34d399",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {health.staleCount}
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "4px 0 0" }}>
            no check-in in 2+ weeks
          </p>
          {health.staleClients.length > 0 && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px", maxHeight: "120px", overflowY: "auto" }}>
              {health.staleClients.slice(0, 8).map((c) => (
                <div
                  key={c.id}
                  style={{
                    fontFamily: "system-ui",
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.65)",
                    padding: "4px 8px",
                    background: "rgba(248,113,113,0.06)",
                    border: "1px solid rgba(248,113,113,0.18)",
                    borderRadius: "6px",
                  }}
                >
                  {c.name}
                </div>
              ))}
              {health.staleClients.length > 8 && (
                <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", margin: "2px 0 0", fontStyle: "italic" }}>
                  +{health.staleClients.length - 8} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lead pipeline */}
        <div style={GlassCard}>
          <p style={SectionLabel}>Lead Pipeline</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
            <PipeRow label="New / Booking" value={pipe.newLeads} color={Tiffany} />
            <PipeRow label="In Consult" value={pipe.inConsult} color="#a855f7" />
            <PipeRow label="Follow Up" value={pipe.followUp} color="#fbbf24" />
            <PipeRow label="Signed" value={pipe.signed} color="#34d399" />
            <PipeRow label="Lost / No-show" value={pipe.lost} color="#f87171" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PipeRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: color, flexShrink: 0 }} />
        <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>{label}</span>
      </div>
      <span style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: value > 0 ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.25)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Comparison summary ───────────────────────────────────────────────────────

function ComparisonRow({ label, milzzy, miggy, formatter, higherIsBetter = true }: {
  label: string;
  milzzy: number;
  miggy: number;
  formatter: (n: number) => string;
  higherIsBetter?: boolean;
}) {
  const diff = milzzy - miggy;
  const winner: "Milzzy" | "Miggy" | "tie" =
    Math.abs(diff) < 0.001 ? "tie" : (diff > 0 ? "Milzzy" : "Miggy");
  const winnerBetter = higherIsBetter ? winner : winner === "tie" ? "tie" : (winner === "Milzzy" ? "Miggy" : "Milzzy");

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 100px 100px",
      alignItems: "center",
      padding: "10px 14px",
      gap: "12px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{label}</span>
      <span style={{
        fontFamily: "system-ui",
        fontSize: "14px",
        fontWeight: 600,
        color: winnerBetter === "Milzzy" ? Tiffany : "rgba(255,255,255,0.70)",
        fontVariantNumeric: "tabular-nums",
        textAlign: "right",
      }}>
        {formatter(milzzy)}
      </span>
      <span style={{
        fontFamily: "system-ui",
        fontSize: "14px",
        fontWeight: 600,
        color: winnerBetter === "Miggy" ? "#a855f7" : "rgba(255,255,255,0.70)",
        fontVariantNumeric: "tabular-nums",
        textAlign: "right",
      }}>
        {formatter(miggy)}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CoachKPIsTab({ coachOnly }: { coachOnly?: "Milzzy" | "Miggy" } = {}) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/coach-kpis", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: Payload = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.40)", fontFamily: "system-ui" }}>
        Loading coach KPIs…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: "24px" }}>
        <div style={{ ...GlassCard, border: "1px solid rgba(248,113,113,0.30)" }}>
          <p style={{ fontFamily: "system-ui", color: "#f87171", margin: 0 }}>
            Failed to load KPIs: {error}
          </p>
          <button
            onClick={fetchKPIs}
            style={{
              marginTop: "12px",
              background: "rgba(248,113,113,0.10)",
              border: "1px solid rgba(248,113,113,0.30)",
              borderRadius: "8px",
              color: "#f87171",
              padding: "6px 14px",
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "system-ui",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const [milzzy, miggy] = data.coaches;
  const visibleCoaches = coachOnly ? data.coaches.filter((c) => c.coach === coachOnly) : data.coaches;

  return (
    <div style={{ padding: "0 4px", maxWidth: "1400px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p style={{ ...SectionLabel, margin: 0 }}>Performance</p>
          <p style={{ fontFamily: "system-ui", fontSize: "22px", fontWeight: 700, color: "rgba(255,255,255,0.92)", margin: "2px 0 0", letterSpacing: "-0.01em" }}>
            Coach KPIs
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: "4px 0 0" }}>
            Live · auto-refresh every 60s · generated {new Date(data.generatedAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <button
          onClick={fetchKPIs}
          style={{
            background: GlassBg,
            border: `1px solid ${GlassBorder}`,
            borderRadius: "10px",
            color: "rgba(255,255,255,0.70)",
            padding: "8px 14px",
            fontSize: "12px",
            cursor: "pointer",
            fontFamily: "system-ui",
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = GlassBg)}
        >
          ↻ Refresh
        </button>
      </div>

      {/* WhatsApp reply times placeholder — V2 (admin only) */}
      {!coachOnly && (
      <div
        style={{
          ...GlassCard,
          background: "linear-gradient(135deg, rgba(10,186,181,0.06) 0%, rgba(168,85,247,0.04) 100%)",
          border: "1px dashed rgba(10,186,181,0.25)",
          marginBottom: "20px",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <span style={{ fontSize: "20px" }}>💬</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.70)", margin: 0, fontWeight: 600 }}>
            WhatsApp reply times — coming in V2
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "2px 0 0" }}>
            Requires migrating to the WhatsApp Business API. Once connected, avg reply time, response rate and missed messages will appear here per coach.
          </p>
        </div>
      </div>
      )}

      {/* Two coach columns */}
      <div style={{ display: "grid", gridTemplateColumns: coachOnly ? "1fr" : "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        {visibleCoaches.map((c) => (
          <CoachColumn key={c.coach} data={c} />
        ))}
      </div>

      {/* Side-by-side comparison (admin only) */}
      {!coachOnly && (
      <div style={GlassCard}>
        <p style={SectionLabel}>Side-by-Side Comparison</p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 100px 100px",
          padding: "0 14px 8px",
          gap: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.10em" }}>Metric</span>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.10em", textAlign: "right" }}>Milzzy</span>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "#a855f7", textTransform: "uppercase", letterSpacing: "0.10em", textAlign: "right" }}>Miggy</span>
        </div>
        <ComparisonRow label="Active Clients" milzzy={milzzy.activeClients} miggy={miggy.activeClients} formatter={(n) => `${n}`} />
        <ComparisonRow label="Weekly Revenue" milzzy={milzzy.weeklyRevenue} miggy={miggy.weeklyRevenue} formatter={(n) => `$${n.toLocaleString("en-AU")}`} />
        <ComparisonRow label="Coach Earnings (per week)" milzzy={milzzy.coachEarnings} miggy={miggy.coachEarnings} formatter={(n) => `$${n.toLocaleString("en-AU")}`} />
        <ComparisonRow label="Check-In Rate (this week)" milzzy={milzzy.checkIn.thisWeek.rate} miggy={miggy.checkIn.thisWeek.rate} formatter={(n) => `${n}%`} />
        <ComparisonRow label="Check-In Rate (4-wk)" milzzy={milzzy.checkIn.last4Weeks.rate} miggy={miggy.checkIn.last4Weeks.rate} formatter={(n) => `${n}%`} />
        <ComparisonRow label="Task Completion (30d)" milzzy={milzzy.tasks.completionRate} miggy={miggy.tasks.completionRate} formatter={(n) => `${n}%`} />
        <ComparisonRow label="Overdue Tasks" milzzy={milzzy.tasks.overdueOpen} miggy={miggy.tasks.overdueOpen} formatter={(n) => `${n}`} higherIsBetter={false} />
        <ComparisonRow label="Stale Clients" milzzy={milzzy.clientHealth.staleCount} miggy={miggy.clientHealth.staleCount} formatter={(n) => `${n}`} higherIsBetter={false} />
        <ComparisonRow label="Avg Client Tenure" milzzy={milzzy.clientHealth.avgTenureWeeks} miggy={miggy.clientHealth.avgTenureWeeks} formatter={(n) => `${n}w`} />
        <ComparisonRow label="New Clients (30d)" milzzy={milzzy.clientHealth.newLast30d} miggy={miggy.clientHealth.newLast30d} formatter={(n) => `${n}`} />
        <ComparisonRow label="Active Leads" milzzy={milzzy.pipeline.newLeads + milzzy.pipeline.inConsult + milzzy.pipeline.followUp} miggy={miggy.pipeline.newLeads + miggy.pipeline.inConsult + miggy.pipeline.followUp} formatter={(n) => `${n}`} />
      </div>
      )}
    </div>
  );
}