"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PostType = "Carousel" | "Infograph" | "Reel" | "Story";
type Coach = "Milzzy" | "Miggy";
type Priority = "low" | "medium" | "high";

// ─── Interfaces ───────────────────────────────────────────────────────────────
interface ContentCard {
  id: string;
  title: string;
  description: string;
  postType: PostType;
  coach: Coach;
  priority: Priority;
  column: "ideas" | "created" | "posted";
  createdAt: string;
  postedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const POST_TYPES: PostType[] = ["Carousel", "Infograph", "Reel", "Story"];
const COACHES: Coach[] = ["Milzzy", "Miggy"];
const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: "low",    label: "Low",    color: "#34d399" },
  { key: "medium", label: "Med",    color: "#fbbf24" },
  { key: "high",   label: "High",   color: "#f87171" },
];

const POST_EMOJI: Record<PostType, string> = {
  Carousel: "🎠",
  Infograph: "📊",
  Reel: "🎬",
  Story: "📱",
};

const COLUMNS: { id: "ideas" | "created" | "posted"; label: string; color: string }[] = [
  { id: "ideas",  label: "Ideas",   color: "#fbbf24" },
  { id: "created", label: "Created", color: "#0abab5" },
  { id: "posted", label: "Posted",  color: "#34d399" },
];

const COACH_COLORS: Record<Coach, string> = {
  Milzzy: "#0abab5",
  Miggy: "#a855f7",
};

const GLASS_BG = "rgba(255,255,255,0.04)";
const GLASS_BORDER = "rgba(255,255,255,0.09)";
const GLASS_BLUR = "blur(20px)";

// ─── Storage helpers ──────────────────────────────────────────────────────────
async function loadCards(): Promise<ContentCard[]> {
  try {
    const res = await fetch("/api/content");
    if (!res.ok) return [];
    const data = await res.json();
    return data.cards || [];
  } catch {
    return [];
  }
}

async function saveCards(cards: ContentCard[]): Promise<void> {
  try {
    await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards }),
    });
  } catch { /* ignore */ }
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastMsg { id: string; text: string; onUndo?: () => void; }
function Toast({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", display: "flex", flexDirection: "column", gap: "8px", zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "rgba(20,20,30,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(10,186,181,0.3)",
          borderRadius: "12px",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontFamily: "system-ui",
          fontSize: "13px",
          color: "#fff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "slideUp 0.2s ease",
        }}>
          <span>{t.text}</span>
          {t.onUndo && (
            <button onClick={t.onUndo} style={{
              background: "rgba(10,186,181,0.15)",
              border: "1px solid rgba(10,186,181,0.4)",
              borderRadius: "8px",
              color: "#0abab5",
              fontSize: "11px",
              fontFamily: "system-ui",
              fontWeight: 600,
              padding: "4px 10px",
              cursor: "pointer",
            }}>
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Card Form ────────────────────────────────────────────────────────────────
function CardForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ContentCard;
  onSave: (data: Omit<ContentCard, "id" | "createdAt" | "postedAt">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [postType, setPostType] = useState<PostType>(initial?.postType ?? "Reel");
  const [coach, setCoach] = useState<Coach>(initial?.coach ?? "Milzzy");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), postType, coach, priority, column: initial?.column ?? "ideas" });
  };

  return (
    <div style={{
      background: GLASS_BG,
      backdropFilter: GLASS_BLUR,
      WebkitBackdropFilter: GLASS_BLUR,
      border: "1px solid rgba(10,186,181,0.25)",
      borderRadius: "16px",
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: "0 8px 32px rgba(10,186,181,0.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 700, color: "#0abab5", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {initial ? "✏️ Edit Card" : "+ New Content Idea"}
        </span>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "180px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Content title..."
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "system-ui",
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(10,186,181,0.5)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What are you talking about..."
            rows={2}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#fff",
              fontSize: "12px",
              fontFamily: "system-ui",
              outline: "none",
              width: "100%",
              resize: "none",
              boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "rgba(10,186,181,0.5)")}
            onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
          />
        </div>
      </div>

      {/* Selectors row */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Coach */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Coach</span>
          {COACHES.map(c => (
            <button
              key={c}
              onClick={() => setCoach(c)}
              style={{
                padding: "5px 12px",
                borderRadius: "10px",
                border: `1px solid ${coach === c ? COACH_COLORS[c] : "rgba(255,255,255,0.12)"}`,
                background: coach === c ? `${COACH_COLORS[c]}18` : "transparent",
                color: coach === c ? COACH_COLORS[c] : "rgba(255,255,255,0.45)",
                fontSize: "12px",
                cursor: "pointer",
                fontFamily: "system-ui",
                fontWeight: coach === c ? 700 : 400,
                transition: "all 0.15s",
              }}
            >
              {c === "Milzzy" ? "💪" : "🏃"} {c}
            </button>
          ))}
        </div>

        {/* Priority */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Priority</span>
          {PRIORITIES.map(p => (
            <button
              key={p.key}
              onClick={() => setPriority(p.key)}
              style={{
                padding: "5px 10px",
                borderRadius: "10px",
                border: `1px solid ${priority === p.key ? p.color : "rgba(255,255,255,0.12)"}`,
                background: priority === p.key ? `${p.color}18` : "transparent",
                color: priority === p.key ? p.color : "rgba(255,255,255,0.45)",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "system-ui",
                fontWeight: priority === p.key ? 700 : 400,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color, display: "inline-block" }} />
              {p.label}
            </button>
          ))}
        </div>

        {/* Post type */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Type</span>
          <div style={{ display: "flex", gap: "5px" }}>
            {POST_TYPES.map(pt => (
              <button
                key={pt}
                onClick={() => setPostType(pt)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "10px",
                  border: `1px solid ${postType === pt ? "#0abab5" : "rgba(255,255,255,0.12)"}`,
                  background: postType === pt ? "rgba(10,186,181,0.15)" : "transparent",
                  color: postType === pt ? "#0abab5" : "rgba(255,255,255,0.45)",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontFamily: "system-ui",
                  fontWeight: postType === pt ? 700 : 400,
                  transition: "all 0.15s",
                }}
              >
                {POST_EMOJI[pt]} {pt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        <button
          onClick={handleSubmit}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "10px",
            border: "none",
            background: "linear-gradient(135deg, #0abab5, #058f8b)",
            color: "#fff",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "system-ui",
            fontWeight: 700,
            boxShadow: "0 4px 16px rgba(10,186,181,0.3)",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(10,186,181,0.4)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(10,186,181,0.3)"; }}
        >
          {initial ? "Save Changes" : "+ Add Card"}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "transparent",
            color: "rgba(255,255,255,0.45)",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "system-ui",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Content Card ─────────────────────────────────────────────────────────────
function ContentCardItem({
  card,
  onDelete,
  onEdit,
}: {
  card: ContentCard;
  onDelete: (id: string) => void;
  onEdit: (card: ContentCard) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const coachColor = COACH_COLORS[card.coach];
  const priorityData = PRIORITIES.find(p => p.key === card.priority)!;

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("text/plain", card.id);
        (e.currentTarget as HTMLDivElement).style.opacity = "0.4";
        (e.currentTarget as HTMLDivElement).style.transform = "scale(0.97)";
      }}
      onDragEnd={e => {
        (e.currentTarget as HTMLDivElement).style.opacity = "1";
        (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.07)" : GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : GLASS_BORDER}`,
        borderRadius: "14px",
        padding: "14px",
        cursor: "grab",
        userSelect: "none",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)"
          : "0 4px 16px rgba(0,0,0,0.15)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
      }}
    >
      {/* Drag handle (visible on hover) */}
      <div style={{
        position: "absolute",
        left: "6px",
        top: "50%",
        transform: "translateY(-50%)",
        opacity: hovered ? 0.4 : 0,
        transition: "opacity 0.15s",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        cursor: "grab",
      }}>
        <span style={{ fontSize: "10px", color: "#fff", lineHeight: "3px", display: "block" }}>⋮⋮</span>
      </div>

      {/* Top row: priority dot + badges */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", gap: "6px", paddingLeft: "10px" }}>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Priority dot */}
          <span style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: priorityData.color,
            display: "inline-block",
            boxShadow: `0 0 6px ${priorityData.color}`,
          }} title={`${priorityData.label} priority`} />
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: `${coachColor}18`, color: coachColor, fontFamily: "system-ui", fontWeight: 700, border: `1px solid ${coachColor}33`, letterSpacing: "0.02em" }}>
            {card.coach === "Milzzy" ? "💪" : "🏃"} {card.coach}
          </span>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: "rgba(10,186,181,0.12)", color: "#0abab5", fontFamily: "system-ui", fontWeight: 600, border: "1px solid rgba(10,186,181,0.2)" }}>
            {POST_EMOJI[card.postType]} {card.postType}
          </span>
        </div>

        {/* Action buttons — visible on hover */}
        <div style={{
          display: "flex",
          gap: "4px",
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.15s",
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(card); }}
            title="Edit card"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "8px",
              color: "#0abab5",
              cursor: "pointer",
              fontSize: "13px",
              lineHeight: 1,
              padding: "5px 7px",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(10,186,181,0.2)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"}
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            title="Delete card"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "8px",
              color: "#f87171",
              cursor: "pointer",
              fontSize: "15px",
              lineHeight: 1,
              padding: "5px 7px",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.2)"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontFamily: "system-ui",
        fontSize: "14px",
        fontWeight: 700,
        color: "#fff",
        margin: "0 0 5px",
        lineHeight: 1.4,
        paddingLeft: "10px",
      }}>
        {card.title}
      </p>

      {/* Description */}
      {card.description && (
        <p style={{
          fontFamily: "system-ui",
          fontSize: "11px",
          color: "rgba(255,255,255,0.45)",
          margin: 0,
          lineHeight: 1.6,
          paddingLeft: "10px",
        }}>
          {card.description}
        </p>
      )}

      {/* Posted timestamp */}
      {card.postedAt && (
        <div style={{
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingLeft: "10px",
        }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(52,211,153,0.7)", fontStyle: "italic" }}>
            ✓ Posted {new Date(card.postedAt).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" })}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────
function Column({
  col,
  cards,
  coachFilter,
  postTypeFilter,
  onDelete,
  onEdit,
  onDrop,
}: {
  col: (typeof COLUMNS)[number];
  cards: ContentCard[];
  coachFilter: Coach | "all";
  postTypeFilter: PostType | "all";
  onDelete: (id: string) => void;
  onEdit: (card: ContentCard) => void;
  onDrop: (cardId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const filtered = cards.filter(c => {
    if (coachFilter !== "all" && c.coach !== coachFilter) return false;
    if (postTypeFilter !== "all" && c.postType !== postTypeFilter) return false;
    return true;
  });

  const milzzyCount = filtered.filter(c => c.coach === "Milzzy").length;
  const miggyCount = filtered.filter(c => c.coach === "Miggy").length;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Column header */}
      <div style={{
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "14px 16px",
        marginBottom: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: `radial-gradient(circle, ${col.color}, ${col.color}80)`, boxShadow: `0 0 8px ${col.color}60` }} />
            <span style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{col.label}</span>
          </div>
          <span style={{
            fontFamily: "system-ui",
            fontSize: "13px",
            fontWeight: 800,
            color: col.color,
            background: `${col.color}18`,
            padding: "2px 10px",
            borderRadius: "20px",
            border: `1px solid ${col.color}33`,
          }}>
            {filtered.length}
          </span>
        </div>
        {/* Coach breakdown */}
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "#0abab5", background: "rgba(10,186,181,0.1)", padding: "2px 7px", borderRadius: "20px", border: "1px solid rgba(10,186,181,0.15)" }}>
            💪 {milzzyCount}
          </span>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "#a855f7", background: "rgba(168,85,247,0.1)", padding: "2px 7px", borderRadius: "20px", border: "1px solid rgba(168,85,247,0.15)" }}>
            🏃 {miggyCount}
          </span>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          const id = e.dataTransfer.getData("text/plain");
          if (id) onDrop(id);
        }}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minHeight: "200px",
          background: dragOver ? "rgba(10,186,181,0.06)" : "transparent",
          border: `2px dashed ${dragOver ? "rgba(10,186,181,0.4)" : "transparent"}`,
          borderRadius: "16px",
          padding: dragOver ? "12px" : "0",
          transition: "all 0.2s ease",
        }}
      >
        {filtered.map(card => (
          <ContentCardItem key={card.id} card={card} onDelete={onDelete} onEdit={onEdit} />
        ))}
        {filtered.length === 0 && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 16px",
            gap: "8px",
            opacity: 0.4,
          }}>
            <span style={{ fontSize: "28px" }}>✨</span>
            <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.35)", textAlign: "center", fontStyle: "italic" }}>
              {dragOver ? "Drop here" : "No ideas yet"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Content Tab ─────────────────────────────────────────────────────────
export function ContentTab() {
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<ContentCard | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [search, setSearch] = useState("");
  const [coachFilter, setCoachFilter] = useState<Coach | "all">("all");
  const [postTypeFilter, setPostTypeFilter] = useState<PostType | "all">("all");
  const deletedRef = useRef<{ card: ContentCard; timeout: ReturnType<typeof setTimeout> } | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setShowAddForm(true); setEditingCard(null); }
      if (e.key === "Escape") { setShowAddForm(false); setEditingCard(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    loadCards().then(c => { setCards(c); setLoading(false); });
  }, []);

  const showToast = (text: string, onUndo?: () => void) => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, text, onUndo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleAdd = (data: Omit<ContentCard, "id" | "createdAt" | "postedAt">) => {
    const card: ContentCard = {
      ...data,
      id: `content_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [...cards, card];
    setCards(next);
    saveCards(next);
    setShowAddForm(false);
  };

  const handleEdit = (data: Omit<ContentCard, "id" | "createdAt" | "postedAt">) => {
    if (!editingCard) return;
    const next = cards.map(c => c.id === editingCard.id ? { ...c, ...data } : c);
    setCards(next);
    saveCards(next);
    setEditingCard(null);
  };

  const handleDelete = (id: string) => {
    const card = cards.find(c => c.id === id);
    const next = cards.filter(c => c.id !== id);
    setCards(next);
    saveCards(next);
    if (card) {
      if (deletedRef.current) clearTimeout(deletedRef.current.timeout);
      const timeout = setTimeout(() => saveCards(next), 5000);
      deletedRef.current = { card, timeout };
      showToast(`"${card.title.slice(0, 30)}" deleted`, () => {
        if (deletedRef.current) {
          clearTimeout(deletedRef.current.timeout);
          const restored = [...cards, deletedRef.current.card];
          setCards(restored);
          saveCards(restored);
          deletedRef.current = null;
        }
      });
    }
  };

  const handleMove = (cardId: string, toColumn: ContentCard["column"]) => {
    const updated = cards.map(c => {
      if (c.id !== cardId) return c;
      const updates: Partial<ContentCard> = { column: toColumn };
      if (toColumn === "posted" && !c.postedAt) updates.postedAt = new Date().toISOString();
      if (toColumn !== "posted") updates.postedAt = undefined;
      return { ...c, ...updates };
    });
    setCards(updated);
    saveCards(updated);
  };

  const ideasCards = cards.filter(c => c.column === "ideas");
  const createdCards = cards.filter(c => c.column === "created");
  const postedCards = cards.filter(c => c.column === "posted");

  const searchLower = search.toLowerCase();
  const filteredIdeas = ideasCards.filter(c =>
    (!search || c.title.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower)) &&
    (coachFilter === "all" || c.coach === coachFilter) &&
    (postTypeFilter === "all" || c.postType === postTypeFilter)
  );
  const filteredCreated = createdCards.filter(c =>
    (!search || c.title.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower)) &&
    (coachFilter === "all" || c.coach === coachFilter) &&
    (postTypeFilter === "all" || c.postType === postTypeFilter)
  );
  const filteredPosted = postedCards.filter(c =>
    (!search || c.title.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower)) &&
    (coachFilter === "all" || c.coach === coachFilter) &&
    (postTypeFilter === "all" || c.postType === postTypeFilter)
  );

  if (loading) {
    return (
      <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "60px" }}>
        Loading content ideas...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Toast notifications */}
      <Toast toasts={toasts} />

      {/* Add/Edit form */}
      {(showAddForm || editingCard) && (
        <CardForm
          key={editingCard?.id ?? "new"}
          initial={editingCard ?? undefined}
          onSave={editingCard ? handleEdit : handleAdd}
          onCancel={() => { setShowAddForm(false); setEditingCard(null); }}
        />
      )}

      {/* Filter bar */}
      <div style={{
        background: GLASS_BG,
        backdropFilter: GLASS_BLUR,
        WebkitBackdropFilter: GLASS_BLUR,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "12px 16px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ideas..."
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            padding: "8px 14px",
            color: "#fff",
            fontSize: "13px",
            fontFamily: "system-ui",
            outline: "none",
            minWidth: "160px",
            flex: 1,
          }}
          onFocus={e => (e.target.style.borderColor = "rgba(10,186,181,0.4)")}
          onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
        />

        {/* Coach filter */}
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Coach</span>
          {(["all", "Milzzy", "Miggy"] as const).map(c => (
            <button
              key={c}
              onClick={() => setCoachFilter(c)}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: `1px solid ${coachFilter === c ? (c === "all" ? "#fff" : COACH_COLORS[c as Coach]) : "rgba(255,255,255,0.12)"}`,
                background: coachFilter === c ? (c === "all" ? "rgba(255,255,255,0.1)" : `${COACH_COLORS[c as Coach]}18`) : "transparent",
                color: coachFilter === c ? (c === "all" ? "#fff" : COACH_COLORS[c as Coach]) : "rgba(255,255,255,0.45)",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "system-ui",
                fontWeight: coachFilter === c ? 700 : 400,
              }}
            >
              {c === "all" ? "All" : c === "Milzzy" ? "💪 Milzzy" : "🏃 Miggy"}
            </button>
          ))}
        </div>

        {/* Post type filter */}
        <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Type</span>
          {(["all", ...POST_TYPES] as const).map(pt => (
            <button
              key={pt}
              onClick={() => setPostTypeFilter(pt === "all" ? "all" : pt)}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: `1px solid ${postTypeFilter === pt ? "#0abab5" : "rgba(255,255,255,0.12)"}`,
                background: postTypeFilter === pt ? "rgba(10,186,181,0.15)" : "transparent",
                color: postTypeFilter === pt ? "#0abab5" : "rgba(255,255,255,0.45)",
                fontSize: "11px",
                cursor: "pointer",
                fontFamily: "system-ui",
                fontWeight: postTypeFilter === pt ? 700 : 400,
              }}
            >
              {pt === "all" ? "All" : `${POST_EMOJI[pt]} ${pt}`}
            </button>
          ))}
        </div>

        {/* Add button */}
        {!showAddForm && !editingCard && (
          <button
            onClick={() => { setShowAddForm(true); setEditingCard(null); }}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #0abab5, #058f8b)",
              color: "#fff",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "system-ui",
              fontWeight: 700,
              boxShadow: "0 4px 16px rgba(10,186,181,0.25)",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              marginLeft: "auto",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 20px rgba(10,186,181,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(10,186,181,0.25)"; }}
          >
            + Add Idea
          </button>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
        Press <kbd style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", padding: "1px 5px" }}>N</kbd> to add · <kbd style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", padding: "1px 5px" }}>Esc</kbd> to close
      </div>

      {/* Board */}
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <Column col={COLUMNS[0]} cards={ideasCards} coachFilter={coachFilter} postTypeFilter={postTypeFilter} onDelete={handleDelete} onEdit={c => { setEditingCard(c); setShowAddForm(false); }} onDrop={id => handleMove(id, "ideas")} />
        <Column col={COLUMNS[1]} cards={createdCards} coachFilter={coachFilter} postTypeFilter={postTypeFilter} onDelete={handleDelete} onEdit={c => { setEditingCard(c); setShowAddForm(false); }} onDrop={id => handleMove(id, "created")} />
        <Column col={COLUMNS[2]} cards={postedCards} coachFilter={coachFilter} postTypeFilter={postTypeFilter} onDelete={handleDelete} onEdit={c => { setEditingCard(c); setShowAddForm(false); }} onDrop={id => handleMove(id, "posted")} />
      </div>
    </div>
  );
}