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
  if (!res.ok) {
    throw new Error(`Loom API error: ${res.status}`);
  }
  const data = await res.json();
  // Loom returns { text: "..." } or { transcript: "..." } depending on version
  return typeof data === "string" ? data : (data.text ?? data.transcript ?? JSON.stringify(data));
}

export async function POST(request: Request) {
  try {
    const { videoId, title, recordedAt } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    let transcript = "";
    try {
      transcript = await fetchLoomTranscript(videoId);
    } catch (e) {
      console.error("[loom/webhook] Failed to fetch transcript:", e);
      // Continue anyway — store without transcript rather than fail
    }

    const entry = {
      id: videoId,
      title: title ?? "Untitled",
      transcript,
      recordedAt: recordedAt ?? new Date().toISOString(),
      type: /check\s*in/i.test(title ?? "") ? "checkin" : "other",
      createdAt: new Date().toISOString(),
    };

    const redis = Redis.fromEnv();
    const existing: unknown[] = (await redis.get("jarvis:transcripts")) as unknown[] ?? [];
    const updated = [entry, ...(Array.isArray(existing) ? existing : [])];
    await redis.set("jarvis:transcripts", JSON.stringify(updated));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[loom/webhook] error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
