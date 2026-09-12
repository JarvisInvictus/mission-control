"use client";

import { useEffect, useMemo, useState } from "react";

type Attendee = "Milzzy" | "Miggy" | "Sonta";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  meetLink: string | null;
}

interface TeamEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: Attendee[];
  clientIds: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ClientLite {
  id: string;
  name: string;
  status?: string;
}

const ATTENDEES: Attendee[] = ["Milzzy", "Miggy", "Sonta"];
const ATTENDEE_COLORS: Record<Attendee, string> = {
  Milzzy: "#0abab5",
  Miggy: "#3b82f6",
  Sonta: "#a855f7",
};

function formatDate(d: string): string {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatDayHeader(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") >= today;
}

export function EventsTab() {
  const [teamEvents, setTeamEvents] = useState<TeamEvent[]>([]);
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>([]);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    attendees: Attendee[];
    clientIds: string[];
  }>({
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    location: "",
    attendees: ["Milzzy", "Miggy", "Sonta"],
    clientIds: [],
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/team/events").then((r) => r.json()),
      fetch("/api/calendar/events").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([team, cal, cli]) => {
        setTeamEvents(team.items || []);
        if (cal.error === "not_authorized") {
          setGoogleConnected(false);
          setCalEvents([]);
        } else {
          setGoogleConnected(true);
          setCalEvents(cal.events || []);
        }
        // Only keep active clients for selection, with just id+name
        const list: ClientLite[] = Array.isArray(cli)
          ? cli
              .filter((c: { status?: string }) => !c.status || c.status === "active")
              .map((c: { id?: string; name?: string; status?: string }) => ({
                id: String(c.id || ""),
                name: String(c.name || ""),
                status: c.status,
              }))
              .filter((c: ClientLite) => c.id && c.name)
              .sort((a: ClientLite, b: ClientLite) => a.name.localeCompare(b.name))
          : [];
        setClients(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function add() {
    if (!draft.title.trim()) return;
    const res = await fetch("/api/team/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (data.item) {
      setTeamEvents((prev) => [data.item, ...prev]);
      setDraft({
        title: "",
        description: "",
        date: new Date().toISOString().slice(0, 10),
        time: "",
        location: "",
        attendees: ["Milzzy", "Miggy", "Sonta"],
        clientIds: [],
      });
      setClientSearch("");
      setAdding(false);
    }
  }

  async function deleteEvent(id: string) {
    setTeamEvents((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/team/events/${id}`, { method: "DELETE" });
  }

  function toggleDraftAttendee(a: Attendee) {
    setDraft((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(a) ? prev.attendees.filter((x) => x !== a) : [...prev.attendees, a],
    }));
  }

  function toggleDraftClient(id: string) {
    setDraft((prev) => ({
      ...prev,
      clientIds: prev.clientIds.includes(id) ? prev.clientIds.filter((x) => x !== id) : [...prev.clientIds, id],
    }));
  }

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 30);
    const q = clientSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 30);
  }, [clients, clientSearch]);

  const sortedTeam = [...teamEvents].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingTeam = sortedTeam.filter((e) => isUpcoming(e.date));
  const pastTeam = sortedTeam.filter((e) => !isUpcoming(e.date)).reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* ── Team Link-Ups (custom events) ── */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <p style={sectionHeaderStyle}>Team Link-Ups</p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: 0 }}>
              Custom team events with attached clients
            </p>
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            style={{
              fontFamily: "system-ui",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "rgba(255,255,255,0.95)",
              background: "rgba(10,186,181,0.18)",
              border: "1px solid rgba(10,186,181,0.40)",
              borderRadius: "10px",
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            {adding ? "Cancel" : "+ New Event"}
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(10,186,181,0.30)",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                autoFocus
                placeholder="Event title (e.g. Coffee w/ clients)"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                style={{ ...inputStyle, flex: 2, minWidth: "220px" }}
              />
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                style={inputStyle}
              />
              <input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                style={inputStyle}
              />
              <input
                placeholder="Location"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                style={{ ...inputStyle, minWidth: "160px" }}
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "system-ui" }}
            />
            {/* Attendees */}
            <div>
              <p style={subLabel}>Who&apos;s going</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {ATTENDEES.map((a) => {
                  const on = draft.attendees.includes(a);
                  const c = ATTENDEE_COLORS[a];
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleDraftAttendee(a)}
                      style={{
                        fontFamily: "system-ui",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: on ? c : "rgba(255,255,255,0.45)",
                        background: on ? `${c}22` : "rgba(255,255,255,0.04)",
                        border: on ? `1px solid ${c}55` : "1px solid rgba(255,255,255,0.10)",
                        borderRadius: "999px",
                        padding: "4px 12px",
                        cursor: "pointer",
                      }}
                    >
                      {on ? "✓ " : ""}
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Client attach */}
            <div>
              <p style={subLabel}>
                Attach clients{" "}
                <span style={{ color: "rgba(255,255,255,0.30)", fontWeight: 400, textTransform: "none", letterSpacing: "0" }}>
                  ({draft.clientIds.length} selected)
                </span>
              </p>
              <input
                placeholder="Search clients by name…"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: "8px" }}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "6px",
                  maxHeight: "180px",
                  overflowY: "auto",
                  padding: "8px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                }}
              >
                {filteredClients.map((c) => {
                  const selected = draft.clientIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleDraftClient(c.id)}
                      style={{
                        fontFamily: "system-ui",
                        fontSize: "12px",
                        textAlign: "left",
                        color: selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.60)",
                        background: selected ? "rgba(10,186,181,0.15)" : "rgba(255,255,255,0.03)",
                        border: selected ? "1px solid rgba(10,186,181,0.40)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "5px 10px",
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selected ? "✓ " : ""}
                      {c.name}
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <p style={{ gridColumn: "1 / -1", fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.30)", textAlign: "center", margin: "8px 0" }}>
                    No matches
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={add}
              disabled={!draft.title.trim()}
              style={{
                alignSelf: "flex-start",
                fontFamily: "system-ui",
                fontSize: "12px",
                fontWeight: 600,
                color: "rgba(10,14,26,0.95)",
                background: draft.title.trim() ? "#0abab5" : "rgba(10,186,181,0.30)",
                border: "none",
                borderRadius: "10px",
                padding: "8px 18px",
                cursor: draft.title.trim() ? "pointer" : "not-allowed",
              }}
            >
              Save Event
            </button>
          </div>
        )}

        {loading ? (
          <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", textAlign: "center", padding: "32px" }}>Loading…</p>
        ) : upcomingTeam.length === 0 && pastTeam.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px dashed rgba(255,255,255,0.15)",
              borderRadius: "16px",
              padding: "36px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ fontFamily: "system-ui", fontSize: "28px", margin: "0 0 8px" }}>📅</p>
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: 0 }}>
              No team events yet — create one to attach clients to a link-up.
            </p>
          </div>
        ) : (
          <>
            {upcomingTeam.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: upcomingTeam.length > 0 && pastTeam.length > 0 ? "20px" : 0 }}>
                {upcomingTeam.map((e) => (
                  <TeamEventCard key={e.id} ev={e} clients={clients} onDelete={deleteEvent} />
                ))}
              </div>
            )}
            {pastTeam.length > 0 && (
              <details>
                <summary style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.10em", padding: "6px 0" }}>
                  Past events ({pastTeam.length})
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", opacity: 0.7 }}>
                  {pastTeam.slice(0, 10).map((e) => (
                    <TeamEventCard key={e.id} ev={e} clients={clients} onDelete={deleteEvent} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </section>

      {/* ── Google Calendar ── */}
      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <p style={sectionHeaderStyle}>Google Calendar</p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: 0 }}>
              Consults, meetings, anything from your calendar
            </p>
          </div>
          {googleConnected === false && (
            <a
              href="/api/auth/google"
              style={{
                fontFamily: "system-ui",
                fontSize: "11px",
                fontWeight: 600,
                color: "#ffffff",
                background: "rgba(66,133,244,0.80)",
                borderRadius: "8px",
                padding: "6px 14px",
                textDecoration: "none",
              }}
            >
              Connect Google Calendar
            </a>
          )}
        </div>
        {googleConnected === false ? (
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
              Connect your Google Calendar to see consultations here.
            </p>
          </div>
        ) : (
          <CalendarList events={calEvents} />
        )}
      </section>
    </div>
  );
}

function TeamEventCard({
  ev,
  clients,
  onDelete,
}: {
  ev: TeamEvent;
  clients: ClientLite[];
  onDelete: (id: string) => void;
}) {
  const clientNames = clients.filter((c) => ev.clientIds.includes(c.id));
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(10,186,181,0.25)",
        borderRadius: "14px",
        padding: "14px 16px",
        display: "flex",
        gap: "14px",
        alignItems: "flex-start",
      }}
    >
      {/* Date block */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "center",
          background: "rgba(10,186,181,0.12)",
          border: "1px solid rgba(10,186,181,0.30)",
          borderRadius: "12px",
          padding: "8px 12px",
          minWidth: "72px",
        }}
      >
        <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "#0abab5", textTransform: "uppercase", letterSpacing: "0.10em", margin: 0, fontWeight: 600 }}>
          {new Date(ev.date + "T00:00:00").toLocaleDateString("en-AU", { month: "short" })}
        </p>
        <p style={{ fontFamily: "system-ui", fontSize: "24px", fontWeight: 700, color: "rgba(255,255,255,0.95)", margin: "2px 0 0", lineHeight: 1 }}>
          {new Date(ev.date + "T00:00:00").getDate()}
        </p>
        {ev.time && (
          <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.55)", margin: "4px 0 0" }}>
            {ev.time}
          </p>
        )}
      </div>
      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <div>
            <p style={{ fontFamily: "system-ui", fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.95)", margin: 0, lineHeight: 1.3 }}>
              {ev.title}
            </p>
            <p style={{ fontFamily: "system-ui", fontSize: "11px", color: "rgba(255,255,255,0.45)", margin: "2px 0 0" }}>
              {formatDayHeader(ev.date)}
              {ev.location ? ` · ${ev.location}` : ""}
            </p>
          </div>
          <button
            onClick={() => onDelete(ev.id)}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.30)",
              cursor: "pointer",
              fontSize: "16px",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
        {ev.description && (
          <p style={{ fontFamily: "system-ui", fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: "8px 0 0", lineHeight: 1.5 }}>
            {ev.description}
          </p>
        )}
        {/* Attendees + clients */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px" }}>
          {ev.attendees.map((a) => (
            <span
              key={a}
              style={{
                fontFamily: "system-ui",
                fontSize: "10px",
                fontWeight: 600,
                color: ATTENDEE_COLORS[a],
                background: `${ATTENDEE_COLORS[a]}22`,
                border: `1px solid ${ATTENDEE_COLORS[a]}44`,
                borderRadius: "999px",
                padding: "2px 8px",
              }}
            >
              {a}
            </span>
          ))}
          {clientNames.map((c) => (
            <span
              key={c.id}
              style={{
                fontFamily: "system-ui",
                fontSize: "10px",
                color: "rgba(255,255,255,0.75)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "999px",
                padding: "2px 8px",
              }}
            >
              👤 {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarList({ events }: { events: CalendarEvent[] }) {
  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = new Date(ev.start).toLocaleDateString("en-CA", { timeZone: "Australia/Melbourne" });
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(ev);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (events.length === 0) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "14px",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <p style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: 0 }}>
          No calendar events in the next 2 weeks.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {grouped.map(([day, evs]) => (
        <div key={day}>
          <p style={{ fontFamily: "system-ui", fontSize: "10px", color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.10em", margin: "0 0 8px" }}>
            {formatDate(day)}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {evs.map((ev) => {
              const timeStr = new Date(ev.start).toLocaleTimeString("en-AU", { timeZone: "Australia/Melbourne", hour: "2-digit", minute: "2-digit" });
              return (
                <div
                  key={ev.id}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span style={{ fontFamily: "system-ui", fontSize: "12px", fontWeight: 600, color: "#4285f4", minWidth: "60px", fontVariantNumeric: "tabular-nums" }}>
                    {timeStr}
                  </span>
                  <span style={{ fontFamily: "system-ui", fontSize: "13px", color: "rgba(255,255,255,0.90)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.title}
                  </span>
                  {ev.meetLink && (
                    <a href={ev.meetLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "system-ui", fontSize: "11px", fontWeight: 600, color: "#4285f4", textDecoration: "none" }}>
                      Join ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const sectionHeaderStyle: React.CSSProperties = {
  fontFamily: "system-ui",
  fontSize: "11px",
  color: "rgba(255,255,255,0.40)",
  textTransform: "uppercase",
  letterSpacing: "0.10em",
  margin: "0 0 4px",
  fontWeight: 600,
};

const subLabel: React.CSSProperties = {
  fontFamily: "system-ui",
  fontSize: "10px",
  color: "rgba(255,255,255,0.50)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 6px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  color: "white",
  padding: "8px 12px",
  fontSize: "13px",
  fontFamily: "system-ui",
  outline: "none",
  flex: 1,
  minWidth: "120px",
  boxSizing: "border-box",
};
