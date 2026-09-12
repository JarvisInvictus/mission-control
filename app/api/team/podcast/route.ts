import { NextRequest, NextResponse } from "next/server";
import { getRedis, TEAM_KEYS, parseJsonArray } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET /api/team/podcast
export async function GET() {
  try {
    const redis = getRedis();
    const raw = await redis.get(TEAM_KEYS.podcast);
    const items = parseJsonArray<PodcastEpisode>(raw);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/team/podcast error:", err);
    return NextResponse.json({ items: [] });
  }
}

// POST /api/team/podcast
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const redis = getRedis();
    const items = parseJsonArray<PodcastEpisode>(await redis.get(TEAM_KEYS.podcast));

    const newEp: PodcastEpisode = {
      id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      number: typeof body.number === "number" ? body.number : null,
      title: (body.title || "").trim() || "Untitled episode",
      guest: (body.guest || "").trim(),
      topic: (body.topic || "").trim(),
      notes: (body.notes || "").trim(),
      status: body.status || "idea", // idea | planned | recorded | published
      owner: body.owner || "Milzzy",
      targetDate: body.targetDate || null,
      publishDate: body.publishDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.unshift(newEp);
    await redis.set(TEAM_KEYS.podcast, JSON.stringify(items));
    return NextResponse.json({ item: newEp });
  } catch (err) {
    console.error("POST /api/team/podcast error:", err);
    return NextResponse.json({ error: "Failed to save episode" }, { status: 500 });
  }
}

export interface PodcastEpisode {
  id: string;
  number: number | null;
  title: string;
  guest: string;
  topic: string;
  notes: string;
  status: "idea" | "planned" | "recorded" | "published";
  owner: string;
  targetDate: string | null;
  publishDate: string | null;
  createdAt: string;
  updatedAt: string;
}
