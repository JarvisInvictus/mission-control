import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonArray } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET /api/team/content
// Returns all content items: { items: ContentItem[] }
export async function GET() {
  try {
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.content);
    const items = parseJsonArray<ContentItem>(raw);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/team/content error:", err);
    return NextResponse.json({ items: [] });
  }
}

// POST /api/team/content
// Body: ContentItem (without id/createdAt)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const redis = getRedis();
    const items = parseJsonArray<ContentItem>(await redis.get(TEAM_KEYS.content));

    const newItem: ContentItem = {
      id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      title: (body.title || "").trim() || "Untitled",
      notes: (body.notes || "").trim(),
      status: body.status || "idea", // idea | progress | scheduled | posted
      owner: body.owner || "Shared", // Milzzy | Miggy | Sonta | Shared
      tags: Array.isArray(body.tags) ? body.tags : [],
      scheduledFor: body.scheduledFor || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.unshift(newItem);
    await redis.set(TEAM_KEYS.content, JSON.stringify(items));
    return NextResponse.json({ item: newItem });
  } catch (err) {
    console.error("POST /api/team/content error:", err);
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 });
  }
}

export interface ContentItem {
  id: string;
  title: string;
  notes: string;
  status: "idea" | "progress" | "scheduled" | "posted";
  owner: "Milzzy" | "Miggy" | "Sonta" | "Shared";
  tags: string[];
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
}
