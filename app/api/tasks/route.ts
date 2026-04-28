import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

function redisGet(key: string): Promise<unknown> {
  return fetch(`${REDIS_REST_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}` },
  }).then(r => r.json()).then(d => d.result);
}

function redisSet(key: string, value: string): Promise<void> {
  return fetch(`${REDIS_REST_URL}/set/${key}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  }).then(r => r.json()).then(d => d.result);
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await redisGet("jarvis:tasks");
    if (!raw) return NextResponse.json([]);
    return NextResponse.json(typeof raw === "string" ? JSON.parse(raw) : raw);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, day, author } = body;
  if (!text || !day) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const raw = await redisGet("jarvis:tasks");
    const tasks: Record<string, unknown>[] = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw as any) : [];
    const newTask = { id: Date.now().toString(), text, day, done: false, author: author || "Milzzy" };
    tasks.push(newTask);
    await redisSet("jarvis:tasks", JSON.stringify(tasks));
    return NextResponse.json(newTask);
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to save", detail: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, done } = body;
  if (id === undefined) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const raw = await redisGet("jarvis:tasks");
    const tasks: Record<string, unknown>[] = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw as any) : [];
    const idx = tasks.findIndex((t: any) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    (tasks[idx] as any).done = done;
    await redisSet("jarvis:tasks", JSON.stringify(tasks));
    return NextResponse.json(tasks[idx]);
  } catch (err) {
    console.error("PATCH /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const raw = await redisGet("jarvis:tasks");
    const tasks: Record<string, unknown>[] = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw as any) : [];
    const filtered = tasks.filter((t: any) => t.id !== id);
    await redisSet("jarvis:tasks", JSON.stringify(filtered));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}