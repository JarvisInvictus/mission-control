import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WebhookPayload {
  event: string;
  data: {
    id?: string;
    email?: string;
    fields?: {
      name?: string;
      calories?: string;
      protein?: string;
      carbs?: string;
      fat?: string;
      goal?: string;
      last_name?: string;
      [key: string]: string | undefined;
    };
    [key: string]: unknown;
  };
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
    const payload: WebhookPayload = await req.json();
    console.log("[mailerlite/webhook] Event:", payload.event, "Email:", payload.data?.email);

    // Only handle subscriber.created events
    if (payload.event !== "subscriber.created") {
      return NextResponse.json({ ignored: true });
    }

    const email = payload.data?.email;
    if (!email) {
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    const fields = payload.data?.fields ?? {};
    const name = fields.name ?? email.split("@")[0];

    // Extract custom fields (MailerLite uses underscored names)
    const calories = fields.calories ?? fields.Calories ?? "";
    const protein = fields.protein ?? fields.Protein ?? "";
    const carbs = fields.carbs ?? fields.Carbs ?? "";
    const fat = fields.fat ?? fields.Fat ?? "";
    const goal = fields.goal ?? fields.Goal ?? "";
    const macros = [calories, protein, carbs, fat].filter(Boolean).join(" | ");

    // Avoid duplicates — check if already saved
    const leads = await getLeads();
    const alreadyExists = leads.some(
      l => (l.email as string)?.toLowerCase() === email.toLowerCase()
    );

    if (!alreadyExists) {
      const newLead: Record<string, unknown> = {
        id: `webhook-${slugify(email)}-${Date.now()}`,
        name,
        email,
        phone: "",
        instagram: "",
        goal: goal || "",
        source: macros ? "Macro Calculator" : "MailerLite",
        stage: "enquiry",
        assignedTo: "Milzzy",
        createdAt: new Date().toISOString().split("T")[0],
        notes: macros ? `Macro results: ${macros}` : "",
      };
      leads.push(newLead);
      await saveLeads(leads);
      console.log("[mailerlite/webhook] Saved lead:", name, email);
    } else {
      console.log("[mailerlite/webhook] Already exists, skipping:", email);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("[mailerlite/webhook] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
