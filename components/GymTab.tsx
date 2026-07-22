'use client';
import { useState, useEffect } from 'react';

const TIF = '#0ABAB5';
const BG = '#0F0F14';
const CARD = '#18181E';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#FFFFFF';
const TEXT_SEC = 'rgba(255,255,255,0.55)';
const TEXT_TERT = 'rgba(255,255,255,0.30)';
const RED = '#f87171';
const GREEN = '#34d399';

interface Member {
  id: string; firstName: string; lastName: string; dob: string; phone: string;
  email: string; fitnessLevel: string; goals: string; injuries: string;
  healthNotes: string; emergencyContactName: string; emergencyContactPhone: string;
  emergencyRelation: string; waiverSigned: boolean; waiverSignedAt: string | null;
  signedIp: string; createdAt: string; tags: string[];
}

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MemberRow({ m, onDelete }: { m: Member; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${TIF}18`, border: `1px solid ${TIF}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: TIF, flexShrink: 0 }}>
          {(m.firstName[0] + m.lastName[0]).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'system-ui', fontSize: '14px', fontWeight: 700, color: TEXT, margin: 0 }}>{m.firstName} {m.lastName}</p>
          <p style={{ fontFamily: 'system-ui', fontSize: '11px', color: TEXT_SEC, margin: 0 }}>{m.phone}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'system-ui', fontSize: '10px', fontWeight: 700, color: m.waiverSigned ? GREEN : RED, background: m.waiverSigned ? `${GREEN}15` : `${RED}15`, border: `1px solid ${m.waiverSigned ? GREEN : RED}30`, borderRadius: '999px', padding: '2px 8px' }}>
            {m.waiverSigned ? 'Waiver signed' : 'No waiver'}
          </span>
          <span style={{ fontFamily: 'system-ui', fontSize: '12px', color: TEXT_TERT }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${BORDER}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '14px' }}>
            {[
              ['Email', m.email], ['Date of Birth', m.dob ? fmtDate(m.dob) : '—'],
              ['Emergency Contact', m.emergencyContactName], ['Emergency Phone', m.emergencyContactPhone],
              ['Fitness Level', m.fitnessLevel || '—'], ['Goals', m.goals || '—'],
              ['Joined', fmtDate(m.createdAt)], ['Waiver Signed', m.waiverSignedAt ? fmtDate(m.waiverSignedAt) : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ fontFamily: 'system-ui', fontSize: '9px', color: TEXT_TERT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>{label}</p>
                <p style={{ fontFamily: 'system-ui', fontSize: '12px', fontWeight: 600, color: TEXT, margin: 0, wordBreak: 'break-all' as const }}>{value}</p>
              </div>
            ))}
          </div>
          {(m.injuries || m.healthNotes) && (
            <div style={{ marginTop: '12px' }}>
              {m.injuries && <><p style={{ fontFamily: 'system-ui', fontSize: '9px', color: TEXT_TERT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Injuries</p><p style={{ fontFamily: 'system-ui', fontSize: '12px', color: TEXT_SEC, margin: '0 0 6px' }}>{m.injuries}</p></>}
              {m.healthNotes && <><p style={{ fontFamily: 'system-ui', fontSize: '9px', color: TEXT_TERT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Health Notes</p><p style={{ fontFamily: 'system-ui', fontSize: '12px', color: TEXT_SEC, margin: 0 }}>{m.healthNotes}</p></>}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button onClick={() => onDelete(m.id)} style={{ background: `${RED}12`, border: `1px solid ${RED}30`, borderRadius: '8px', padding: '6px 14px', fontFamily: 'system-ui', fontSize: '11px', fontWeight: 600, color: RED, cursor: 'pointer' }}>Delete member</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GymTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSigned, setShowSigned] = useState<'all' | 'signed' | 'unsigned'>('all');

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then(data => { setMembers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function deleteMember(id: string) {
    if (!confirm('Delete this member?')) return;
    fetch(`/api/members/${id}`, { method: 'DELETE' })
      .then(() => setMembers(prev => prev.filter(m => m.id !== id)));
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const match = !q || `${m.firstName} ${m.lastName} ${m.email} ${m.phone}`.toLowerCase().includes(q);
    if (showSigned === 'signed') return match && m.waiverSigned;
    if (showSigned === 'unsigned') return match && !m.waiverSigned;
    return match;
  });

  const signedCount = members.filter(m => m.waiverSigned).length;
  const unsignedCount = members.length - signedCount;

  return (
    <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontFamily: 'system-ui', fontSize: '22px', fontWeight: 800, color: TEXT, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Gym Members</h2>
          <p style={{ fontFamily: 'system-ui', fontSize: '13px', color: TEXT_SEC, margin: 0 }}>{members.length} member{members.length !== 1 ? 's' : ''} registered · {signedCount} waiver{signedCount !== 1 ? 's' : ''} signed</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a href="https://invictus-portal-one.vercel.app" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'system-ui', fontSize: '12px', fontWeight: 700, color: '#000', background: TIF, borderRadius: '10px', padding: '9px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ↗ Open Portal
          </a>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '10px', fontSize: '13px', color: TEXT, outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: '10px', overflow: 'hidden' }}>
          {([['all', `All (${members.length})`], ['signed', `Signed (${signedCount})`], ['unsigned', `Unsigned (${unsignedCount})`]] as [string, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setShowSigned(id as 'all' | 'signed' | 'unsigned')} style={{ padding: '8px 14px', border: 'none', cursor: 'pointer', fontFamily: 'system-ui', fontSize: '12px', fontWeight: 600, background: showSigned === id ? TIF : 'transparent', color: showSigned === id ? '#000' : TEXT_SEC, transition: 'all 0.15s' }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Members', value: members.length, color: TEXT },
          { label: 'Waiver Signed', value: signedCount, color: GREEN },
          { label: 'Pending Waiver', value: unsignedCount, color: RED },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'system-ui', fontSize: '28px', fontWeight: 800, color: s.color, margin: '0 0 2px', letterSpacing: '-0.03em' }}>{s.value}</p>
            <p style={{ fontFamily: 'system-ui', fontSize: '10px', color: TEXT_TERT, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ fontFamily: 'system-ui', fontSize: '14px', color: TEXT_TERT, textAlign: 'center', padding: '40px 0' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', background: CARD, border: `1px solid ${BORDER}`, borderRadius: '14px' }}>
          <p style={{ fontFamily: 'system-ui', fontSize: '15px', fontWeight: 700, color: TEXT_SEC, margin: '0 0 6px' }}>No members found</p>
          <p style={{ fontFamily: 'system-ui', fontSize: '13px', color: TEXT_TERT, margin: 0 }}>Share the portal link to start collecting signups.</p>
        </div>
      ) : (
        filtered.map(m => <MemberRow key={m.id} m={m} onDelete={deleteMember} />)
      )}

      {/* Portal link */}
      <div style={{ marginTop: '20px', background: `${TIF}10`, border: `1px solid ${TIF}25`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: 'system-ui', fontSize: '13px', fontWeight: 700, color: TEXT, margin: '0 0 2px' }}>Member Intake Portal</p>
          <p style={{ fontFamily: 'system-ui', fontSize: '11px', color: TEXT_SEC, margin: 0 }}>Share this link or display on a tablet at the gym entrance.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code style={{ fontFamily: 'monospace', fontSize: '12px', color: TIF, background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '5px 10px' }}>invictus-portal-one.vercel.app</code>
        </div>
      </div>
    </div>
  );
}
