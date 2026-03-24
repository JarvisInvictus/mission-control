"use client";

import { useState, useEffect } from "react";

// Shared design constants
const Tiffany = "#0abab5";
const TiffanySoft = "rgba(10,186,181,0.12)";
const TiffanyBorder = "rgba(10,186,181,0.25)";
const GlassBg = "rgba(255,255,255,0.04)";
const GlassBlur = "blur(20px)";
const GlassBorder = "rgba(255,255,255,0.08)";

interface MemoryEntry {
  id: string;
  date: string;       // ISO date string "YYYY-MM-DD"
  title: string;
  sections: MemorySection[];
  wordCount: number;
  updatedAt: string;  // ISO date string
  createdAt: string;
}

interface MemorySection {
  heading: string;
  bullets: string[];
}

interface LongTermMemory {
  sections: MemorySection[];
  updatedAt: string;
  wordCount: number;
}

interface MemoryStore {
  longTerm: LongTermMemory;
  entries: MemoryEntry[];
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORE_KEY = "mc_memory_logs";

function slugifyDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function countEntryWords(entry: MemoryEntry): number {
  return entry.sections.reduce((sum, s) => {
    return sum + countWords(s.heading) + s.bullets.reduce((b, bullet) => b + countWords(bullet), 0);
  }, 0);
}

function getDefaultStore(): MemoryStore {
  const today = slugifyDate(new Date());
  return {
    longTerm: {
      sections: [
        {
          heading: "Business",
          bullets: [
            "Invictus Physiques — online fitness coaching, 75+ active clients",
            "Coaches: Milzzy (founder/head coach), Coach Miggy",
            "Admin: Sonieta (admin & finance, Telegram @sontainvictus)",
            "Goals: grow client base, build AI-powered ops stack, Men's Physique competition comeback",
          ],
        },
        {
          heading: "Tech Stack",
          bullets: [
            "Mission Control (Next.js/Vercel) — operations dashboard",
            "OpenClaw AI agents on Mac Mini M5, Telegram bot @Jarvisinvictus_bot",
            "Fillout forms for lead gen, WhatsApp for client comms",
            "Google Workspace, Vercel, Upstash Redis",
          ],
        },
        {
          heading: "Current Focus",
          bullets: [
            "Mission Control V3 build — client profiles, retention alerts, revenue trend, Memory/Logs tab",
            "Fillout lead gen form live — first leads expected",
            "Lead magnet pages in progress",
          ],
        },
      ],
      updatedAt: today,
      wordCount: 0,
    },
    entries: [],
  };
}

function loadStore(): MemoryStore {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return getDefaultStore();
    const store = JSON.parse(raw) as MemoryStore;
    // Ensure longTerm exists
    if (!store.longTerm) store.longTerm = getDefaultStore().longTerm;
    return store;
  } catch {
    return getDefaultStore();
  }
}

function saveStore(store: MemoryStore): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

// Pre-populate today's journal entry
function createTodayEntry(): MemoryEntry {
  const today = slugifyDate(new Date());
  return {
    id: today,
    date: today,
    title: `Daily Log — ${formatFullDate(today)}`,
    sections: [
      {
        heading: "What was built",
        bullets: [
          "Mission Control V1: Layout fixes, sidebar nav, header overlap, dynamic revenue stats, REV/WK calculation",
          "V2: Check-Ins tab, revenue projections, alerts section, finance persistence, mobile hamburger, weekly calendar full-width, add-a-card bug fix",
          "V3: Client profile drawer, retention alerts, revenue trend graph, leads-to-client auto-conversion, Memory/Logs tab",
        ],
      },
      {
        heading: "What was fixed",
        bullets: [
          "Check-in week calculation — was showing Dec 2025, now uses Monday-of-current-ISO-week",
          "Default status blank instead of 'On Time' badge",
          "Revenue 90-day projection — was lower than 60-day (×1.94 → ×2.91)",
          "Add-a-card not saving — React stale state closure bug (fixed by reading DOM value directly)",
          "Client profile panel not opening — View Profile button added to Manage Client modal",
        ],
      },
      {
        heading: "What's outstanding",
        bullets: [
          "Verify V3 features fully working end-to-end",
          "Audit lead magnet pages",
          "Xero OAuth — Milzzy to create developer.xero.com app",
          "Gmail via gog — needs `gog auth login` on Mac mini",
        ],
      },
      {
        heading: "Decisions made",
        bullets: [
          "Switched Brain agent and Coding agent to MiniMax M2.7 to reduce API costs",
          "Set agent timeout to 300 seconds",
          "Client IDs migrated from Date.now() timestamps to stable name-based slugs",
          "Check-ins auto-advance to current week on page load and tab focus",
        ],
      },
      {
        heading: "System changes",
        bullets: [
          "Fillout lead gen form set up — first leads expected tomorrow morning",
          "Memory/Logs tab built — auto-logs session at end of each OpenClaw session",
        ],
      },
    ],
    wordCount: 0,
    updatedAt: today,
    createdAt: today,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FileText({ size }: { size: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ─── EditableText ────────────────────────────────────────────────────────────

function EditableText({ value, onSave, multiline = false }: {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        style={{ cursor: "text", borderBottom: "1px dashed rgba(255,255,255,0.2)", paddingBottom: "1px" }}
        title="Click to edit"
      >
        {value}
      </span>
    );
  }

  return multiline ? (
    <textarea
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { onSave(draft); setEditing(false); }}
      onKeyDown={(e) => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
      style={{
        width: "100%", boxSizing: "border-box",
        background: "rgba(255,255,255,0.06)", border: `1px solid ${TiffanyBorder}`,
        borderRadius: "8px", color: "white", padding: "6px 10px",
        fontSize: "inherit", fontFamily: "inherit", lineHeight: 1.6,
        resize: "vertical", outline: "none",
      }}
      rows={Math.max(3, draft.split("\n").length)}
    />
  ) : (
    <input
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { onSave(draft); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { onSave(draft); setEditing(false); }
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      style={{
        background: "rgba(255,255,255,0.06)", border: `1px solid ${TiffanyBorder}`,
        borderRadius: "8px", color: "white", padding: "4px 10px",
        fontSize: "inherit", fontFamily: "inherit", outline: "none", width: "100%",
      }}
    />
  );
}

// ─── EntryItem ────────────────────────────────────────────────────────────────

function EntryItem({ entry, selected, onClick }: {
  entry: MemoryEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const words = countEntryWords(entry);
  const sizeKB = (JSON.stringify(entry).length / 1024).toFixed(1);

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left",
        background: selected ? "rgba(10,186,181,0.12)" : "transparent",
        border: "none",
        borderRadius: "10px",
        padding: "9px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        transition: "background 0.15s",
        borderLeft: selected ? `2px solid ${Tiffany}` : "2px solid transparent",
      }}
      onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
      onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      <span style={{ color: "rgba(255,255,255,0.30)", marginTop: "2px", flexShrink: 0 }}>
        <CalendarIcon />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: "block", fontFamily: "system-ui", fontSize: "12px",
          color: selected ? Tiffany : "rgba(255,255,255,0.80)",
          fontWeight: selected ? 600 : 400,
          lineHeight: 1.3,
        }}>
          {formatDate(entry.date)}
        </span>
        <span style={{
          display: "block", fontFamily: "system-ui", fontSize: "10px",
          color: "rgba(255,255,255,0.30)", marginTop: "2px",
        }}>
          {sizeKB} KB · {words.toLocaleString()} words
        </span>
      </span>
    </button>
  );
}

// ─── LongTermMemoryPinned ─────────────────────────────────────────────────────

function LongTermMemoryPinned({ longTerm, onEdit }: {
  longTerm: LongTermMemory;
  onEdit: () => void;
}) {
  const words = longTerm.sections.reduce((sum, s) =>
    sum + countWords(s.heading) + s.bullets.reduce((b, bullet) => b + countWords(bullet), 0), 0
  );
  const updated = (() => {
    const d = new Date(longTerm.updatedAt + "T12:00:00");
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  })();

  return (
    <button
      onClick={onEdit}
      style={{
        width: "100%", textAlign: "left",
        background: "rgba(52,211,153,0.08)",
        border: "1px solid rgba(52,211,153,0.20)",
        borderRadius: "12px",
        padding: "12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        marginBottom: "16px",
      }}
    >
      <span style={{ color: "#34d399", marginTop: "2px", flexShrink: 0 }}>
        <GlobeIcon />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: "system-ui", fontSize: "12px", fontWeight: 600, color: "#34d399" }}>
          Long-Term Memory
        </span>
        <span style={{ display: "block", fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
          {words.toLocaleString()} words · Updated {updated}
        </span>
      </span>
      <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
        ✦
      </span>
    </button>
  );
}

// ─── MemoryTab ────────────────────────────────────────────────────────────────

export function MemoryTab() {
  const [store, setStore] = useState<MemoryStore>(() => getDefaultStore());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingEntry, setEditingEntry] = useState<MemoryEntry | null>(null);
  const [editingLongTerm, setEditingLongTerm] = useState(false);

  // Load store on mount
  useEffect(() => {
    const loaded = loadStore();
    // Pre-populate today's entry if it doesn't exist
    const today = slugifyDate(new Date());
    const todayEntry = loaded.entries.find((e) => e.date === today);
    if (!todayEntry) {
      const newEntry = createTodayEntry();
      loaded.entries = [newEntry, ...loaded.entries];
      saveStore(loaded);
    }
    setStore(loaded);
    // Select today's entry by default
    const defaultEntry = loaded.entries.find((e) => e.date === today) ?? loaded.entries[0];
    if (defaultEntry) setSelectedId(defaultEntry.id);
  }, []);

const selectedEntry = store.entries.find((e) => e.id === selectedId) ?? null;

  // Filter entries by search
  const filteredEntries = search.trim()
    ? store.entries.filter((e) => {
        const q = search.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.sections.some((s) =>
            s.heading.toLowerCase().includes(q) ||
            s.bullets.some((b) => b.toLowerCase().includes(q))
          )
        );
      })
    : store.entries;

  function updateEntry(updated: MemoryEntry) {
    const newEntries = store.entries.map((e) =>
      e.id === updated.id ? { ...updated, updatedAt: slugifyDate(new Date()) } : e
    );
    const newStore = { ...store, entries: newEntries };
    setStore(newStore);
    saveStore(newStore);
    setSelectedId(updated.id);
    setEditingEntry(null);
  }

  function updateLongTerm(sections: MemorySection[]) {
    const updated: LongTermMemory = {
      sections,
      updatedAt: slugifyDate(new Date()),
      wordCount: 0,
    };
    const newStore = { ...store, longTerm: updated };
    setStore(newStore);
    saveStore(newStore);
    setEditingLongTerm(false);
  }

  function createNewEntry() {
    const today = slugifyDate(new Date());
    const existing = store.entries.find((e) => e.date === today);
    if (existing) {
      setSelectedId(existing.id);
      setEditingEntry(existing);
      return;
    }
    const newEntry: MemoryEntry = {
      id: today,
      date: today,
      title: `Daily Log — ${formatFullDate(today)}`,
      sections: [
        { heading: "What was built", bullets: [""] },
        { heading: "What was fixed", bullets: [""] },
        { heading: "What's outstanding", bullets: [""] },
        { heading: "Decisions made", bullets: [""] },
      ],
      wordCount: 0,
      updatedAt: today,
      createdAt: today,
    };
    const newEntries = [newEntry, ...store.entries];
    const newStore = { ...store, entries: newEntries };
    setStore(newStore);
    saveStore(newStore);
    setSelectedId(newEntry.id);
    setEditingEntry(null);
  }

  // ── Edit Long-Term Memory ─────────────────────────────────────────────────
  if (editingLongTerm) {
    return (
      <LongTermEditor
        longTerm={store.longTerm}
        onSave={updateLongTerm}
        onCancel={() => setEditingLongTerm(false)}
      />
    );
  }

  // ── Edit Entry ─────────────────────────────────────────────────────────────
  if (editingEntry) {
    return (
      <EntryEditor
        entry={editingEntry}
        onSave={updateEntry}
        onCancel={() => setEditingEntry(null)}
      />
    );
  }

  // ── Main View ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", gap: "0", height: "100%", overflow: "hidden" }}>

      {/* Left panel — 1/3 width */}
      <div style={{
        width: "320px",
        flexShrink: 0,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        paddingRight: "16px",
      }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.30)", pointerEvents: "none" }}>
            <SearchIcon />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memory..."
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "8px 10px 8px 32px",
              color: "white",
              fontSize: "13px",
              fontFamily: "system-ui",
              outline: "none",
            }}
          />
        </div>

        {/* Long-Term Memory pinned */}
        <LongTermMemoryPinned
          longTerm={store.longTerm}
          onEdit={() => setEditingLongTerm(true)}
        />

        {/* Daily Journal section */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}>
            <span style={{
              fontFamily: "system-ui", fontSize: "10px",
              color: "rgba(255,255,255,0.30)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
            }}>
              Daily Journal
            </span>
            <span style={{
              background: "rgba(168,85,247,0.15)",
              color: "#a855f7",
              border: "1px solid rgba(168,85,247,0.25)",
              borderRadius: "999px",
              padding: "1px 8px",
              fontSize: "10px",
              fontFamily: "system-ui",
            }}>
              {store.entries.length} entries
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {filteredEntries.length === 0 ? (
              <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "20px 0" }}>
                No entries found
              </p>
            ) : (
              filteredEntries.map((entry) => (
                <EntryItem
                  key={entry.id}
                  entry={entry}
                  selected={entry.id === selectedId}
                  onClick={() => setSelectedId(entry.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right panel — 2/3 width */}
      <div style={{ flex: 1, overflow: "auto", paddingLeft: "24px" }}>
        {selectedEntry ? (
          <EntryViewer
            entry={selectedEntry}
            onEdit={() => setEditingEntry(selectedEntry)}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.25)" }}>
              Select an entry to view
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EntryViewer ───────────────────────────────────────────────────────────────

function EntryViewer({ entry, onEdit }: { entry: MemoryEntry; onEdit: () => void }) {
  const words = countEntryWords(entry);
  const updated = (() => {
    const d = new Date(entry.updatedAt + "T12:00:00");
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  })();

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "system-ui", fontSize: "20px", fontWeight: 700, color: "white" }}>
            {entry.title}
          </h2>
          <p style={{ margin: "4px 0 0", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.40)" }}>
            {formatFullDate(entry.date)} · {words.toLocaleString()} words
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.20)" }}>Modified {updated}</span>
          <button
            onClick={onEdit}
            style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: TiffanySoft, border: `1px solid ${TiffanyBorder}`,
              borderRadius: "8px", padding: "6px 12px",
              color: Tiffany, fontSize: "12px", fontFamily: "system-ui", cursor: "pointer",
            }}
          >
            <EditIcon />
            Edit
          </button>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {entry.sections.filter(s => s.heading).map((section, i) => (
          <div key={i}>
            <h3 style={{ margin: "0 0 10px", fontFamily: "system-ui", fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              {section.heading}
            </h3>
            <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {section.bullets.filter(Boolean).map((bullet, j) => (
                <li key={j} style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EntryEditor ──────────────────────────────────────────────────────────────

function EntryEditor({ entry, onSave, onCancel }: {
  entry: MemoryEntry;
  onSave: (e: MemoryEntry) => void;
  onCancel: () => void;
}) {
  const [sections, setSections] = useState<MemorySection[]>(
    entry.sections.map(s => ({ ...s, bullets: [...s.bullets] }))
  );

  function updateSection(i: number, updates: Partial<MemorySection>) {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, ...updates } : s));
  }

  function updateBullet(si: number, bi: number, text: string) {
    setSections(prev => prev.map((s, idx) =>
      idx === si ? { ...s, bullets: s.bullets.map((b, bj) => bj === bi ? text : b) } : s
    ));
  }

  function addBullet(si: number) {
    setSections(prev => prev.map((s, idx) =>
      idx === si ? { ...s, bullets: [...s.bullets, ""] } : s
    ));
  }

  function addSection() {
    setSections(prev => [...prev, { heading: "", bullets: [""] }]);
  }

  function save() {
    onSave({ ...entry, sections: sections.filter(s => s.heading || s.bullets.some(Boolean)) });
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontFamily: "system-ui", fontSize: "18px", fontWeight: 700, color: "white" }}>
          Edit: {entry.title}
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onCancel} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px", padding: "7px 16px", color: "rgba(255,255,255,0.60)",
            fontSize: "12px", fontFamily: "system-ui", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={save} style={{
            background: TiffanySoft, border: `1px solid ${TiffanyBorder}`,
            borderRadius: "8px", padding: "7px 16px", color: Tiffany,
            fontSize: "12px", fontFamily: "system-ui", fontWeight: 600, cursor: "pointer",
          }}>Save</button>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {sections.map((section, si) => (
          <div key={si}>
            {/* Section heading */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <EditableText
                value={section.heading}
                onSave={(h) => updateSection(si, { heading: h })}
              />
              {si === sections.length - 1 && (
                <button onClick={addSection} style={{
                  background: "transparent", border: "none", color: "rgba(255,255,255,0.25)",
                  cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px",
                }}>+</button>
              )}
            </div>

            {/* Bullets */}
            <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {section.bullets.map((bullet, bi) => (
                <li key={bi}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <EditableText value={bullet} onSave={(t) => updateBullet(si, bi, t)} multiline />
                  </div>
                </li>
              ))}
            </ul>

            {/* Add bullet button */}
            <button onClick={() => addBullet(si)} style={{
              marginTop: "6px",
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.25)", cursor: "pointer",
              fontSize: "12px", fontFamily: "system-ui",
              padding: "2px 0",
            }}>
              + Add bullet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LongTermEditor ──────────────────────────────────────────────────────────

function LongTermEditor({ longTerm, onSave, onCancel }: {
  longTerm: LongTermMemory;
  onSave: (s: MemorySection[]) => void;
  onCancel: () => void;
}) {
  const [sections, setSections] = useState<MemorySection[]>(
    longTerm.sections.map(s => ({ ...s, bullets: [...s.bullets] }))
  );

  function updateSection(i: number, updates: Partial<MemorySection>) {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, ...updates } : s));
  }

  function updateBullet(si: number, bi: number, text: string) {
    setSections(prev => prev.map((s, idx) =>
      idx === si ? { ...s, bullets: s.bullets.map((b, bj) => bj === bi ? text : b) } : s
    ));
  }

  function addBullet(si: number) {
    setSections(prev => prev.map((s, idx) =>
      idx === si ? { ...s, bullets: [...s.bullets, ""] } : s
    ));
  }

  function addSection() {
    setSections(prev => [...prev, { heading: "", bullets: [""] }]);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2 style={{ margin: 0, fontFamily: "system-ui", fontSize: "18px", fontWeight: 700, color: "#34d399" }}>
          🧠 Long-Term Memory
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onCancel} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px", padding: "7px 16px", color: "rgba(255,255,255,0.60)",
            fontSize: "12px", fontFamily: "system-ui", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={() => onSave(sections)} style={{
            background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.30)",
            borderRadius: "8px", padding: "7px 16px", color: "#34d399",
            fontSize: "12px", fontFamily: "system-ui", fontWeight: 600, cursor: "pointer",
          }}>Save</button>
        </div>
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {sections.map((section, si) => (
          <div key={si}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <EditableText
                value={section.heading}
                onSave={(h) => updateSection(si, { heading: h })}
              />
              {si === sections.length - 1 && (
                <button onClick={addSection} style={{
                  background: "transparent", border: "none", color: "rgba(255,255,255,0.25)",
                  cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "0 4px",
                }}>+</button>
              )}
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {section.bullets.map((bullet, bi) => (
                <li key={bi}>
                  <EditableText value={bullet} onSave={(t) => updateBullet(si, bi, t)} multiline />
                </li>
              ))}
            </ul>
            <button onClick={() => addBullet(si)} style={{
              marginTop: "6px", background: "transparent", border: "none",
              color: "rgba(255,255,255,0.25)", cursor: "pointer",
              fontSize: "12px", fontFamily: "system-ui", padding: "2px 0",
            }}>+ Add bullet</button>
          </div>
        ))}
      </div>
    </div>
  );
}
