"use client";

import { useEffect, useRef, useState } from "react";
import type { TabMeta } from "../page";

type Attendee = "Milzzy" | "Miggy" | "Sonta";
type Owner = "Milzzy" | "Miggy" | "Sonta" | "Shared";

interface AgendaItem {
  id: string;
  text: string;
  done: boolean;
}

interface ActionItem {
  id: string;
  text: string;
  owner: Owner;
  done: boolean;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  attendees: Attendee[];
  agenda: AgendaItem[];
  notes: string;
  actionItems: ActionItem[];
  status: "draft" | "closed";
  createdAt: string;
  closedAt?: string;
  updatedAt: string;
  updatedBy: string;
}

const ALL_ATTENDEES: Attendee[] = ["Milzzy", "Miggy", "Sonta"];
const ALL_OWNERS: Owner[] = ["Milzzy", "Miggy", "Sonta", "Shared"];
const ATTENDEE_COLORS: Record<Attendee, string> = {
  Milzzy: "#0abab5",
  Miggy: "#3b82f6",
  Sonta: "#a855f7",
};

// Default agenda template used by "Use template" / "Append template" buttons.
const DEFAULT_AGENDA_TEMPLATE: string[] = [
  "Wins from last week",
  "Review open action items",
  "Lead pipeline + new enquiries",
  "Client check-ins (issues/blockers)",
  "Content pipeline review",
  "Podcast update",
  "Goals progress check",
  "This week's priorities",
];

// Create a fresh empty draft (used when no meeting exists yet, or after closing one).
function blankDraft(): Meeting {
  const now = new Date().toISOString();
  return {
    id: `meet_${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    date: now.slice(0, 10),
    attendees: ["Milzzy", "Miggy", "Sonta"],
    agenda: [],
    notes: "",
    actionItems: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
    updatedBy: "Milzzy",
  };
}

export function MeetingTab({ onMeta }: { onMeta?: (m: TabMeta | null) => void } = {}) {
  const [active, setActive] = useState<Meeting | null>(null);
  const [history, setHistory] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [closing, setClosing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const [newAction, setNewAction] = useState("");
  const [newActionOwner, setNewActionOwner] = useState<Owner>("Shared");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  // Load on mount: fetch all meetings, derive active draft + history (closed only).
  useEffect(() => {
    fetch("/api/team/meeting")
      .then((r) => r.json())
      .then((d) => {
        const all: Meeting[] = Array.isArray(d.meetings) ? d.meetings : [];
        const activeDraft = d.active ?? all.find((m) => m.status === "draft") ?? null;
        const closed = all.filter((m) => m.status === "closed");
        if (activeDraft) {
          setActive(activeDraft);
          lastSaved.current = JSON.stringify(activeDraft);
        } else {
          // No draft yet — leave null; UI shows "Start new meeting" CTA.
          setActive(null);
        }
        setHistory(closed);
        if (onMeta) {
          const latest = all[0];
          if (latest?.updatedAt) {
            onMeta({ updatedAt: latest.updatedAt, updatedBy: latest.updatedBy || "Team" });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-report meta when active meeting changes.
  useEffect(() => {
    if (!onMeta || !active?.updatedAt) return;
    onMeta({ updatedAt: active.updatedAt, updatedBy: active.updatedBy || "Team" });
  }, [active?.updatedAt, active?.updatedBy, onMeta]);

  // Auto-save active draft (PATCH /api/team/meeting with { id, patch }).
  useEffect(() => {
    if (!active || active.status !== "draft") return;
    const snapshot = JSON.stringify(active);
    if (snapshot === lastSaved.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const { id, status, createdAt, closedAt, ...patch } = active;
        const res = await fetch("/api/team/meeting", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, patch }),
        });
        const data = await res.json();
        if (data.meeting) {
          // Update active with server-confirmed timestamps; keep id stable.
          setActive((prev) => prev ? { ...prev, updatedAt: data.meeting.updatedAt, updatedBy: data.meeting.updatedBy } : prev);
        }
        lastSaved.current = snapshot;
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 1400);
      } catch {
        setSaving("idle");
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [active]);

  function updateActive(updater: (prev: Meeting) => Meeting) {
    setActive((prev) => (prev ? updater(prev) : prev));
  }

  function toggleAttendee(a: Attendee) {
    updateActive((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(a)
        ? prev.attendees.filter((x) => x !== a)
        : [...prev.attendees, a],
    }));
  }

  function addAgendaItem(text: string) {
    if (!text.trim()) return;
    updateActive((prev) => ({
      ...prev,
      agenda: [...prev.agenda, { id: `ag_${Math.random().toString(36).slice(2, 8)}`, text: text.trim(), done: false }],
    }));
  }

  function toggleAgendaItem(id: string) {
    updateActive((prev) => ({
      ...prev,
      agenda: prev.agenda.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
    }));
  }

  function updateAgendaItem(id: string, text: string) {
    updateActive((prev) => ({
      ...prev,
      agenda: prev.agenda.map((a) => (a.id === id ? { ...a, text } : a)),
    }));
  }

  function removeAgendaItem(id: string) {
    updateActive((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((a) => a.id !== id),
    }));
  }

  function addAction() {
    if (!newAction.trim() || !active) return;
    updateActive((prev) => ({
      ...prev,
      actionItems: [
        ...prev.actionItems,
        { id: `a_${Date.now().toString(36)}`, text: newAction.trim(), owner: newActionOwner, done: false },
      ],
    }));
    setNewAction("");
  }

  function toggleAction(id: string) {
    updateActive((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
    }));
  }

  function deleteAction(id: string) {
    updateActive((prev) => ({
      ...prev,
      actionItems: prev.actionItems.filter((a) => a.id !== id),
    }));
  }

  async function handleClose() {
    if (!active) return;
    const filledCount =
      active.agenda.filter((a) => a.text.trim()).length +
      active.actionItems.length +
      (active.notes.trim() ? 1 : 0) +
      (active.title.trim() ? 1 : 0);
    const confirmMsg =
      filledCount === 0
        ? "This meeting is empty. Mark it as done anyway?"
        : `Mark this meeting as done and start a new one?\n\nIt will be saved as a summary in Past Meetings below.`;
    if (!window.confirm(confirmMsg)) return;
    setClosing(true);
    try {
      const res = await fetch("/api/team/meeting/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: active.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close");
      // Update history with the closed meeting + any new drafts
      const all: Meeting[] = data.meetings || [];
      const newDraft = all.find((m) => m.status === "draft") || null;
      const closedNow = all.find((m) => m.id === active.id && m.status === "closed");
      setHistory((prev) => (closedNow ? [closedNow, ...prev.filter((m) => m.id !== closedNow.id)] : prev));
      if (newDraft) {
        setActive(newDraft);
        lastSaved.current = JSON.stringify(newDraft);
      } else {
        setActive(null);
      }
      // Flash the saved state for confirmation feedback.
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1600);
      // Auto-expand history so user sees the just-closed meeting.
      setHistoryOpen(true);
    } catch (err) {
      alert((err as Error).message || "Failed to close meeting");
    } finally {
      setClosing(false);
    }
  }

  async function startNewMeeting() {
    try {
      const res = await fetch("/api/team/meeting", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start");
      const draft: Meeting = data.meeting;
      setActive(draft);
      lastSaved.current = JSON.stringify(draft);
    } catch (err) {
      alert((err as Error).message || "Failed to start meeting");
    }
  }

  async function deleteHistoryItem(id: string) {
    if (!window.confirm("Delete this past meeting? This can't be undone.")) return;
    try {
      const res = await fetch("/api/team/meeting", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      const updated: Meeting[] = data.meetings || [];
      setHistory(updated.filter((m) => m.status === "closed"));
      if (expandedHistoryId === id) setExpandedHistoryId(null);
    } catch (err) {
      alert((err as Error).message || "Failed to delete");
    }
  }

  if (loading) {
    return (
      <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "32px" }}>
        Loading…
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {active ? (
        <>
          {/* Top bar: title, date, save state, Finished button */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "14px 16px",
            }}
          >
            <input
              value={active.title}
              onChange={(e) => updateActive((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Meeting title"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.95)",
                fontFamily: "system-ui",
                fontSize: "18px",
                fontWeight: 600,
                outline: "none",
                flex: 1,
                minWidth: "140px",
              }}
            />
            <input
              type="date"
              value={active.date}
              onChange={(e) => updateActive((prev) => ({ ...prev, date: e.target.value }))}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "10px",
                color: "rgba(255,255,255,0.85)",
                padding: "6px 10px",
                fontFamily: "system-ui",
                fontSize: "12px",
                outline: "none",
              }}
            />
            <TemplateMenu
              onUse={() => {
                if (active.agenda.length > 0) {
                  const ok = window.confirm(
                    `Replace the current ${active.agenda.length} agenda item${active.agenda.length === 1 ? "" : "s"} with the template? This can't be undone.`
                  );
                  if (!ok) return;
                }
                updateActive((prev) => ({
                  ...prev,
                  agenda: DEFAULT_AGENDA_TEMPLATE.map((text) => ({
                    id: `ag_${Math.random().toString(36).slice(2, 8)}`,
                    text,
                    done: false,
                  })),
                }));
              }}
              onAppend={() => {
                const appended = DEFAULT_AGENDA_TEMPLATE.map((text) => ({
                  id: `ag_${Math.random().toString(36).slice(2, 8)}`,
                  text,
                  done: false,
                }));
                updateActive((prev) => ({ ...prev, agenda: [...prev.agenda, ...appended] }));
              }}
            />
            <SaveIndicator state={saving} />
            <button
              onClick={handleClose}
              disabled={closing}
              title="Mark this meeting as done, save as a summary, and open a fresh one for next time"
              style={{
                fontFamily: "system-ui",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: closing ? "rgba(255,255,255,0.40)" : "rgba(10,14,26,0.95)",
                background: closing ? "rgba(52,211,153,0.20)" : "#34d399",
                border: "none",
                borderRadius: "10px",
                padding: "8px 14px",
                cursor: closing ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              {closing ? "Saving…" : "✓ Finished"}
            </button>
          </div>

          {/* Attendees */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "14px 16px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                fontFamily: "system-ui",
                fontSize: "11px",
                color: "rgba(255,255,255,0.40)",
                textTransform: "uppercase",
                letterSpacing: "0.10em",
                margin: 0,
                marginRight: "4px",
              }}
            >
              Attendees
            </p>
            {ALL_ATTENDEES.map((a) => {
              const on = active.attendees.includes(a);
              const c = ATTENDEE_COLORS[a];
              return (
                <button
                  key={a}
                  onClick={() => toggleAttendee(a)}
                  style={{
                    fontFamily: "system-ui",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: on ? c : "rgba(255,255,255,0.50)",
                    background: on ? `${c}22` : "rgba(255,255,255,0.04)",
                    border: on ? `1px solid ${c}55` : "1px solid rgba(255,255,255,0.10)",
                    borderRadius: "999px",
                    padding: "4px 12px",
                    cursor: "pointer",
                  }}
                >
                  {on ? "✓ " : ""}
                  {a}
                </button>
              );
            })}
          </div>

          {/* Agenda + Notes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            <AgendaBlock
              items={active.agenda}
              accent="#0abab5"
              onAdd={addAgendaItem}
              onToggle={toggleAgendaItem}
              onUpdate={updateAgendaItem}
              onRemove={removeAgendaItem}
            />
            <TextBlock
              label="Notes"
              placeholder="Decisions, context, links…"
              value={active.notes}
              onChange={(v) => updateActive((prev) => ({ ...prev, notes: v }))}
              accent="#3b82f6"
            />
          </div>

          {/* Action items */}
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px",
              padding: "16px",
            }}
          >
            <p
              style={{
                fontFamily: "system-ui",
                fontSize: "11px",
                color: "rgba(255,255,255,0.40)",
                textTransform: "uppercase",
                letterSpacing: "0.10em",
                margin: "0 0 12px",
              }}
            >
              Action Items
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              {active.actionItems.length === 0 && (
                <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontStyle: "italic", margin: 0 }}>
                  No actions yet — add one below.
                </p>
              )}
              {active.actionItems.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    opacity: a.done ? 0.55 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={a.done}
                    onChange={() => toggleAction(a.id)}
                    style={{ accentColor: "#0abab5", cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <span
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.85)",
                      flex: 1,
                      textDecoration: a.done ? "line-through" : "none",
                    }}
                  >
                    {a.text}
                  </span>
                  <span
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "10px",
                      fontWeight: 600,
                      color: ATTENDEE_COLORS[a.owner as Attendee] ?? "#94a3b8",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "999px",
                      padding: "2px 8px",
                    }}
                  >
                    {a.owner}
                  </span>
                  <button
                    onClick={() => deleteAction(a.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "rgba(255,255,255,0.30)",
                      cursor: "pointer",
                      fontSize: "14px",
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                placeholder="New action item…"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addAction();
                }}
                style={{
                  flex: 1,
                  minWidth: "180px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  color: "white",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontFamily: "system-ui",
                  outline: "none",
                }}
              />
              <select
                value={newActionOwner}
                onChange={(e) => setNewActionOwner(e.target.value as Owner)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  color: "white",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontFamily: "system-ui",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {ALL_OWNERS.map((o) => (
                  <option key={o} value={o} style={{ background: "#0a0e1a" }}>
                    {o}
                  </option>
                ))}
              </select>
              <button
                onClick={addAction}
                disabled={!newAction.trim()}
                style={{
                  fontFamily: "system-ui",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "rgba(10,14,26,0.95)",
                  background: newAction.trim() ? "#0abab5" : "rgba(10,186,181,0.30)",
                  border: "none",
                  borderRadius: "10px",
                  padding: "8px 16px",
                  cursor: newAction.trim() ? "pointer" : "not-allowed",
                }}
              >
                Add
              </button>
            </div>
          </div>
        </>
      ) : (
        /* No active draft — show CTA to start one */
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px dashed rgba(255,255,255,0.20)",
            borderRadius: "16px",
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "36px", margin: "0 0 8px" }}>🗓</p>
          <p style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.65)", margin: "0 0 4px" }}>
            No active meeting
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: "0 0 16px" }}>
            Start a new draft to plan your next team sync.
          </p>
          <button
            onClick={startNewMeeting}
            style={{
              fontFamily: "system-ui",
              fontSize: "13px",
              fontWeight: 700,
              color: "rgba(10,14,26,0.95)",
              background: "#0abab5",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            + Start new meeting
          </button>
        </div>
      )}

      {/* Past meetings — always visible, collapsed by default unless we just closed one */}
      <HistorySection
        history={history}
        open={historyOpen}
        onToggle={() => setHistoryOpen((o) => !o)}
        expandedId={expandedHistoryId}
        onExpand={(id) => setExpandedHistoryId((prev) => (prev === id ? null : id))}
        onDelete={deleteHistoryItem}
      />
    </div>
  );
}

function HistorySection({
  history,
  open,
  onToggle,
  expandedId,
  onExpand,
  onDelete,
}: {
  history: Meeting[];
  open: boolean;
  onToggle: () => void;
  expandedId: string | null;
  onExpand: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (history.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.10)",
          borderRadius: "14px",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <p
          style={{
            fontFamily: "system-ui",
            fontSize: "11px",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
            margin: 0,
          }}
        >
          Past meetings
        </p>
        <p
          style={{
            fontFamily: "system-ui",
            fontSize: "12px",
            color: "rgba(255,255,255,0.30)",
            margin: 0,
            fontStyle: "italic",
          }}
        >
          Hit "✓ Finished" above to save your first one.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "12px 16px",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "transparent",
          border: "none",
          padding: "6px 0",
          cursor: "pointer",
          color: "rgba(255,255,255,0.65)",
          fontFamily: "system-ui",
          fontSize: "12px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span>Past meetings · {history.length}</span>
        <span style={{ color: "rgba(255,255,255,0.40)", fontSize: "11px" }}>{open ? "▾ Hide" : "▸ Show"}</span>
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
          {history.map((m) => {
            const isExpanded = expandedId === m.id;
            const covered = m.agenda.filter((a) => a.done).length;
            const d = new Date(m.date + "T00:00:00");
            const dateLabel = isNaN(d.getTime())
              ? m.date
              : d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
            return (
              <div
                key={m.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${isExpanded ? "rgba(10,186,181,0.40)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "system-ui",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.92)",
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {m.title || "Untitled meeting"}
                    </p>
                    <p
                      style={{
                        fontFamily: "system-ui",
                        fontSize: "11px",
                        color: "rgba(255,255,255,0.45)",
                        margin: "2px 0 0",
                      }}
                    >
                      {dateLabel} · {covered}/{m.agenda.length} covered · {m.actionItems.length} actions · {m.attendees.join(", ")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                    <button
                      onClick={() => onExpand(m.id)}
                      title={isExpanded ? "Collapse" : "Expand"}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.40)",
                        cursor: "pointer",
                        fontSize: "13px",
                        width: "26px",
                        height: "26px",
                        borderRadius: "8px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      {isExpanded ? "▾" : "▸"}
                    </button>
                    <button
                      onClick={() => onDelete(m.id)}
                      title="Delete meeting"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.30)",
                        cursor: "pointer",
                        fontSize: "16px",
                        width: "26px",
                        height: "26px",
                        borderRadius: "8px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {m.agenda.length > 0 && (
                      <div>
                        <p style={HISTORY_SUBHEAD}>Agenda</p>
                        <ul style={{ margin: 0, paddingLeft: "18px", color: "rgba(255,255,255,0.75)", fontSize: "12px", lineHeight: 1.6 }}>
                          {m.agenda.map((a) => (
                            <li key={a.id} style={{ textDecoration: a.done ? "line-through" : "none", opacity: a.done ? 0.6 : 1 }}>
                              {a.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.actionItems.length > 0 && (
                      <div>
                        <p style={HISTORY_SUBHEAD}>Action items</p>
                        <ul style={{ margin: 0, paddingLeft: "18px", color: "rgba(255,255,255,0.75)", fontSize: "12px", lineHeight: 1.6 }}>
                          {m.actionItems.map((a) => (
                            <li key={a.id} style={{ textDecoration: a.done ? "line-through" : "none", opacity: a.done ? 0.6 : 1 }}>
                              {a.text} <span style={{ color: "rgba(255,255,255,0.40)", fontSize: "10px" }}>— {a.owner}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.notes.trim() && (
                      <div>
                        <p style={HISTORY_SUBHEAD}>Notes</p>
                        <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                          {m.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const HISTORY_SUBHEAD: React.CSSProperties = {
  fontFamily: "system-ui",
  fontSize: "10px",
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  margin: "0 0 6px",
  fontWeight: 600,
};

function TextBlock({
  label,
  placeholder,
  value,
  onChange,
  accent,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent}22`,
        borderRadius: "16px",
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          fontFamily: "system-ui",
          fontSize: "11px",
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          margin: "0 0 10px",
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "10px",
          color: "rgba(255,255,255,0.90)",
          padding: "10px 12px",
          fontSize: "13px",
          fontFamily: "system-ui",
          outline: "none",
          resize: "vertical",
          boxSizing: "border-box",
          minHeight: "180px",
          lineHeight: 1.5,
        }}
      />
    </div>
  );
}

function AgendaBlock({
  items,
  accent,
  onAdd,
  onToggle,
  onUpdate,
  onRemove,
}: {
  items: AgendaItem[];
  accent: string;
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const done = items.filter((a) => a.done).length;
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${accent}22`,
        borderRadius: "16px",
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          fontFamily: "system-ui",
          fontSize: "11px",
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          margin: "0 0 10px",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Agenda</span>
        <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
          {done}/{items.length} covered
        </span>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px", minHeight: "160px" }}>
        {items.length === 0 && (
          <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", fontStyle: "italic", margin: 0 }}>
            Add the topics you want to cover below — tick them off as you go.
          </p>
        )}
        {items.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: a.done ? "rgba(10,186,181,0.06)" : "rgba(255,255,255,0.04)",
              border: a.done ? `1px solid ${accent}44` : "1px solid rgba(255,255,255,0.10)",
              borderRadius: "10px",
              padding: "8px 12px",
              opacity: a.done ? 0.7 : 1,
              transition: "all 0.15s",
            }}
          >
            <input
              type="checkbox"
              checked={a.done}
              onChange={() => onToggle(a.id)}
              style={{ accentColor: accent, cursor: "pointer", width: "18px", height: "18px", flexShrink: 0 }}
            />
            <input
              value={a.text}
              onChange={(e) => onUpdate(a.id, e.target.value)}
              placeholder="Topic to cover"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: a.done ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.92)",
                fontSize: "13px",
                fontFamily: "system-ui",
                fontWeight: 500,
                outline: "none",
                textDecoration: a.done ? "line-through" : "none",
                minWidth: 0,
                lineHeight: 1.4,
              }}
            />
            <button
              onClick={() => onRemove(a.id)}
              title="Remove"
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.25)",
                cursor: "pointer",
                fontSize: "14px",
                padding: 0,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          ref={inputRef}
          placeholder="+ Add topic"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: `1px dashed ${accent}55`,
            borderRadius: "10px",
            color: "rgba(255,255,255,0.85)",
            padding: "7px 12px",
            fontSize: "13px",
            fontFamily: "system-ui",
            outline: "none",
          }}
        />
        <button
          onClick={() => {
            if (draft.trim()) {
              onAdd(draft.trim());
              setDraft("");
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
          disabled={!draft.trim()}
          style={{
            fontFamily: "system-ui",
            fontSize: "12px",
            fontWeight: 600,
            color: "rgba(10,14,26,0.95)",
            background: draft.trim() ? accent : `${accent}40`,
            border: "none",
            borderRadius: "10px",
            padding: "7px 14px",
            cursor: draft.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  const color =
    state === "saving"
      ? "rgba(251,191,36,0.85)"
      : state === "saved"
      ? "rgba(52,211,153,0.90)"
      : "rgba(255,255,255,0.30)";
  return (
    <span
      style={{
        fontFamily: "system-ui",
        fontSize: "11px",
        letterSpacing: "0.05em",
        color,
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          ...(state === "saving" ? { animation: "pulse 1s infinite" } : {}),
        }}
      />
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "All changes saved"}
    </span>
  );
}

function TemplateMenu({
  onUse,
  onAppend,
}: {
  onUse: () => void;
  onAppend: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Apply meeting agenda template"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "system-ui",
          fontSize: "11px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.85)",
          background: open ? "rgba(10,186,181,0.18)" : "rgba(255,255,255,0.05)",
          border: "1px solid rgba(10,186,181,0.35)",
          borderRadius: "10px",
          padding: "6px 10px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        ✨ Template <span style={{ fontSize: "9px", opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "260px",
            background: "rgba(15,20,32,0.98)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(10,186,181,0.40)",
            borderRadius: "12px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.50)",
            padding: "6px",
            zIndex: 30,
          }}
        >
          <button
            onClick={() => {
              setOpen(false);
              onUse();
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              fontFamily: "system-ui",
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              padding: "8px 10px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(10,186,181,0.10)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Use template (replace agenda)
          </button>
          <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", margin: "0 10px 6px", lineHeight: 1.4 }}>
            Replaces all current agenda items with the {DEFAULT_AGENDA_TEMPLATE.length} standing topics.
          </p>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 6px" }} />
          <button
            onClick={() => {
              setOpen(false);
              onAppend();
            }}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              fontFamily: "system-ui",
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.92)",
              background: "transparent",
              border: "none",
              borderRadius: "8px",
              padding: "8px 10px",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(10,186,181,0.10)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Append template to agenda
          </button>
          <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", margin: "0 10px 4px", lineHeight: 1.4 }}>
            Keeps existing items and adds the template below them.
          </p>
        </div>
      )}
    </div>
  );
}
