"use client";

import { useEffect, useState } from "react";

type EpisodeStatus = "idea" | "planned" | "recorded" | "published";

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
  createdAt: string;
  updatedAt: string;
}

const STATUSES: { key: EpisodeStatus; label: string; tint: string; border: string }[] = [
  { key: "idea", label: "Ideas", tint: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.35)" },
  { key: "planned", label: "Planned", tint: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.35)" },
  { key: "recorded", label: "Recorded", tint: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.35)" },
  { key: "published", label: "Published", tint: "rgba(52,211,153,0.15)", border: "rgba(52,211,153,0.35)" },
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
};

export function PodcastTab() {
  const [items, setItems] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY);

  useEffect(() => {
    fetch("/api/team/podcast")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function add() {
    if (!draft.title.trim()) return;
    const res = await fetch("/api/team/podcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) => [data.item, ...prev]);
      setDraft(EMPTY);
      setAdding(false);
    }
  }

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
          onClick={() => setAdding((v) => !v)}
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
          🎙 {adding ? "Cancel" : "Plan Episode"}
        </button>
        <div style={{ marginLeft: "auto", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          {items.length} episode{items.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(168,85,247,0.25)",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              placeholder="Episode #"
              type="number"
              value={draft.number ?? ""}
              onChange={(e) => setDraft({ ...draft, number: e.target.value ? parseInt(e.target.value, 10) : null })}
              style={{ ...inputStyle, maxWidth: "100px" }}
            />
            <input
              autoFocus
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
            rows={3}
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
          <button
            onClick={add}
            disabled={!draft.title.trim()}
            style={{
              alignSelf: "flex-start",
              fontFamily: "system-ui",
              fontSize: "12px",
              fontWeight: 600,
              color: "rgba(10,14,26,0.95)",
              background: draft.title.trim() ? "#a855f7" : "rgba(168,85,247,0.30)",
              border: "none",
              borderRadius: "10px",
              padding: "8px 18px",
              cursor: draft.title.trim() ? "pointer" : "not-allowed",
            }}
          >
            Save Episode
          </button>
        </div>
      )}

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
                      <EpisodeCard key={ep.id} ep={ep} onStatusChange={updateStatus} onDelete={deleteItem} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EpisodeCard({
  ep,
  onStatusChange,
  onDelete,
}: {
  ep: Episode;
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
          onClick={() => onDelete(ep.id)}
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
        <select
          value={ep.status}
          onChange={(e) => onStatusChange(ep, e.target.value as EpisodeStatus)}
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
  );
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
