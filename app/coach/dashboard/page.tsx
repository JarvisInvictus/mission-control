"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Same PIN as the rest of the coach surface. Single source of truth is /coach/page.tsx.
const COACH_PIN = "1998";
const STORAGE_KEY = "mc_coach_authed";
const MELB_TZ = "Australia/Melbourne";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source?: string;
  stage?: string;
  assignedTo?: string;
  createdAt?: string;
  lastUpdated?: string;
  notes?: string;
}

interface OnboardingSubmission {
  id: string;
  coach: "Milzzy" | "Miggy";
  name: string;
  email: string;
  phone: string;
  submittedAt: string;
  goal?: string;
  service?: string;
  filloutUrl: string;
}

interface Client {
  id: string;
  name: string;
  coach: "Milzzy" | "Miggy";
  status: string;
  weeklyCharge?: number;
  coachCut?: number;
}

interface Weather {
  tempC: number;
  desc: string;
  icon: string;
}

export default function CoachDashboardPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setAuthed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setAuthed(false);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin === COACH_PIN) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
      setAuthed(true);
      setError(null);
    } else {
      setError("Wrong PIN");
      setPin("");
    }
  }

  function handleSignOut() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setAuthed(false);
    setPin("");
  }

  if (authed === null) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0e1a 0%, #0d1320 50%, #0a0e1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui", fontSize: 13 }}>
        Loading…
      </div>
    );
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0e1a 0%, #0d1320 50%, #0a0e1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui" }}>
        <form onSubmit={handleSubmit} style={{ background: "rgba(15,20,40,0.60)", backdropFilter: "blur(20px)", border: "1px solid rgba(129,205,249,0.25)", borderRadius: 20, padding: "40px 32px", width: "min(360px, calc(100% - 32px))", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.20em", color: "#81cdf9", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Invictus Dashboard</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.92)", margin: "0 0 4px", letterSpacing: "-0.01em" }}>Coach Dashboard</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.50)", margin: "0 0 24px" }}>Enter your 4-digit PIN to continue</p>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); setPin(v); setError(null); }}
            placeholder="• • • •"
            style={{ width: "100%", padding: "16px 12px", background: "rgba(0,0,0,0.30)", border: `1px solid ${error ? "rgba(248,113,113,0.50)" : "rgba(255,255,255,0.10)"}`, borderRadius: 12, color: "rgba(255,255,255,0.92)", fontSize: 24, letterSpacing: "0.5em", textAlign: "center", fontFamily: "system-ui", fontWeight: 600, boxSizing: "border-box", outline: "none" }}
          />
          {error && <div style={{ color: "#f87171", fontSize: 12, marginTop: 10, fontWeight: 500 }}>{error}</div>}
          <button type="submit" disabled={pin.length !== 4} style={{ marginTop: 20, width: "100%", padding: "14px 20px", background: pin.length === 4 ? "rgba(129,205,249,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${pin.length === 4 ? "rgba(129,205,249,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, color: pin.length === 4 ? "#81cdf9" : "rgba(255,255,255,0.30)", fontSize: 14, fontWeight: 600, cursor: pin.length === 4 ? "pointer" : "not-allowed", fontFamily: "system-ui", transition: "all 0.15s" }}>Unlock Dashboard</button>
          <div style={{ marginTop: 28, fontSize: 11, color: "rgba(255,255,255,0.30)" }}>Need access? Ask Milzzy for the PIN.</div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <SignOutButton onSignOut={handleSignOut} />
      <Dashboard onSignOut={handleSignOut} />
    </div>
  );
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, fontFamily: "system-ui" }}>
      {show ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center", background: "rgba(15,20,40,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "6px 10px" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>Sign out?</span>
          <button onClick={onSignOut} style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.30)", borderRadius: 6, padding: "4px 10px", color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Yes</button>
          <button onClick={() => setShow(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.50)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", padding: "4px 8px" }}>No</button>
        </div>
      ) : (
        <button onClick={() => setShow(true)} style={{ background: "rgba(15,20,40,0.60)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "6px 12px", color: "rgba(255,255,255,0.55)", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 }}>Sign out</button>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Dashboard
// --------------------------------------------------------------------------

export function Dashboard({ onSignOut: _onSignOut }: { onSignOut: () => void }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [onboardings, setOnboardings] = useState<OnboardingSubmission[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  // Per-session dismissed IDs (so they don't leak across other devices).
  // Survives via localStorage. When Miggy marks an onboarding as handled,
  // we hide BOTH the lead and the onboarding submission from his view.
  const [dismissedOnboardingIds, setDismissedOnboardingIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("coach_dismissed_onboardings") ?? "[]"); }
    catch { return []; }
  });
  const [dismissedLeadIds, setDismissedLeadIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("coach_dismissed_leads") ?? "[]"); }
    catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem("coach_dismissed_onboardings", JSON.stringify(dismissedOnboardingIds)); } catch {} }, [dismissedOnboardingIds]);
  useEffect(() => { try { localStorage.setItem("coach_dismissed_leads", JSON.stringify(dismissedLeadIds)); } catch {} }, [dismissedLeadIds]);

  function markOnboarded(onboardingId: string, leadId?: string) {
    setDismissedOnboardingIds(prev => prev.includes(onboardingId) ? prev : [...prev, onboardingId]);
    if (leadId) setDismissedLeadIds(prev => prev.includes(leadId) ? prev : [...prev, leadId]);
  }

  // Refresh tick (auto every 60s)
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Date in Melbourne
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(i);
  }, []);

  async function loadAll() {
    try {
      const [lr, or, cr] = await Promise.all([
        fetch("/api/leads", { cache: "no-store" }).then(r => r.json()).catch(() => []),
        fetch("/api/onboarding", { cache: "no-store" }).then(r => r.json()).catch(() => ({ unacked: [] })),
        fetch("/api/clients", { cache: "no-store" }).then(r => r.json()).catch(() => []),
      ]);
      setLeads(Array.isArray(lr) ? lr : []);
      setOnboardings(Array.isArray(or?.unacked) ? or.unacked : []);
      setClients(Array.isArray(cr) ? cr : []);
      setLastRefresh(Date.now());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    const i = setInterval(loadAll, 60_000);
    return () => clearInterval(i);
  }, []);

  async function updateLeadStage(leadId: string, stage: string) {
    setUpdatingLeadId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (res.ok) {
        // Optimistic local update so the chip reflects immediately
        setLeads(curr => curr.map(l => l.id === leadId ? { ...l, stage, lastUpdated: new Date().toISOString() } : l));
      }
    } catch {
      /* network error — auto refresh on next tick will reconcile */
    } finally {
      setUpdatingLeadId(null);
    }
  }

  // Weather: wttr.in Melbourne — simple, no API key
  useEffect(() => {
    let cancelled = false;
    fetch("https://wttr.in/Melbourne?format=j1")
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        const cur = d?.current_condition?.[0];
        if (cur) {
          setWeather({
            tempC: parseInt(cur.temp_C, 10),
            desc: cur.weatherDesc?.[0]?.value ?? "—",
            icon: weatherIcon(cur.weatherCode),
          });
        }
      })
      .catch(() => { /* ignore — weather is non-critical */ });
    return () => { cancelled = true; };
  }, []);

  // Filter to Miggy, then drop any dismissed-by-him IDs so the queue stays clean.
  const myLeads = leads.filter(l => (l.assignedTo ?? "Milzzy") === "Miggy" && !dismissedLeadIds.includes(l.id));
  const myOnboardings = onboardings.filter(o => o.coach === "Miggy" && !dismissedOnboardingIds.includes(o.id));
  const myActiveClients = clients.filter(c => c.coach === "Miggy" && c.status === "active");

  // Stats
  const totalClients = myActiveClients.length;
  const weeklyCut = myActiveClients.reduce((s, c) => s + (c.coachCut ?? Math.round((c.weeklyCharge || 0) * 60 / 85)), 0);
  const yearlyCut = weeklyCut * 52;

  // Date string
  const dateStr = now.toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: MELB_TZ,
  });

  // Time-of-day greeting (Melbourne hours)
  const melHour = Number(now.toLocaleString("en-AU", { hour: "numeric", hour12: false, timeZone: MELB_TZ }));
  const greeting =
    melHour >= 5 && melHour < 12 ? "Good morning" :
    melHour >= 12 && melHour < 17 ? "Good afternoon" :
    melHour >= 17 && melHour < 21 ? "Good evening" :
    "Hey";

  return (
    <div style={{
      color: "rgba(255,255,255,0.92)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "8px 4px 24px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: "0.20em", color: "#0abab5", textTransform: "uppercase", fontWeight: 600, margin: "0 0 4px" }}>Invictus Dashboard</p>
            <h1 style={{ fontSize: 30, fontWeight: 700, color: "white", margin: 0, letterSpacing: "-0.01em" }}>{greeting}, Coach Miggy</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", margin: "6px 0 0" }}>{dateStr}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            {weather && (
              <WeatherChip weather={weather} />
            )}
          </div>
        </header>

        {/* Stats row */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          <StatCard label="Active Clients" value={loading ? "—" : String(totalClients)} accent="#0abab5" />
          <StatCard label="Weekly" value={loading ? "—" : `$${weeklyCut.toLocaleString()}`} accent="#0abab5" />
          <StatCard label="Yearly" value={loading ? "—" : `$${yearlyCut.toLocaleString()}`} accent="#0abab5" />
        </section>

        {/* Invoice button + quick actions */}
        <section style={{ marginBottom: 24 }}>
          <button
            onClick={() => setInvoiceOpen(true)}
            disabled={loading || myActiveClients.length === 0}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, rgba(10,186,181,0.20) 0%, rgba(10,186,181,0.10) 100%)",
              border: "1px solid rgba(10,186,181,0.40)",
              borderRadius: 16,
              padding: "18px 22px",
              color: "white",
              fontSize: 15,
              fontWeight: 700,
              cursor: (loading || myActiveClients.length === 0) ? "not-allowed" : "pointer",
              opacity: (loading || myActiveClients.length === 0) ? 0.5 : 1,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              transition: "all 0.15s",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>🧾</span>
              <span>Generate Invoice</span>
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
              View weekly breakdown →
            </span>
          </button>
        </section>

        {/* New leads */}
        <Panel
          title="New leads"
          subtitle="Recent enquiry form submissions — click to update status"
          icon="📥"
          count={myLeads.length}
          emptyMessage="No new leads yet — when someone fills out your enquiry form, they'll show up here."
        >
          {myLeads.slice(0, 8).map(l => (
            <LeadCard
              key={l.id}
              lead={l}
              expanded={expandedLeadId === l.id}
              onToggle={() => setExpandedLeadId(curr => curr === l.id ? null : l.id)}
              onSetStage={(s) => updateLeadStage(l.id, s)}
              busy={updatingLeadId === l.id}
            />
          ))}
        </Panel>

        {/* New onboardings */}
        <Panel
          title="New onboardings"
          subtitle="Clients who just filled out your onboarding form"
          icon="✅"
          count={myOnboardings.length}
          emptyMessage="No pending onboardings."
        >
          {myOnboardings.slice(0, 8).map(o => {
            // Try to match to a lead by email so dismissing hides both.
            const matchedLead = leads.find(l =>
              l.assignedTo === "Miggy" &&
              l.email &&
              o.email &&
              l.email.toLowerCase().trim() === o.email.toLowerCase().trim() &&
              !dismissedLeadIds.includes(l.id)
            );
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <ListItem
                    title={o.name || "Unnamed"}
                    meta={[
                      o.email,
                      o.phone,
                      o.service || null,
                      timeAgo(o.submittedAt),
                    ].filter(Boolean).join(" · ")}
                    badge={o.goal}
                    href={o.filloutUrl}
                  />
                </div>
                <button
                  onClick={() => markOnboarded(o.id, matchedLead?.id)}
                  title="Hide this lead + onboarding from your view. You can undo it via the API."
                  style={{
                    background: "rgba(52,211,153,0.10)",
                    border: "1px solid rgba(52,211,153,0.30)",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#6ee7b7",
                    fontSize: 11, fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  ✓ Onboarded
                </button>
              </div>
            );
          })}
        </Panel>

        <div style={{ marginTop: 24, fontSize: 11, color: "rgba(255,255,255,0.30)", textAlign: "center" }}>
          Last refresh: {new Date(lastRefresh).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: MELB_TZ })}
        </div>
      </div>

      {invoiceOpen && (
        <InvoiceModal
          clients={myActiveClients}
          onClose={() => setInvoiceOpen(false)}
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(12px)",
      border: `1px solid ${accent}40`,
      borderRadius: 16,
      padding: "18px 18px",
    }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: accent, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: "white", margin: 0, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function Panel({ title, subtitle, icon, count, emptyMessage, children }: {
  title: string; subtitle: string; icon: string; count: number; emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18,
      padding: "20px 22px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(10,186,181,0.15)", border: "1px solid rgba(10,186,181,0.40)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "white", margin: 0 }}>{title}</h2>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "2px 0 0" }}>{subtitle}</p>
          </div>
        </div>
        <span style={{ background: count > 0 ? "#0abab5" : "rgba(255,255,255,0.10)", color: count > 0 ? "white" : "rgba(255,255,255,0.45)", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 800 }}>{count}</span>
      </div>
      {count === 0 ? (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.40)", margin: 0, fontStyle: "italic" }}>{emptyMessage}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
      )}
    </section>
  );
}

function ListItem({ title, meta, badge, href }: { title: string; meta: string; badge?: string; href?: string }) {
  const inner = (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderLeft: "3px solid #0abab5",
      borderRadius: 12,
      padding: "12px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      cursor: href ? "pointer" : "default",
      transition: "background 0.15s",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</p>
      </div>
      {badge && (
        <span style={{
          background: "rgba(10,186,181,0.15)",
          color: "#5fd5d1",
          border: "1px solid rgba(10,186,181,0.30)",
          borderRadius: 999,
          padding: "2px 8px",
          fontSize: 10,
          fontWeight: 600,
          flexShrink: 0,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>{badge}</span>
      )}
    </div>
  );
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a>;
  }
  return inner;
}

// Friendly labels for the stage values stored in /api/leads/[id].
const STAGE_LABEL: Record<string, string> = {
  "new-lead": "New",
  "book-consult": "Booked consult",
  "consult-call": "Contacted",
  "follow-up": "Following up",
  "signed": "Client signed",
  "lost": "Client lost",
  "no-show": "No-show",
};

const STAGE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  "new-lead":      { bg: "rgba(10,186,181,0.15)", text: "#5fd5d1", border: "rgba(10,186,181,0.30)" },
  "book-consult":  { bg: "rgba(96,165,250,0.15)", text: "#93c5fd", border: "rgba(96,165,250,0.30)" },
  "consult-call":  { bg: "rgba(250,204,21,0.15)", text: "#fde68a", border: "rgba(250,204,21,0.30)" },
  "follow-up":     { bg: "rgba(168,85,247,0.15)", text: "#c4a5f7", border: "rgba(168,85,247,0.30)" },
  "signed":        { bg: "rgba(52,211,153,0.18)", text: "#6ee7b7", border: "rgba(52,211,153,0.35)" },
  "lost":          { bg: "rgba(248,113,113,0.15)", text: "#fca5a5", border: "rgba(248,113,113,0.30)" },
  "no-show":       { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.55)", border: "rgba(255,255,255,0.10)" },
};

// The four stages Miggy actually needs from the dashboard.
// 'follow-up' and 'no-show' exist in the system but aren't first-class buttons here.
const QUICK_STAGES: { stage: string; label: string; tone: "positive" | "neutral" | "negative" | "warn" }[] = [
  { stage: "consult-call", label: "Contacted", tone: "warn" },
  { stage: "signed",       label: "Signed",    tone: "positive" },
  { stage: "lost",         label: "Lost",      tone: "negative" },
  { stage: "new-lead",     label: "Reset",     tone: "neutral" },
];

function LeadCard({
  lead,
  expanded,
  onToggle,
  onSetStage,
  busy,
}: {
  lead: Lead;
  expanded: boolean;
  onToggle: () => void;
  onSetStage: (stage: string) => void;
  busy: boolean;
}) {
  const stage = lead.stage ?? "new-lead";
  const sc = STAGE_COLOR[stage] ?? STAGE_COLOR["new-lead"];
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderLeft: `3px solid ${sc.text}`,
      borderRadius: 12,
      overflow: "hidden",
      transition: "all 0.15s",
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.name || "Unnamed"}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.email || "—"}{lead.phone ? ` · ${lead.phone}` : ""}{lead.createdAt ? ` · ${timeAgo(lead.createdAt)}` : ""}
          </p>
        </div>
        <span style={{
          background: sc.bg, color: sc.text,
          border: `1px solid ${sc.border}`,
          borderRadius: 999, padding: "2px 9px",
          fontSize: 10, fontWeight: 700, flexShrink: 0,
          letterSpacing: "0.02em",
        }}>{STAGE_LABEL[stage] ?? stage}</span>
        <span style={{
          fontSize: 12, color: "rgba(255,255,255,0.30)",
          flexShrink: 0, transition: "transform 0.15s",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          display: "inline-block",
        }}>▾</span>
      </button>
      {expanded && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          padding: "12px 14px",
          background: "rgba(0,0,0,0.20)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Update status</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {QUICK_STAGES.map(s => {
              const isCurrent = stage === s.stage;
              const tone = s.tone === "positive"
                ? { bg: "rgba(52,211,153,0.18)", text: "#6ee7b7", border: "rgba(52,211,153,0.40)" }
                : s.tone === "negative"
                ? { bg: "rgba(248,113,113,0.15)", text: "#fca5a5", border: "rgba(248,113,113,0.35)" }
                : s.tone === "warn"
                ? { bg: "rgba(250,204,21,0.15)", text: "#fde68a", border: "rgba(250,204,21,0.35)" }
                : { bg: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.70)", border: "rgba(255,255,255,0.10)" };
              return (
                <button
                  key={s.stage}
                  disabled={busy || isCurrent}
                  onClick={() => onSetStage(s.stage)}
                  style={{
                    background: isCurrent ? tone.bg : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isCurrent ? tone.border : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 10, padding: "10px 12px",
                    color: isCurrent ? tone.text : "rgba(255,255,255,0.75)",
                    fontSize: 12, fontWeight: 600,
                    cursor: (busy || isCurrent) ? "default" : "pointer",
                    fontFamily: "inherit",
                    opacity: (busy && !isCurrent) ? 0.5 : 1,
                    transition: "all 0.15s",
                  }}
                >{isCurrent ? `✓ ${s.label}` : s.label}</button>
              );
            })}
          </div>
          {lead.notes && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px" }}>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Notes</p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{lead.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WeatherChip({ weather }: { weather: Weather }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 12,
      padding: "8px 14px",
    }}>
      <span style={{ fontSize: 18 }}>{weather.icon}</span>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{weather.tempC}°C</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.50)" }}>{weather.desc} · Melbourne</span>
      </div>
    </div>
  );
}

function InvoiceModal({ clients, onClose }: { clients: Client[]; onClose: () => void }) {
  // Group by coachCut value (fall back to default split)
  const effectiveCut = (c: Client) => c.coachCut ?? Math.round((c.weeklyCharge || 0) * 60 / 85);
  const groups = new Map<number, Client[]>();
  for (const c of clients) {
    const k = effectiveCut(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(c);
  }
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => b - a);
  const total = clients.reduce((s, c) => s + effectiveCut(c), 0);

  // Build the invoice text
  const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: MELB_TZ });
  const invoiceLines: string[] = [
    "Miggy → Milzzy — Weekly Invoice",
    `Week of ${today}`,
    "",
  ];
  for (const k of sortedKeys) {
    const cs = groups.get(k)!;
    invoiceLines.push(`${cs.length} × $${k}/wk client${cs.length === 1 ? "" : "s"}        = $${(cs.length * k).toLocaleString()}`);
  }
  invoiceLines.push("─".repeat(40));
  invoiceLines.push(`Total${" ".repeat(28)}= $${total.toLocaleString()}`);
  invoiceLines.push("");
  invoiceLines.push(`Total active clients: ${clients.length}`);
  const invoiceText = invoiceLines.join("\n");

  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(invoiceText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.70)", backdropFilter: "blur(8px)",
        zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(135deg, #0d1320 0%, #1a1f2e 100%)",
        border: "1px solid rgba(10,186,181,0.40)",
        borderRadius: 20,
        width: "min(560px, 100%)",
        maxHeight: "90vh",
        overflow: "auto",
        fontFamily: "system-ui",
      }}>
        <div style={{ padding: "22px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>Weekly Invoice</h2>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", margin: "3px 0 0" }}>Copy and paste into your invoice</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "6px 12px", color: "rgba(255,255,255,0.70)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Close</button>
        </div>

        <div style={{ padding: "22px 24px" }}>
          {/* Per-rate breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {sortedKeys.map(k => {
              const cs = groups.get(k)!;
              return (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(10,186,181,0.08)", border: "1px solid rgba(10,186,181,0.25)", borderRadius: 12, padding: "12px 16px" }}>
                  <div>
                    <p style={{ fontSize: 22, fontWeight: 700, color: "white", margin: 0, lineHeight: 1 }}>{cs.length} <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>client{cs.length === 1 ? "" : "s"}</span></p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.50)", margin: "3px 0 0" }}>${k}/wk each</p>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#5fd5d1", margin: 0 }}>${(cs.length * k).toLocaleString()}</p>
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" }} />

          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.50)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "3px 0 0" }}>{clients.length} active client{clients.length === 1 ? "" : "s"}</p>
            </div>
            <p style={{ fontSize: 32, fontWeight: 700, color: "white", margin: 0, lineHeight: 1 }}>${total.toLocaleString()}</p>
          </div>

          {/* Plain text version */}
          <div style={{ background: "rgba(0,0,0,0.40)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.40)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Plain text</p>
            <pre style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              margin: 0,
              whiteSpace: "pre-wrap",
              lineHeight: 1.6,
            }}>{invoiceText}</pre>
          </div>

          <button onClick={copy} style={{
            width: "100%",
            background: copied ? "rgba(52,211,153,0.20)" : "linear-gradient(135deg, rgba(10,186,181,0.30) 0%, rgba(10,186,181,0.20) 100%)",
            border: `1px solid ${copied ? "rgba(52,211,153,0.50)" : "rgba(10,186,181,0.50)"}`,
            borderRadius: 12,
            padding: "14px 20px",
            color: "white",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 0.15s",
          }}>{copied ? "✓ Copied to clipboard" : "Copy invoice text"}</button>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(diff / 3_600_000);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(diff / 86_400_000);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: MELB_TZ });
}

function weatherIcon(code: string | undefined): string {
  // wttr.in / worldweatheronline style codes — map a handful to emoji
  const c = String(code ?? "");
  if (c === "113") return "☀️";
  if (c === "116") return "⛅";
  if (c === "119" || c === "122") return "☁️";
  if (["176","179","182","185","200","227","230","248","260","263","266","281","284","293","296","299","302","305","308","311","314","317","320","323","326","329","332","335","338","350","353","356","359","362","365","368","371","374","377","386","389","392","395"].includes(c)) return "🌧️";
  if (["179","182","185","227","230","248","260","320","323","326","329","332","335","338","350","362","365","368","371","374","377"].includes(c)) return "❄️";
  if (["200","386","389","392","395"].includes(c)) return "⛈️";
  if (c === "143" || c === "248") return "🌫️";
  return "🌤️";
}
