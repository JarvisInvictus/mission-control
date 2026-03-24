import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// ─── Config ──────────────────────────────────────────────────────────────────
const FILLOUT_KEY =
  "sk_prod_he8F4Bd3H7tJnGAk3D5Fc4owe5Ml4mNrgfcJsF56fERtBLXtNFy2zEEhnC82jjhJIxkvdWWdkIH32qNJoQcmYFRN1OZvDqoVRdy_44605";
const FILLOUT_BASE = "https://api.fillout.com/v1/api";
const MISSION_CONTROL = "https://mission-control-gray-rho.vercel.app";

const FORMS = [
  { formId: "bxAeFKhJG8us", assignedTo: "Milzzy" },
  { formId: "cDmKMRUbE2us", assignedTo: "Miggy" },
];

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_CHAT_ID = "5827091868";

const redis = Redis.fromEnv();

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fetchJSON(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchFilloutFormSubmissions(formId: string, afterDate: string) {
  const url = `${FILLOUT_BASE}/forms/${formId}/submissions?limit=50&afterDate=${encodeURIComponent(afterDate)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${FILLOUT_KEY}` },
  });
  if (!res.ok) throw new Error(`Fillout API ${res.status} for form ${formId}`);
  return res.json();
}

function extractAnswer(questions: { name: string; value: string }[], name: string) {
  return questions.find((q) => q.name === name)?.value ?? "";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysAgo(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ─── Brief Builders ───────────────────────────────────────────────────────────
function buildNewLeadsSection(
  newLeads: { name: string; instagram: string; goal: string }[]
) {
  if (newLeads.length === 0) return "  (no new leads overnight)";
  return newLeads
    .slice(0, 10)
    .map((l) => {
      const ig = l.instagram ? `@${l.instagram}` : "no IG";
      const goal = l.goal || "—";
      return `  • ${l.name}  •  ${ig}  •  ${goal}`;
    })
    .join("\n");
}

function buildPipelineSection(
  leads: { stage: string }[]
) {
  const stages = [
    "enquiry",
    "consult_booked",
    "consult_done",
    "payment",
    "onboarding",
    "active",
  ];
  const counts: Record<string, number> = {};
  for (const s of stages) counts[s] = 0;
  for (const lead of leads) {
    if (counts[lead.stage] !== undefined) counts[lead.stage]++;
  }
  return [
    `  Enquiry: ${counts.enquiry}  |  Consult Booked: ${counts.consult_booked}  |  Consult Done: ${counts.consult_done}`,
    `  Payment: ${counts.payment}  |  Onboarding: ${counts.onboarding}  |  Active: ${counts.active}`,
  ].join("\n");
}

function buildOverdueSection(
  leads: { name: string; stage: string; createdAt: string }[]
) {
  const overdue = leads.filter(
    (l) =>
      (l.stage === "enquiry" || l.stage === "consult_booked") &&
      daysAgo(l.createdAt) >= 1
  );
  if (overdue.length === 0) return "  (no overdue leads)";
  return overdue
    .map((l) => {
      const stage = l.stage === "consult_booked" ? "Consult Booked" : "Enquiry";
      const date = new Date(l.createdAt).toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
      });
      return `  • ${l.name} — in ${stage} since ${date}`;
    })
    .join("\n");
}

function buildActionsSection(
  leads: { name: string; instagram?: string; stage: string; createdAt: string }[]
) {
  const overdue = leads.filter(
    (l) =>
      (l.stage === "enquiry" || l.stage === "consult_booked") &&
      daysAgo(l.createdAt) >= 1
  );
  if (overdue.length === 0) return "  (no urgent actions)";
  return overdue
    .map((l) => {
      const days = daysAgo(l.createdAt);
      const ig = l.instagram ? `(${l.instagram})` : "";
      return `  • Follow up: ${l.name} ${ig} — ${days}d old`;
    })
    .join("\n");
}

interface Lead {
  name: string;
  instagram?: string;
  stage: string;
  createdAt: string;
}

interface FilloutSubmission {
  name: string;
  instagram: string;
  goal: string;
  assignedTo: string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST() {
  try {
    const now = new Date();
    const afterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch data in parallel
    const [leads, filloutData] = await Promise.all([
      fetchJSON(`${MISSION_CONTROL}/api/leads`) as Promise<Lead[]>,
      Promise.all(
        FORMS.map((form) =>
          fetchFilloutFormSubmissions(form.formId, afterDate)
            .then((data) => {
              return (data.responses ?? []).map(
                (sub: { questions: { name: string; value: string }[] }) => ({
                  name: extractAnswer(sub.questions, "Full Name:"),
                  instagram: extractAnswer(sub.questions, "Instagram Handle:"),
                  goal: extractAnswer(sub.questions, "Whats your #1 goal right now?"),
                  assignedTo: form.assignedTo,
                })
              );
            })
            .catch((err) => {
              console.error(`Fillout error for ${form.formId}:`, err.message);
              return [];
            })
        )
      ),
    ]);

    const newLeads: FilloutSubmission[] = filloutData.flat();

    // Build sections
    const dateStr = formatDate(now);
    const divider = "━━━━━━━━━━━━━━━━━━";

    const message = [
      `<code>${divider}</code>`,
      `<b>🤖 JARVIS — MORNING BRIEF</b>`,
      `<code>${dateStr}</code>`,
      `<code>${divider}</code>`,
      "",
      `<b>📥 NEW LEADS (overnight)</b>`,
      buildNewLeadsSection(newLeads),
      "",
      `<code>${divider}</code>`,
      "",
      `<b>📊 LEAD PIPELINE</b>`,
      `<code>${buildPipelineSection(leads)}</code>`,
      "",
      `<b>⚠️ OVERDUE (&gt;24hrs, no response)</b>`,
      buildOverdueSection(leads),
      "",
      `<code>${divider}</code>`,
      "",
      `<b>✅ ACTIONS TODAY</b>`,
      buildActionsSection(leads),
      "",
      `<code>${divider}</code>`,
    ].join("\n");

    // Send to Telegram
    const tgRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!tgRes.ok) {
      const body = await tgRes.text();
      return NextResponse.json(
        { error: `Telegram error ${tgRes.status}: ${body}` },
        { status: 500 }
      );
    }

    const overdueCount = leads.filter(
      (l: Lead) =>
        (l.stage === "enquiry" || l.stage === "consult_booked") &&
        daysAgo(l.createdAt) >= 1
    ).length;

    return NextResponse.json({
      sent: true,
      sections: {
        newLeads: newLeads.length,
        pipeline: {
          enquiry: leads.filter((l: Lead) => l.stage === "enquiry").length,
          consult_booked: leads.filter((l: Lead) => l.stage === "consult_booked").length,
          consult_done: leads.filter((l: Lead) => l.stage === "consult_done").length,
          payment: leads.filter((l: Lead) => l.stage === "payment").length,
          onboarding: leads.filter((l: Lead) => l.stage === "onboarding").length,
          active: leads.filter((l: Lead) => l.stage === "active").length,
        },
        overdue: overdueCount,
      },
    });
  } catch (err) {
    console.error("Morning brief error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
