import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing: unknown = await redis.get("jarvis:gym_members");
  const members = Array.isArray(existing) ? existing : [];
  const updated = (members as Record<string, unknown>[]).filter((m: any) => m.id !== id);
  await redis.set("jarvis:gym_members", JSON.stringify(updated));
  return NextResponse.json({ success: true });
}
