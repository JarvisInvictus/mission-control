import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonArray } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET /api/team/goals
export async function GET() {
  try {
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.goals);
    const items = parseJsonArray<QuarterlyGoal>(raw);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/team/goals error:", err);
    return NextResponse.json({ items: [] });
  }
}

// POST /api/team/goals — create a new top-level objective for a quarter
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const redis = getRedis();
    const items = parseJsonArray<QuarterlyGoal>(await redis.get(TEAM_KEYS.goals));

    const newGoal: QuarterlyGoal = {
      id: `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      quarter: (body.quarter || "").trim() || currentQuarter(),
      title: (body.title || "").trim() || "Untitled objective",
      owner: body.owner || "Shared",
      keyResults: Array.isArray(body.keyResults) ? body.keyResults : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.unshift(newGoal);
    await redis.set(TEAM_KEYS.goals, JSON.stringify(items));
    return NextResponse.json({ item: newGoal });
  } catch (err) {
    console.error("POST /api/team/goals error:", err);
    return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
  }
}

function currentQuarter(): string {
  const m = new Date().getMonth();
  const q = Math.floor(m / 3) + 1;
  return `${new Date().getFullYear()}-Q${q}`;
}

export interface KeyResult {
  id: string;
  text: string;
  progress: number; // 0-100
  done: boolean;
}

export interface QuarterlyGoal {
  id: string;
  quarter: string; // e.g. "2026-Q3"
  title: string;
  owner: "Milzzy" | "Miggy" | "Sonta" | "Shared";
  keyResults: KeyResult[];
  createdAt: string;
  updatedAt: string;
}
