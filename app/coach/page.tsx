"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /coach redirects to /coach/dashboard (Miggy's new daily landing page).
// The full Mission Control (clients / tasks / check-ins / content) is still
// accessible from a "Full Mission Control" link inside the dashboard.
export default function CoachPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/coach/dashboard");
  }, [router]);
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0e1a 0%, #0d1320 50%, #0a0e1a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.4)", fontFamily: "system-ui", fontSize: 13,
    }}>
      Redirecting to dashboard…
    </div>
  );
}
