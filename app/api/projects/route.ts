import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const REDIS_KEY = "jarvis:projects";

export async function GET() {
  const redis = Redis.fromEnv();
  const data = await redis.get(REDIS_KEY);
  const projects = data ? JSON.parse(data as string) : [];
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json();
  const redis = Redis.fromEnv();

  let projects: unknown[] = [];
  const existing = await redis.get(REDIS_KEY);
  if (existing) projects = JSON.parse(existing as string);

  const newProject = {
    id: Date.now().toString(),
    title: body.title || "Untitled",
    desc: body.desc || "",
    color: body.color || "teal",
    status: body.status || "active",
    tag: body.tag || "",
    due: body.due || null,
    tasks: body.tasks || [],
    createdAt: new Date().toISOString(),
  };

  projects.push(newProject);
  await redis.set(REDIS_KEY, JSON.stringify(projects));
  return NextResponse.json(newProject, { status: 201 });
}
