import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;

async function getAccessToken(): Promise<string | null> {
  const accessToken = await redis.get<string>("jarvis:google_access_token");
  const expiry = await redis.get<string>("jarvis:google_token_expiry");

  if (accessToken && expiry && Date.now() < parseInt(expiry)) {
    return accessToken;
  }

  // Access token expired or missing — use refresh token
  const refreshToken = await redis.get<string>("jarvis:google_refresh_token");
  if (!refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const tokens = await res.json();
  await redis.set("jarvis:google_access_token", tokens.access_token);
  if (tokens.expiry_date) {
    await redis.set("jarvis:google_token_expiry", String(tokens.expiry_date));
  }

  return tokens.access_token;
}

// GET /api/calendar/events?start=2026-04-13&end=2026-04-20
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  // Default to this week's Monday–Sunday
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const start = startParam || monday.toISOString();
  const end = endParam || sunday.toISOString();

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "not_authorized", events: [] }, { status: 200 });
  }

  const calendarRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: start,
        timeMax: end,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
      }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!calendarRes.ok) {
    return NextResponse.json({ error: "calendar_api_error", events: [] }, { status: 200 });
  }

  const data = await calendarRes.json();
  const events = (data.items || []).map((e: any) => ({
    id: e.id,
    title: e.summary || "(No title)",
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date,
    link: e.hangoutLink || e.htmlLink || null,
    meetLink: e.hangoutLink || null,
  }));

  return NextResponse.json({ events });
}
