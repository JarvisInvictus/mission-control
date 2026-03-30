"use client";

import { useMemo } from "react";
import type { Client } from "@/app/page";

const TIFFANY = "#0abab5";
const GREEN = "#34d399";
const RED = "#f87171";
const AMBER = "#fbbf24";

interface RetentionChartsProps {
  clients: Client[];
}

// ─── Monthly Signups vs Cancellations Bar Chart ─────────────────────────────────

function getMonthLabel(month: number): string {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month];
}

function getMonthData(clients: Client[]) {
  const MONTHS = 12;
  // 2026 months: 0=Jan ... 11=Dec
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
    const lastUp = c.lastUpdated ? new Date(c.lastUpdated) : null;
    if (!lastUp || lastUp.getFullYear() !== 2026) return;
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

export function RetentionCharts({ clients }: RetentionChartsProps) {
  const { signups, cancellations, net, runningNet, revenueGained, revenueLost } = useMemo(
    () => getMonthData(clients),
    [clients]
  );

  // Only show March onwards (tracking starts March 2026)
  const months = Array.from({ length: 10 }, (_, i) => getMonthLabel(i + 2));

  // ── Chart 1: Signups vs Cancellations ────────────────────────────────────
  const CHART_W = 600;
  const CHART_H = 200;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 20;
  const PAD_B = 36;
  const chartW = CHART_W - PAD_L - PAD_R;
  const chartH = CHART_H - PAD_T - PAD_B;

  // Only use March onwards for Y-axis scale (Jan/Feb are baseline, set to 0)
  const displaySignups = signups.slice(2);
  const displayCancellations = cancellations.slice(2);
  const maxVal = Math.max(...displaySignups, ...displayCancellations, 1);
  const maxNet = Math.max(...runningNet.slice(2).map(Math.abs), 1);

  function barX(monthIdx: number, side: number): number {
    // side 0 = signup (left), side 1 = cancel (right)
    const groupW = chartW / 12;
    const barW = groupW * 0.35;
    const groupStart = PAD_L + monthIdx * groupW;
    return side === 0
      ? groupStart + groupW * 0.08
      : groupStart + groupW * 0.08 + barW + groupW * 0.04;
  }

  function barW(): number {
    return chartW / 12 * 0.35;
  }

  function barH(val: number): number {
    return (val / maxVal) * chartH;
  }

  function barY(val: number): number {
    return PAD_T + chartH - barH(val);
  }

  // Y axis ticks
  const yTicks: { val: number; y: number }[] = [];
  for (let t = 0; t <= 3; t++) {
    const val = Math.round((maxVal / 3) * t);
    const y = PAD_T + chartH - (val / maxVal) * chartH;
    yTicks.push({ val, y });
  }

  // Net line Y scale (separate scale on right side)
  function netY(val: number): number {
    return PAD_T + chartH / 2 - (val / (maxNet * 1.2)) * (chartH / 2);
  }

  const netPoints = runningNet.map((n, i) => {
    const groupW = chartW / 12;
    const x = PAD_L + i * groupW + groupW / 2;
    return `${x},${netY(n)}`;
  }).join(" L ");

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "16px",
      padding: "20px 20px 16px",
      marginBottom: "16px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.10em", margin: 0 }}>
          Monthly Signups vs Cancellations — 2026
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          {[
            { color: GREEN, label: "Joined" },
            { color: RED, label: "Cancelled" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.45)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          style={{ width: "100%", minWidth: "280px", display: "block" }}
          aria-label="Monthly signups vs cancellations 2026"
        >
          {/* Grid lines */}
          {yTicks.map(({ val, y }) => (
            <g key={val}>
              <line x1={PAD_L} y1={y} x2={CHART_W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD_L - 4} y={y + 4} textAnchor="end"
                style={{ fontFamily: "system-ui, monospace", fontSize: "8px", fill: "rgba(255,255,255,0.30)" }}>
                {val}
              </text>
            </g>
          ))}

          {/* Zero line for net */}
          <line
            x1={PAD_L} y1={netY(0)}
            x2={CHART_W - PAD_R} y2={netY(0)}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1"
            strokeDasharray="3,3"
          />

          {/* Bars — months display starts at March (month index 2) */}
          {months.map((_, i) => {
            const dataIdx = i + 2; // March = index 2
            const bw = barW();
            const sH = barH(signups[dataIdx]);
            const cH = barH(cancellations[dataIdx]);
            return (
              <g key={i}>
                {/* Signup bar */}
                <rect
                  x={barX(i, 0)} y={barY(signups[dataIdx])}
                  width={bw} height={sH}
                  fill={GREEN} fillOpacity={0.85} rx={3}
                />
                {/* Cancel bar */}
                <rect
                  x={barX(i, 1)} y={barY(cancellations[dataIdx])}
                  width={bw} height={cH}
                  fill={RED} fillOpacity={0.85} rx={3}
                />
                {/* Net label above bars */}
                {net[dataIdx] !== 0 && (
                  <text
                    x={barX(i, 0) + bw / 2 + bw / 2 + 2}
                    y={netY(net[dataIdx]) - 3}
                    textAnchor="middle"
                    style={{ fontFamily: "system-ui, monospace", fontSize: "8px", fill: TIFFANY, fontWeight: 700 }}
                  >
                    {net[dataIdx] > 0 ? `+${net[dataIdx]}` : net[dataIdx]}
                  </text>
                )}
              </g>
            );
          })}

          {/* Net line */}
          <path
            d={`M ${netPoints}`}
            fill="none"
            stroke={TIFFANY}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Net line dots — months start at March (month index 2) */}
          {runningNet.slice(2).map((n, i) => {
            const groupW = chartW / 10;
            const x = PAD_L + i * groupW + groupW / 2;
            const y = netY(n);
            return (
              <circle key={i} cx={x} cy={y} r={3} fill={TIFFANY} />
            );
          })}

          {/* X axis */}
          <line x1={PAD_L} y1={PAD_T + chartH} x2={CHART_W - PAD_R} y2={PAD_T + chartH}
            stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

          {/* X labels */}
          {months.map((label, i) => {
            const groupW = chartW / 12;
            const x = PAD_L + i * groupW + groupW / 2;
            return (
              <text key={i} x={x} y={CHART_H - 8} textAnchor="middle"
                style={{ fontFamily: "system-ui, monospace", fontSize: "8px", fill: "rgba(255,255,255,0.30)" }}>
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Running net legend */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: 16, height: 2, background: TIFFANY, borderRadius: 1 }} />
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>Running net</span>
        </div>
      </div>

      {/* ── Chart 2: Revenue Impact ─────────────────────────────────────────── */}
      <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.10em", margin: 0 }}>
            Revenue Impact — 2026
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            {[
              { color: GREEN, label: "Revenue Gained" },
              { color: RED, label: "Revenue Lost" },
              { color: TIFFANY, label: "Net" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.45)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue chart */}
        <RevenueImpactChart
          revenueGained={revenueGained}
          revenueLost={revenueLost}
          months={months}
          chartW={CHART_W}
          chartH={CHART_H}
          padL={PAD_L}
          padR={PAD_R}
          padT={PAD_T}
          padB={PAD_B}
        />
      </div>
    </div>
  );
}

function RevenueImpactChart({
  revenueGained,
  revenueLost,
  months,
  chartW,
  chartH,
  padL,
  padR,
  padT,
  padB,
}: {
  revenueGained: number[];
  revenueLost: number[];
  months: string[];
  chartW: number;
  chartH: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
}) {
  const chartWInner = chartW - padL - padR;
  const chartHInner = chartH - padT - padB;

  // Only consider March onwards data (Jan/Feb are baseline, set to 0)
  const maxRev = Math.max(...revenueGained.slice(2), ...revenueLost.slice(2), 1);

  function yPos(val: number): number {
    return padT + chartHInner - (val / maxRev) * chartHInner;
  }

  function xPos(i: number): number {
    return padL + (i / (months.length - 1)) * chartWInner;
  }

  function pathFromVals(vals: number[]): string {
    return vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xPos(i)},${yPos(v)}`).join(" ");
  }

  const gainedPath = pathFromVals(revenueGained);
  const lostPath = pathFromVals(revenueLost);
  const netVals = revenueGained.map((g, i) => g - revenueLost[i]);
  const netPath = pathFromVals(netVals);

  // Area under gained line
  const gainedArea = `${gainedPath} L ${xPos(months.length - 1)},${padT + chartHInner} L ${xPos(0)},${padT + chartHInner} Z`;

  const yTicks: { val: number; y: number }[] = [];
  for (let t = 0; t <= 3; t++) {
    const val = Math.round((maxRev / 3) * t);
    yTicks.push({ val, y: yPos(val) });
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        style={{ width: "100%", minWidth: "280px", display: "block" }}
        aria-label="Monthly revenue impact 2026"
      >
        <defs>
          <linearGradient id="gainedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GREEN} stopOpacity="0.15" />
            <stop offset="100%" stopColor={GREEN} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTicks.map(({ val, y }) => (
          <g key={val}>
            <line x1={padL} y1={y} x2={chartW - padR} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} textAnchor="end"
              style={{ fontFamily: "system-ui, monospace", fontSize: "8px", fill: "rgba(255,255,255,0.30)" }}>
              {val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`}
            </text>
          </g>
        ))}

        {/* Gained area */}
        <path d={gainedArea} fill="url(#gainedGrad)" />

        {/* Gained line */}
        <path d={gainedPath} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Lost line */}
        <path d={lostPath} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="4,2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Net line */}
        <path d={netPath} fill="none" stroke={TIFFANY} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points and net labels */}
        {months.map((_, i) => {
          const x = xPos(i);
          const gY = yPos(revenueGained[i]);
          const lY = yPos(revenueLost[i]);
          const net = netVals[i];
          const nY = yPos(net);
          const showNetLabel = i % 2 === 0 || i === months.length - 1;
          return (
            <g key={i}>
              {/* Gained dot */}
              <circle cx={x} cy={gY} r={3} fill={GREEN} />
              {/* Lost dot */}
              <circle cx={x} cy={lY} r={3} fill={RED} />
              {/* Net dot + label */}
              <circle cx={x} cy={nY} r={3} fill={TIFFANY} stroke={TIFFANY} strokeWidth="1.5" />
              {showNetLabel && (
                <text
                  x={x} y={nY - 6}
                  textAnchor="middle"
                  style={{ fontFamily: "system-ui, monospace", fontSize: "7px", fill: TIFFANY, fontWeight: 700 }}
                >
                  {net >= 0 ? `+$${net >= 1000 ? (net/1000).toFixed(1)+"k" : net}` : `-$${Math.abs(net) >= 1000 ? (Math.abs(net)/1000).toFixed(1)+"k" : Math.abs(net)}`}
                </text>
              )}
            </g>
          );
        })}

        {/* X axis */}
        <line x1={padL} y1={padT + chartHInner} x2={chartW - padR} y2={padT + chartHInner}
          stroke="rgba(255,255,255,0.10)" strokeWidth="1" />

        {/* X labels */}
        {months.map((label, i) => {
          // Show every month
          return (
            <text key={i} x={xPos(i)} y={chartH - 8} textAnchor="middle"
              style={{ fontFamily: "system-ui, monospace", fontSize: "8px", fill: "rgba(255,255,255,0.30)" }}>
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
