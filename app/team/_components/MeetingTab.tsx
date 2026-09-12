"use client";

import { useEffect, useRef, useState } from "react";

type Attendee = "Milzzy" | "Miggy" | "Sonta";
type Owner = "Milzzy" | "Miggy" | "Sonta" | "Shared";

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
  agenda: string;
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

export function MeetingTab() {
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
        setMeeting(d.meeting);
        lastSaved.current = JSON.stringify(d.meeting);
      })
      .catch(() => {});
  }, []);

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
            minWidth: "200px",
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
        <TextBlock
          label="Agenda"
          placeholder="Topics to cover…"
          value={meeting.agenda}
          onChange={(v) => setMeeting({ ...meeting, agenda: v })}
          accent="#0abab5"
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
