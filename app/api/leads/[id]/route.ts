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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const raw = await redis.get("jarvis:leads");
  const leads: Record<string, unknown>[] = parseLeads(raw);

  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const allowedFields = [
    "name", "email", "phone", "source", "stage", "notes", "assignedTo", "followUpDue",
  ];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Validate source if provided
  if (updates.source && !["Instagram", "Referral", "Other"].includes(updates.source as string)) {
    return NextResponse.json({ error: "source must be Instagram, Referral, or Other" }, { status: 400 });
  }

  // Validate assignedTo if provided
  if (updates.assignedTo && !["Milzzy", "Miggy"].includes(updates.assignedTo as string)) {
    return NextResponse.json({ error: "assignedTo must be Milzzy or Miggy" }, { status: 400 });
  }

  // Validate stage if provided
  const validStages = ["enquiry", "consult_booked", "consult_done", "payment", "onboarding", "active"];
  if (updates.stage && !validStages.includes(updates.stage as string)) {
    return NextResponse.json({ error: `stage must be one of: ${validStages.join(", ")}` }, { status: 400 });
  }

  // If stage changed, append to stageHistory
  if (updates.stage && updates.stage !== leads[idx].stage) {
    const history = (leads[idx].stageHistory as { stage: string; date: string }[]) || [];
    updates.stageHistory = [...history, { stage: updates.stage as string, date: new Date().toISOString() }];
  }

  updates.lastUpdated = new Date().toISOString();

  leads[idx] = { ...leads[idx], ...updates };
  await redis.set("jarvis:leads", JSON.stringify(leads));

  return NextResponse.json(leads[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const raw = await redis.get("jarvis:leads");
  const leads: Record<string, unknown>[] = parseLeads(raw);

  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  leads.splice(idx, 1);
  await redis.set("jarvis:leads", JSON.stringify(leads));

  return NextResponse.json({ success: true });
}
