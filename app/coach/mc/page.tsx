"use client";

import { useState, useEffect } from "react";
import { MissionControl } from "../../page";

// Same PIN as the rest of the coach surface.
const COACH_PIN = "1998";
const STORAGE_KEY = "mc_coach_authed";

export default function CoachMcPage() {
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
          <button type="submit" disabled={pin.length !== 4} style={{ marginTop: 20, width: "100%", padding: "14px 20px", background: pin.length === 4 ? "rgba(129,205,249,0.18)" : "rgba(255,255,255,0.04)", border: `1px solid ${pin.length === 4 ? "rgba(129,205,249,0.45)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, color: pin.length === 4 ? "#81cdf9" : "rgba(255,255,255,0.30)", fontSize: 14, fontWeight: 600, cursor: pin.length === 4 ? "pointer" : "not-allowed", fontFamily: "system-ui", transition: "all 0.15s" }}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <SignOutButton onSignOut={handleSignOut} />
      <MissionControl mode="coach" coachId="Miggy" />
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
