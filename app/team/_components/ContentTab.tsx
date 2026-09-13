"use client";

import { useEffect, useRef, useState } from "react";
import type { TabMeta } from "../page";

type ContentStatus = "idea" | "progress" | "scheduled" | "posted";
type ContentOwner = "Milzzy" | "Miggy" | "Sonta" | "Shared";

interface ContentItem {
  id: string;
  title: string;
  notes: string;
  status: ContentStatus;
  owner: ContentOwner;
  tags: string[];
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS: { key: ContentStatus; label: string; tint: string; tintBorder: string }[] = [
  { key: "idea", label: "Ideas", tint: "rgba(168,85,247,0.10)", tintBorder: "rgba(168,85,247,0.30)" },
  { key: "progress", label: "In Progress", tint: "rgba(245,158,11,0.10)", tintBorder: "rgba(245,158,11,0.30)" },
  { key: "scheduled", label: "Scheduled", tint: "rgba(59,130,246,0.10)", tintBorder: "rgba(59,130,246,0.30)" },
  { key: "posted", label: "Posted", tint: "rgba(52,211,153,0.10)", tintBorder: "rgba(52,211,153,0.30)" },
];

const OWNERS: ContentOwner[] = ["Milzzy", "Miggy", "Sonta", "Shared"];

export function ContentTab({ onMeta }: { onMeta?: (m: TabMeta | null) => void } = {}) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ title: string; notes: string; owner: ContentOwner; status: ContentStatus; scheduledFor: string }>({
    title: "",
    notes: "",
    owner: "Shared",
    status: "idea",
    scheduledFor: "",
  });
  const [ownerFilter, setOwnerFilter] = useState<ContentOwner | "All">("All");

  // Drag-and-drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ContentStatus | null>(null);

  useEffect(() => {
    fetch("/api/team/content")
      .then((r) => r.json())
      .then((d) => {
        const list: ContentItem[] = d.items || [];
        setItems(list);
        if (list.length > 0) {
          const latest = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
          if (onMeta) onMeta({ updatedAt: latest.updatedAt, updatedBy: "Team" });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // Empty deps: load once on mount. Including `onMeta` ref would cause parent
    // re-renders (clock tick, tab switches) to re-fire this effect and overwrite
    // local state with stale server data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-report on local changes (after a save / drag-move)
  useEffect(() => {
    if (!onMeta || items.length === 0) return;
    const latest = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    onMeta({ updatedAt: latest.updatedAt, updatedBy: "Team" });
  }, [items, onMeta]);

  async function add() {
    const title = draft.title.trim();
    if (!title) return;
    const res = await fetch("/api/team/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        notes: draft.notes,
        owner: draft.owner,
        status: draft.status,
        scheduledFor: draft.scheduledFor || null,
      }),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) => [data.item, ...prev]);
      setDraft({ title: "", notes: "", owner: "Shared", status: "idea", scheduledFor: "" });
      setAdding(false);
    }
  }

  async function moveStatus(item: ContentItem, status: ContentStatus) {
    if (item.status === status) return;
    // Optimistic update
    setItems((prev) => prev.map((c) => (c.id === item.id ? { ...c, status } : c)));
    await fetch(`/api/team/content/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/team/content/${id}`, { method: "DELETE" });
  }

  const filtered = ownerFilter === "All" ? items : items.filter((c) => c.owner === ownerFilter);

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
            background: "rgba(10,186,181,0.18)",
            border: "1px solid rgba(10,186,181,0.35)",
            borderRadius: "10px",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          {adding ? "Cancel" : "+ New Content"}
        </button>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {(["All", ...OWNERS] as const).map((o) => {
            const active = ownerFilter === o;
            return (
              <button
                key={o}
                onClick={() => setOwnerFilter(o)}
                style={{
                  fontFamily: "system-ui",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: active ? "#0abab5" : "rgba(255,255,255,0.50)",
                  background: active ? "rgba(10,186,181,0.12)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(10,186,181,0.30)" : "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "999px",
                  padding: "5px 12px",
                  cursor: "pointer",
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          {filtered.length} item{filtered.length !== 1 ? "s" : ""} · drag cards to move
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(10,186,181,0.25)",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <input
            autoFocus
            placeholder="Title / topic"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            style={inputStyle}
          />
          <textarea
            placeholder="Notes (optional)"
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            rows={2}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui" }}
          />
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as ContentStatus })}
              style={inputStyle}
            >
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key} style={{ background: "#0a0e1a" }}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              value={draft.owner}
              onChange={(e) => setDraft({ ...draft, owner: e.target.value as ContentOwner })}
              style={inputStyle}
            >
              {OWNERS.map((o) => (
                <option key={o} value={o} style={{ background: "#0a0e1a" }}>
                  {o}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={draft.scheduledFor}
              onChange={(e) => setDraft({ ...draft, scheduledFor: e.target.value })}
              style={inputStyle}
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
              background: draft.title.trim() ? "#0abab5" : "rgba(10,186,181,0.30)",
              border: "none",
              borderRadius: "10px",
              padding: "8px 18px",
              cursor: draft.title.trim() ? "pointer" : "not-allowed",
            }}
          >
            Save
          </button>
        </div>
      )}

      {/* Kanban columns */}
      {loading ? (
        <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "32px" }}>
          Loading…
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {COLUMNS.map((col) => {
            const colItems = filtered.filter((c) => c.status === col.key);
            const isOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverCol !== col.key) setDragOverCol(col.key);
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the column container entirely (not entering a child)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    if (dragOverCol === col.key) setDragOverCol(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || draggingId;
                  setDragOverCol(null);
                  setDraggingId(null);
                  if (!id) return;
                  const item = items.find((c) => c.id === id);
                  if (item && item.status !== col.key) moveStatus(item, col.key);
                }}
                style={{
                  background: isOver ? `${col.tint.replace("0.10", "0.22")}` : col.tint,
                  border: isOver ? `1px dashed ${col.tintBorder}` : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  padding: "12px",
                  minHeight: "200px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  transition: "background 0.12s, border 0.12s",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 2px" }}>
                  <p
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.75)",
                      textTransform: "uppercase",
                      letterSpacing: "0.10em",
                      margin: 0,
                    }}
                  >
                    {col.label}
                  </p>
                  <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>
                    {colItems.length}
                  </span>
                </div>
                {colItems.length === 0 && (
                  <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                    {isOver ? "Drop here" : "Nothing here yet"}
                  </p>
                )}
                {colItems.map((c) => (
                  <ContentCard
                    key={c.id}
                    item={c}
                    isDragging={draggingId === c.id}
                    onDragStart={() => setDraggingId(c.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                    onMove={moveStatus}
                    onDelete={deleteItem}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ContentCard({
  item,
  isDragging,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
}: {
  item: ContentItem;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (item: ContentItem, status: ContentStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "12px",
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        cursor: "grab",
        opacity: isDragging ? 0.35 : 1,
        transform: isDragging ? "rotate(-1deg) scale(0.98)" : "none",
        transition: "opacity 0.12s, transform 0.12s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <p
          style={{
            fontFamily: "system-ui",
            fontSize: "13px",
            fontWeight: 600,
            color: "rgba(255,255,255,0.95)",
            margin: 0,
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {item.title}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          title="Delete"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.30)",
            cursor: "pointer",
            fontSize: "14px",
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      {item.notes && (
        <p
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{
            fontFamily: "system-ui",
            fontSize: "11px",
            color: "rgba(255,255,255,0.55)",
            margin: 0,
            lineHeight: 1.4,
            cursor: "pointer",
            maxHeight: expanded ? "none" : "32px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: expanded ? "unset" : 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.notes}
        </p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          <OwnerPill owner={item.owner} />
          {item.scheduledFor && (
            <span style={pillMuted}>
              {new Date(item.scheduledFor).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <select
          value={item.status}
          onChange={(e) => onMove(item, e.target.value as ContentStatus)}
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
          title="Change status (or drag the card)"
        >
          {COLUMNS.map((c) => (
            <option key={c.key} value={c.key} style={{ background: "#0a0e1a" }}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

const OWNER_COLORS: Record<ContentOwner, string> = {
  Milzzy: "#0abab5",
  Miggy: "#3b82f6",
  Sonta: "#a855f7",
  Shared: "#94a3b8",
};

function OwnerPill({ owner }: { owner: ContentOwner }) {
  const c = OWNER_COLORS[owner];
  return (
    <span
      style={{
        fontFamily: "system-ui",
        fontSize: "10px",
        fontWeight: 600,
        color: c,
        background: `${c}22`,
        border: `1px solid ${c}44`,
        borderRadius: "999px",
        padding: "1px 8px",
      }}
    >
      {owner}
    </span>
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
  minWidth: "100px",
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
