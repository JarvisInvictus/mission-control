"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type PostType = "Carousel" | "Infograph" | "Reel" | "Story";
type Coach = "Milzzy" | "Miggy";

interface ContentCard {
  id: string;
  title: string;
  description: string;
  postType: PostType;
  coach: Coach;
  column: "ideas" | "created" | "posted";
  createdAt: string;
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
  { id: "ideas", label: "Ideas", color: "#fbbf24" },
  { id: "created", label: "Created", color: "#0abab5" },
  { id: "posted", label: "Posted", color: "#34d399" },
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

// ─── Add/Edit Card Form ───────────────────────────────────────────────────────
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), postType, coach, column: initial?.column ?? "ideas" });
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(10,186,181,0.35)",
      borderRadius: "12px",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 600, color: "#0abab5" }}>{initial ? "✏️ Edit Card" : "+ New Card"}</span>
      </div>
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="Content title..."
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          padding: "8px 12px",
          color: "#fff",
          fontSize: "13px",
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
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "8px",
          padding: "8px 12px",
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
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: "4px" }}>Coach</span>
        {COACHES.map(c => (
          <button
            key={c}
            onClick={() => setCoach(c)}
            style={{
              padding: "4px 10px",
              borderRadius: "8px",
              border: `1px solid ${coach === c ? COACH_COLORS[c] : "rgba(255,255,255,0.12)"}`,
              background: coach === c ? `${COACH_COLORS[c]}18` : "transparent",
              color: coach === c ? COACH_COLORS[c] : "rgba(255,255,255,0.5)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "system-ui",
              fontWeight: coach === c ? 600 : 400,
            }}
          >
            {c === "Milzzy" ? "💪" : "🏃"} {c}
          </button>
        ))}
      </div>
      {/* Post type selector */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {POST_TYPES.map(pt => (
          <button
            key={pt}
            onClick={() => setPostType(pt)}
            style={{
              padding: "4px 10px",
              borderRadius: "8px",
              border: `1px solid ${postType === pt ? "#0abab5" : "rgba(255,255,255,0.12)"}`,
              background: postType === pt ? "rgba(10,186,181,0.15)" : "transparent",
              color: postType === pt ? "#0abab5" : "rgba(255,255,255,0.5)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "system-ui",
            }}
          >
            {POST_EMOJI[pt]} {pt}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        <button onClick={handleSubmit} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "none", background: "#0abab5", color: "#fff", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>
          {initial ? "Save" : "Add"}
        </button>
        <button onClick={onCancel} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui" }}>
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
  const coachColor = COACH_COLORS[card.coach];

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData("text/plain", card.id);
        (e.currentTarget as HTMLDivElement).style.opacity = "0.5";
      }}
      onDragEnd={e => {
        (e.currentTarget as HTMLDivElement).style.opacity = "1";
      }}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: "12px",
        padding: "12px",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px", gap: "6px" }}>
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: `${coachColor}18`, color: coachColor, fontFamily: "system-ui", fontWeight: 600, border: `1px solid ${coachColor}33` }}>
            {card.coach === "Milzzy" ? "💪" : "🏃"} {card.coach}
          </span>
          <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: "rgba(10,186,181,0.15)", color: "#0abab5", fontFamily: "system-ui", fontWeight: 600 }}>
            {POST_EMOJI[card.postType]} {card.postType}
          </span>
        </div>
        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(card); }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "12px", lineHeight: 1, padding: "2px 3px", borderRadius: "4px" }}
            title="Edit"
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#0abab5"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.35)"}
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "2px 3px", borderRadius: "4px" }}
            title="Delete"
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)"}
          >
            ×
          </button>
        </div>
      </div>
      <p style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: "#fff", margin: "0 0 4px", lineHeight: 1.4 }}>{card.title}</p>
      {card.description && (
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>{card.description}</p>
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

  return (
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", padding: "0 2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }} />
          <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{col.label}</span>
        </div>
        <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 700, color: col.color, background: `${col.color}18`, padding: "1px 7px", borderRadius: "20px" }}>{cards.length}</span>
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
          minHeight: "120px",
          background: dragOver ? "rgba(10,186,181,0.08)" : "transparent",
          border: `1px solid ${dragOver ? "rgba(10,186,181,0.35)" : "transparent"}`,
          borderRadius: "12px",
          padding: dragOver ? "10px" : "0",
          transition: "all 0.15s",
        }}
      >
        {cards.map(card => (
          <ContentCardItem key={card.id} card={card} onDelete={onDelete} onEdit={onEdit} />
        ))}
        {cards.length === 0 && !dragOver && (
          <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "20px 0", fontStyle: "italic" }}>
            Drag ideas here
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
    const next = cards.filter(c => c.id !== id);
    setCards(next);
    saveCards(next);
  };

  const handleMove = (cardId: string, toColumn: ContentCard["column"]) => {
    const next = cards.map(c => c.id === cardId ? { ...c, column: toColumn } : c);
    setCards(next);
    saveCards(next);
  };

  const ideasCards = cards.filter(c => c.column === "ideas");
  const createdCards = cards.filter(c => c.column === "created");
  const postedCards = cards.filter(c => c.column === "posted");

  if (loading) {
    return (
      <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "40px" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Add / Edit form */}
      {(showAddForm || editingCard) && (
        <CardForm
          key={editingCard?.id ?? "new"}
          initial={editingCard ?? undefined}
          onSave={editingCard ? handleEdit : handleAdd}
          onCancel={() => { setShowAddForm(false); setEditingCard(null); }}
        />
      )}

      {/* Add button */}
      {!showAddForm && !editingCard && (
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px dashed rgba(255,255,255,0.15)",
            background: "transparent",
            color: "rgba(255,255,255,0.4)",
            fontSize: "13px",
            cursor: "pointer",
            fontFamily: "system-ui",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(10,186,181,0.4)";
            (e.currentTarget as HTMLButtonElement).style.color = "#0abab5";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)";
          }}
        >
          + Add Idea
        </button>
      )}

      {/* Board */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <Column col={COLUMNS[0]} cards={ideasCards} onDelete={handleDelete} onEdit={setEditingCard} onDrop={id => handleMove(id, "ideas")} />
        <Column col={COLUMNS[1]} cards={createdCards} onDelete={handleDelete} onEdit={setEditingCard} onDrop={id => handleMove(id, "created")} />
        <Column col={COLUMNS[2]} cards={postedCards} onDelete={handleDelete} onEdit={setEditingCard} onDrop={id => handleMove(id, "posted")} />
      </div>
    </div>
  );
}