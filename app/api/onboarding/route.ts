/**
 * app/api/onboarding/route.ts
 *
 * Fetches recent onboarding-form submissions from Fillout for both Milzzy's
 * and Miggy's onboarding forms, filters out ones Milzzy has already
 * acknowledged, and returns the un-acknowledged list to the Tasks tab UI.
 *
 * Storage:
 *   jarvis:onboarding:seen     (Set)   submission IDs the user has dismissed
 *   jarvis:onboarding:cache    (Str)   JSON cache, TTL 60s
 */

import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILLOUT_KEY = "sk_prod_he8F4Bd3H7tJnGAk3D5Fc4owe5Ml4mNrgfcJsF56fERtBLXtNFy2zEEhnC82jjhJIxkvdWWdkIH32qNJoQcmYFRN1OZvDqoVRdy_44605";
const FILLOUT_BASE = "https://api.fillout.com/v1/api";

const FORMS: { formId: string; coach: "Milzzy" | "Miggy"; name: string }[] = [
  { formId: "vSTMPaFfnYus", coach: "Milzzy", name: "Onboarding Form - Coach Milzzy" },
  { formId: "fShzowh5kMus", coach: "Miggy",  name: "Onboarding Form - Coach Miggy"  },
];

const SEEN_KEY = "jarvis:onboarding:seen";
const CACHE_KEY = "jarvis:onboarding:cache";
const CACHE_TTL = 60; // seconds
const LOOKBACK_DAYS = 14;

interface OnboardingQuestion { id: string; name: string; value: unknown; }
interface OnboardingSubmission {
  id: string;
  coach: "Milzzy" | "Miggy";
  formId: string;
  formName: string;
  name: string;
  email: string;
  phone: string;
  gender?: string;
  birthday?: string;
  weight?: string;
  height?: string;
  goal?: string;
  service?: string;
  photoUrls: string[];
  signatureUrl?: string;
  submittedAt: string;
  filloutUrl: string;
}

function getRedis() {
  try { return Redis.fromEnv(); } catch { return null; }
}

function pickAnswer(questions: OnboardingQuestion[], names: string[]): string {
  for (const target of names) {
    const q = questions.find(
      (q) => (q.name ?? "").toLowerCase().replace(/[:\s]+/g, "") ===
             target.toLowerCase().replace(/[:\s]+/g, "")
    );
    if (q && q.value !== null && q.value !== undefined && q.value !== "") {
      if (Array.isArray(q.value)) return q.value.map(String).join(", ");
      return String(q.value).trim();
    }
  }
  return "";
}

function extractPhotoUrls(questions: OnboardingQuestion[]): string[] {
  const q = questions.find(
    (q) => q.name?.toLowerCase().includes("front, side and back faced photo")
  );
  if (!q || !Array.isArray(q.value)) return [];
  return q.value
    .map((item: unknown) => {
      if (item && typeof item === "object" && "url" in item) return (item as { url: string }).url;
      return null;
    })
    .filter((u): u is string => typeof u === "string");
}

function extractSignatureUrl(questions: OnboardingQuestion[]): string | undefined {
  const q = questions.find(
    (q) => q.name?.toLowerCase().includes("i agree to terms")
  );
  if (!q || !Array.isArray(q.value) || q.value.length === 0) return undefined;
  const first = q.value[0];
  if (first && typeof first === "object" && "url" in first) {
    return (first as { url: string }).url;
  }
  return undefined;
}

async function fetchFormSubmissions(formId: string, afterDate: string) {
  const url = `${FILLOUT_BASE}/forms/${formId}/submissions?limit=30&afterDate=${encodeURIComponent(afterDate)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${FILLOUT_KEY}` },
  });
  if (!res.ok) throw new Error(`Fillout ${formId}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function loadSeenIds(): Promise<Set<string>> {
  const redis = getRedis();
  if (!redis) return new Set();
  try {
    const raw = await redis.smembers(SEEN_KEY);
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
  } catch { return new Set(); }
}

async function loadCache(): Promise<OnboardingSubmission[] | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(CACHE_KEY);
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? (parsed as OnboardingSubmission[]) : null;
  } catch { return null; }
}

async function saveCache(subs: OnboardingSubmission[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(CACHE_KEY, JSON.stringify(subs), { ex: CACHE_TTL });
  } catch { /* ignore */ }
}

async function buildSubmission(form: typeof FORMS[number], raw: { submissionId?: string; id?: string; submissionTime: string; questions: OnboardingQuestion[] }): Promise<OnboardingSubmission> {
  const subId = raw.submissionId || raw.id || "";
  const q = raw.questions ?? [];
  return {
    id: subId,
    coach: form.coach,
    formId: form.formId,
    formName: form.name,
    name: pickAnswer(q, ["Full Name:", "Full Name"]),
    email: pickAnswer(q, ["Email:", "Email Address:", "Email"]),
    phone: pickAnswer(q, ["Phone number:", "Phone:", "Mobile/ WhatsApp Number:"]),
    gender: pickAnswer(q, ["Gender:"]),
    birthday: pickAnswer(q, ["Birthday:"]),
    weight: pickAnswer(q, ["Weight (kg):"]),
    height: pickAnswer(q, ["Height (cm):"]),
    goal: pickAnswer(q, ["If you had to choose out of the following 3 options, which one would be the main goal first?"]),
    service: pickAnswer(q, ["What coaching service are you enquiring about ?", "What coaching service are you enquiring about?"]),
    photoUrls: extractPhotoUrls(q),
    signatureUrl: extractSignatureUrl(q),
    submittedAt: raw.submissionTime,
    filloutUrl: `https://app.fillout.com/t/${subId}`,
  };
}

export async function GET() {
  try {
    // 1) Try cache first
    const cached = await loadCache();
    let all: OnboardingSubmission[] | null = cached;

    // 2) Cache miss → fetch from Fillout
    if (!all) {
      const afterDate = new Date(Date.now() - LOOKBACK_DAYS * 86400 * 1000).toISOString();
      const errors: string[] = [];
      const results: OnboardingSubmission[] = [];

      for (const form of FORMS) {
        try {
          const data = await fetchFormSubmissions(form.formId, afterDate);
          const responses = Array.isArray(data.responses) ? data.responses : [];
          for (const r of responses) {
            const subId = (r.submissionId || r.id) as string | undefined;
            if (!subId) continue;
            results.push(await buildSubmission(form, { ...r, submissionId: subId }));
          }
        } catch (err) {
          errors.push(`${form.formId}: ${(err as Error).message}`);
        }
      }

      results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      all = results;
      await saveCache(all);
    }

    // 3) Filter seen
    const seen = await loadSeenIds();
    const unacked = all.filter((s) => !seen.has(s.id));

    return NextResponse.json({
      unacked,
      total: all.length,
      seen: seen.size,
      cached: !!cached,
      fetchErrors: [] as string[],
    });
  } catch (err) {
    console.error("[onboarding] GET error:", err);
    return NextResponse.json({ unacked: [], total: 0, seen: 0, error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  // Force-refresh cache (used by the manual "Refresh" button)
  const redis = getRedis();
  if (redis) {
    try { await redis.del(CACHE_KEY); } catch { /* ignore */ }
  }
  return GET();
}