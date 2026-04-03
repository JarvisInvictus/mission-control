import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAILERLITE_API_URL = "https://connect.mailerlite.com/api/subscribers";
const MAILERLITE_GROUP_ID = "183769412893935583";

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

export async function POST(req: Request) {
  try {
    const body: SubscribeBody = await req.json();

    const { email, name, calories, protein, carbs, fat, goal } = body;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
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
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            email,
            fields: {
              name,
              calories: String(calories),
              protein: String(protein),
              carbs: String(carbs),
              fat: String(fat),
              goal,
            },
            groups: [MAILERLITE_GROUP_ID],
          }),
        });

        if (mlRes.ok) {
          mailerliteOk = true;
        } else {
          const errText = await mlRes.text();
          console.error("[mailerlite/subscribe] MailerLite error:", mlRes.status, errText);
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

    return NextResponse.json({ success: true, mailerlite: mailerliteOk });

  } catch (err) {
    console.error("[mailerlite/subscribe] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
