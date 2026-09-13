"use client";

import { useMemo, useState } from "react";

// Mirrors the TeamEvent shape from EventsTab / app/api/team/events/route.ts
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;          // YYYY-MM-DD
  time?: string;         // HH:MM (24h) or ""
  location?: string;
  attendees?: string[];
  clientIds?: string[];
}

const ACCENT = "#0abab5";
const TODAY_HIGHLIGHT = "rgba(10,186,181,0.18)";

function fmtMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toIsoDate(d: Date): string {
  // Use local components so the date cell matches the user's timezone (en-AU Melbourne).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DayCell {
  date: Date;            // local midnight
  inMonth: boolean;
  isToday: boolean;
  iso: string;           // YYYY-MM-DD
  events: CalendarEvent[];
}

export function CalendarView({
  events,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  onSelectEvent?: (e: CalendarEvent) => void;
}) {
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const today = useMemo(() => new Date(), []);

  // Build 6-week grid (42 cells) so layout is stable across month boundaries.
  const grid: DayCell[] = useMemo(() => {
    const monthStart = startOfMonth(cursor);
    // Week starts Monday in en-AU
    const firstWeekday = (monthStart.getDay() + 6) % 7; // 0 = Mon
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - firstWeekday);

    const eventsByDate = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = eventsByDate.get(ev.date) || [];
      list.push(ev);
      eventsByDate.set(ev.date, list);
    }
    // Sort each day's events by time ascending (empty times go last).
    for (const [, list] of eventsByDate) {
      list.sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
    }

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const iso = toIsoDate(d);
      cells.push({
        date: d,
        inMonth: d.getMonth() === cursor.getMonth(),
        isToday: isSameDay(d, today),
        iso,
        events: eventsByDate.get(iso) || [],
      });
    }
    return cells;
  }, [cursor, events, today]);

  const monthEvents = events
    .filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date + "T00:00:00");
      return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
    })
    .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "16px",
      }}
    >
      {/* Header: month label + nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          marginBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => setCursor((c) => addMonths(c, -1))}
            title="Previous month"
            style={navBtnStyle}
          >
            ‹
          </button>
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "16px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
              margin: 0,
              minWidth: "180px",
              textAlign: "center",
            }}
          >
            {fmtMonthLabel(cursor)}
          </p>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            title="Next month"
            style={navBtnStyle}
          >
            ›
          </button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            style={{
              fontFamily: "system-ui",
              fontSize: "11px",
              fontWeight: 600,
              color: ACCENT,
              background: "rgba(10,186,181,0.10)",
              border: "1px solid rgba(10,186,181,0.30)",
              borderRadius: "8px",
              padding: "5px 10px",
              cursor: "pointer",
            }}
          >
            Today
          </button>
        </div>
        <p
          style={{
            fontFamily: "system-ui",
            fontSize: "11px",
            color: "rgba(255,255,255,0.40)",
            margin: 0,
          }}
        >
          {monthEvents.length} event{monthEvents.length === 1 ? "" : "s"} this month
        </p>
      </div>

      {/* Weekday header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "4px",
        }}
      >
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
              textAlign: "center",
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}
      >
        {grid.map((cell) => (
          <DayCellView key={cell.iso} cell={cell} onSelectEvent={onSelectEvent} />
        ))}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  fontFamily: "system-ui",
  fontSize: "18px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.70)",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "8px",
  width: "30px",
  height: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  lineHeight: 1,
};

function DayCellView({
  cell,
  onSelectEvent,
}: {
  cell: DayCell;
  onSelectEvent?: (e: CalendarEvent) => void;
}) {
  const visible = cell.events.slice(0, 3);
  const overflow = cell.events.length - visible.length;
  return (
    <div
      style={{
        minHeight: "84px",
        background: cell.isToday ? TODAY_HIGHLIGHT : cell.inMonth ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
        border: cell.isToday ? `1px solid rgba(10,186,181,0.50)` : "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
        padding: "4px 5px",
        opacity: cell.inMonth ? 1 : 0.45,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          fontFamily: "system-ui",
          fontSize: cell.isToday ? "11px" : "10px",
          fontWeight: cell.isToday ? 700 : 500,
          color: cell.isToday ? ACCENT : cell.inMonth ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {cell.date.getDate()}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, minHeight: 0 }}>
        {visible.map((ev) => (
          <button
            key={ev.id}
            onClick={() => onSelectEvent?.(ev)}
            title={ev.title}
            style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              fontWeight: 600,
              color: ACCENT,
              background: "rgba(10,186,181,0.14)",
              border: "1px solid rgba(10,186,181,0.30)",
              borderRadius: "4px",
              padding: "2px 4px",
              cursor: onSelectEvent ? "pointer" : "default",
              textAlign: "left",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
              lineHeight: 1.2,
            }}
          >
            {ev.time && <span style={{ opacity: 0.65 }}>{ev.time} </span>}
            {ev.title}
          </button>
        ))}
        {overflow > 0 && (
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "9px",
              color: "rgba(255,255,255,0.45)",
              margin: 0,
              paddingLeft: "2px",
            }}
          >
            +{overflow} more
          </p>
        )}
      </div>
    </div>
  );
}
