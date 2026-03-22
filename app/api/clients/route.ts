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

export async function GET() {
  const raw = await redis.get("jarvis:clients");
  const clients = parseClients(raw);
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, coach, status, startDate } = body;

  if (!name || !coach || !startDate) {
    return NextResponse.json(
      { error: "Missing required fields: name, coach, startDate" },
      { status: 400 }
    );
  }

  if (!["Milzzy", "Miggy"].includes(coach)) {
    return NextResponse.json({ error: "coach must be Milzzy or Miggy" }, { status: 400 });
  }

  if (status && !["active", "paused", "completed"].includes(status)) {
    return NextResponse.json(
      { error: "status must be active, paused, or completed" },
      { status: 400 }
    );
  }

  const raw = await redis.get("jarvis:clients");
  const clients = parseClients(raw);

  const newClient = {
    id: Date.now().toString(),
    name,
    coach,
    status: status || "active",
    startDate,
    notes: body.notes || "",
  };

  clients.push(newClient);
  await redis.set("jarvis:clients", JSON.stringify(clients));

  return NextResponse.json(newClient, { status: 201 });
}
