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

// ─── Fillout payload shape ─────────────────────────────────────────────────────
// Fillout sends: { submission_id, form_id, submitted_at, answers: [{question_name, value}] }

interface Answer {
  question_name?: string;
  value?: string | number | null;
}

interface FilloutPayload {
  submission_id?: string;
  form_id?: string;
  submitted_at?: string;
  answers?: Answer[];
}

function getAnswer(answers: Answer[] = [], ...names: string[]): string {
  for (const name of names) {
    const a = answers.find(
      (q) =>
        (q.question_name ?? "").toLowerCase().replace(/\s+/g, "") ===
        name.toLowerCase().replace(/\s+/g, ""),
    );
    if (a && a.value !== null && a.value !== undefined && String(a.value).trim() !== "") {
      return String(a.value).trim();
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
  try {
    const body: FilloutPayload = await request.json();
    const answers = body.answers ?? [];

    const name      = getAnswer(answers, "name", "full name", "fullname", "first name", "your name");
    const email     = getAnswer(answers, "email", "email address", "e-mail", "emailaddress");
    const phone     = getAnswer(answers, "phone", "mobile", "phone number", "contact number", "whatsapp", "mobilenumber");
    const instagram = getAnswer(answers, "instagram", "instagram handle", "instagram username", "ig", "instagramhandle");
    const goal     = getAnswer(answers, "goal", "fitness goal", "what is your goal", "your goal", "maingoal", "what's your goal");
    const source   = getAnswer(answers, "source", "how did you find us", "referred by", "how did you hear about us", "how did you hear", "referredby");

    if (!name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const id    = slugify(name) + "-" + Date.now();
    const date  = body.submitted_at
      ? new Date(body.submitted_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const newLead: Record<string, unknown> = {
      id,
      name,
      email,
      phone,
      instagram: instagram
        ? instagram.startsWith("@") ? instagram : "@" + instagram
        : "",
      goal,
      source: source || "Instagram",
      stage: "enquiry",
      assignedTo: "Milzzy",
      createdAt: date,
      notes: "",
    };

    const leads = await getLeads();
    leads.push(newLead);
    await saveLeads(leads);

    return NextResponse.json({ success: true, lead: newLead }, { status: 200 });

  } catch (err) {
    console.error("[leads/inbound] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Leads inbound endpoint is live" }, { status: 200 });
}
