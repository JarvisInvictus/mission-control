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
  active:    { bg: "rgba(52,211,153,0.12)",  color: "#34d399", border: "rgba(52,211,153,0.30)" },
  paused:    { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "rgba(251,191,36,0.30)" },
  cancelled: { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.30)" },
};

const PLATFORM_COLORS: Record<string, { bg: string; color: string }> = {
  Newie:      { bg: `${Tiffany}26`, color: Tiffany },
  Upfront:    { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  Mentorship: { bg: "rgba(236,72,153,0.15)", color: "#ec4899" },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ontime:        { label: "On Time",      color: Tiffany,    bg: TiffanySoft },
  submitted:     { label: "Submitted",    color: "#34d399",  bg: "rgba(52,211,153,0.12)" },
  late:          { label: "Late",         color: "#fbbf24",  bg: "rgba(251,191,36,0.12)" },
  "not-submitted":{ label: "Not Submitted",color: "#f87171",  bg: "rgba(248,113,113,0.12)" },
  sick:          { label: "Sick",         color: "#60a5fa",  bg: "rgba(96,165,250,0.12)" },
  paused:        { label: "Paused",       color: "#fbbf24",  bg: "rgba(251,191,36,0.12)" },
  skip:          { label: "Skip",         color: "#f59e0b",  bg: "rgba(245,158,11,0.12)" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getCheckInHistory(clientId: string, weeks = 4) {
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
      const year = weekMonday.getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const week1Start = new Date(startOfYear);
      week1Start.setDate(startOfYear.getDate() - startOfYear.getDay() + 1);
      const weekNum = Math.floor((weekMonday.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      const weekKey = `${year}-W${String(weekNum).padStart(2, "0")}`;
      const month = weekMonday.toLocaleDateString("en-AU", { month: "short" });
      const day = weekMonday.getDate();
      history.push({ weekLabel: `${month} ${day}`, weekKey, status: checkIns[weekKey]?.[clientId] ?? null });
    }
    return history;
  } catch {
    return [];
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClientProfilePanel({ client, onClose }: ClientProfilePanelProps) {
  const [notesDraft, setNotesDraft] = useState("");
  const [savedNotes, setSavedNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const history = getCheckInHistory(client.id, 4);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc_client_notes");
      if (stored) {
        const map: Record<string, string> = JSON.parse(stored);
        const val = map[client.id] ?? "";
        setNotesDraft(val);
        setSavedNotes(val);
      }
    } catch { /* ignore */ }
  }, [client.id]);

  function saveNotes() {
    setSaving(true);
    try {
      const stored = localStorage.getItem("mc_client_notes");
      const map: Record<string, string> = stored ? JSON.parse(stored) : {};
      map[client.id] = notesDraft;
      localStorage.setItem("mc_client_notes", JSON.stringify(map));
      setSavedNotes(notesDraft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const statusStyle   = STATUS_COLORS[client.status] ?? STATUS_COLORS.active;
  const platformStyle = PLATFORM_COLORS[client.paymentPlatform] ?? PLATFORM_COLORS.Newie;

  const startDate = client.startDate
    ? (() => { const d = new Date(client.startDate); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; })()
    : "—";

  const divider = (
    <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed",
        top: 0, right: 0, bottom: 0,
        width: "380px",
        maxWidth: "95vw",
        zIndex: 70,
        background: "#0d0f1a",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
      }}>

        {/* ── Top bar: "CLIENT RECORD" label + close ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "system-ui", fontSize: "10px", fontWeight: 700,
            color: Tiffany, textTransform: "uppercase", letterSpacing: "0.12em",
          }}>
            Client Record
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "8px",
              color: "rgba(255,255,255,0.50)", cursor: "pointer",
              padding: "5px 9px", fontSize: "14px", lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* ── Identity block ── */}
          <div style={{ padding: "20px 18px 16px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
              background: TiffanySoft,
              border: `1.5px solid ${TiffanyBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "system-ui", fontSize: "15px", fontWeight: 800, color: Tiffany,
            }}>
              {initials(client.name)}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "17px", fontWeight: 700, color: "white", lineHeight: 1.2 }}>
                {client.name}
              </p>
              <p style={{ margin: "4px 0 0", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", lineHeight: 1.3 }}>
                {client.coach} · {client.checkInDay ? `${client.checkInDay} check-in` : "No check-in day"} · since {startDate}
              </p>
            </div>
          </div>

          {/* ── Status pills ── */}
          <div style={{ padding: "0 18px 16px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "999px", padding: "3px 11px",
              fontFamily: "system-ui", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.65)",
            }}>
              {client.coach}
            </span>
            {client.checkInDay && (
              <span style={{
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "999px", padding: "3px 11px",
                fontFamily: "system-ui", fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.65)",
              }}>
                {client.checkInDay}
              </span>
            )}
            <span style={{
              background: statusStyle.bg, color: statusStyle.color,
              border: `1px solid ${statusStyle.border}`,
              borderRadius: "999px", padding: "3px 11px",
              fontFamily: "system-ui", fontSize: "11px", fontWeight: 600, textTransform: "capitalize",
            }}>
              {client.status}
            </span>
            <span style={{
              background: platformStyle.bg, color: platformStyle.color,
              border: `1px solid ${platformStyle.color}40`,
              borderRadius: "999px", padding: "3px 11px",
              fontFamily: "system-ui", fontSize: "11px", fontWeight: 600,
            }}>
              {client.paymentPlatform}
            </span>
          </div>

          {divider}

          {/* ── Details grid ── */}
          <div style={{
            padding: "16px 18px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 10px",
          }}>
            {[
              { label: "Weekly Rate",  value: client.weeklyCharge ? `$${client.weeklyCharge}/wk` : "—" },
              { label: "Check-In Day", value: client.checkInDay ?? "—" },
              { label: "Start Date",   value: startDate },
              { label: "Coach",        value: client.coach },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ margin: "0 0 2px", fontFamily: "system-ui", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {label}
                </p>
                <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.80)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {divider}

          {/* ── Spreadsheet CTA ── */}
          {client.spreadsheetUrl ? (
            <div style={{ padding: "14px 18px" }}>
              <a
                href={client.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: TiffanySoft,
                  border: `1px solid ${TiffanyBorder}`,
                  borderRadius: "12px", padding: "12px 16px",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "18px" }}>📊</span>
                  <div>
                    <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: Tiffany }}>Open Client Spreadsheet</p>
                    <p style={{ margin: "1px 0 0", fontFamily: "system-ui", fontSize: "10px", color: "rgba(10,186,181,0.65)" }}>Training & progress data</p>
                  </div>
                </div>
                <span style={{ color: Tiffany, fontSize: "16px", fontWeight: 700 }}>→</span>
              </a>
            </div>
          ) : (
            <div style={{ padding: "14px 18px" }}>
              <div style={{
                background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.10)",
                borderRadius: "12px", padding: "12px 16px", textAlign: "center",
              }}>
                <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>No spreadsheet linked</p>
              </div>
            </div>
          )}

          {/* ── WhatsApp ── */}
          <div style={{ padding: "0 18px 14px" }}>
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "rgba(37,211,102,0.10)", border: "1px solid rgba(37,211,102,0.25)",
                borderRadius: "12px", padding: "10px 16px",
                color: "#25d366", fontFamily: "system-ui", fontSize: "13px", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "16px" }}>💬</span>
              Message on WhatsApp
            </a>
          </div>

          {divider}

          {/* ── Notes ── */}
          <div style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <p style={{ margin: 0, fontFamily: "system-ui", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                CRM Notes
              </p>
              {saved && <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "#34d399" }}>Saved ✓</span>}
            </div>
            <textarea
              value={notesDraft}
              onChange={(e) => { setNotesDraft(e.target.value); setSaved(false); }}
              placeholder="Add notes about this client..."
              rows={4}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${notesDraft !== savedNotes ? TiffanyBorder : "rgba(255,255,255,0.08)"}`,
                borderRadius: "10px", color: "white",
                padding: "10px 12px", fontSize: "13px", fontFamily: "system-ui",
                resize: "none", outline: "none", lineHeight: 1.5,
              }}
            />
            <button
              onClick={saveNotes}
              disabled={saving || notesDraft === savedNotes}
              style={{
                marginTop: "8px",
                background: TiffanySoft, border: `1px solid ${TiffanyBorder}`,
                borderRadius: "8px", padding: "7px 18px",
                color: Tiffany, fontSize: "12px", fontFamily: "system-ui", fontWeight: 600,
                cursor: saving || notesDraft === savedNotes ? "not-allowed" : "pointer",
                opacity: saving || notesDraft === savedNotes ? 0.45 : 1,
              }}
            >
              {saving ? "Saving…" : "Save Notes"}
            </button>
          </div>

          {divider}

          {/* ── Check-in history ── */}
          <div style={{ padding: "16px 18px" }}>
            <p style={{ margin: "0 0 10px", fontFamily: "system-ui", fontSize: "9px", fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Check-In History
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {history.length === 0 ? (
                <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "10px 0" }}>No history yet</p>
              ) : history.map(({ weekLabel, status }) => {
                const meta = status ? (STATUS_META[status] ?? { label: status, color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.08)" }) : null;
                return (
                  <div key={weekLabel} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px", padding: "7px 12px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>
                      Week of {weekLabel}
                    </span>
                    {meta ? (
                      <span style={{
                        background: meta.bg, color: meta.color,
                        border: `1px solid ${meta.color}50`,
                        borderRadius: "999px", padding: "2px 9px",
                        fontFamily: "system-ui", fontSize: "10px", fontWeight: 500,
                      }}>
                        {meta.label}
                      </span>
                    ) : (
                      <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.20)" }}>—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Bottom spacer / danger zone ── */}
          <div style={{ padding: "0 18px 28px", marginTop: "auto" }}>
            {divider}
            <div style={{ paddingTop: "16px" }}>
              <p style={{ margin: "0 0 8px", fontFamily: "system-ui", fontSize: "9px", fontWeight: 700, color: "rgba(248,113,113,0.50)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Danger Zone
              </p>
              <p style={{ margin: "0 0 10px", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.30)", lineHeight: 1.5 }}>
                Moves this client out of the active roster.
              </p>
              <button
                style={{
                  background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
                  borderRadius: "10px", padding: "8px 16px",
                  color: "#f87171", fontFamily: "system-ui", fontSize: "12px", fontWeight: 600,
                  cursor: "pointer", width: "100%",
                }}
              >
                Cancel Client
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
