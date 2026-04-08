import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "/";
    const token = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.MACRO_PROJECT_ID || "prj_QDmczE7kUOsSHhL2lElm0A4bpelw";

    // Vercel Analytics stats by path
    const res = await fetch(
      `https://vercel.com/api/web/insights/stats?projectId=${projectId}&environment=production&path=${encodeURIComponent(path)}&from=30d`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      return NextResponse.json({ total: 0, error: `Vercel API ${res.status}` }, { status: 200 });
    }

    const data = await res.json();
    const total = Array.isArray(data?.data)
      ? data.data.reduce((acc: number, row: any) => acc + (row.count || row.visits || 0), 0)
      : data?.total ?? 0;

    return NextResponse.json({ total });
  } catch (e) {
    return NextResponse.json({ total: 0, error: String(e) }, { status: 200 });
  }
}
