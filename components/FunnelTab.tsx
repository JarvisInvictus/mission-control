// Funnel Tab — Databox-style Macro Calculator Lead Gen dashboard
"use client";
import { useState, useEffect, useCallback } from "react";

const Tiffany = "#0ABAB5";

interface ClientsEditModalProps {
  current: number;
  onSave: (v: number) => void;
  onClose: () => void;
}

function ClientsEditModal({ current, onSave, onClose }: ClientsEditModalProps) {
  const [val, setVal] = useState(String(current));
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "20px",
          padding: "32px",
          width: "320px",
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ fontFamily: "system-ui", fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "20px" }}>
          Update Clients Signed
        </p>
        <input
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          autoFocus
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${Tiffany}55`,
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "16px",
            color: "white",
            fontFamily: "system-ui",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: "20px",
          }}
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px",
              color: "rgba(255,255,255,0.60)",
              cursor: "pointer",
              fontFamily: "system-ui",
              fontSize: "14px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { const v = parseInt(val); if (!isNaN(v) && v >= 0) onSave(v); }}
            style={{
              flex: 1, padding: "10px",
              background: Tiffany,
              border: "none",
              borderRadius: "10px",
              color: "#000",
              cursor: "pointer",
              fontWeight: 700,
              fontFamily: "system-ui",
              fontSize: "14px",
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FunnelTab() {
  const [macroLandingVisits, setMacroLandingVisits] = useState<number | null>(null);
  const [macroCalcVisits, setMacroCalcVisits] = useState<number | null>(null);
  const [emailSubscribers, setEmailSubscribers] = useState<number | null>(null);
  const [totalLeads, setTotalLeads] = useState<number | null>(null);
  const [clientsSigned, setClientsSigned] = useState<number>(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showEditClients, setShowEditClients] = useState(false);

  const load = useCallback(async (url: string, setter: (v: number) => void, key: string) => {
    try {
      const r = await fetch(url);
      const d = await r.json();
      setter(d.total ?? 0);
    } catch {
      setErrors(prev => ({ ...prev, [key]: "API error" }));
    }
  }, []);

  useEffect(() => {
    // Use Redis-based tracking API (single call for all funnel pages)
    fetch("/api/tracking/visits")
      .then(r => r.json())
      .then(d => {
        setMacroLandingVisits(d.landing ?? 0);
        setMacroCalcVisits(d.calculator ?? 0);
      })
      .catch(() => {});
    load("/api/mailer/subscribers", setEmailSubscribers, "subscribers");
    load("/api/leads/count", setTotalLeads, "leads");
    const stored = localStorage.getItem("mc_funnel_clients_signed");
    if (stored) setClientsSigned(parseInt(stored));
  }, [load]);

  // ─── Helpers ────────────────────────────────────────────────────
  const convRate = (val: number | null, total: number | null): string => {
    if (val === null || total === null || total === 0) return "0.0";
    return (val / total * 100).toFixed(1);
  };

  const landing = macroLandingVisits ?? 0;
  const calc = macroCalcVisits ?? 0;
  const subs = emailSubscribers ?? 0;
  const leads = totalLeads ?? 0;

  const calcRate = parseFloat(convRate(calc, landing));
  const emailRate = parseFloat(convRate(subs, calc));
  const leadRate = parseFloat(convRate(leads, subs));
  const overallRate = parseFloat(convRate(clientsSigned, landing));
  const calcEngageRate = parseFloat(convRate(calc, landing));

  // ─── Gauge ───────────────────────────────────────────────────────
  const Gauge = ({ value, max = 100, color = Tiffany }: { value: number; max?: number; color?: string }) => {
    const pct = Math.min(value / max, 1);
    const conic = `conic-gradient(${color} ${pct * 360}deg, rgba(255,255,255,0.06) ${pct * 360}deg)`;
    return (
      <div
        style={{
          width: 40, height: 40,
          borderRadius: "50%",
          background: conic,
          border: "2px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div style={{
          position: "absolute", inset: 4,
          borderRadius: "50%",
          background: "#0D1117",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "system-ui", fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.70)" }}>
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
    );
  };

  // ─── Sparkline bar chart ─────────────────────────────────────────
  const SparkBars = ({ color = Tiffany }: { color?: string }) => {
    const bars = [35, 55, 45, 70, 60, 80, 65, 90, 75, 88];
    return (
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40, padding: "4px 0" }}>
        {bars.map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h}%`,
              background: i === bars.length - 1 ? color : "rgba(255,255,255,0.12)",
              borderRadius: 3,
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
    );
  };

  // ─── Header ──────────────────────────────────────────────────────
  const Header = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h2 style={{ fontFamily: "system-ui", fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Lead Gen Funnel
        </h2>
        <p style={{ fontFamily: "system-ui", fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>
          Macro Calculator Performance
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontFamily: "system-ui", fontSize: 12,
          background: `${Tiffany}18`,
          color: Tiffany,
          padding: "5px 12px",
          borderRadius: 20,
          border: `1px solid ${Tiffany}35`,
        }}>
          Last 30 days
        </span>
        <button
          title="Funnel info"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            padding: "8px 10px",
            cursor: "pointer",
            color: "rgba(255,255,255,0.50)",
            fontFamily: "system-ui",
            fontSize: 14,
            display: "flex", alignItems: "center",
          }}
        >
          ⓘ
        </button>
      </div>
    </div>
  );

  // ─── Row 1: 3 big KPI cards ───────────────────────────────────────
  const KpiCard = ({
    label, value, sub, change, changeType, sparkline
  }: {
    label: string;
    value: string | number;
    sub: string;
    change?: string;
    changeType?: "up" | "down";
    sparkline?: React.ReactNode;
  }) => (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 16,
      padding: "24px",
      minWidth: 200, flex: 1,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <p style={{ fontFamily: "system-ui", fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "system-ui", fontSize: 28, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ fontFamily: "system-ui", fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>{sub}</p>
      {change && (
        <span style={{
          fontFamily: "system-ui", fontSize: 12, fontWeight: 600,
          color: changeType === "up" ? "#22c55e" : "#ef4444",
        }}>
          {changeType === "up" ? "▲" : "▼"} {change}
        </span>
      )}
      {sparkline && <div style={{ marginTop: 10 }}>{sparkline}</div>}
    </div>
  );

  // ─── Row 2: 4 KPI gauge tiles ────────────────────────────────────
  const KpiTile = ({ label, value, gauge }: { label: string; value: string; gauge: React.ReactNode }) => (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 12,
      padding: "18px 20px",
      minWidth: 140, flex: 1,
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div>{gauge}</div>
      <div>
        <p style={{ fontFamily: "system-ui", fontSize: 18, fontWeight: 700, color: "white", margin: "0 0 2px" }}>{value}</p>
        <p style={{ fontFamily: "system-ui", fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>{label}</p>
      </div>
    </div>
  );

  // ─── Table card ──────────────────────────────────────────────────
  const TableCard = ({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) => (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 20,
      flex: "1 1 260px",
    }}>
      <p style={{
        fontFamily: "system-ui", fontSize: 13, fontWeight: 700,
        color: accent ?? "rgba(255,255,255,0.70)",
        margin: "0 0 14px",
      }}>
        {title}
      </p>
      {children}
    </div>
  );

  // ─── 3-col table row ─────────────────────────────────────────────
  const TableRow3 = ({ col1, col2, col3, highlight }: {
    col1: string; col2: string; col3: string; highlight?: boolean;
  }) => (
    <div style={{
      display: "flex",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      padding: "9px 0",
    }}>
      <span style={{
        fontFamily: "system-ui", fontSize: 13,
        color: highlight ? Tiffany : "rgba(255,255,255,0.55)",
        flex: 2,
        fontWeight: highlight ? 600 : 400,
      }}>{col1}</span>
      <span style={{ fontFamily: "system-ui", fontSize: 13, color: "white", flex: 1, textAlign: "right" }}>{col2}</span>
      <span style={{ fontFamily: "system-ui", fontSize: 13, color: Tiffany, flex: 1, textAlign: "right" }}>{col3}</span>
    </div>
  );

  // ─── 2-col table row ─────────────────────────────────────────────
  const TableRow2 = ({ col1, col2, accentValue }: {
    col1: string; col2: string; accentValue?: boolean;
  }) => (
    <div style={{
      display: "flex",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      padding: "9px 0",
    }}>
      <span style={{ fontFamily: "system-ui", fontSize: 13, color: "rgba(255,255,255,0.55)", flex: 1 }}>{col1}</span>
      <span style={{
        fontFamily: "system-ui", fontSize: 13,
        color: accentValue ? Tiffany : "white",
        fontWeight: accentValue ? 600 : 400,
        flex: 1, textAlign: "right",
      }}>{col2}</span>
    </div>
  );

  const TableHead3 = () => (
    <div style={{ display: "flex", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 2 }}>Stage</span>
      <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 1, textAlign: "right" }}>Visitors</span>
      <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 1, textAlign: "right" }}>Conv. Rate</span>
    </div>
  );

  const TableHead2 = () => (
    <div style={{ display: "flex", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 1 }}>Metric</span>
      <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 1, textAlign: "right" }}>Value</span>
    </div>
  );

  // ─── Performance Summary auto-text ──────────────────────────────
  const perfText = () => {
    if (calc === 0 && subs === 0 && leads === 0 && clientsSigned === 0) {
      return "No data yet — metrics will appear once visitors start flowing through the funnel.";
    }
    const parts: string[] = [];
    if (subs > 0 && calc > 0) {
      parts.push(`The calculator converted ${subs.toLocaleString()} of ${calc.toLocaleString()} visitors (${emailRate}%)`);
    }
    if (leads > 0) {
      parts.push(`${leads.toLocaleString()} leads were submitted to the CRM`);
    }
    if (clientsSigned > 0) {
      parts.push(`${clientsSigned} client${clientsSigned !== 1 ? "s" : ""} signed up`);
    }
    if (parts.length === 0) {
      return "Waiting for funnel data — check back once traffic flows through.";
    }
    return parts.join(". ") + ".";
  };

  // ─── Main render ─────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 28px 40px", background: "#0D1117", minHeight: "100vh" }}>
      <Header />

      {/* Row 1 — 3 big KPI cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard
          label="Landing Page Visits"
          value={macroLandingVisits !== null ? macroLandingVisits.toLocaleString() : "—"}
          sub="Last 30 days"
          sparkline={<SparkBars />}
        />
        <KpiCard
          label="Calculator Visits"
          value={macroCalcVisits !== null ? macroCalcVisits.toLocaleString() : "—"}
          sub="Last 30 days"
          sparkline={<SparkBars color="#3b82f6" />}
        />
        <KpiCard
          label="Email Subscribers"
          value={emailSubscribers !== null ? emailSubscribers.toLocaleString() : "—"}
          sub="Last 30 days"
          sparkline={<SparkBars color="#22c55e" />}
        />
      </div>

      {/* Row 2 — 4 KPI gauge tiles */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiTile
          label="Email Capture Rate"
          value={`${convRate(subs, calc)}%`}
          gauge={<Gauge value={emailRate} max={100} color={Tiffany} />}
        />
        <KpiTile
          label="Lead Conversion Rate"
          value={`${convRate(leads, subs)}%`}
          gauge={<Gauge value={leadRate} max={100} color="#3b82f6" />}
        />
        <KpiTile
          label="Overall Conversion"
          value={`${convRate(clientsSigned, landing)}%`}
          gauge={<Gauge value={overallRate} max={100} color="#22c55e" />}
        />
        <KpiTile
          label="Calc Engagement"
          value={`${convRate(calc, landing)}%`}
          gauge={<Gauge value={calcEngageRate} max={100} color="#f59e0b" />}
        />
      </div>

      {/* Row 3 — 4 data tables */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>

        {/* Table 1: Funnel Stages */}
        <TableCard title="Funnel Stages">
          <TableHead3 />
          <TableRow3 col1="Landing Page" col2={landing > 0 ? landing.toLocaleString() : "—"} col3="100%" highlight />
          <TableRow3 col1="Calculator" col2={calc > 0 ? calc.toLocaleString() : "—"} col3={`${convRate(calc, landing)}%`} />
          <TableRow3 col1="Email Captured" col2={subs > 0 ? subs.toLocaleString() : "—"} col3={`${convRate(subs, calc)}%`} />
          <TableRow3 col1="Leads" col2={leads > 0 ? leads.toLocaleString() : "—"} col3={`${convRate(leads, subs)}%`} />
          <TableRow3
            col1="Clients"
            col2={clientsSigned > 0 ? clientsSigned.toLocaleString() : "—"}
            col3={`${convRate(clientsSigned, landing)}%`}
            highlight
          />
          {/* Edit clients button */}
          <div style={{ marginTop: 14 }}>
            <button
              onClick={() => setShowEditClients(true)}
              style={{
                fontFamily: "system-ui", fontSize: 12, fontWeight: 600,
                background: `${Tiffany}18`,
                color: Tiffany,
                border: `1px solid ${Tiffany}35`,
                borderRadius: 8,
                padding: "6px 14px",
                cursor: "pointer",
              }}
            >
              ✎ Edit Clients
            </button>
          </div>
        </TableCard>

        {/* Table 2: Top Sources (mock) */}
        <TableCard title="Top Sources">
          <div style={{ display: "flex", paddingBottom: 6, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 2 }}>Source</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 1, textAlign: "right" }}>Visitors</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.30)", flex: 1, textAlign: "right" }}>% of Total</span>
          </div>
          <TableRow3 col1="Instagram Bio Link" col2="~60%" col3="~60%" />
          <TableRow3 col1="WhatsApp Share" col2="~25%" col3="~25%" />
          <TableRow3 col1="Direct" col2="~15%" col3="~15%" />
          <div style={{ marginTop: 10, padding: "6px 10px", background: "rgba(245,158,11,0.10)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.20)" }}>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "#f59e0b" }}>
              ℹ Sources are estimated — wire GA4/analytics for real data
            </span>
          </div>
        </TableCard>

        {/* Table 3: Calculator Submissions */}
        <TableCard title="Calculator Submissions">
          <TableHead2 />
          <TableRow2 col1="Total Calculator Uses" col2={calc > 0 ? calc.toLocaleString() : "—"} />
          <TableRow2 col1="Email Captured" col2={subs > 0 ? subs.toLocaleString() : "—"} accentValue />
          <TableRow2 col1="Capture Rate" col2={`${convRate(subs, calc)}%`} accentValue />
          <TableRow2 col1="Submitted to CRM" col2={leads > 0 ? leads.toLocaleString() : "—"} />
        </TableCard>

        {/* Table 4: Performance Summary */}
        <TableCard title="✓ Funnel is performing well" accent="#22c55e">
          <p style={{
            fontFamily: "system-ui", fontSize: 13,
            color: "rgba(255,255,255,0.55)",
            margin: "0 0 14px",
            lineHeight: 1.7,
          }}>
            {perfText()}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "system-ui", fontSize: 11,
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.55)",
              padding: "3px 10px",
              borderRadius: 20,
            }}>
              Last 30 days
            </span>
            <span style={{
              fontFamily: "system-ui", fontSize: 11,
              background: "rgba(34,197,94,0.12)",
              color: "#22c55e",
              padding: "3px 10px",
              borderRadius: 20,
            }}>
              Live data
            </span>
          </div>
        </TableCard>

      </div>

      {/* Footer */}
      <p style={{
        fontFamily: "system-ui", fontSize: 12,
        color: "rgba(255,255,255,0.20)",
        marginTop: 28, textAlign: "center",
      }}>
        Invictus Physiques · Lead Gen Funnel
      </p>

      {/* Edit modal */}
      {showEditClients && (
        <ClientsEditModal
          current={clientsSigned}
          onSave={(v) => {
            setClientsSigned(v);
            localStorage.setItem("mc_funnel_clients_signed", String(v));
            setShowEditClients(false);
          }}
          onClose={() => setShowEditClients(false)}
        />
      )}
    </div>
  );
}
