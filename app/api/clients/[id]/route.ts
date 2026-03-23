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

  const allowedFields = [
    "name", "email", "coach", "paymentPlatform", "weeklyCharge",
    "spreadsheetUrl", "status", "pausedUntil", "startDate", "notes",
    "checkInDay",
  ];
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

  // Validate paymentPlatform if provided
  if (
    updates.paymentPlatform &&
    !["Newie", "Upfront", "Mentorship"].includes(updates.paymentPlatform as string)
  ) {
    return NextResponse.json(
      { error: "paymentPlatform must be Newie, Upfront, or Mentorship" },
      { status: 400 }
    );
  }

  // Validate status if provided
  if (
    updates.status &&
    !["active", "paused", "cancelled"].includes(updates.status as string)
  ) {
    return NextResponse.json(
      { error: "status must be active, paused, or cancelled" },
      { status: 400 }
    );
  }

  // Clear pausedUntil if status is not paused
  if (updates.status && updates.status !== "paused") {
    updates.pausedUntil = undefined;
  }

  // Validate checkInDay if provided
  if (
    updates.checkInDay &&
    !["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(updates.checkInDay as string)
  ) {
    return NextResponse.json(
      { error: "checkInDay must be a valid day of week" },
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
