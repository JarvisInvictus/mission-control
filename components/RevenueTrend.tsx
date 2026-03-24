"use client";

import { useMemo } from "react";
import type { Client } from "@/app/page";

interface RevenueTrendProps {
  clients: Client[];
  revPerWeek: number;
}

const Tiffany = "#0abab5";
const TiffanySoft = "rgba(10,186,181,0.12)";

function getWeeksAgo(n: number): { weekStart: Date; weekLabel: string; weekKey: string } {
  const today = new Date();
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - dow);
  currentMonday.setHours(0, 0, 0, 0);

  const monday = new Date(currentMonday);
  monday.setDate(currentMonday.getDate() - n * 7);

  const month = monday.toLocaleDateString("en-AU", { month: "short" });
  const day = monday.getDate();

  const year = monday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week1Start = new Date(startOfYear);
  week1Start.setDate(startOfYear.getDate() - startOfYear.getDay() + 1);
  const weekNum = Math.floor((monday.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  const weekKey = `${year}-W${String(weekNum).padStart(2, "0")}`;

  return { weekStart: monday, weekLabel: `W${weekNum} ${month} ${day}`, weekKey };
}

function getRevenueForWeek(
  weekKey: string,
  clients: Client[],
  _checkIns: Record<string, Record<string, string>>
): number {
  // For now, all active clients contribute their weekly rate every week
  // In future, use mc_checkins to determine who was active in that week
  return clients
    .filter((c) => c.status === "active")
    .reduce((sum, c) => sum + (c.weeklyCharge || 0), 0);
}

export function RevenueTrend({ clients, revPerWeek }: RevenueTrendProps) {
  const { labels, values, maxValue } = useMemo(() => {
    const NUM_WEEKS = 12;
    const weeks: { weekStart: Date; weekLabel: string; weekKey: string }[] = [];
    for (let i = NUM_WEEKS - 1; i >= 0; i--) {
      weeks.push(getWeeksAgo(i));
    }

    // Try to load check-ins for historical data
    let checkIns: Record<string, Record<string, string>> = {};
    try {
      const stored = localStorage.getItem("mc_checkins");
      if (stored) checkIns = JSON.parse(stored);
    } catch { /* ignore */ }

    const hasHistoricalData = weeks.some(({ weekKey }) => checkIns[weekKey]);

    const labels = weeks.map(({ weekLabel }) => {
      const parts = weekLabel.split(" ");
      return `${parts[0]} ${parts[1]}`;
    });

    const values = weeks.map(({ weekKey }) => {
      if (!hasHistoricalData) return revPerWeek;
      return getRevenueForWeek(weekKey, clients, checkIns);
    });

    const maxValue = Math.max(...values, revPerWeek);

    return { labels, values, maxValue };
  }, [clients, revPerWeek]);

  const hasHistoricalData = values.some((v, i) => i < values.length - 1 && v !== revPerWeek);
  const WIDTH = 600;
  const HEIGHT = 180;
  const PADDING_LEFT = 48;
  const PADDING_RIGHT = 16;
  const PADDING_TOP = 12;
  const PADDING_BOTTOM = 32;
  const chartWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  function xPos(i: number): number {
    return PADDING_LEFT + (i / (values.length - 1)) * chartWidth;
  }
  function yPos(v: number): number {
    return PADDING_TOP + chartHeight - (v / maxValue) * chartHeight;
  }

  // Build SVG path
  const linePoints = values.map((v, i) => `${xPos(i)},${yPos(v)}`);
  const linePath = `M ${linePoints.join(" L ")}`;
  const areaPath = `${linePath} L ${xPos(values.length - 1)},${PADDING_TOP + chartHeight} L ${PADDING_LEFT},${PADDING_TOP + chartHeight} Z`;

  // Y axis ticks (4 ticks)
  const yTicks: { value: number; y: number }[] = [];
  for (let t = 0; t <= 3; t++) {
    const value = (maxValue / 3) * t;
    yTicks.push({ value, y: yPos(value) });
  }

  return (
    <div>
      {/* Section header */}
      <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "12px" }}>
        Revenue Trend — 12 Weeks
      </p>

      {!hasHistoricalData && (
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", marginBottom: "10px", fontStyle: "italic" }}>
          Baseline — historical data will populate over time
        </p>
      )}

      {/* SVG Chart */}
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ width: "100%", minWidth: "280px", display: "block" }}
          aria-label="Revenue trend over 12 weeks"
        >
          {/* Grid lines */}
          {yTicks.map(({ value, y }) => (
            <g key={value}>
              <line
                x1={PADDING_LEFT} y1={y}
                x2={WIDTH - PADDING_RIGHT} y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={PADDING_LEFT - 6} y={y + 4}
                textAnchor="end"
                style={{ fontFamily: "system-ui, monospace", fontSize: "9px", fill: "rgba(255,255,255,0.30)" }}
              >
                {value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={Tiffany} stopOpacity="0.20" />
              <stop offset="100%" stopColor={Tiffany} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#revGradient)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={Tiffany}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {values.map((v, i) => (
            <circle
              key={i}
              cx={xPos(i)}
              cy={yPos(v)}
              r={i === values.length - 1 ? 4 : 3}
              fill={i === values.length - 1 ? Tiffany : "rgba(10,186,181,0.50)"}
              stroke={Tiffany}
              strokeWidth={i === values.length - 1 ? "2" : "0"}
            />
          ))}

          {/* X axis labels (every 2 weeks) */}
          {labels.map((label, i) => {
            if (i % 2 !== 0 && i !== labels.length - 1) return null;
            return (
              <text
                key={i}
                x={xPos(i)}
                y={HEIGHT - 6}
                textAnchor="middle"
                style={{ fontFamily: "system-ui, monospace", fontSize: "8px", fill: "rgba(255,255,255,0.30)" }}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Current week indicator */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
        <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>
          ● Current week
        </span>
      </div>
    </div>
  );
}
