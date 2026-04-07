import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAILERLITE_API_URL = "https://connect.mailerlite.com/api/subscribers";
const MAILERLITE_GROUP_ID = "183769412893935583";
const CORS_ORIGIN = "https://invictus-macro.vercel.app";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

interface SubscribeBody {
  email: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function getLeads(): Promise<Record<string, unknown>[]> {
  try {
    const redis = Redis.fromEnv();
    const raw = await redis.get("jarvis:leads");
    if (!raw) return [];
    if (typeof raw === "string") return JSON.parse(raw);
    if (Array.isArray(raw)) return raw;
    return [];
  } catch {
    return [];
  }
}

async function saveLeads(leads: Record<string, unknown>[]) {
  try {
    const redis = Redis.fromEnv();
    await redis.set("jarvis:leads", JSON.stringify(leads));
  } catch { /* ignore */ }
}

export async function OPTIONS(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": CORS_ORIGIN,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  return new NextResponse(null, { status: 405 });
}

export async function POST(req: Request) {
  try {
    const body: SubscribeBody = await req.json();
    const { email, name, calories, protein, carbs, fat, goal } = body;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400, headers: CORS_HEADERS });
    }

    // ── MailerLite ────────────────────────────────────────────────────────────
    let mailerliteOk = false;
    try {
      const apiKey = process.env.MAILERLITE_API_KEY;
      if (!apiKey) {
        console.error("[mailerlite/subscribe] MAILERLITE_API_KEY not set");
      } else {
        const mlRes = await fetch(MAILERLITE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            email,
            fields: {
              name,
              calories: Number(calories),
              protein: Number(protein),
              carbs: Number(carbs),
              fat: Number(fat),
              goal: String(goal),
            },
            groups: ["183769412893935583"],
          }),
        });
        mailerliteOk = mlRes.ok;
        const responseText = await mlRes.text();
        console.log("[mailerlite/subscribe] MailerLite response:", mlRes.status, responseText);
        if (!mlRes.ok) {
          console.error("[mailerlite/subscribe] MailerLite error:", mlRes.status, responseText);
        }
      }
    } catch (err) {
      console.error("[mailerlite/subscribe] MailerLite fetch error:", err);
    }

    // ── Redis leads ──────────────────────────────────────────────────────────
    try {
      const leads = await getLeads();
      const newLead: Record<string, unknown> = {
        id: `macro-${slugify(email)}-${Date.now()}`,
        name: name || email.split("@")[0],
        email,
        phone: "",
        instagram: "",
        goal: goal || "",
        source: "Macro Calculator",
        stage: "enquiry",
        assignedTo: "Milzzy",
        createdAt: new Date().toISOString().split("T")[0],
        notes: `Macro results: ${calories}kcal | P:${protein}g C:${carbs}g F:${fat}g`,
      };
      leads.push(newLead);
      await saveLeads(leads);
    } catch (err) {
      console.error("[mailerlite/subscribe] Redis save error:", err);
    }

    return NextResponse.json({ success: true, mailerlite: mailerliteOk, _debug: `ml_called_at_${new Date().toISOString()}` }, { headers: CORS_HEADERS });

  } catch (err) {
    console.error("[mailerlite/subscribe] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
  }
}
