import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

function getTasks(): Record<string, unknown>[] {
  const raw = redis.get("jarvis:tasks");
  if (!raw) return [];
  if (typeof raw === "string") return JSON.parse(raw);
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  return [];
}

function setTasks(tasks: Record<string, unknown>[]) {
  redis.set("jarvis:tasks", JSON.stringify(tasks));
}

export async function GET() {
  try {
    const tasks = getTasks();
    return NextResponse.json(tasks);
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
    const tasks = getTasks();
    const newTask = { id: Date.now().toString(), text, day, done: false, author: author || "Milzzy" };
    tasks.push(newTask);
    setTasks(tasks);
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
    const tasks = getTasks();
    const idx = tasks.findIndex((t: any) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    (tasks[idx] as any).done = done;
    setTasks(tasks);
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
    const tasks = getTasks();
    const filtered = tasks.filter((t: any) => t.id !== id);
    setTasks(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}