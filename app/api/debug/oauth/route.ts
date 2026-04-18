import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "MISSING";
  const hasSecret = !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return NextResponse.json({
    clientIdPrefix: clientId.slice(0, 20) + "...",
    hasSecret,
    rawLength: clientId.length,
  });
}
