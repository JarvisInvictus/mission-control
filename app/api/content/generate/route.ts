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
      max_tokens: 2000,
      system: "You are a content strategist for Invictus Physiques, an online physique coaching brand. Analyse the provided transcript or coaching notes and generate 6–8 content ideas. For each idea return a JSON object with exactly these fields: hook (string), contentType (one of: Reel, Carousel, Story), platform (one of: Instagram, YouTube), caption (string). Return ONLY a valid JSON array of objects — no markdown, no explanation, no preamble, just the raw JSON array.",
      messages: [
        { role: "user", content: transcript }
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    let ideas: unknown = null;
    let raw = text.trim();

    // Step 1: strip markdown code fences
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

    // Step 2: try direct parse
    try { ideas = JSON.parse(raw); } catch {}

    // Step 3: try extracting a JSON array (non-greedy, dotall flag)
    if (!ideas || !Array.isArray(ideas)) {
      const m = raw.match(/\[([\s\S]*?)\]/);
      if (m) {
        try { ideas = JSON.parse("[" + m[1] + "]"); } catch {}
      }
    }

    // Step 4: find the first { or [ and parse from there
    if (!ideas || !Array.isArray(ideas)) {
      const start = raw.search(/[[{]/);
      if (start >= 0) {
        try { ideas = JSON.parse(raw.slice(start)); } catch {}
      }
    }

    if (!Array.isArray(ideas)) {
      return NextResponse.json({ error: "AI returned an unexpected format. Try again with shorter or clearer notes." }, { status: 422 });
    }

    return NextResponse.json({ ideas });
  } catch (err: unknown) {
    console.error("[content/generate] error:", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
