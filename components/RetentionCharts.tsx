"use client";

import { useMemo } from "react";
import type { Client } from "@/app/page";

const TIFFANY = "#0abab5";
const GREEN = "#34d399";
const RED = "#f87171";
const AMBER = "#fbbf24";
const BG = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";

function getMonthLabel(month: number): string {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month];
}

function getMonthData(clients: Client[]) {
  const MONTHS = 12;
  const signups = new Array(MONTHS).fill(0);
  const cancellations = new Array(MONTHS).fill(0);
  const revenueGained = new Array(MONTHS).fill(0);
  const revenueLost = new Array(MONTHS).fill(0);

  clients.forEach(c => {
    if (!c.startDate) return;
    const start = new Date(c.startDate + "T00:00:00");
    if (start.getFullYear() !== 2026) return;
    const m = start.getMonth();
    signups[m]++;
    revenueGained[m] += (c.weeklyCharge || 0) * 4;
  });

  clients.forEach(c => {
    if (c.status !== "cancelled") return;
    if (!c.lastUpdated) return;
    const lastUp = new Date(c.lastUpdated);
    if (lastUp.getFullYear() !== 2026) return;
    const m = lastUp.getMonth();
    cancellations[m]++;
    revenueLost[m] += (c.weeklyCharge || 0) * 4;
  });

  const net = signups.map((s, i) => s - cancellations[i]);
  const runningNet: number[] = [];
  let cumulative = 0;
  net.forEach(n => { cumulative += n; runningNet.push(cumulative); });

  return { signups, cancellations, net, runningNet, revenueGained, revenueLost };
}

// ─── Pure CSS mini bar chart ─────────────────────────────────────────────────

function MiniBarChart({
  data,
  labels,
  colors,
  height = 120,
}: {
  data: number[][];  // array of series, each series array of values
  labels: string[];
  colors: string[];
  height?: number;
}) {
  const allVals = data.flat();
  const max = Math.max(...allVals, 1);
  const barW = Math.max(12, Math.min(40, (100 / labels.length) - 4));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Legend */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {colors.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>{data.length > 1 ? ["Joined", "Cancelled"][i] : labels[i]}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: "6px",
        height: height,
        paddingBottom: "28px",
        position: "relative",
      }}>
        {labels.map((label, i) => {
          const vals = data.map(series => series[i] || 0);
          const total = vals.reduce((a, b) => a + b, 0);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flex: 1, minWidth: 0 }}>
              {/* Stacked bar */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                height: `${(total / max) * height}px`,
                width: "100%",
                maxWidth: `${barW}px`,
                margin: "0 auto",
                position: "relative",
              }}>
                {data.map((series, si) => {
                  const val = series[i] || 0;
                  if (val === 0) return null;
                  const segH = (val / total) * 100;
                  return (
                    <div key={si} style={{
                      width: "100%",
                      height: `${segH}%`,
                      background: colors[si],
                      opacity: data.length === 1 ? 0.8 : si === 0 ? 0.85 : 0.75,
                      borderRadius: "4px 4px 0 0",
                      minHeight: val > 0 ? 4 : 0,
                    }} />
                  );
                })}
              </div>
              {/* Value label */}
              {total > 0 && (
                <span style={{
                  fontFamily: "system-ui, monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.75)",
                  position: "absolute",
                  bottom: `${(total / max) * height + 4}px`,
                  left: "50%",
                  transform: "translateX(-50%)",
                  whiteSpace: "nowrap",
                }}>
                  {total}
                </span>
              )}
              {/* Month label */}
              <span style={{
                fontFamily: "system-ui",
                fontSize: "10px",
                color: "rgba(255,255,255,0.30)",
                position: "absolute",
                bottom: 0,
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Running Net sparkline ────────────────────────────────────────────────────

function Sparkline({ values, color, height = 60, showDots = true }: {
  values: number[];
  color: string;
  height?: number;
  showDots?: boolean;
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 100; // percentage

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = height - ((v - min) / range) * height;
    return `${x}%,${y}%`;
  });

  return (
    <div style={{ position: "relative", height: `${height}px` }}>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        style={{ width: "100%", height: `${height}px`, position: "absolute", top: 0, left: 0 }}
        preserveAspectRatio="none"
      >
        {/* Area fill */}
        <defs>
          <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.20" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <polyline
          points={[...points, `${W}%,${height}%`, `0%,${height}%`].join(" ")}
          fill={`url(#sg-${color.replace('#','')})`}
        />
        {showDots && values.map((v, i) => {
          const x = (i / (values.length - 1)) * W;
          const y = height - ((v - min) / range) * height;
          return (
            <circle key={i} cx={`${x}%`} cy={`${y}%`} r="3" fill={color} />
          );
        })}
      </svg>
      <div style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        fontFamily: "system-ui, monospace",
        fontSize: "11px",
        fontWeight: 700,
        color,
      }}>
        {values[values.length - 1] >= 0 ? `+${values[values.length - 1]}` : values[values.length - 1]}
      </div>
    </div>
  );
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: BG,
      border: `1px solid ${BORDER}`,
      borderRadius: "12px",
      padding: "10px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      minWidth: 0,
    }}>
      <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      <span style={{ fontFamily: "system-ui, monospace", fontSize: "18px", fontWeight: 800, color }}>
        {value}
      </span>
    </div>
  );
}

export function RetentionCharts({ clients }: { clients: Client[] }) {
  const { signups, cancellations, net, runningNet, revenueGained, revenueLost } = useMemo(
    () => getMonthData(clients),
    [clients]
  );

  // Show March–December (month index 2–11)
  const MARCH_DEC = Array.from({ length: 10 }, (_, i) => i + 2);
  const labels = MARCH_DEC.map(m => getMonthLabel(m));
  const dispSignups = MARCH_DEC.map(m => signups[m]);
  const dispCancellations = MARCH_DEC.map(m => cancellations[m]);
  const dispNet = MARCH_DEC.map(m => net[m]);
  const dispRunningNet = MARCH_DEC.map(m => runningNet[m]);
  const dispRevGained = MARCH_DEC.map(m => revenueGained[m]);
  const dispRevLost = MARCH_DEC.map(m => revenueLost[m]);

  const totalJoined = dispSignups.reduce((a, b) => a + b, 0);
  const totalCancelled = dispCancellations.reduce((a, b) => a + b, 0);
  const totalNet = totalJoined - totalCancelled;
  const currentNet = dispRunningNet[dispRunningNet.length - 1];
  const totalRevGained = dispRevGained.reduce((a, b) => a + b, 0);
  const totalRevLost = dispRevLost.reduce((a, b) => a + b, 0);

  return (
    <div style={{
      background: BG,
      border: `1px solid ${BORDER}`,
      borderRadius: "16px",
      padding: "20px",
      marginBottom: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p style={{ fontFamily: "system-ui", fontSize: "11px", color: TIFFANY, textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 4px" }}>2026</p>
          <p style={{ fontFamily: "system-ui", fontSize: "15px", fontWeight: 700, color: "white", margin: 0 }}>Signups & Churn</p>
        </div>
        {/* Quick stats */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <StatPill label="Net" value={`${currentNet >= 0 ? "+" : ""}${currentNet}`} color={currentNet >= 0 ? GREEN : RED} />
          <StatPill label="Joined" value={`${totalJoined}`} color={GREEN} />
          <StatPill label="Churned" value={`${totalCancelled}`} color={RED} />
        </div>
      </div>

      {/* Chart: stacked bars + running net sparkline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: "20px", alignItems: "flex-end" }}>
        {/* Stacked bar chart */}
        <MiniBarChart
          data={[dispSignups, dispCancellations]}
          labels={labels}
          colors={[GREEN, RED]}
          height={130}
        />

        {/* Running net sparkline */}
        <div style={{
          background: "rgba(0,0,0,0.20)",
          borderRadius: "12px",
          padding: "12px",
          height: "130px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "9px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>Running Net</p>
            <p style={{ fontFamily: "system-ui, monospace", fontSize: "22px", fontWeight: 800, color: TIFFANY, margin: 0 }}>
              {currentNet >= 0 ? `+${currentNet}` : currentNet}
            </p>
          </div>
          <Sparkline values={dispRunningNet} color={TIFFANY} height={55} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "system-ui", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>Mar</span>
            <span style={{ fontFamily: "system-ui", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>Dec</span>
          </div>
        </div>
      </div>

      {/* ── Revenue Section ───────────────────────────────────────────────── */}
      <div style={{
        marginTop: "20px",
        paddingTop: "20px",
        borderTop: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 4px" }}>2026</p>
            <p style={{ fontFamily: "system-ui", fontSize: "15px", fontWeight: 700, color: "white", margin: 0 }}>Revenue Impact</p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <StatPill label="Gained" value={`$${(totalRevGained / 1000).toFixed(1)}k`} color={GREEN} />
            <StatPill label="Lost" value={`$${(totalRevLost / 1000).toFixed(1)}k`} color={RED} />
            <StatPill label="Net" value={`$${((totalRevGained - totalRevLost) / 1000).toFixed(1)}k`} color={totalRevGained >= totalRevLost ? GREEN : RED} />
          </div>
        </div>

        {/* Revenue bar chart */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: "20px", alignItems: "flex-end" }}>
          <MiniBarChart
            data={[dispRevGained, dispRevLost]}
            labels={labels}
            colors={[GREEN, RED]}
            height={130}
          />

          {/* Monthly rev delta sparkline */}
          <div style={{
            background: "rgba(0,0,0,0.20)",
            borderRadius: "12px",
            padding: "12px",
            height: "130px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
            <div>
              <p style={{ fontFamily: "system-ui", fontSize: "9px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 2px" }}>Net Rev</p>
              <p style={{ fontFamily: "system-ui, monospace", fontSize: "22px", fontWeight: 800, color: totalRevGained >= totalRevLost ? GREEN : RED, margin: 0 }}>
                ${((totalRevGained - totalRevLost) / 1000).toFixed(1)}k
              </p>
            </div>
            <Sparkline
              values={MARCH_DEC.map(m => revenueGained[m] - revenueLost[m])}
              color={totalRevGained >= totalRevLost ? GREEN : RED}
              height={55}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "system-ui", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>Mar</span>
              <span style={{ fontFamily: "system-ui", fontSize: "9px", color: "rgba(255,255,255,0.25)" }}>Dec</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
