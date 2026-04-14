import { NextRequest, NextResponse } from "next/server";
import { decodeReferralCode } from "../../lib/referral";

// GET ?codes=CODE1,CODE2 — returns owner names for each code
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const codesParam = searchParams.get("codes");
  if (!codesParam) return NextResponse.json({ error: "codes required" }, { status: 400 });

  const codes = codesParam.split(",").filter(Boolean);
  const owners: Record<string, { name: string; email: string } | null> = {};

  for (const code of codes) {
    owners[code.trim()] = decodeReferralCode(code.trim());
  }

  return NextResponse.json({ owners });
}
