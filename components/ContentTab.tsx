"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type PostType = "Carousel" | "Infograph" | "Reel" | "Story";

interface ContentCard {
  id: string;
  title: string;
  description: string;
  postType: PostType;
  column: "ideas" | "created" | "posted";
  createdAt: string;
}

const POST_TYPES: PostType[] = ["Carousel", "Infograph", "Reel", "Story"];

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

// ─── Helpers ────────────────────────────────────────────────────────────────
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
  await fetch("/api/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cards }),
  });
}

// ─── Add Card Form ──────────────────────────────────────────────────────────
function AddCardForm({ onAdd }: { onAdd: (c: ContentCard) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [postType, setPostType] = useState<PostType>("Reel");
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (show) inputRef.current?.focus();
  }, [show]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      id: `content_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      postType,
      column: "ideas",
      createdAt: new Date().toISOString(),
    });
    setTitle("");
    setDescription("");
    setPostType("Reel");
    setShow(false);
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
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
      >
        + Add Idea
      </button>
    );
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(10,186,181,0.3)",
      borderRadius: "12px",
      padding: "14px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    }}>
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
        }}
      />
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
        <button onClick={handleSubmit} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "none", background: "#0abab5", color: "#fff", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>Add</button>
        <button onClick={() => { setShow(false); setTitle(""); setDescription(""); }} style={{ flex: 1, padding: "7px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Content Card ────────────────────────────────────────────────────────────
function ContentCardItem({
  card,
  onDelete,
}: {
  card: ContentCard;
  onDelete: (id: string) => void;
}) {
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
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(10,186,181,0.15)", color: "#0abab5", fontFamily: "system-ui", fontWeight: 600 }}>
          {POST_EMOJI[card.postType]} {card.postType}
        </span>
        <button
          onClick={() => onDelete(card.id)}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "14px", lineHeight: 1, padding: "0 2px" }}
          title="Delete"
        >
          ×
        </button>
      </div>
      <p style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: "#fff", margin: "0 0 4px", lineHeight: 1.4 }}>{card.title}</p>
      {card.description && (
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5 }}>{card.description}</p>
      )}
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────
function Column({
  col,
  cards,
  onDelete,
  onDrop,
}: {
  col: (typeof COLUMNS)[number];
  cards: ContentCard[];
  onDelete: (id: string) => void;
  onDrop: (cardId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
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
          <ContentCardItem key={card.id} card={card} onDelete={onDelete} />
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

// ─── Main Content Tab ────────────────────────────────────────────────────────
export function ContentTab() {
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards().then(c => { setCards(c); setLoading(false); });
  }, []);

  const handleAdd = (card: ContentCard) => {
    const next = [...cards, card];
    setCards(next);
    saveCards(next);
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
      {/* Header + Add Form */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <AddCardForm onAdd={handleAdd} />
        </div>
      </div>

      {/* Board */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <Column col={COLUMNS[0]} cards={ideasCards} onDelete={handleDelete} onDrop={id => handleMove(id, "ideas")} />
        <Column col={COLUMNS[1]} cards={createdCards} onDelete={handleDelete} onDrop={id => handleMove(id, "created")} />
        <Column col={COLUMNS[2]} cards={postedCards} onDelete={handleDelete} onDrop={id => handleMove(id, "posted")} />
      </div>
    </div>
  );
}