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
  const { name, email, coach, paymentPlatform, weeklyCharge, spreadsheetUrl, status, pausedUntil, startDate } = body;

  if (!name || !coach || !startDate) {
    return NextResponse.json(
      { error: "Missing required fields: name, coach, startDate" },
      { status: 400 }
    );
  }

  if (!["Milzzy", "Miggy"].includes(coach)) {
    return NextResponse.json({ error: "coach must be Milzzy or Miggy" }, { status: 400 });
  }

  if (!["Newie", "Upfront", "Mentorship"].includes(paymentPlatform)) {
    return NextResponse.json({ error: "paymentPlatform must be Newie, Upfront, or Mentorship" }, { status: 400 });
  }

  if (status && !["active", "paused", "cancelled"].includes(status)) {
    return NextResponse.json(
      { error: "status must be active, paused, or cancelled" },
      { status: 400 }
    );
  }

  if (status === "paused" && !pausedUntil) {
    return NextResponse.json(
      { error: "pausedUntil is required when status is paused" },
      { status: 400 }
    );
  }

  if (body.checkInDay && !["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(body.checkInDay)) {
    return NextResponse.json(
      { error: "checkInDay must be a valid day of week" },
      { status: 400 }
    );
  }

  const raw = await redis.get("jarvis:clients");
  const clients = parseClients(raw);

  const newClient = {
    id: Date.now().toString(),
    name,
    email: email ?? "",
    coach,
    paymentPlatform: paymentPlatform ?? "Newie",
    weeklyCharge: weeklyCharge ?? 0,
    spreadsheetUrl: spreadsheetUrl ?? "",
    status: status ?? "active",
    pausedUntil: status === "paused" ? pausedUntil : undefined,
    startDate,
    notes: body.notes ?? "",
    checkInDay: body.checkInDay ?? undefined,
  };

  clients.push(newClient);
  await redis.set("jarvis:clients", JSON.stringify(clients));

  return NextResponse.json(newClient, { status: 201 });
}
