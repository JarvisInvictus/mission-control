"use client";

import { useState } from "react";

interface DashTile {
  href: string;
  label: string;
  subtitle: string;
  icon: string;
  accent: string;
  ready: boolean;
}

const TILES: DashTile[] = [
  {
    href: "/",
    label: "Milzzy's Dashboard",
    subtitle: "Head coach",
    icon: "🤖",
    accent: "rgba(10,186,181,0.18)",
    ready: true,
  },
  {
    href: "/coach",
    label: "Miggy's Dashboard",
    subtitle: "Coach view",
    icon: "🏋️",
    accent: "rgba(59,130,246,0.18)",
    ready: true,
  },
  {
    href: "/sonta",
    label: "Sonta's Dashboard",
    subtitle: "Finance & admin — coming soon",
    icon: "📊",
    accent: "rgba(168,85,247,0.18)",
    ready: false,
  },
];

export function QuickLaunch() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section style={{ marginBottom: "24px" }}>
      <p
        style={{
          fontFamily: "system-ui",
          fontSize: "11px",
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
          letterSpacing: "0.10em",
          margin: "0 0 12px",
        }}
      >
        Dashboards
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {TILES.map((t) => {
          const isHovered = hovered === t.href;
          return (
            <a
              key={t.href}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered(t.href)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "18px 18px 16px",
                background: isHovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: isHovered ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(255,255,255,0.10)",
                borderRadius: "18px",
                textDecoration: "none",
                opacity: t.ready ? 1 : 0.65,
                transform: isHovered ? "translateY(-2px)" : "none",
                transition: "all 0.18s ease",
                boxShadow: isHovered ? "0 12px 36px rgba(0,0,0,0.4)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "14px",
                    background: t.accent,
                    border: "1px solid rgba(255,255,255,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  {t.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.95)",
                      margin: 0,
                      letterSpacing: "-0.005em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "11px",
                      color: "rgba(255,255,255,0.45)",
                      margin: "2px 0 0",
                    }}
                  >
                    {t.subtitle}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: "system-ui",
                    fontSize: "16px",
                    color: "rgba(255,255,255,0.40)",
                    flexShrink: 0,
                  }}
                >
                  →
                </span>
              </div>
              {!t.ready && (
                <span
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "12px",
                    fontFamily: "system-ui",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: "rgba(168,85,247,0.95)",
                    background: "rgba(168,85,247,0.12)",
                    border: "1px solid rgba(168,85,247,0.25)",
                    borderRadius: "999px",
                    padding: "2px 8px",
                  }}
                >
                  Soon
                </span>
              )}
            </a>
          );
        })}
      </div>
    </section>
  );
}
