"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DirectDebit {
  name: string;
  amount: number;
  frequency: "Weekly" | "Fortnightly" | "Monthly";
  nextDue: string;
  nextDueDate: Date;
}

interface Subscription {
  service: string;
  category: string;
  cost: number;
  status: "KEEP" | "REVIEW" | "CANCELLED";
  action?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
}

function toDate(dateStr: string): Date {
  // handle "~25 Mar 2026" or "20 Apr 2026"
  const cleaned = dateStr.replace("~", "").trim();
  return new Date(cleaned + " 2026");
}

function isWithin7Days(date: Date): boolean {
  const now = new Date("2026-03-22"); // reference date
  const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 7;
}

function isOverdue(date: Date): boolean {
  const now = new Date("2026-03-22");
  return date < now;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const personalDD: DirectDebit[] = [
  { name: "Medibank Life Insurance", amount: 34.53, frequency: "Monthly", nextDue: "20 Apr 2026", nextDueDate: toDate("20 Apr 2026") },
  { name: "Medibank Private Health", amount: 17.99, frequency: "Monthly", nextDue: "27 Apr 2026", nextDueDate: toDate("27 Apr 2026") },
  { name: "Pet Insurance (x2)", amount: 22.02 + 25.94, frequency: "Fortnightly", nextDue: "~25 Mar 2026", nextDueDate: toDate("25 Mar 2026") },
  { name: "RACV Roadside Assist", amount: 25.50, frequency: "Monthly", nextDue: "13 Apr 2026", nextDueDate: toDate("13 Apr 2026") },
  { name: "Loan Repayment", amount: 81.00, frequency: "Weekly", nextDue: "26 Mar 2026", nextDueDate: toDate("26 Mar 2026") },
];

const businessDD: DirectDebit[] = [
  { name: "Aussie Broadband (Home)", amount: 161.00, frequency: "Monthly", nextDue: "9 Apr 2026", nextDueDate: toDate("9 Apr 2026") },
  { name: "Aussie Broadband (Factory)", amount: 130.00, frequency: "Monthly", nextDue: "10 Apr 2026", nextDueDate: toDate("10 Apr 2026") },
  { name: "Victory Premium Insurance", amount: 201.37, frequency: "Monthly", nextDue: "2 Apr 2026", nextDueDate: toDate("2 Apr 2026") },
  { name: "Ignition/Squeeze CRM", amount: 295.88, frequency: "Monthly", nextDue: "3 Apr 2026", nextDueDate: toDate("3 Apr 2026") },
  { name: "Medibank (Staff)", amount: 89.46, frequency: "Monthly", nextDue: "16 Apr 2026", nextDueDate: toDate("16 Apr 2026") },
  { name: "CBA Loan Repayment", amount: 567.64, frequency: "Monthly", nextDue: "1 Apr 2026", nextDueDate: toDate("1 Apr 2026") },
];

const subscriptions: Subscription[] = [
  { service: "Kahunas.io", category: "Coaching Platform", cost: 143.70, status: "KEEP" },
  { service: "Google Workspace", category: "Business Tools", cost: 39.08, status: "KEEP" },
  { service: "Zapier", category: "Automation", cost: 348.40, status: "KEEP" },
  { service: "Fillout.com", category: "Forms", cost: 27.55, status: "KEEP" },
  { service: "Squarespace", category: "Website", cost: 44.00, status: "REVIEW", action: true },
  { service: "Komi App", category: "Link-in-bio", cost: 25.00, status: "REVIEW", action: true },
  { service: "Adobe", category: "Creative", cost: 30.99, status: "KEEP" },
  { service: "Canva", category: "Design", cost: 20.00, status: "KEEP" },
  { service: "Loom", category: "Video/Onboarding", cost: 39.98, status: "KEEP" },
  { service: "Zoom", category: "Calls", cost: 26.35, status: "KEEP" },
  { service: "Cronometer Pro", category: "Client Nutrition", cost: 129.65, status: "REVIEW", action: true },
  { service: "Physique Collective", category: "Industry", cost: 19.66, status: "KEEP" },
  { service: "Spotify", category: "Music", cost: 22.99, status: "KEEP" },
  { service: "YouTube Premium", category: "Research", cost: 16.99, status: "KEEP" },
  { service: "Amazon Prime", category: "Shipping", cost: 9.99, status: "KEEP" },
  { service: "Anthropic API", category: "AI (Jarvis)", cost: 125.00, status: "KEEP" },
  { service: "Optus", category: "Mobile", cost: 228.61, status: "REVIEW", action: true },
  { service: "Forward Moves", category: "Unknown", cost: 70.00, status: "REVIEW", action: true },
  { service: "Higgsfield", category: "AI Video", cost: 73.00, status: "CANCELLED" },
  { service: "Manus AI", category: "AI Tool", cost: 65.00, status: "CANCELLED" },
  { service: "Claude.ai Sub", category: "AI (duplicate)", cost: 30.91, status: "CANCELLED" },
  { service: "Opus Clip", category: "Video Clipping", cost: 13.00, status: "CANCELLED" },
  { service: "Kayo/Hubbl", category: "Streaming", cost: 60.00, status: "CANCELLED" },
  { service: "Stan", category: "Streaming", cost: 37.00, status: "CANCELLED" },
  { service: "Twitch", category: "Streaming", cost: 15.99, status: "CANCELLED" },
  { service: "Amazon Music", category: "Streaming", cost: 6.99, status: "CANCELLED" },
];

// ─── Computed ─────────────────────────────────────────────────────────────────

const personalTotal = personalDD.reduce((sum, d) => {
  if (d.frequency === "Weekly") return sum + d.amount * 52 / 12;
  if (d.frequency === "Fortnightly") return sum + d.amount * 26 / 12;
  return sum + d.amount;
}, 0);

const businessTotal = businessDD.reduce((sum, d) => sum + d.amount, 0);

const activeSubTotal = subscriptions.filter((s) => s.status !== "CANCELLED").reduce((sum, s) => sum + s.cost, 0);
const cancelledSubTotal = subscriptions.filter((s) => s.status === "CANCELLED").reduce((sum, s) => sum + s.cost, 0);
const reviewItems = subscriptions.filter((s) => s.status === "REVIEW");

// ─── Components ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: "KEEP" | "REVIEW" | "CANCELLED" }) {
  if (status === "KEEP") {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "999px",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "rgba(52, 211, 153, 0.15)",
          color: "#34d399",
          border: "1px solid rgba(52, 211, 153, 0.3)",
        }}
      >
        KEEP
      </span>
    );
  }
  if (status === "REVIEW") {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "999px",
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.05em",
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "rgba(251, 191, 36, 0.15)",
          color: "#fbbf24",
          border: "1px solid rgba(251, 191, 36, 0.3)",
        }}
      >
        REVIEW
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.30)",
        border: "1px solid rgba(255,255,255,0.12)",
        textDecoration: "line-through",
      }}
    >
      CANCELLED
    </span>
  );
}

function DueDate({ date, label }: { date: Date; label: string }) {
  const overdue = isOverdue(date);
  const soon = isWithin7Days(date);

  let color = "rgba(255,255,255,0.60)";
  if (overdue) color = "var(--status-red)";
  else if (soon) color = "var(--status-yellow)";

  return (
    <span style={{ fontFamily: "system-ui, -apple-system, sans-serif", color, fontSize: "12px" }}>
      {label}
    </span>
  );
}

function DirectDebitTable({ items, total }: { items: DirectDebit[]; total: number }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {["Name", "Amount", "Frequency", "Next Due"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "rgba(255,255,255,0.30)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={i}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.03)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
            >
              <td
                style={{
                  padding: "9px 10px",
                  fontSize: "12px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "rgba(255,255,255,0.80)",
                }}
              >
                {item.name}
              </td>
              <td
                style={{
                  padding: "9px 10px",
                  fontSize: "12px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "rgba(255,255,255,0.60)",
                }}
              >
                {fmt(item.amount)}
              </td>
              <td
                style={{
                  padding: "9px 10px",
                  fontSize: "12px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "rgba(255,255,255,0.50)",
                }}
              >
                {item.frequency}
              </td>
              <td style={{ padding: "9px 10px" }}>
                <DueDate date={item.nextDueDate} label={item.nextDue} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={4}
              style={{
                padding: "10px 10px 0",
                fontSize: "11px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontWeight: 700,
                color: "rgba(255,255,255,0.60)",
                letterSpacing: "0.05em",
              }}
            >
              TOTAL&nbsp;&nbsp;{fmt(total)}/mo
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinanceTab() {
  const [reviewOpen, setReviewOpen] = useState<string | null>(null);

  return (
    <div>
      {/* Section A: Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { value: "$22,548", label: "Avg Monthly Revenue", color: "var(--status-green)" },
          { value: "$19,840", label: "Total Monthly Outgoings", color: "var(--status-red)" },
          { value: "$337", label: "Saved This Month (Cancelled)", color: "var(--status-green)" },
          { value: "$2,000", label: "Weekly Savings Goal", color: "var(--accent)" },
        ].map(({ value, label, color }) => (
          <div key={label} className="liquid-glass p-4">
            <p
              style={{
                fontSize: "28px",
                fontWeight: 700,
                fontFamily: "system-ui, -apple-system, sans-serif",
                color,
                lineHeight: 1,
                marginBottom: "6px",
              }}
            >
              {value}
            </p>
            <p
              style={{
                fontSize: "10px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "rgba(255,255,255,0.40)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Section B: Direct Debits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Personal */}
        <div className="liquid-glass p-5">
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "rgba(255,255,255,0.50)",
              marginBottom: "14px",
            }}
          >
            Personal Direct Debits
          </h3>
          <DirectDebitTable items={personalDD} total={personalTotal} />
        </div>

        {/* Business */}
        <div className="liquid-glass p-5">
          <h3
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "rgba(255,255,255,0.50)",
              marginBottom: "14px",
            }}
          >
            Business Direct Debits
          </h3>
          <DirectDebitTable items={businessDD} total={businessTotal} />
        </div>
      </div>

      {/* Section C: Business Subscriptions */}
      <div className="liquid-glass p-5 mb-6">
        <h3
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "rgba(255,255,255,0.50)",
            marginBottom: "14px",
          }}
        >
          Business Subscriptions
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Service", "Category", "Monthly Cost", "Status", "Action"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      color: "rgba(255,255,255,0.30)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                >
                  <td
                    style={{
                      padding: "9px 10px",
                      fontSize: "12px",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      color: sub.status === "CANCELLED" ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.85)",
                      textDecoration: sub.status === "CANCELLED" ? "line-through" : "none",
                    }}
                  >
                    {sub.service}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      fontSize: "11px",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      color: "rgba(255,255,255,0.40)",
                    }}
                  >
                    {sub.category}
                  </td>
                  <td
                    style={{
                      padding: "9px 10px",
                      fontSize: "12px",
                      fontFamily: "system-ui, -apple-system, sans-serif",
                      color: sub.status === "CANCELLED" ? "rgba(255,255,255,0.30)" : "rgba(255,255,255,0.70)",
                    }}
                  >
                    {fmt(sub.cost)}
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    <StatusPill status={sub.status} />
                  </td>
                  <td style={{ padding: "9px 10px" }}>
                    {sub.action ? (
                      <button
                        onClick={() => setReviewOpen(reviewOpen === sub.service ? null : sub.service)}
                        style={{
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: 600,
                          fontFamily: "system-ui, -apple-system, sans-serif",
                          background: "rgba(59, 130, 246, 0.20)",
                          border: "1px solid rgba(59, 130, 246, 0.35)",
                          color: "#3b82f6",
                          cursor: "pointer",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Review
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary line */}
        <p
          style={{
            marginTop: "14px",
            paddingTop: "12px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            fontSize: "11px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Active subscriptions total:{" "}
          <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{fmt(activeSubTotal)}/mo</span>
          {" "}&nbsp;|&nbsp;{" "}
          Cancelled:{" "}
          <span style={{ color: "var(--status-green)", fontWeight: 600 }}>{fmt(cancelledSubTotal)}/mo saved</span>
        </p>
      </div>

      {/* Section D: Savings Tracker */}
      <div className="liquid-glass p-5">
        <h3
          style={{
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "rgba(255,255,255,0.50)",
            marginBottom: "16px",
          }}
        >
          Savings Snapshot
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "Business Revenue (avg)", value: "+$22,548/mo", color: "var(--status-green)", bold: false },
            { label: "Personal spending (avg)", value: "−$10,249/mo", color: "rgba(255,255,255,0.60)", bold: false },
            { label: "Business expenses (avg)", value: "−$9,595/mo", color: "rgba(255,255,255,0.60)", bold: false },
            { label: "Tax set aside", value: "−$4,000/mo", color: "rgba(255,255,255,0.60)", bold: false },
          ].map(({ label, value, color, bold }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "rgba(255,255,255,0.50)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color,
                  fontWeight: bold ? 700 : 400,
                }}
              >
                {value}
              </span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.12)", margin: "4px 0" }} />

          {/* Surplus */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "6px 0",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "rgba(255,255,255,0.60)",
                fontWeight: 600,
              }}
            >
              Estimated surplus
            </span>
            <span
              style={{
                fontSize: "14px",
                fontFamily: "system-ui, -apple-system, sans-serif",
                color: "var(--status-red)",
                fontWeight: 700,
              }}
            >
              ~$−1,296/mo
            </span>
          </div>

          {[
            { label: "Target", value: "$2,000/week = $8,666/mo", color: "var(--accent)", bold: false },
            { label: "Gap to close", value: "$9,962/mo", color: "rgba(255,255,255,0.60)", bold: false },
          ].map(({ label, value, color, bold }) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 0",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color: "rgba(255,255,255,0.50)",
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  color,
                  fontWeight: bold ? 700 : 400,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Note */}
        <p
          style={{
            marginTop: "16px",
            padding: "10px 12px",
            borderRadius: "8px",
            fontSize: "11px",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "rgba(255,255,255,0.45)",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            lineHeight: 1.6,
          }}
        >
          Primary lever: reduce personal food spend ($2,936/mo) and discretionary shopping. Subscription cuts save{" "}
          $337/mo. Real savings come from food habits.
        </p>
      </div>
    </div>
  );
}
