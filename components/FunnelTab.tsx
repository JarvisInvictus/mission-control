// Funnel Tab — Databox-style Facebook Ads dashboard
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

  // TODO: wire Facebook/Meta Ads API for real ad metrics
  const [spent] = useState<string>("$2,375.00");
  const [clicks] = useState<number>(374);
  const [impressions] = useState<number>(7760);
  const [cpc] = useState<string>("$4.00");
  const [cpm] = useState<string>("$3.00");
  const [ctr] = useState<string>("5.0%");
  const [reach] = useState<number>(8554);

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
    load("/api/analytics/visits?path=/", setMacroLandingVisits, "macroLanding");
    load("/api/analytics/visits?path=/calculator", setMacroCalcVisits, "macroCalc");
    load("/api/mailer/subscribers", setEmailSubscribers, "subscribers");
    load("/api/leads/count", setTotalLeads, "leads");
    const stored = localStorage.getItem("mc_funnel_clients_signed");
    if (stored) setClientsSigned(parseInt(stored));
  }, [load]);

  // ─── Gauge helper ───────────────────────────────────────────────
  const Gauge = ({ value, max = 100, color = Tiffany }: { value: number; max?: number; color?: string }) => {
    const pct = Math.min(value / max, 1);
    const conic = `conic-gradient(${color} ${pct * 360}deg, rgba(255,255,255,0.08) ${pct * 360}deg)`;
    return (
      <div
        style={{
          width: 36, height: 36,
          borderRadius: "50%",
          background: conic,
          border: "2px solid rgba(255,255,255,0.08)",
          flexShrink: 0,
        }}
      />
    );
  };

  // ─── Header ─────────────────────────────────────────────────────
  const Header = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
      <div>
        <h2 style={{ fontFamily: "system-ui", fontSize: 22, fontWeight: 800, color: "white", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Lead Gen Funnel
        </h2>
        <p style={{ fontFamily: "system-ui", fontSize: 14, color: "rgba(255,255,255,0.45)", margin: 0 }}>
          Facebook Ads Performance Overview
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{
          fontFamily: "system-ui", fontSize: 12,
          background: `${Tiffany}20`,
          color: Tiffany,
          padding: "5px 12px",
          borderRadius: 20,
          border: `1px solid ${Tiffany}40`,
        }}>
          Mar 8 – Apr 6
        </span>
        <button style={{
          fontFamily: "system-ui", fontSize: 13, fontWeight: 600,
          background: Tiffany, color: "#000",
          border: "none", borderRadius: 10,
          padding: "8px 18px", cursor: "pointer",
        }}>
          Share
        </button>
      </div>
    </div>
  );

  // ─── Row 1: 3 big KPI cards ───────────────────────────────────────
  const KpiCard = ({ label, value, sub, change, changeType, chart }: {
    label: string; value: string | number; sub: string;
    change: string; changeType: "up" | "down"; chart?: React.ReactNode;
  }) => (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 16,
      padding: "24px",
      minWidth: 200, flex: 1,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <p style={{ fontFamily: "system-ui", fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>{label}</p>
      <p style={{ fontFamily: "system-ui", fontSize: 28, fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontFamily: "system-ui", fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0 }}>{sub}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <span style={{
          fontFamily: "system-ui", fontSize: 12, fontWeight: 600,
          color: changeType === "up" ? "#22c55e" : "#ef4444",
        }}>
          {changeType === "up" ? "▲" : "▼"} {change}
        </span>
      </div>
      {chart && <div style={{ marginTop: 12 }}>{chart}</div>}
    </div>
  );

  // ─── Row 2: 4 smaller KPI tiles ─────────────────────────────────
  const KpiTile = ({ label, value, gauge }: { label: string; value: string | number; gauge: React.ReactNode }) => (
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

  // ─── Row 3: data tables ──────────────────────────────────────────
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

  const TableRow = ({ col1, col2, col3 }: { col1: string; col2: string; col3: string }) => (
    <div style={{
      display: "flex",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      padding: "8px 0",
    }}>
      <span style={{ fontFamily: "system-ui", fontSize: 13, color: "rgba(255,255,255,0.55)", flex: 2 }}>{col1}</span>
      <span style={{ fontFamily: "system-ui", fontSize: 13, color: "white", flex: 1, textAlign: "right" }}>{col2}</span>
      <span style={{ fontFamily: "system-ui", fontSize: 13, color: Tiffany, flex: 1, textAlign: "right" }}>{col3}</span>
    </div>
  );

  const campaigns = [
    ["Awareness Campaign", "$194.00", "965"],
    ["Conversion Campaign", "$155.00", "606"],
    ["Retargeting Campaign", "$7,700.00", "403"],
    ["Brand Awareness", "$572.00", "394"],
  ];

  const adSets = [
    ["Lookalike Targeting", "$678.00", "819"],
    ["Interest Targeting", "$763.00", "613"],
    ["Broad Targeting", "$198.00", "487"],
    ["Retargeting Warm", "$863.00", "225"],
  ];

  const ads = [
    ["Video Ad V1", "$151.00", "769"],
    ["Carousel Ad", "$685.00", "667"],
    ["Static Image Ad", "$702.00", "459"],
    ["Story Ad", "$521.00", "132"],
  ];

  // ─── Main render ─────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 28px 40px", background: "#0D1117", minHeight: "100vh" }}>
      <Header />

      {/* Row 1 — 3 big KPI cards */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard
          label="Spent"
          value={spent}
          sub="Last 30 days"
          change="30%"
          changeType="down"
          chart={<div style={{ height: 48, background: "rgba(255,255,255,0.06)", borderRadius: 6, display: "flex", alignItems: "flex-end", padding: "6px 10px", gap: 4 }}>
            {[40, 55, 45, 70, 60, 80, 65].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 6 ? Tiffany : "rgba(255,255,255,0.15)", borderRadius: 3 }} />
            ))}
          </div>}
        />
        <KpiCard
          label="Clicks"
          value={macroLandingVisits !== null ? macroLandingVisits.toLocaleString() : "—"}
          sub="Last 30 days"
          change="41.6%"
          changeType="up"
          chart={<div style={{ marginTop: 8, fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>trend line</div>}
        />
        <KpiCard
          label="Impressions"
          value={macroLandingVisits !== null ? macroLandingVisits.toLocaleString() : "—"}
          sub="Last 30 days"
          change="7.5%"
          changeType="up"
        />
      </div>

      {/* Row 2 — 4 smaller KPI tiles */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiTile label="CPC" value={cpc} gauge={<Gauge value={60} color={Tiffany} />} />
        <KpiTile label="CPM" value={cpm} gauge={<Gauge value={45} color={Tiffany} />} />
        <KpiTile label="CTR" value={ctr} gauge={<Gauge value={70} color="#3b82f6" />} />
        <KpiTile label="Reach" value={reach.toLocaleString()} gauge={<Gauge value={85} color={Tiffany} />} />
      </div>

      {/* Row 3 — 4 data tables */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        {/* Campaigns */}
        <TableCard title="Campaigns Overview">
          <div style={{ display: "flex", paddingBottom: 6 }}>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 2 }}>Campaign</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "right" }}>Amount</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "right" }}>Numbers</span>
          </div>
          {campaigns.map((r, i) => <TableRow key={i} col1={r[0]} col2={r[1]} col3={r[2]} />)}
        </TableCard>

        {/* Ad Sets */}
        <TableCard title="Ad Sets Overview">
          <div style={{ display: "flex", paddingBottom: 6 }}>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 2 }}>Ad Set</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "right" }}>Amount</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "right" }}>Numbers</span>
          </div>
          {adSets.map((r, i) => <TableRow key={i} col1={r[0]} col2={r[1]} col3={r[2]} />)}
        </TableCard>

        {/* Ads */}
        <TableCard title="Ads Overview">
          <div style={{ display: "flex", paddingBottom: 6 }}>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 2 }}>Ad</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "right" }}>Amount</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, color: "rgba(255,255,255,0.35)", flex: 1, textAlign: "right" }}>Numbers</span>
          </div>
          {ads.map((r, i) => <TableRow key={i} col1={r[0]} col2={r[1]} col3={r[2]} />)}
        </TableCard>

        {/* Summary */}
        <TableCard title="✓ Showing significant progress" accent="#22c55e">
          <p style={{ fontFamily: "system-ui", fontSize: 13, color: "rgba(255,255,255,0.55)", margin: "0 0 12px", lineHeight: 1.6 }}>
            Impressions increased from 7,958 to 8,554 representing a 7.5% boost. Clicks (All) saw a substantial rise from 231 to 328, marking a 41.6% increase.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "system-ui", fontSize: 11, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", padding: "3px 10px", borderRadius: 20 }}>Last 30 days</span>
            <span style={{ fontFamily: "system-ui", fontSize: 11, background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "3px 10px", borderRadius: 20 }}>Sample data</span>
          </div>
        </TableCard>
      </div>

      {/* Footer */}
      <p style={{ fontFamily: "system-ui", fontSize: 12, color: "rgba(255,255,255,0.20)", marginTop: 28, textAlign: "center" }}>
        Powered by Databox · Sample data for demonstration
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
