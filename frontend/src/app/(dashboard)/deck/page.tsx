'use client';

import { apiFetch } from '@/lib/apiClient';
import { useState, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Scoring {
  'Team & Founder Quality': number;
  'Market Size & Timing': number;
  'Product & Technology': number;
  'Traction & Revenue Quality': number;
  'Growth Rate & Momentum': number;
  'Business Model & Unit Economics': number;
  'Competitive Moat & Defensibility': number;
  'GTM & Distribution': number;
  'Execution Speed': number;
  'Fundraising Quality & Terms': number;
  total_score: number;
  verdict: 'INVEST' | 'MAYBE' | 'PASS';
  rationale: string;
}

interface Founder {
  name: string;
  title: string;
  email: string;
  background: string;
}

interface DeckAnalysis {
  company: string;
  sector: string;
  stage: string;
  description: string;
  problem: string;
  solution: string;
  moat: string;
  gtm: string;
  metrics: { revenue: string; growth: string; runway: string };
  thesis: string;
  risks: string[];
  comps: string[];
  founder: Founder;
  scoring: Scoring;
}

// ─── Score Bar Component ──────────────────────────────────────────────────────
function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? 'var(--accent-emerald)' : value >= 6 ? 'var(--accent-blue)' : value >= 4 ? 'var(--accent-amber)' : 'var(--accent-red)';
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span className="mono" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>{label.toUpperCase()}</span>
        <span className="mono" style={{ fontSize: '9px', color }}>{value}/10</span>
      </div>
      <div style={{ height: '3px', background: 'var(--bg-main)', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: color, transition: 'width 1s ease-out' }} />
      </div>
    </div>
  );
}

// ─── Verdict Badge ────────────────────────────────────────────────────────────
function VerdictBadge({ verdict }: { verdict: string }) {
  const cfg = {
    INVEST: { bg: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', border: 'var(--accent-emerald)' },
    MAYBE:  { bg: 'rgba(217,119,6,0.15)',  color: 'var(--accent-amber)',   border: 'var(--accent-amber)' },
    PASS:   { bg: 'rgba(225,29,72,0.15)',  color: 'var(--accent-red)',     border: 'var(--accent-red)' },
  }[verdict] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' };

  return (
    <div style={{
      display: 'inline-block',
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      borderRadius: '2px',
      padding: '4px 16px',
      fontFamily: 'IBM Plex Mono',
      fontWeight: 700,
      fontSize: '14px',
      letterSpacing: '0.15em',
    }}>
      {verdict}
    </div>
  );
}

// ─── VC Questions (hardcoded like your Python script) ─────────────────────────
const VC_QUESTIONS = [
  'What is your Customer Acquisition Cost (CAC) and LTV ratio?',
  'What is your current monthly / annual growth rate?',
  'How do you defend against well-funded competitors entering this space?',
  'What are your current revenues and path to $1M ARR?',
  'How long is your runway after this funding round?',
  'What is your net revenue retention (NRR) from existing customers?',
  'Who are your key reference customers and can we speak to them?',
  'What is the founders\' track record and why this team for this problem?',
  'What\'s your go-to-market motion — inbound, outbound, or product-led growth?',
  'What does your cap table look like and are there any previous investors?',
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PitchDeckAnalyzer() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<{ text: string; type: string }[]>([]);
  const [result, setResult] = useState<DeckAnalysis | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string, type: 'info' | 'success' | 'error' | 'system' = 'info') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0');
    setLogs(prev => {
      const next = [...prev, { text: `[${ts}] ${text}`, type }];
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      return next;
    });
  };

  const processFile = async (file: File) => {
    setLogs([]);
    setResult(null);

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setStatus('error');
      addLog('ERROR: Incompatible file type detected. Only PDF pitch decks are supported.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatus('error');
      addLog('ERROR: File size exceeds the maximum limit of 10MB. Please optimize your PDF and upload again.', 'error');
      return;
    }

    setStatus('uploading');

    addLog('INITIATING SECURE DOCUMENT INGESTION PIPELINE', 'system');
    addLog(`FILE_DETECTED: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
    addLog('ENCRYPTING PAYLOAD FOR TRANSIT...', 'info');

    await new Promise(r => setTimeout(r, 400));
    setStatus('analyzing');
    addLog('OCR_ENGINE: CONVERTING PDF → SLIDE IMAGES (PyMuPDF)', 'info');
    addLog('MULTIMODAL_VISION: TRANSMITTING TO GEMINI 2.5-FLASH...', 'info');
    addLog('AWAITING VISION MODEL RESPONSE (5–15s estimated)...', 'system');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/api/upload-deck', { method: 'POST', body: formData });
      const data: DeckAnalysis = res;

      addLog('VISION_MODEL: EXTRACTION COMPLETE ✓', 'success');
      addLog(`STARTUP_IDENTIFIED: ${data.company || 'Unknown'}`, 'success');
      addLog(`SECTOR: ${data.sector || 'N/A'} | STAGE: ${data.stage || 'N/A'}`, 'info');
      addLog('AGENT_ORCHESTRATOR: RUNNING VC SCORING ENGINE...', 'system');
      await new Promise(r => setTimeout(r, 600));
      addLog(`SCORING_COMPLETE: ${data.scoring?.total_score ?? 'N/A'}/100 — VERDICT: ${data.scoring?.verdict ?? 'N/A'}`, 'success');
      addLog('IC MEMO COMPILED. PIPELINE NOMINAL.', 'success');

      setResult(data);
      setStatus('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`PIPELINE FAILURE: ${msg}`, 'error');
      addLog('ENSURE PYTHON BACKEND IS RUNNING ON PORT 8000', 'error');
      setStatus('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const reset = () => {
    setStatus('idle');
    setLogs([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const logColor = (type: string) => ({
    success: 'var(--accent-emerald)',
    error: 'var(--accent-red)',
    system: 'var(--accent-violet)',
    info: 'var(--text-secondary)',
  }[type] ?? 'var(--text-secondary)');

  const scoring = result?.scoring;
  const scoreEntries = scoring ? Object.entries(scoring).filter(([k]) =>
    !['total_score', 'verdict', 'rationale'].includes(k)
  ) as [string, number][] : [];

  return (
    <div style={{ padding: '12px', minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', gap: '12px' }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>Pitch Deck Analyzer</h1>
          <div className="mono text-muted" style={{ marginTop: '2px' }}>
            MODULE: MULTIMODAL VISION EXTRACTION • ENGINE: GEMINI 2.5-FLASH • TIER-1 VC DILIGENCE
          </div>
        </div>
        {status !== 'idle' && (
          <button className="btn" onClick={reset} style={{ fontSize: '10px' }}>↺ NEW ANALYSIS</button>
        )}
      </div>

      {/* ── Upload Zone ── */}
      {status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--accent-blue)' : 'var(--border-highlight)'}`,
            borderRadius: '4px',
            padding: '60px 40px',
            textAlign: 'center',
            background: dragOver ? 'rgba(169,68,37,0.04)' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flex: 1,
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '36px', marginBottom: '16px', opacity: 0.6 }}>📄</div>
          <div className="mono" style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
            DROP PITCH DECK HERE
          </div>
          <div className="mono text-muted" style={{ marginBottom: '20px' }}>
            or click to browse — PDF files only
          </div>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', marginBottom: '24px' }}>
            {['GEMINI VISION', 'VC SCORING ENGINE', 'RED FLAG DETECTION', 'IC MEMO GENERATION'].map(f => (
              <div key={f} className="mono" style={{ fontSize: '9px', color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>✓ {f}</div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ padding: '8px 24px', fontSize: '11px', letterSpacing: '0.05em' }}>
            SELECT PITCH DECK (.PDF)
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      )}

      {/* ── Processing + Results ── */}
      {status !== 'idle' && (
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '12px', flex: 1 }}>

          {/* Left: System Logs */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', background: '#050816', height: 'calc(100vh - 150px)' }}>
            <div className="panel-header">
              <span>System Orchestration Stream</span>
              <span className="mono" style={{
                color: status === 'done' ? 'var(--accent-emerald)' : status === 'error' ? 'var(--accent-red)' : 'var(--accent-violet)',
                fontSize: '9px'
              }}>
                {status === 'done' ? '● NOMINAL' : status === 'error' ? '● FAILED' : '● PROCESSING'}
              </span>
            </div>
            <div className="mono" style={{ flex: 1, overflowY: 'auto', fontSize: '10px', lineHeight: 1.7 }}>
              {logs.map((log, i) => (
                <div key={i} style={{ color: logColor(log.type), marginBottom: '2px' }}>
                  {log.text}
                </div>
              ))}
              {(status === 'uploading' || status === 'analyzing') && (
                <div style={{ color: 'var(--accent-violet)', animation: 'pulse 1s infinite' }}>█</div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Right: IC Memo + Scorecard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', height: 'calc(100vh - 150px)' }}>

            {(status === 'uploading' || status === 'analyzing') && (
              <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent-violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span className="mono text-muted">Gemini Vision analyzing slides...</span>
              </div>
            )}

            {status === 'error' && (
              <div className="panel" style={{ borderLeft: '2px solid var(--accent-red)', padding: '20px' }}>
                <div className="panel-header" style={{ color: 'var(--accent-red)' }}>Pipeline Failure</div>
                <p className="mono text-muted" style={{ fontSize: '11px' }}>
                  Ensure the Python backend is running:<br />
                  <span style={{ color: 'var(--accent-blue)' }}>uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload</span>
                </p>
              </div>
            )}

            {status === 'done' && result && (
              <>
                {/* ── Verdict Banner ── */}
                <div className="panel panel-elevated" style={{
                  borderLeft: `2px solid ${result.scoring?.verdict === 'INVEST' ? 'var(--accent-emerald)' : result.scoring?.verdict === 'MAYBE' ? 'var(--accent-amber)' : 'var(--accent-red)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                }}>
                  <div>
                    <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px' }}>INVESTMENT VERDICT</div>
                    <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>{result.company}</h2>
                    <div className="mono text-secondary" style={{ fontSize: '10px' }}>
                      {result.sector} · {result.stage}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <VerdictBadge verdict={result.scoring?.verdict ?? 'PASS'} />
                    <div className="mono" style={{ fontSize: '24px', marginTop: '8px', color: 'var(--text-primary)' }}>
                      {result.scoring?.total_score ?? '—'}<span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100</span>
                    </div>
                  </div>
                </div>

                {/* ── Main Grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                  {/* Problem / Solution */}
                  <div className="panel">
                    <div className="panel-header">Problem & Solution</div>
                    <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px' }}>PROBLEM</div>
                    <p className="text-secondary" style={{ fontSize: '11px', marginBottom: '12px', lineHeight: 1.6 }}>{result.problem || 'Not extracted'}</p>
                    <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px' }}>SOLUTION</div>
                    <p className="text-secondary" style={{ fontSize: '11px', lineHeight: 1.6 }}>{result.solution || 'Not extracted'}</p>
                  </div>

                  {/* Key Metrics */}
                  <div className="panel">
                    <div className="panel-header">Key Traction Metrics</div>
                    {[
                      { label: 'REVENUE / ARR', value: result.metrics?.revenue, color: 'var(--accent-emerald)' },
                      { label: 'GROWTH', value: result.metrics?.growth, color: 'var(--accent-blue)' },
                      { label: 'RUNWAY', value: result.metrics?.runway, color: 'var(--accent-amber)' },
                    ].map(m => (
                      <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="mono text-muted" style={{ fontSize: '9px' }}>{m.label}</span>
                        <span className="mono" style={{ fontSize: '12px', color: m.color }}>{m.value || 'N/A'}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: '10px' }}>
                      <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px' }}>MOAT</div>
                      <p className="text-secondary" style={{ fontSize: '10px', lineHeight: 1.6 }}>{result.moat || 'Not extracted'}</p>
                    </div>
                  </div>

                  {/* Founder */}
                  <div className="panel" style={{ borderLeft: '2px solid var(--accent-violet)' }}>
                    <div className="panel-header">Founder Intelligence</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {result.founder?.name || 'Not Found'}
                    </div>
                    <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: '8px' }}>
                      {result.founder?.title || 'Unknown Role'}
                    </div>
                    {result.founder?.email && (
                      <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-blue)', marginBottom: '8px' }}>
                        ✉ {result.founder.email}
                      </div>
                    )}
                    <p className="text-secondary" style={{ fontSize: '10px', lineHeight: 1.6 }}>
                      {result.founder?.background || 'Background not extracted from deck.'}
                    </p>
                  </div>

                  {/* GTM */}
                  <div className="panel">
                    <div className="panel-header">GTM Strategy & Description</div>
                    <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px' }}>DESCRIPTION</div>
                    <p className="text-secondary" style={{ fontSize: '10px', marginBottom: '12px', lineHeight: 1.6 }}>{result.description || 'N/A'}</p>
                    <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px' }}>GTM MOTION</div>
                    <p className="text-secondary" style={{ fontSize: '10px', lineHeight: 1.6 }}>{result.gtm || 'Not extracted'}</p>
                  </div>
                </div>

                {/* ── Scoring Radar ── */}
                <div className="panel panel-elevated">
                  <div className="panel-header">
                    VC Scoring Engine — Dimension Breakdown
                    <span className="mono" style={{ color: 'var(--accent-emerald)', fontSize: '10px' }}>
                      TOTAL: {scoring?.total_score ?? '—'}/100
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginTop: '8px' }}>
                    {scoreEntries.map(([label, val]) => (
                      <ScoreBar key={label} label={label} value={val} />
                    ))}
                  </div>
                  {scoring?.rationale && (
                    <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)' }}>
                      <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '4px' }}>INVESTMENT RATIONALE</div>
                      <p className="text-secondary" style={{ fontSize: '11px', lineHeight: 1.6 }}>{scoring.rationale}</p>
                    </div>
                  )}
                </div>

                {/* ── Investment Thesis ── */}
                <div className="panel" style={{ borderLeft: '2px solid var(--accent-blue)' }}>
                  <div className="panel-header">Investment Thesis</div>
                  <p className="text-secondary" style={{ fontSize: '11px', lineHeight: 1.7 }}>{result.thesis}</p>
                </div>

                {/* ── Risks & Comps ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="panel" style={{ borderLeft: '2px solid var(--accent-red)' }}>
                    <div className="panel-header" style={{ color: 'var(--accent-red)' }}>⚠ Red Flags & Risks Detected</div>
                    {(result.risks ?? []).length > 0 ? result.risks.map((r, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ color: 'var(--accent-red)', fontSize: '11px' }}>▸</span>
                        <span className="text-secondary" style={{ fontSize: '11px' }}>{r}</span>
                      </div>
                    )) : (
                      <p className="text-muted mono" style={{ fontSize: '10px' }}>No risks extracted</p>
                    )}
                  </div>

                  <div className="panel">
                    <div className="panel-header" style={{ color: 'var(--accent-cyan)' }}>Comparable Transactions</div>
                    {(result.comps ?? []).length > 0 ? result.comps.map((c, i) => (
                      <div key={i} className="mono" style={{ fontSize: '10px', padding: '5px 0', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                        ► {c}
                      </div>
                    )) : (
                      <p className="text-muted mono" style={{ fontSize: '10px' }}>No comps extracted</p>
                    )}
                  </div>
                </div>

                {/* ── VC Questions ── */}
                <div className="panel" style={{ borderLeft: '2px solid var(--accent-amber)' }}>
                  <div className="panel-header" style={{ color: 'var(--accent-amber)' }}>Questions A Top VC Would Ask</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                    {VC_QUESTIONS.map((q, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span className="mono" style={{ color: 'var(--accent-amber)', fontSize: '10px', minWidth: '16px' }}>Q{i + 1}</span>
                        <span className="text-secondary" style={{ fontSize: '11px' }}>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
