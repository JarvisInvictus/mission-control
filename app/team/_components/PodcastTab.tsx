"use client";

import { useEffect, useRef, useState } from "react";

type EpisodeStatus = "idea" | "planned" | "recorded" | "published";

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface LinkItem {
  id: string;
  label: string;
  url: string;
}

interface Episode {
  id: string;
  number: number | null;
  title: string;
  guest: string;
  topic: string;
  notes: string;
  status: EpisodeStatus;
  owner: string;
  targetDate: string | null;
  publishDate: string | null;
  checklist: ChecklistItem[];
  links: LinkItem[];
  createdAt: string;
  updatedAt: string;
}

const STATUSES: { key: EpisodeStatus; label: string; tint: string; border: string; text: string }[] = [
  { key: "idea", label: "Ideas", tint: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.35)", text: "#a855f7" },
  { key: "planned", label: "Planned", tint: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.35)", text: "#3b82f6" },
  { key: "recorded", label: "Recorded", tint: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.35)", text: "#fbbf24" },
  { key: "published", label: "Published", tint: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.35)", text: "#34d399" },
];

const EMPTY: Omit<Episode, "id" | "createdAt" | "updatedAt"> = {
  number: null,
  title: "",
  guest: "",
  topic: "",
  notes: "",
  status: "idea",
  owner: "Milzzy",
  targetDate: null,
  publishDate: null,
  checklist: [],
  links: [],
};

export function PodcastTab() {
  const [items, setItems] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state — null = closed. Episode or "new" controls the content.
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; episode: Episode } | null>(null);

  useEffect(() => {
    fetch("/api/team/podcast")
      .then((r) => r.json())
      .then((d) => {
        // Defensive: backfill missing checklist/links for episodes created before this feature
        const safe = (d.items || []).map((e: Episode) => ({
          ...e,
          checklist: Array.isArray(e.checklist) ? e.checklist : [],
          links: Array.isArray(e.links) ? e.links : [],
        }));
        setItems(safe);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(item: Episode, status: EpisodeStatus) {
    setItems((prev) => prev.map((e) => (e.id === item.id ? { ...e, status } : e)));
    await fetch(`/api/team/podcast/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/team/podcast/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <button
          onClick={() => setModal({ mode: "create" })}
          style={{
            fontFamily: "system-ui",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: "rgba(255,255,255,0.95)",
            background: "rgba(168,85,247,0.18)",
            border: "1px solid rgba(168,85,247,0.40)",
            borderRadius: "10px",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          🎙 Plan Episode
        </button>
        <div style={{ marginLeft: "auto", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          {items.length} episode{items.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Status columns */}
      {loading ? (
        <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "32px" }}>
          Loading…
        </p>
      ) : items.length === 0 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: "system-ui", fontSize: "32px", margin: "0 0 8px" }}>🎙️</p>
          <p style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.60)", margin: "0 0 4px" }}>
            No episodes yet
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
            Hit <strong style={{ color: "rgba(168,85,247,0.90)" }}>Plan Episode</strong> to start your pipeline.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {STATUSES.map((col) => {
            const colItems = items.filter((e) => e.status === col.key);
            return (
              <section key={col.key}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <span
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.85)",
                      background: col.tint,
                      border: `1px solid ${col.border}`,
                      borderRadius: "999px",
                      padding: "4px 12px",
                    }}
                  >
                    {col.label}
                  </span>
                  <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                    {colItems.length}
                  </span>
                </div>
                {colItems.length === 0 ? (
                  <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.20)", fontStyle: "italic", paddingLeft: "12px" }}>
                    —
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "10px" }}>
                    {colItems.map((ep) => (
                      <EpisodeCard
                        key={ep.id}
                        ep={ep}
                        onEdit={() => setModal({ mode: "edit", episode: ep })}
                        onStart={() => setModal({ mode: "edit", episode: ep })}
                        onStatusChange={updateStatus}
                        onDelete={deleteItem}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <EpisodeModal
          mode={modal.mode}
          initial={modal.mode === "create" ? EMPTY : modal.episode}
          onClose={() => setModal(null)}
          onSaved={(saved) => {
            if (modal.mode === "create") {
              setItems((prev) => [saved, ...prev]);
            } else {
              setItems((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
            }
            setModal(null);
          }}
          onDeleted={
            modal.mode === "edit"
              ? () => {
                  setItems((prev) => prev.filter((e) => e.id !== modal.episode.id));
                  setModal(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ─── Episode Card ─────────────────────────────────────────────────────────────

function EpisodeCard({
  ep,
  onEdit,
  onStart,
  onStatusChange,
  onDelete,
}: {
  ep: Episode;
  onEdit: () => void;
  onStart: () => void;
  onStatusChange: (ep: Episode, status: EpisodeStatus) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "14px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onClick={(e) => {
        // Don't open modal if click was on a button or select inside the card
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "BUTTON" && tag !== "SELECT" && tag !== "OPTION") onEdit();
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.18)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.10)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {ep.number !== null && (
            <p
              style={{
                fontFamily: "system-ui",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.10em",
                color: "rgba(168,85,247,0.90)",
                textTransform: "uppercase",
                margin: "0 0 4px",
              }}
            >
              Episode {ep.number}
            </p>
          )}
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.95)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {ep.title}
          </p>
          {ep.guest && (
            <p
              style={{
                fontFamily: "system-ui",
                fontSize: "12px",
                color: "rgba(255,255,255,0.60)",
                margin: "4px 0 0",
              }}
            >
              w/ {ep.guest}
            </p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(ep.id);
          }}
          title="Delete"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.30)",
            cursor: "pointer",
            fontSize: "16px",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {ep.topic && (
        <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.4 }}>
          {ep.topic}
        </p>
      )}
      {ep.notes && (
        <p
          style={{
            fontFamily: "system-ui",
            fontSize: "11px",
            color: "rgba(255,255,255,0.45)",
            margin: 0,
            padding: "8px 10px",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "8px",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {ep.notes}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap", marginTop: "2px" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {ep.targetDate && (
            <span style={pillMuted}>
              🎯 {new Date(ep.targetDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </span>
          )}
          {ep.publishDate && (
            <span style={{ ...pillMuted, color: "rgba(52,211,153,0.95)", borderColor: "rgba(52,211,153,0.30)" }}>
              📅 {new Date(ep.publishDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            title="Start podcast (opens timer)"
            style={{
              fontFamily: "system-ui",
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.90)",
              background: "rgba(168,85,247,0.20)",
              border: "1px solid rgba(168,85,247,0.40)",
              borderRadius: "8px",
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            ▶ Start
          </button>
          <select
            value={ep.status}
            onChange={(e) => onStatusChange(ep, e.target.value as EpisodeStatus)}
            onClick={(e) => e.stopPropagation()}
            style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "6px",
              padding: "2px 4px",
              cursor: "pointer",
            }}
          >
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key} style={{ background: "#0a0e1a" }}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Episode Modal ────────────────────────────────────────────────────────────

function EpisodeModal({
  mode,
  initial,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "create" | "edit";
  initial: Omit<Episode, "id" | "createdAt" | "updatedAt"> | Episode;
  onClose: () => void;
  onSaved: (ep: Episode) => void;
  onDeleted?: () => void;
}) {
  const isCreate = mode === "create";
  const epId = !isCreate ? (initial as Episode).id : null;

  const [draft, setDraft] = useState<Omit<Episode, "id" | "createdAt" | "updatedAt">>(initial);
  const [saving, setSaving] = useState(false);

  // Checklist + links state — initial backfilled from the episode
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initial.checklist ?? []);
  const [links, setLinks] = useState<LinkItem[]>(initial.links ?? []);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newLink, setNewLink] = useState<{ label: string; url: string } | null>(null);

  // Timer state — only meaningful in edit mode
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const storageKey = epId ? `podcast-timer-${epId}` : null;

  // Load stored elapsed seconds for this episode
  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n)) setElapsed(n);
    }
  }, [storageKey]);

  // Drive the timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => {
          const next = e + 1;
          if (storageKey) localStorage.setItem(storageKey, String(next));
          return next;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, storageKey]);

  function reset() {
    setRunning(false);
    setElapsed(0);
    if (storageKey) localStorage.setItem(storageKey, "0");
  }

  async function save() {
    if (!draft.title.trim()) return;
    setSaving(true);
    try {
      const url = isCreate ? "/api/team/podcast" : `/api/team/podcast/${epId}`;
      const method = isCreate ? "POST" : "PATCH";
      const payload = { ...draft, checklist, links };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.item) onSaved(data.item);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.70)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(15, 18, 35, 0.96)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: "24px",
          padding: "24px",
          width: "100%",
          maxWidth: "640px",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(168,85,247,0.18)",
                border: "1px solid rgba(168,85,247,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              🎙
            </div>
            <div>
              <p
                style={{
                  fontFamily: "system-ui",
                  fontSize: "10px",
                  letterSpacing: "0.20em",
                  color: "rgba(255,255,255,0.40)",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {isCreate ? "New episode" : "Edit episode"}
              </p>
              <h2
                style={{
                  fontFamily: "system-ui",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  margin: 0,
                }}
              >
                {draft.title || "Untitled"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "8px",
              color: "rgba(255,255,255,0.70)",
              cursor: "pointer",
              padding: "6px 10px",
              fontSize: "14px",
              fontFamily: "system-ui",
            }}
          >
            ✕
          </button>
        </div>

        {/* Timer (edit mode only) */}
        {!isCreate && (
          <div
            style={{
              background: running
                ? "linear-gradient(135deg, rgba(239,68,68,0.10) 0%, rgba(168,85,247,0.08) 100%)"
                : "rgba(255,255,255,0.04)",
              border: running ? "1px solid rgba(239,68,68,0.40)" : "1px solid rgba(255,255,255,0.10)",
              borderRadius: "16px",
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              transition: "all 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  width: "12px",
                  height: "12px",
                }}
              >
                {running && (
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      background: "#ef4444",
                      opacity: 0.5,
                      animation: "red-pulse 1.4s infinite",
                    }}
                  />
                )}
                <span
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: running ? "#ef4444" : "rgba(255,255,255,0.25)",
                  }}
                />
              </span>
              <div>
                <p
                  style={{
                    fontFamily: "system-ui",
                    fontSize: "10px",
                    color: running ? "rgba(239,68,68,0.95)" : "rgba(255,255,255,0.40)",
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                    margin: "0 0 2px",
                    fontWeight: 600,
                  }}
                >
                  {running ? "Recording" : "Stopped"}
                </p>
                <p
                  style={{
                    fontFamily: "system-ui, monospace",
                    fontSize: "36px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.95)",
                    margin: 0,
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "0.02em",
                    lineHeight: 1,
                  }}
                >
                  {formatHMS(elapsed)}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setRunning((r) => !r)}
                style={{
                  fontFamily: "system-ui",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  background: running ? "rgba(245,158,11,0.20)" : "rgba(52,211,153,0.22)",
                  border: running ? "1px solid rgba(245,158,11,0.45)" : "1px solid rgba(52,211,153,0.45)",
                  borderRadius: "10px",
                  padding: "8px 18px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {running ? "⏸ Pause" : "▶ Start"}
              </button>
              <button
                onClick={reset}
                disabled={elapsed === 0 && !running}
                style={{
                  fontFamily: "system-ui",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.65)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  padding: "8px 14px",
                  cursor: elapsed === 0 && !running ? "not-allowed" : "pointer",
                  opacity: elapsed === 0 && !running ? 0.4 : 1,
                }}
              >
                ↺ Reset
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              placeholder="Episode #"
              type="number"
              value={draft.number ?? ""}
              onChange={(e) => setDraft({ ...draft, number: e.target.value ? parseInt(e.target.value, 10) : null })}
              style={{ ...inputStyle, maxWidth: "100px" }}
            />
            <input
              autoFocus={isCreate}
              placeholder="Episode title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              style={{ ...inputStyle, flex: 2, minWidth: "200px" }}
            />
            <input
              placeholder="Guest"
              value={draft.guest}
              onChange={(e) => setDraft({ ...draft, guest: e.target.value })}
              style={{ ...inputStyle, flex: 1, minWidth: "140px" }}
            />
          </div>
          <input
            placeholder="Topic / angle"
            value={draft.topic}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })}
            style={inputStyle}
          />
          <textarea
            placeholder="Notes (talking points, links, prep)"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            rows={5}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui" }}
          />
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as EpisodeStatus })}
              style={inputStyle}
            >
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key} style={{ background: "#0a0e1a" }}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={draft.targetDate ?? ""}
              onChange={(e) => setDraft({ ...draft, targetDate: e.target.value || null })}
              style={inputStyle}
              title="Target recording date"
            />
            <input
              type="date"
              value={draft.publishDate ?? ""}
              onChange={(e) => setDraft({ ...draft, publishDate: e.target.value || null })}
              style={inputStyle}
              title="Publish date"
            />
          </div>
        </div>

        {/* Checklist */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              margin: "0 0 10px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Checklist</span>
            <span style={{ color: "rgba(255,255,255,0.30)", fontWeight: 400, textTransform: "none", letterSpacing: "0" }}>
              {checklist.filter((c) => c.done).length}/{checklist.length}
            </span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
            {checklist.length === 0 && (
              <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", fontStyle: "italic", margin: 0 }}>
                No items yet — add a talking point below.
              </p>
            )}
            {checklist.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  opacity: c.done ? 0.55 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) =>
                    setChecklist((prev) => prev.map((x) => (x.id === c.id ? { ...x, done: e.target.checked } : x)))
                  }
                  style={{ accentColor: "#a855f7", cursor: "pointer", width: "16px", height: "16px", flexShrink: 0 }}
                />
                <input
                  value={c.text}
                  onChange={(e) =>
                    setChecklist((prev) => prev.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)))
                  }
                  placeholder="Talking point or task"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.85)",
                    fontSize: "13px",
                    fontFamily: "system-ui",
                    outline: "none",
                    textDecoration: c.done ? "line-through" : "none",
                    minWidth: 0,
                  }}
                />
                <button
                  onClick={() => setChecklist((prev) => prev.filter((x) => x.id !== c.id))}
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
              placeholder="+ Add talking point or task"
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newChecklistText.trim()) {
                  setChecklist((prev) => [
                    ...prev,
                    { id: `cl_${Math.random().toString(36).slice(2, 8)}`, text: newChecklistText.trim(), done: false },
                  ]);
                  setNewChecklistText("");
                }
              }}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(168,85,247,0.40)",
                borderRadius: "8px",
                color: "rgba(255,255,255,0.85)",
                padding: "6px 12px",
                fontSize: "12px",
                fontFamily: "system-ui",
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                if (!newChecklistText.trim()) return;
                setChecklist((prev) => [
                  ...prev,
                  { id: `cl_${Math.random().toString(36).slice(2, 8)}`, text: newChecklistText.trim(), done: false },
                ]);
                setNewChecklistText("");
              }}
              disabled={!newChecklistText.trim()}
              style={{
                fontFamily: "system-ui",
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(10,14,26,0.95)",
                background: newChecklistText.trim() ? "#a855f7" : "rgba(168,85,247,0.30)",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                cursor: newChecklistText.trim() ? "pointer" : "not-allowed",
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Links */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              margin: "0 0 10px",
              fontWeight: 600,
            }}
          >
            Links
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
            {links.length === 0 && !newLink && (
              <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", fontStyle: "italic", margin: 0 }}>
                No links yet — add one below (e.g. an Instagram profile or research article).
              </p>
            )}
            {links.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Label (e.g. Men's Physique Winner)"
                  style={{
                    flex: "1 1 200px",
                    minWidth: "160px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.90)",
                    fontSize: "13px",
                    fontFamily: "system-ui",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
                <input
                  value={l.url}
                  onChange={(e) =>
                    setLinks((prev) => prev.map((x) => (x.id === l.id ? { ...x, url: e.target.value } : x)))
                  }
                  placeholder="URL"
                  style={{
                    flex: "2 1 240px",
                    minWidth: "180px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(168,85,247,0.85)",
                    fontSize: "12px",
                    fontFamily: "system-ui, monospace",
                    outline: "none",
                  }}
                />
                {l.label && l.url && (
                  <a
                    href={normalizeUrl(l.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#a855f7",
                      background: "rgba(168,85,247,0.10)",
                      border: "1px solid rgba(168,85,247,0.30)",
                      borderRadius: "6px",
                      padding: "3px 10px",
                      textDecoration: "none",
                      flexShrink: 0,
                    }}
                  >
                    Open ↗
                  </a>
                )}
                <button
                  onClick={() => setLinks((prev) => prev.filter((x) => x.id !== l.id))}
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
            {newLink && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(168,85,247,0.06)",
                  border: "1px solid rgba(168,85,247,0.30)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  autoFocus
                  value={newLink.label}
                  onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                  placeholder="Label (e.g. Men's Physique Winner)"
                  style={{
                    flex: "1 1 200px",
                    minWidth: "160px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.90)",
                    fontSize: "13px",
                    fontFamily: "system-ui",
                    fontWeight: 600,
                    outline: "none",
                  }}
                />
                <input
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newLink.label.trim() && newLink.url.trim()) {
                      setLinks((prev) => [
                        ...prev,
                        {
                          id: `lk_${Math.random().toString(36).slice(2, 8)}`,
                          label: newLink.label.trim(),
                          url: newLink.url.trim(),
                        },
                      ]);
                      setNewLink(null);
                    }
                  }}
                  placeholder="URL (e.g. instagram.com/xyz)"
                  style={{
                    flex: "2 1 240px",
                    minWidth: "180px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(168,85,247,0.85)",
                    fontSize: "12px",
                    fontFamily: "system-ui, monospace",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    if (!newLink.label.trim() || !newLink.url.trim()) return;
                    setLinks((prev) => [
                      ...prev,
                      {
                        id: `lk_${Math.random().toString(36).slice(2, 8)}`,
                        label: newLink.label.trim(),
                        url: newLink.url.trim(),
                      },
                    ]);
                    setNewLink(null);
                  }}
                  disabled={!newLink.label.trim() || !newLink.url.trim()}
                  style={{
                    fontFamily: "system-ui",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "rgba(10,14,26,0.95)",
                    background: newLink.label.trim() && newLink.url.trim() ? "#a855f7" : "rgba(168,85,247,0.30)",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    cursor: newLink.label.trim() && newLink.url.trim() ? "pointer" : "not-allowed",
                    flexShrink: 0,
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setNewLink(null)}
                  title="Cancel"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(255,255,255,0.40)",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {!newLink && (
            <button
              onClick={() => setNewLink({ label: "", url: "" })}
              style={{
                fontFamily: "system-ui",
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(168,85,247,0.95)",
                background: "rgba(168,85,247,0.10)",
                border: "1px dashed rgba(168,85,247,0.35)",
                borderRadius: "8px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              + Add link
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {onDeleted ? (
            <button
              onClick={onDeleted}
              style={{
                fontFamily: "system-ui",
                fontSize: "11px",
                fontWeight: 600,
                color: "rgba(239,68,68,0.85)",
                background: "transparent",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "8px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              Delete episode
            </button>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={onClose}
              style={{
                fontFamily: "system-ui",
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.70)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "10px",
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!draft.title.trim() || saving}
              style={{
                fontFamily: "system-ui",
                fontSize: "12px",
                fontWeight: 700,
                color: "rgba(10,14,26,0.95)",
                background: draft.title.trim() && !saving ? "#a855f7" : "rgba(168,85,247,0.30)",
                border: "none",
                borderRadius: "10px",
                padding: "8px 18px",
                cursor: draft.title.trim() && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? "Saving…" : isCreate ? "Create episode" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeUrl(url: string): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  color: "white",
  padding: "8px 12px",
  fontSize: "13px",
  fontFamily: "system-ui",
  outline: "none",
  flex: 1,
  minWidth: "120px",
  boxSizing: "border-box",
};

const pillMuted: React.CSSProperties = {
  fontFamily: "system-ui",
  fontSize: "10px",
  color: "rgba(255,255,255,0.55)",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "999px",
  padding: "1px 8px",
};
