"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/AgentCard";
import { HeartbeatCard } from "@/components/HeartbeatCard";
import { CronCard, type CronJob } from "@/components/CronCard";
import { SubagentCard, type SubAgent } from "@/components/SubagentCard";
import { BusinessCard } from "@/components/BusinessCard";

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

type Tab = "agents" | "clients";

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
    <header className="border-b border-white/5 bg-white/3 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div>
          <h1
            className="text-2xl tracking-widest"
            style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
          >
            <span className="text-accent">JARVIS</span>
            <span className="text-text-muted mx-3">//</span>
            <span className="text-text-primary">MISSION CONTROL</span>
          </h1>
          <p
            className="text-xs mt-1 text-text-secondary tracking-wide"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
          >
            Invictus Physiques AI Stack
          </p>
        </div>
        <span
          className="text-xs text-text-muted uppercase tracking-widest"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          {activeTab === "agents" ? "Agents" : "Clients"}
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
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto
          w-[200px] bg-white/[0.03] border-r border-white/5
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
                w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                ${
                  activeTab === item.id
                    ? "text-text-primary border-l-2 border-accent bg-white/[0.05] pl-[10px]"
                    : "text-text-muted hover:text-text-secondary hover:bg-white/[0.03]"
                }
              `}
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              {item.label}
            </button>
          ))}
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
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
            <span
              className="text-xs tracking-[0.2em] uppercase"
              style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#ef4444" }}
            >
              Stale
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                style={{ backgroundColor: "#06b6d4", opacity: 0.4 }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ backgroundColor: "#06b6d4" }}
              />
            </span>
            <span
              className="text-xs tracking-[0.2em] text-accent uppercase"
              style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
            >
              Live
            </span>
          </span>
        )}
        {secondsAgo !== null && (
          <span
            className="text-xs text-text-muted"
            style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
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
            <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
              {card}
            </div>
          </div>
        ))}
      </div>

      {/* Business stats */}
      <section className="mt-4 group">
        <div className="glass-card p-5 flex flex-col gap-4 transition-all duration-300 group-hover:glow-cyan group-hover:border-border-hover">
          <BusinessCard data={data?.business ?? null} loading={loading} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 mt-4">
        <p
          className="text-xs text-text-muted tracking-wide"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
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
      active: { bg: "bg-status-green/20", text: "text-status-green", label: "Active" },
      paused: { bg: "bg-status-yellow/20", text: "text-status-yellow", label: "Paused" },
      completed: { bg: "bg-white/10", text: "text-text-muted", label: "Completed" },
    };
    const s = map[status];
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
        style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
      >
        {s.label}
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
          <div key={label} className="glass-card p-4 text-center">
            <p
              className="text-2xl"
              style={{ fontFamily: "var(--font-bebas-neue), sans-serif", color: "#06b6d4" }}
            >
              {loading ? "—" : value}
            </p>
            <p
              className="text-xs text-text-muted mt-1"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg tracking-widest"
          style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
        >
          CLIENTS
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:opacity-90"
          style={{
            fontFamily: "var(--font-dm-sans), sans-serif",
            backgroundColor: "#06b6d4",
            color: "#080808",
          }}
        >
          {showForm ? "Cancel" : "+ Add Client"}
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="glass-card p-5 mb-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
                Name *
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                placeholder="Client name"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
                Coach *
              </label>
              <select
                required
                value={form.coach}
                onChange={(e) => setForm({ ...form, coach: e.target.value as "Milzzy" | "Miggy" })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              >
                <option value="Milzzy">Milzzy</option>
                <option value="Miggy">Miggy</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
                Status *
              </label>
              <select
                required
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as "active" | "paused" | "completed" })
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
                Start Date *
              </label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors"
                style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
              style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
              placeholder="Optional notes..."
            />
          </div>
          {formError && (
            <p className="text-xs" style={{ color: "#ef4444", fontFamily: "var(--font-dm-sans), sans-serif" }}>
              {formError}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:opacity-90"
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                backgroundColor: "#06b6d4",
                color: "#080808",
              }}
            >
              {editingId ? "Save Changes" : "Add Client"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg text-sm transition-all duration-200 hover:opacity-80"
              style={{
                fontFamily: "var(--font-dm-sans), sans-serif",
                backgroundColor: "rgba(255,255,255,0.08)",
                color: "#a3a3a3",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      {loading ? (
        <div className="glass-card p-8 text-center">
          <p className="text-text-muted text-sm" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            Loading...
          </p>
        </div>
      ) : error ? (
        <div className="glass-card p-8 text-center">
          <p className="text-status-red text-sm" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            {error}
          </p>
        </div>
      ) : clients.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-text-muted text-sm" style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}>
            No clients yet. Add your first client.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Name", "Coach", "Status", "Start Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs text-text-muted uppercase tracking-wider"
                      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
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
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td
                      className="px-4 py-3 text-text-primary"
                      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                    >
                      {client.name}
                    </td>
                    <td
                      className="px-4 py-3 text-text-secondary"
                      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                    >
                      {client.coach}
                    </td>
                    <td className="px-4 py-3">{statusPill(client.status)}</td>
                    <td
                      className="px-4 py-3 text-text-secondary"
                      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
                    >
                      {client.startDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(client)}
                          className="text-xs px-3 py-1 rounded-md transition-all duration-200 hover:opacity-80"
                          style={{
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            backgroundColor: "rgba(255,255,255,0.08)",
                            color: "#a3a3a3",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          disabled={deletingId === client.id}
                          className="text-xs px-3 py-1 rounded-md transition-all duration-200 hover:opacity-80 disabled:opacity-40"
                          style={{
                            fontFamily: "var(--font-dm-sans), sans-serif",
                            backgroundColor: "rgba(239,68,68,0.15)",
                            color: "#ef4444",
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
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
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
            className="lg:hidden mb-4 p-2 rounded-md hover:bg-white/[0.05] transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-text-primary"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {activeTab === "agents" ? <AgentsTab /> : <ClientsTab />}
        </main>
      </div>
    </div>
  );
}
