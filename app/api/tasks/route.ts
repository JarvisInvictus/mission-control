import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

export async function GET() {
  try {
    const tasks = await redis.get("jarvis:tasks");
    return NextResponse.json(tasks ? JSON.parse(tasks as string) : []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, day, author } = body;
  if (!text || !day) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    const raw = await redis.get("jarvis:tasks");
    const tasks: unknown[] = raw ? JSON.parse(raw as string) : [];
    const newTask = { id: Date.now().toString(), text, day, done: false, author: author || "Milzzy" };
    tasks.push(newTask);
    await redis.set("jarvis:tasks", JSON.stringify(tasks));
    return NextResponse.json(newTask);
  } catch {
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, done } = body;
  if (id === undefined) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const raw = await redis.get("jarvis:tasks");
    const tasks: unknown[] = raw ? JSON.parse(raw as string) : [];
    const idx = tasks.findIndex((t: any) => t.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    (tasks[idx] as any).done = done;
    await redis.set("jarvis:tasks", JSON.stringify(tasks));
    return NextResponse.json(tasks[idx]);
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const raw = await redis.get("jarvis:tasks");
    const tasks: unknown[] = raw ? JSON.parse(raw as string) : [];
    const filtered = tasks.filter((t: any) => t.id !== id);
    await redis.set("jarvis:tasks", JSON.stringify(filtered));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}