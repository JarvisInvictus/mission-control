import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

function parseLeads(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (typeof raw === "string") return JSON.parse(raw);
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  return [];
}

export async function GET() {
  const raw = await redis.get("jarvis:leads");
  const leads = parseLeads(raw);
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, source, notes, assignedTo } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (source && !["Instagram", "Referral", "Other"].includes(source)) {
    return NextResponse.json({ error: "source must be Instagram, Referral, or Other" }, { status: 400 });
  }

  if (assignedTo && !["Milzzy", "Miggy"].includes(assignedTo)) {
    return NextResponse.json({ error: "assignedTo must be Milzzy or Miggy" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    email: email?.trim() || "",
    phone: phone?.trim() || "",
    source: source || "Other",
    stage: "enquiry",
    stageHistory: [{ stage: "enquiry", date: now }],
    notes: notes?.trim() || "",
    assignedTo: assignedTo || "Milzzy",
    createdAt: now,
    lastUpdated: now,
  };

  const raw = await redis.get("jarvis:leads");
  const leads: Record<string, unknown>[] = parseLeads(raw);
  leads.push(lead);
  await redis.set("jarvis:leads", JSON.stringify(leads));

  return NextResponse.json(lead, { status: 201 });
}
