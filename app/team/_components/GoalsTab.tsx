"use client";

import { useEffect, useMemo, useState } from "react";
import type { TabMeta } from "../page";

type Owner = "Milzzy" | "Miggy" | "Sonta" | "Shared";

interface KeyResult {
  id: string;
  text: string;
  progress: number;
  done: boolean;
}

interface Goal {
  id: string;
  quarter: string;
  title: string;
  owner: Owner;
  keyResults: KeyResult[];
  createdAt: string;
  updatedAt: string;
}

const OWNERS: Owner[] = ["Milzzy", "Miggy", "Sonta", "Shared"];
const OWNER_COLORS: Record<Owner, string> = {
  Milzzy: "#0abab5",
  Miggy: "#3b82f6",
  Sonta: "#a855f7",
  Shared: "#94a3b8",
};

function getCurrentQuarter(): string {
  const m = new Date().getMonth();
  const q = Math.floor(m / 3) + 1;
  return `${new Date().getFullYear()}-Q${q}`;
}

function listQuarters(): string[] {
  // Show current ± 2 quarters (6 quarters total)
  const now = new Date();
  const out: string[] = [];
  for (let i = -2; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i * 3, 1);
    const q = Math.floor(d.getMonth() / 3) + 1;
    out.push(`${d.getFullYear()}-Q${q}`);
  }
  return out;
}

export function GoalsTab({ onMeta }: { onMeta?: (m: TabMeta | null) => void } = {}) {
  const [items, setItems] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>(getCurrentQuarter());
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ quarter: string; title: string; owner: Owner; krs: string }>({
    quarter: getCurrentQuarter(),
    title: "",
    owner: "Shared",
    krs: "",
  });

  useEffect(() => {
    fetch("/api/team/goals")
      .then((r) => r.json())
      .then((d) => {
        const list: Goal[] = d.items || [];
        setItems(list);
        if (list.length === 0) return;
        const latest = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        if (onMeta && latest) onMeta({ updatedAt: latest.updatedAt, updatedBy: latest.owner || "Team" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onMeta]);

  // Re-report on local changes (after a save / progress update)
  useEffect(() => {
    if (!onMeta || items.length === 0) return;
    const latest = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    onMeta({ updatedAt: latest.updatedAt, updatedBy: latest.owner || "Team" });
  }, [items, onMeta]);

  const quarters = useMemo(() => listQuarters(), []);

  async function add() {
    if (!draft.title.trim()) return;
    const krs = draft.krs
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({ id: `k_${Math.random().toString(36).slice(2, 8)}`, text, progress: 0, done: false }));
    const res = await fetch("/api/team/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quarter: draft.quarter,
        title: draft.title.trim(),
        owner: draft.owner,
        keyResults: krs,
      }),
    });
    const data = await res.json();
    if (data.item) {
      setItems((prev) => [data.item, ...prev]);
      setDraft({ quarter: getCurrentQuarter(), title: "", owner: "Shared", krs: "" });
      setAdding(false);
    }
  }

  async function updateGoal(g: Goal, patch: Partial<Goal>) {
    setItems((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
    await fetch(`/api/team/goals/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteGoal(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/team/goals/${id}`, { method: "DELETE" });
  }

  async function addKR(goal: Goal, text: string) {
    const newKR: KeyResult = { id: `k_${Math.random().toString(36).slice(2, 8)}`, text, progress: 0, done: false };
    await updateGoal(goal, { keyResults: [...goal.keyResults, newKR] });
  }

  async function updateKR(goal: Goal, krId: string, patch: Partial<KeyResult>) {
    const newKRs = goal.keyResults.map((k) => (k.id === krId ? { ...k, ...patch } : k));
    await updateGoal(goal, { keyResults: newKRs });
  }

  async function removeKR(goal: Goal, krId: string) {
    await updateGoal(goal, { keyResults: goal.keyResults.filter((k) => k.id !== krId) });
  }

  const filtered = items.filter((g) => g.quarter === filter);
  const overallProgress = useMemo(() => {
    if (filtered.length === 0) return 0;
    const sums = filtered.map((g) => {
      if (g.keyResults.length === 0) return 0;
      return g.keyResults.reduce((a, k) => a + (k.done ? 100 : k.progress), 0) / g.keyResults.length;
    });
    return Math.round(sums.reduce((a, b) => a + b, 0) / sums.length);
  }, [filtered]);

  return (
    <div>
      {/* Quarter filter + add */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
          {quarters.map((q) => {
            const active = q === filter;
            return (
              <button
                key={q}
                onClick={() => setFilter(q)}
                style={{
                  fontFamily: "system-ui",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.45)",
                  background: active ? "rgba(10,186,181,0.18)" : "rgba(255,255,255,0.04)",
                  border: active ? "1px solid rgba(10,186,181,0.40)" : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "999px",
                  padding: "5px 12px",
                  cursor: "pointer",
                }}
              >
                {q}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          style={{
            fontFamily: "system-ui",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: "rgba(255,255,255,0.95)",
            background: "rgba(10,186,181,0.18)",
            border: "1px solid rgba(10,186,181,0.40)",
            borderRadius: "10px",
            padding: "8px 14px",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          + New Objective
        </button>
      </div>

      {/* Overall progress */}
      {!loading && filtered.length > 0 && (
        <div
          style={{
            background: "rgba(10,186,181,0.08)",
            border: "1px solid rgba(10,186,181,0.25)",
            borderRadius: "14px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 4px" }}>
              {filter} progress
            </p>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "999px", height: "8px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${overallProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #0abab5 0%, #34d399 100%)",
                  borderRadius: "999px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
          <p
            style={{
              fontFamily: "system-ui",
              fontSize: "22px",
              fontWeight: 700,
              color: "#0abab5",
              margin: 0,
              minWidth: "60px",
              textAlign: "right",
            }}
          >
            {overallProgress}%
          </p>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(10,186,181,0.25)",
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
              autoFocus
              placeholder="Objective (e.g. Reach 100 active clients)"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              style={{ ...inputStyle, flex: 2, minWidth: "240px" }}
            />
            <select value={draft.quarter} onChange={(e) => setDraft({ ...draft, quarter: e.target.value })} style={inputStyle}>
              {quarters.map((q) => (
                <option key={q} value={q} style={{ background: "#0a0e1a" }}>
                  {q}
                </option>
              ))}
            </select>
            <select value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value as Owner })} style={inputStyle}>
              {OWNERS.map((o) => (
                <option key={o} value={o} style={{ background: "#0a0e1a" }}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <textarea
            placeholder="Key results — one per line"
            value={draft.krs}
            onChange={(e) => setDraft({ ...draft, krs: e.target.value })}
            rows={3}
            style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui" }}
          />
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
            Save Objective
          </button>
        </div>
      )}

      {/* Goals list */}
      {loading ? (
        <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "32px" }}>
          Loading…
        </p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: "system-ui", fontSize: "32px", margin: "0 0 8px" }}>🎯</p>
          <p style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.60)", margin: "0 0 4px" }}>
            No objectives for {filter} yet
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
            Add one to set the team&apos;s direction this quarter.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filtered.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onUpdate={(patch) => updateGoal(g, patch)}
              onDelete={() => deleteGoal(g.id)}
              onAddKR={(text) => addKR(g, text)}
              onUpdateKR={(krId, patch) => updateKR(g, krId, patch)}
              onRemoveKR={(krId) => removeKR(g, krId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onUpdate,
  onDelete,
  onAddKR,
  onUpdateKR,
  onRemoveKR,
}: {
  goal: Goal;
  onUpdate: (patch: Partial<Goal>) => void;
  onDelete: () => void;
  onAddKR: (text: string) => void;
  onUpdateKR: (krId: string, patch: Partial<KeyResult>) => void;
  onRemoveKR: (krId: string) => void;
}) {
  const [newKR, setNewKR] = useState("");
  const c = OWNER_COLORS[goal.owner];
  const progress = goal.keyResults.length === 0
    ? 0
    : Math.round(goal.keyResults.reduce((a, k) => a + (k.done ? 100 : k.progress), 0) / goal.keyResults.length);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${c}33`,
        borderRadius: "16px",
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: "system-ui", fontSize: "10px", color: c, letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 4px", fontWeight: 600 }}>
            Objective · {goal.quarter} · {goal.owner}
          </p>
          <p style={{ fontFamily: "system-ui", fontSize: "16px", fontWeight: 600, color: "rgba(255,255,255,0.95)", margin: 0, lineHeight: 1.3 }}>
            {goal.title}
          </p>
        </div>
        <div style={{ textAlign: "right", minWidth: "60px" }}>
          <p style={{ fontFamily: "system-ui", fontSize: "20px", fontWeight: 700, color: c, margin: 0 }}>
            {progress}%
          </p>
          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.25)",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "system-ui",
              marginTop: "4px",
            }}
          >
            Remove
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "999px", height: "6px", overflow: "hidden", marginBottom: "14px" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: c, borderRadius: "999px", transition: "width 0.3s" }} />
      </div>
      {/* Key results */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
        {goal.keyResults.map((k) => (
          <KRRow key={k.id} kr={k} color={c} onUpdate={(patch) => onUpdateKR(k.id, patch)} onRemove={() => onRemoveKR(k.id)} />
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          placeholder="+ Add key result"
          value={newKR}
          onChange={(e) => setNewKR(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newKR.trim()) {
              onAddKR(newKR.trim());
              setNewKR("");
            }
          }}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.04)",
            border: `1px dashed ${c}55`,
            borderRadius: "10px",
            color: "rgba(255,255,255,0.85)",
            padding: "6px 12px",
            fontSize: "12px",
            fontFamily: "system-ui",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}

function KRRow({
  kr,
  color,
  onUpdate,
  onRemove,
}: {
  kr: KeyResult;
  color: string;
  onUpdate: (patch: Partial<KeyResult>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        flexWrap: "wrap",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "10px",
        padding: "8px 12px",
        opacity: kr.done ? 0.6 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={kr.done}
        onChange={(e) => onUpdate({ done: e.target.checked, progress: e.target.checked ? 100 : kr.progress })}
        style={{ accentColor: color, cursor: "pointer", width: "16px", height: "16px" }}
      />
      <span
        style={{
          fontFamily: "system-ui",
          fontSize: "12px",
          color: "rgba(255,255,255,0.85)",
          flex: 1,
          textDecoration: kr.done ? "line-through" : "none",
        }}
      >
        {kr.text}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={kr.progress}
        onChange={(e) => onUpdate({ progress: parseInt(e.target.value, 10) })}
        disabled={kr.done}
        style={{ flex: "1 1 100px", minWidth: "80px", accentColor: color }}
      />
      <span
        style={{
          fontFamily: "system-ui",
          fontSize: "11px",
          fontWeight: 600,
          color,
          minWidth: "36px",
          textAlign: "right",
        }}
      >
        {kr.done ? "✓" : `${kr.progress}%`}
      </span>
      <button
        onClick={onRemove}
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.25)",
          cursor: "pointer",
          fontSize: "14px",
          padding: 0,
        }}
      >
        ×
      </button>
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
