"use client";

import { useEffect, useState } from "react";
import { QuickLaunch } from "./_components/QuickLaunch";
import { ContentTab } from "./_components/ContentTab";
import { PodcastTab } from "./_components/PodcastTab";
import { MeetingTab } from "./_components/MeetingTab";
import { GoalsTab } from "./_components/GoalsTab";
import { EventsTab } from "./_components/EventsTab";

type Tab = "content" | "podcast" | "meeting" | "goals" | "events";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "content", label: "Content", icon: "✨" },
  { key: "podcast", label: "Podcast", icon: "🎙" },
  { key: "meeting", label: "Team Meeting", icon: "🗓" },
  { key: "goals", label: "Goals", icon: "🎯" },
  { key: "events", label: "Events", icon: "📅" },
];

const TAB_STORAGE_KEY = "team-hub:active-tab";

function readStoredTab(): Tab {
  if (typeof window === "undefined") return "meeting";
  const v = window.localStorage.getItem(TAB_STORAGE_KEY);
  if (v && TABS.some((t) => t.key === v)) return v as Tab;
  return "meeting";
}

export interface TabMeta {
  updatedAt: string;
  updatedBy: string;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function TeamHubPage() {
  const [tab, setTab] = useState<Tab>("meeting");
  const [now, setNow] = useState<Date>(() => new Date());
  const [tabMeta, setTabMeta] = useState<Record<Tab, TabMeta | null>>({
    content: null,
    podcast: null,
    meeting: null,
    goals: null,
    events: null,
  });

  // Restore last selected tab (client-side only, after hydration)
  useEffect(() => {
    setTab(readStoredTab());
  }, []);

  // Persist tab selection on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    }
  }, [tab]);

  // Live clock — refresh every second; also re-tick meta badges every 30s so relative
  // times don't go stale while you're staring at the page
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  function reportTabMeta(key: Tab, meta: TabMeta | null) {
    setTabMeta((prev) => {
      // Avoid redundant re-renders if the value hasn't changed
      if (!meta && prev[key] === null) return prev;
      if (meta && prev[key] && prev[key]!.updatedAt === meta.updatedAt && prev[key]!.updatedBy === meta.updatedBy) return prev;
      return { ...prev, [key]: meta };
    });
  }

  const timeStr = now.toLocaleTimeString("en-AU", {
    timeZone: "Australia/Melbourne",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const melbourneDateStr = now.toLocaleDateString("en-AU", {
    timeZone: "Australia/Melbourne",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at 20% 0%, rgba(10,186,181,0.10) 0%, transparent 45%), radial-gradient(ellipse at 80% 100%, rgba(168,85,247,0.08) 0%, transparent 50%), #0a0e1a",
        color: "rgba(255,255,255,0.92)",
        fontFamily: "system-ui",
      }}
    >
      {/* ── Sticky Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10,14,26,0.85)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(10,186,181,0.15)",
                border: "1px solid rgba(10,186,181,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                boxShadow: "0 4px 16px rgba(10,186,181,0.20)",
              }}
            >
              🤖
            </div>
            <div>
              <p
                style={{
                  fontFamily: "system-ui",
                  fontSize: "11px",
                  letterSpacing: "0.20em",
                  color: "rgba(255,255,255,0.40)",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                Invictus Physiques
              </p>
              <h1
                style={{
                  fontFamily: "system-ui",
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  margin: 0,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                Team Hub
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  fontFamily: "system-ui",
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                {melbourneDateStr}
              </p>
              <p
                style={{
                  fontFamily: "system-ui",
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.95)",
                  margin: 0,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.02em",
                }}
              >
                {timeStr}
              </p>
            </div>
            <span
              style={{
                position: "relative",
                display: "inline-flex",
                width: "10px",
                height: "10px",
              }}
              title="Live"
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "#34d399",
                  opacity: 0.5,
                  animation: "pulse 2s infinite",
                }}
              />
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: "#34d399",
                }}
              />
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px 20px 60px",
        }}
      >
        {/* Quick-launch buttons */}
        <QuickLaunch />

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "20px",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            const meta = tabMeta[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  fontFamily: "system-ui",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.50)",
                  background: "transparent",
                  border: "none",
                  borderBottom: active ? "2px solid #0abab5" : "2px solid transparent",
                  padding: "12px 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                  marginBottom: "-1px",
                  position: "relative",
                }}
              >
                <span style={{ fontSize: "14px" }}>{t.icon}</span>
                {t.label}
                {meta && (
                  <span
                    title={`Last updated ${relativeTime(meta.updatedAt)} by ${meta.updatedBy}`}
                    style={{
                      fontFamily: "system-ui",
                      fontSize: "9px",
                      fontWeight: 500,
                      color: active ? "rgba(10,186,181,0.95)" : "rgba(255,255,255,0.35)",
                      background: active ? "rgba(10,186,181,0.15)" : "rgba(255,255,255,0.06)",
                      border: active ? "1px solid rgba(10,186,181,0.30)" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "999px",
                      padding: "2px 7px",
                      marginLeft: "2px",
                      letterSpacing: "0.02em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {relativeTime(meta.updatedAt)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {tab === "content" && <ContentTab onMeta={(m) => reportTabMeta("content", m)} />}
          {tab === "podcast" && <PodcastTab onMeta={(m) => reportTabMeta("podcast", m)} />}
          {tab === "meeting" && <MeetingTab onMeta={(m) => reportTabMeta("meeting", m)} />}
          {tab === "goals" && <GoalsTab onMeta={(m) => reportTabMeta("goals", m)} />}
          {tab === "events" && <EventsTab onMeta={(m) => reportTabMeta("events", m)} />}
        </div>
      </main>

      {/* Pulse animation for live indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.6); }
        }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(10,186,181,0.30); }
      `}</style>
    </div>
  );
}
