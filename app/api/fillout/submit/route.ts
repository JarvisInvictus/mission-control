import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Lead shape ───────────────────────────────────────────────────────────────

interface Question { name?: string; value?: string | number | null; }
interface Submission { questions?: Question[]; }
interface FilloutSubmission {
  submission_id?: string;
  form_id?: string;
  submitted_at?: string;
  submission?: Submission;
}

// ─── Redis ───────────────────────────────────────────────────────────────────

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

function parseLeadDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

function getAnswer(questions: Question[] | undefined, ...names: string[]): string {
  if (!questions) return "";
  for (const name of names) {
    const q = questions.find(
      (q) =>
        (q.name ?? "").toLowerCase().replace(/\s+/g, "") ===
          name.toLowerCase().replace(/\s+/g, "")
    );
    if (q && q.value !== null && q.value !== undefined && q.value !== "") {
      return String(q.value).trim();
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

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const payload: FilloutSubmission = await req.json();

    const questions = payload.submission?.questions ?? [];

    const name      = getAnswer(questions, "full name", "name", "fullname", "your name", "first name");
    const email     = getAnswer(questions, "email", "email address", "e-mail");
    const phone     = getAnswer(questions, "phone", "mobile", "phone number", "contact number", "mobile number", "whatsapp");
    const instagram = getAnswer(questions, "instagram", "instagram handle", "instagram username", "ig");
    const goal      = getAnswer(questions, "goal", "fitness goal", "what is your goal", "your goal", "main goal");
    const source    = getAnswer(questions, "source", "how did you find us", "referred by", "how did you hear about us");

    if (!name) {
      return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
    }

    const id = slugify(name) + "-" + Date.now();
    const date = parseLeadDate(payload.submitted_at);

    const newLead: Record<string, unknown> = {
      id,
      name,
      email,
      phone,
      instagram: instagram ? (instagram.startsWith("@") ? instagram : "@" + instagram) : "",
      goal,
      source: source || "Macro Calculator",
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
    console.error("[fillout/submit] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── GET handler (for testing) ──────────────────────────────────────────────

export async function GET() {
  const leads = await getLeads();
  return NextResponse.json({ count: leads.length, leads });
}
