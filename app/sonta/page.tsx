"use client";

// Sonta's Dashboard — placeholder. Buttons from /team link here so the URL
// works once the real dashboard is built (just replace this file).

import Link from "next/link";

export default function SontaDashboardPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(10,186,181,0.10) 0%, transparent 50%), #0a0e1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          width: "100%",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          padding: "40px 32px",
          textAlign: "center",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "20px",
            background: "rgba(168,85,247,0.15)",
            border: "1px solid rgba(168,85,247,0.30)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: "32px",
          }}
        >
          📊
        </div>
        <p
          style={{
            fontSize: "11px",
            letterSpacing: "0.20em",
            color: "rgba(255,255,255,0.40)",
            textTransform: "uppercase",
            margin: "0 0 8px",
          }}
        >
          Invictus Physiques
        </p>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.95)",
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
          }}
        >
          Sonta&apos;s Dashboard
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.55)",
            margin: "0 0 28px",
            lineHeight: 1.55,
          }}
        >
          This space is reserved for finance, admin and bookkeeping workflows. Coming soon.
        </p>
        <Link
          href="/team"
          style={{
            display: "inline-block",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.90)",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "999px",
            padding: "10px 22px",
            textDecoration: "none",
          }}
        >
          ← Back to Team Hub
        </Link>
      </div>
    </div>
  );
}
