import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: "You are a content strategist for Invictus Physiques, an online physique coaching brand. Analyse the provided transcript or coaching notes and generate 6–8 content ideas. For each idea return JSON with fields: hook, contentType (Reel/Carousel/Story), platform (Instagram/YouTube), caption. Return only a JSON array, no markdown or preamble.",
      messages: [
        { role: "user", content: transcript }
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const ideas = JSON.parse(cleaned);

    return NextResponse.json({ ideas });
  } catch (err: unknown) {
    console.error("[content/generate] error:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
