/**
 * scripts/morning-brief.mjs
 * Standalone script to generate and send the Morning Brief to Telegram.
 * Usage: node scripts/morning-brief.mjs
 *
 * Environment vars (from .env or shell):
 *   TELEGRAM_BOT_TOKEN
 *   KV_REST_API_URL, KV_REST_API_TOKEN  (Upstash Redis)
 */

import { Redis } from "@upstash/redis";

// ─── Config ──────────────────────────────────────────────────────────────────
const FILLOUT_KEY = "sk_prod_he8F4Bd3H7tJnGAk3D5Fc4owe5Ml4mNrgfcJsF56fERtBLXtNFy2zEEhnC82jjhJIxkvdWWdkIH32qNJoQcmYFRN1OZvDqoVRdy_44605";
const FILLOUT_BASE = "https://api.fillout.com/v1/api";
const MISSION_CONTROL = "https://mission-control-gray-rho.vercel.app";

const FORMS = [
  { formId: "bxAeFKhJG8us", assignedTo: "Milzzy" },
  { formId: "cDmKMRUbE2us", assignedTo: "Miggy" },
];

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_CHAT_ID = "5827091868";

// ─── Redis ───────────────────────────────────────────────────────────────────
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchFilloutFormSubmissions(formId, afterDate) {
  const url = `${FILLOUT_BASE}/forms/${formId}/submissions?limit=50${afterDate ? `&afterDate=${encodeURIComponent(afterDate)}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${FILLOUT_KEY}` },
  });
  if (!res.ok) throw new Error(`Fillout API ${res.status} for form ${formId}`);
  return res.json();
}

function formatDate(date) {
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function extractAnswer(questions, name) {
  return questions.find((q) => q.name === name)?.value ?? "";
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────
async function fetchLeads() {
  return fetchJSON(`${MISSION_CONTROL}/api/leads`);
}

async function fetchClients() {
  return fetchJSON(`${MISSION_CONTROL}/api/clients`);
}

async function fetchNewFilloutLeads(afterDate) {
  const allSubmissions = [];
  for (const form of FORMS) {
    try {
      const data = await fetchFilloutFormSubmissions(form.formId, afterDate);
      const submissions = data.responses ?? [];
      for (const sub of submissions) {
        allSubmissions.push({
          name: extractAnswer(sub.questions, "Full Name:"),
          instagram: extractAnswer(sub.questions, "Instagram Handle:"),
          goal: extractAnswer(sub.questions, "Whats your #1 goal right now?"),
          submittedAt: sub.submittedAt,
          assignedTo: form.assignedTo,
        });
      }
    } catch (err) {
      console.error(`Fillout fetch error for ${form.formId}:`, err.message);
    }
  }
  return allSubmissions;
}

// ─── Brief Builders ───────────────────────────────────────────────────────────
function buildNewLeadsSection(newLeads) {
  const lines = [];
  if (newLeads.length === 0) {
    lines.push("  (no new leads overnight)");
  } else {
    for (const lead of newLeads.slice(0, 10)) {
      const ig = lead.instagram ? `@${lead.instagram}` : "no IG";
      const goal = lead.goal || "—";
      lines.push(`  • ${lead.name}  •  ${ig}  •  ${goal}`);
    }
    if (newLeads.length > 10) {
      lines.push(`  +${newLeads.length - 10} more`);
    }
  }
  return lines.join("\n");
}

function buildPipelineSection(leads) {
  const stages = ["enquiry", "consult_booked", "consult_done", "payment", "onboarding", "active"];
  const counts = {};
  for (const s of stages) counts[s] = 0;
  for (const lead of leads) {
    if (counts[lead.stage] !== undefined) counts[lead.stage]++;
  }
  return [
    `  Enquiry: ${counts.enquiry}  |  Consult Booked: ${counts.consult_booked}  |  Consult Done: ${counts.consult_done}`,
    `  Payment: ${counts.payment}  |  Onboarding: ${counts.onboarding}  |  Active: ${counts.active}`,
  ].join("\n");
}

function buildOverdueSection(leads) {
  const overdue = leads.filter((l) => {
    if (l.stage !== "enquiry" && l.stage !== "consult_booked") return false;
    return daysAgo(l.createdAt) >= 1;
  });
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

function buildActionsSection(leads) {
  const overdue = leads.filter((l) => {
    if (l.stage !== "enquiry" && l.stage !== "consult_booked") return false;
    return daysAgo(l.createdAt) >= 1;
  });
  if (overdue.length === 0) return "  (no urgent actions)";
  return overdue
    .map((l) => {
      const days = daysAgo(l.createdAt);
      const ig = l.instagram ? `(${l.instagram})` : "";
      return `  • Follow up: ${l.name} ${ig} — ${days}d old`;
    })
    .join("\n");
}

// ─── Telegram ────────────────────────────────────────────────────────────────
async function sendTelegramMessage(text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram error ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🤖 JARVIS — Morning Brief Generator\n");

  const now = new Date();
  const afterDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // 1. Fetch data in parallel
  console.log("📡 Fetching data...");
  const [leads, newFilloutLeads] = await Promise.all([
    fetchLeads(),
    fetchNewFilloutLeads(afterDate),
  ]);
  console.log(`   Leads: ${leads.length}`);
  console.log(`   New Fillout submissions (24h): ${newFilloutLeads.length}`);

  // 2. Build sections
  const dateStr = formatDate(now);
  const divider = "━━━━━━━━━━━━━━━━━━";

  const newLeadsSection = buildNewLeadsSection(newFilloutLeads);
  const pipelineSection = buildPipelineSection(leads);
  const overdueSection = buildOverdueSection(leads);
  const actionsSection = buildActionsSection(leads);

  // 3. Assemble HTML message
  const message = [
    `<code>${divider}</code>`,
    `<b>🤖 JARVIS — MORNING BRIEF</b>`,
    `<code>${dateStr}</code>`,
    `<code>${divider}</code>`,
    "",
    `<b>📥 NEW LEADS (overnight)</b>`,
    newLeadsSection,
    "",
    `<code>${divider}</code>`,
    "",
    `<b>📊 LEAD PIPELINE</b>`,
    `<code>${pipelineSection}</code>`,
    "",
    `<b>⚠️ OVERDUE (&gt;24hrs, no response)</b>`,
    overdueSection,
    "",
    `<code>${divider}</code>`,
    "",
    `<b>✅ ACTIONS TODAY</b>`,
    actionsSection,
    "",
    `<code>${divider}</code>`,
  ].join("\n");

  // 4. Send to Telegram
  console.log("\n📨 Sending to Telegram...");
  const result = await sendTelegramMessage(message);
  console.log("✅ Message sent! Message ID:", result.result?.message_id);

  // 5. Stats
  const overdueCount = leads.filter(
    (l) =>
      (l.stage === "enquiry" || l.stage === "consult_booked") &&
      daysAgo(l.createdAt) >= 1
  ).length;

  console.log("\n📊 Summary:");
  console.log(`   New leads: ${newFilloutLeads.length}`);
  console.log(`   Overdue: ${overdueCount}`);
  console.log("\n✅ Done.\n");

  return {
    sent: true,
    sections: {
      newLeads: newFilloutLeads.length,
      pipeline: {
        enquiry: leads.filter((l) => l.stage === "enquiry").length,
        consult_booked: leads.filter((l) => l.stage === "consult_booked").length,
        consult_done: leads.filter((l) => l.stage === "consult_done").length,
        payment: leads.filter((l) => l.stage === "payment").length,
        onboarding: leads.filter((l) => l.stage === "onboarding").length,
        active: leads.filter((l) => l.stage === "active").length,
      },
      overdue: overdueCount,
    },
  };
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
