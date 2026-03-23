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
  const now = new Date();
  const until = new Date(pausedUntil);
  const diff = until.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24 * 7)));
}

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

// ─── Clients hook ─────────────────────────────────────────────────────────────

function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setClients(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = async (client: Omit<Client, "id">) => {
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(client),
    });
    if (!res.ok) throw new Error("Failed to add client");
    const newClient = await res.json();
    setClients((prev) => [...prev, newClient]);
    return newClient;
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update client");
    const updated = await res.json();
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteClient = async (id: string) => {
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete client");
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  return { clients, loading, error, addClient, updateClient, deleteClient, refetch: fetchClients };
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
          fixed top-0 left-0 h-full z-30 flex flex-col
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

// ─── Clients Tab ──────────────────────────────────────────────────────────────

function ClientsTab() {
  const { clients, loading, error, addClient, updateClient, deleteClient } = useClients();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    coach: "Milzzy" as "Milzzy" | "Miggy",
    paymentPlatform: "Newie" as "Newie" | "Upfront" | "Mentorship",
    weeklyCharge: 0,
    spreadsheetUrl: "",
    status: "active" as "active" | "paused" | "cancelled",
    pausedUntil: "",
    startDate: "",
    notes: "",
    checkInDay: "" as "" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
  });

  const resetForm = () => {
    setForm({
      name: "", email: "", coach: "Milzzy", paymentPlatform: "Newie",
      weeklyCharge: 0, spreadsheetUrl: "", status: "active",
      pausedUntil: "", startDate: "", notes: "",
      checkInDay: "",
    });
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = {
        ...form,
        weeklyCharge: Number(form.weeklyCharge),
        pausedUntil: form.status === "paused" ? form.pausedUntil : undefined,
        checkInDay: form.checkInDay || undefined,
      };
      if (editingId) {
        await updateClient(editingId, payload);
      } else {
        await addClient(payload as Omit<Client, "id">);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const startEdit = (client: Client) => {
    setForm({
      name: client.name,
      email: client.email ?? "",
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    setDeletingId(id);
    try {
      await deleteClient(id);
    } catch {
      setFormError("Failed to delete client");
    } finally {
      setDeletingId(null);
    }
  };

  const activeClients = clients.filter((c) => c.status === "active" || c.status === "paused");
  const cancelledClients = clients.filter((c) => c.status === "cancelled");
  const pausedClients = clients.filter((c) => c.status === "paused");

  const totalActive = clients.filter((c) => c.status === "active").length;
  const milzzyCount = clients.filter((c) => c.coach === "Milzzy" && (c.status === "active" || c.status === "paused")).length;
  const miggyCount = clients.filter((c) => c.coach === "Miggy" && (c.status === "active" || c.status === "paused")).length;
  const pausedCount = pausedClients.length;

  const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
  const [openDays, setOpenDays] = useState<Set<string>>(new Set(DAY_ORDER));

  const toggleDay = (day: string) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const grouped = DAY_ORDER.reduce<Record<string, Client[]>>((acc, day) => {
    acc[day] = activeClients.filter((c) => c.checkInDay === day);
    return acc;
  }, {});
  const noDayClients = activeClients.filter((c) => !c.checkInDay);

  // Pill helpers
  const paymentPill = (platform: Client["paymentPlatform"]) => {
    const styles: Record<Client["paymentPlatform"], React.CSSProperties> = {
      Newie: { background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.30)" },
      Upfront: { background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.30)" },
      Mentorship: { background: "rgba(167,139,250,0.15)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.30)" },
    };
    return (
      <span style={{ ...styles[platform], borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontFamily: "system-ui, -apple-system, Inter, sans-serif", fontWeight: 500 }}>
        {platform}
      </span>
    );
  };

  const statusPill = (client: Client) => {
    if (client.status === "active") {
      return (
        <span style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.30)", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontFamily: "system-ui, -apple-system, Inter, sans-serif", fontWeight: 500 }}>
          Active
        </span>
      );
    }
    if (client.status === "paused") {
      const wks = client.pausedUntil ? weeksRemaining(client.pausedUntil) : null;
      const label = wks !== null && wks > 0 ? `Paused · ${wks} wks` : "Paused";
      return (
        <span style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.30)", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontFamily: "system-ui, -apple-system, Inter, sans-serif", fontWeight: 500 }}>
          {label}
        </span>
      );
    }
    return null;
  };

  const ClientRow = ({ client }: { client: Client }) => (
    <tr
      className="border-b last:border-0 transition-colors"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
    >
      <td className="px-4 py-3" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.92)" }}>
        <span className="flex items-center gap-2 flex-wrap">
          {client.name}
          {client.spreadsheetUrl && (
            <button
              onClick={() => window.open(client.spreadsheetUrl, "_blank")}
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "rgba(59,130,246,0.85)", borderRadius: "5px", padding: "2px 7px", fontSize: "10px", cursor: "pointer", fontWeight: 500, fontFamily: "system-ui" }}
            >
              Sheet
            </button>
          )}
        </span>
      </td>
      <td className="px-4 py-3" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.70)", fontSize: "12px" }}>
        {client.coach}
      </td>
      <td className="px-4 py-3">
        {paymentPill(client.paymentPlatform ?? "Newie")}
      </td>
      <td className="px-4 py-3" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.60)" }}>
        {client.weeklyCharge ? `$${client.weeklyCharge}/wk` : "—"}
      </td>
      <td className="px-4 py-3">{statusPill(client)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => startEdit(client)}
            className="text-[11px] px-3 py-1 rounded-[8px] transition-all duration-200 hover:opacity-80"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.60)" }}
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(client.id)}
            disabled={deletingId === client.id}
            className="text-[11px] px-3 py-1 rounded-[8px] transition-all duration-200 hover:opacity-80 disabled:opacity-40"
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", background: "rgba(248,113,113,0.15)", color: "#f87171" }}
          >
            {deletingId === client.id ? "..." : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );

  const DayGroup = ({ day, clients }: { day: string; clients: Client[] }) => {
    const isOpen = openDays.has(day);
    return (
      <div className="liquid-glass overflow-hidden mb-3">
        <button
          onClick={() => toggleDay(day)}
          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
          style={{ background: "transparent", border: "none" }}
        >
          <span
            style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", fontSize: "11px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.50)", textTransform: "uppercase" }}
          >
            {day.toUpperCase()}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                fontSize: "11px",
                color: "rgba(255,255,255,0.30)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: "20px",
                padding: "1px 10px",
              }}
            >
              {clients.length} {clients.length === 1 ? "client" : "clients"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.30)", fontSize: "10px", transition: "transform 0.2s", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", display: "inline-block" }}>
              &#9660;
            </span>
          </span>
        </button>
        {isOpen && clients.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {["Name", "Coach", "Payment", "Weekly", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-2 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isOpen && clients.length === 0 && (
          <div className="px-4 pb-4">
            <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.25)", fontSize: "12px" }}>No clients</p>
          </div>
        )}
      </div>
    );
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "10px",
    color: "white",
    padding: "8px 12px",
    fontFamily: "system-ui",
    width: "100%",
    fontSize: "13px",
    outline: "none",
  };

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Active", value: totalActive, color: "#3b82f6" },
          { label: "Milzzy", value: milzzyCount, color: "#3b82f6" },
          { label: "Miggy", value: miggyCount, color: "#3b82f6" },
          { label: "Paused", value: pausedCount, color: "#fbbf24" },
        ].map(({ label, value, color }) => (
          <div key={label} className="liquid-glass p-4 text-center">
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color }}
            >
              {loading ? "—" : value}
            </p>
            <p
              className="text-[11px] mt-1"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-sm font-bold tracking-[0.15em] uppercase"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.92)" }}
        >
          Clients
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-[10px] text-sm transition-all duration-200 hover:opacity-90"
          style={{
            fontFamily: "system-ui, -apple-system, Inter, sans-serif",
            background: "rgba(59,130,246,0.15)",
            border: "1px solid rgba(59,130,246,0.30)",
            color: "#3b82f6",
          }}
        >
          {showForm ? "Cancel" : "+ Add Client"}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="liquid-glass p-5 mb-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Name *
              </label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Client name" />
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Email *
              </label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="client@email.com" />
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Coach *
              </label>
              <select required value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value as "Milzzy" | "Miggy" })} style={inputStyle}>
                <option value="Milzzy">Milzzy</option>
                <option value="Miggy">Miggy</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Payment Platform *
              </label>
              <select required value={form.paymentPlatform} onChange={(e) => setForm({ ...form, paymentPlatform: e.target.value as "Newie" | "Upfront" | "Mentorship" })} style={inputStyle}>
                <option value="Newie">Newie</option>
                <option value="Upfront">Upfront</option>
                <option value="Mentorship">Mentorship</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Weekly Charge
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.40)", fontFamily: "system-ui", fontSize: "13px" }}>$</span>
                <input type="number" min="0" value={form.weeklyCharge} onChange={(e) => setForm({ ...form, weeklyCharge: Number(e.target.value) })} style={{ ...inputStyle, paddingLeft: "24px" }} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Start Date *
              </label>
              <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} style={inputStyle} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Spreadsheet URL
              </label>
              <input type="url" value={form.spreadsheetUrl} onChange={(e) => setForm({ ...form, spreadsheetUrl: e.target.value })} style={inputStyle} placeholder="https://docs.google.com/spreadsheets/..." />
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Status *
              </label>
              <select required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "paused" | "cancelled" })} style={inputStyle}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {form.status === "paused" && (
              <div>
                <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                  Paused Until *
                </label>
                <input required type="date" value={form.pausedUntil} onChange={(e) => setForm({ ...form, pausedUntil: e.target.value })} style={inputStyle} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Notes
              </label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "none" }} placeholder="Optional notes..." />
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Check-in Day
              </label>
              <select value={form.checkInDay} onChange={(e) => setForm({ ...form, checkInDay: e.target.value as "" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday" })} style={inputStyle}>
                <option value="">— Select day —</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
          </div>
          {formError && (
            <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "#f87171", fontSize: "12px" }}>
              {formError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-[10px] text-sm transition-all duration-200 hover:opacity-90"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", background: "#3b82f6", color: "#ffffff" }}
            >
              {editingId ? "Save Changes" : "Add Client"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-[10px] text-sm transition-all duration-200 hover:opacity-80"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.60)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Day Groups */}
      {loading ? (
        <div className="liquid-glass p-8 text-center">
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)", fontSize: "13px" }}>Loading...</p>
        </div>
      ) : error ? (
        <div className="liquid-glass p-8 text-center">
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "#f87171", fontSize: "13px" }}>{error}</p>
        </div>
      ) : activeClients.length === 0 && noDayClients.length === 0 ? (
        <div className="liquid-glass p-8 text-center">
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)", fontSize: "13px" }}>No clients yet. Add your first client.</p>
        </div>
      ) : (
        <>
          {DAY_ORDER.map((day) => (
            <DayGroup key={day} day={day} clients={grouped[day]} />
          ))}
          {noDayClients.length > 0 && (
            <DayGroup day="No Day Set" clients={noDayClients} />
          )}
        </>
      )}

      {/* Cancelled Clients Section */}
      <div>
        <button
          onClick={() => setShowCancelled(!showCancelled)}
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-[10px] transition-all duration-200 hover:opacity-80"
          style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)", fontSize: "12px" }}
        >
          <span style={{ transition: "transform 0.2s", transform: showCancelled ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>
            &#9654;
          </span>
          Cancelled Clients ({cancelledClients.length})
        </button>

        {showCancelled && (
          <div className="liquid-glass overflow-hidden">
            {cancelledClients.length === 0 ? (
              <div className="p-6 text-center">
                <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.30)", fontSize: "13px" }}>No cancelled clients.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {["Name", "Coach", "Start Date", "Notes"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cancelledClients.map((client) => (
                      <tr
                        key={client.id}
                        className="border-b last:border-0"
                        style={{ borderColor: "rgba(255,255,255,0.05)" }}
                      >
                        <td className="px-4 py-3" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>{client.name}</td>
                        <td className="px-4 py-3" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)", fontSize: "12px" }}>{client.coach}</td>
                        <td className="px-4 py-3" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>{client.startDate}</td>
                        <td className="px-4 py-3" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.30)", fontSize: "12px" }}>{client.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("agents");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col">
      <Header activeTab={activeTab} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
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
