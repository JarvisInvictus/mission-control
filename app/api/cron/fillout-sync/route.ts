/**
 * app/api/cron/fillout-sync/route.ts
 * Vercel Cron Job – runs daily at 9 AM via vercel.json crons config.
 * Note: Hobby plan only allows once/day. Pro plan allows every-5-min schedule.
 * 
 * GET  – health check / manual trigger (no auth for cron)
 * POST – actual sync logic (called by Vercel Cron)
 */

import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Config ──────────────────────────────────────────────────────────────────
const FILLOUT_KEY = "sk_prod_he8F4Bd3H7tJnGAk3D5Fc4owe5Ml4mNrgfcJsF56fERtBLXtNFy2zEEhnC82jjhJIxkvdWWdkIH32qNJoQcmYFRN1OZvDqoVRdy_44605";
const FILLOUT_BASE = "https://api.fillout.com/v1/api";

const FORMS = [
  { formId: "bxAeFKhJG8us", source: "Instagram", assignedTo: "Milzzy" },
  { formId: "cDmKMRUbE2us", source: "MiggyForm", assignedTo: "Miggy" },
];

const REDIS_SEEN_KEY = "jarvis:fillout_seen";

// ─── Redis ───────────────────────────────────────────────────────────────────
const redis = Redis.fromEnv();

async function redisSmembers(key: string) {
  const result = await redis.smembers(key);
  return Array.isArray(result) ? result.map(String) : [];
}

async function redisSadd(key: string, value: string | number) {
  await redis.sadd(key, value);
}

// ─── Fillout helpers ─────────────────────────────────────────────────────────
async function fetchFormSubmissions(formId: string, afterDate: string) {
  let url = `${FILLOUT_BASE}/forms/${formId}/submissions?limit=50`;
  url += `&afterDate=${encodeURIComponent(afterDate)}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${FILLOUT_KEY}` },
  });

  if (!res.ok) {
    throw new Error(`Fillout API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function mapSubmissionToLead(
  submission: {
    questions: { name: string; value: string }[];
  },
  assignedTo: string
) {
  const getAnswer = (name: string) =>
    submission.questions.find((q) => q.name === name)?.value ?? "";

  return {
    name: getAnswer("Full Name:"),
    email: getAnswer("Email Address:"),
    phone: getAnswer("Mobile/ WhatsApp Number:"),
    source: "Instagram",
    assignedTo,
    notes: `Instagram: ${getAnswer("Instagram Handle:")} | Goal: ${getAnswer("Whats your #1 goal right now?")}`,
  };
}

async function createLead(lead: Record<string, unknown>) {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : `http://localhost:3000`;

  const res = await fetch(`${baseUrl}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Leads API error: ${res.status} ${text}`);
  }

  return res.json();
}

// ─── Sync logic ───────────────────────────────────────────────────────────────
async function runSync() {
  const now = new Date();
  // Only fetch submissions from the last 1 hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  const seenIds = new Set<string>(await redisSmembers(REDIS_SEEN_KEY));

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const form of FORMS) {
    let submissions;
    try {
      const data = await fetchFormSubmissions(form.formId, oneHourAgo);
      submissions = data.responses ?? [];
    } catch (err) {
      errors.push(`${form.formId}: ${(err as Error).message}`);
      continue;
    }

    for (const sub of submissions) {
      const submissionId = sub.id as string;

      if (seenIds.has(submissionId)) {
        skipped++;
        continue;
      }

      const lead = mapSubmissionToLead(sub, form.assignedTo);

      try {
        await createLead(lead);
        await redisSadd(REDIS_SEEN_KEY, submissionId);
        seenIds.add(submissionId); // prevent double-import within same run
        imported++;
      } catch (err) {
        errors.push(`${submissionId}: ${(err as Error).message}`);
      }
    }
  }

  return { imported, skipped, errors };
}

// ─── Route handlers ───────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Fillout sync cron endpoint. Use POST to trigger.",
  });
}

export async function POST(_req: NextRequest) {
  try {
    const result = await runSync();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[fillout-sync] Fatal error:", err);
    return NextResponse.json(
      { error: "Sync failed", detail: (err as Error).message },
      { status: 500 }
    );
  }
}
