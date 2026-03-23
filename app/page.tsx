"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/AgentCard";
import { HeartbeatCard } from "@/components/HeartbeatCard";
import { CronCard, type CronJob } from "@/components/CronCard";
import { SubagentCard, type SubAgent } from "@/components/SubagentCard";
import { BusinessCard } from "@/components/BusinessCard";
import { FinanceTab } from "@/components/FinanceTab";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Business {
  clientCount: number;
  leads: { enquiry: number; consulted: number; converted: number };
  lastUpdated: string;
}

interface StatusData {
  agent: {
    name: string;
    model: string;
    status: "active" | "idle" | "alert";
    session: string;
    lastActivity: string;
    uptime: string;
  };
  heartbeat: {
    lastRun: string;
    nextRun: string;
    status: "ok" | "alert";
    intervalMinutes: number;
  };
  cron: CronJob[];
  subagents: SubAgent[];
  business?: Business;
  pushedAt: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  coach: "Milzzy" | "Miggy";
  paymentPlatform: "Newie" | "Upfront" | "Mentorship";
  weeklyCharge: number;
  spreadsheetUrl: string;
  status: "active" | "paused" | "cancelled";
  pausedUntil?: string;
  startDate: string;
  notes?: string;
  checkInDay?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
}

type Tab = "agents" | "clients" | "finance";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function weeksRemaining(pausedUntil: string): number {
  return Math.ceil((new Date(pausedUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7));
}

// ─── Day column colour tints ─────────────────────────────────────────────────
const DAY_COLORS: Record<string, string> = {
  Monday:    "rgba(59, 130, 246, 0.04)",
  Tuesday:   "rgba(139, 92, 246, 0.04)",
  Wednesday: "rgba(16, 185, 129, 0.04)",
  Thursday:  "rgba(245, 158, 11, 0.04)",
  Friday:    "rgba(239, 68, 68, 0.04)",
  Saturday:  "rgba(236, 72, 153, 0.04)",
  Sunday:    "rgba(20, 184, 166, 0.04)",
};

const DAY_BORDER_COLORS: Record<string, string> = {
  Monday:    "rgba(59, 130, 246, 0.50)",
  Tuesday:   "rgba(139, 92, 246, 0.50)",
  Wednesday: "rgba(16, 185, 129, 0.50)",
  Thursday:  "rgba(245, 158, 11, 0.50)",
  Friday:    "rgba(239, 68, 68, 0.50)",
  Saturday:  "rgba(236, 72, 153, 0.50)",
  Sunday:    "rgba(20, 184, 166, 0.50)",
};

const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ─── Status hook ─────────────────────────────────────────────────────────────

function useStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error("Non-OK");
      const json = await res.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { data, loading, error };
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ activeTab }: { activeTab: Tab }) {
  return (
    <header className="liquid-glass-header sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div>
          <h1
            className="text-[1.1rem] tracking-[0.1em] font-bold"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif" }}
          >
            <span style={{ color: "rgba(255,255,255,0.92)" }}>JARVIS</span>
            <span style={{ color: "rgba(255,255,255,0.40)", margin: "0 0.6rem" }}>//</span>
            <span style={{ color: "rgba(255,255,255,0.40)" }}>MISSION CONTROL</span>
          </h1>
          <p
            className="text-[11px] mt-1 tracking-wide"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
          >
            Invictus Physiques · Operations
          </p>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: "#3b82f6", opacity: 0.4 }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: "#3b82f6" }}
            />
          </span>
          <span
            className="text-[11px] tracking-[0.15em] uppercase"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "#3b82f6" }}
          >
            Live
          </span>
        </div>

        <span
          className="text-[11px] tracking-[0.15em] uppercase"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
        >
          {activeTab === "agents" ? "Agents" : activeTab === "clients" ? "Clients" : "Finance"}
        </span>
      </div>
    </header>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  activeTab,
  onTabChange,
  mobileOpen,
  onClose,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const navItems: { id: Tab; label: string }[] = [
    { id: "agents", label: "Agents" },
    { id: "clients", label: "Clients" },
    { id: "finance", label: "Finance" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-30 flex flex-col
          transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto
          w-[220px] liquid-glass-sidebar
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full pt-20 px-4 gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onClose();
              }}
              className={`
                w-full text-left px-3 py-2.5 rounded-[10px] text-sm transition-all duration-200
                ${activeTab === item.id
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]"
                }
              `}
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif" }}
            >
              {item.label}
            </button>
          ))}

          {/* Brand label */}
          <div className="mt-auto pt-4">
            <p
              className="text-[9px] uppercase tracking-[0.2em]"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.20)" }}
            >
              Invictus Physiques
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Agents Tab ──────────────────────────────────────────────────────────────

function AgentsTab() {
  const { data, loading, error } = useStatus();

  const pushedAt = data?.pushedAt ? new Date(data.pushedAt) : null;
  const secondsAgo = pushedAt
    ? Math.round((Date.now() - pushedAt.getTime()) / 1000)
    : null;
  const isStale = secondsAgo !== null && secondsAgo > 120;

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6">
        {isStale || error ? (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#f87171" }} />
            <span
              className="text-[11px] tracking-[0.15em] uppercase font-semibold"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "#f87171" }}
            >
              Stale
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ backgroundColor: "#3b82f6", opacity: 0.4 }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: "#3b82f6" }}
              />
            </span>
            <span
              className="text-[11px] tracking-[0.15em] uppercase font-semibold"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "#3b82f6" }}
            >
              Live
            </span>
          </span>
        )}
        {secondsAgo !== null && (
          <span
            className="text-[11px]"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
          >
            {secondsAgo}s ago
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { card: <AgentCard agent={data?.agent ?? null} loading={loading} />, col: "xl:col-span-1" },
          { card: <HeartbeatCard data={data?.heartbeat ?? null} loading={loading} />, col: "xl:col-span-1" },
          { card: <CronCard jobs={data?.cron ?? []} loading={loading} />, col: "xl:col-span-1" },
          { card: <SubagentCard agents={data?.subagents ?? []} loading={loading} />, col: "xl:col-span-1" },
        ].map(({ card, col }, i) => (
          <div key={i} className={`group ${col}`}>
            <div className="liquid-glass p-5 flex flex-col gap-4">
              {card}
            </div>
          </div>
        ))}
      </div>

      {/* Business stats */}
      <section className="mt-4 group">
        <div className="liquid-glass p-5 flex flex-col gap-4">
          <BusinessCard data={data?.business ?? null} loading={loading} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 mt-4">
        <p
          className="text-[11px]"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)" }}
        >
          Last refreshed:{" "}
          {pushedAt
            ? pushedAt.toLocaleTimeString("en-AU", { hour12: false })
            : "—"}{" "}
          · Auto-refresh every 30s · v2.0.0
        </p>
      </footer>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("agents");
  const [mobileOpen, setMobileOpen] = useState(false);

  // ─── Clients tab state (owned by Home) ─────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [actionPanel, setActionPanel] = useState<"menu" | "pause" | "cancel" | "edit">("menu");

  // Fetch clients when clients tab is active
  useEffect(() => {
    if (activeTab !== "clients") return;
    fetch("/api/clients")
      .then(r => r.json())
      .then((data: Client[]) => setClients(data))
      .catch(console.error);
  }, [activeTab]);

  // Stable updateClient function
  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setSelectedClient(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  async function deleteClient(id: string) {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setClients(prev => prev.filter(c => c.id !== id));
  }

  // ─── ClientsTab (lives here to access Home's state) ─────────────────────
  function ClientsTab() {
    const [form, setForm] = useState({
      name: "", email: "", coach: "Milzzy" as "Milzzy" | "Miggy",
      paymentPlatform: "Newie" as "Newie" | "Upfront" | "Mentorship",
      weeklyCharge: 0, spreadsheetUrl: "", status: "active" as Client["status"],
      pausedUntil: "", startDate: new Date().toISOString().split("T")[0],
      notes: "", checkInDay: "" as "" | Client["checkInDay"],
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [showCancelled, setShowCancelled] = useState(false);
    const [selectedCoach, setSelectedCoach] = useState<"Milzzy" | "Miggy">("Milzzy");

    // When search is active, show all matching clients in one list
    const searchResults = searchQuery
      ? clients.filter(c =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : [];

    const coachFiltered = clients.filter(c => c.coach === selectedCoach);
    const dayGroups = DAY_ORDER
      .map(day => ({ day, clients: coachFiltered.filter(c => c.checkInDay === day) }))
      .filter(g => g.clients.length > 0);
    const cancelledClients = coachFiltered.filter(c => c.status === "cancelled");
    const pausedClients = coachFiltered.filter(c => c.status === "paused");
    const activeClients = coachFiltered.filter(c => c.status === "active");
    const miggyClients = clients.filter(c => c.coach === "Miggy");
    const milzzyClients = clients.filter(c => c.coach === "Milzzy");

    const inputStyle: React.CSSProperties = {
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: "10px", color: "white", padding: "10px 12px",
      fontSize: "13px", fontFamily: "system-ui", outline: "none", width: "100%", boxSizing: "border-box" as const,
    };

    const startEdit = (client: Client) => {
      setForm({
        name: client.name, email: client.email ?? "",
        coach: client.coach,
        paymentPlatform: client.paymentPlatform ?? "Newie",
        weeklyCharge: client.weeklyCharge ?? 0,
        spreadsheetUrl: client.spreadsheetUrl ?? "",
        status: client.status,
        pausedUntil: client.pausedUntil ?? "",
        startDate: client.startDate,
        notes: client.notes ?? "",
        checkInDay: client.checkInDay ?? "",
      });
      setEditingId(client.id);
      setShowForm(true);
    };

    const handleSave = async () => {
      if (!form.name.trim()) { setFormError("Name is required"); return; }
      setFormError(null);
      if (editingId) {
        await updateClient(editingId, { ...form, checkInDay: form.checkInDay || undefined });
        setEditingId(null);
      } else {
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const newClient: Client = await res.json();
          setClients(prev => [...prev, newClient]);
        }
      }
      setForm({ name: "", email: "", coach: "Milzzy", paymentPlatform: "Newie", weeklyCharge: 0, spreadsheetUrl: "", status: "active", pausedUntil: "", startDate: new Date().toISOString().split("T")[0], notes: "", checkInDay: "" });
      setShowForm(false);
    };

    const statusPill = (client: Client) => {
      if (client.status === "active") return <span style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "999px", padding: "2px 10px", fontSize: "11px", fontFamily: "system-ui", fontWeight: 500, display: "inline-block" }}>Active</span>;
      if (client.status === "paused") {
        const wks = client.pausedUntil ? weeksRemaining(client.pausedUntil) : null;
        return <span style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "999px", padding: "2px 10px", fontSize: "11px", fontFamily: "system-ui", fontWeight: 500, display: "inline-block" }}>Paused {wks ? `· ${wks}w` : ""}</span>;
      }
      return <span style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "999px", padding: "2px 10px", fontSize: "11px", fontFamily: "system-ui", fontWeight: 500, display: "inline-block" }}>Cancelled</span>;
    };

    const platformColors: Record<string, string> = { Newie: "#3b82f6", Upfront: "#a855f7", Mentorship: "#10b981" };

    const gridClass = dayGroups.length === 1 ? "grid grid-cols-1 gap-4"
      : dayGroups.length === 2 ? "grid grid-cols-1 lg:grid-cols-2 gap-4"
      : "grid grid-cols-1 lg:grid-cols-3 gap-4";

    return (
      <div style={{ padding: "16px 20px", width: "100%", boxSizing: "border-box" }}>
        {/* Search bar */}
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.30)", fontSize: "14px", pointerEvents: "none" }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: "12px", color: "white", padding: "10px 14px 10px 40px",
              fontSize: "14px", fontFamily: "system-ui", outline: "none", boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "14px" }}>✕</button>
          )}
        </div>

        {/* Header + Add */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["Milzzy","Miggy"] as const).map(c => (
              <button key={c} onClick={() => setSelectedCoach(c)}
                style={{ background: selectedCoach === c ? "rgba(59,130,246,0.20)" : "rgba(255,255,255,0.05)", border: selectedCoach === c ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(255,255,255,0.10)", borderRadius: "999px", padding: "6px 18px", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui", fontWeight: selectedCoach === c ? 600 : 400, color: selectedCoach === c ? "#3b82f6" : "rgba(255,255,255,0.50)", transition: "all 0.15s" }}>
                {c} {c === "Milzzy" ? `(${milzzyClients.length})` : `(${miggyClients.length})`}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", email: "", coach: "Milzzy", paymentPlatform: "Newie", weeklyCharge: 0, spreadsheetUrl: "", status: "active", pausedUntil: "", startDate: new Date().toISOString().split("T")[0], notes: "", checkInDay: "" }); }}
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.30)", borderRadius: "12px", padding: "8px 18px", color: "#3b82f6", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>
            {showForm ? "Cancel" : "+ Add Client"}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total Active", value: activeClients.length, color: "#34d399" },
            { label: "Milzzy", value: milzzyClients.filter(c=>c.status==="active").length, color: "#3b82f6" },
            { label: "Miggy", value: miggyClients.filter(c=>c.status==="active").length, color: "#a855f7" },
            { label: "Paused", value: pausedClients.length, color: "#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "16px", textAlign: "center" }}>
              <p style={{ fontFamily: "system-ui", fontSize: "24px", fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search Results Section */}
        {searchQuery && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.40)", marginBottom: "10px" }}>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "12px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <tbody>
                    {searchResults.map((client, idx) => {
                      const isPaused = client.status === "paused";
                      return (
                        <tr key={client.id}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isPaused ? "rgba(251,191,36,0.04)" : idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent" }}
                          onClick={() => { setSelectedClient(client); setActionPanel("menu"); }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.025)"}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = isPaused ? "rgba(251,191,36,0.04)" : idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent"}>
                          <td style={{ padding: "10px 12px", fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.90)" }}>{client.name}</td>
                          <td style={{ padding: "10px 12px" }}><span style={{ background: `${platformColors[client.paymentPlatform]}18`, color: platformColors[client.paymentPlatform], border: `1px solid ${platformColors[client.paymentPlatform]}40`, borderRadius: "999px", padding: "1px 7px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>{client.paymentPlatform}</span></td>
                          <td style={{ padding: "10px 12px", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>{client.coach}</td>
                          <td style={{ padding: "10px 12px" }}>{statusPill(client)}</td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            {client.spreadsheetUrl && (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(client.spreadsheetUrl, "_blank"); }}
                                style={{
                                  background: "transparent",
                                  border: "1px solid rgba(59,130,246,0.30)",
                                  borderRadius: "6px",
                                  color: "#3b82f6",
                                  cursor: "pointer",
                                  padding: "2px 10px",
                                  fontSize: "11px",
                                  fontFamily: "system-ui",
                                  fontWeight: 500,
                                  lineHeight: 1.5,
                                  whiteSpace: "nowrap",
                                }}
                                title="Open spreadsheet"
                              >
                                Spreadsheet Hub
                              </button>
                            )}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedClient(client); setActionPanel("menu"); }} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "16px", lineHeight: 1 }}>⋯</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Day Groups Grid */}
        {!searchQuery && <div className={gridClass}>
          {dayGroups.map(({ day, clients: dayClients }) => (
            <div key={day} style={{ background: DAY_COLORS[day] ?? "rgba(255,255,255,0.03)", borderLeft: `3px solid ${DAY_BORDER_COLORS[day]}`, borderRadius: "16px", padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontFamily: "system-ui", fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase" }}>{day.toUpperCase()}</span>
                <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{dayClients.length}</span>
              </div>
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <tbody>
                    {dayClients.map((client, idx) => {
                      const isPaused = client.status === "paused";
                      const rowBg = isPaused ? "rgba(251,191,36,0.04)" : idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent";
                      return (
                        <tr key={client.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: rowBg, transition: "background 0.15s" }}
                          onMouseEnter={e => { if (!isPaused) (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.025)"; }}
                          onMouseLeave={e => { if (!isPaused) (e.currentTarget as HTMLTableRowElement).style.background = rowBg; }}>
                          <td style={{ padding: "8px 10px", minWidth: "120px", width: "40%", fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.90)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {isPaused && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", flexShrink: 0, display: "inline-block" }} />}
                              {client.name}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ background: `${platformColors[client.paymentPlatform]}18`, color: platformColors[client.paymentPlatform], border: `1px solid ${platformColors[client.paymentPlatform]}40`, borderRadius: "999px", padding: "1px 7px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>{client.paymentPlatform}</span>
                          </td>
                          <td style={{ padding: "8px 10px", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.70)" }}>{client.weeklyCharge ? `$${client.weeklyCharge}/wk` : "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{statusPill(client)}</td>
                          <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                            {client.spreadsheetUrl && (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(client.spreadsheetUrl, "_blank"); }}
                                style={{
                                  background: "transparent",
                                  border: "1px solid rgba(59,130,246,0.30)",
                                  borderRadius: "6px",
                                  color: "#3b82f6",
                                  cursor: "pointer",
                                  padding: "2px 10px",
                                  fontSize: "11px",
                                  fontFamily: "system-ui",
                                  fontWeight: 500,
                                  lineHeight: 1.5,
                                  whiteSpace: "nowrap",
                                }}
                                title="Open spreadsheet"
                              >
                                Spreadsheet Hub
                              </button>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", width: "40px", minWidth: "40px", textAlign: "center" }}>
                            <button onClick={() => { setSelectedClient(client); setActionPanel("menu"); }}
                              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: "4px 8px", borderRadius: "6px", fontSize: "16px", lineHeight: 1 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.70)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
                              &#x22EE;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>}

        {/* Add/Edit Form (rendered after day-groups so it overlays on top) */}
        {!searchQuery && showForm && (
          <div style={{ background: "rgba(15,20,40,0.60)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "20px", padding: "24px", marginTop: "20px" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: "16px" }}>{editingId ? "Edit Client" : "Add New Client"}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ ...inputStyle, marginTop: "4px" }} placeholder="Full name" /></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ ...inputStyle, marginTop: "4px" }} placeholder="client@email.com" /></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Coach</label>
                <select value={form.coach} onChange={e => setForm({...form, coach: e.target.value as "Milzzy"|"Miggy"})} style={{ ...inputStyle, marginTop: "4px" }}>
                  <option value="Milzzy">Milzzy</option><option value="Miggy">Miggy</option></select></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment Platform</label>
                <select value={form.paymentPlatform} onChange={e => setForm({...form, paymentPlatform: e.target.value as "Newie"|"Upfront"|"Mentorship"})} style={{ ...inputStyle, marginTop: "4px" }}>
                  <option value="Newie">Newie</option><option value="Upfront">Upfront</option><option value="Mentorship">Mentorship</option></select></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Weekly Charge ($)</label>
                <input type="number" value={form.weeklyCharge} onChange={e => setForm({...form, weeklyCharge: Number(e.target.value)})} style={{ ...inputStyle, marginTop: "4px" }} placeholder="0" /></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Check-in Day</label>
                <select value={form.checkInDay} onChange={e => setForm({...form, checkInDay: e.target.value as ""|Client["checkInDay"]})} style={{ ...inputStyle, marginTop: "4px" }}>
                  <option value="">— Select day —</option>
                  {DAY_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
                </select></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Spreadsheet URL</label>
                <input value={form.spreadsheetUrl} onChange={e => setForm({...form, spreadsheetUrl: e.target.value})} style={{ ...inputStyle, marginTop: "4px" }} placeholder="https://docs.google.com/..." /></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Start Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} style={{ ...inputStyle, marginTop: "4px" }} /></div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} style={{ ...inputStyle, resize: "none", marginTop: "4px" }} placeholder="Optional notes..." />
            </div>
            {formError && <p style={{ color: "#f87171", fontFamily: "system-ui", fontSize: "12px", marginBottom: "8px" }}>{formError}</p>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleSave} style={{ background: "rgba(59,130,246,0.20)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: "10px", padding: "10px 24px", color: "#3b82f6", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>
                {editingId ? "Save Changes" : "Add Client"}
              </button>
              {editingId && <button onClick={() => { setEditingId(null); setShowForm(false); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 24px", color: "rgba(255,255,255,0.55)", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui" }}>Cancel</button>}
            </div>
          </div>
        )}

        {/* Cancelled Section */}
        {cancelledClients.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <button onClick={() => setShowCancelled(!showCancelled)} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
              <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cancelled ({cancelledClients.length})</span>
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "12px", transition: "transform 0.2s", transform: showCancelled ? "rotate(180deg)" : "none" }}>⌄</span>
            </button>
            {showCancelled && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%" }}>
                    <tbody>
                      {cancelledClients.map(client => (
                        <tr key={client.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "10px 16px", fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.40)" }}>{client.name}</td>
                          <td style={{ padding: "10px 16px", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>{statusPill(client)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Modal */}
        {selectedClient && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.70)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }} onClick={() => setSelectedClient(null)}>
            <div style={{ background: "rgba(15,20,40,0.97)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "360px", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }} onClick={e => e.stopPropagation()}>
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "4px" }}>Manage Client</p>
                <p style={{ fontFamily: "system-ui", fontSize: "18px", fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{selectedClient.name}</p>
              </div>
              {actionPanel === "menu" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button onClick={() => {
                    setForm({
                      name: selectedClient.name, email: selectedClient.email ?? "",
                      coach: selectedClient.coach,
                      paymentPlatform: selectedClient.paymentPlatform ?? "Newie",
                      weeklyCharge: selectedClient.weeklyCharge ?? 0,
                      spreadsheetUrl: selectedClient.spreadsheetUrl ?? "",
                      status: selectedClient.status,
                      pausedUntil: selectedClient.pausedUntil ?? "",
                      startDate: selectedClient.startDate,
                      notes: selectedClient.notes ?? "",
                      checkInDay: selectedClient.checkInDay ?? "",
                    });
                    setEditingId(selectedClient.id);
                    setActionPanel("edit");
                  }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "12px 16px", color: "rgba(255,255,255,0.85)", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                    ✏️ Edit Client
                  </button>
                  <button onClick={() => setActionPanel("pause")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "12px", padding: "12px 16px", color: "#fbbf24", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                    ⏸️ Pause Client
                  </button>
                  {selectedClient.spreadsheetUrl && (
                    <button onClick={() => { window.open(selectedClient.spreadsheetUrl, "_blank"); setSelectedClient(null); }}
                      style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: "12px", padding: "12px 16px", color: "#60a5fa", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                      📊 Open Sheet
                    </button>
                  )}
                  <button onClick={() => setActionPanel("cancel")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(248,113,113,0.10)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "12px", padding: "12px 16px", color: "#f87171", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                    ✕ Cancel Client
                  </button>
                </div>
              )}
              {actionPanel === "pause" && (
                <div>
                  <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.50)", marginBottom: "10px" }}>Pause <strong style={{ color: "rgba(255,255,255,0.80)" }}>{selectedClient.name}</strong> until:</p>
                  <input id="pause-date-modal" type="date" defaultValue={selectedClient.pausedUntil ?? ""}
                    style={{ display: "block", width: "100%", marginBottom: "14px", background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "12px", color: "white", padding: "12px 14px", fontSize: "14px", fontFamily: "system-ui", outline: "none", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={async () => { const date = (document.getElementById("pause-date-modal") as HTMLInputElement)?.value; if (!date) return; await updateClient(selectedClient.id, { status: "paused", pausedUntil: date }); setSelectedClient(null); }}
                      style={{ flex: 1, background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", fontWeight: 600 }}>Confirm Pause</button>
                    <button onClick={() => setActionPanel("menu")}
                      style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer" }}>Back</button>
                  </div>
                </div>
              )}
              {actionPanel === "cancel" && (
                <div>
                  <p style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.70)", marginBottom: "18px", lineHeight: 1.5 }}>Remove <strong style={{ color: "rgba(255,255,255,0.90)" }}>{selectedClient.name}</strong> from active clients?</p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={async () => { await updateClient(selectedClient.id, { status: "cancelled" }); setSelectedClient(null); }}
                      style={{ flex: 1, background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.35)", color: "#f87171", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", fontWeight: 600 }}>Yes, Cancel</button>
                    <button onClick={() => setActionPanel("menu")}
                      style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer" }}>Keep</button>
                  </div>
                </div>
              )}

              {/* ── Edit panel ── */}
              {actionPanel === "edit" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <p style={{ fontFamily: "system-ui", fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>Edit Client</p>
                    <button onClick={() => { setActionPanel("menu"); setEditingId(null); setSelectedClient(null); }}
                      style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1 }}>✕</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Name</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Email</label>
                      <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="client@email.com" />
                    </div>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Coach</label>
                      <select value={form.coach} onChange={e => setForm({ ...form, coach: e.target.value as "Milzzy"|"Miggy" })} style={inputStyle}>
                        <option value="Milzzy">Milzzy</option><option value="Miggy">Miggy</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Platform</label>
                      <select value={form.paymentPlatform} onChange={e => setForm({ ...form, paymentPlatform: e.target.value as "Newie"|"Upfront"|"Mentorship" })} style={inputStyle}>
                        <option value="Newie">Newie</option><option value="Upfront">Upfront</option><option value="Mentorship">Mentorship</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Weekly ($)</label>
                      <input type="number" value={form.weeklyCharge} onChange={e => setForm({ ...form, weeklyCharge: Number(e.target.value) })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Check-in Day</label>
                      <select value={form.checkInDay} onChange={e => setForm({ ...form, checkInDay: e.target.value as ""|Client["checkInDay"] })} style={inputStyle}>
                        <option value="">— Select —</option>
                        {DAY_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Start Date</label>
                      <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Status</label>
                      <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Client["status"] })} style={inputStyle}>
                        <option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Spreadsheet URL</label>
                    <input value={form.spreadsheetUrl} onChange={e => setForm({ ...form, spreadsheetUrl: e.target.value })} style={inputStyle} placeholder="https://docs.google.com/..." />
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Notes</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "none" }} />
                  </div>
                  {formError && <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "#f87171", marginBottom: "8px" }}>{formError}</p>}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={async () => {
                        if (!form.name.trim()) { setFormError("Name is required"); return; }
                        setFormError(null);
                        await updateClient(editingId!, { ...form, checkInDay: form.checkInDay || undefined });
                        setEditingId(null);
                        setActionPanel("menu");
                        setSelectedClient(null);
                      }}
                      style={{ flex: 1, background: "rgba(59,130,246,0.20)", border: "1px solid rgba(59,130,246,0.35)", borderRadius: "12px", padding: "11px", color: "#3b82f6", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", fontWeight: 600 }}>
                      Save Changes
                    </button>
                    <button onClick={() => { setActionPanel("menu"); setEditingId(null); setSelectedClient(null); }}
                      style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "11px", color: "rgba(255,255,255,0.50)", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col">
      <Header activeTab={activeTab} />

      <div className="flex flex-1 overflow-visible">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:py-6 lg:ml-[220px]">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden mb-4 p-2 rounded-[10px] transition-colors"
            style={{ background: "rgba(255,255,255,0.04)" }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {activeTab === "agents" ? <AgentsTab /> : activeTab === "clients" ? <ClientsTab /> : <FinanceTab />}
        </main>
      </div>
    </div>
  );
}
