import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "jarvis:projects";

function parseProjects(data: unknown): unknown[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try { return JSON.parse(data); } catch { return []; }
  }
  return [];
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const redis = Redis.fromEnv();

  let projects = parseProjects(await redis.get(REDIS_KEY));

  const idx = (projects as Record<string, unknown>[]).findIndex((p: Record<string, unknown>) => p.id === id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = { ...(projects as Record<string, unknown>[])[idx], ...body, id };
  projects[idx] = updated;
  await redis.set(REDIS_KEY, JSON.stringify(projects));
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const redis = Redis.fromEnv();

  let projects = parseProjects(await redis.get(REDIS_KEY));

  const filtered = (projects as Record<string, unknown>[]).filter((p: Record<string, unknown>) => p.id !== id);
  await redis.set(REDIS_KEY, JSON.stringify(filtered));
  return NextResponse.json({ success: true });
}
