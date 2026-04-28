import { NextRequest, NextResponse } from "next/server";

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisCommand(cmd: string, ...args: string[]): Promise<unknown> {
  const body = JSON.stringify([cmd, ...args]);
  const res = await fetch(REDIS_REST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body,
  });
  const data = await res.json();
  return data.result;
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await redisCommand("GET", "jarvis:tasks");
    if (!raw) return NextResponse.json([]);
    if (typeof raw === "string") return NextResponse.json(JSON.parse(raw));
    return NextResponse.json(raw);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, day, author } = body;
  if (!text || !day) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const raw = await redisCommand("GET", "jarvis:tasks");
    const tasks: Record<string, unknown>[] = (!raw || raw === null)
      ? []
      : (typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []));
    const newTask = { id: Date.now().toString(), text, day, done: false, author: author || "Milzzy" };
    tasks.push(newTask);
    await redisCommand("SET", "jarvis:tasks", JSON.stringify(tasks));
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
    const raw = await redisCommand("GET", "jarvis:tasks");
    const tasks: Record<string, unknown>[] = (!raw || raw === null)
      ? []
      : (typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []));
    const idx = tasks.findIndex((t: any) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    (tasks[idx] as any).done = done;
    await redisCommand("SET", "jarvis:tasks", JSON.stringify(tasks));
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
    const raw = await redisCommand("GET", "jarvis:tasks");
    const tasks: Record<string, unknown>[] = (!raw || raw === null)
      ? []
      : (typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []));
    const filtered = tasks.filter((t: any) => t.id !== id);
    await redisCommand("SET", "jarvis:tasks", JSON.stringify(filtered));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}