import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseList(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
      if (typeof parsed === "string") return JSON.parse(parsed) as Record<string, unknown>[];
    } catch {
      return [];
    }
  }
  return [];
}

function getISOWeekKey(d: Date): string {
  // ISO 8601 week number — Mon-start
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function shiftWeekKey(weekKey: string, deltaWeeks: number): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return weekKey;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  // Compute the Monday of that ISO week, shift, recompute key
  const jan4 = new Date(year, 0, 4);
  const jan4Dow = (jan4.getDay() + 6) % 7; // 0 = Mon
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - jan4Dow);
  const target = new Date(week1Monday);
  target.setDate(week1Monday.getDate() + (week - 1) * 7 + deltaWeeks * 7);
  return getISOWeekKey(target);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  text?: string;
  title?: string;
  done?: boolean;
  createdAt?: string;
  day?: string;
  owner?: string;
  author?: string;
  clientId?: string;
  dueDate?: string;
}

interface Client {
  id: string;
  name?: string;
  coach: "Milzzy" | "Miggy";
  status: "active" | "paused" | "cancelled";
  weeklyCharge?: number;
  coachCut?: number;
  startDate?: string;
  cancelDate?: string;
  checkInDay?: string;
}

interface Lead {
  id: string;
  assignedTo?: "Milzzy" | "Miggy";
  stage?: string;
  createdAt?: string;
  lastUpdated?: string;
}

// ─── Compute KPIs for a single coach ─────────────────────────────────────────

interface CoachKPIs {
  coach: "Milzzy" | "Miggy";

  // Headline
  activeClients: number;
  pausedClients: number;
  cancelledClients: number;
  weeklyRevenue: number;       // sum of weeklyCharge across active
  coachEarnings: number;       // Milzzy: 100% of his. Miggy: 60% of his (he gets 60, Milzzy 25 — total 85; we use coachCut if present, else infer)
  activeRevenue: number;       // same as weeklyRevenue but cleaner name for UI

  // Check-in performance (last 4 weeks)
  checkIn: {
    thisWeek: { total: number; submitted: number; late: number; missed: number; rate: number };
    last4Weeks: { total: number; submitted: number; late: number; missed: number; rate: number };
    weekly: Array<{ weekKey: string; rate: number; submitted: number; total: number }>;
  };

  // Task performance (last 30 days)
  tasks: {
    totalLast30d: number;
    doneLast30d: number;
    overdueOpen: number;
    completionRate: number;
  };

  // Client health
  clientHealth: {
    staleCount: number;        // active clients with no check-in in last 2 weeks
    staleClients: { id: string; name: string; lastCheckIn: string | null }[];
    avgTenureWeeks: number;    // avg weeks since startDate for active clients
    newLast30d: number;
    cancelledLast30d: number;
  };

  // Lead pipeline
  pipeline: {
    newLeads: number;
    inConsult: number;
    followUp: number;
    signed: number;
    lost: number;
  };
}

const CHECKED_STATUSES = new Set(["ontime", "submitted"]);
const LATE_STATUSES = new Set(["late"]);
const MISSED_STATUSES = new Set(["not-submitted"]);

async function computeCoachKPIs(
  coach: "Milzzy" | "Miggy",
  allClients: Client[],
  allTasks: Task[],
  allLeads: Lead[],
  weeksOfCheckins: Record<string, Record<string, string>>
): Promise<CoachKPIs> {
  const myClients = allClients.filter((c) => c.coach === coach);
  const activeClients = myClients.filter((c) => c.status === "active");
  const pausedClients = myClients.filter((c) => c.status === "paused");
  const cancelledClients = myClients.filter((c) => c.status === "cancelled");

  const weeklyRevenue = activeClients.reduce(
    (s, c) => s + (typeof c.weeklyCharge === "number" ? c.weeklyCharge : 0),
    0
  );
  const coachEarnings = activeClients.reduce((s, c) => {
    if (typeof c.coachCut === "number") return s + c.coachCut;
    // Infer: Milzzy's clients are $100/week (full). Miggy's clients are $85/week → Miggy gets $60.
    if (coach === "Milzzy") return s + (typeof c.weeklyCharge === "number" ? c.weeklyCharge : 0);
    return s + 60;
  }, 0);

  // Check-in performance
  const thisWeekKey = getISOWeekKey(new Date());
  const lastWeekKey = shiftWeekKey(thisWeekKey, -1);

  const computeCheckInForWeek = (wk: string) => {
    const data = weeksOfCheckins[wk] ?? {};
    let submitted = 0, late = 0, missed = 0, total = 0;
    for (const c of activeClients) {
      total += 1;
      const status = data[c.id];
      if (!status || MISSED_STATUSES.has(status)) missed += 1;
      else if (LATE_STATUSES.has(status)) late += 1;
      else if (CHECKED_STATUSES.has(status)) submitted += 1;
      // skip / sick / paused don't count
    }
    const accounted = submitted + late + missed;
    const rate = total > 0 ? Math.round((submitted / total) * 100) : 0;
    return { total, submitted, late, missed, rate, _accounted: accounted };
  };

  const thisWeekCI = computeCheckInForWeek(thisWeekKey);
  const last4: { weekKey: string; rate: number; submitted: number; total: number }[] = [];
  let total4 = 0, submitted4 = 0, late4 = 0, missed4 = 0;
  for (let i = 0; i < 4; i++) {
    const wk = shiftWeekKey(thisWeekKey, -i);
    const ci = computeCheckInForWeek(wk);
    last4.unshift({ weekKey: wk, rate: ci.rate, submitted: ci.submitted, total: ci.total });
    total4 += ci.total;
    submitted4 += ci.submitted;
    late4 += ci.late;
    missed4 += ci.missed;
  }
  const last4Rate = total4 > 0 ? Math.round((submitted4 / total4) * 100) : 0;

  // Tasks last 30 days
  const now = Date.now();
  const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;
  const myTasks = allTasks.filter((t) => {
    const owner = t.owner || t.author;
    return owner === coach;
  });
  const recentTasks = myTasks.filter((t) => {
    const ts = t.createdAt ? new Date(t.createdAt).getTime() : 0;
    return ts >= cutoff30;
  });
  const doneRecent = recentTasks.filter((t) => t.done === true).length;
  const overdueOpen = recentTasks.filter((t) => {
    if (t.done === true) return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate).getTime() < now;
  }).length;
  const completionRate = recentTasks.length > 0 ? Math.round((doneRecent / recentTasks.length) * 100) : 0;

  // Client health
  const staleClients: { id: string; name: string; lastCheckIn: string | null }[] = [];
  for (const c of activeClients) {
    // Find the most recent check-in for this client in any of the last 4 weeks
    let lastSubmitted: string | null = null;
    for (let i = 0; i < 4; i++) {
      const wk = shiftWeekKey(thisWeekKey, -i);
      const status = weeksOfCheckins[wk]?.[c.id];
      if (status && (CHECKED_STATUSES.has(status) || LATE_STATUSES.has(status))) {
        lastSubmitted = wk;
        break;
      }
    }
    if (!lastSubmitted) {
      staleClients.push({ id: c.id, name: c.name ?? "Unknown", lastCheckIn: null });
    }
  }

  // Tenure
  let tenureSum = 0, tenureCount = 0;
  for (const c of activeClients) {
    if (c.startDate) {
      const weeks = Math.floor((now - new Date(c.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeks >= 0) {
        tenureSum += weeks;
        tenureCount += 1;
      }
    }
  }
  const avgTenureWeeks = tenureCount > 0 ? Math.round(tenureSum / tenureCount) : 0;

  // New / cancelled in last 30 days
  const newLast30d = activeClients.filter((c) => c.startDate && new Date(c.startDate).getTime() >= cutoff30).length
    + cancelledClients.filter((c) => c.startDate && new Date(c.startDate).getTime() >= cutoff30).length;
  const cancelledLast30d = cancelledClients.filter((c) => c.cancelDate && new Date(c.cancelDate).getTime() >= cutoff30).length;

  // Lead pipeline
  const myLeads = allLeads.filter((l) => l.assignedTo === coach);
  const pipeline = {
    newLeads: myLeads.filter((l) => l.stage === "new-lead" || l.stage === "book-consult").length,
    inConsult: myLeads.filter((l) => l.stage === "consult-call").length,
    followUp: myLeads.filter((l) => l.stage === "follow-up").length,
    signed: myLeads.filter((l) => l.stage === "signed").length,
    lost: myLeads.filter((l) => l.stage === "lost" || l.stage === "no-show").length,
  };

  return {
    coach,
    activeClients: activeClients.length,
    pausedClients: pausedClients.length,
    cancelledClients: cancelledClients.length,
    weeklyRevenue,
    coachEarnings,
    activeRevenue: weeklyRevenue,
    checkIn: {
      thisWeek: { total: thisWeekCI.total, submitted: thisWeekCI.submitted, late: thisWeekCI.late, missed: thisWeekCI.missed, rate: thisWeekCI.rate },
      last4Weeks: { total: total4, submitted: submitted4, late: late4, missed: missed4, rate: last4Rate },
      weekly: last4,
    },
    tasks: {
      totalLast30d: recentTasks.length,
      doneLast30d: doneRecent,
      overdueOpen,
      completionRate,
    },
    clientHealth: {
      staleCount: staleClients.length,
      staleClients,
      avgTenureWeeks,
      newLast30d,
      cancelledLast30d,
    },
    pipeline,
  };
}

// ─── Main GET handler ─────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [clientsRaw, tasksRaw, leadsRaw] = await Promise.all([
      redis.get("jarvis:clients"),
      redis.get("jarvis:tasks"),
      redis.get("jarvis:leads"),
    ]);

    const allClients = parseList(clientsRaw) as unknown as Client[];
    const allTasks = parseList(tasksRaw) as unknown as Task[];
    const allLeads = parseList(leadsRaw) as unknown as Lead[];

    // Fetch last 4 weeks of check-ins in parallel
    const thisWeekKey = getISOWeekKey(new Date());
    const weekKeys = [0, -1, -2, -3].map((d) => shiftWeekKey(thisWeekKey, d));
    const checkinHashes = await Promise.all(
      weekKeys.map((wk) => redis.hgetall(`jarvis:checkins:${wk}`))
    );
    const weeksOfCheckins: Record<string, Record<string, string>> = {};
    weekKeys.forEach((wk, i) => {
      const raw = checkinHashes[i];
      const parsed: Record<string, string> =
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? (raw as Record<string, string>)
          : {};
      weeksOfCheckins[wk] = parsed;
    });

    const milzzy = await computeCoachKPIs("Milzzy", allClients, allTasks, allLeads, weeksOfCheckins);
    const miggy = await computeCoachKPIs("Miggy", allClients, allTasks, allLeads, weeksOfCheckins);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      weekKeys,
      coaches: [milzzy, miggy],
    });
  } catch (err) {
    console.error("GET /api/coach-kpis error:", err);
    return NextResponse.json(
      { error: "Failed to compute KPIs", detail: String(err) },
      { status: 500 }
    );
  }
}