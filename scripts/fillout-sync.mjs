/**
 * scripts/fillout-sync.mjs
 * Standalone script to sync Fillout form submissions → Leads API
 * 
 * Usage: node scripts/fillout-sync.mjs [--dry-run]
 *   --dry-run  Preview what would be imported without actually creating leads
 */

import { Redis } from "@upstash/redis";

// ─── Config ──────────────────────────────────────────────────────────────────
const FILLOUT_KEY = "sk_prod_he8F4Bd3H7tJnGAk3D5Fc4owe5Ml4mNrgfcJsF56fERtBLXtNFy2zEEhnC82jjhJIxkvdWWdkIH32qNJoQcmYFRN1OZvDqoVRdy_44605";
const FILLOUT_BASE = "https://api.fillout.com/v1/api";

const FORMS = [
  { formId: "bxAeFKhJG8us", source: "Instagram", assignedTo: "Milzzy" },
  { formId: "cDmKMRUbE2us", source: "MiggyForm", assignedTo: "Miggy" },
];

const LEADS_API = process.env.LEADS_API_URL || "http://localhost:3000/api/leads";
const REDIS_SEEN_KEY = "jarvis:fillout_seen";

const dryRun = process.argv.includes("--dry-run");

// ─── Redis ───────────────────────────────────────────────────────────────────
// Use explicit env vars (from --env-file or shell environment)
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function redisSmembers(key) {
  const result = await redis.smembers(key);
  return Array.isArray(result) ? result.map(String) : [];
}

async function redisSadd(key, value) {
  await redis.sadd(key, value);
}

async function fetchFormSubmissions(formId, afterDate) {
  let url = `${FILLOUT_BASE}/forms/${formId}/submissions?limit=50`;
  if (afterDate) {
    url += `&afterDate=${encodeURIComponent(afterDate)}`;
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${FILLOUT_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Fillout API error for form ${formId}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

function mapSubmissionToLead(submission, source, assignedTo) {
  const getAnswer = (name) =>
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

async function createLead(lead) {
  const res = await fetch(LEADS_API, {
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

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄 Fillout → Leads Sync`);
  console.log(`   Mode: ${dryRun ? "DRY RUN (no leads will be created)" : "LIVE"}\n`);

  // Load already-seen submission IDs
  const seenIds = new Set(await redisSmembers(REDIS_SEEN_KEY));
  console.log(`📦 Already imported: ${seenIds.size} submission IDs\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  const allErrors = [];

  for (const form of FORMS) {
    console.log(`\n📋 Form: ${form.formId} (${form.source})`);

    let submissions;
    try {
      // Fetch all submissions (no afterDate filter in script – it's a full sync)
      const data = await fetchFormSubmissions(form.formId);
      submissions = data.responses ?? [];
    } catch (err) {
      console.error(`   ❌ Failed to fetch: ${err.message}`);
      allErrors.push(`${form.formId}: ${err.message}`);
      continue;
    }

    console.log(`   Total submissions: ${submissions.length}`);

    let formImported = 0;
    let formSkipped = 0;

    for (const sub of submissions) {
      const submissionId = sub.id;

      if (seenIds.has(submissionId)) {
        formSkipped++;
        totalSkipped++;
        continue;
      }

      const lead = mapSubmissionToLead(sub, form.source, form.assignedTo);

      if (dryRun) {
        console.log(`   🟡 [DRY] Would import: ${lead.name} <${lead.email}>`);
      } else {
        try {
          const created = await createLead(lead);
          await redisSadd(REDIS_SEEN_KEY, submissionId);
          seenIds.add(submissionId); // prevent double-import in same run
          console.log(`   ✅ Imported: ${lead.name} <${lead.email}> → lead_${created.id}`);
          formImported++;
          totalImported++;
        } catch (err) {
          console.error(`   ❌ Failed to import ${submissionId}: ${err.message}`);
          allErrors.push(`${submissionId}: ${err.message}`);
        }
      }
    }

    console.log(
      `   Form summary: ${formImported} imported, ${formSkipped} already-seen`
    );
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Total: ${totalImported} imported, ${totalSkipped} skipped, ${allErrors.length} errors`);
  if (allErrors.length > 0) {
    console.log(`Errors:\n  ${allErrors.join("\n  ")}`);
  }
  console.log(`\n✅ Done.\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
