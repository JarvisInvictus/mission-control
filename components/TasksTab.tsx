"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";

// ─── Design System ────────────────────────────────────────────────────────────
const T = "#0abab5";
const TSoft = "rgba(10,186,181,0.12)";
const TBorder = "rgba(10,186,181,0.25)";
const BG = "#0d0f1a";
const CARD = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const WHITE = "rgba(255,255,255,0.88)";
const MUTED = "rgba(255,255,255,0.45)";
const RED = "#f87171";
const AMBER = "#fbbf24";
const BLUE = "#60a5fa";
const ORANGE = "#f97316";
const PURPLE = "#a78bfa";
const GREEN = "#4ade80";

// Category removed from UI — kept in data for legacy compat

// ─── Title-based auto-colour ─────────────────────────────────────────────────
const TITLE_COLORS: Array<{ match: string | RegExp; color: string }> = [
  { match: "catch up",          color: "#22c55e" }, // darker green
  { match: "consult",           color: "#39ff14" }, // neon green
  { match: "onboarding",        color: "#f87171" }, // red
  { match: /\bm[1-6]\b/i,       color: "#fbbf24" }, // M1–M6 yellow
];

function getTitleColor(title: string): string | null {
  const t = title.toLowerCase();
  for (const { match, color } of TITLE_COLORS) {
    if (typeof match === "string" ? t.includes(match) : match.test(title)) return color;
  }
  return null;
}

/** Manual colour takes priority over auto-detect */
function taskColor(task: { title?: string; color?: string | null }): string | null {
  return task.color || getTitleColor(task.title || "");
}

const COLOR_SWATCHES = [
  { label: "Clear",   value: null,      hex: null },
  { label: "Teal",    value: "#0abab5", hex: "#0abab5" },
  { label: "Yellow",  value: "#fbbf24", hex: "#fbbf24" },
  { label: "Green",   value: "#22c55e", hex: "#22c55e" },
  { label: "Red",     value: "#f87171", hex: "#f87171" },
  { label: "Orange",  value: "#f97316", hex: "#f97316" },
  { label: "Purple",  value: "#a78bfa", hex: "#a78bfa" },
  { label: "Blue",    value: "#60a5fa", hex: "#60a5fa" },
  { label: "Pink",    value: "#f472b6", hex: "#f472b6" },
  { label: "White",   value: "#e2e8f0", hex: "#e2e8f0" },
];

function getMiggyColor(): string { return "#f97316"; }
const PRIORITIES = [
  { value: "low",    label: "Low",    color: BLUE   },
  { value: "normal", label: "Normal", color: AMBER  },
  { value: "high",   label: "High",   color: RED    },
  { value: "urgent", label: "Urgent", color: ORANGE },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type PriorityVal = "low" | "normal" | "high" | "urgent" | "medium"; // medium = legacy

interface Task {
  id: string;
  title: string;
  text?: string;
  clientId?: string | null;
  category?: string;
  priority?: PriorityVal;
  owner?: string;
  author?: string;
  dueDate?: string | null;
  day?: string;
  sortOrder?: number;
  done: boolean;
  archived?: boolean;
  color?: string | null;
  completedAt?: string | null;
  notes?: string;
  createdAt?: string;
  status?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  coach: string;
  status: string;
  checkInDay?: string;
  pausedUntil?: string;
}

interface OnboardingSubmission {
  id: string;
  coach: "Milzzy" | "Miggy";
  formId: string;
  formName: string;
  name: string;
  email: string;
  phone: string;
  gender?: string;
  birthday?: string;
  weight?: string;
  height?: string;
  goal?: string;
  service?: string;
  photoUrls: string[];
  signatureUrl?: string;
  submittedAt: string;
  filloutUrl: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "error";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getToday(): string {
  const d = new Date();
  const au = d.toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" });
  const [day, month, year] = au.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Get the Sunday that starts the week containing `date`. */
function getSundayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // getDay() 0=Sun → subtract 0; Mon → subtract 1 etc.
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isWithinDays(dateStr: string, days: number): boolean {
  const today = new Date(getToday() + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  const diff = (d.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}

function dateInRange(dateStr: string | null | undefined, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T00:00:00");
  return d >= start && d <= end;
}

function getOwnerInitials(owner: string | undefined): string {
  if (!owner) return "?";
  if (owner === "Milzzy") return "MV";
  if (owner === "Miggy") return "MG";
  return owner.slice(0, 2).toUpperCase();
}

function getOwnerColor(owner: string | undefined): { bg: string; border: string; text: string } {
  if (owner === "Miggy") return { bg: "rgba(249,115,22,0.18)", border: "rgba(249,115,22,0.40)", text: "#f97316" };
  return { bg: TSoft, border: TBorder, text: T };
}

function getClientName(clients: Client[], clientId: string | null | undefined): string {
  if (!clientId) return "";
  const c = clients.find((c) => c.id === clientId);
  return c?.name ?? "";
}

function priorityColor(p?: string): string {
  if (p === "urgent") return ORANGE;
  if (p === "high") return RED;
  if (p === "normal" || p === "medium") return AMBER;
  if (p === "low") return BLUE;
  return MUTED;
}

function priorityLabel(p?: string): string {
  if (p === "urgent") return "Urgent";
  if (p === "high") return "High";
  if (p === "normal" || p === "medium") return "Normal";
  if (p === "low") return "Low";
  return "";
}

function getWeekLabel(weekSunday: Date): string {
  const end = new Date(weekSunday);
  end.setDate(weekSunday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const startStr = weekSunday.toLocaleDateString("en-AU", opts);
  const endStr = end.toLocaleDateString("en-AU", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function normDateStr(d: Date): string {
  // Use Sydney timezone so column dates match getToday() — avoids UTC-shift bug
  return d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
  borderRadius: "10px", padding: "9px 14px", color: "#fff",
  fontSize: "13px", fontFamily: "inherit", width: "100%",
  boxSizing: "border-box", outline: "none",
};
const sel: React.CSSProperties = {
  ...inp, cursor: "pointer",
  appearance: "none" as const,
};

// ─── Mobile hook ────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [breakpoint]);
  return mobile;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TasksTab({ clients }: { clients: Client[] }) {
  const isMobile = useIsMobile();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [layout, setLayout] = useState<"normal" | "tdl">("normal");
  const [search, setSearch] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "today" | "upcoming" | "overdue" | "completed">("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "Milzzy" | "Miggy">("all");
  const [tdlWeekSunday, setTdlWeekSunday] = useState<Date>(() => getSundayOf(new Date()));
  const [drawerTask, setDrawerTask] = useState<Partial<Task> | null>(null);
  const [drawerIsNew, setDrawerIsNew] = useState(false);
  const [drawerDefaultDate, setDrawerDefaultDate] = useState<string>("");
  const [inlineAddCol, setInlineAddCol] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  // Onboarding card drag state (separate from task drag so the two flows don't fight each other)
  const [draggingOnboarding, setDraggingOnboarding] = useState<OnboardingSubmission | null>(null);
  const [onboardingDropDate, setOnboardingDropDate] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hoveredTdlId, setHoveredTdlId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ taskId: string; x: number; y: number } | null>(null);
  const inlineRef = useRef<HTMLTextAreaElement>(null);

  // Onboarding submissions (new clients who just filled out the onboarding form)
  const [onboardingSubs, setOnboardingSubs] = useState<OnboardingSubmission[]>([]);
  const [onboardingExpanded, setOnboardingExpanded] = useState(false);
  const [onboardingRefreshing, setOnboardingRefreshing] = useState(false);

  const today = getToday();
  const activeClients = useMemo(() => clients.filter((c) => c.status === "active"), [clients]);

  // ─── Layout persistence ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mc_tasks_layout");
      if (saved === "tdl" || saved === "normal") setLayout(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("mc_tasks_layout", layout); } catch { /* ignore */ }
  }, [layout]);

  // ─── Load tasks ───────────────────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) {
        const raw: Task[] = await res.json();
        // Normalise legacy tasks that only have `text` not `title`
        setTasks(raw.map(t => ({ ...t, title: t.title || t.text || "" })));
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ─── Toast helpers ────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  // ─── Onboarding inbox ─────────────────────────────────────────────────────
  const fetchOnboarding = useCallback(async () => {
    try {
      const res = await fetch("/api/onboarding", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setOnboardingSubs(Array.isArray(data.unacked) ? data.unacked : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchOnboarding();
    const interval = setInterval(fetchOnboarding, 60_000); // poll every 60s
    return () => clearInterval(interval);
  }, [fetchOnboarding]);

  const refreshOnboarding = useCallback(async () => {
    setOnboardingRefreshing(true);
    try {
      await fetch("/api/onboarding", { method: "POST", cache: "no-store" });
      await fetchOnboarding();
      showToast("Onboarding inbox refreshed");
    } finally {
      setOnboardingRefreshing(false);
    }
  }, [fetchOnboarding, showToast]);

  const dismissOnboarding = useCallback(async (ids: string[]) => {
    setOnboardingSubs((prev) => prev.filter((s) => !ids.includes(s.id)));
    try {
      await fetch("/api/onboarding/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch { /* ignore */ }
    showToast(ids.length === 1 ? "Dismissed" : `${ids.length} dismissed`, "info");
  }, [showToast]);

  const openOnboardTask = useCallback((sub: OnboardingSubmission) => {
    // Try to match to an existing client by email
    const matchedClient = sub.email
      ? activeClients.find((c) => c.email && c.email.toLowerCase() === sub.email.toLowerCase())
      : null;

    const goalLine = sub.goal ? `Goal: ${sub.goal}\n` : "";
    const serviceLine = sub.service ? `Service: ${sub.service}\n` : "";
    const photoLine = sub.photoUrls.length > 0 ? `Physique photos: ${sub.photoUrls[0]}${sub.photoUrls.length > 1 ? ` (+${sub.photoUrls.length - 1} more)` : ""}\n` : "";

    setDrawerTask({
      title: `Onboard: ${sub.name}`,
      done: false,
      clientId: matchedClient?.id ?? null,
      category: "Onboarding",
      priority: "high",
      owner: sub.coach,
      dueDate: today,
      notes:
        `Fillout form: ${sub.filloutUrl}\n` +
        `Email: ${sub.email}\n` +
        `Phone: ${sub.phone}\n` +
        goalLine +
        serviceLine +
        photoLine +
        (matchedClient ? `\n✓ Linked to existing client: ${matchedClient.name}` : "\n⚠ No matching client — create one in Clients tab."),
      status: "open",
    });
    setDrawerIsNew(true);
    setDrawerDefaultDate(today);
  }, [activeClients, today]);

  // Scroll TDL to today's column on mobile
  useEffect(() => {
    if (!isMobile || layout !== "tdl") return;
    const todayCol = document.querySelector(`[data-date="${today}"]`) as HTMLElement | null;
    if (todayCol) todayCol.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }, [isMobile, layout, today, tdlWeekSunday]);

  // ─── Colour context menu ──────────────────────────────────────────────────
  const setTaskColor = useCallback(async (taskId: string, color: string | null) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, color } : t));
    setCtxMenu(null);
    try {
      await fetch("/api/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, color }),
      });
      showToast(color ? "Colour applied" : "Colour cleared", "info");
    } catch { fetchTasks(); }
  }, [showToast, fetchTasks]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setCtxMenu(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", close); };
  }, [ctxMenu]);

  const openCtxMenu = useCallback((e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 220);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setCtxMenu({ taskId, x, y });
  }, []);

  // ─── C key: archive hovered TDL task ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "c" && e.key !== "C") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement).isContentEditable) return;
      if (!hoveredTdlId) return;
      archiveTask(hoveredTdlId);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hoveredTdlId]); // eslint-disable-line

  const archiveTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast(`"${task.title}" archived`);
    try {
      await fetch("/api/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived: true }),
      });
    } catch { fetchTasks(); }
  }, [tasks, showToast, fetchTasks]);

  // ─── Toggle done ──────────────────────────────────────────────────────────
  const toggleDone = useCallback(async (task: Task) => {
    const newDone = !task.done;
    const completedAt = newDone ? new Date().toISOString() : null;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, done: newDone, completedAt } : t));
    try {
      await fetch("/api/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, done: newDone, completedAt }),
      });
    } catch { fetchTasks(); }
  }, [fetchTasks]);

  // ─── Save drawer ──────────────────────────────────────────────────────────
  const saveDrawer = useCallback(async () => {
    if (!drawerTask) return;
    const title = (drawerTask.title || "").trim();
    if (!title) return;
    if (drawerIsNew) {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            owner: drawerTask.owner || "Milzzy",
            dueDate: drawerTask.dueDate || null,
            clientId: drawerTask.clientId || null,
            category: drawerTask.category || "Follow-up",
            priority: drawerTask.priority || "normal",
            notes: drawerTask.notes || "",
            status: "open",
          }),
        });
        if (res.ok) {
          const created: Task = await res.json();
          setTasks((prev) => [...prev, created]);
          showToast("Task created");
        }
      } catch { /* ignore */ }
    } else {
      const updates = {
        title, clientId: drawerTask.clientId ?? null,
        category: drawerTask.category ?? "",
        priority: drawerTask.priority ?? "normal",
        owner: drawerTask.owner ?? "Milzzy",
        dueDate: drawerTask.dueDate ?? null,
        notes: drawerTask.notes ?? "",
        done: drawerTask.done ?? false,
        status: drawerTask.status ?? "open",
      };
      setTasks((prev) => prev.map((t) => t.id === drawerTask.id ? { ...t, ...updates } : t));
      try {
        await fetch("/api/tasks", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: drawerTask.id, ...updates }),
        });
        showToast("Task saved");
      } catch { fetchTasks(); }
    }
    setDrawerTask(null);
  }, [drawerTask, drawerIsNew, showToast, fetchTasks]);

  const deleteDrawerTask = useCallback(async () => {
    if (!drawerTask?.id) return;
    setTasks((prev) => prev.filter((t) => t.id !== drawerTask.id));
    try { await fetch(`/api/tasks?id=${drawerTask.id}`, { method: "DELETE" }); } catch { fetchTasks(); }
    showToast("Task deleted", "info");
    setDrawerTask(null);
  }, [drawerTask, showToast, fetchTasks]);

  // ─── Input Check Ins ────────────────────────────────────────────────
  const [generatingCheckIns, setGeneratingCheckIns] = useState(false);

  const generateCheckInTasks = useCallback(async () => {
    setGeneratingCheckIns(true);
    const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const DAY_ABBR  = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const weekSunday = getSundayOf(new Date());
    let created = 0;
    let skipped = 0;
    let skippedPausedNames: string[] = [];

    // A paused client is eligible for a check-in on a given day if their `pausedUntil`
    // has already passed by that day. Otherwise they're still on pause for that day.
    const isEligibleForDay = (c: Client, checkInDate: Date): boolean => {
      if (c.status === "cancelled") return false;
      if (c.status === "paused") {
        if (!c.pausedUntil) return false; // Paused with no end date → treat as indefinite
        const pauseEnd = new Date(c.pausedUntil);
        pauseEnd.setHours(0, 0, 0, 0);
        if (pauseEnd >= checkInDate) return false; // Pause still active on this day
      }
      return true;
    };

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const checkInDay = DAY_NAMES[dayIdx];
      const dayAbbr    = DAY_ABBR[dayIdx];

      // The check-in happens on this day of the week
      const checkInDate = new Date(weekSunday);
      checkInDate.setDate(weekSunday.getDate() + dayIdx);
      checkInDate.setHours(0, 0, 0, 0);

      const allForDay = clients.filter(c => c.checkInDay === checkInDay);
      const dayClients = allForDay.filter(c => isEligibleForDay(c, checkInDate));
      const skippedForDay = allForDay.filter(c => !isEligibleForDay(c, checkInDate));

      for (const c of skippedForDay) {
        if (!skippedPausedNames.includes(c.name)) skippedPausedNames.push(c.name);
      }
      if (dayClients.length === 0) continue;

      // Processing happens the FOLLOWING day
      const processingDate = new Date(weekSunday);
      processingDate.setDate(weekSunday.getDate() + dayIdx + 1);
      const dateStr = normDateStr(processingDate);

      // Duplicate guard — skip this day if any check-in task already exists for it
      const alreadyExists = tasks.some(t =>
        t.dueDate === dateStr && /^check in x\d+.*- \w+$/i.test(t.title)
      );
      if (alreadyExists) { skipped++; continue; }

      const sorted = [...dayClients].sort((a, b) => a.name.localeCompare(b.name));
      const total = sorted.length;

      for (let i = 0; i < sorted.length; i += 5) {
        const batch = sorted.slice(i, i + 5);
        const cumulative = i + batch.length;
        const title = `Check In x${batch.length} [${cumulative}] - ${dayAbbr}`;
        try {
          const res = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title, owner: "Milzzy", dueDate: dateStr,
              priority: "normal", status: "open",
              notes: `${checkInDay} check-ins (${cumulative - batch.length + 1}–${cumulative} of ${total})`,
            }),
          });
          if (res.ok) {
            const t: Task = await res.json();
            setTasks(prev => [...prev, t]);
            created++;
          }
        } catch { /* ignore */ }
      }
    }

    setGeneratingCheckIns(false);
    if (created > 0) {
      const pauseNote = skippedPausedNames.length > 0 ? ` (skipped ${skippedPausedNames.length} paused: ${skippedPausedNames.slice(0, 3).join(", ")}${skippedPausedNames.length > 3 ? "…" : ""})` : "";
      showToast(`${created} check-in task${created !== 1 ? "s" : ""} created${pauseNote}`);
    }
    else if (skipped > 0) showToast("Check-in tasks already exist for this week", "info");
    else if (skippedPausedNames.length > 0 && clients.some(c => c.checkInDay)) {
      showToast(`All eligible clients already have check-in tasks. ${skippedPausedNames.length} paused this week: ${skippedPausedNames.slice(0, 3).join(", ")}${skippedPausedNames.length > 3 ? "…" : ""}`, "info");
    }
    else showToast("No check-in clients found", "info");
  }, [clients, tasks, showToast]);

  const openAddTask = useCallback((defaultDate?: string) => {
    setDrawerTask({
      title: "", done: false, clientId: null, category: "Follow-up",
      priority: "normal", owner: ownerFilter !== "all" ? ownerFilter : "Milzzy",
      dueDate: defaultDate || today, notes: "", status: "open",
    });
    setDrawerIsNew(true);
    setDrawerDefaultDate(defaultDate || today);
  }, [ownerFilter, today]);

  const openEditTask = useCallback((task: Task) => {
    setDrawerTask({ ...task });
    setDrawerIsNew(false);
  }, []);

  // ─── Inline quick-add ────────────────────────────────────────────────────
  const submitInlineAdd = useCallback(async (dateStr: string) => {
    const title = inlineTitle.trim();
    if (!title) return;
    const effectiveOwner = ownerFilter !== "all" ? ownerFilter : "Milzzy";
    try {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, owner: effectiveOwner, dueDate: dateStr,
          category: "Follow-up", priority: "normal", status: "open",
        }),
      });
      if (res.ok) {
        const created: Task = await res.json();
        setTasks((prev) => [...prev, created]);
        showToast("Task added");
      }
    } catch { /* ignore */ }
    setInlineTitle(""); // clear title, keep form open
    setTimeout(() => inlineRef.current?.focus(), 50);
  }, [inlineTitle, ownerFilter, showToast]);

  // ─── TDL week nav ────────────────────────────────────────────────────────
  const tdlWeekEnd = useMemo(() => {
    const d = new Date(tdlWeekSunday);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [tdlWeekSunday]);

  const tdlDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(tdlWeekSunday);
      d.setDate(d.getDate() + i);
      const dateStr = normDateStr(d);
      days.push({
        dateStr,
        dayName: d.toLocaleDateString("en-AU", { weekday: "long" }).toUpperCase(),
        dayShort: d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
        isToday: dateStr === today,
      });
    }
    return days;
  }, [tdlWeekSunday, today]);

  const isTdlCurrentWeek = useMemo(
    () => getSundayOf(new Date()).getTime() === tdlWeekSunday.getTime(),
    [tdlWeekSunday]
  );

  // ─── TDL tasks bucketed by date ───────────────────────────────────────────
  const tdlByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const day of tdlDays) map[day.dateStr] = [];
    const visible = tasks.filter(
      (t) => !t.archived && t.dueDate && dateInRange(t.dueDate, tdlWeekSunday, tdlWeekEnd)
    );
    visible.sort((a, b) => {
      const so = (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
      if (so !== 0) return so;
      return (a.createdAt || "").localeCompare(b.createdAt || "");
    });
    for (const t of visible) {
      if (t.dueDate && map[t.dueDate]) map[t.dueDate].push(t);
    }
    return map;
  }, [tasks, tdlDays, tdlWeekSunday, tdlWeekEnd]);

  // ─── Normal-layout filtered tasks ────────────────────────────────────────
  const activeTasks = useMemo(() => tasks.filter((t) => !t.archived), [tasks]);

  const filteredTasks = useMemo(() => {
    let res = activeTasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter((t) =>
        t.title.toLowerCase().includes(q) ||
        getClientName(clients, t.clientId).toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q)
      );
    }
    if (viewFilter === "today")     res = res.filter((t) => !t.done && t.dueDate === today);
    if (viewFilter === "overdue")   res = res.filter((t) => !t.done && !!t.dueDate && t.dueDate < today);
    if (viewFilter === "upcoming")  res = res.filter((t) => !t.done && !!t.dueDate && isWithinDays(t.dueDate, 7) && t.dueDate >= today);
    if (viewFilter === "completed") res = res.filter((t) => t.done);
    if (ownerFilter !== "all") res = res.filter((t) => (t.owner || t.author) === ownerFilter);
    return res;
  }, [activeTasks, search, viewFilter, ownerFilter, today, clients]);

  const taskGroups = useMemo(() => {
    const overdue: Task[] = [], todayArr: Task[] = [], upcoming: Task[] = [], completed: Task[] = [];
    for (const t of filteredTasks) {
      if (t.done) { completed.push(t); continue; }
      if (!t.dueDate) { upcoming.push(t); continue; }
      if (t.dueDate < today) overdue.push(t);
      else if (t.dueDate === today) todayArr.push(t);
      else if (isWithinDays(t.dueDate, 7)) upcoming.push(t);
      else upcoming.push(t);
    }
    return { overdue, today: todayArr, upcoming, completed };
  }, [filteredTasks, today]);

  const counts = useMemo(() => {
    const mon = getMondayOf(new Date()); const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    let dueToday = 0, overdue = 0, upcoming = 0, completedWk = 0;
    for (const t of activeTasks) {
      if (t.done) {
        if (t.completedAt) { const c = new Date(t.completedAt); if (c >= mon && c <= sun) completedWk++; }
      } else {
        if (t.dueDate === today) dueToday++;
        else if (t.dueDate && t.dueDate < today) overdue++;
        else if (t.dueDate && isWithinDays(t.dueDate, 7)) upcoming++;
      }
    }
    const vc = { all: activeTasks.length, today: 0, upcoming: 0, overdue: 0, completed: 0 };
    for (const t of activeTasks) {
      if (t.done) vc.completed++;
      else if (t.dueDate === today) vc.today++;
      else if (t.dueDate && t.dueDate < today) vc.overdue++;
      else if (t.dueDate && isWithinDays(t.dueDate, 7)) vc.upcoming++;
    }
    const oc = { Milzzy: 0, Miggy: 0 };
    for (const t of activeTasks.filter((t) => !t.done)) {
      if ((t.owner || t.author) === "Milzzy") oc.Milzzy++;
      else if ((t.owner || t.author) === "Miggy") oc.Miggy++;
    }
    return { dueToday, overdue, upcoming, completedWk, vc, oc };
  }, [activeTasks, today]);

  // ─── Drag & drop ─────────────────────────────────────────────────────────
  const handleDrop = useCallback(async (e: React.DragEvent, targetTaskId: string | null, targetDate: string) => {
    e.preventDefault(); e.stopPropagation();
    setOnboardingDropDate(null);

    // ─── Onboarding submission drop ────────────────────────────────────────
    if (draggingOnboarding) {
      const sub = draggingOnboarding;
      setDraggingOnboarding(null);
      const matchedClient = sub.email
        ? activeClients.find((c) => c.email && c.email.toLowerCase() === sub.email.toLowerCase())
        : null;

      const goalLine = sub.goal ? `Goal: ${sub.goal}\n` : "";
      const serviceLine = sub.service ? `Service: ${sub.service}\n` : "";
      const photoLine = sub.photoUrls.length > 0
        ? `Physique photos: ${sub.photoUrls[0]}${sub.photoUrls.length > 1 ? ` (+${sub.photoUrls.length - 1} more)` : ""}\n`
        : "";

      const taskBody: Record<string, unknown> = {
        title: `Onboard: ${sub.name}`,
        owner: sub.coach,
        clientId: matchedClient?.id ?? null,
        category: "Onboarding",
        priority: "high",
        dueDate: targetDate,
        notes:
          `Fillout form: ${sub.filloutUrl}\n` +
          `Email: ${sub.email}\n` +
          `Phone: ${sub.phone}\n` +
          goalLine +
          serviceLine +
          photoLine +
          (matchedClient ? `\n✓ Linked to existing client: ${matchedClient.name}` : "\n⚠ No matching client — create one in Clients tab."),
        status: "open",
      };

      try {
        const res = await fetch("/api/tasks", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskBody),
        });
        if (!res.ok) throw new Error(`Task creation failed (${res.status})`);
        await fetchTasks();
        // Ack the submission so it disappears from the inbox
        setOnboardingSubs((prev) => prev.filter((s) => s.id !== sub.id));
        try {
          await fetch("/api/onboarding/ack", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [sub.id] }),
          });
        } catch { /* ignore */ }
        showToast(`Onboard: ${sub.name} → ${new Date(targetDate + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`);
      } catch (err) {
        showToast("Failed to create task", "error");
        console.error("Onboarding drop error:", err);
      }
      return;
    }

    if (!draggingId) return;
    const draggedTask = tasks.find((t) => t.id === draggingId);
    if (!draggedTask) { setDraggingId(null); return; }

    const wasSameDay = draggedTask.dueDate === targetDate;
    const colTasks = [...(tdlByDate[targetDate] || [])];
    const withoutDragged = colTasks.filter((t) => t.id !== draggingId);

    let newOrder: Task[];
    if (targetTaskId) {
      const tgtIdx = withoutDragged.findIndex((t) => t.id === targetTaskId);
      if (tgtIdx === -1) {
        newOrder = [...withoutDragged, draggedTask];
      } else if (dropPosition === "before") {
        withoutDragged.splice(tgtIdx, 0, draggedTask);
        newOrder = withoutDragged;
      } else {
        withoutDragged.splice(tgtIdx + 1, 0, draggedTask);
        newOrder = withoutDragged;
      }
    } else {
      newOrder = [...withoutDragged, draggedTask];
    }

    const updates = newOrder.map((t, i) => ({
      id: t.id,
      dueDate: t.id === draggingId ? targetDate : t.dueDate,
      sortOrder: i,
    }));

    setTasks((prev) => prev.map((t) => {
      const u = updates.find((u) => u.id === t.id);
      return u ? { ...t, dueDate: u.dueDate ?? t.dueDate, sortOrder: u.sortOrder } : t;
    }));

    const msg = wasSameDay ? "Task reordered" : `Task moved to ${new Date(targetDate + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}`;
    showToast(msg);

    setDraggingId(null); setDropTargetId(null); setDropPosition(null);
    try {
      await fetch("/api/tasks", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
    } catch { fetchTasks(); }
  }, [draggingId, draggingOnboarding, tasks, tdlByDate, dropPosition, showToast, fetchTasks, activeClients]);

  // ─── Format due date ──────────────────────────────────────────────────────
  const fmtDue = (d: string | null | undefined): { text: string; red: boolean } => {
    if (!d) return { text: "—", red: false };
    if (d === today) return { text: "Today", red: false };
    const diff = Math.round((new Date(d + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) / 86400000);
    if (diff === 1) return { text: "Tomorrow", red: false };
    if (diff < 0) return { text: new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }), red: true };
    return { text: new Date(d + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }), red: false };
  };

  // ─── Checkbox ─────────────────────────────────────────────────────────────
  const Checkbox = ({ done, onToggle }: { done: boolean; onToggle: (e: React.MouseEvent) => void }) => (
    <div
      onClick={onToggle}
      style={{
        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
        border: `2px solid ${done ? T : BORDER}`,
        background: done ? T : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s", fontSize: 11,
      }}
    >
      {done && <span style={{ color: "#000", fontWeight: 700, lineHeight: 1 }}>✓</span>}
    </div>
  );

  // ─── Normal layout ────────────────────────────────────────────────────────
  const renderNormal = () => (
    <>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 8 : 12, marginBottom: 20 }}>
        {[
          { label: "Due Today",  sub: "Focus list",   count: counts.dueToday,   color: T,      filter: "today" as const },
          { label: "Overdue",    sub: "Needs action", count: counts.overdue,    color: RED,    filter: "overdue" as const },
          { label: "Upcoming",   sub: "Next 7 days",  count: counts.upcoming,   color: PURPLE, filter: "upcoming" as const },
          { label: "Completed",  sub: "This week",    count: counts.completedWk, color: GREEN, filter: "completed" as const },
        ].map(({ label, sub, count, color, filter }) => {
          const active = viewFilter === filter;
          return (
            <div key={label} onClick={() => setViewFilter(active ? "all" : filter)} style={{
              background: active ? `${color}0d` : CARD,
              border: `1px solid ${active ? color + "60" : BORDER}`,
              borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, marginBottom: 5 }}>{count}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: WHITE, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>{sub}</div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <input
          style={{ ...inp, fontSize: 13 }}
          placeholder="Search tasks or clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all","today","upcoming","overdue","completed"] as const).map((f) => {
            const labels: Record<string, string> = { all:"All", today:"Today", upcoming:"Upcoming", overdue:"Overdue", completed:"Completed" };
            const colors: Record<string, string> = { today: T, upcoming: PURPLE, overdue: RED, completed: GREEN };
            const cnt: Record<string, number> = {
              all: counts.vc.all, today: counts.vc.today,
              upcoming: counts.vc.upcoming, overdue: counts.vc.overdue, completed: counts.vc.completed,
            };
            const active = viewFilter === f;
            const c = colors[f];
            return (
              <button key={f} onClick={() => setViewFilter(f)} style={{
                padding: "6px 12px", borderRadius: 8, border: `1px solid ${active && c ? c+"50" : BORDER}`,
                background: active ? (c ? `${c}1a` : TSoft) : CARD,
                color: active ? (c || T) : MUTED,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
              }}>
                {labels[f]}
                <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: 5, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>{cnt[f]}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {([["all","All coaches"], ["Milzzy","Milzzy"], ["Miggy","Miggy"]] as const).map(([v, lbl]) => {
            const cnt = v === "all" ? undefined : counts.oc[v];
            const active = ownerFilter === v;
            return (
              <button key={v} onClick={() => setOwnerFilter(v)} style={{
                padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? TBorder : BORDER}`,
                background: active ? TSoft : CARD, color: active ? T : MUTED,
                fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5,
              }}>
                {lbl}
                {cnt !== undefined && <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: 5, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>{cnt}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task groups */}
      {viewFilter === "all" ? (
        <>
          {renderGroup("Overdue", taskGroups.overdue, RED)}
          {renderGroup("Today", taskGroups.today, T)}
          {renderGroup("Upcoming", taskGroups.upcoming, PURPLE)}
        </>
      ) : viewFilter === "overdue"   ? renderGroup("Overdue", taskGroups.overdue, RED)
        : viewFilter === "today"     ? renderGroup("Today", taskGroups.today, T)
        : viewFilter === "upcoming"  ? renderGroup("Upcoming", taskGroups.upcoming, PURPLE)
        : renderGroup("Completed", taskGroups.completed, GREEN)
      }
    </>
  );

  const renderGroup = (title: string, groupTasks: Task[], accent: string) => {
    if (groupTasks.length === 0 && viewFilter === "all") return null;
    return (
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: WHITE }}>{title}</span>
          <span style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "1px 7px", fontSize: 11, color: MUTED, fontWeight: 700 }}>{groupTasks.length}</span>
        </div>
        {groupTasks.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", color: MUTED, gap: 6 }}>
            <div style={{ fontSize: 28 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Nothing here</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>This list is clear.</div>
          </div>
        ) : groupTasks.map((task) => {
          const owner = task.owner || task.author;
          const { text: dueText, red: dueRed } = fmtDue(task.dueDate);
          const clientName = getClientName(clients, task.clientId) || "Business task";
          const pc = priorityColor(task.priority);
          return (
            <div key={task.id} onClick={() => openEditTask(task)} style={{
              display: "flex", alignItems: "center", gap: 10,
              background: (() => { const tc = taskColor(task); return tc ? `${tc}22` : CARD; })(),
              border: `1px solid ${(() => { const tc = taskColor(task); return tc ? tc + "80" : BORDER; })()}`,
              borderRadius: 12, padding: "11px 14px", marginBottom: 6,
              cursor: "pointer", transition: "background 0.15s",
              opacity: task.done ? 0.5 : 1,
              overflowX: "auto",
            }}
              onContextMenu={(e) => openCtxMenu(e, task.id)}
              onMouseEnter={(e) => (e.currentTarget.style.background = (() => { const tc = taskColor(task); return tc ? `${tc}1a` : "rgba(255,255,255,0.07)"; })())}
              onMouseLeave={(e) => (e.currentTarget.style.background = (() => { const tc = taskColor(task); return tc ? `${tc}0d` : CARD; })())}
            >
              <Checkbox done={task.done} onToggle={(e) => { e.stopPropagation(); toggleDone(task); }} />
              <span style={{ flex: 1, fontSize: 15, color: WHITE, textDecoration: task.done ? "line-through" : "none", minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.title}
              </span>
              <span style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap", marginLeft: 8 }}>{clientName}</span>
              {(task.owner || task.author) === "Miggy" && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.35)", whiteSpace: "nowrap", fontWeight: 700 }}>Miggy</span>}
              {task.priority && task.priority !== "normal" && task.priority !== "medium" && (
                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: `${pc}1a`, color: pc, fontWeight: 700, whiteSpace: "nowrap" }}>{priorityLabel(task.priority)}</span>
              )}

              <span style={{ fontSize: 11, color: dueRed ? RED : MUTED, whiteSpace: "nowrap" }}>{dueText}</span>
              <button onClick={(e) => { e.stopPropagation(); openEditTask(task); }} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16, padding: "2px 4px", borderRadius: 6, lineHeight: 1 }}>⋯</button>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── TDL layout ───────────────────────────────────────────────────────────
  const renderTdl = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setTdlWeekSunday((p) => { const d = new Date(p); d.setDate(d.getDate() - 7); return d; })}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, cursor: "pointer", padding: "6px 12px", fontSize: 13, fontFamily: "inherit" }}>←</button>
        <button onClick={() => setTdlWeekSunday(getSundayOf(new Date()))}
          style={{ background: "transparent", border: "none", color: WHITE, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit", flex: 1, textAlign: "center" }}>
          {getWeekLabel(tdlWeekSunday)}
        </button>
        <button onClick={() => setTdlWeekSunday((p) => { const d = new Date(p); d.setDate(d.getDate() + 7); return d; })}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, color: WHITE, cursor: "pointer", padding: "6px 12px", fontSize: 13, fontFamily: "inherit" }}>→</button>
        {!isTdlCurrentWeek && (
          <button onClick={() => setTdlWeekSunday(getSundayOf(new Date()))}
            style={{ background: TSoft, border: `1px solid ${TBorder}`, borderRadius: 8, color: T, cursor: "pointer", padding: "6px 12px", fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}>
            This week
          </button>
        )}
      </div>

      <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(7, 85vw)" : "repeat(7,minmax(120px,1fr))",
          gap: isMobile ? 10 : 8,
          overflowX: "auto",
          paddingBottom: isMobile ? 16 : 8,
          alignItems: "start",
          scrollSnapType: isMobile ? "x mandatory" : undefined,
          WebkitOverflowScrolling: "touch" as any,
          paddingLeft: isMobile ? 0 : undefined,
        }}>
        {tdlDays.map(({ dateStr, dayName, dayShort, isToday: isTdy }) => {
          const colTasks = tdlByDate[dateStr] || [];
          const openCount = colTasks.filter((t) => !t.done).length;
          const isDropZone = draggingId !== null && dropTargetId === dateStr && !colTasks.some((t) => t.id === dropTargetId);
          const isOnboardingDrop = draggingOnboarding !== null && onboardingDropDate === dateStr;
          return (
            <div key={dateStr} data-date={dateStr}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingOnboarding) setOnboardingDropDate(dateStr);
              }}
              onDragLeave={() => { if (onboardingDropDate === dateStr) setOnboardingDropDate(null); }}
              onDrop={(e) => { e.stopPropagation(); handleDrop(e, null, dateStr); }}
              style={{
                background: isOnboardingDrop ? `${T}30` : (isDropZone ? `${T}1a` : (isTdy ? TSoft : CARD)),
                border: `1px solid ${isOnboardingDrop ? T : (isTdy ? TBorder : BORDER)}`,
                borderLeft: isOnboardingDrop ? `3px solid ${T}` : (isTdy ? `3px solid ${T}` : `1px solid ${BORDER}`),
                borderRadius: 12, padding: isMobile ? "12px 10px" : "10px 8px",
                minHeight: isMobile ? 160 : 220,
                display: "flex", flexDirection: "column", gap: 6,
                transition: "background 0.15s, border-color 0.15s, transform 0.15s",
                scrollSnapAlign: isMobile ? "start" : undefined,
                transform: isOnboardingDrop ? "scale(1.02)" : undefined,
                boxShadow: isOnboardingDrop ? `0 0 0 2px ${T}40, 0 8px 24px rgba(10,186,181,0.25)` : undefined,
              }}>
              <div style={{ textAlign: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: isTdy ? T : MUTED }}>{dayName}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: isTdy ? T : WHITE }}>{dayShort}</div>
              </div>
              {openCount > 0 && (
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 5, padding: "1px 6px", fontSize: 10, color: MUTED, fontWeight: 700, textAlign: "center" }}>{openCount} open</div>
              )}
              {colTasks.map((task) => {
                const isDragging = draggingId === task.id;
                const isTarget = dropTargetId === task.id;
                const pc = priorityColor(task.priority);
                const isHovered = hoveredTdlId === task.id;
                return (
                  <div key={task.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", task.id); setDraggingId(task.id); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDropTargetId(task.id); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setDropPosition(e.clientY < r.top + r.height / 2 ? "before" : "after"); }}
                    onDragLeave={() => { if (dropTargetId === task.id) { setDropTargetId(null); setDropPosition(null); } }}
                    onDrop={(e) => { e.stopPropagation(); handleDrop(e, task.id, dateStr); }}
                    onDragEnd={() => { setDraggingId(null); setDropTargetId(null); setDropPosition(null); }}
                    onContextMenu={(e) => { e.stopPropagation(); openCtxMenu(e, task.id); }}
                    onMouseEnter={() => setHoveredTdlId(task.id)}
                    onMouseLeave={() => setHoveredTdlId(null)}
                    onClick={() => openEditTask(task)}
                    style={{
                      background: (() => { const tc = taskColor(task); return tc ? `${tc}25` : "rgba(255,255,255,0.05)"; })(),
                      borderRadius: 8, padding: "8px 10px",
                      cursor: "grab", fontSize: 12, display: "flex", flexDirection: "column", gap: 4,
                      transition: "opacity 0.15s, border-color 0.15s",
                      opacity: isDragging ? 0.4 : task.done ? 0.45 : 1,
                      border: (() => { const tc = taskColor(task); return `1px solid ${isTarget ? T : tc ? tc + "90" : BORDER}`; })(),
                      borderTop: isTarget && dropPosition === "before" ? `2px solid ${T}` : undefined,
                      borderBottom: isTarget && dropPosition === "after" ? `2px solid ${T}` : undefined,
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <Checkbox done={task.done} onToggle={(e) => { e.stopPropagation(); toggleDone(task); }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: WHITE, fontWeight: 500, lineHeight: 1.3, textDecoration: task.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isMobile ? "normal" : "nowrap", wordBreak: isMobile ? "break-word" as const : undefined }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {getClientName(clients, task.clientId)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {task.priority && <span style={{ width: 6, height: 6, borderRadius: "50%", background: pc, display: "inline-block" }} />}
                      {(task.owner || task.author) === "Miggy" && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.35)", fontWeight: 700 }}>Miggy</span>}
                      {isHovered && !isDragging && (
                        <span title="Press C to archive" style={{ marginLeft: "auto", fontSize: 9, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1px 4px", lineHeight: 1, fontWeight: 700 }}>C</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Quick-add */}
              {inlineAddCol === dateStr ? (
                <div style={{ background: CARD, border: `1px solid ${TBorder}`, borderRadius: 8, padding: 8, display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
                  <div style={{ fontSize: 10, color: MUTED, display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: TSoft, border: `1px solid ${TBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: T }}>
                      {getOwnerInitials(ownerFilter !== "all" ? ownerFilter : "Milzzy")}
                    </span>
                    {ownerFilter !== "all" ? ownerFilter : "Milzzy"}
                  </div>
                  <textarea
                    ref={inlineRef}
                    rows={2}
                    style={{ ...inp, fontSize: 14, resize: "none", padding: "8px 10px" }}
                    placeholder="What needs to be done?"
                    value={inlineTitle}
                    onChange={(e) => setInlineTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitInlineAdd(dateStr); }
                      if (e.key === "Escape") { setInlineAddCol(null); setInlineTitle(""); }
                    }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    <button style={{ background: T, color: "#000", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", flex: 1 }} onClick={() => submitInlineAdd(dateStr)}>Add task</button>
                    <button style={{ background: "rgba(255,255,255,0.06)", color: MUTED, border: "none", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }} onClick={() => { setInlineAddCol(null); setInlineTitle(""); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setInlineAddCol(dateStr); setInlineTitle(""); }}
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px dashed ${BORDER}`, borderRadius: 8, color: MUTED, cursor: "pointer", padding: "6px", fontSize: 11, fontFamily: "inherit", textAlign: "center", marginTop: "auto" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = TBorder; (e.currentTarget as HTMLButtonElement).style.color = T; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; (e.currentTarget as HTMLButtonElement).style.color = MUTED; }}
                >+ Add task</button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  // ─── Drawer ───────────────────────────────────────────────────────────────
  const renderDrawer = () => {
    if (!drawerTask) return null;
    const dt = drawerTask;
    const upd = (patch: Partial<Task>) => setDrawerTask((p) => p ? { ...p, ...patch } : p);
    return (
      <>
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100 }} onClick={() => setDrawerTask(null)} />
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, maxWidth: "100vw", background: "#0d0f1a", borderLeft: `1px solid ${BORDER}`, zIndex: 101, display: "flex", flexDirection: "column", boxShadow: "-8px 0 40px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: T }}>{drawerIsNew ? "New Task" : "Edit Task"}</span>
            <button style={{ background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 18, lineHeight: 1, fontFamily: "inherit" }} onClick={() => setDrawerTask(null)}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
            <input
              style={{ ...inp, fontSize: 16, fontWeight: 600, padding: "12px 14px" }}
              placeholder="Task title"
              value={dt.title || ""}
              onChange={(e) => upd({ title: e.target.value })}
              autoFocus
            />

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Client</label>
              <select style={sel} value={dt.clientId ?? ""} onChange={(e) => upd({ clientId: e.target.value || null })}>
                <option value="">Business task</option>
                {activeClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Owner</label>
                <select style={sel} value={dt.owner || "Milzzy"} onChange={(e) => upd({ owner: e.target.value })}>
                  <option value="Milzzy">Milzzy</option>
                  <option value="Miggy">Miggy</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Due Date</label>
                <input style={inp} type="date" value={dt.dueDate?.split("T")[0] || ""} onChange={(e) => upd({ dueDate: e.target.value || null })} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Priority</label>
                <select style={sel} value={dt.priority === "medium" ? "normal" : (dt.priority || "normal")} onChange={(e) => upd({ priority: e.target.value as PriorityVal })}>
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Status</label>
              <select style={sel} value={dt.done ? "completed" : (dt.status || "open")}
                onChange={(e) => {
                  const v = e.target.value;
                  upd({ status: v, done: v === "completed", completedAt: v === "completed" ? new Date().toISOString() : null });
                }}>
                <option value="open">Open</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>Notes</label>
              <textarea style={{ ...inp, resize: "vertical", minHeight: 90, lineHeight: 1.5 }} rows={4} placeholder="Notes…" value={dt.notes || ""} onChange={(e) => upd({ notes: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, padding: "16px 20px", borderTop: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
            <button onClick={() => setDrawerTask(null)} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 18px", color: MUTED, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
            <button onClick={saveDrawer} style={{ flex: 1, background: T, color: "#000", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {drawerIsNew ? "Save task" : "Save Changes"}
            </button>
            {!drawerIsNew && (
              <button onClick={deleteDrawerTask} style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "10px 14px", color: RED, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
            )}
          </div>
        </div>
      </>
    );
  };

  // ─── Toasts ───────────────────────────────────────────────────────────────
  const renderToasts = () => (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 8, zIndex: 200, pointerEvents: "none" }}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{
          background: toast.type === "error" ? "rgba(248,113,113,0.18)" : toast.type === "info" ? "rgba(255,255,255,0.10)" : "rgba(10,186,181,0.18)",
          border: `1px solid ${toast.type === "error" ? "rgba(248,113,113,0.4)" : toast.type === "info" ? BORDER : TBorder}`,
          borderRadius: 10, padding: "10px 18px",
          color: toast.type === "error" ? RED : toast.type === "info" ? WHITE : T,
          fontSize: 13, fontWeight: 600, fontFamily: "system-ui",
          backdropFilter: "blur(8px)", whiteSpace: "nowrap",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {toast.type === "success" ? "✓ " : toast.type === "info" ? "· " : "⚠ "}{toast.message}
        </div>
      ))}
    </div>
  );

  // ─── Onboarding inbox ─────────────────────────────────────────────────────
  const renderOnboardingInbox = () => {
    if (onboardingSubs.length === 0) return null;
    const subs = onboardingExpanded ? onboardingSubs : onboardingSubs.slice(0, 3);
    const ownerStyle = (coach: string) =>
      coach === "Miggy"
        ? { bg: "rgba(249,115,22,0.15)", border: "rgba(249,115,22,0.40)", text: "#f97316" }
        : { bg: TSoft, border: TBorder, text: T };

    return (
      <section style={{
        marginTop: 32,
        background: "linear-gradient(135deg, rgba(10,186,181,0.10) 0%, rgba(168,85,247,0.06) 100%)",
        border: `1px solid ${TBorder}`,
        borderRadius: 18,
        padding: isMobile ? "16px" : "20px 22px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: TSoft, border: `1px solid ${TBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}>📥</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>New onboarding submissions</h2>
                <span style={{
                  background: T, color: "#000", borderRadius: 999, padding: "2px 9px",
                  fontSize: 11, fontWeight: 800,
                }}>{onboardingSubs.length}</span>
              </div>
              <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0" }}>
                Clients who just completed the onboarding form. Pick a day to schedule their kickoff.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={refreshOnboarding} disabled={onboardingRefreshing} style={{
              background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 8,
              padding: "6px 12px", color: WHITE, fontSize: 11, cursor: onboardingRefreshing ? "not-allowed" : "pointer",
              fontFamily: "inherit", fontWeight: 600, opacity: onboardingRefreshing ? 0.5 : 1,
            }}>
              {onboardingRefreshing ? "…" : "↻ Refresh"}
            </button>
            {onboardingSubs.length > 3 && (
              <button onClick={() => setOnboardingExpanded((e) => !e)} style={{
                background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8,
                padding: "6px 12px", color: MUTED, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
              }}>
                {onboardingExpanded ? "Show less" : `Show all (${onboardingSubs.length})`}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {subs.map((sub) => {
            const submittedDate = new Date(sub.submittedAt);
            const agoMs = Date.now() - submittedDate.getTime();
            const agoMin = Math.round(agoMs / 60000);
            const agoHr = Math.round(agoMs / 3600000);
            const agoDay = Math.round(agoMs / 86400000);
            const agoText =
              agoMin < 60 ? `${agoMin}m ago` :
              agoHr  < 24 ? `${agoHr}h ago` :
              agoDay === 1 ? "Yesterday" :
              `${agoDay}d ago`;
            const oc = ownerStyle(sub.coach);
            const initials = (sub.name || "?").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
            const hasPhoto = sub.photoUrls.length > 0;
            const matchedExisting = sub.email
              ? activeClients.find((c) => c.email && c.email.toLowerCase() === sub.email.toLowerCase())
              : null;

            return (
              <div key={sub.id} draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-onboarding", sub.id);
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingOnboarding(sub);
                }}
                onDragEnd={() => {
                  setDraggingOnboarding(null);
                  setOnboardingDropDate(null);
                }}
                title="Drag onto a day in the TDL grid above to schedule"
                style={{
                  background: draggingOnboarding?.id === sub.id ? "rgba(10,186,181,0.10)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${draggingOnboarding?.id === sub.id ? T : BORDER}`,
                  borderLeft: `3px solid ${sub.coach === "Miggy" ? "#f97316" : T}`,
                  borderRadius: 12,
                  padding: isMobile ? "12px" : "14px 16px",
                  display: "flex", gap: 12, alignItems: "flex-start",
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  cursor: "grab",
                  opacity: draggingOnboarding?.id === sub.id ? 0.5 : 1,
                  transition: "background 0.15s, opacity 0.15s, border-color 0.15s",
                  userSelect: "none",
                }}>
                {hasPhoto ? (
                  <img src={sub.photoUrls[0]} alt="" style={{
                    width: 48, height: 48, borderRadius: 10, objectFit: "cover",
                    border: `1px solid ${BORDER}`, flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: oc.bg, border: `1px solid ${oc.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: oc.text, fontSize: 16, fontWeight: 700, flexShrink: 0,
                  }}>{initials}</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{sub.name || "(no name)"}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                      background: oc.bg, color: oc.text, border: `1px solid ${oc.border}`,
                    }}>{sub.coach}</span>
                    <span style={{ fontSize: 10, color: MUTED }}>· {agoText}</span>
                    {matchedExisting && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                        background: "rgba(74,222,128,0.15)", color: GREEN, border: `1px solid rgba(74,222,128,0.40)`,
                      }}>✓ existing client</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                    {sub.email && <span>{sub.email}</span>}
                    {sub.email && sub.phone && <span style={{ color: BORDER }}>  ·  </span>}
                    {sub.phone && <span>{sub.phone}</span>}
                  </div>
                  {(sub.goal || sub.service) && (
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 6, lineHeight: 1.4 }}>
                      {sub.service && <span style={{ color: "rgba(255,255,255,0.45)" }}>{sub.service}</span>}
                      {sub.service && sub.goal && <span style={{ color: BORDER }}>  ·  </span>}
                      {sub.goal && <span>{sub.goal}</span>}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: MUTED, padding: "4px 8px",
                    background: "rgba(255,255,255,0.04)", border: `1px dashed ${BORDER}`, borderRadius: 6,
                    whiteSpace: "nowrap", letterSpacing: "0.04em",
                  }}>↕ Drag</span>
                  <a href={sub.filloutUrl} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: 11, fontWeight: 600, color: MUTED, textDecoration: "none",
                    padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 8,
                  }}>View form ↗</a>
                  <button onClick={() => dismissOnboarding([sub.id])} style={{
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`,
                    borderRadius: 8, padding: "6px 12px", color: MUTED,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>Dismiss</button>
                  <button onClick={() => openOnboardTask(sub)} style={{
                    background: T, color: "#000", border: "none", borderRadius: 8,
                    padding: "7px 14px", fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}>+ Add as task</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div style={{ padding: 40, color: MUTED, textAlign: "center", fontFamily: "system-ui" }}>Loading tasks…</div>;

  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif", color: WHITE, boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 16 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: isMobile ? 12 : 0 }}>
          <div>
            {!isMobile && <div style={{ fontSize: 10, fontWeight: 700, color: T, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 4 }}>Daily operations</div>}
            <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "#fff", margin: "0 0 2px" }}>Tasks &amp; follow-ups</h1>
            {!isMobile && <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Everything that needs action, connected to the right client.</p>}
          </div>
          {/* Layout toggle — always visible */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 3, gap: 2, flexShrink: 0 }}>
            {(["normal","tdl"] as const).map((l) => (
              <button key={l} onClick={() => setLayout(l)} style={{
                padding: isMobile ? "5px 12px" : "6px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: isMobile ? 11 : 12, fontWeight: 600, fontFamily: "inherit",
                background: layout === l ? T : "transparent", color: layout === l ? "#000" : MUTED, transition: "all 0.15s",
              }}>{l === "normal" ? "Normal" : "TDL"}</button>
            ))}
          </div>
        </div>
        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 8, marginTop: isMobile ? 0 : 12, flexWrap: "wrap" }}>
          <button onClick={generateCheckInTasks} disabled={generatingCheckIns} style={{
            background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: isMobile ? "9px 14px" : "8px 18px",
            cursor: generatingCheckIns ? "not-allowed" : "pointer",
            fontSize: isMobile ? 13 : 13, fontWeight: 600, fontFamily: "inherit",
            color: WHITE, opacity: generatingCheckIns ? 0.6 : 1,
            flex: isMobile ? 1 : undefined,
          }}>
            {generatingCheckIns ? "Creating…" : "Input Check Ins"}
          </button>
          <button onClick={() => openAddTask()} style={{
            background: T, color: "#000", border: "none", borderRadius: 10,
            padding: isMobile ? "9px 14px" : "8px 18px",
            cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            flex: isMobile ? 1 : undefined,
          }}>
            + Add task
          </button>
        </div>
      </div>

      {layout === "normal" ? renderNormal() : renderTdl()}

      {renderOnboardingInbox()}

      {renderDrawer()}
      {renderToasts()}

      {/* Colour context menu */}
      {ctxMenu && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed", left: ctxMenu.x, top: ctxMenu.y, zIndex: 300,
            background: "#1a1d2e", border: `1px solid ${BORDER}`,
            borderRadius: 12, padding: "10px 12px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            minWidth: 200,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Pick colour</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 8 }}>
            {COLOR_SWATCHES.filter(s => s.hex).map(s => {
              const current = tasks.find(t => t.id === ctxMenu.taskId)?.color;
              const isActive = current === s.value;
              return (
                <div
                  key={s.label}
                  title={s.label}
                  onClick={() => setTaskColor(ctxMenu.taskId, s.value)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, background: s.hex!,
                    cursor: "pointer", border: isActive ? "2px solid white" : "2px solid transparent",
                    boxShadow: isActive ? "0 0 0 1px rgba(255,255,255,0.4)" : "none",
                    transition: "transform 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
              );
            })}
          </div>
          <button
            onClick={() => setTaskColor(ctxMenu.taskId, null)}
            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px", color: MUTED, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕ Clear colour
          </button>
        </div>
      )}
    </div>
  );
}
