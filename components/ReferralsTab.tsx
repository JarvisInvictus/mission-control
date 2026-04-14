"use client";
import { useState, useEffect } from "react";

const Tiffany = "#0ABAB5";
const Green = "#22C55E";

interface ReferralLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  createdAt: string;
  stage: string;
}

export function ReferralsTab() {
  const [referrals, setReferrals] = useState<ReferralLead[]>([]);
  const [owners, setOwners] = useState<Record<string, { name: string; email: string } | null>>({});
  const [paidCodes, setPaidCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifyId, setNotifyId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, paidRes] = await Promise.all([
          fetch("/api/leads"),
          fetch("/api/referrals/paid"),
        ]);
        const leadsData = await leadsRes.json();
        const paidData = await paidRes.json();
        const allLeads: ReferralLead[] = Array.isArray(leadsData) ? leadsData : leadsData.leads || [];
        const referredLeads = allLeads.filter((l: any) => (l as any).referralCode);
        setReferrals(referredLeads);
        setPaidCodes(new Set(paidData.paid || []));

        const uniqueCodes = [...new Set(referredLeads.map((l: any) => (l as any).referralCode).filter(Boolean))];
        if (uniqueCodes.length > 0) {
          try {
            const ownerRes = await fetch(`/api/referrals?codes=${uniqueCodes.join(",")}`);
            const ownerData = await ownerRes.json();
            setOwners(ownerData.owners || {});
          } catch {}
        }
      } catch {
        setError("Failed to load referral data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function markRewardPaid(referral: ReferralLead) {
    const owner = owners[referral.referralCode];
    if (!owner) return;
    setNotifyId(referral.id);
    setTimeout(() => setNotifyId(null), 3000);
    setPaidCodes(prev => new Set([...prev, referral.referralCode]));
    // Persist to Redis
    try {
      await fetch("/api/referrals/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referral.referralCode }),
      });
    } catch {}
  }

  const totalReferrals = referrals.length;
  const converted = referrals.filter(r => r.stage === "signed" || r.stage === "paying" || r.stage === "active").length;
  const paidCount = paidCodes.size;
  const pendingPayout = converted - paidCount;

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading...</div>;
  if (error) return <div style={{ padding: "40px", textAlign: "center", color: "#f87171" }}>{error}</div>;

  return (
    <div style={{ padding: "32px 28px" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "white", marginBottom: "4px" }}>Referral Tracking</h2>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>$100 reward per successful referral — tracked per client.</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "28px" }}>
        {[
          { label: "Total Referred Leads", value: totalReferrals },
          { label: "Converted to Client", value: converted },
          { label: "Pending Payout", value: pendingPayout },
          { label: "Rewards Paid", value: paidCount },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "18px" }}>
            <p style={{ fontSize: "26px", fontWeight: 800, color: value > 0 ? Tiffany : "rgba(255,255,255,0.3)", marginBottom: "4px" }}>{value}</p>
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ background: "rgba(10,186,181,0.08)", border: "1px solid rgba(10,186,181,0.20)", borderRadius: "12px", padding: "14px 18px", marginBottom: "24px", fontSize: "13px", color: Tiffany }}>
        $100 per referral paid to the client who referred them. Mark as paid once the reward has been credited.
      </div>

      {/* Table */}
      {referrals.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.25)" }}>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>No referrals yet</p>
          <p style={{ fontSize: "13px" }}>Share referral links with your clients to start tracking.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Referred By", "Lead", "Stage", "Referral Code", "Reward"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {referrals.map((lead) => {
                const owner = owners[lead.referralCode];
                const isPaid = paidCodes.has(lead.referralCode);
                const isConverted = lead.stage === "signed" || lead.stage === "paying" || lead.stage === "active";
                return (
                  <tr key={lead.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "12px" }}>
                      {owner ? (
                        <div>
                          <p style={{ fontSize: "14px", fontWeight: 600, color: Tiffany }}>{owner.name}</p>
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>{owner.email}</p>
                        </div>
                      ) : (
                        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Unknown</span>
                      )}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{lead.name || "—"}</p>
                      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{lead.email || "—"}</p>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        background: isConverted ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                        color: isConverted ? Green : "rgba(255,255,255,0.4)",
                        borderRadius: "20px",
                        padding: "3px 10px",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}>
                        {lead.stage === "signed" || lead.stage === "paying" || lead.stage === "active" ? "Converted" : "Enquiry"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>
                      {lead.referralCode}
                    </td>
                    <td style={{ padding: "12px" }}>
                      {isConverted ? (
                        isPaid ? (
                          <span style={{ fontSize: "12px", fontWeight: 700, color: Green }}>✓ Paid</span>
                        ) : (
                          <button
                            onClick={() => markRewardPaid(lead)}
                            style={{
                              background: notifyId === lead.id ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)",
                              color: notifyId === lead.id ? "#86efac" : Green,
                              border: `1px solid ${Green}`,
                              borderRadius: "20px",
                              padding: "4px 12px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            {notifyId === lead.id ? "✓ Notified!" : "Mark $100 Paid"}
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.2)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
