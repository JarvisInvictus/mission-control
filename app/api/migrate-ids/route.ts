import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const redis = Redis.fromEnv();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseClients(raw: unknown): Record<string, unknown>[] {
  if (!raw) return [];
  if (typeof raw === "string") return JSON.parse(raw);
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  return [];
}

export async function POST() {
  const raw = await redis.get("jarvis:clients");
  const clients: Record<string, unknown>[] = parseClients(raw);
  const existingSlugs = new Set<string>();
  const updates: Record<string, string> = {};
  for (const c of clients) {
    const oldId = String(c.id);
    const baseSlug = slugify(String(c.name));
    let slug = baseSlug;
    let counter = 1;
    while (existingSlugs.has(slug)) { slug = baseSlug + "-" + counter; counter++; }
    existingSlugs.add(slug);
    if (oldId !== slug) updates[oldId] = slug;
    c.id = slug;
  }
  await redis.set("jarvis:clients", JSON.stringify(clients));
  return NextResponse.json({ success: true, migrated: Object.keys(updates).length, mapping: updates, totalClients: clients.length });
}
