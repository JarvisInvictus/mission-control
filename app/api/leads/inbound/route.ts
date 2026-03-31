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
// Fillout sends: { answers: [{ field: { name: "..." }, value: "..." }] }
// Each answer has field.name and a value
function getField(answers: Record<string, unknown>[], ...labels: string[]): string {
  // First pass: exact match on field.name (Fillout uses consistent field names)
  for (const label of labels) {
    const found = answers.find((a) => {
      const field = a.field as Record<string, unknown> | undefined;
      if (!field) return false;
      const fieldName = String(field.name ?? "");
      return fieldName === label;
    });
    if (found && found.value !== null && found.value !== undefined && String(found.value).trim() !== "") {
      return String(found.value).trim();
    }
  }
  // Second pass: fuzzy match on field.label (fallback for non-standard names)
  for (const label of labels) {
    const found = answers.find((a) => {
      const field = a.field as Record<string, unknown> | undefined;
      if (!field) return false;
      const fieldName = String(field.name ?? "").toLowerCase();
      const fieldLabel = String(field.label ?? "").toLowerCase();
      const search = label.toLowerCase();
      return fieldName.includes(search) || fieldLabel.includes(search);
    });
    if (found && found.value !== null && found.value !== undefined && String(found.value).trim() !== "") {
      return String(found.value).trim();
    }
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

  // Extract answers — Fillout wraps responses in an answers array
  // Each answer: { field: { name: "Field Label" }, value: "answer" }
  const rawAnswers = Array.isArray(body.answers) ? body.answers : [];
  const answers = rawAnswers as Record<string, unknown>[];

  const name      = getField(answers, "Full Name") || "Unknown";
  const email     = getField(answers, "Email") || "";
  const phone     = getField(answers, "Phone") || "";
  const instagram = getField(answers, "Instagram") || "";
  const goal      = getField(answers, "Goal") || "";
  const source    = getField(answers, "source", "how did you find us", "referred by", "how did you hear") || "Instagram";

  const id   = slugify(name) + "-" + Date.now();
  const date = (body.submitted_at as string)
    ? new Date(body.submitted_at as string).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const newLead: Record<string, unknown> = {
    id,
    name,
    email,
    phone,
    instagram: instagram ? (instagram.startsWith("@") ? instagram : "@" + instagram) : "",
    goal,
    source: source || "Instagram",
    stage: "enquiry",
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
