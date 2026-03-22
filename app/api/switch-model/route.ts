import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

const VALID_MODELS = [
  "anthropic/claude-sonnet-4-6",
  "minimax/MiniMax-M2.7",
  "kimi/kimi-k2-5",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model } = body;

    if (!model || !VALID_MODELS.includes(model)) {
      return NextResponse.json(
        { ok: false, error: "Invalid model. Must be one of: " + VALID_MODELS.join(", ") },
        { status: 400 }
      );
    }

    await redis.set("jarvis:model-override", model, { ex: 86400 }); // 24h TTL

    return NextResponse.json({ ok: true, model });
  } catch (err) {
    console.error("[/api/switch-model] Error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
