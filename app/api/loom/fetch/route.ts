import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function fetchLoomTranscript(videoId: string): Promise<string> {
  const res = await fetch(
    `https://www.loom.com/api/campaigns/sessions/${videoId}/transcription`,
    {
      headers: {
        "Authorization": `Bearer ${process.env.LOOM_API_KEY ?? ""}`,
        "Accept": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`Loom API error: ${res.status}`);
  const data = await res.json();
  return typeof data === "string" ? data : (data.text ?? data.transcript ?? JSON.stringify(data));
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "URL is required" }, { status: 400 });

    // Extract video ID from Loom URL
    const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (!match) return NextResponse.json({ error: "Invalid Loom URL" }, { status: 400 });
    const videoId = match[1];

    let transcript = "";
    try {
      transcript = await fetchLoomTranscript(videoId);
    } catch {
      // continue without transcript
    }

    // Try to get title from Loom embed page
    let title = "Loom Recording";
    try {
      const pageRes = await fetch(url, { headers: { "Accept": "text/html" } });
      if (pageRes.ok) {
        const html = await pageRes.text();
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) title = titleMatch[1].replace(" - Loom", "").trim();
      }
    } catch {}

    const entry = {
      id: videoId,
      title,
      transcript,
      recordedAt: new Date().toISOString(),
      type: /check\s*in/i.test(title) ? "checkin" : "other",
      createdAt: new Date().toISOString(),
    };

    const redis = Redis.fromEnv();
    const existing: unknown[] = (await redis.get("jarvis:transcripts")) as unknown[] ?? [];
    const updated = [entry, ...(Array.isArray(existing) ? existing : [])];
    await redis.set("jarvis:transcripts", JSON.stringify(updated));

    return NextResponse.json({ transcript: entry });
  } catch (err: unknown) {
    console.error("[loom/fetch] error:", err);
    return NextResponse.json({ error: "Failed to fetch transcript" }, { status: 500 });
  }
}
