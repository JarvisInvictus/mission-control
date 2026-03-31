import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRedis() {
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ─── Field extraction ────────────────────────────────────────────────────────
// Fillout sends: { submission: { questions: [{ name: "Field Name:", value: "..." }] } }
// Field names include trailing colons (e.g. "Full Name:")
function buildFieldMap(questions: Array<{ name: string; value: unknown }>): Record<string, string> {
  const fieldMap: Record<string, string> = {};
  for (const item of questions) {
    fieldMap[item.name.toLowerCase()] = String(item.value ?? "");
  }
  return fieldMap;
}

function getQ(fieldMap: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    const key = Object.keys(fieldMap).find((k) => k.includes(a.toLowerCase()));
    if (key && fieldMap[key]) return fieldMap[key];
  }
  return "";
}

async function getLeads(): Promise<Record<string, unknown>[]> {
  const redis = getRedis();
  if (!redis) return [];
  const raw = await redis.get("jarvis:leads");
  if (!raw) return [];
  if (typeof raw === "string") return JSON.parse(raw);
  if (Array.isArray(raw)) return raw;
  return [];
}

async function saveLeads(leads: Record<string, unknown>[]) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set("jarvis:leads", JSON.stringify(leads));
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Log raw payload so we can see exactly what Fillout is sending
  const rawStr = JSON.stringify(body);
  console.log("RAW_FILLOUT_BODY_START" + rawStr + "RAW_FILLOUT_BODY_END");
  console.log("RAW_FILLOUT_HEADERS:", JSON.stringify({
    "content-type": request.headers.get("content-type"),
    "user-agent": request.headers.get("user-agent"),
    "x-fillout": request.headers.get("x-fillout-version"),
  }));

  // Extract questions from body.submission.questions
  // Fillout structure: { submission: { questions: [{ name: "Full Name:", value: "..." }] } }
  const questions = (body.submission as Record<string, unknown> | undefined)?.questions as Array<{ name: string; value: unknown }> | undefined;
  const q = questions ?? [];
  const fieldMap = buildFieldMap(q);

  const name        = getQ(fieldMap, "full name") || "Unknown";
  const email       = getQ(fieldMap, "email");
  const phoneRaw    = getQ(fieldMap, "mobile", "phone", "whatsapp");
  const phone       = phoneRaw.replace(/\D/g, "").replace(/^0/, "61");
  const instagram   = getQ(fieldMap, "instagram").replace("@", "");
  const goal        = getQ(fieldMap, "goal");
  const source      = "Instagram"; // Fillout form is Instagram-sourced

  const id   = slugify(name) + "-" + Date.now();
  const date = new Date().toISOString().split("T")[0];

  const newLead: Record<string, unknown> = {
    id,
    name,
    email,
    phone,
    instagram,
    goal,
    source: source || "Instagram",
    stage: "new-lead",
    assignedTo: "Milzzy",
    createdAt: date,
    notes: "",
  };

  console.log("[leads/inbound] Parsed lead:", JSON.stringify(newLead));

  const leads = await getLeads();
  leads.push(newLead);
  await saveLeads(leads);

  return NextResponse.json({ success: true, lead: newLead }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ status: "Leads inbound endpoint is live" }, { status: 200 });
}
