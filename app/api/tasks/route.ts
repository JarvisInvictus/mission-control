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
  const data = await res.json() as { result: unknown };
  return data.result;
}

function parseTasks(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    try { return JSON.parse(JSON.stringify(raw)); } catch { return raw as Record<string, unknown>[]; }
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string") return JSON.parse(parsed);
      return parsed;
    } catch { return []; }
  }
  return [];
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await redisCommand("GET", "jarvis:tasks");
    const tasks = parseTasks(raw);
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Support both legacy (text, day, author) and new (title, dueDate, owner, etc.)
  const title = (body.title || body.text || "").trim();
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

  try {
    const raw = await redisCommand("GET", "jarvis:tasks");
    let tasks = parseTasks(raw);
    if (!Array.isArray(tasks)) tasks = [];

    const now = new Date().toISOString();
    const newTask: Record<string, unknown> = {
      id: Date.now().toString(),
      title,
      text: title,                            // legacy compat
      done: false,
      createdAt: now,
      // Legacy fields
      day: body.day || "",
      author: body.owner || body.author || "Milzzy",
      // New fields
      owner: body.owner || body.author || "Milzzy",
      clientId: body.clientId || null,
      category: body.category || "",
      priority: body.priority || "medium",
      dueDate: body.dueDate || null,
      sortOrder: body.sortOrder ?? tasks.length,
      notes: body.notes || "",
    };
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
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const raw = await redisCommand("GET", "jarvis:tasks");
    let tasks = parseTasks(raw);
    if (!Array.isArray(tasks)) tasks = [];
    const idx = tasks.findIndex((t: any) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const allowed = ["title", "text", "done", "clientId", "category", "priority",
                     "owner", "author", "dueDate", "day", "sortOrder", "notes", "completedAt", "archived", "status"];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }

    // Sync legacy fields
    if (updates.title) updates.text = updates.title;
    if (updates.owner) updates.author = updates.owner;
    if (updates.author && !updates.owner) updates.owner = updates.author;

    // Auto-set completedAt
    if (updates.done === true && !(tasks[idx] as any).completedAt && !updates.completedAt) {
      updates.completedAt = new Date().toISOString();
    }
    if (updates.done === false) updates.completedAt = null;

    tasks[idx] = { ...(tasks[idx] as object), ...updates };
    await redisCommand("SET", "jarvis:tasks", JSON.stringify(tasks));
    return NextResponse.json(tasks[idx]);
  } catch (err) {
    console.error("PATCH /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// Bulk reorder (for drag-and-drop sort order updates)
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { updates } = body; // [{ id, dueDate, sortOrder }]
  if (!Array.isArray(updates)) return NextResponse.json({ error: "updates must be an array" }, { status: 400 });

  try {
    const raw = await redisCommand("GET", "jarvis:tasks");
    let tasks = parseTasks(raw);
    if (!Array.isArray(tasks)) tasks = [];

    for (const u of updates as { id: string; dueDate?: string; sortOrder?: number; day?: string }[]) {
      const idx = tasks.findIndex((t: any) => t.id === u.id);
      if (idx === -1) continue;
      if (u.dueDate !== undefined) (tasks[idx] as any).dueDate = u.dueDate;
      if (u.sortOrder !== undefined) (tasks[idx] as any).sortOrder = u.sortOrder;
      if (u.day !== undefined) (tasks[idx] as any).day = u.day;
    }
    await redisCommand("SET", "jarvis:tasks", JSON.stringify(tasks));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const raw = await redisCommand("GET", "jarvis:tasks");
    let tasks = parseTasks(raw);
    if (!Array.isArray(tasks)) tasks = [];
    const filtered = tasks.filter((t: any) => t.id !== id);
    await redisCommand("SET", "jarvis:tasks", JSON.stringify(filtered));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
