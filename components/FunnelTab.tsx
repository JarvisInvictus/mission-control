// Funnel Tab — live data from Vercel Analytics, MailerLite, and Redis
"use client";
import { useState, useEffect, useCallback } from "react";

const Tiffany = "#0ABAB5";

interface MetricTileProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  accentColor?: string;
  error?: string;
  onEdit?: () => void;
}

function MetricTile({ label, value, sub, icon, accentColor = Tiffany, error, onEdit }: MetricTileProps) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: "20px",
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      minWidth: "180px",
      flex: "1 1 180px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "24px" }}>{icon}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.30)",
              fontSize: "12px",
              padding: "0",
              flexShrink: 0,
            }}
          >
            edit
          </button>
        )}
      </div>
      <div>
        {error ? (
          <p style={{ fontSize: "12px", color: "#ef4444", margin: "4px 0 0", fontFamily: "system-ui" }}>{error}</p>
        ) : (
          <p style={{ fontSize: "28px", fontWeight: 800, color: accentColor, letterSpacing: "-0.02em", fontFamily: "system-ui", margin: 0, lineHeight: 1.1 }}>{value}</p>
        )}
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontFamily: "system-ui", margin: "4px 0 0" }}>{label}</p>
        {sub && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", fontFamily: "system-ui", margin: "2px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

function ClientsEditModal({ current, onSave, onClose }: { current: number; onSave: (v: number) => void; onClose: () => void }) {
  const [val, setVal] = useState(String(current));
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(8px)",
    }} onClick={onClose}>
      <div style={{
        background: "#111827",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "20px",
        padding: "32px",
        width: "320px",
      }} onClick={e => e.stopPropagation()}>
        <p style={{ fontFamily: "system-ui", fontSize: "16px", fontWeight: 700, color: "white", marginBottom: "20px" }}>Update Clients Signed</p>
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
          <button onClick={onClose} style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "rgba(255,255,255,0.60)", cursor: "pointer", fontFamily: "system-ui", fontSize: "14px" }}>Cancel</button>
          <button onClick={() => { const v = parseInt(val); if (!isNaN(v) && v >= 0) onSave(v); }} style={{ flex: 1, padding: "10px", background: Tiffany, border: "none", borderRadius: "10px", color: "#000", cursor: "pointer", fontWeight: 700, fontFamily: "system-ui", fontSize: "14px" }}>Save</button>
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
    load("/api/analytics/visits?path=/", setMacroLandingVisits, "macroLanding");
    load("/api/analytics/visits?path=/calculator", setMacroCalcVisits, "macroCalc");
    load("/api/mailer/subscribers", setEmailSubscribers, "subscribers");
    load("/api/leads/count", setTotalLeads, "leads");
    // Load clients signed from localStorage
    const stored = localStorage.getItem("mc_funnel_clients_signed");
    if (stored) setClientsSigned(parseInt(stored));
  }, [load]);

  const convRate = (val: number, total: number) =>
    total > 0 ? `${((val / total) * 100).toFixed(1)}%` : "—";

  return (
    <div style={{ padding: "32px 28px 40px" }}>
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "6px" }}>Live Funnel Metrics</p>
        <h2 style={{ fontFamily: "system-ui", fontSize: "22px", fontWeight: 800, color: "white", margin: 0, letterSpacing: "-0.02em" }}>Lead Gen Funnel</h2>
      </div>

      {/* Funnel Stage 1 */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "14px" }}>Awareness</p>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <MetricTile
            label="Macro Landing Page Visits"
            value={macroLandingVisits !== null ? macroLandingVisits.toLocaleString() : "—"}
            icon="🌐"
            error={errors.macroLanding}
          />
        </div>
      </div>

      {/* Funnel Stage 2 */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "14px" }}>Calculator</p>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <MetricTile
            label="Calculator Page Visits"
            value={macroCalcVisits !== null ? macroCalcVisits.toLocaleString() : "—"}
            icon="🧮"
            error={errors.macroCalc}
          />
          <MetricTile
            label="Calc Conv. Rate"
            value={macroCalcVisits !== null && macroLandingVisits !== null ? convRate(macroCalcVisits, macroLandingVisits) : "—"}
            icon="📊"
            accentColor="rgba(255,255,255,0.5)"
          />
        </div>
      </div>

      {/* Funnel Stage 3 */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "14px" }}>Email Capture</p>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <MetricTile
            label="MailerLite Subscribers"
            value={emailSubscribers !== null ? emailSubscribers.toLocaleString() : "—"}
            icon="📬"
            error={errors.subscribers}
          />
          <MetricTile
            label="Email Capture Rate"
            value={emailSubscribers !== null && macroCalcVisits !== null ? convRate(emailSubscribers, macroCalcVisits) : "—"}
            icon="📈"
            accentColor="rgba(255,255,255,0.5)"
          />
        </div>
      </div>

      {/* Funnel Stage 4 */}
      <div style={{ marginBottom: "40px" }}>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "14px" }}>Leads</p>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <MetricTile
            label="Total Leads"
            value={totalLeads !== null ? totalLeads.toLocaleString() : "—"}
            icon="📥"
            error={errors.leads}
          />
          <MetricTile
            label="Leads from Calculator"
            value={totalLeads !== null ? `${totalLeads.toLocaleString()} (est.)` : "—"}
            icon="🎯"
            accentColor="rgba(255,255,255,0.5)"
          />
          <MetricTile
            label="Lead Conv. Rate"
            value={totalLeads !== null && emailSubscribers !== null ? convRate(totalLeads, emailSubscribers) : "—"}
            icon="📉"
            accentColor="rgba(255,255,255,0.5)"
          />
        </div>
      </div>

      {/* Conversion */}
      <div>
        <p style={{ fontFamily: "system-ui", fontSize: "11px", color: Tiffany, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, marginBottom: "14px" }}>Conversion</p>
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <MetricTile
            label="Clients Signed"
            value={clientsSigned}
            icon="🤝"
            onEdit={() => setShowEditClients(true)}
          />
          <MetricTile
            label="Overall Conversion"
            value={clientsSigned > 0 && macroLandingVisits !== null ? convRate(clientsSigned, macroLandingVisits) : "—"}
            icon="📊"
            accentColor="#22c55e"
          />
        </div>
      </div>

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
