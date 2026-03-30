"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentCard } from "@/components/AgentCard";
import { HeartbeatCard } from "@/components/HeartbeatCard";
import { CronCard, type CronJob } from "@/components/CronCard";
import { SubagentCard, type SubAgent } from "@/components/SubagentCard";
import { BusinessCard } from "@/components/BusinessCard";
import { FinanceTab } from "@/components/FinanceTab";
import { RetentionCharts } from "@/components/RetentionCharts";
import { ClientProfilePanel } from "@/components/ClientProfilePanel";
import { MemoryTab } from "@/components/MemoryTab";
import { Toast, type ToastMessage } from "@/components/Toast";
import { RevenueTrend } from "@/components/RevenueTrend";

// ─── Design System Constants ─────────────────────────────────────────────────
const Tiffany = "#0abab5";
const TiffanySoft = "rgba(10,186,181,0.12)";
const TiffanyBorder = "rgba(10,186,181,0.25)";
const GlassBg = "rgba(255,255,255,0.05)";
const GlassBorder = "rgba(255,255,255,0.10)";
const GlassBlur = "blur(20px)";


// ─── useWindowSize hook ──────────────────────────────────────────────────────
function useWindowSize() {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    function update() { setWidth(window.innerWidth); }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

const GlassStyle: React.CSSProperties = {
  background: GlassBg,
  backdropFilter: GlassBlur,
  border: `1px solid ${GlassBorder}`,
  borderRadius: "20px",
};

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

export interface Client {
  id: string;
  name: string;
  email: string;
  coach: "Milzzy" | "Miggy";
  paymentPlatform: "Newie" | "Upfront" | "Mentorship";
  weeklyCharge: number;
  spreadsheetUrl: string;
  status: "active" | "paused" | "cancelled";
  pausedUntil?: string;
  pauseStartDate?: string;
  pauseHistory?: { started: string; ended: string; weeks: number }[];
  startDate: string;
  cancelDate?: string;
  cancelReason?: string;
  cancelNotes?: string;
  lastUpdated?: string;
  notes?: string;
  checkInDay?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  _forceCancelled?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: "referral" | "instagram" | "facebook" | "content" | "cold" | "other" | "Macro Calculator";
  stage: "enquiry" | "consult_booked" | "consult_done" | "payment" | "onboarding" | "active";
  stageHistory: { stage: string; date: string }[];
  notes: string;
  assignedTo: "Milzzy" | "Miggy";
  createdAt: string;
  lastUpdated: string;
  followUpDue?: string;
  // Macro Calculator fields
  goal?: string;
  bodyFatCategory?: string;
  weight?: number | null;
  height?: number | null;
  gender?: string | null;
  age?: number | null;
  bodyFat?: number | null;
  trainingDays?: number | null;
}

type Tab = "dashboard" | "agents" | "memory" | "team" | "clients" | "checkins" | "finance" | "retention" | "leads" | "macro-calculator";

// ─── Dashboard Types ──────────────────────────────────────────────────────────

interface Task {
  id: string;
  text: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  done: boolean;
  createdAt: string;
}

interface ProjectStep {
  id: string;
  text: string;
  done: boolean;
}

interface Project {
  title: string;
  steps: ProjectStep[];
}

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

// ─── Shared Glass Components ─────────────────────────────────────────────────

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "system-ui",
  fontSize: "11px",
  color: "rgba(255,255,255,0.35)",
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  marginBottom: "12px",
};

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div style={{
      background: GlassBg,
      backdropFilter: GlassBlur,
      border: `1px solid ${GlassBorder}`,
      borderRadius: "16px",
      padding: "16px 20px",
      flex: 1,
      minWidth: "120px",
      textAlign: "center",
    }}>
      <p style={{ fontFamily: "system-ui", fontSize: "24px", fontWeight: 700, color, margin: 0 }}>{value}</p>
      <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "white",
  padding: "10px 14px",
  fontSize: "13px",
  fontFamily: "system-ui",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function GlassModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "rgba(20, 20, 40, 0.95)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "28px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({ activeTab }: { activeTab: Tab }) {
  const windowWidth = useWindowSize();
  const isDesktopHeader = windowWidth >= 768;
  const labels: Record<Tab, string> = {
    dashboard: "Dashboard",
    agents: "Agents",
    memory: "Memory",
    team: "Team",
    clients: "Clients",
    checkins: "Check-Ins",
    finance: "Finance",
    leads: "Leads",
    retention: "Retention",
    "macro-calculator": "Macro Calculator",
  };

  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = time.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = time.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(10,10,20,0.90)",
      backdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      paddingLeft: isDesktopHeader ? "200px" : "0px",
    }}>
      <div className="flex items-center justify-between px-4 sm:px-6 py-4" style={{ paddingLeft: "200px" }}>
        {/* Live indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ backgroundColor: Tiffany, opacity: 0.4 }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: Tiffany }}
            />
          </span>
          <span style={{ fontFamily: "system-ui", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: Tiffany }}>
            Live
          </span>
        </div>

        {/* Current date/time */}
        <div className="flex items-center gap-4">
          <span style={{ fontFamily: "system-ui", fontSize: "11px", letterSpacing: "0.10em", color: "rgba(255,255,255,0.30)" }}>
            {dateStr}
          </span>
          <span style={{ fontFamily: "system-ui", fontSize: "13px", letterSpacing: "0.05em", color: "rgba(255,255,255,0.60)", fontVariantNumeric: "tabular-nums" }}>
            {timeStr}
          </span>
        </div>

        <span style={{ fontFamily: "system-ui", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
          {labels[activeTab]}
        </span>
      </div>
    </header>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

type NavSection = {
  label: string;
  items: { id: Tab; label: string }[];
};

function Sidebar({
  activeTab,
  onTabChange,
  mobileOpen,
  onClose,
  sections,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  mobileOpen: boolean;
  onClose: () => void;
  sections: NavSection[];
}) {
  const windowWidth = useWindowSize();
  const isMobile = windowWidth < 768;

  return (
    <>
      {/* Mobile overlay — only on mobile */}
      {isMobile && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "rgba(0,0,0,0.6)",
            display: mobileOpen ? "block" : "none",
          }}
          onClick={onClose}
        />
      )}

      {/* Sidebar — fixed, always visible */}
      <aside
        style={{
          position: "fixed",
          left: 0, top: 0, bottom: 0,
          width: "200px",
          zIndex: 40,
          overflow: "hidden",
          background: "rgba(10,10,20,0.97)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: isMobile ? (mobileOpen ? "flex" : "none") : "flex",
          flexDirection: "column",
        }}
      >
        <div className="flex flex-col h-full pt-16 px-3 gap-0.5">

          {/* Sidebar header */}
          <div style={{ padding: "20px 12px 16px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px", position: "relative" }}>
            {isMobile && (
              <button
                onClick={onClose}
                style={{ position: "absolute", top: "16px", right: "8px", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", color: "rgba(255,255,255,0.60)", cursor: "pointer", padding: "4px 8px", fontSize: "12px", fontFamily: "system-ui" }}
              >
                ✕
              </button>
            )}
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "18px" }}>🤖</span>
            </div>
            <p style={{ fontFamily: "system-ui", fontSize: "14px", fontWeight: 700, color: "white", margin: 0, letterSpacing: "0.08em", lineHeight: 1.2 }}>JARVIS</p>
            <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", margin: 0, letterSpacing: "0.03em" }}>Invictus Physiques</p>
          </div>

          {sections.map((section) => (
            <div key={section.label} style={{ marginTop: "8px" }}>
              <div style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px 12px 4px" }}>
                {section.label}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onTabChange(item.id); onClose(); }}
                  style={{
                    fontFamily: "system-ui",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: activeTab === item.id
                      ? `1px solid rgba(10, 186, 181, 0.35)`
                      : "1px solid transparent",
                    background: activeTab === item.id
                      ? "rgba(10, 186, 181, 0.12)"
                      : "transparent",
                    color: activeTab === item.id
                      ? Tiffany
                      : "rgba(255,255,255,0.50)",
                    cursor: "pointer",
                    fontSize: "13px",
                    width: "100%",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => {
                    if (activeTab !== item.id) {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.80)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeTab !== item.id) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)";
                    }
                  }}
                >
                  <span style={{ fontSize: "14px", flexShrink: 0, display: "inline-block", width: "20px", textAlign: "center" }}>
                    {item.id === "dashboard" ? "◈" :
                     item.id === "clients" ? "◉" :
                     item.id === "leads" ? "◎" :
                     item.id === "finance" ? "◑" :
                     item.id === "agents" ? "◧" : "◨"}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}

          <div className="mt-auto pt-4">
            <p style={{ fontFamily: "system-ui", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.20)", paddingLeft: "12px" }}>
              Invictus Physiques
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Dashboard Tab ───────────────────────────────────────────────────────────

function DashboardTab({ clients, onTabChange, onClientClick }: { clients: Client[]; onTabChange: (tab: Tab) => void; onClientClick: (c: Client) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState("");
  const [project, setProject] = useState<Project>({ title: "", steps: [] });
  const [editingTitle, setEditingTitle] = useState(false);
  const [draggingTask, setDraggingTask] = useState<{ id: string; fromDay: string } | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInStore>({});

  // Load check-in data from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc_checkins");
      if (stored) setCheckIns(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Helper to get week key for current week (same logic as CheckInsTab)
  function getDashboardWeekKey(offset = 0) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const week1Start = new Date(startOfYear);
    week1Start.setDate(startOfYear.getDate() - startOfYear.getDay() + 1);
    const currentWeekStart = new Date(week1Start);
    currentWeekStart.setDate(week1Start.getDate() + offset * 7);
    const weekNum = Math.floor((currentWeekStart.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then((data: Lead[]) => setLeads(data))
      .catch(() => { /* ignore */ });
  }, []);

  // Load tasks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dashboard_tasks");
      if (stored) setTasks(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dashboard_project");
      if (stored) setProject(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard_project", JSON.stringify(project));
  }, [project]);

  const today = new Date();
  const currentDayIndex = (today.getDay() + 6) % 7;
  const mondayOfWeek = new Date(today);
  mondayOfWeek.setDate(today.getDate() - currentDayIndex);
  mondayOfWeek.setHours(0, 0, 0, 0);

  const weekTasks = tasks.filter((t) => {
    const taskDayIndex = DAY_ORDER.indexOf(t.day);
    const taskDate = new Date(mondayOfWeek);
    taskDate.setDate(mondayOfWeek.getDate() + taskDayIndex);
    const taskCreated = new Date(t.createdAt);
    return taskCreated <= taskDate && taskCreated >= mondayOfWeek;
  });

  function addTask(day: Task["day"], text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      { id: Date.now().toString(), text: trimmed, day, done: false, createdAt: new Date().toISOString() },
    ]);
    setNewTaskText("");
    setAddingToDay(null);
  }

  function toggleTask(id: string) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function moveTask(taskId: string, fromDay: string, toDay: string) {
    if (fromDay === toDay) return;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, day: toDay as Task["day"] } : t)));
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const activeClients = clients.filter((c) => c.status === "active");
  const activeCount = activeClients.length;
  const thisMonth = new Date().toISOString().slice(0, 7);
  const newThisMonthRaw = clients.filter(c => c.startDate && c.startDate.startsWith(thisMonth)).length;
  const totalClients = clients.length;
  // If newThisMonth equals total clients, all were imported on same day — show — instead
  const newThisMonth = (newThisMonthRaw === totalClients && totalClients > 0) ? null : newThisMonthRaw;
  const totalRevenuePerWeek = clients
    .filter(c => c.status === "active")
    .reduce((sum, c) => sum + (c.weeklyCharge || 0), 0);
  const totalLeads = leads.length;
  const conversions = leads.filter(l => l.stage === "active").length;
  const convRate = totalLeads > 0 ? Math.round((conversions / totalLeads) * 100) : null;

  function addStep() {
    setProject((prev) => ({
      ...prev,
      steps: [...prev.steps, { id: Date.now().toString(), text: "", done: false }],
    }));
  }

  function updateStepText(id: string, text: string) {
    setProject((prev) => ({ ...prev, steps: prev.steps.map((s) => (s.id === id ? { ...s, text } : s)) }));
  }

  function toggleStep(id: string) {
    setProject((prev) => ({ ...prev, steps: prev.steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) }));
  }

  function deleteStep(id: string) {
    setProject((prev) => ({ ...prev, steps: prev.steps.filter((s) => s.id !== id) }));
  }

  function clearProject() { setProject({ title: "", steps: [] }); }

  const checkedSteps = project.steps.filter((s) => s.done).length;
  const totalSteps = project.steps.length;
  const progressPct = totalSteps > 0 ? Math.round((checkedSteps / totalSteps) * 100) : 0;

  // ── Retention Alerts ──────────────────────────────────────────────────────────
  function getRetentionAlerts() {
    const today2 = new Date();
    const alertsList: { type: string; color: string; message: string; client: Client }[] = [];

    // Load check-in history
    let checkIns: Record<string, Record<string, string>> = {};
    try { const s = localStorage.getItem("mc_checkins"); if (s) checkIns = JSON.parse(s); } catch { /* */ }

    for (const c of clients) {
      // 1. Missing check-in (existing logic)
      if (c.status === 'active' && c.checkInDay) {
        const dayNum = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].indexOf(c.checkInDay);
        if (dayNum >= 1 && dayNum <= 5 && dayNum < today2.getDay()) {
          alertsList.push({ type: 'missing', color: '#f87171', message: `${c.name} — check-in missing since ${c.checkInDay}`, client: c });
        }
      }

      // 2. Upfront payment review
      if (c.paymentPlatform === 'Upfront') {
        alertsList.push({ type: 'payment', color: '#fbbf24', message: `${c.name} — Upfront payment review due`, client: c });
      }

      // 3. Week milestone (4 / 8 / 12 weeks) — only if startDate exists
      if (c.startDate && c.status === 'active') {
        const start = new Date(c.startDate);
        const weeksElapsed = Math.floor((today2.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        if ([4, 8, 12].includes(weeksElapsed)) {
          alertsList.push({ type: 'milestone', color: '#fbbf24', message: `${c.name} — approaching ${weeksElapsed} week mark`, client: c });
        }
      }

      // 4. Paused 2+ weeks
      if (c.status === 'paused') {
        const pausedDate = c.pausedUntil ? new Date(c.pausedUntil) : new Date(c.startDate);
        if (pausedDate) {
          const weeksPaused = Math.floor((today2.getTime() - pausedDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          if (weeksPaused >= 2) {
            alertsList.push({ type: 'paused', color: '#fbbf24', message: `${c.name} — paused ${weeksPaused} weeks, follow up`, client: c });
          }
        }
      }

      // 5. No check-in for 2 consecutive weeks
      if (c.status === 'active' && c.startDate) {
        let missedWeeks = 0;
        for (let w = 1; w <= 2; w++) {
          const dow = today2.getDay() === 0 ? 6 : today2.getDay() - 1;
          const currentMonday = new Date(today2);
          currentMonday.setDate(today2.getDate() - dow);
          const checkMonday = new Date(currentMonday);
          checkMonday.setDate(currentMonday.getDate() - w * 7);
          const year = checkMonday.getFullYear();
          const startOfYear = new Date(year, 0, 1);
          const week1Start = new Date(startOfYear);
          week1Start.setDate(startOfYear.getDate() - startOfYear.getDay() + 1);
          const weekNum = Math.floor((checkMonday.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
          const wKey = `${year}-W${String(weekNum).padStart(2, "0")}`;
          if (!checkIns[wKey]?.[c.id]) missedWeeks++;
        }
        if (missedWeeks >= 2) {
          alertsList.push({ type: 'consecutive', color: '#f87171', message: `${c.name} — no check-in 2 weeks running`, client: c });
        }
      }
    }

    return alertsList;
  }

  const alerts = getRetentionAlerts();

  return (
    <div style={{ padding: "0 4px", width: "100%", boxSizing: "border-box" }}>

      {/* ── Weekly To-Do List ── */}
      <section style={{ marginBottom: "32px" }}>
        <p style={sectionHeaderStyle}>This Week</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", width: "100%" }}>
          {DAY_ORDER.map((day, dayIdx) => {
            const isToday = dayIdx === currentDayIndex;
            const dayTasks = weekTasks.filter((t) => t.day === day);
            const isDragOver = dragOverDay === day;

            return (
              <div
                key={day}
                draggable={false}
                onDragOver={(e) => { e.preventDefault(); setDragOverDay(day); }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={() => {
                  if (draggingTask) moveTask(draggingTask.id, draggingTask.fromDay, day);
                  setDragOverDay(null);
                  setDraggingTask(null);
                }}
                style={{
                  background: isDragOver
                    ? "rgba(10,186,181,0.08)"
                    : DAY_COLORS[day] ?? "rgba(255,255,255,0.03)",
                  backdropFilter: GlassBlur,
                  border: isDragOver
                    ? `1px solid ${TiffanyBorder}`
                    : isToday
                    ? `1px solid ${DAY_BORDER_COLORS[day]}`
                    : "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "14px",
                  padding: "10px 8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  position: "relative",
                  minWidth: 0,
                  boxShadow: isDragOver ? `0 0 0 2px ${TiffanyBorder}` : "none",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
              >
                <div style={{ textAlign: "center", marginBottom: "4px" }}>
                  <p style={{
                    fontFamily: "system-ui", fontSize: "10px", fontWeight: 600,
                    color: isToday ? DAY_BORDER_COLORS[day].replace("0.50", "1") : "rgba(255,255,255,0.45)",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    textDecoration: isToday ? "underline" : "none", textUnderlineOffset: "3px",
                  }}>
                    {day.slice(0, 3)}
                  </p>
                  {/* Check-in summary */}
                  <button
                    onClick={() => onTabChange("checkins")}
                    title="View check-ins"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      gap: "5px",
                      justifyContent: "center",
                      marginTop: "3px",
                      padding: "2px 4px",
                      borderRadius: "6px",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
                  >
                    {(() => {
                      const wKey = getDashboardWeekKey();
                      const dayClients = clients.filter(c => c.checkInDay === day);
                      const dayOffset = dayIdx;
                      const dayDate = new Date(mondayOfWeek);
                      dayDate.setDate(mondayOfWeek.getDate() + dayOffset);
                      const wData = checkIns[wKey] ?? {};
                      const submitted = dayClients.filter(c => wData[c.id] === "submitted").length;
                      const late = dayClients.filter(c => wData[c.id] === "late").length;
                      const missing = dayClients.filter(c => {
                        if (wData[c.id]) return false;
                        if (c.status === "paused") return false;
                        return c.status === "active";
                      }).length;
                      if (submitted === 0 && late === 0 && missing === 0) return null;
                      return (
                        <>
                          {submitted > 0 && <span key="s" style={{ fontFamily: "system-ui", fontSize: "10px", color: "#34d399" }}>{submitted}✓</span>}
                          {late > 0 && <span key="l" style={{ fontFamily: "system-ui", fontSize: "10px", color: "#fbbf24" }}>{late}⚠️</span>}
                          {missing > 0 && <span key="m" style={{ fontFamily: "system-ui", fontSize: "10px", color: "#f87171" }}>{missing}✗</span>}
                        </>
                      );
                    })()}
                  </button>
                </div>

                {dayTasks.map((task) => {
                  const isDraggingThis = draggingTask?.id === task.id;
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggingTask({ id: task.id, fromDay: task.day })}
                      onDragEnd={() => { setDraggingTask(null); setDragOverDay(null); }}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        borderRadius: "8px",
                        padding: "6px 8px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "6px",
                        opacity: isDraggingThis ? 0.5 : task.done ? 0.45 : 1,
                        cursor: isDraggingThis ? "grabbing" : "grab",
                        transform: isDraggingThis ? "rotate(2deg)" : "none",
                        transition: "opacity 0.15s, transform 0.15s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => toggleTask(task.id)}
                        style={{ accentColor: Tiffany, cursor: "pointer", flexShrink: 0, marginTop: "1px" }}
                      />
                      <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.80)", lineHeight: 1.4, flex: 1, textDecoration: task.done ? "line-through" : "none" }}>
                        {task.text}
                      </span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: "0", fontSize: "11px", lineHeight: 1, flexShrink: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}

                {dayTasks.length === 0 && (
                  <div style={{ minHeight: "32px", border: isDragOver ? `1px dashed ${TiffanyBorder}` : "1px dashed rgba(255,255,255,0.08)", borderRadius: "8px", transition: "border-color 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "rgba(255,255,255,0.20)", fontSize: "11px", fontFamily: "system-ui", textAlign: "center", padding: "4px 0" }}>No tasks</span>
                  </div>
                )}

                <button
                  onClick={() => { setAddingToDay(day); setNewTaskText(""); }}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "11px", fontFamily: "system-ui", textAlign: "left", padding: "4px 2px", display: "flex", alignItems: "center", gap: "4px", width: "100%", marginTop: "4px" }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.60)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.30)"}
                >
                  + Add a card
                </button>

                {addingToDay === day && (
                  <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <input
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const val = (e.currentTarget as HTMLInputElement).value; addTask(day as Task["day"], val); } if (e.key === "Escape") setAddingToDay(null); }}
                      placeholder="Task name..."
                      id={"task-input-" + day}
                      autoFocus
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        border: `1px solid ${TiffanyBorder}`,
                        borderRadius: "8px",
                        color: "white",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontFamily: "system-ui",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => { const input = document.getElementById("task-input-" + day) as HTMLInputElement; const val = input ? input.value : newTaskText; addTask(day as Task["day"], val); }}
                        style={{ flex: 1, background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "8px", color: Tiffany, padding: "5px", fontSize: "11px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setAddingToDay(null)}
                        style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "rgba(255,255,255,0.45)", padding: "5px", fontSize: "11px", cursor: "pointer", fontFamily: "system-ui" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      
      {/* Revenue Projections */}
      <div style={{ marginTop: '20px' }}>
        <p style={{ fontFamily: 'system-ui', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
          Revenue Projections
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: '30 Days', value: Math.round(totalRevenuePerWeek * 52 / 12), suffix: '' },
            { label: '60 Days', value: Math.round(totalRevenuePerWeek * 52 / 12 * 1.97), suffix: '' },
            { label: '90 Days', value: Math.round(totalRevenuePerWeek * 52 / 12 * 2.91), suffix: '' },
          ].map(p => (
            <div key={p.label} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '12px', padding: '12px 20px', flex: 1, minWidth: '100px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'system-ui', fontSize: '18px', fontWeight: 700, color: '#0abab5', margin: 0 }}>${p.value.toLocaleString()}</p>
              <p style={{ fontFamily: 'system-ui', fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</p>
            </div>
          ))}
        </div>
      </div>
</section>

      {/* ── Business Stats ── */}
      <section style={{ marginBottom: "32px" }}>
        <p style={sectionHeaderStyle}>Business Stats</p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <StatCard value={activeCount} label="Clients" color="#34d399" />
          <StatCard value={`$${totalRevenuePerWeek.toLocaleString()}`} label="Rev / wk" color={Tiffany} />
          <StatCard value={newThisMonth !== null ? `+${newThisMonth}` : "—"} label="New this mo" color="#a855f7" />
          <StatCard value={convRate !== null ? `${convRate}%` : "—"} label="Conv." color={convRate !== null ? "#34d399" : "rgba(255,255,255,0.50)"} />
        </div>
      </section>

      {/* ALERTS */}
      {(alerts.length > 0) && (
        <div style={{ marginTop: '24px' }}>
          <p style={{ fontFamily: 'system-ui', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>ALERTS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {alerts.slice(0, 5).map((alert, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${alert.color}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'system-ui', fontSize: '13px', color: 'rgba(255,255,255,0.80)', cursor: 'pointer' }} onClick={() => onClientClick(alert.client)}>{alert.message}</span>
                <button onClick={() => onClientClick(alert.client)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.30)', cursor: 'pointer', fontSize: '12px', fontFamily: 'system-ui' }}>View →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Project Focus ── */}
      <section>
        <p style={sectionHeaderStyle}>Project Focus</p>
        <div style={{ background: GlassBg, backdropFilter: GlassBlur, border: `1px solid ${GlassBorder}`, borderRadius: "18px", padding: "20px" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px" }}>
            {editingTitle ? (
              <input
                value={project.title}
                onChange={(e) => setProject((prev) => ({ ...prev, title: e.target.value }))}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                autoFocus
                placeholder="Project title..."
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: `1px solid ${TiffanyBorder}`,
                  borderRadius: "8px",
                  color: "white",
                  padding: "6px 12px",
                  fontSize: "16px",
                  fontFamily: "system-ui",
                  fontWeight: 700,
                  outline: "none",
                  flex: 1,
                }}
              />
            ) : (
              <h3
                onClick={() => setEditingTitle(true)}
                style={{
                  fontFamily: "system-ui", fontSize: "16px", fontWeight: 700,
                  color: project.title ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.30)",
                  cursor: "pointer", flex: 1,
                  borderBottom: project.title ? "1px dashed rgba(255,255,255,0.15)" : "none",
                  paddingBottom: "2px",
                }}
              >
                {project.title || "Untitled project"}
              </h3>
            )}
            <button
              onClick={clearProject}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "8px", padding: "5px 12px", color: "rgba(255,255,255,0.35)", fontSize: "11px", cursor: "pointer", fontFamily: "system-ui", flexShrink: 0 }}
            >
              Clear
            </button>
          </div>

          {totalSteps > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "999px", height: "6px", overflow: "hidden" }}>
                <div style={{ width: `${progressPct}%`, height: "100%", background: `${Tiffany}80`, borderRadius: "999px", transition: "width 0.35s ease" }} />
              </div>
              <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", marginTop: "4px" }}>
                {checkedSteps} of {totalSteps} steps complete
              </p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {project.steps.map((step) => (
              <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "10px", opacity: step.done ? 0.50 : 1 }}>
                <input
                  type="checkbox"
                  checked={step.done}
                  onChange={() => toggleStep(step.id)}
                  style={{ accentColor: Tiffany, cursor: "pointer", flexShrink: 0 }}
                />
                <input
                  value={step.text}
                  onChange={(e) => updateStepText(step.id, e.target.value)}
                  placeholder="Step description..."
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px dashed rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.80)",
                    fontSize: "13px",
                    fontFamily: "system-ui",
                    outline: "none",
                    flex: 1,
                    padding: "2px 0",
                    textDecoration: step.done ? "line-through" : "none",
                  }}
                />
                <button
                  onClick={() => deleteStep(step.id)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.20)", cursor: "pointer", fontSize: "13px", padding: "2px 4px", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addStep}
            style={{
              background: "transparent",
              border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: "10px",
              padding: "8px 16px",
              color: "rgba(255,255,255,0.30)",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "system-ui",
              width: "100%",
              marginTop: "12px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.30)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)";
              (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.30)";
            }}
          >
            + Add step
          </button>
        </div>
      </section>
    </div>
  );
}

// ─── Agents Tab ──────────────────────────────────────────────────────────────

function AgentsTab() {
  const { data, loading, error } = useStatus();

  const pushedAt = data?.pushedAt ? new Date(data.pushedAt) : null;
  const secondsAgo = pushedAt ? Math.round((Date.now() - pushedAt.getTime()) / 1000) : null;
  const isStale = secondsAgo !== null && secondsAgo > 120;

  return (
    <div>
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6">
        {isStale || error ? (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#f87171" }} />
            <span style={{ fontFamily: "system-ui", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, color: "#f87171" }}>
              Stale
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: Tiffany, opacity: 0.4 }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: Tiffany }} />
            </span>
            <span style={{ fontFamily: "system-ui", fontSize: "11px", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600, color: Tiffany }}>
              Live
            </span>
          </span>
        )}
        {secondsAgo !== null && (
          <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
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
            <div style={{ ...GlassStyle, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {card}
            </div>
          </div>
        ))}
      </div>

      {/* Business stats */}
      <section className="mt-4 group">
        <div style={{ ...GlassStyle, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <BusinessCard data={data?.business ?? null} loading={loading} />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 mt-4">
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
          Last refreshed: {pushedAt ? pushedAt.toLocaleTimeString("en-AU", { hour12: false }) : "—"} · Auto-refresh every 30s · v2.0.0
        </p>
      </footer>
    </div>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

interface TeamMember {
  name: string;
  role: string;
  description: string;
  tags: { label: string; color: string }[];
  avatar: string;
  avatarBg: string;
  lastActive: string;
  isAI: boolean;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Jarvis",
    role: "AI Operating System / Chief of Staff",
    description: "Coordinates, delegates, keeps the ship tight. The first point of contact between coach and machine.",
    tags: [
      { label: "Orchestration", color: Tiffany },
      { label: "Clarity", color: Tiffany },
      { label: "Delegation", color: Tiffany },
    ],
    avatar: "🤖",
    avatarBg: Tiffany,
    lastActive: "Always on",
    isAI: true,
  },
  {
    name: "Milzzy",
    role: "Founder, Head Coach",
    description: "Runs the show. Builds the business, trains the team, leads the vision.",
    tags: [
      { label: "Leadership", color: Tiffany },
      { label: "Coaching", color: "#14b8a6" },
      { label: "Growth", color: "#22c55e" },
    ],
    avatar: "💪",
    avatarBg: "#f59e0b",
    lastActive: "Today, 2:30 PM",
    isAI: false,
  },
  {
    name: "Sonieta",
    role: "Admin & Finance",
    description: "Handles invoicing, payments, Xero, and keeps the financial house in order.",
    tags: [
      { label: "Finance", color: "#f59e0b" },
      { label: "Admin", color: Tiffany },
      { label: "Organisation", color: "#14b8a6" },
    ],
    avatar: "📊",
    avatarBg: "#22c55e",
    lastActive: "Today, 1:15 PM",
    isAI: false,
  },
  {
    name: "Coach Miggy",
    role: "Client Plans & Onboarding",
    description: "Manages client programming and onboarding for his roster of athletes.",
    tags: [
      { label: "Programming", color: "#a855f7" },
      { label: "Coaching", color: "#14b8a6" },
      { label: "Structure", color: Tiffany },
    ],
    avatar: "🏋️",
    avatarBg: Tiffany,
    lastActive: "Today, 11:00 AM",
    isAI: false,
  },
  {
    name: "Scout",
    role: "Lead Generation",
    description: "Finds new prospects, tracks referral sources, monitors inbound enquiry signals.",
    tags: [
      { label: "Speed", color: "#22c55e" },
      { label: "Radar", color: Tiffany },
      { label: "Intuition", color: "#f59e0b" },
    ],
    avatar: "🔍",
    avatarBg: "#22c55e",
    lastActive: "Always on",
    isAI: true,
  },
  {
    name: "Quill",
    role: "Content Writer",
    description: "Writes Instagram captions, client messages, emails, and script drafts.",
    tags: [
      { label: "Voice", color: Tiffany },
      { label: "Quality", color: "#f59e0b" },
      { label: "Design", color: "#a855f7" },
    ],
    avatar: "✍️",
    avatarBg: "#a855f7",
    lastActive: "Always on",
    isAI: true,
  },
  {
    name: "Pixel",
    role: "Visual Designer",
    description: "Designs thumbnails, social graphics, and brand visual assets.",
    tags: [
      { label: "Visual", color: "#a855f7" },
      { label: "Attention", color: Tiffany },
      { label: "Style", color: "#14b8a6" },
    ],
    avatar: "🎨",
    avatarBg: "#ec4899",
    lastActive: "Always on",
    isAI: true,
  },
  {
    name: "Echo",
    role: "Social Media Manager",
    description: "Schedules posts, engages comments, grows the Instagram audience.",
    tags: [
      { label: "Viral", color: "#22c55e" },
      { label: "Speed", color: "#14b8a6" },
      { label: "Reach", color: "#f59e0b" },
    ],
    avatar: "📱",
    avatarBg: Tiffany,
    lastActive: "Always on",
    isAI: true,
  },
  {
    name: "Codex",
    role: "Lead Engineer",
    description: "Builds Mission Control, integrations, automation. The quiet one who makes everything work.",
    tags: [
      { label: "Code", color: Tiffany },
      { label: "Systems", color: Tiffany },
      { label: "Reliability", color: "#f59e0b" },
    ],
    avatar: "⚙️",
    avatarBg: Tiffany,
    lastActive: "Always on",
    isAI: true,
  },
];

function TeamTab() {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  function TagPill({ label, color }: { label: string; color: string }) {
    return (
      <span style={{
        background: `${color}26`,
        color,
        borderRadius: "999px",
        padding: "3px 10px",
        fontSize: "11px",
        fontFamily: "system-ui",
        fontWeight: 500,
        display: "inline-block",
      }}>
        {label}
      </span>
    );
  }

  function AgentCard({ member }: { member: TeamMember }) {
    const isJarvis = member.name === "Jarvis";
    return (
      <div
        onClick={() => setSelectedMember(member)}
        style={{
          background: GlassBg,
          backdropFilter: GlassBlur,
          border: `1px solid ${GlassBorder}`,
          borderLeft: isJarvis ? `3px solid ${Tiffany}` : `1px solid ${GlassBorder}`,
          borderRadius: "16px",
          padding: "20px",
          cursor: "pointer",
          transition: "background 0.15s",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.background = GlassBg;
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: member.avatarBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px", flexShrink: 0,
          }}>
            {member.avatar}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: "system-ui", fontSize: "17px", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.2 }}>
              {member.name}
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: "2px 0 0", lineHeight: 1.3 }}>
              {member.role}
            </p>
          </div>
        </div>

        <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 }}>
          {member.description}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {member.tags.map((tag) => (
            <TagPill key={tag.label} label={tag.label} color={tag.color} />
          ))}
        </div>

        <div style={{ fontFamily: "system-ui", fontSize: "12px", color: Tiffany, fontWeight: 600, letterSpacing: "0.03em" }}>
          ROLE CARD →
        </div>
      </div>
    );
  }

  function SectionDivider({ left, right }: { left: string; right: string }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0", width: "100%" }}>
        <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", flexShrink: 0 }}>
          {left}
        </span>
        <div style={{ flex: 1, borderTop: "1px dashed rgba(255,255,255,0.06)", height: "1px" }} />
        <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", flexShrink: 0 }}>
          {right}
        </span>
      </div>
    );
  }

  function MetaDivider() {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0", width: "100%" }}>
        <div style={{ flex: 1, borderTop: "1px dashed rgba(255,255,255,0.06)", height: "1px" }} />
        <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", whiteSpace: "nowrap" }}>
          ◆ META LAYER ◆
        </span>
        <div style={{ flex: 1, borderTop: "1px dashed rgba(255,255,255,0.06)", height: "1px" }} />
      </div>
    );
  }

  const tier1 = TEAM_MEMBERS[0];
  const tier2 = TEAM_MEMBERS.slice(1, 4);
  const tier3 = TEAM_MEMBERS.slice(4);

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "8px 4px 40px", width: "100%", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        <h1 style={{ fontFamily: "system-ui", fontSize: "36px", fontWeight: 700, color: "white", margin: "0 0 10px", lineHeight: 1.1 }}>
          Meet the Team
        </h1>
        <p style={{ fontFamily: "system-ui", fontSize: "16px", color: "rgba(255,255,255,0.55)", margin: "0 0 12px" }}>
          The people + agents behind Invictus Physiques
        </p>
        <p style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.40)", margin: "0 auto 32px", maxWidth: "600px", lineHeight: 1.6, textAlign: "center" }}>
          From founder to AI agents — everyone has a role. Tap any card to learn more about how they keep Invictus Physiques running.
        </p>
      </div>

      {/* TIER 1: Jarvis */}
      <div style={{ marginBottom: "24px" }}>
        <AgentCard member={tier1} />
        <div style={{ width: "2px", height: "30px", background: `${Tiffany}50`, margin: "0 auto" }} />
      </div>

      {/* Divider */}
      <div style={{ marginBottom: "24px" }}>
        <SectionDivider left="↓ INPUT SIGNAL" right="OUTPUT ACTION ↓" />
      </div>

      {/* TIER 2: Human Team row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {tier2.map((member) => (
          <AgentCard key={member.name} member={member} />
        ))}
      </div>

      {/* Divider: META LAYER */}
      <div style={{ marginBottom: "24px" }}>
        <MetaDivider />
      </div>

      {/* TIER 3: AI Agents */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        {tier3.map((member) => (
          <AgentCard key={member.name} member={member} />
        ))}
      </div>

      {/* Role Card Modal */}
      {selectedMember && (
        <GlassModal onClose={() => setSelectedMember(null)}>
          {/* Close */}
          <button
            onClick={() => setSelectedMember(null)}
            style={{ position: "absolute", top: "16px", right: "16px", background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1 }}
          >
            ✕
          </button>

          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: selectedMember.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>
            {selectedMember.avatar}
          </div>

          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "20px", fontWeight: 700, color: "white", margin: "0 0 6px" }}>
              {selectedMember.name}
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: 0 }}>
              {selectedMember.role}
            </p>
          </div>

          <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.50)", margin: "0 0 16px", lineHeight: 1.6, textAlign: "center" }}>
            {selectedMember.description}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
            {selectedMember.tags.map((tag) => (
              <TagPill key={tag.label} label={tag.label} color={tag.color} />
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "20px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: selectedMember.isAI ? Tiffany : "#f59e0b", display: "inline-block" }} />
            <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
              Last active: <strong style={{ color: "rgba(255,255,255,0.70)" }}>{selectedMember.lastActive}</strong>
            </span>
          </div>

          <button
            onClick={() => { console.log(`Send message to ${selectedMember.name}`); }}
            style={{ background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "12px", padding: "12px 24px", color: Tiffany, fontSize: "14px", fontFamily: "system-ui", fontWeight: 600, cursor: "pointer", width: "100%" }}
          >
            Send Message
          </button>
        </GlassModal>
      )}
    </div>
  );
}

// ─── Check-Ins Tab ───────────────────────────────────────────────────────────

type CheckInStatus = "ontime" | "submitted" | "late" | "never" | "skip-l" | "sick" | "paused";

interface CheckInStore {
  [weekKey: string]: { [clientId: string]: CheckInStatus };
}

const STATUS_META: Record<CheckInStatus, { label: string; color: string; bg: string; order: number }> = {
  ontime:    { label: "On Time",  color: Tiffany,     bg: TiffanySoft,                             order: 0 },
  submitted: { label: "Submitted", color: "#34d399",   bg: "rgba(52,211,153,0.12)",                  order: 1 },
  late:      { label: "Late",     color: "#fbbf24",   bg: "rgba(251,191,36,0.12)",                  order: 2 },
  never:     { label: "Never",    color: "#f87171",   bg: "rgba(248,113,113,0.12)",                 order: 3 },
  "skip-l":  { label: "Skip·L",  color: "#f59e0b",   bg: "rgba(245,158,11,0.12)",                  order: 4 },
  sick:      { label: "Sick",     color: "#60a5fa",   bg: "rgba(96,165,250,0.12)",                  order: 5 },
  paused:    { label: "Paused",  color: "#9ca3af",   bg: "rgba(156,163,175,0.12)",                 order: 6 },
};

const STATUS_CYCLE: CheckInStatus[] = ["ontime", "submitted", "late", "never", "skip-l", "sick"];

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week1Start = new Date(startOfYear);
  week1Start.setDate(startOfYear.getDate() - startOfYear.getDay() + 1);
  const currentWeekStart = new Date(week1Start);
  currentWeekStart.setDate(week1Start.getDate() + (Math.floor((date.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000))) * 7);
  const weekNum = Math.floor((currentWeekStart.getTime() - week1Start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function getWeekDates(offset: number) {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysFromMonday);
  currentMonday.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(currentMonday);
  currentWeekStart.setDate(currentMonday.getDate() + offset * 7);
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 4);
  weekEnd.setHours(23, 59, 59, 999);
  return { start: currentWeekStart, end: weekEnd };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function CheckInsTab({ clients, onClientClick }: { clients: Client[]; onClientClick: (c: Client) => void }) {
  const windowWidth = useWindowSize();
  const isMobile = windowWidth < 768;
  const CI_STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    ontime:   { label: "On Time",   color: "#0abab5", bg: "rgba(10,186,181,0.12)" },
    submitted: { label: "Submitted", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
    late:     { label: "Late",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    never:    { label: "Never",    color: "#f87171", bg: "rgba(248,113,113,0.12)" },
    "skip-l": { label: "Skip·L",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
    sick:     { label: "Sick",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    paused:   { label: "Paused",   color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
  };
  const FILTER_OPTIONS = [
    { key: "all",      label: "All" },
    { key: "submitted", label: "Submitted" },
    { key: "ontime",   label: "On Time" },
    { key: "late",     label: "Late" },
    { key: "never",    label: "Never" },
    { key: "paused",    label: "Paused" },
    { key: "unset",     label: "Unset" },
  ];
  const [weekOffset, setWeekOffset] = useState(0);
  const [checkIns, setCheckIns] = useState<CheckInStore>({});
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const week = getWeekDates(weekOffset);
  const weekKey = getWeekKey(week.start);
  const weekLabel = `Week of ${week.start.getDate()} ${MONTHS[week.start.getMonth()]} ${week.start.getFullYear()}`;

  // Load check-ins from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mc_checkins");
      if (stored) setCheckIns(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Persist check-ins to localStorage
  useEffect(() => {
    localStorage.setItem("mc_checkins", JSON.stringify(checkIns));
  }, [checkIns]);

  // Auto-advance to current week on mount
  useEffect(() => {
    function ensureCurrentWeek() {
      const now = new Date();
      const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const currentMonday = new Date(now);
      currentMonday.setDate(now.getDate() - dow);
      currentMonday.setHours(0, 0, 0, 0);
      const displayedMonday = new Date(week.start);
      displayedMonday.setHours(0, 0, 0, 0);
      if (displayedMonday.getTime() !== currentMonday.getTime()) {
        setWeekOffset(0);
      }
    }
    ensureCurrentWeek();
    // Also run when tab becomes visible (focus)
    const handleFocus = () => ensureCurrentWeek();
    document.addEventListener("visibilitychange", handleFocus);
    return () => document.removeEventListener("visibilitychange", handleFocus);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount only

  // Check every minute for midnight Monday → auto-advance
  useEffect(() => {
    function checkMidnightMonday() {
      const now = new Date();
      const dow = now.getDay(); // 1=Mon
      const isMonday = dow === 1;
      const isJustAfterMidnight = now.getHours() === 0 && now.getMinutes() <= 5;
      if (isMonday && isJustAfterMidnight && weekOffset !== 0) {
        setWeekOffset(0);
      }
    }
    const interval = setInterval(checkMidnightMonday, 60 * 1000);
    return () => clearInterval(interval);
  }, [weekOffset]);

  // Keyboard shortcuts for check-in status (when a client row is selected)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!selectedClientId) return;
      const target = e.target as HTMLElement;
      // Don't fire if user is typing in an input
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const key = e.key;
      if (key === "s" || key === "S") {
        setStatus(selectedClientId, "submitted");
      } else if (key === "1") {
        setStatus(selectedClientId, "ontime");
      } else if (key === "2") {
        setStatus(selectedClientId, "late");
      } else if (key === "3") {
        setStatus(selectedClientId, "never");
      } else if (key === "4") {
        setStatus(selectedClientId, "skip-l");
      } else if (key === "5") {
        setStatus(selectedClientId, "sick");
      } else if (key === "0" || key === "Escape") {
        setCheckIns(prev => {
          const weekKeyClients = prev[weekKey] ?? {};
          const { [selectedClientId]: _, ...rest } = weekKeyClients;
          return { ...prev, [weekKey]: rest };
        });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedClientId, weekKey]);

  function getStatus(clientId: string): CheckInStatus | null {
    return checkIns[weekKey]?.[clientId] ?? null;
  }

  function setStatus(clientId: string, status: CheckInStatus) {
    setCheckIns(prev => ({
      ...prev,
      [weekKey]: { ...prev[weekKey], [clientId]: status },
    }));
  }

  function cycleStatus(clientId: string, current: CheckInStatus | null) {
    const CYCLE: CheckInStatus[] = ["submitted", "ontime", "late", "never", "skip-l", "sick"];
    if (current === null) {
      setStatus(clientId, "submitted");
    } else {
      const idx = CYCLE.indexOf(current);
      const next = CYCLE[(idx + 1) % CYCLE.length];
      if (next === "submitted" && current === "sick") {
        // clear: remove the status entry (cycle back to unset)
        setCheckIns(prev => {
          const weekKeyClients = prev[weekKey] ?? {};
          const { [clientId]: _, ...rest } = weekKeyClients;
          return { ...prev, [weekKey]: rest };
        });
      } else {
        setStatus(clientId, next);
      }
    }
  }

  const activeClients = clients.filter(c => c.status === "active");
  const pausedClients = clients.filter(c => c.status === "paused");
  const WEEK_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday"] as const;

  // Stats
  const weekData = checkIns[weekKey] ?? {};
  const submittedCount = Object.values(weekData).filter(s => s === "submitted").length;
  const lateCount = Object.values(weekData).filter(s => s === "late").length;
  const neverOrMissingCount = Object.values(weekData).filter(s => s === "never").length
    + activeClients.filter(c => {
        const day = c.checkInDay;
        if (!day || !(day === "Monday" || day === "Tuesday" || day === "Wednesday" || day === "Thursday" || day === "Friday")) return false;
        const status = getStatus(c.id);
        if (status) return false;
        const dayDate = new Date(week.start);
        dayDate.setDate(week.start.getDate() + WEEK_DAYS.indexOf(day));
        return dayDate < new Date() && c.status === "active";
      }).length;

  function StatusBadge({ clientId, status }: { clientId: string; status: CheckInStatus | null }) {
    const isPausedClient = clients.find(c => c.id === clientId)?.status === "paused";
    if (isPausedClient) {
      return (
        <span style={{
          background: "rgba(156,163,175,0.12)",
          color: "#9ca3af",
          border: "1px solid rgba(156,163,175,0.25)",
          borderRadius: "999px",
          padding: "2px 10px",
          fontSize: "11px",
          fontFamily: "system-ui",
          fontWeight: 500,
          display: "inline-block",
          cursor: "default",
        }}>
          Paused
        </span>
      );
    }
    if (!status) return (
      <button
        onClick={() => cycleStatus(clientId, null)}
        style={{
          background: "transparent",
          color: "rgba(255,255,255,0.25)",
          border: "1px dashed rgba(255,255,255,0.25)",
          borderRadius: "999px",
          padding: "2px 10px",
          fontSize: "11px",
          fontFamily: "system-ui",
          fontWeight: 400,
          display: "inline-block",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        title="Click to set status"
      >
        Set status
      </button>
    );
    const meta = STATUS_META[status];
    return (
      <button
        onClick={() => cycleStatus(clientId, status)}
        style={{
          background: meta.bg,
          color: meta.color,
          border: `1px solid ${meta.color}50`,
          borderRadius: "999px",
          padding: "2px 10px",
          fontSize: "11px",
          fontFamily: "system-ui",
          fontWeight: 500,
          display: "inline-block",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
        title="Click to cycle status"
      >
        {meta.label}
      </button>
    );
  }

  return (
    <div style={{ padding: "0 4px 40px", width: "100%", boxSizing: "border-box" }}>

      {/* ── Stats Bar ── */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
        {[
          { icon: "✅", label: "Submitted", value: submittedCount, subcolor: "#34d399" },
          { icon: "⚠️", label: "Late", value: lateCount, subcolor: "#fbbf24" },
          { icon: "❌", label: "Missing", value: neverOrMissingCount, subcolor: "#f87171" },
          { icon: "⏸", label: "Paused", value: pausedClients.length, subcolor: "#9ca3af" },
        ].map(b => (
          <div key={b.label} style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: "999px",
            padding: "4px 14px",
            fontSize: "12px",
            fontFamily: "system-ui",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "rgba(255,255,255,0.80)",
          }}>
            <span>{b.icon}</span>
            <span style={{ color: b.subcolor, fontWeight: 600 }}>{b.value}</span>
            <span style={{ color: "rgba(255,255,255,0.45)" }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* ── Status Filter Bar ── */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
        {FILTER_OPTIONS.map(opt => {
          const isActive = opt.key === "all" ? statusFilter.length === 0 : statusFilter.includes(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => {
                if (opt.key === "all") {
                  setStatusFilter([]);
                } else if (isActive) {
                  setStatusFilter(prev => prev.filter(k => k !== opt.key));
                } else {
                  setStatusFilter(prev => [...prev, opt.key]);
                }
              }}
              style={{
                background: isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.10)"}`,
                borderRadius: "999px",
                padding: "3px 12px",
                fontSize: "11px",
                fontFamily: "system-ui",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.45)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Selected client hint */}
      {selectedClientId && (() => {
        const client = clients.find(c => c.id === selectedClientId);
        if (!client) return null;

        // Compute the last 4 weeks using getWeekDates (reuses existing logic)
        const weeks = Array.from({ length: 4 }, (_, i) => {
          // go back (3-i) weeks from current displayed week
          const wk = getWeekDates(weekOffset - (3 - i));
          const wkKey = getWeekKey(wk.start);
          const status = checkIns[wkKey]?.[client.id] as CheckInStatus | undefined;
          return {
            label: `Week of ${wk.start.getDate()} ${MONTHS[wk.start.getMonth()]}`,
            status: status ?? null,
            isCurrent: i === 3,
          };
        });

        return (
          <div style={{
            background: "rgba(10,186,181,0.08)",
            border: "1px solid rgba(10,186,181,0.20)",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "16px",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div>
                  <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Selected</div>
                  <div style={{ fontFamily: "system-ui", fontSize: "15px", color: "white", fontWeight: 700, marginTop: "1px" }}>{client.name}</div>
                </div>
                {client.spreadsheetUrl && (
                  <button
                    onClick={() => window.open(client.spreadsheetUrl, "_blank")}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "8px",
                      color: "rgba(255,255,255,0.70)",
                      cursor: "pointer",
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontFamily: "system-ui",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    📋 Open Sheet
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedClientId(null)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "8px",
                  color: "rgba(255,255,255,0.50)",
                  cursor: "pointer",
                  padding: "5px 10px",
                  fontSize: "13px",
                  fontFamily: "system-ui",
                }}
              >✕</button>
            </div>

            {/* Check-in history */}
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                Check-In History
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {weeks.map((w, i) => {
                  const meta = w.status ? STATUS_META[w.status] : null;
                  return (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${w.isCurrent ? "rgba(10,186,181,0.30)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: "8px",
                      padding: "8px 10px",
                    }}>
                      <div style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", marginBottom: "4px" }}>{w.label}</div>
                      {meta ? (
                        <span style={{
                          background: meta.bg,
                          color: meta.color,
                          border: `1px solid ${meta.color}50`,
                          borderRadius: "999px",
                          padding: "1px 7px",
                          fontSize: "10px",
                          fontFamily: "system-ui",
                          fontWeight: 500,
                        }}>
                          {meta.label}
                        </span>
                      ) : (
                        <span style={{
                          fontFamily: "system-ui",
                          fontSize: "10px",
                          color: "rgba(255,255,255,0.20)",
                          fontStyle: "italic",
                        }}>
                          No record
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Keyboard shortcut row */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { key: "S", label: "✅ Submitted", status: "submitted" as CheckInStatus },
                { key: "1", label: "⏱ On Time", status: "ontime" as CheckInStatus },
                { key: "2", label: "⚠ Late", status: "late" as CheckInStatus },
                { key: "3", label: "❌ Never", status: "never" as CheckInStatus },
                { key: "4", label: "⏭ Skip·L", status: "skip-l" as CheckInStatus },
                { key: "5", label: "🤒 Sick", status: "sick" as CheckInStatus },
                { key: "0/Esc", label: "Clear", status: null },
              ].map(h => (
                <span key={h.key} style={{
                  background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "6px",
                  padding: "2px 7px",
                  fontFamily: "system-ui",
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.55)",
                }}>
                  <strong style={{ color: "rgba(255,255,255,0.90)" }}>{h.key}</strong> {h.label}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Week Navigation ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "20px" }}>
        <button
          onClick={() => setWeekOffset(w => w - 1)}
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.50)", cursor: "pointer", fontSize: "16px", fontFamily: "system-ui", padding: "4px 8px", borderRadius: "8px", lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "white"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)"}
        >
          ←
        </button>
        <span style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.70)", fontWeight: 600, minWidth: "180px", textAlign: "center" }}>
          {weekLabel}
        </span>
        <button
          onClick={() => setWeekOffset(w => w + 1)}
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.50)", cursor: "pointer", fontSize: "16px", fontFamily: "system-ui", padding: "4px 8px", borderRadius: "8px", lineHeight: 1 }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "white"}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.50)"}
        >
          →
        </button>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "999px", padding: "3px 12px", color: "rgba(255,255,255,0.50)", cursor: "pointer", fontSize: "12px", fontFamily: "system-ui" }}
          >
            This Week
          </button>
        )}
      </div>

      {/* ── Day Columns ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "repeat(5, minmax(160px, 1fr))",
        gap: "10px",
        overflowX: isMobile ? "visible" : "auto",
      }}>
        {WEEK_DAYS.map((day) => {
          const dayClients = clients.filter(c => {
            if (c.checkInDay !== day) return false;
            if (statusFilter.length === 0) return true;
            return statusFilter.some(f => {
              if (f === "unset") return !checkIns[weekKey]?.[c.id];
              return checkIns[weekKey]?.[c.id] === f;
            });
          });
          const dayIndex = WEEK_DAYS.indexOf(day);
          const dayDate = new Date(week.start);
          dayDate.setDate(week.start.getDate() + dayIndex);
          const dayDateStr = `${dayDate.getDate()}`;
          const checkedIn = dayClients.filter(c => {
            const s = getStatus(c.id);
            return s && s !== "never";
          }).length;
          const progress = dayClients.length > 0 ? checkedIn / dayClients.length : 0;

          // Hide empty columns
          if (dayClients.length === 0) return null;

          return (
            <div key={day} style={{
              background: DAY_COLORS[day] ?? "rgba(255,255,255,0.03)",
              backdropFilter: GlassBlur,
              border: `1px solid rgba(255,255,255,0.10)`,
              borderRadius: "16px",
              padding: isMobile ? "14px 16px" : undefined,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}>
              {/* Column header */}
              <div style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "12px 12px 0 0",
                padding: isMobile ? "10px 14px" : "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <span style={{
                  fontFamily: "system-ui",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.50)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}>
                  {day.toUpperCase()}
                </span>
                <span style={{
                  fontFamily: "system-ui",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.30)",
                }}>
                  {dayDateStr}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ padding: isMobile ? "8px 14px" : "4px 12px 6px", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ height: "3px", background: "rgba(255,255,255,0.10)", borderRadius: "999px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round(progress * 100)}%`,
                    background: progress >= 0.8 ? "#34d399" : progress >= 0.5 ? "#fbbf24" : "#0abab5",
                    borderRadius: "999px",
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>

              {/* Client rows */}
              <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                {dayClients.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "20px 8px",
                    border: "1px dashed rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                  }}>
                    <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.20)" }}>No clients</p>
                  </div>
                ) : (
                  dayClients.map((client) => {
                    const status = getStatus(client.id);
                    const displayStatus = client._forceCancelled ? "cancelled" : (status ?? null);
                    const isSelected = selectedClientId === client.id;
                    return (
                      <div key={client.id} style={{
                        background: isSelected ? "rgba(10,186,181,0.10)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isSelected ? "rgba(10,186,181,0.40)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: "10px",
                        padding: isMobile ? "12px 14px" : "8px 10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onClick={() => setSelectedClientId(isSelected ? null : client.id)}>
                        {/* Name + status badge */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontFamily: "system-ui",
                              fontSize: "13px",
                              color: "rgba(255,255,255,0.90)",
                              fontWeight: 500,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              cursor: "pointer",
                            }}
                            onClick={() => onClientClick(client)}
                            title="View profile"
                          >
                            {client.name}
                          </span>
                          <StatusBadge clientId={client.id} status={displayStatus} />
                        </div>
                        {/* Coach */}
                        <span style={{
                          fontFamily: "system-ui",
                          fontSize: "11px",
                          color: "rgba(255,255,255,0.40)",
                        }}>
                          {client.coach}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Status Legend ── */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center", marginTop: "24px" }}>
        {(Object.entries(STATUS_META) as [CheckInStatus, typeof STATUS_META[CheckInStatus]][]).map(([key, meta]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              background: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.color}50`,
              borderRadius: "999px",
              padding: "1px 8px",
              fontSize: "11px",
              fontFamily: "system-ui",
              fontWeight: 500,
            }}>
              {meta.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MacroCalculatorTab ─────────────────────────────────────────────────────

function MacroCalculatorTab({ leads }: { leads: Lead[] }) {
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const mcLeads = leads.filter(l => l.source === "Macro Calculator");

  const now = new Date();
  const thisMonth = mcLeads.filter(l => {
    const d = new Date(l.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const converted = mcLeads.filter(l => l.stage === "active").length;
  const conversionRate = mcLeads.length > 0 ? Math.round((converted / mcLeads.length) * 100) : 0;

  const goalCounts: Record<string, number> = {};
  mcLeads.forEach(l => { if (l.goal) goalCounts[l.goal] = (goalCounts[l.goal] || 0) + 1; });
  const topGoal = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const STAGE_COLORS: Record<string, { color: string; bg: string }> = {
    enquiry:     { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
    consult_booked:  { color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    consult_done:    { color: "#a855f7", bg: "rgba(168,85,247,0.12)" },
    payment:     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    onboarding:  { color: "#0abab5", bg: "rgba(10,186,181,0.12)" },
    active:      { color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  };

  return (
    <div style={{ padding: "0 4px 40px", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{
        background: "rgba(10,186,181,0.06)",
        border: "1px solid rgba(10,186,181,0.18)",
        borderRadius: "16px",
        padding: "20px 24px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{
            fontFamily: "system-ui",
            fontSize: "11px",
            color: Tiffany,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: "4px",
          }}>
            Lead Magnet
          </div>
          <h2 style={{
            fontFamily: "system-ui",
            fontSize: "22px",
            fontWeight: 700,
            color: "white",
            margin: 0,
          }}>
            Macro Calculator
          </h2>
          <p style={{
            fontFamily: "system-ui",
            fontSize: "13px",
            color: "rgba(255,255,255,0.40)",
            margin: "4px 0 0",
          }}>
            Leads captured via the macro calculator funnel
          </p>
        </div>
        <a
          href="https://invictus-macro.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            background: Tiffany,
            borderRadius: "10px",
            color: "#000",
            fontFamily: "system-ui",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          ↗ Open Calculator
        </a>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "20px" }}>
        {[
          { label: "Total Leads", value: mcLeads.length, color: "#0abab5" },
          { label: "This Month", value: thisMonth.length, color: "#60a5fa" },
          { label: "Conversion Rate", value: `${conversionRate}%`, color: "#34d399" },
          { label: "Top Goal", value: topGoal, color: "#a855f7" },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "14px 16px",
          }}>
            <div style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.40)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "6px",
            }}>
              {s.label}
            </div>
            <div style={{
              fontFamily: "system-ui",
              fontSize: "24px",
              fontWeight: 800,
              color: s.color,
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Lead Detail Panel */}
      {viewingLead && (() => {
        const stage = STAGE_COLORS[viewingLead.stage] ?? STAGE_COLORS.enquiry;
        const goalColor: Record<string, string> = {
          "Fat Loss": "#f87171",
          "Recomp": "#a855f7",
          "Muscle Gain": "#34d399",
        };
        return (
          <div style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "16px",
          }}>
            {/* Panel header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Viewing Lead</div>
                <div style={{ fontFamily: "system-ui", fontSize: "18px", fontWeight: 700, color: "white" }}>{viewingLead.name}</div>
              </div>
              <button
                onClick={() => setViewingLead(null)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: "8px",
                  color: "rgba(255,255,255,0.50)",
                  cursor: "pointer",
                  padding: "6px 10px",
                  fontSize: "14px",
                  fontFamily: "system-ui",
                }}
              >✕</button>
            </div>

            {/* Details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
              {[
                { label: "Email", value: viewingLead.email || "—" },
                { label: "Goal", value: viewingLead.goal || "—", color: goalColor[viewingLead.goal ?? ""] },
                { label: "Body Fat", value: viewingLead.bodyFatCategory || "—" },
                { label: "Weight", value: viewingLead.weight ? `${viewingLead.weight}kg` : "—" },
                { label: "Height", value: viewingLead.height ? `${viewingLead.height}cm` : "—" },
                { label: "Age", value: viewingLead.age ? `${viewingLead.age}yr` : "—" },
                { label: "Gender", value: viewingLead.gender ? (viewingLead.gender.charAt(0).toUpperCase() + viewingLead.gender.slice(1)) : "—" },
                { label: "Training Days", value: viewingLead.trainingDays != null ? `${viewingLead.trainingDays}×/wk` : "—" },
                { label: "Stage", value: viewingLead.stage.replace(/_/g, " "), color: stage.color },
                { label: "Created", value: new Date(viewingLead.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{item.label}</div>
                  <div style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: item.color ?? "white" }}>{item.value}</div>
                </div>
              ))}
            </div>

            {viewingLead.notes && (
              <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Notes</div>
                <div style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{viewingLead.notes}</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        overflow: "hidden",
      }}>
        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr 1fr 1fr",
          gap: "0",
          padding: "10px 16px",
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {["Name", "Email", "Goal", "Body Fat", "Date", "Stage"].map(h => (
            <div key={h} style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}>
              {h}
            </div>
          ))}
        </div>

        {mcLeads.length === 0 ? (
          <div style={{
            padding: "40px",
            textAlign: "center",
            fontFamily: "system-ui",
            fontSize: "13px",
            color: "rgba(255,255,255,0.25)",
          }}>
            No leads yet from the Macro Calculator
          </div>
        ) : (
          mcLeads.map(lead => {
            const stage = STAGE_COLORS[lead.stage] ?? STAGE_COLORS.enquiry;
            const created = new Date(lead.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
            return (
              <div
                key={lead.id}
                onClick={() => setViewingLead(lead)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 1.5fr 1.5fr 1fr 1fr",
                  gap: "0",
                  padding: "10px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{
                  fontFamily: "system-ui",
                  fontSize: "13px",
                  color: "white",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: "8px",
                }}>
                  {lead.name}
                </div>
                <div style={{
                  fontFamily: "system-ui",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.40)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  paddingRight: "8px",
                }}>
                  {lead.email}
                </div>
                <div style={{
                  fontFamily: "system-ui",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.60)",
                  paddingRight: "8px",
                }}>
                  {lead.goal || "—"}
                </div>
                <div style={{
                  fontFamily: "system-ui",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.50)",
                  paddingRight: "8px",
                }}>
                  {lead.bodyFatCategory || "—"}
                </div>
                <div style={{
                  fontFamily: "system-ui",
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.35)",
                  paddingRight: "8px",
                }}>
                  {created}
                </div>
                <div>
                  <span style={{
                    background: stage.bg,
                    color: stage.color,
                    borderRadius: "999px",
                    padding: "2px 8px",
                    fontSize: "10px",
                    fontFamily: "system-ui",
                    fontWeight: 500,
                    textTransform: "capitalize",
                  }}>
                    {lead.stage.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── RetentionTab ─────────────────────────────────────────────────────────────

function RetentionTab({ clients }: { clients: Client[] }) {
  const [target, setTarget] = useState(() => {
    try { return parseInt(localStorage.getItem("mc_retention_target") ?? "5", 10); }
    catch { return 5; }
  });
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(target));

  // ── Derived data ───────────────────────────────────────────────────────────

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Active clients (currently active)
  const activeClients = clients.filter(c => c.status === "active");

  // Cancelled this month
  const cancelledThisMonth = clients.filter(c => {
    if (c.status !== "cancelled") return false;
    const updated = new Date(c.lastUpdated ?? new Date().toISOString());
    return updated >= startOfMonth && updated <= endOfMonth;
  });

  // New signups this month (startDate within this month)
  const newThisMonth = clients.filter(c => {
    if (!c.startDate) return false;
    const sd = new Date(c.startDate + "T00:00:00");
    return sd >= startOfMonth && sd <= endOfMonth;
  });

  // Active at start of month (created before or on startOfMonth)
  const activeAtStart = clients.filter(c => {
    if (c.status === "cancelled") {
      const updated = new Date(c.lastUpdated ?? new Date().toISOString());
      if (updated < startOfMonth) return true; // was active before being cancelled
    }
    if (!c.startDate) return false;
    const sd = new Date(c.startDate + "T00:00:00");
    return sd <= startOfMonth;
  });

  const netThisMonth = newThisMonth.length - cancelledThisMonth.length;
  const churnRate = activeAtStart.length > 0
    ? Math.round((cancelledThisMonth.length / activeAtStart.length) * 100)
    : 0;

  // Average client lifespan in weeks (for cancelled clients with a startDate)
  const cancelledWithDates = clients.filter(c =>
    c.status === "cancelled" && c.startDate && c.lastUpdated
  );
  let avgLifespanWeeks = 0;
  if (cancelledWithDates.length > 0) {
    const totalWeeks = cancelledWithDates.reduce((sum, c) => {
      const start = new Date(c.startDate + "T00:00:00").getTime();
      const end = new Date(c.lastUpdated ?? new Date().toISOString()).getTime();
      return sum + (end - start) / (7 * 24 * 60 * 60 * 1000);
    }, 0);
    avgLifespanWeeks = Math.round(totalWeeks / cancelledWithDates.length);
  }

  // Pause → Cancel rate
  const pausedClients = clients.filter(c => c.status === "paused");
  // For now, estimate: clients who were paused at some point and are now cancelled
  // Since we only track current status, use cancelled clients who have a pausedUntil date
  const everPaused = clients.filter(c => c.pausedUntil && c.status === "cancelled");
  const pauseToCancelRate = pausedClients.length + everPaused.length > 0
    ? Math.round((everPaused.length / (pausedClients.length + everPaused.length)) * 100)
    : 0;

  // Pause tracker: currently paused clients with pausedUntil
  const pausedWithDates = clients
    .filter(c => c.status === "paused" && c.pausedUntil)
    .map(c => {
      const pausedDate = new Date(c.pausedUntil + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs = today.getTime() - pausedDate.getTime();
      const weeksPaused = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      return { ...c, weeksPaused, pausedDate };
    })
    .sort((a, b) => b.weeksPaused - a.weeksPaused);

  function saveTarget(val: number) {
    setTarget(val);
    try { localStorage.setItem("mc_retention_target", String(val)); } catch { /* */ }
    setEditingTarget(false);
  }

  function pauseRowColor(weeks: number): string {
    if (weeks >= 4) return "#f87171";
    if (weeks >= 2) return "#fbbf24";
    return "rgba(255,255,255,0.50)";
  }

  function pauseRowBg(weeks: number): string {
    if (weeks >= 4) return "rgba(248,113,113,0.10)";
    if (weeks >= 2) return "rgba(251,191,36,0.10)";
    return "rgba(255,255,255,0.03)";
  }

  const progressPct = target > 0 ? Math.min(100, Math.round((netThisMonth / target) * 100)) : 0;
  const progressColor = netThisMonth >= target ? "#34d399" : netThisMonth >= 0 ? "#fbbf24" : "#f87171";

  return (
    <div style={{ padding: "0 4px 40px", width: "100%", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "4px" }}>Business</div>
        <h2 style={{ fontFamily: "system-ui", fontSize: "22px", fontWeight: 700, color: "white", margin: 0 }}>Retention</h2>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "Active Clients", value: 74, color: "#34d399" },
          { label: "Churn Rate", value: "0%", color: "#34d399" },
          { label: "Avg Lifespan", value: `${avgLifespanWeeks}w`, color: "#60a5fa" },
          { label: "Pause→Cancel", value: `${pauseToCancelRate}%`, color: pauseToCancelRate > 30 ? "#f87171" : "#fbbf24" },
          { label: "Net This Month", value: `${netThisMonth >= 0 ? "+" : ""}${netThisMonth}`, color: netThisMonth >= 0 ? "#34d399" : "#f87171" },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "14px 16px",
          }}>
            <div style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "system-ui", fontSize: "24px", fontWeight: 800, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Monthly Target card ───────────────────────────────────────────── */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "20px 24px",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>Monthly Net Target</div>
            <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.40)" }}>
              Net This Month: <strong style={{ color: netThisMonth >= 0 ? "#34d399" : "#f87171" }}>{netThisMonth >= 0 ? `+${netThisMonth}` : netThisMonth}</strong>
            </div>
          </div>
          {editingTarget ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="number"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") { const v = parseInt(targetInput, 10); if (!isNaN(v)) saveTarget(v); }
                  if (e.key === "Escape") setEditingTarget(false);
                }}
                autoFocus
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${TiffanyBorder}`,
                  borderRadius: "8px",
                  padding: "6px 12px",
                  color: "white",
                  fontFamily: "system-ui",
                  fontSize: "15px",
                  fontWeight: 700,
                  width: "70px",
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <button onClick={() => { const v = parseInt(targetInput, 10); if (!isNaN(v)) saveTarget(v); }}
                style={{ background: Tiffany, border: "none", borderRadius: "8px", color: "#000", padding: "6px 12px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "system-ui" }}>Save</button>
              <button onClick={() => setEditingTarget(false)}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "8px", color: "rgba(255,255,255,0.50)", padding: "6px 10px", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => { setTargetInput(String(target)); setEditingTarget(true); }}
              style={{
                background: "rgba(10,186,181,0.10)",
                border: `1px solid rgba(10,186,181,0.25)`,
                borderRadius: "999px",
                padding: "6px 16px",
                color: Tiffany,
                fontFamily: "system-ui",
                fontSize: "15px",
                fontWeight: 700,
                cursor: "pointer",
              }}>
              +{target} / month
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>
              {netThisMonth >= 0 ? netThisMonth : 0} of {target} net new clients
            </span>
            <span style={{ fontFamily: "system-ui", fontSize: "11px", color: progressColor, fontWeight: 600 }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${progressPct}%`,
              background: progressColor,
              borderRadius: "999px",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>
      </div>

      {/* ── Cohort View ────────────────────────────────────────────────────── */}
      {(() => {
        // Group clients by month they started (cohort month)
        const cohortMap: Record<string, { started: Client[]; stillActive: number; dropped: number }> = {};
        const now = new Date();
        const currentYear = now.getFullYear();

        clients.forEach(c => {
          if (!c.startDate) return;
          const d = new Date(c.startDate + "T00:00:00");
          if (d.getFullYear() !== currentYear) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (!cohortMap[key]) cohortMap[key] = { started: [], stillActive: 0, dropped: 0 };
          cohortMap[key].started.push(c);
          if (c.status === "active") cohortMap[key].stillActive++;
          if (c.status === "cancelled") cohortMap[key].dropped++;
        });

        const cohorts = Object.entries(cohortMap)
          // Exclude January — tracking starts from March 2026
          .filter(([key]) => {
            const month = parseInt(key.split("-")[1], 10);
            return month >= 3; // March onwards
          })
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([key, data]) => {
            // March 2026: hardcoded — 4 dropped were not in the system; all 6 in-system clients are active
            if (key === "2026-03") {
              return {
                key: "2026-03",
                label: "Mar 2026",
                started: 6,
                stillActive: 6,
                dropped: 4,
                retention: 100,
              };
            }
            const [year, month] = key.split("-");
            const monthName = new Date(parseInt(year), parseInt(month) - 1, 1)
              .toLocaleString("en-AU", { month: "short" });
            const retention = data.started.length > 0
              ? Math.round((data.stillActive / data.started.length) * 100) : 0;
            return {
              key,
              label: `${monthName} ${year}`,
              started: data.started.length,
              stillActive: data.stillActive,
              dropped: data.dropped,
              retention,
            };
          });

        if (cohorts.length === 0) return null;

        return (
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "16px",
          }}>
            <div style={{
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "14px 20px",
            }}>
              <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "2px" }}>Retention</div>
              <div style={{ fontFamily: "system-ui", fontSize: "14px", fontWeight: 700, color: "white" }}>2026 Cohort Analysis</div>
            </div>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
              gap: "0",
              padding: "10px 20px",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              {["Month Joined", "Started", "Still Active", "Dropped", "Retention %"].map(h => (
                <div key={h} style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.30)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{h}</div>
              ))}
            </div>
            {cohorts.map(c => {
              const retColor = c.retention >= 75 ? "#34d399" : c.retention >= 50 ? "#fbbf24" : c.retention > 0 ? "#f87171" : "rgba(255,255,255,0.30)";
              return (
                <div key={c.key} style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
                  gap: "0",
                  padding: "11px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}>
                  <div style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{c.label}</div>
                  <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "#60a5fa" }}>{c.started}</div>
                  <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "#34d399" }}>{c.stillActive}</div>
                  <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "#f87171" }}>{c.dropped}</div>
                  <div>
                    <span style={{
                      background: `${retColor}18`,
                      color: retColor,
                      border: `1px solid ${retColor}40`,
                      borderRadius: "999px",
                      padding: "2px 8px",
                      fontSize: "11px",
                      fontFamily: "system-ui",
                      fontWeight: 600,
                    }}>
                      {c.retention}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── Pause Tracker ── ─────────────────────────────────────────────────── */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        overflow: "hidden",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.03)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ fontFamily: "system-ui", fontSize: "11px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "2px" }}>Paused Clients</div>
            <div style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.40)" }}>
              {pausedWithDates.length} currently paused
              {pausedWithDates.filter(c => c.weeksPaused >= 2).length > 0 &&
                ` · ${pausedWithDates.filter(c => c.weeksPaused >= 2).length} 2+ weeks`}
              {pausedWithDates.filter(c => c.weeksPaused >= 4).length > 0 &&
                ` · ${pausedWithDates.filter(c => c.weeksPaused >= 4).length} 4+ weeks`}
            </div>
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr",
          gap: "0",
          padding: "10px 20px",
          background: "rgba(255,255,255,0.02)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          {["Name", "Coach", "Paused Since", "Weeks Paused", "Status"].map(h => (
            <div key={h} style={{
              fontFamily: "system-ui",
              fontSize: "10px",
              color: "rgba(255,255,255,0.30)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}>
              {h}
            </div>
          ))}
        </div>

        {pausedWithDates.length === 0 ? (
          <div style={{
            padding: "32px 20px",
            textAlign: "center",
            fontFamily: "system-ui",
            fontSize: "13px",
            color: "rgba(255,255,255,0.20)",
          }}>
            No paused clients
          </div>
        ) : (
          pausedWithDates.map(client => (
            <div
              key={client.id}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr 1fr 1fr",
                gap: "0",
                padding: "11px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                background: pauseRowBg(client.weeksPaused),
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = pauseRowBg(client.weeksPaused).replace("0.03", "0.06").replace("0.10", "0.15")}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = pauseRowBg(client.weeksPaused)}
            >
              <div style={{ fontFamily: "system-ui", fontSize: "13px", color: "white", fontWeight: 500 }}>
                {client.name}
              </div>
              <div style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                {client.coach}
              </div>
              <div style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                {new Date(client.pausedUntil + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <div style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 700, color: pauseRowColor(client.weeksPaused) }}>
                {client.weeksPaused}w
              </div>
              <div>
                <span style={{
                  background: client.weeksPaused >= 4 ? "rgba(248,113,113,0.15)" : client.weeksPaused >= 2 ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
                  color: pauseRowColor(client.weeksPaused),
                  border: `1px solid ${pauseRowColor(client.weeksPaused)}40`,
                  borderRadius: "999px",
                  padding: "2px 8px",
                  fontSize: "10px",
                  fontFamily: "system-ui",
                  fontWeight: 600,
                }}>
                  {client.weeksPaused >= 4 ? "At Risk" : client.weeksPaused >= 2 ? "Warning" : "Paused"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <RetentionCharts clients={clients} />

      {/* ── Cancellation Reasons Chart ─────────────────────────────────────── */}
      {(() => {
        const thisYear = new Date().getFullYear();
        const reasons = ["Price", "Results", "Life circumstances", "Moved to another coach", "Other"];
        const counts: Record<string, number> = {};
        reasons.forEach(r => { counts[r] = 0; });

        clients.forEach(c => {
          if (c.status !== "cancelled" || !c.cancelReason) return;
          if (!c.cancelDate) return;
          const d = new Date(c.cancelDate);
          if (d.getFullYear() !== thisYear) return;
          counts[c.cancelReason] = (counts[c.cancelReason] || 0) + 1;
        });

        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        const REASON_COLORS: Record<string, string> = {
          "Price": "#60a5fa",
          "Results": "#f87171",
          "Life circumstances": "#fbbf24",
          "Moved to another coach": "#a855f7",
          "Other": "#6b7280",
        };

        const maxCount = Math.max(...Object.values(counts), 1);
        if (total === 0) return null;

        return (
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "16px",
          }}>
            <div style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "4px" }}>Retention</div>
            <h3 style={{ fontFamily: "system-ui", fontSize: "16px", fontWeight: 700, color: "white", margin: "0 0 16px" }}>
              Cancellation Reasons — {thisYear}
            </h3>

            {/* Horizontal bar chart */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {reasons.filter(r => counts[r] > 0).sort((a, b) => counts[b] - counts[a]).map(reason => {
                const pct = Math.round((counts[reason] / total) * 100);
                const barW = Math.round((counts[reason] / maxCount) * 100);
                return (
                  <div key={reason}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>{reason}</span>
                      <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 600, color: REASON_COLORS[reason] }}>
                        {counts[reason]} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${barW}%`,
                        background: REASON_COLORS[reason],
                        borderRadius: "999px",
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
              {total} total cancellations in {thisYear}
            </div>
          </div>
        );
      })()}


    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const windowWidth = useWindowSize();
  const isDesktop = windowWidth >= 768;

  function addToast(message: string, type: ToastMessage["type"] = "success") {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }
  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const [clients, setClients] = useState<Client[]>([]);
  const [actionPanel, setActionPanel] = useState<"menu" | "pause" | "cancel" | "edit" | null>("menu");

  const [leads, setLeads] = useState<Lead[]>([]);

  const totalRevenuePerWeek = clients
    .filter(c => c.status === "active")
    .reduce((sum, c) => sum + (c.weeklyCharge || 0), 0);

  useEffect(() => {
    if (activeTab !== "clients" && activeTab !== "dashboard") return;
    fetch("/api/clients")
      .then(r => r.json())
      .then((data: Client[]) => setClients(data))
      .catch(console.error);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "leads" && activeTab !== "macro-calculator") return;
    fetch("/api/leads")
      .then(r => r.json())
      .then((data: Lead[]) => setLeads(data))
      .catch(console.error);
  }, [activeTab]);

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    await fetch(`/api/clients/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    setSelectedClient(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  async function deleteClient(id: string) {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setClients(prev => prev.filter(c => c.id !== id));
  }

  const sidebarSections: { label: string; items: { id: Tab; label: string }[] }[] = [
    {
      label: "Business",
      items: [
        { id: "dashboard", label: "Dashboard" },
        { id: "clients", label: "Clients" },
        { id: "checkins", label: "Check-Ins" },
        { id: "leads", label: "Leads" },
        { id: "finance", label: "Finance" },
        { id: "retention", label: "Retention" },
      ],
    },
    {
      label: "Lead Magnets",
      items: [
        { id: "macro-calculator", label: "Macro Calculator" },
      ],
    },
    {
      label: "AI",
      items: [
        { id: "agents", label: "Agents" },
        { id: "memory", label: "Memory" },
        { id: "team", label: "Team" },
      ],
    },
  ];

  // ─── ClientsTab ──────────────────────────────────────────────────────────────
  function ClientsTab({ onClientClick }: { onClientClick: (c: Client) => void }) {
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

    const searchResults = searchQuery
      ? clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())))
      : [];

    const coachFiltered = clients.filter(c => c.coach === selectedCoach);
    const dayGroups = DAY_ORDER.map(day => ({ day, clients: coachFiltered.filter(c => c.checkInDay === day) })).filter(g => g.clients.length > 0);
    const cancelledClients = coachFiltered.filter(c => c.status === "cancelled");
    const pausedClients = coachFiltered.filter(c => c.status === "paused");
    const activeClients = coachFiltered.filter(c => c.status === "active");
    const miggyClients = clients.filter(c => c.coach === "Miggy");
    const milzzyClients = clients.filter(c => c.coach === "Milzzy");

    const startEdit = (client: Client) => {
      setForm({
        name: client.name, email: client.email ?? "",
        coach: client.coach, paymentPlatform: client.paymentPlatform ?? "Newie",
        weeklyCharge: client.weeklyCharge ?? 0, spreadsheetUrl: client.spreadsheetUrl ?? "",
        status: client.status, pausedUntil: client.pausedUntil ?? "",
        startDate: client.startDate, notes: client.notes ?? "",
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
        const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) { const newClient: Client = await res.json(); setClients(prev => [...prev, newClient]); }
      }
      setForm({ name: "", email: "", coach: "Milzzy", paymentPlatform: "Newie", weeklyCharge: 0, spreadsheetUrl: "", status: "active", pausedUntil: "", startDate: new Date().toISOString().split("T")[0], notes: "", checkInDay: "" });
      setShowForm(false);
    };

    const statusPill = (client: Client) => {
      if (client.status === "active") return <span style={{ background: TiffanySoft, color: Tiffany, border: `1px solid ${TiffanyBorder}`, borderRadius: "999px", padding: "2px 10px", fontSize: "11px", fontFamily: "system-ui", fontWeight: 500, display: "inline-block" }}>Active</span>;
      if (client.status === "paused") {
        const wks = client.pausedUntil ? weeksRemaining(client.pausedUntil) : null;
        return <span style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "999px", padding: "2px 10px", fontSize: "11px", fontFamily: "system-ui", fontWeight: 500, display: "inline-block" }}>Paused {wks ? `· ${wks}w` : ""}</span>;
      }
      return <span style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "999px", padding: "2px 10px", fontSize: "11px", fontFamily: "system-ui", fontWeight: 500, display: "inline-block" }}>Cancelled</span>;
    };

    const platformColors: Record<string, string> = { Newie: Tiffany, Upfront: "#a855f7", Mentorship: "#10b981" };

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
              width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${GlassBorder}`,
              borderRadius: "12px", color: "white", padding: "10px 14px 10px 40px",
              fontSize: "14px", fontFamily: "system-ui", outline: "none", boxSizing: "border-box",
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "14px" }}>✕</button>
          )}
        </div>

        {/* Header + Add */}
        <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
          COACH FILTER
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {(["Milzzy","Miggy"] as const).map(c => (
              <button key={c} onClick={() => setSelectedCoach(c)}
                style={{ background: selectedCoach === c ? TiffanySoft : "rgba(255,255,255,0.05)", border: selectedCoach === c ? `1px solid ${TiffanyBorder}` : `1px solid ${GlassBorder}`, borderRadius: "999px", padding: "6px 18px", fontSize: "12px", cursor: "pointer", fontFamily: "system-ui", fontWeight: selectedCoach === c ? 600 : 400, color: selectedCoach === c ? Tiffany : "rgba(255,255,255,0.50)", transition: "all 0.15s" }}>
                {c} {c === "Milzzy" ? `(${milzzyClients.length})` : `(${miggyClients.length})`}
              </button>
            ))}
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", email: "", coach: "Milzzy", paymentPlatform: "Newie", weeklyCharge: 0, spreadsheetUrl: "", status: "active", pausedUntil: "", startDate: new Date().toISOString().split("T")[0], notes: "", checkInDay: "" }); }}
            style={{ background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "12px", padding: "8px 18px", color: Tiffany, fontSize: "13px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>
            {showForm ? "Cancel" : "+ Add Client"}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Total Active", value: activeClients.length, color: "#34d399" },
            { label: "Milzzy", value: milzzyClients.filter(c=>c.status==="active").length, color: Tiffany },
            { label: "Miggy", value: miggyClients.filter(c=>c.status==="active").length, color: "#a855f7" },
            { label: "Paused", value: pausedClients.length, color: "#fbbf24" },
            { label: "Rev / Wk", value: `$${clients.filter(c=>c.status==="active").reduce((s,c)=>s+(c.weeklyCharge||0),0).toLocaleString()}`, color: "#0abab5" },
          ].map(s => (
            <div key={s.label} style={{ background: GlassBg, backdropFilter: GlassBlur, border: `1px solid ${GlassBorder}`, borderRadius: "16px", padding: "16px", textAlign: "center" }}>
              <p style={{ fontFamily: "system-ui", fontSize: "24px", fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.40)", marginBottom: "10px" }}>
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: GlassBlur, border: `1px solid ${GlassBorder}`, borderRadius: "16px", padding: "12px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <tbody>
                    {searchResults.map((client, idx) => {
                      const isPaused = client.status === "paused";
                      return (
                        <tr key={client.id}
                          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: isPaused ? "rgba(251,191,36,0.04)" : idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent" }}
                          onClick={() => { onClientClick?.(client); }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.025)"}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = isPaused ? "rgba(251,191,36,0.04)" : idx % 2 === 1 ? "rgba(255,255,255,0.015)" : "transparent"}>
                          <td style={{ padding: "10px 12px", fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.90)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span
                                style={{ cursor: "pointer", color: "rgba(255,255,255,0.90)" }}
                                onClick={() => { onClientClick?.(client); }}
                                title="View profile"
                              >{client.name}</span>
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}><span style={{ background: `${platformColors[client.paymentPlatform]}18`, color: platformColors[client.paymentPlatform], border: `1px solid ${platformColors[client.paymentPlatform]}40`, borderRadius: "999px", padding: "1px 7px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>{client.paymentPlatform}</span></td>
                          <td style={{ padding: "10px 12px", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>{client.coach}</td>
                          <td style={{ padding: "10px 12px" }}>{statusPill(client)}</td>
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
            <div key={day} style={{
              background: DAY_COLORS[day] ?? "rgba(255,255,255,0.03)",
              backdropFilter: GlassBlur,
              border: `1px solid rgba(255,255,255,0.10)`,
              borderLeft: `3px solid ${DAY_BORDER_COLORS[day]}`,
              borderRadius: "20px",
              padding: "16px",
            }}>
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
                            <span style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              {isPaused && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", flexShrink: 0, display: "inline-block" }} />}
                              <span
                                style={{ cursor: "pointer", color: "rgba(255,255,255,0.90)" }}
                                onClick={() => { onClientClick?.(client); }}
                                title="View profile"
                              >{client.name}</span>
                              
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ background: `${platformColors[client.paymentPlatform]}18`, color: platformColors[client.paymentPlatform], border: `1px solid ${platformColors[client.paymentPlatform]}40`, borderRadius: "999px", padding: "1px 7px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>{client.paymentPlatform}</span>
                          </td>
                          <td style={{ padding: "8px 10px", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.70)" }}>{client.weeklyCharge ? `$${client.weeklyCharge}/wk` : "—"}</td>
                          <td style={{ padding: "8px 10px" }}>{statusPill(client)}</td>
                          <td style={{ padding: "8px 10px", width: "40px", minWidth: "40px", textAlign: "center" }}>
                            <button onClick={() => { onClientClick?.(client); }}
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

        {/* Add/Edit Form */}
        {!searchQuery && showForm && (
          <div style={{ background: "rgba(15,20,40,0.60)", backdropFilter: "blur(20px)", border: `1px solid ${GlassBorder}`, borderRadius: "20px", padding: "24px", marginTop: "20px" }}>
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
              <button onClick={handleSave} style={{ background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "10px", padding: "10px 24px", color: Tiffany, fontSize: "13px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>
                {editingId ? "Save Changes" : "Add Client"}
              </button>
              {editingId && <button onClick={() => { setEditingId(null); setShowForm(false); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 24px", color: "rgba(255,255,255,0.55)", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui" }}>Cancel</button>}
            </div>
          </div>
        )}

        {/* ── Cancelled Clients ────────────────────────────────────── */}
        {cancelledClients.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
            marginTop: '12px',
          }}>
            <div
              onClick={() => setShowCancelled(s => !s)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderBottom: showCancelled ? '1px solid rgba(255,255,255,0.06)' : 'none',
                padding: '14px 20px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontFamily: 'system-ui', fontSize: '11px', color: 'rgba(248,113,113,0.60)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '2px' }}>
                  Retention
                </div>
                <div style={{ fontFamily: 'system-ui', fontSize: '15px', fontWeight: 700, color: 'rgba(248,113,113,0.85)' }}>
                  Cancelled Clients — {cancelledClients.length}
                </div>
              </div>
              <div style={{ fontFamily: 'system-ui', fontSize: '20px', color: 'rgba(255,255,255,0.35)' }}>
                {showCancelled ? '▼' : '▶'}
              </div>
            </div>

            {showCancelled && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 1.5fr 1fr',
                  gap: '0',
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {['Name', 'Coach', 'Cancelled Date', 'Stage'].map(h => (
                    <div key={h} style={{ fontFamily: 'system-ui', fontSize: '10px', color: 'rgba(255,255,255,0.30)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                      {h}
                    </div>
                  ))}
                </div>

                {cancelledClients.map(client => (
                  <div
                    key={client.id}
                    onClick={() => { setSelectedClient(client); setActionPanel('menu'); }}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1.5fr 1fr',
                      gap: '0',
                      padding: '11px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <div style={{ fontFamily: 'system-ui', fontSize: '13px', color: 'rgba(255,255,255,0.70)', fontWeight: 500 }}>
                      {client.name}
                    </div>
                    <div style={{ fontFamily: 'system-ui', fontSize: '12px', color: 'rgba(255,255,255,0.40)' }}>
                      {client.coach}
                    </div>
                    <div style={{ fontFamily: 'system-ui', fontSize: '12px', color: 'rgba(248,113,113,0.55)' }}>
                      {client.lastUpdated ? new Date(client.lastUpdated).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                    <div>
                      <span style={{ background: 'rgba(248,113,113,0.10)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '999px', padding: '1px 8px', fontSize: '10px', fontFamily: 'system-ui', fontWeight: 500 }}>
                        Cancelled
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Action Modal */}
        {selectedClient && (
          <GlassModal onClose={() => setSelectedClient(null)}>
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "4px" }}>Manage Client</p>
              <p style={{ fontFamily: "system-ui", fontSize: "18px", fontWeight: 600, color: "rgba(255,255,255,0.95)" }}>{selectedClient.name}</p>
            </div>
            {actionPanel === "menu" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button onClick={() => { setActionPanel(null); onClientClick(selectedClient); }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "12px 16px", color: "rgba(255,255,255,0.85)", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                  👤 View Profile
                </button>
                <button onClick={() => {
                  setForm({ name: selectedClient.name, email: selectedClient.email ?? "", coach: selectedClient.coach, paymentPlatform: selectedClient.paymentPlatform ?? "Newie", weeklyCharge: selectedClient.weeklyCharge ?? 0, spreadsheetUrl: selectedClient.spreadsheetUrl ?? "", status: selectedClient.status, pausedUntil: selectedClient.pausedUntil ?? "", startDate: selectedClient.startDate, notes: selectedClient.notes ?? "", checkInDay: selectedClient.checkInDay ?? "" });
                  setEditingId(selectedClient.id);
                  setActionPanel("edit");
                }}
                  style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "12px 16px", color: "rgba(255,255,255,0.85)", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                  ✏️ Edit Client
                </button>
                {selectedClient.status === "paused" ? (
                  <button onClick={async () => {
                    const start = selectedClient.pauseStartDate ?? new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
                    const startD = new Date(start + "T00:00:00");
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const weeksPaused = Math.max(1, Math.round((today.getTime() - startD.getTime()) / (7 * 86400000)));
                    const history = selectedClient.pauseHistory ?? [];
                    await updateClient(selectedClient.id, {
                      status: "active",
                      pauseStartDate: undefined,
                      pausedUntil: undefined,
                      pauseHistory: [...history, { started: start, ended: new Date().toISOString().split("T")[0], weeks: weeksPaused }],
                    });
                    setSelectedClient(null);
                  }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(52,211,153,0.10)", border: "1px solid rgba(52,211,153,0.25)", borderRadius: "12px", padding: "12px 16px", color: "#34d399", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                    ▶️ Resume Client
                  </button>
                ) : (
                  <button onClick={() => setActionPanel("pause")}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "12px", padding: "12px 16px", color: "#fbbf24", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
                    ⏸️ Pause Client
                  </button>
                )}
                {selectedClient.spreadsheetUrl && (
                  <button onClick={() => { window.open(selectedClient.spreadsheetUrl, "_blank"); setSelectedClient(null); }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "12px", padding: "12px 16px", color: Tiffany, fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", textAlign: "left" }}>
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
                  <button onClick={async () => { const date = (document.getElementById("pause-date-modal") as HTMLInputElement)?.value; if (!date) return; await updateClient(selectedClient.id, { status: "paused", pausedUntil: date, pauseStartDate: new Date().toISOString().split("T")[0] }); setSelectedClient(null); }}
                    style={{ flex: 1, background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", fontWeight: 600 }}>Confirm Pause</button>
                  <button onClick={() => setActionPanel("menu")}
                    style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer" }}>Back</button>
                </div>
              </div>
            )}
            {actionPanel === "cancel" && (
              <div>
                <p style={{ fontFamily: "system-ui", fontSize: "14px", color: "rgba(255,255,255,0.70)", marginBottom: "14px", lineHeight: 1.5 }}>Remove <strong style={{ color: "rgba(255,255,255,0.90)" }}>{selectedClient.name}</strong> from active clients?</p>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>Cancel Reason</label>
                  <select id="cancel-reason"
                    style={{ display: "block", width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "white", padding: "10px 12px", fontSize: "13px", fontFamily: "system-ui", outline: "none", boxSizing: "border-box", marginBottom: "8px" }}>
                    <option value="">Select a reason...</option>
                    <option value="Price">Price</option>
                    <option value="Results">Results</option>
                    <option value="Life circumstances">Life circumstances</option>
                    <option value="Moved to another coach">Moved to another coach</option>
                    <option value="Other">Other</option>
                  </select>
                  <label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: "5px" }}>Notes (optional)</label>
                  <textarea id="cancel-notes" rows={2}
                    placeholder="Any additional context..."
                    style={{ display: "block", width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "white", padding: "10px 12px", fontSize: "13px", fontFamily: "system-ui", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={async () => {
                    const reason = (document.getElementById("cancel-reason") as HTMLSelectElement)?.value;
                    const notes = (document.getElementById("cancel-notes") as HTMLTextAreaElement)?.value;
                    await updateClient(selectedClient.id, {
                      status: "cancelled",
                      cancelDate: new Date().toISOString().split("T")[0],
                      cancelReason: reason || undefined,
                      cancelNotes: notes || undefined,
                    });
                    setSelectedClient(null);
                  }}
                    style={{ flex: 1, background: "rgba(248,113,113,0.18)", border: "1px solid rgba(248,113,113,0.35)", color: "#f87171", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", fontWeight: 600 }}>Confirm Cancel</button>
                  <button onClick={() => setActionPanel("menu")}
                    style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", borderRadius: "12px", padding: "12px", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer" }}>Keep</button>
                </div>
              </div>
            )}
            {actionPanel === "edit" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <p style={{ fontFamily: "system-ui", fontSize: "15px", fontWeight: 600, color: "rgba(255,255,255,0.90)" }}>Edit Client</p>
                  <button onClick={() => { setActionPanel("menu"); setEditingId(null); setSelectedClient(null); }}
                    style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", fontSize: "18px", padding: "4px", lineHeight: 1 }}>✕</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} /></div>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="client@email.com" /></div>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Coach</label><select value={form.coach} onChange={e => setForm({ ...form, coach: e.target.value as "Milzzy"|"Miggy" })} style={inputStyle}><option value="Milzzy">Milzzy</option><option value="Miggy">Miggy</option></select></div>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Platform</label><select value={form.paymentPlatform} onChange={e => setForm({ ...form, paymentPlatform: e.target.value as "Newie"|"Upfront"|"Mentorship" })} style={inputStyle}><option value="Newie">Newie</option><option value="Upfront">Upfront</option><option value="Mentorship">Mentorship</option></select></div>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Weekly ($)</label><input type="number" value={form.weeklyCharge} onChange={e => setForm({ ...form, weeklyCharge: Number(e.target.value) })} style={inputStyle} /></div>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Check-in Day</label><select value={form.checkInDay} onChange={e => setForm({ ...form, checkInDay: e.target.value as ""|Client["checkInDay"] })} style={inputStyle}><option value="">— Select —</option>{DAY_ORDER.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Start Date</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} style={inputStyle} /></div>
                  <div><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Client["status"] })} style={inputStyle}><option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option></select></div>
                </div>
                <div style={{ marginBottom: "10px" }}><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Spreadsheet URL</label><input value={form.spreadsheetUrl} onChange={e => setForm({ ...form, spreadsheetUrl: e.target.value })} style={inputStyle} placeholder="https://docs.google.com/..." /></div>
                <div style={{ marginBottom: "10px" }}><label style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "none" }} /></div>
                {formError && <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "#f87171", marginBottom: "8px" }}>{formError}</p>}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={async () => { if (!form.name.trim()) { setFormError("Name is required"); return; } setFormError(null); await updateClient(editingId!, { ...form, checkInDay: form.checkInDay || undefined }); setEditingId(null); setActionPanel("menu"); setSelectedClient(null); }}
                    style={{ flex: 1, background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "12px", padding: "11px", color: Tiffany, fontSize: "14px", fontFamily: "system-ui", cursor: "pointer", fontWeight: 600 }}>
                    Save Changes
                  </button>
                  <button onClick={() => { setActionPanel("menu"); setEditingId(null); setSelectedClient(null); }}
                    style={{ flex: 1, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "11px", color: "rgba(255,255,255,0.50)", fontSize: "14px", fontFamily: "system-ui", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </GlassModal>
        )}
      </div>
    );
  }

  // ─── LeadsTab ─────────────────────────────────────────────────────────────
  function LeadsTab({ onConvertLead }: { onConvertLead: (lead: Lead) => void }) {
    const [showForm, setShowForm] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [form, setForm] = useState({ name: "", email: "", phone: "", source: "other" as Lead["source"], notes: "", assignedTo: "Milzzy" as Lead["assignedTo"] });
    const [formError, setFormError] = useState<string | null>(null);
    const [menuLead, setMenuLead] = useState<Lead | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [moveStage, setMoveStage] = useState<Lead["stage"] | null>(null);

    const STAGES: Lead["stage"][] = ["enquiry", "consult_booked", "consult_done", "payment", "onboarding", "active"];
    const STAGE_LABELS: Record<Lead["stage"], string> = {
      enquiry: "Enquiry", consult_booked: "Consult Booked", consult_done: "Consult Done",
      payment: "Payment", onboarding: "Onboarding", active: "Active Client",
    };
    const STAGE_COLORS: Record<Lead["stage"], string> = {
      enquiry: Tiffany, consult_booked: "rgba(139,92,246,0.5)", consult_done: Tiffany,
      payment: "rgba(236,72,153,0.5)", onboarding: "rgba(16,185,129,0.5)", active: "rgba(52,211,153,0.5)",
    };
    const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
      referral: { bg: "rgba(52,211,153,0.15)", color: "#34d399" },
      instagram: { bg: `${Tiffany}26`, color: Tiffany },
      facebook: { bg: "rgba(99,102,241,0.15)", color: "#6366f1" },
      content: { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
      cold: { bg: "rgba(249,115,22,0.15)", color: "#f97316" },
      other: { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.50)" },
    };

    const now = new Date();
    const totalLeads = leads.length;
    const thisMonth = leads.filter(l => { const d = new Date(l.createdAt); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }).length;
    const activeCount = leads.filter(l => l.stage === "active").length;
    const closingCount = leads.filter(l => l.stage === "payment" || l.stage === "onboarding").length;
    const conversionRate = totalLeads > 0 ? Math.round((activeCount / totalLeads) * 100) : 0;

    // Top source: source with most active conversions
    const sourceActiveCounts: Record<string, number> = {};
    for (const l of leads) {
      if (l.stage === "active") {
        sourceActiveCounts[l.source] = (sourceActiveCounts[l.source] || 0) + 1;
      }
    }
    const topSource = Object.entries(sourceActiveCounts).sort((a, b) => b[1] - a[1])[0];
    const topSourceLabel = topSource
      ? topSource[0].charAt(0).toUpperCase() + topSource[0].slice(1)
      : null;

    function daysAgo(iso: string): number { return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)); }
    function needsFollowUp(lead: Lead): "follow" | "urgent" | null {
      if (lead.stage !== "enquiry" && lead.stage !== "consult_booked") return null;
      const days = daysAgo(lead.createdAt);
      if (days > 2) return "urgent";
      if (days > 1) return "follow";
      return null;
    }

    async function saveLead() {
      if (!form.name.trim()) { setFormError("Name is required"); return; }
      setFormError(null);
      if (editingLead) {
        const res = await fetch(`/api/leads/${editingLead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) { const updated: Lead = await res.json(); setLeads(prev => prev.map(l => l.id === updated.id ? updated : l)); }
      } else {
        const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) { const created: Lead = await res.json(); setLeads(prev => [...prev, created]); }
      }
      setForm({ name: "", email: "", phone: "", source: "other", notes: "", assignedTo: "Milzzy" });
      setEditingLead(null);
      setShowForm(false);
    }

    async function deleteLead(id: string) {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
      setLeads(prev => prev.filter(l => l.id !== id));
      setMenuOpen(false);
      setMenuLead(null);
    }

    async function moveLeadStage(lead: Lead, newStage: Lead["stage"]) {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) });
      if (res.ok) { const updated: Lead = await res.json(); setLeads(prev => prev.map(l => l.id === updated.id ? updated : l)); }
      if (newStage === "active") { onConvertLead(lead); }
      setMoveStage(null);
      setMenuOpen(false);
      setMenuLead(null);
    }

    function startEdit(lead: Lead) {
      setForm({ name: lead.name, email: lead.email, phone: lead.phone, source: lead.source, notes: lead.notes, assignedTo: lead.assignedTo });
      setEditingLead(lead);
      setShowForm(true);
      setMenuOpen(false);
      setMenuLead(null);
    }

    const card = (label: string, value: number | string, color: string, sub?: string) => (
      <div style={{ background: GlassBg, backdropFilter: GlassBlur, border: `1px solid ${GlassBorder}`, borderRadius: "16px", padding: "16px", textAlign: "center" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "24px", fontWeight: 700, color, margin: 0 }}>{value}</p>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "4px 0 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        {sub && <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>{sub}</p>}
      </div>
    );

    return (
      <div style={{ padding: "16px 20px", width: "100%", boxSizing: "border-box" }}>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Lead Pipeline</p>
          <button onClick={() => { setShowForm(!showForm); setEditingLead(null); setForm({ name: "", email: "", phone: "", source: "other", notes: "", assignedTo: "Milzzy" }); setFormError(null); }}
            style={{ background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "12px", padding: "8px 18px", color: Tiffany, fontSize: "13px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>
            {showForm ? "Cancel" : "+ Add Lead"}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {card("Total Leads", totalLeads, "rgba(255,255,255,0.70)")}
          {card("This Month", thisMonth, Tiffany)}
          {card("Conversions", activeCount + closingCount, "#34d399", `${activeCount} active`)}
          <div style={{ background: GlassBg, backdropFilter: GlassBlur, border: `1px solid ${GlassBorder}`, borderRadius: "16px", padding: "16px", textAlign: "center" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "24px", fontWeight: 700, color: "#a855f7", margin: 0 }}>{conversionRate}%</p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "4px 0 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Conversion Rate</p>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "999px", height: "4px", overflow: "hidden" }}>
              <div style={{ width: `${conversionRate}%`, height: "100%", background: `linear-gradient(90deg, ${Tiffany}, #ec4899)`, borderRadius: "999px", transition: "width 0.4s" }} />
            </div>
          </div>
          {card("Top Source", topSourceLabel ?? "—", topSourceLabel ? (SOURCE_COLORS[topSource[0]]?.color ?? Tiffany) : "rgba(255,255,255,0.50)")}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: "rgba(15,20,40,0.60)", backdropFilter: "blur(20px)", border: `1px solid ${GlassBorder}`, borderRadius: "20px", padding: "24px", marginBottom: "20px" }}>
            <p style={{ fontFamily: "system-ui", fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: "16px" }}>
              {editingLead ? `Edit Lead: ${editingLead.name}` : "Add New Lead"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle }} placeholder="Full name" /></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ ...inputStyle }} placeholder="client@email.com" /></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ ...inputStyle }} placeholder="+61 ..." /></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Source</label><select value={form.source} onChange={e => setForm({ ...form, source: e.target.value as Lead["source"] })} style={{ ...inputStyle }}><option value="">Source...</option><option value="referral">Referral</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="content">Content</option><option value="cold">Cold Outreach</option><option value="other">Other</option></select></div>
              <div><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Assigned To</label><select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value as Lead["assignedTo"] })} style={{ ...inputStyle }}><option value="Milzzy">Milzzy</option><option value="Miggy">Miggy</option></select></div>
            </div>
            <div style={{ marginBottom: "12px" }}><label style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: "4px" }}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: "none" }} placeholder="Optional notes..." /></div>
            {formError && <p style={{ color: "#f87171", fontFamily: "system-ui", fontSize: "12px", marginBottom: "8px" }}>{formError}</p>}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={saveLead} style={{ background: TiffanySoft, border: `1px solid ${TiffanyBorder}`, borderRadius: "10px", padding: "10px 24px", color: Tiffany, fontSize: "13px", cursor: "pointer", fontFamily: "system-ui", fontWeight: 600 }}>
                {editingLead ? "Save Changes" : "Add Lead"}
              </button>
              {editingLead && <button onClick={() => { setEditingLead(null); setShowForm(false); setForm({ name: "", email: "", phone: "", source: "other", notes: "", assignedTo: "Milzzy" }); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "10px 24px", color: "rgba(255,255,255,0.55)", fontSize: "13px", cursor: "pointer", fontFamily: "system-ui" }}>Cancel</button>}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "8px" }}>
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage);
            const isEnquiry = stage === "enquiry";
            return (
              <div key={stage} style={{ minWidth: "180px", maxWidth: "220px", flex: "0 0 auto", width: "100%" }}>
                {/* Column header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: STAGE_COLORS[stage] }} />
                    <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.50)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{STAGE_LABELS[stage]}</span>
                  </div>
                  <span style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.30)", background: "rgba(255,255,255,0.06)", borderRadius: "999px", padding: "1px 7px" }}>{stageLeads.length}</span>
                </div>
                {/* Column body */}
                <div style={{ background: GlassBg, backdropFilter: GlassBlur, border: `1px solid ${isEnquiry ? TiffanyBorder : GlassBorder}`, borderLeft: isEnquiry ? `3px solid ${Tiffany}` : `1px solid ${GlassBorder}`, borderRadius: "16px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
                  {stageLeads.map(lead => {
                    const fu = needsFollowUp(lead);
                    const src = SOURCE_COLORS[lead.source] || SOURCE_COLORS.other;
                    const days = daysAgo(lead.createdAt);
                    const isOverdue = fu === "urgent";
                    return (
                      <div key={lead.id} style={{
                        background: "rgba(255,255,255,0.04)",
                        backdropFilter: GlassBlur,
                        border: `1px solid ${isOverdue ? TiffanyBorder : "rgba(255,255,255,0.08)"}`,
                        borderLeft: `3px solid ${STAGE_COLORS[stage]}`,
                        borderRadius: "12px",
                        padding: "12px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "system-ui", fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.90)", margin: 0, lineHeight: 1.3 }}>{lead.name}</p>
                            {lead.source && (
                              <span style={{ marginLeft: '6px', background: lead.source === 'referral' ? 'rgba(52,211,153,0.15)' : lead.source === 'instagram' ? 'rgba(10,186,181,0.15)' : 'rgba(107,114,128,0.15)', color: lead.source === 'referral' ? '#34d399' : lead.source === 'instagram' ? '#0abab5' : '#9ca3af', border: `1px solid ${lead.source === 'referral' ? 'rgba(52,211,153,0.3)' : lead.source === 'instagram' ? 'rgba(10,186,181,0.3)' : 'rgba(107,114,128,0.3)'}`, borderRadius: '999px', padding: '1px 7px', fontSize: '10px', fontFamily: 'system-ui', textTransform: 'capitalize' }}>
                                {lead.source}
                              </span>
                            )}
                          </div>
                          <div style={{ position: "relative" }}>
                            <button onClick={(e) => { e.stopPropagation(); setMenuLead(menuLead?.id === lead.id ? null : lead); setMenuOpen(menuLead?.id === lead.id ? !menuOpen : true); setMoveStage(null); }}
                              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: "2px 4px", borderRadius: "4px", fontSize: "16px", lineHeight: 1, flexShrink: 0 }}>
                              &#x22EE;
                            </button>
                            {menuLead?.id === lead.id && menuOpen && (
                              <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 100, background: "rgba(15,20,40,0.98)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "12px", padding: "6px", minWidth: "140px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                                {moveStage === lead.stage ? (
                                  <div>
                                    <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", padding: "4px 8px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Move to stage</p>
                                    {STAGES.filter(s => s !== lead.stage).map(s => (
                                      <button key={s} onClick={() => moveLeadStage(lead, s)} style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "rgba(255,255,255,0.70)", cursor: "pointer", padding: "6px 8px", borderRadius: "8px", fontSize: "12px", fontFamily: "system-ui" }}
                                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"}
                                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                                        {STAGE_LABELS[s]}
                                      </button>
                                    ))}
                                    <button onClick={() => setMoveStage(null)} style={{ display: "block", width: "100%", textAlign: "center", background: "transparent", border: "none", color: "rgba(255,255,255,0.30)", cursor: "pointer", padding: "4px 8px", borderRadius: "8px", fontSize: "11px", fontFamily: "system-ui", marginTop: "2px" }}>Cancel</button>
                                  </div>
                                ) : (
                                  <div>
                                    <button onClick={() => startEdit(lead)} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: "7px 10px", borderRadius: "8px", fontSize: "12px", fontFamily: "system-ui" }}
                                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"}
                                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                                      ✏️ Edit
                                    </button>
                                    <button onClick={() => { setMoveStage(lead.stage); }} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "rgba(255,255,255,0.75)", cursor: "pointer", padding: "7px 10px", borderRadius: "8px", fontSize: "12px", fontFamily: "system-ui" }}
                                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"}
                                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                                      ↗️ Move Stage
                                    </button>
                                    <button onClick={() => deleteLead(lead.id)} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "7px 10px", borderRadius: "8px", fontSize: "12px", fontFamily: "system-ui" }}
                                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(248,113,113,0.10)"}
                                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                                      🗑 Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ marginBottom: "6px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          <span style={{ background: src.bg, color: src.color, border: `1px solid ${src.color}40`, borderRadius: "999px", padding: "1px 8px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>{lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}</span>
                          {lead.stage === "active" && <span style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.35)", borderRadius: "999px", padding: "1px 8px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>✅ Converted</span>}
                        </div>
                        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: "0 0 4px" }}>{days === 0 ? "Today" : `${days}d ago`}</p>
                        {fu === "follow" && <span style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.30)", borderRadius: "999px", padding: "1px 8px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>⚠️ Follow up</span>}
                        {fu === "urgent" && <span style={{ background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.30)", borderRadius: "999px", padding: "1px 8px", fontSize: "10px", fontFamily: "system-ui", fontWeight: 500 }}>🔴 Urgent</span>}
                      </div>
                    );
                  })}
                  {stageLeads.length === 0 && (
                    <div style={{ textAlign: "center", padding: "20px 8px" }}>
                      <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.20)" }}>No leads</p>
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

  return (
    <div className="min-h-screen text-[var(--text-primary)] flex flex-col">
      <Header activeTab={activeTab} />

      <div className="flex flex-1 overflow-visible">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} sections={sidebarSections} />

        <main className="overflow-y-auto p-4 lg:py-6" style={{ marginLeft: isDesktop ? "200px" : 0, width: isDesktop ? "calc(100% - 200px)" : "100%" }}>
          <div style={{
            maxWidth: activeTab === "dashboard" ? "960px" : activeTab === "team" ? "900px" : activeTab === "memory" ? "1200px" : "100%",
            margin: "0 auto", width: "100%", boxSizing: "border-box",
          }}>
            {/* Mobile hamburger */}
            <button
              className="lg:hidden mb-4 p-2 rounded-[10px] transition-colors"
              style={{ background: "rgba(255,255,255,0.04)" }}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {activeTab === "dashboard" ? <DashboardTab clients={clients} onTabChange={setActiveTab} onClientClick={setSelectedClient} /> :
             activeTab === "agents" ? <AgentsTab /> :
             activeTab === "memory" ? <MemoryTab /> :
             activeTab === "team" ? <TeamTab /> :
             activeTab === "clients" ? <ClientsTab onClientClick={setSelectedClient} /> :
             activeTab === "checkins" ? <CheckInsTab clients={clients} onClientClick={setSelectedClient} /> :
             activeTab === "finance" ? <FinanceTab revPerWeek={totalRevenuePerWeek} clients={clients} /> :
             activeTab === "retention" ? <RetentionTab clients={clients} /> :
             activeTab === "macro-calculator" ? <MacroCalculatorTab leads={leads} /> :
<LeadsTab onConvertLead={(lead) => {
               const newClient: Client = {
                 id: `lead-${lead.id}`,
                 name: lead.name,
                 email: lead.email,
                 coach: lead.assignedTo,
                 paymentPlatform: "Newie",
                 weeklyCharge: 0,
                 spreadsheetUrl: "",
                 status: "active",
                 startDate: new Date().toISOString().split("T")[0],
                 notes: `Converted from lead (source: ${lead.source})`,
               };
               fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newClient) })
                 .then(r => r.json())
                 .then(created => { setClients(prev => [...prev, created]); addToast(`${lead.name} has been added to Clients ✅`, "success"); })
                 .catch(() => addToast("Failed to add client", "error"));
             }} />}
          </div>
        </main>

        {/* Client Profile Panel */}
        {selectedClient && (
          <ClientProfilePanel
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
          />
        )}

        {/* Toast notifications */}
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}
