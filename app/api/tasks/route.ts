import { NextRequest, NextResponse } from "next/server";

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function upstashGet(key: string): Promise<string | null> {
  const res = await fetch(`${REDIS_REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}` },
  });
  const data = await res.json() as { result: string | null };
  return data.result;
}

async function upstashSet(key: string, value: string): Promise<void> {
  await fetch(`${REDIS_REST_URL}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

// Debug: check raw Redis response
export async function PUT(req: NextRequest) {
  const res = await fetch(`${REDIS_REST_URL}/get/${encodeURIComponent("jarvis:tasks")}`, {
    headers: { Authorization: `Bearer ${REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
  });
  const text = await res.text();
  console.error("UPSTASH_RAW:", text);
  try {
    const data = JSON.parse(text);
    const raw = data.result;
    console.error("RESULT_TYPE:", typeof raw, "IS_ARRAY:", Array.isArray(raw));
    console.error("RESULT_VALUE:", String(raw).slice(0, 80));
    return NextResponse.json({ received: text.slice(0, 100), rawType: typeof raw, isArray: Array.isArray(raw) });
  } catch(e) {
    return NextResponse.json({ error: String(e), raw: text.slice(0, 100) });
  }
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await upstashGet("jarvis:tasks");
    if (!raw) return NextResponse.json([]);
    return NextResponse.json(JSON.parse(raw));
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
    const raw = await upstashGet("jarvis:tasks");
    const tasks: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];
    const newTask = { id: Date.now().toString(), text, day, done: false, author: author || "Milzzy" };
    tasks.push(newTask);
    await upstashSet("jarvis:tasks", JSON.stringify(tasks));
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
    const raw = await upstashGet("jarvis:tasks");
    const tasks: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];
    const idx = tasks.findIndex((t: any) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    (tasks[idx] as any).done = done;
    await upstashSet("jarvis:tasks", JSON.stringify(tasks));
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
    const raw = await upstashGet("jarvis:tasks");
    const tasks: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];
    const filtered = tasks.filter((t: any) => t.id !== id);
    await upstashSet("jarvis:tasks", JSON.stringify(filtered));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}