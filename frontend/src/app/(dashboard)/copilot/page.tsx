'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect, useRef } from 'react';

interface Analysis {
  metrics: string[];
  red_flags: string[];
  follow_ups: string[];
  sentiment: string;
}

const SENTIMENT_COLOR: Record<string, string> = {
  'Positive':        'var(--accent-emerald)',
  'Positive/Neutral': 'var(--accent-emerald)',
  'Neutral':         'var(--accent-amber)',
  'Neutral-Positive':'var(--accent-blue)',
  'Negative':        'var(--accent-red)',
  'Concise':         'var(--accent-violet)',
  'Unknown':         'var(--text-muted)',
  'Error':           'var(--accent-red)',
};

export default function LiveCopilot() {
  const [isListening, setIsListening]     = useState(false);
  const [transcript, setTranscript]       = useState('');
  const [status, setStatus]               = useState('READY — ENCRYPTED CHANNEL');
  const [autoAnalyze, setAutoAnalyze]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [elapsed, setElapsed]             = useState(0);
  const [meetingName, setMeetingName]     = useState('');
  const [notes, setNotes]                 = useState('');
  const [toast, setToast]                 = useState('');
  const [analysis, setAnalysis]           = useState<Analysis>({
    metrics: [], red_flags: [], follow_ups: [], sentiment: 'N/A'
  });

  const recognitionRef  = useRef<any>(null);
  const autoTimerRef    = useRef<any>(null);
  const clockRef        = useRef<any>(null);
  const transcriptRef   = useRef(transcript);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // ── Clock ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isListening) {
      clockRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(clockRef.current);
    }
    return () => clearInterval(clockRef.current);
  }, [isListening]);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  // ── Speech recognition ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatus('WEBSPEECH NOT SUPPORTED — USE MANUAL INPUT'); return; }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart  = () => { setIsListening(true);  setStatus('● LIVE — SPEECH-TO-TEXT ACTIVE'); };
    rec.onend    = () => { setIsListening(false);  setStatus('STOPPED — CHANNEL DISENGAGED'); };
    rec.onerror  = (e: any) => setStatus(`ERROR: ${String(e.error).toUpperCase()}`);
    rec.onresult = (e: any) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
      }
      if (final) setTranscript(prev => prev + final);
    };
    recognitionRef.current = rec;
  }, []);

  const startMic = () => { try { recognitionRef.current?.start(); } catch {} };
  const stopMic  = () => recognitionRef.current?.stop();

  // ── Analysis ───────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    const text = transcriptRef.current.trim();
    if (!text) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/analyze-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      if (res) setAnalysis(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-analyze every 15s ─────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(autoTimerRef.current);
    if (autoAnalyze) {
      autoTimerRef.current = setInterval(() => {
        if (transcriptRef.current.trim().length > 30) runAnalysis();
      }, 15000);
    }
    return () => clearInterval(autoTimerRef.current);
  }, [autoAnalyze]);

  const saveMeeting = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup_id: null,
          meeting_type: meetingName || "Live Pitch",
          ai_summary: analysis.sentiment + " - " + analysis.metrics.join(", "),
          duration_minutes: Math.max(1, Math.floor(elapsed / 60)),
          raw_transcript: transcriptRef.current,
          key_concerns: analysis.red_flags,
          action_items: analysis.follow_ups,
          founder_score: analysis.sentiment.includes('Positive') ? 95 : 80,
          live_mode_used: isListening
        })
      });
      setToast('Meeting saved successfully ✓');
      setTimeout(() => setToast(''), 3000);
    } catch (e) {
      console.error(e);
      setToast('Failed to save meeting.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const sentColor = SENTIMENT_COLOR[analysis.sentiment] ?? 'var(--text-muted)';

  return (
    <div style={{ padding: '12px', height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      <style>{`
        @keyframes pulse-rec { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(225,29,72,0.4)} 50%{opacity:0.7;box-shadow:0 0 0 6px rgba(225,29,72,0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .rec-dot { animation: pulse-rec 1.2s ease-in-out infinite; }
      `}</style>

      {/* ── Header bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <input
            value={meetingName}
            onChange={e => setMeetingName(e.target.value)}
            placeholder="Meeting name (e.g. NeuroFlow AI — Series A Pitch)"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', width: '100%' }}
          />
          <div className="mono text-muted" style={{ fontSize: '9px', marginTop: '2px' }}>
            MODULE: REAL-TIME AUDITORY TELEMETRY • ENGINE: GEMINI 2.5-FLASH
          </div>
        </div>

        {/* REC indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isListening && (
            <span className="rec-dot" style={{ width: '8px', height: '8px', background: 'var(--accent-red)', borderRadius: '50%', display: 'inline-block' }} />
          )}
          <span className="mono" style={{ fontSize: '10px', color: isListening ? 'var(--accent-red)' : 'var(--text-muted)' }}>
            {isListening ? `REC ${fmtTime(elapsed)}` : status}
          </span>
        </div>

        {/* Sentiment */}
        {analysis.sentiment !== 'N/A' && (
          <span className="mono" style={{ fontSize: '10px', padding: '3px 10px', background: sentColor + '18', color: sentColor, border: `1px solid ${sentColor}40` }}>
            {analysis.sentiment.toUpperCase()}
          </span>
        )}

        <button className="btn btn-primary" style={{ fontSize: '10px' }} onClick={saveMeeting}>
          SAVE MEETING
        </button>
      </div>

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '12px', flex: 1, minHeight: 0 }}>

        {/* LEFT — Transcript */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="panel-header">
            <span>Live Transcript Stream</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label className="mono" style={{ fontSize: '9px', color: autoAnalyze ? 'var(--accent-violet)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="checkbox" checked={autoAnalyze} onChange={e => setAutoAnalyze(e.target.checked)} style={{ accentColor: 'var(--accent-violet)' }} />
                AUTO-ANALYZE (15s)
              </label>
              {isListening ? (
                <button className="btn" onClick={stopMic} style={{ fontSize: '9px', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>■ STOP</button>
              ) : (
                <button className="btn btn-primary" onClick={startMic} style={{ fontSize: '9px' }}>⏺ MIC</button>
              )}
              <button className="btn" onClick={() => { setTranscript(''); setElapsed(0); }} style={{ fontSize: '9px' }}>CLEAR</button>
            </div>
          </div>

          <textarea
            className="mono"
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder={`Live audio transcript appears here automatically.\n\nOr paste/type meeting notes manually to test AI analysis.\n\nExample: "Our ARR is $1.2M growing at 180% YoY. CAC is around $800 with a 24-month payback period. We have 3 enterprise contracts signed with Salesforce, Workday and SAP..."`}
            style={{
              flex: 1, background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)', padding: '12px', fontSize: '11px',
              lineHeight: 1.7, resize: 'none', outline: 'none', marginTop: '8px',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <span className="mono text-muted" style={{ fontSize: '9px', alignSelf: 'center' }}>
              {transcript.split(' ').filter(Boolean).length} words
            </span>
            <button
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '10px' }}
              onClick={runAnalysis}
              disabled={loading || !transcript.trim()}
            >
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    ANALYZING...
                  </span>
                : '⚡ ANALYZE NOW'}
            </button>
          </div>
        </div>

        {/* RIGHT — AI Insights */}
        <div className="panel panel-elevated" style={{ borderLeft: '2px solid var(--accent-blue)', display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }}>
          <div className="panel-header">
            <span>Copilot Intelligence</span>
            <span className="mono" style={{ fontSize: '9px', color: 'var(--accent-blue)' }}>
              {loading ? 'PROCESSING...' : 'READY'}
            </span>
          </div>

          {/* Metrics */}
          <div style={{ marginBottom: '14px' }}>
            <div className="mono" style={{ fontSize: '9px', color: 'var(--accent-emerald)', letterSpacing: '0.1em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--accent-emerald)', borderRadius: '50%', display: 'inline-block' }} />
              TRACTION SIGNALS
            </div>
            {analysis.metrics.length > 0 ? analysis.metrics.map((m, i) => (
              <div key={i} className="mono" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', padding: '6px 8px', marginBottom: '4px', fontSize: '10px', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)' }}>[M]</span>
                <span style={{ color: 'var(--text-secondary)' }}>{m}</span>
              </div>
            )) : (
              <div className="mono text-muted" style={{ fontSize: '10px', padding: '8px', border: '1px dashed var(--border-subtle)' }}>
                No metrics detected yet — run analysis
              </div>
            )}
          </div>

          {/* Red flags */}
          <div style={{ marginBottom: '14px' }}>
            <div className="mono" style={{ fontSize: '9px', color: 'var(--accent-red)', letterSpacing: '0.1em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--accent-red)', borderRadius: '50%', display: 'inline-block' }} />
              RED FLAGS
            </div>
            {analysis.red_flags.length > 0 ? analysis.red_flags.map((r, i) => (
              <div key={i} className="mono" style={{ background: 'rgba(225,29,72,0.06)', border: '1px solid rgba(225,29,72,0.15)', padding: '6px 8px', marginBottom: '4px', fontSize: '10px', display: 'flex', gap: '8px' }}>
                <span style={{ color: 'var(--accent-red)' }}>[⚠]</span>
                <span style={{ color: 'var(--text-secondary)' }}>{r}</span>
              </div>
            )) : (
              <div className="mono text-muted" style={{ fontSize: '10px', padding: '8px', border: '1px dashed var(--border-subtle)' }}>
                No flags raised
              </div>
            )}
          </div>

          {/* Follow-ups */}
          <div style={{ marginBottom: '14px' }}>
            <div className="mono" style={{ fontSize: '9px', color: 'var(--accent-blue)', letterSpacing: '0.1em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--accent-blue)', borderRadius: '50%', display: 'inline-block' }} />
              FOLLOW-UP QUESTIONS
            </div>
            {analysis.follow_ups.length > 0 ? analysis.follow_ups.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span className="mono" style={{ color: 'var(--accent-blue)', fontSize: '9px', minWidth: '20px' }}>Q{i + 1}</span>
                <span className="text-secondary" style={{ fontSize: '11px' }}>{f}</span>
              </div>
            )) : (
              <div className="mono text-muted" style={{ fontSize: '10px', padding: '8px', border: '1px dashed var(--border-subtle)' }}>
                Awaiting content to generate questions
              </div>
            )}
          </div>

          {/* Private notes */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px', letterSpacing: '0.08em' }}>
              🔒 PRIVATE NOTES (NOT SHARED)
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Your private notes during the meeting..."
              style={{
                width: '100%', height: '80px', background: 'var(--bg-main)',
                border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                padding: '8px', fontSize: '11px', resize: 'none', outline: 'none',
                fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'var(--bg-elevated)', border: '1px solid var(--accent-emerald)',
          color: 'var(--accent-emerald)', padding: '10px 20px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
          boxShadow: '0 4px 20px rgba(16,185,129,0.2)', zIndex: 100,
          animation: 'slidein 0.3s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
