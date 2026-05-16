"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PostType = "Carousel" | "Infograph" | "Reel" | "Story";
type Coach = "Milzzy" | "Miggy";

interface ContentCard {
  id: string;
  title: string;
  description: string;
  postType: PostType;
  coach: Coach;
  priority: string;
  column: "ideas" | "created" | "posted";
  createdAt: string;
  postedAt?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const POST_TYPES: PostType[] = ["Carousel", "Infograph", "Reel", "Story"];
const COACHES: Coach[] = ["Milzzy", "Miggy"];

const POST_EMOJI: Record<PostType, string> = {
  Carousel: "🎠",
  Infograph: "📊",
  Reel: "🎬",
  Story: "📱",
};

const COLUMNS: { id: "ideas" | "created" | "posted"; label: string; color: string }[] = [
  { id: "ideas",   label: "Ideas",   color: "#fbbf24" },
  { id: "created", label: "Created", color: "#0abab5" },
  { id: "posted",  label: "Posted",  color: "#34d399" },
];

const COACH_COLORS: Record<Coach, string> = {
  Milzzy: "#0abab5",
  Miggy: "#a855f7",
};

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

// ─── Add/Edit Form ─────────────────────────────────────────────────────────────
function CardForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: ContentCard;
  onSave: (data: Omit<ContentCard, "id" | "createdAt">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [postType, setPostType] = useState<PostType>(initial?.postType ?? "Reel");
  const [coach, setCoach] = useState<Coach>(initial?.coach ?? "Milzzy");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      postType,
      coach,
      priority: "medium",
      column: initial?.column ?? "ideas",
    });
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(10,186,181,0.25)",
      borderRadius: "16px",
      padding: "18px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 700, color: "#0abab5", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {initial ? "Edit Card" : "+ New Content Idea"}
        </span>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button>
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="Content title..."
        autoFocus
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
        }}
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
        }}
      />

      {/* Coach selector */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
            }}
          >
            {c === "Milzzy" ? "💪" : "🏃"} {c}
          </button>
        ))}
      </div>

      {/* Post type pills */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Type</span>
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
            }}
          >
            {POST_EMOJI[pt]} {pt}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
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
          }}
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

// ─── Content Card Item ─────────────────────────────────────────────────────────
function ContentCardItem({
  card,
  onDelete,
  onEdit,
  dragHandle,
}: {
  card: ContentCard;
  onDelete: (id: string) => void;
  onEdit: (card: ContentCard) => void;
  dragHandle: string;
}) {
  const [hovered, setHovered] = useState(false);
  const coachColor = COACH_COLORS[card.coach];

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("text/plain", card.id);
        (e.currentTarget as HTMLDivElement).style.opacity = "0.4";
      }}
      onDragEnd={e => {
        (e.currentTarget as HTMLDivElement).style.opacity = "1";
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${hovered ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: "14px",
        padding: "12px",
        cursor: "grab",
        userSelect: "none",
        transition: "all 0.15s",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.25)" : "none",
      }}
    >
      {/* Top row: badges + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", gap: "4px" }}>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: `${coachColor}18`, color: coachColor, fontFamily: "system-ui", fontWeight: 700, border: `1px solid ${coachColor}33` }}>
            {card.coach === "Milzzy" ? "💪" : "🏃"} {card.coach}
          </span>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: "rgba(10,186,181,0.12)", color: "#0abab5", fontFamily: "system-ui", fontWeight: 600, border: "1px solid rgba(10,186,181,0.2)" }}>
            {POST_EMOJI[card.postType]} {card.postType}
          </span>
        </div>
        <div style={{ display: "flex", gap: "3px", opacity: hovered ? 1 : 0, transition: "opacity 0.15s" }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(card); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", color: "#0abab5", cursor: "pointer", fontSize: "12px", padding: "4px 6px" }}>✏️</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", color: "#f87171", cursor: "pointer", fontSize: "12px", padding: "4px 6px" }}>🗑</button>
        </div>
      </div>

      {/* Drag handle hint */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", lineHeight: 1.5, marginTop: "2px" }}>⋮⋮</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 700, color: "#fff", margin: "0 0 4px", lineHeight: 1.4 }}>{card.title}</p>
          {card.description && <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>{card.description}</p>}
        </div>
      </div>

      {/* Posted timestamp */}
      {card.postedAt && (
        <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(52,211,153,0.6)", margin: "6px 0 0", fontStyle: "italic" }}>
          ✓ Posted {new Date(card.postedAt).toLocaleDateString("en-AU", { timeZone: "Australia/Melbourne", day: "numeric", month: "short" })}
        </p>
      )}
    </div>
  );
}

// ─── Column ────────────────────────────────────────────────────────────────────
function Column({
  col,
  cards,
  onDelete,
  onEdit,
  onDrop,
}: {
  col: (typeof COLUMNS)[number];
  cards: ContentCard[];
  onDelete: (id: string) => void;
  onEdit: (card: ContentCard) => void;
  onDrop: (cardId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  const milzzyCount = cards.filter(c => c.coach === "Milzzy").length;
  const miggyCount = cards.filter(c => c.coach === "Miggy").length;

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Column header */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px",
        padding: "12px 16px",
        marginBottom: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color, boxShadow: `0 0 6px ${col.color}60` }} />
            <span style={{ fontFamily: "system-ui", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{col.label}</span>
          </div>
          <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 800, color: col.color, background: `${col.color}18`, padding: "2px 10px", borderRadius: "20px", border: `1px solid ${col.color}33` }}>
            {cards.length}
          </span>
        </div>
        {/* Coach breakdown */}
        <div style={{ display: "flex", gap: "6px" }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "#0abab5", background: "rgba(10,186,181,0.1)", padding: "2px 7px", borderRadius: "20px", border: "1px solid rgba(10,186,181,0.15)" }}>💪 {milzzyCount}</span>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "#a855f7", background: "rgba(168,85,247,0.1)", padding: "2px 7px", borderRadius: "20px", border: "1px solid rgba(168,85,247,0.15)" }}>🏃 {miggyCount}</span>
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
          padding: dragOver ? "8px" : "0",
          transition: "all 0.2s ease",
        }}
      >
        {cards.map(card => (
          <ContentCardItem key={card.id} card={card} onDelete={onDelete} onEdit={onEdit} dragHandle="" />
        ))}
        {cards.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: "8px", opacity: 0.4 }}>
            <span style={{ fontSize: "24px" }}>✨</span>
            <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.35)", textAlign: "center", fontStyle: "italic" }}>
              {dragOver ? "Drop here" : "No cards yet"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export function ContentTab() {
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<ContentCard | null>(null);
  const [search, setSearch] = useState("");
  const [coachFilter, setCoachFilter] = useState<"all" | Coach>("all");
  const [postTypeFilter, setPostTypeFilter] = useState<PostType | "all">("all");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadCards().then(c => { setCards(c); setLoading(false); });
  }, []);

  const handleAdd = (data: Omit<ContentCard, "id" | "createdAt">) => {
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

  const handleEdit = (data: Omit<ContentCard, "id" | "createdAt">) => {
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
      setToast(`"${card.title.slice(0, 25)}" deleted`);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleMove = (cardId: string, toColumn: ContentCard["column"]) => {
    const updated = cards.map(c => {
      if (c.id !== cardId) return c;
      const updates: Partial<ContentCard> = { column: toColumn };
      if (toColumn === "posted" && !c.postedAt) updates.postedAt = new Date().toISOString();
      return { ...c, ...updates };
    });
    setCards(updated);
    saveCards(updated);
  };

  const filteredCards = (colCards: ContentCard[]) =>
    colCards.filter(c => {
      if (coachFilter !== "all" && c.coach !== coachFilter) return false;
      if (postTypeFilter !== "all" && c.postType !== postTypeFilter) return false;
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  if (loading) return <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "60px" }}>Loading content ideas...</div>;

  const ideasCards = filteredCards(cards.filter(c => c.column === "ideas"));
  const createdCards = filteredCards(cards.filter(c => c.column === "created"));
  const postedCards = filteredCards(cards.filter(c => c.column === "posted"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
        background: "rgba(255,255,255,0.04)",
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
            minWidth: "140px",
            flex: 1,
          }}
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
              {c === "all" ? "All" : c === "Milzzy" ? "💪" : "🏃"} {c === "all" ? "" : c}
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
              {pt === "all" ? "All" : `${POST_EMOJI[pt as PostType]} ${pt}`}
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
              marginLeft: "auto",
            }}
          >
            + Add Idea
          </button>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "rgba(20,20,30,0.95)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(10,186,181,0.3)",
          borderRadius: "12px",
          padding: "12px 18px",
          fontFamily: "system-ui",
          fontSize: "13px",
          color: "#fff",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 9999,
          animation: "slideUp 0.2s ease",
        }}>
          {toast}
        </div>
      )}

      {/* Board */}
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <Column col={COLUMNS[0]} cards={ideasCards} onDelete={handleDelete} onEdit={c => { setEditingCard(c); setShowAddForm(false); }} onDrop={id => handleMove(id, "ideas")} />
        <Column col={COLUMNS[1]} cards={createdCards} onDelete={handleDelete} onEdit={c => { setEditingCard(c); setShowAddForm(false); }} onDrop={id => handleMove(id, "created")} />
        <Column col={COLUMNS[2]} cards={postedCards} onDelete={handleDelete} onEdit={c => { setEditingCard(c); setShowAddForm(false); }} onDrop={id => handleMove(id, "posted")} />
      </div>
    </div>
  );
}