import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET!;
const REDIRECT_URI = "https://mission-control-gray-rho.vercel.app/api/auth/google/callback";

export async function GET(req: NextRequest) {
  const code = new URL(req.url).searchParams.get("code");

  if (!code) {
    return new NextResponse("Missing code", { status: 400 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return new NextResponse("Token exchange failed: " + err, { status: 400 });
  }

  const tokens = await tokenRes.json();

  // Store refresh token in Redis (long-term)
  if (tokens.refresh_token) {
    await redis.set("jarvis:google_refresh_token", tokens.refresh_token);
  }
  await redis.set("jarvis:google_access_token", tokens.access_token);
  if (tokens.expiry_date) {
    await redis.set("jarvis:google_token_expiry", String(tokens.expiry_date));
  }

  // Redirect back to dashboard with success flag
  return NextResponse.redirect("https://mission-control-gray-rho.vercel.app?google_auth=success");
}
