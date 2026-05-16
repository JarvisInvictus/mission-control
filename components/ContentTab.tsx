"use client";

import { useState, useEffect } from "react";

interface ContentCard {
  id: string;
  title: string;
  description: string;
  postType: string;
  coach: string;
  column: string;
  createdAt: string;
}

const POST_EMOJI: Record<string, string> = {
  Carousel: "🎠",
  Infograph: "📊",
  Reel: "🎬",
  Story: "📱",
};

const COACH_COLORS: Record<string, string> = {
  Milzzy: "#0abab5",
  Miggy: "#a855f7",
};

const COLUMNS = [
  { id: "ideas",  label: "Ideas",   color: "#fbbf24" },
  { id: "created", label: "Created", color: "#0abab5" },
  { id: "posted", label: "Posted",  color: "#34d399" },
];

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

export function ContentTab() {
  const [cards, setCards] = useState<ContentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [postType, setPostType] = useState("Reel");
  const [coach, setCoach] = useState("Milzzy");
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    loadCards().then(c => { setCards(c); setLoading(false); });
  }, []);

  const handleAdd = () => {
    if (!title.trim()) return;
    const card: ContentCard = {
      id: `content_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      postType,
      coach,
      column: "ideas",
      createdAt: new Date().toISOString(),
    };
    const next = [...cards, card];
    setCards(next);
    saveCards(next);
    setTitle("");
    setDescription("");
    setPostType("Reel");
    setCoach("Milzzy");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    saveCards(cards.filter(c => c.id !== id));
  };

  const handleDragStart = (id: string) => setDragId(id);

  const handleDrop = (col: string) => {
    if (!dragId) return;
    const updated = cards.map(c => c.id === dragId ? { ...c, column: col } : c);
    setCards(updated);
    saveCards(updated);
    setDragId(null);
  };

  if (loading) return <div style={{ color: "rgba(255,255,255,0.4)", fontFamily: "system-ui", fontSize: "13px", textAlign: "center", padding: "40px" }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Add button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #0abab5, #058f8b)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "system-ui",
              boxShadow: "0 4px 16px rgba(10,186,181,0.3)",
            }}
          >
            + Add Idea
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(10,186,181,0.25)",
          borderRadius: "16px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}>
          <p style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 700, color: "#0abab5", margin: 0 }}>+ New Content Idea</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "14px", fontFamily: "system-ui", outline: "none",
          }} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px", padding: "10px 14px", color: "#fff", fontSize: "12px", fontFamily: "system-ui", outline: "none", resize: "none",
          }} />
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select value={coach} onChange={e => setCoach(e.target.value)} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px", padding: "8px 12px", color: COACH_COLORS[coach], fontSize: "12px", fontFamily: "system-ui", cursor: "pointer",
            }}>
              <option value="Milzzy">💪 Milzzy</option>
              <option value="Miggy">🏃 Miggy</option>
            </select>
            <select value={postType} onChange={e => setPostType(e.target.value)} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px", padding: "8px 12px", color: "#fff", fontSize: "12px", fontFamily: "system-ui", cursor: "pointer",
            }}>
              <option value="Carousel">🎠 Carousel</option>
              <option value="Infograph">📊 Infograph</option>
              <option value="Reel">🎬 Reel</option>
              <option value="Story">📱 Story</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleAdd} style={{
              flex: 1, padding: "10px", borderRadius: "10px", border: "none",
              background: "linear-gradient(135deg, #0abab5, #058f8b)", color: "#fff",
              fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "system-ui",
            }}>Add Card</button>
            <button onClick={() => setShowForm(false)} style={{
              padding: "10px 18px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: "13px", cursor: "pointer",
            }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Board */}
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        {COLUMNS.map(col => {
          const colCards = cards.filter(c => c.column === col.id);
          return (
            <div key={col.id} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
              {/* Column header */}
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "12px 16px",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }} />
                  <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>{col.label}</span>
                </div>
                <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 800, color: col.color, background: `${col.color}18`, padding: "2px 10px", borderRadius: "20px" }}>
                  {colCards.length}
                </span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  minHeight: "200px",
                }}
              >
                {colCards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => handleDragStart(card.id)}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "12px",
                      padding: "12px",
                      cursor: "grab",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: `${COACH_COLORS[card.coach]}18`, color: COACH_COLORS[card.coach], fontFamily: "system-ui", fontWeight: 700 }}>
                        {card.coach === "Milzzy" ? "💪" : "🏃"} {card.coach}
                      </span>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "6px", background: "rgba(10,186,181,0.12)", color: "#0abab5", fontFamily: "system-ui" }}>
                        {POST_EMOJI[card.postType]} {card.postType}
                      </span>
                      <button onClick={() => handleDelete(card.id)} style={{ background: "none", border: "none", color: "rgba(248,113,113,0.6)", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>×</button>
                    </div>
                    <p style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 700, color: "#fff", margin: "0 0 4px", lineHeight: 1.4 }}>{card.title}</p>
                    {card.description && <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>{card.description}</p>}
                  </div>
                ))}
                {colCards.length === 0 && (
                  <div style={{ textAlign: "center", padding: "24px 8px", opacity: 0.3 }}>
                    <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>Drop cards here</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}