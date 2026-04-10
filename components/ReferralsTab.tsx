"use client";
import { useState, useEffect } from "react";

const Tiffany = "#0ABAB5";

interface ReferralLead {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  createdAt: string;
}

interface ReferralStat {
  code: string;
  ownerName: string | null;
  ownerEmail: string | null;
  conversions: number;
  referredLeads: ReferralLead[];
}

export function ReferralsTab() {
  const [stats, setStats] = useState<ReferralStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch leads
        const leadsRes = await fetch("/api/leads");
        const leadsData = await leadsRes.json();
        const allLeads: ReferralLead[] = Array.isArray(leadsData) ? leadsData : leadsData.leads || [];

        // Extract unique referral codes
        const codeMap: Record<string, ReferralLead[]> = {};
        for (const lead of allLeads) {
          const code = (lead as any).referralCode;
          if (code) {
            if (!codeMap[code]) codeMap[code] = [];
            codeMap[code].push(lead);
          }
        }

        const uniqueCodes = Object.keys(codeMap);

        // Fetch owner names for each code
        let owners: Record<string, { name: string; email: string } | null> = {};
        if (uniqueCodes.length > 0) {
          try {
            const ownerRes = await fetch(`/api/referrals?codes=${uniqueCodes.join(",")}`);
            const ownerData = await ownerRes.json();
            owners = ownerData.owners || {};
          } catch {}
        }

        const referralStats: ReferralStat[] = Object.entries(codeMap).map(([code, leads]) => ({
          code,
          ownerName: owners[code]?.name || null,
          ownerEmail: owners[code]?.email || null,
          conversions: leads.length,
          referredLeads: leads,
        }));

        setStats(referralStats.sort((a, b) => b.conversions - a.conversions));
      } catch {
        setError("Failed to load referral data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalReferred = stats.reduce((sum, s) => sum + s.conversions, 0);
  const totalCodes = stats.length;

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
        Loading referral data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#f87171" }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 28px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "white", marginBottom: "4px" }}>
          Referral Tracking
        </h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
          Tracks which clients have referred new leads via their referral codes.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Active Referral Codes", value: totalCodes },
          { label: "Total Referred Leads", value: totalReferred },
          { label: "Avg Referrals / Client", value: totalCodes ? (totalReferred / totalCodes).toFixed(1) : "0" },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "16px",
            padding: "20px",
          }}>
            <p style={{ fontSize: "28px", fontWeight: 800, color: Tiffany, marginBottom: "4px" }}>{value}</p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div style={{
        background: "rgba(10,186,181,0.08)",
        border: "1px solid rgba(10,186,181,0.20)",
        borderRadius: "12px",
        padding: "14px 18px",
        marginBottom: "28px",
        fontSize: "13px",
        color: Tiffany,
      }}>
        Referral codes are captured when a lead submits the enquiry form with a referral link. Client names appear once a referred lead enquiry arrives.
      </div>

      {/* Table */}
      {stats.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)" }}>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No referrals yet</p>
          <p style={{ fontSize: "13px" }}>Share referral links with your clients to start tracking.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Client", "Referral Code", "Referred Leads"].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.40)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.code} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "14px", fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                    {s.ownerName
                      ? <span style={{ color: Tiffany }}>{s.ownerName}</span>
                      : <span style={{ color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Unknown</span>
                    }
                    {s.ownerEmail && (
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{s.ownerEmail}</p>
                    )}
                  </td>
                  <td style={{ padding: "14px", fontFamily: "monospace", fontSize: "13px", color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.05em" }}>
                    {s.code}
                  </td>
                  <td style={{ padding: "14px" }}>
                    <span style={{
                      background: s.conversions > 0 ? "rgba(10,186,181,0.15)" : "rgba(255,255,255,0.06)",
                      color: s.conversions > 0 ? Tiffany : "rgba(255,255,255,0.4)",
                      borderRadius: "20px",
                      padding: "3px 10px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}>
                      {s.conversions} {s.conversions === 1 ? "lead" : "leads"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Referral link info */}
      <div style={{ marginTop: "28px", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "6px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Client Referral Link</p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>
          Share this with your clients:{" "}
          <code style={{ color: Tiffany, background: "rgba(10,186,181,0.10)", padding: "2px 6px", borderRadius: "4px" }}>
            invictus-links.vercel.app/referral
          </code>
        </p>
      </div>
    </div>
  );
}
