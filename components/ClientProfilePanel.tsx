"use client";

import { useState, useEffect } from "react";
import type { Client } from "@/app/page";

interface ClientProfilePanelProps {
  client: Client;
  onClose: () => void;
}

const Tiffany = "#0abab5";
const TiffanySoft = "rgba(10,186,181,0.12)";
const TiffanyBorder = "rgba(10,186,181,0.25)";

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  active:   { bg: "rgba(52,211,153,0.12)",  color: "#34d399", border: "rgba(52,211,153,0.30)" },
  paused:   { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "rgba(251,191,36,0.30)" },
  cancelled:{ bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.30)" },
};

const PLATFORM_COLORS: Record<string, { bg: string; color: string }> = {
  Newie:      { bg: `${Tiffany}26`, color: Tiffany },
  Upfront:    { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  Mentorship: { bg: "rgba(236,72,153,0.15)", color: "#ec4899" },
};

function getCheckInHistory(clientId: string, weeks = 4): { weekLabel: string; weekKey: string; status: string | null }[] {
  try {
    const stored = localStorage.getItem("mc_checkins");
    if (!stored) return [];
    const checkIns: Record<string, Record<string, string>> = JSON.parse(stored);
    const today = new Date();
    const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - dow);

    const history: { weekLabel: string; weekKey: string; status: string | null }[] = [];
    for (let i = 1; i <= weeks; i++) {
      const weekMonday = new Date(currentMonday);
      weekMonday.setDate(currentMonday.getDate() - i * 7);
      const weekSunday = new Date(weekMonday);
      weekSunday.setDate(weekMonday.getDate() + 6);

      // Get ISO week key
      const year = weekMonday.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const week1Start = new Date(startOfYear);
      week1Start.setDate(startOfYear.getDate() - startOfYear.getDay() + 1);
      const weekNum = Math.floor((weekMonday.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      const weekKey = `${year}-W${String(weekNum).padStart(2, "0")}`;

      const month = weekMonday.toLocaleDateString("en-AU", { month: "short" });
      const day = weekMonday.getDate();
      const weekLabel = `${month} ${day}`;

      const status = checkIns[weekKey]?.[clientId] ?? null;
      history.push({ weekLabel, weekKey, status });
    }
    return history;
  } catch {
    return [];
  }
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ontime:    { label: "On Time",   color: Tiffany,     bg: TiffanySoft },
  submitted: { label: "Submitted", color: "#34d399",  bg: "rgba(52,211,153,0.12)" },
  late:      { label: "Late",     color: "#fbbf24",  bg: "rgba(251,191,36,0.12)" },
  never:     { label: "Never",     color: "#f87171",  bg: "rgba(248,113,113,0.12)" },
  sick:      { label: "Sick",      color: "#60a5fa",  bg: "rgba(96,165,250,0.12)" },
  paused:    { label: "Paused",    color: "#fbbf24",  bg: "rgba(251,191,36,0.12)" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getWeekLabel(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week1Start = new Date(startOfYear);
  week1Start.setDate(startOfYear.getDate() - startOfYear.getDay() + 1);
  const weekNum = Math.floor((date.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

export function ClientProfilePanel({ client, onClose }: ClientProfilePanelProps) {
  const [notes, setNotes] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const history = getCheckInHistory(client.id, 4);

  // Load notes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc_client_notes");
      if (stored) {
        const notesMap: Record<string, string> = JSON.parse(stored);
        setNotes(notesMap[client.id] ?? "");
        setNotesDraft(notesMap[client.id] ?? "");
      } else {
        setNotesDraft("");
      }
    } catch {
      setNotesDraft("");
    }
  }, [client.id]);

  function saveNotes() {
    setSaving(true);
    try {
      const stored = localStorage.getItem("mc_client_notes");
      const notesMap: Record<string, string> = stored ? JSON.parse(stored) : {};
      notesMap[client.id] = notesDraft;
      localStorage.setItem("mc_client_notes", JSON.stringify(notesMap));
      setNotes(notesDraft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const statusStyle = STATUS_COLORS[client.status] ?? STATUS_COLORS.active;
  const platformStyle = PLATFORM_COLORS[client.paymentPlatform] ?? PLATFORM_COLORS.Newie;

  const startDate = client.startDate
    ? (() => {
        const d = new Date(client.startDate);
        return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      })()
    : "—";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "360px",
          maxWidth: "95vw",
          zIndex: 70,
          background: "rgba(14,16,28,0.98)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "12px",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: "system-ui", fontSize: "18px", fontWeight: 700, color: "white" }}>
              {client.name}
            </h2>
            <p style={{ margin: "3px 0 0", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
              {client.coach} · {client.checkInDay ?? "—"} · {client.email}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "8px",
              color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: "6px 10px",
              fontSize: "16px", lineHeight: 1, flexShrink: 0, fontFamily: "system-ui",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Status + Payment type */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              background: statusStyle.bg, color: statusStyle.color,
              border: `1px solid ${statusStyle.border}`,
              borderRadius: "999px", padding: "4px 12px",
              fontFamily: "system-ui", fontSize: "11px", fontWeight: 600,
              textTransform: "capitalize",
            }}>
              {client.status}
            </span>
            <span style={{
              background: platformStyle.bg, color: platformStyle.color,
              border: `1px solid ${platformStyle.color}40`,
              borderRadius: "999px", padding: "4px 12px",
              fontFamily: "system-ui", fontSize: "11px", fontWeight: 600,
            }}>
              {client.paymentPlatform}
            </span>
          </div>

          {/* Details grid */}
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px",
            padding: "16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
          }}>
            {[
              { label: "Weekly Rate", value: client.weeklyCharge ? `$${client.weeklyCharge}/wk` : "—" },
              { label: "Check-In Day", value: client.checkInDay ?? "—" },
              { label: "Start Date", value: startDate },
              { label: "Coach", value: client.coach },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ margin: "0 0 3px", fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
                <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.80)", fontWeight: 500 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* WhatsApp button */}
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.30)",
              borderRadius: "12px", padding: "10px",
              color: "#25d366", fontFamily: "system-ui", fontSize: "13px", fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "18px" }}>💬</span>
            Message on WhatsApp
          </a>

          {/* Notes */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Notes</p>
              {saved && <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "#34d399" }}>Saved ✓</span>}
            </div>
            <textarea
              value={notesDraft}
              onChange={(e) => { setNotesDraft(e.target.value); setSaved(false); }}
              placeholder="Add notes about this client..."
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)",
                border: `1px solid ${notesDraft !== notes ? TiffanyBorder : "rgba(255,255,255,0.08)"}`,
                borderRadius: "12px",
                color: "white",
                padding: "10px 12px",
                fontSize: "13px",
                fontFamily: "system-ui",
                resize: "none",
                outline: "none",
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={saveNotes}
              disabled={saving || notesDraft === notes}
              style={{
                marginTop: "8px",
                background: TiffanySoft, border: `1px solid ${TiffanyBorder}`,
                borderRadius: "10px", padding: "7px 18px",
                color: Tiffany, fontSize: "12px", fontFamily: "system-ui", fontWeight: 600,
                cursor: saving || notesDraft === notes ? "not-allowed" : "pointer",
                opacity: saving || notesDraft === notes ? 0.5 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Notes"}
            </button>
          </div>

          {/* Check-in history */}
          <div>
            <p style={{ margin: "0 0 10px", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Check-In History</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {history.length === 0 ? (
                <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "12px 0" }}>No check-in history yet</p>
              ) : (
                history.map(({ weekLabel, status }) => {
                  const meta = status ? (STATUS_META[status] ?? { label: status, color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.08)" }) : null;
                  return (
                    <div key={weekLabel} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>
                        Week of {weekLabel}
                      </span>
                      {meta ? (
                        <span style={{
                          background: meta.bg, color: meta.color,
                          border: `1px solid ${meta.color}50`,
                          borderRadius: "999px", padding: "2px 10px",
                          fontFamily: "system-ui", fontSize: "10px", fontWeight: 500,
                        }}>
                          {meta.label}
                        </span>
                      ) : (
                        <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.20)" }}>—</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Spreadsheet link */}
          {client.spreadsheetUrl && (
            <div>
              <p style={{ margin: "0 0 8px", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Spreadsheet</p>
              <a
                href={client.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "10px", padding: "7px 14px",
                  color: Tiffany, fontFamily: "system-ui", fontSize: "12px",
                  textDecoration: "none",
                }}
              >
                📊 Open Spreadsheet
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
