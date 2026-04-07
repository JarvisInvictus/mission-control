import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = process.env.MAILERLITE_API_KEY;
    const groupId = "183769412893935583"; // Macro Calculator group

    const res = await fetch(
      `https://connect.mailerlite.com/api/groups/${groupId}/subscribers?limit=1`,
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ total: 0, error: `MailerLite ${res.status}` }, { status: 200 });
    }

    const data = await res.json();
    const total = data?.meta?.total ?? 0;

    return NextResponse.json({ total });
  } catch (e) {
    return NextResponse.json({ total: 0, error: String(e) }, { status: 200 });
  }
}
