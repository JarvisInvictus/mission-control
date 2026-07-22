'use client'
import React, { useState, useEffect, useRef } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────
const FOCUS_COLOR = '#0abab5'
const BREAK_COLOR = '#9b7fe6'
const GLASS_BG = 'rgba(15,15,18,0.92)'
const GLASS_BORDER = 'rgba(255,255,255,0.12)'
const DEFAULT_FOCUS = 25
const DEFAULT_BREAK = 5
const DEFAULT_ROTATIONS = 4
const SESSION_KEY = 'mc_pomodoro_session'
const HISTORY_KEY = 'mc_pomodoro_history'

// ─── Types ───────────────────────────────────────────────────────────────────
interface CheckInEntry { ts: number; interval: number | null }
interface RoundResult { checkIns: number; avgInterval: number | null; duration: number }
interface SessionResult {
  rounds: RoundResult[]
  totalTime: number
  totalCheckIns: number
  focusDuration: number
  breakDuration: number
  date?: string
  coach?: string
}

// ─── Audio ──────────────────────────────────────────────────────────────────
function beep(freq = 440, duration = 0.3) {
  try {
    const win = window as unknown as { webkitAudioContext?: typeof AudioContext }
    const AudioCtx = window.AudioContext || win.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.4, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch (_) {}
}

function tripleBeep() {
  beep(523, 0.15)
  setTimeout(() => beep(659, 0.15), 180)
  setTimeout(() => beep(784, 0.25), 360)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function calcCircumference(r: number) {
  return 2 * Math.PI * r
}

// ─── Session Summary Modal ───────────────────────────────────────────────────
function SessionSummary({ session, onClose }: { session: SessionResult; onClose: () => void }) {
  const { rounds, totalTime, totalCheckIns, focusDuration, breakDuration } = session
  const totalRounds = rounds.length
  const avgPerRound = totalCheckIns / totalRounds

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(0,0,0,0.75)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div style={{
        background: '#111114', border: `1px solid ${GLASS_BORDER}`,
        borderRadius: '20px', padding: '28px 24px', maxWidth: '400px', width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
      }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontFamily: 'system-ui', fontSize: '11px', color: FOCUS_COLOR, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 4px' }}>Session Complete</p>
        <h2 style={{ fontFamily: 'system-ui', fontSize: '20px', fontWeight: 800, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.02em' }}>
          {totalCheckIns} check-ins · {fmt(totalTime)} total
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
          {[
            { label: 'Focus', value: `${focusDuration}m` },
            { label: 'Break', value: `${breakDuration}m` },
            { label: 'Rounds', value: totalRounds },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${GLASS_BORDER}`, borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'system-ui', fontSize: '18px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{s.value}</p>
              <p style={{ fontFamily: 'system-ui', fontSize: '9px', color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>

        <p style={{ fontFamily: 'system-ui', fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.10em', margin: '0 0 8px' }}>Round Breakdown</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' }}>
          {rounds.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
              <span style={{ fontFamily: 'system-ui', fontSize: '10px', fontWeight: 700, color: i % 2 === 0 ? FOCUS_COLOR : BREAK_COLOR, minWidth: '46px' }}>
                {i % 2 === 0 ? 'Focus' : 'Break'} {Math.floor(i / 2) + 1}
              </span>
              <span style={{ fontFamily: 'system-ui', fontSize: '11px', color: '#fff', flex: 1 }}>{r.checkIns} check-ins</span>
              <span style={{ fontFamily: 'system-ui', fontSize: '10px', color: 'rgba(255,255,255,0.40)' }}>
                avg {r.avgInterval != null ? `${r.avgInterval}m` : '—'}
              </span>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${GLASS_BORDER}`, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'system-ui', fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0' }}>
            {avgPerRound.toFixed(1)} <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.40)', fontWeight: 400 }}>check-ins / round</span>
          </p>
        </div>

        <button onClick={onClose} style={{
          width: '100%', background: FOCUS_COLOR, border: 'none', borderRadius: '10px',
          padding: '12px', fontSize: '13px', fontWeight: 700, color: '#000',
          cursor: 'pointer', fontFamily: 'system-ui',
        }}>Done</button>
      </div>
    </div>
  )
}

// ─── Circular Ring ───────────────────────────────────────────────────────────
function CircularRing({ progress, color, size = 110, stroke = 7 }: { progress: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = calcCircumference(r)
  const dashOffset = circ * (1 - Math.max(0, Math.min(1, progress)))

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.8s linear' }}
      />
    </svg>
  )
}

// ─── Main Floating Component ──────────────────────────────────────────────────
export default function FloatingPomodoro({ onCheckIn }: { onCheckIn: number }) {
  const [expanded, setExpanded] = useState(false)
  const [focusMin, setFocusMin] = useState(DEFAULT_FOCUS)
  const [breakMin, setBreakMin] = useState(DEFAULT_BREAK)
  const [rotations, setRotations] = useState(DEFAULT_ROTATIONS)
  const [mode, setMode] = useState<'idle' | 'running' | 'paused'>('idle')
  const [phase, setPhase] = useState<'focus' | 'break' | 'idle'>('idle')
  const [round, setRound] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_FOCUS * 60 * 1000)
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null)

  const sessionStartRef = useRef<number | null>(null)
  const phaseStartRef = useRef<number | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load persisted session
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) {
        const s = JSON.parse(saved)
        setFocusMin(s.focusMin ?? DEFAULT_FOCUS)
        setBreakMin(s.breakMin ?? DEFAULT_BREAK)
        setRotations(s.rotations ?? DEFAULT_ROTATIONS)
        if (s.mode === 'running' || s.mode === 'paused') {
          setMode(s.mode)
          setPhase(s.phase)
          setRound(s.round)
          setTimeLeft(s.timeLeft)
          setCheckIns(s.checkIns || [])
          setExpanded(false) // start minimized
        }
      }
    } catch (_) {}
  }, [])

  // Persist session
  useEffect(() => {
    if (mode === 'idle') return
    const data = { mode, phase, round, timeLeft, focusMin, breakMin, rotations, checkIns }
    localStorage.setItem(SESSION_KEY, JSON.stringify(data))
  }, [mode, phase, round, timeLeft, focusMin, breakMin, rotations, checkIns])

  // Auto-log check-ins from parent
  useEffect(() => {
    if (!onCheckIn) return
    if (mode === 'idle' || mode === 'paused') return
    const now = Date.now()
    const interval = phaseStartRef.current ? Math.round((now - phaseStartRef.current) / 60000 * 10) / 10 : null
    setCheckIns(prev => [...prev, { ts: now, interval }])
  }, [onCheckIn])

  // Timer tick
  useEffect(() => {
    if (mode !== 'running') {
      if (tickRef.current) clearInterval(tickRef.current)
      return
    }
    tickRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          if (tickRef.current) clearInterval(tickRef.current)
          handlePhaseEnd()
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [mode])

  function handlePhaseEnd() {
    tripleBeep()
    const now = Date.now()
    const phaseDuration = now - (phaseStartRef.current || now)
    const phaseCheckIns = [...checkIns].reverse()
    const ciWithInterval = phaseCheckIns.filter(c => c.interval != null)
    let avgInterval: number | null = null
    if (ciWithInterval.length > 1) {
      let sum = 0
      for (let i = 1; i < ciWithInterval.length; i++) {
        sum += (ciWithInterval[i].interval! - ciWithInterval[i - 1].interval!)
      }
      avgInterval = Math.round((sum / (ciWithInterval.length - 1)) * 10) / 10
    }

    const totalRounds = rotations * 2
    const nextRound = round + 1

    if (nextRound >= totalRounds) {
      const totalTime = now - (sessionStartRef.current || now)
      const result: SessionResult = {
        rounds: [{ checkIns: phaseCheckIns.length, avgInterval, duration: phaseDuration }],
        totalTime,
        totalCheckIns: checkIns.length,
        focusDuration: focusMin,
        breakDuration: breakMin,
      }
      try {
        const hist: SessionResult[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
        hist.unshift({ ...result, date: new Date().toISOString(), coach: 'Milzzy' })
        localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 100)))
      } catch (_) {}

      setMode('idle')
      setPhase('idle')
      setRound(0)
      setCheckIns([])
      localStorage.removeItem(SESSION_KEY)
      setSessionResult(result)
      setShowSummary(true)
      setExpanded(false)
      return
    }

    const nextPhase: 'focus' | 'break' = phase === 'focus' ? 'break' : 'focus'
    const nextDuration = (nextPhase === 'focus' ? focusMin : breakMin) * 60 * 1000
    setPhase(nextPhase)
    setRound(nextRound)
    setTimeLeft(nextDuration)
    phaseStartRef.current = now
  }

  function startSession() {
    const now = Date.now()
    sessionStartRef.current = now
    phaseStartRef.current = now
    setMode('running')
    setPhase('focus')
    setRound(0)
    setTimeLeft(focusMin * 60 * 1000)
    setCheckIns([])
    setShowSettings(false)
    setExpanded(false)
  }

  function togglePause() {
    if (mode === 'running') {
      setMode('paused')
    } else if (mode === 'paused') {
      setMode('running')
      phaseStartRef.current = Date.now()
    }
  }

  function resetSession() {
    if (tickRef.current) clearInterval(tickRef.current)
    setMode('idle')
    setPhase('idle')
    setRound(0)
    setTimeLeft(focusMin * 60 * 1000)
    setCheckIns([])
    setShowSettings(false)
    localStorage.removeItem(SESSION_KEY)
  }

  function extendFive() {
    setTimeLeft(prev => prev + 5 * 60 * 1000)
  }

  const isActive = mode !== 'idle'
  const ringColor = phase === 'focus' ? FOCUS_COLOR : BREAK_COLOR
  const progress = phase !== 'idle' ? 1 - timeLeft / ((phase === 'focus' ? focusMin : breakMin) * 60 * 1000) : 0

  // ── Minimised bubble ─────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <>
        {showSummary && sessionResult && (
          <SessionSummary session={sessionResult} onClose={() => setShowSummary(false)} />
        )}

        {/* Floating bubble */}
        <div
          onClick={() => setExpanded(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9000,
            background: isActive ? 'rgba(15,15,18,0.95)' : 'rgba(15,15,18,0.75)',
            border: `1px solid ${isActive ? ringColor + '55' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '999px',
            padding: isActive ? '10px 16px' : '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: isActive ? `0 4px 24px ${ringColor}33, 0 0 0 1px ${ringColor}22` : '0 4px 20px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease',
            fontFamily: 'system-ui',
            backdropFilter: 'blur(12px)',
          }}
        >
          <span style={{ fontSize: '18px' }}>🍅</span>
          {isActive && (
            <>
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: ringColor,
                boxShadow: `0 0 6px ${ringColor}`,
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
                {fmt(timeLeft)}
              </span>
              {checkIns.length > 0 && (
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: FOCUS_COLOR,
                  background: 'rgba(10,186,181,0.15)', borderRadius: '999px',
                  padding: '1px 7px',
                }}>
                  {checkIns.length}
                </span>
              )}
            </>
          )}
          {!isActive && (
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', fontWeight: 500, paddingRight: '4px' }}>
              Pomodoro
            </span>
          )}
        </div>
      </>
    )
  }

  // ── Expanded card ─────────────────────────────────────────────────────────
  const cfgBtnStyle: React.CSSProperties = {
    width: '26px', height: '26px', borderRadius: '7px',
    background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(255,255,255,0.12)`,
    color: '#fff', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui',
  }

  function SettingRow({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontFamily: 'system-ui', fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => onChange(Math.max(min, value - 1))} style={cfgBtnStyle}>−</button>
          <span style={{ fontFamily: 'system-ui', fontSize: '14px', fontWeight: 700, color: '#fff', minWidth: '24px', textAlign: 'center' }}>{value}</span>
          <button onClick={() => onChange(Math.min(max, value + 1))} style={cfgBtnStyle}>+</button>
        </div>
      </div>
    )
  }

  const roundLabel = phase !== 'idle' ? (phase === 'focus' ? `R${Math.floor(round / 2) + 1}/${rotations}` : `Br${Math.floor(round / 2) + 1}/${rotations}`) : ''

  return (
    <>
      {showSummary && sessionResult && (
        <SessionSummary session={sessionResult} onClose={() => setShowSummary(false)} />
      )}

      {/* Backdrop */}
      <div
        onClick={() => { if (isActive) setExpanded(false); else { resetSession(); setExpanded(false); } }}
        style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
      />

      {/* Floating expanded card */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9001,
        width: '280px',
        background: 'rgba(15,15,18,0.96)',
        border: `1px solid ${GLASS_BORDER}`,
        borderRadius: '20px',
        padding: '20px 18px 18px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        fontFamily: 'system-ui',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🍅</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Pomodoro</span>
            {isActive && roundLabel && (
              <span style={{ fontSize: '10px', color: ringColor, fontWeight: 600, background: `${ringColor}18`, borderRadius: '999px', padding: '2px 8px' }}>
                {roundLabel}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(false)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '16px', padding: '4px', fontFamily: 'system-ui' }}
          >
            ✕
          </button>
        </div>

        {/* Idle: settings + start */}
        {!isActive && !showSettings && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowSettings(true)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.10)`, borderRadius: '10px', padding: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'system-ui' }}
              >
                {focusMin}m / {breakMin}m / {rotations}×
              </button>
              <button
                onClick={startSession}
                style={{ flex: 1, background: FOCUS_COLOR, border: 'none', borderRadius: '10px', padding: '8px', fontSize: '13px', fontWeight: 700, color: '#000', cursor: 'pointer', fontFamily: 'system-ui' }}
              >
                Start
              </button>
            </div>
          </div>
        )}

        {/* Idle: settings panel */}
        {!isActive && showSettings && (
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
            <SettingRow label="Focus (min)" value={focusMin} onChange={setFocusMin} min={1} max={90} />
            <div style={{ height: '8px' }} />
            <SettingRow label="Break (min)" value={breakMin} onChange={setBreakMin} min={1} max={30} />
            <div style={{ height: '8px' }} />
            <SettingRow label="Rotations" value={rotations} onChange={setRotations} min={1} max={12} />
            <div style={{ height: '10px' }} />
            <button
              onClick={() => { setTimeLeft(focusMin * 60 * 1000); setShowSettings(false) }}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.10)`, borderRadius: '8px', padding: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontFamily: 'system-ui' }}
            >
              Apply
            </button>
          </div>
        )}

        {/* Active timer */}
        {isActive && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            {/* Ring */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularRing progress={progress} color={ringColor} size={110} stroke={6} />
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <p style={{ fontFamily: 'system-ui', fontSize: '26px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>{fmt(timeLeft)}</p>
                <p style={{ fontFamily: 'system-ui', fontSize: '9px', color: ringColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1px 0 0' }}>{phase}</p>
              </div>
            </div>

            {/* Round dots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {Array.from({ length: rotations }, (_, i) => {
                const focusDone = Math.floor(round / 2) > i
                const focusActive = Math.floor(round / 2) === i && phase === 'focus'
                return (
                  <div key={i} style={{ display: 'flex', gap: '2px' }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: focusDone ? FOCUS_COLOR : focusActive ? FOCUS_COLOR : 'rgba(255,255,255,0.15)',
                      boxShadow: focusActive ? `0 0 5px ${FOCUS_COLOR}` : 'none',
                    }} />
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: focusDone && round > i * 2 + 1 ? BREAK_COLOR : 'rgba(255,255,255,0.15)',
                    }} />
                  </div>
                )
              })}
            </div>

            {/* Check-in count */}
            <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '8px', padding: '4px 16px' }}>
              <p style={{ fontFamily: 'system-ui', fontSize: '18px', fontWeight: 800, color: FOCUS_COLOR, margin: 0 }}>{checkIns.length}</p>
              <p style={{ fontFamily: 'system-ui', fontSize: '8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>check-ins</p>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
              <button onClick={togglePause} style={{
                flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(255,255,255,0.10)`,
                borderRadius: '8px', padding: '8px', fontSize: '12px', fontWeight: 700,
                color: mode === 'paused' ? FOCUS_COLOR : 'rgba(255,255,255,0.65)',
                cursor: 'pointer', fontFamily: 'system-ui',
              }}>
                {mode === 'paused' ? '▶ Resume' : '⏸'}
              </button>
              <button onClick={extendFive} style={{
                background: 'rgba(10,186,181,0.12)', border: `1px solid rgba(10,186,181,0.20)`,
                borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 700,
                color: FOCUS_COLOR, cursor: 'pointer', fontFamily: 'system-ui',
              }}>+5m</button>
              <button onClick={resetSession} style={{
                background: 'rgba(248,113,113,0.10)', border: `1px solid rgba(248,113,113,0.18)`,
                borderRadius: '8px', padding: '8px 10px', fontSize: '12px', fontWeight: 700,
                color: '#f87171', cursor: 'pointer', fontFamily: 'system-ui',
              }}>✕</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}