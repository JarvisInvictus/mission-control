import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonArray } from "@/lib/redis";
import type { PodcastEpisode } from "../route";

export const dynamic = "force-dynamic";

// PATCH /api/team/podcast/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const redis = getRedis();
    const items = parseJsonArray<PodcastEpisode>(await redis.get(TEAM_KEYS.podcast));

    const idx = items.findIndex((e) => e.id === id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

    items[idx] = {
      ...items[idx],
      ...body,
      id: items[idx].id,
      createdAt: items[idx].createdAt,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(TEAM_KEYS.podcast, JSON.stringify(items));
    return NextResponse.json({ item: items[idx] });
  } catch (err) {
    console.error("PATCH /api/team/podcast error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE /api/team/podcast/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const redis = getRedis();
    const items = parseJsonArray<PodcastEpisode>(await redis.get(TEAM_KEYS.podcast));
    const filtered = items.filter((e) => e.id !== id);
    await redis.set(TEAM_KEYS.podcast, JSON.stringify(filtered));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/team/podcast error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
