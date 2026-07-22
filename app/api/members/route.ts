import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

function parseMembers(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (typeof raw === "string") return JSON.parse(raw);
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  return [];
}

export async function GET() {
  const raw = await redis.get("jarvis:gym_members");
  const members = parseMembers(raw);
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const required = ["firstName", "lastName", "phone", "email", "dob", "emergencyContactName", "emergencyContactPhone", "waiverSigned"];
  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
    }
  }

  const id = `${body.firstName.toLowerCase()}-${body.lastName.toLowerCase()}-${Date.now()}`;
  const member = {
    id,
    firstName: body.firstName,
    lastName: body.lastName,
    dob: body.dob,
    phone: body.phone,
    email: body.email,
    healthNotes: body.healthNotes || "",
    injuries: body.injuries || "",
    emergencyContactName: body.emergencyContactName,
    emergencyContactPhone: body.emergencyContactPhone,
    waiverSigned: Boolean(body.waiverSigned),
    waiverSignedAt: body.waiverSigned ? new Date().toISOString() : null,
    signedIp: req.headers.get("x-forwarded-for") || "unknown",
    createdAt: new Date().toISOString(),
    tags: [],
  };

  const existing = parseMembers(await redis.get("jarvis:gym_members"));
  const updated = [member, ...existing];
  await redis.set("jarvis:gym_members", JSON.stringify(updated));

  return NextResponse.json({ success: true, member });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing member id" }, { status: 400 });

  const existing = parseMembers(await redis.get("jarvis:gym_members"));
  const idx = existing.findIndex((m: any) => m.id === body.id);
  if (idx === -1) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const updated = { ...existing[idx], ...body, updatedAt: new Date().toISOString() };
  existing[idx] = updated;
  await redis.set("jarvis:gym_members", JSON.stringify(existing));

  return NextResponse.json({ success: true, member: updated });
}
