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
  coach: "Milzzy" | "Miggy";
  status: "active" | "paused" | "completed";
  startDate: string;
  notes?: string;
}

type Tab = "agents" | "clients" | "finance";

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

  // Form state
  const [form, setForm] = useState({
    name: "",
    coach: "Milzzy" as "Milzzy" | "Miggy",
    status: "active" as "active" | "paused" | "completed",
    startDate: "",
    notes: "",
  });

  const resetForm = () => {
    setForm({ name: "", coach: "Milzzy", status: "active", startDate: "", notes: "" });
    setShowForm(false);
    setEditingId(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingId) {
        await updateClient(editingId, form);
      } else {
        await addClient(form);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const startEdit = (client: Client) => {
    setForm({
      name: client.name,
      coach: client.coach,
      status: client.status,
      startDate: client.startDate,
      notes: client.notes ?? "",
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

  const activeCount = clients.filter((c) => c.status === "active").length;
  const milzzyCount = clients.filter((c) => c.coach === "Milzzy" && c.status === "active").length;
  const miggyCount = clients.filter((c) => c.coach === "Miggy" && c.status === "active").length;

  const statusPill = (status: Client["status"]) => {
    const map = {
      active: "status-pill-active",
      paused: "status-pill-paused",
      completed: "status-pill-completed",
    };
    return (
      <span className={map[status]} style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif" }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Active", value: activeCount },
          { label: "Milzzy", value: milzzyCount },
          { label: "Miggy", value: miggyCount },
        ].map(({ label, value }) => (
          <div key={label} className="liquid-glass p-4 text-center">
            <p
              className="text-2xl font-semibold"
              style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "#3b82f6" }}
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
            background: "var(--accent-soft)",
            border: "1px solid rgba(59,130,246,0.3)",
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
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-[10px] px-3 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                }}
                placeholder="Client name"
              />
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Coach *
              </label>
              <select
                required
                value={form.coach}
                onChange={(e) => setForm({ ...form, coach: e.target.value as "Milzzy" | "Miggy" })}
                className="w-full rounded-[10px] px-3 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                }}
              >
                <option value="Milzzy">Milzzy</option>
                <option value="Miggy">Miggy</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Status *
              </label>
              <select
                required
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "active" | "paused" | "completed" })
                }
                className="w-full rounded-[10px] px-3 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                }}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
                Start Date *
              </label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full rounded-[10px] px-3 py-2 text-sm transition-colors"
                style={{
                  fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] mb-1 uppercase tracking-wider" style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)" }}>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full rounded-[10px] px-3 py-2 text-sm transition-colors resize-none"
              style={{
                fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
              placeholder="Optional notes..."
            />
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
              style={{
                fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                background: "#3b82f6",
                color: "#ffffff",
              }}
            >
              {editingId ? "Save Changes" : "Add Client"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-[10px] text-sm transition-all duration-200 hover:opacity-80"
              style={{
                fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.60)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="liquid-glass p-8 text-center">
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)", fontSize: "13px" }}>
            Loading...
          </p>
        </div>
      ) : error ? (
        <div className="liquid-glass p-8 text-center">
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "#f87171", fontSize: "13px" }}>
            {error}
          </p>
        </div>
      ) : clients.length === 0 ? (
        <div className="liquid-glass p-8 text-center">
          <p style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.40)", fontSize: "13px" }}>
            No clients yet. Add your first client.
          </p>
        </div>
      ) : (
        <div className="liquid-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {["Name", "Coach", "Status", "Start Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 uppercase tracking-wider"
                      style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.35)", fontSize: "11px" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b last:border-0 transition-colors"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                  >
                    <td
                      className="px-4 py-3"
                      style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.92)" }}
                    >
                      {client.name}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.60)" }}
                    >
                      {client.coach}
                    </td>
                    <td className="px-4 py-3">{statusPill(client.status)}</td>
                    <td
                      className="px-4 py-3"
                      style={{ fontFamily: "system-ui, -apple-system, Inter, sans-serif", color: "rgba(255,255,255,0.60)" }}
                    >
                      {client.startDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(client)}
                          className="text-[11px] px-3 py-1 rounded-[8px] transition-all duration-200 hover:opacity-80"
                          style={{
                            fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.60)",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          disabled={deletingId === client.id}
                          className="text-[11px] px-3 py-1 rounded-[8px] transition-all duration-200 hover:opacity-80 disabled:opacity-40"
                          style={{
                            fontFamily: "system-ui, -apple-system, Inter, sans-serif",
                            background: "rgba(248,113,113,0.15)",
                            color: "#f87171",
                          }}
                        >
                          {deletingId === client.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
