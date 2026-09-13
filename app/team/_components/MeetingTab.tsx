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
  title: string;
  date: string;
  attendees: Attendee[];
  agenda: AgendaItem[] | string; // string accepted for legacy; client normalises to array
  notes: string;
  actionItems: ActionItem[];
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
// Edit the array below to change the standing agenda for every weekly team sync.
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

function normaliseAgenda(raw: AgendaItem[] | string | null | undefined): AgendaItem[] {
  if (Array.isArray(raw)) {
    return raw
      .filter((it) => typeof it?.text === "string")
      .map((it) => ({
        id: typeof it.id === "string" ? it.id : `ag_${Math.random().toString(36).slice(2, 8)}`,
        text: it.text,
        done: !!it.done,
      }));
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ id: `ag_${Math.random().toString(36).slice(2, 8)}`, text, done: false }));
  }
  return [];
}

export function MeetingTab({ onMeta }: { onMeta?: (m: TabMeta | null) => void } = {}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [newAction, setNewAction] = useState("");
  const [newActionOwner, setNewActionOwner] = useState<Owner>("Shared");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    fetch("/api/team/meeting")
      .then((r) => r.json())
      .then((d) => {
        const m = { ...d.meeting, agenda: normaliseAgenda(d.meeting.agenda) };
        setMeeting(m);
        lastSaved.current = JSON.stringify(m);
        if (onMeta && m.updatedAt) {
          onMeta({ updatedAt: m.updatedAt, updatedBy: m.updatedBy || "Team" });
        }
      })
      .catch(() => {});
  }, [onMeta]);

  // Re-report whenever meeting metadata changes (after a save)
  useEffect(() => {
    if (!onMeta || !meeting || !meeting.updatedAt) return;
    onMeta({ updatedAt: meeting.updatedAt, updatedBy: meeting.updatedBy || "Team" });
  }, [meeting?.updatedAt, meeting?.updatedBy, onMeta]);

  // Auto-save: debounce 800ms after any change
  useEffect(() => {
    if (!meeting) return;
    const snapshot = JSON.stringify(meeting);
    if (snapshot === lastSaved.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving("saving");
    saveTimer.current = setTimeout(async () => {
      await fetch("/api/team/meeting", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meeting),
      });
      lastSaved.current = snapshot;
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 1400);
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [meeting]);

  function toggleAttendee(a: Attendee) {
    if (!meeting) return;
    setMeeting({
      ...meeting,
      attendees: meeting.attendees.includes(a)
        ? meeting.attendees.filter((x) => x !== a)
        : [...meeting.attendees, a],
    });
  }

  function addAgendaItem(text: string) {
    if (!text.trim()) return;
    // Functional setState: guarantees we read the latest meeting, not a stale closure.
    setMeeting((prev) => {
      if (!prev) return prev;
      const agenda = normaliseAgenda(prev.agenda);
      return {
        ...prev,
        agenda: [...agenda, { id: `ag_${Math.random().toString(36).slice(2, 8)}`, text: text.trim(), done: false }],
      };
    });
  }

  function toggleAgendaItem(id: string) {
    setMeeting((prev) => {
      if (!prev) return prev;
      const agenda = normaliseAgenda(prev.agenda);
      return {
        ...prev,
        agenda: agenda.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
      };
    });
  }

  function updateAgendaItem(id: string, text: string) {
    setMeeting((prev) => {
      if (!prev) return prev;
      const agenda = normaliseAgenda(prev.agenda);
      return {
        ...prev,
        agenda: agenda.map((a) => (a.id === id ? { ...a, text } : a)),
      };
    });
  }

  function removeAgendaItem(id: string) {
    setMeeting((prev) => {
      if (!prev) return prev;
      const agenda = normaliseAgenda(prev.agenda);
      return {
        ...prev,
        agenda: agenda.filter((a) => a.id !== id),
      };
    });
  }

  function addAction() {
    if (!newAction.trim() || !meeting) return;
    setMeeting({
      ...meeting,
      actionItems: [
        ...meeting.actionItems,
        { id: `a_${Date.now().toString(36)}`, text: newAction.trim(), owner: newActionOwner, done: false },
      ],
    });
    setNewAction("");
  }

  function toggleAction(id: string) {
    if (!meeting) return;
    setMeeting({
      ...meeting,
      actionItems: meeting.actionItems.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
    });
  }

  function deleteAction(id: string) {
    if (!meeting) return;
    setMeeting({
      ...meeting,
      actionItems: meeting.actionItems.filter((a) => a.id !== id),
    });
  }

  if (!meeting) {
    return (
      <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "32px" }}>
        Loading…
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top bar: title, date, save state */}
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
          value={meeting.title}
          onChange={(e) => setMeeting({ ...meeting, title: e.target.value })}
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
          value={meeting.date}
          onChange={(e) => setMeeting({ ...meeting, date: e.target.value })}
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
            const current = normaliseAgenda(meeting.agenda);
            if (current.length > 0) {
              const ok = window.confirm(
                `Replace the current ${current.length} agenda item${current.length === 1 ? "" : "s"} with the template? This can't be undone.`
              );
              if (!ok) return;
            }
            setMeeting({
              ...meeting,
              agenda: DEFAULT_AGENDA_TEMPLATE.map((text) => ({
                id: `ag_${Math.random().toString(36).slice(2, 8)}`,
                text,
                done: false,
              })),
            });
          }}
          onAppend={() => {
            const current = normaliseAgenda(meeting.agenda);
            const appended = DEFAULT_AGENDA_TEMPLATE.map((text) => ({
              id: `ag_${Math.random().toString(36).slice(2, 8)}`,
              text,
              done: false,
            }));
            setMeeting({ ...meeting, agenda: [...current, ...appended] });
          }}
        />
        <SaveIndicator state={saving} />
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
          const on = meeting.attendees.includes(a);
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

      {/* Agenda + Notes side-by-side on desktop */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        <AgendaBlock
          items={normaliseAgenda(meeting.agenda)}
          accent="#0abab5"
          onAdd={addAgendaItem}
          onToggle={toggleAgendaItem}
          onUpdate={updateAgendaItem}
          onRemove={removeAgendaItem}
        />
        <TextBlock
          label="Notes"
          placeholder="Decisions, context, links…"
          value={meeting.notes}
          onChange={(v) => setMeeting({ ...meeting, notes: v })}
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
          {meeting.actionItems.length === 0 && (
            <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontStyle: "italic", margin: 0 }}>
              No actions yet — add one below.
            </p>
          )}
          {meeting.actionItems.map((a) => (
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
    </div>
  );
}

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
        <span style={{ color: "rgba(255,255,255,0.40)", fontWeight: 400, textTransform: "none", letterSpacing: "0" }}>
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
              // Keep focus on the input so you can keep adding topics in quick succession
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
            if (!draft.trim()) return;
            onAdd(draft.trim());
            setDraft("");
            requestAnimationFrame(() => inputRef.current?.focus());
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
  const text =
    state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "All changes saved";
  const color = state === "saving" ? "rgba(251,191,36,0.85)" : state === "saved" ? "rgba(52,211,153,0.90)" : "rgba(255,255,255,0.30)";
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
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          ...(state === "saving" ? { animation: "pulse 1s infinite" } : {}),
        }}
      />
      {text}
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

  // Close on outside click
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
        onClick={() => setOpen((v) => !v)}
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
            onClick={() => { setOpen(false); onUse(); }}
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
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.40)",
              margin: "0 10px 6px",
              lineHeight: 1.4,
            }}
          >
            Replaces all current agenda items with the {DEFAULT_AGENDA_TEMPLATE.length} standing topics.
          </p>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 6px" }} />
          <button
            onClick={() => { setOpen(false); onAppend(); }}
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
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.40)",
              margin: "0 10px 4px",
              lineHeight: 1.4,
            }}
          >
            Keeps existing items and adds the template below them.
          </p>
        </div>
      )}
    </div>
  );
}
