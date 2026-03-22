import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

function parseClients(raw: unknown): Record<string, unknown>[] {
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

  const raw = await redis.get("jarvis:clients");
  const clients: Record<string, unknown>[] = parseClients(raw);

  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const allowedFields = ["name", "coach", "status", "startDate", "notes"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  // Validate coach if provided
  if (updates.coach && !["Milzzy", "Miggy"].includes(updates.coach as string)) {
    return NextResponse.json(
      { error: "coach must be Milzzy or Miggy" },
      { status: 400 }
    );
  }

  // Validate status if provided
  if (
    updates.status &&
    !["active", "paused", "completed"].includes(updates.status as string)
  ) {
    return NextResponse.json(
      { error: "status must be active, paused, or completed" },
      { status: 400 }
    );
  }

  clients[idx] = { ...clients[idx], ...updates };
  await redis.set("jarvis:clients", JSON.stringify(clients));

  return NextResponse.json(clients[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const raw = await redis.get("jarvis:clients");
  const clients: Record<string, unknown>[] = parseClients(raw);

  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  clients.splice(idx, 1);
  await redis.set("jarvis:clients", JSON.stringify(clients));

  return NextResponse.json({ success: true });
}
