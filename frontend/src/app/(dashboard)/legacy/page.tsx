'use client';

import { apiFetch } from '@/lib/apiClient';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
      <div style={{ width: '14px', height: '14px', border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span className="mono text-muted" style={{ fontSize: '11px' }}>LOADING DATA...</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: '4px', border: '1px solid rgba(245,158,11,0.2)' }}>
      ⚠ Backend starting up... ({message})
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    HIGH:   { color: 'var(--accent-red)',     bg: 'rgba(239,68,68,0.1)' },
    MEDIUM: { color: 'var(--accent-amber)',   bg: 'rgba(245,158,11,0.1)' },
    LOW:    { color: 'var(--accent-emerald)', bg: 'rgba(34,197,94,0.1)' },
  };
  const s = cfg[level?.toUpperCase()] ?? cfg['LOW'];
  return (
    <span className="mono" style={{ fontSize: '10px', padding: '2px 6px', background: s.bg, color: s.color, borderRadius: '4px', fontWeight: 600 }}>
      {level?.toUpperCase() ?? 'N/A'}
    </span>
  );
}

const MARKET_TICKERS = [
  { label: 'NDX',       value: '16,428.82', up: true  },
  { label: 'US10Y',     value: '4.281%',    up: false },
  { label: 'VC VOL Q3', value: '$42.1B',    up: null  },
  { label: 'SAAS MULT', value: '8.4x ARR',  up: null  },
  { label: 'AI MULT',   value: '24.5x ARR', up: true  },
  { label: 'MEDIAN SEED', value: '$12M',    up: true  },
];

export default function Dashboard() {
  const router = useRouter();
  const [portfolio, setPortfolio]             = useState<any>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolioError, setPortfolioError]   = useState<string | null>(null);
  const [meetings, setMeetings]               = useState<any[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsError, setMeetingsError]     = useState<string | null>(null);
  const [outreach, setOutreach]               = useState<any[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(true);
  const [outreachError, setOutreachError]     = useState<string | null>(null);
  const [tick, setTick]                       = useState(0);
  const [filterOpen, setFilterOpen]           = useState(false);
  const [filterSector, setFilterSector]       = useState('All');

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    apiFetch('/api/portfolio')
      .then(d => { setPortfolio(d); setPortfolioLoading(false); })
      .catch(e => { setPortfolioError(e.message); setPortfolioLoading(false); });

    apiFetch('/api/meetings')
      .then(d => { setMeetings(d); setMeetingsLoading(false); })
      .catch(e => { setMeetingsError(e.message); setMeetingsLoading(false); });

    apiFetch('/api/outreach')
      .then(d => { setOutreach(d); setOutreachLoading(false); })
      .catch(e => { setOutreachError(e.message); setOutreachLoading(false); });
  }, []);

  const alerts  = portfolio?.alerts    ?? [];
  const portcos = portfolio?.portfolio ?? [];

  const SECTORS = ['All', 'AI / ML', 'FinTech', 'HealthTech', 'DevTools / Infra', 'Enterprise SaaS'];
  const filteredPortcos = filterSector === 'All' ? portcos : portcos.filter((p: any) => p.sector === filterSector);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes slidein { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:none;} }
        .live-dot { animation: blink 1.8s ease-in-out infinite; }
        .fade-in { animation: slidein 0.4s ease both; }
        .telemetry-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle); }
        .telemetry-row:last-child { border-bottom: none; }
        .log-line { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-muted); display: flex; gap: 12px; padding: 4px 0; }
        .log-timestamp { color: var(--text-secondary); min-width: 65px; }
        .filter-dropdown { position: absolute; top: '100%'; right: 0; background: var(--bg-elevated); border: 1px solid var(--border-highlight); border-radius: 6px; z-index: 100; min-width: 180px; padding: 8px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
      `}</style>

      <div className="dashboard-grid">

        {/* ═══ LEFT COLUMN ════════════════════════════════════════════════════ */}
        <div className="col-stack">

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-header" style={{ padding: '16px 16px 8px 16px', margin: 0 }}>
              <span>Market Pulse (illustrative)</span>
              <span className="live-dot mono" style={{ color: 'var(--accent-emerald)', fontSize: '10px' }}>ILLUSTRATIVE</span>
            </div>
            <div style={{ padding: '0 16px 16px 16px' }}>
              {MARKET_TICKERS.map(t => (
                <div key={t.label} className="flex-between mono" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t.label}</span>
                  <span style={{ color: t.up === true ? 'var(--accent-emerald)' : t.up === false ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                    {t.value}{t.up === true ? ' ▲' : t.up === false ? ' ▼' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ borderLeft: '3px solid var(--accent-red)' }}>
            <div className="panel-header" style={{ color: 'var(--accent-red)' }}>
              <span>Urgent Operations</span>
              {alerts.length > 0 && (
                <span className="mono" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)', padding: '2px 8px', borderRadius: '4px' }}>
                  {alerts.length}
                </span>
              )}
            </div>
            {portfolioLoading ? <LoadingSpinner /> : portfolioError ? <ErrorBanner message={portfolioError} /> : null}
            {alerts.length > 0 ? alerts.slice(0, 3).map((a: any, i: number) => (
              <div key={a.id ?? i} className="fade-in" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  {a.startup_id
                    ? <Link href={`/startups/${a.startup_id}`}><span style={{ fontSize: '13px', fontWeight: 600 }}>{a.startup_name}</span></Link>
                    : <span style={{ fontSize: '13px', fontWeight: 600 }}>{a.startup_name}</span>}
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-red)' }}>PRIORITY: HIGH</span>
                </div>
                <div className="mono text-muted" style={{ fontSize: '11px', marginBottom: '4px' }}>{a.event_type ?? 'Monitoring Event'}</div>
                {a.ai_summary && <div className="text-secondary" style={{ fontSize: '12px', lineHeight: 1.5 }}>{a.ai_summary.slice(0, 80)}{a.ai_summary.length > 80 ? '...' : ''}</div>}
              </div>
            )) : (
              !portfolioLoading && <div className="mono text-muted" style={{ padding: '12px 0' }}>No urgent alerts. Portfolio stable.</div>
            )}
          </div>

          <div className="panel" style={{ borderLeft: '3px solid var(--accent-amber)' }}>
            <div className="panel-header">Portfolio Risk Monitor</div>
            {portfolioLoading ? <LoadingSpinner /> : portfolioError ? <ErrorBanner message={portfolioError} /> : null}
            {filteredPortcos.length > 0 ? (
              <table className="data-table">
                <thead><tr>
                  <th>STARTUP</th>
                  <th style={{ textAlign: 'center' }}>RUNWAY</th>
                  <th style={{ textAlign: 'right' }}>RISK</th>
                </tr></thead>
                <tbody>
                  {filteredPortcos.slice(0, 5).map((p: any, i: number) => (
                    <tr key={p.id ?? i} className="fade-in">
                      <td style={{ fontWeight: 500 }}>
                        {p.startup_id ? <Link href={`/startups/${p.startup_id}`} style={{ color: 'var(--accent-blue)' }}>{p.startup_name}</Link> : p.startup_name}
                      </td>
                      <td className="mono" style={{ textAlign: 'center', color: (p.runway_months ?? 99) < 6 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                        {p.runway_months ?? '?'} mo
                      </td>
                      <td style={{ textAlign: 'right' }}><RiskBadge level={p.risk_level} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !portfolioLoading && <div className="mono text-muted" style={{ padding: '12px 0' }}>No portfolio companies tracked yet</div>
            )}
          </div>
        </div>

        {/* ═══ CENTER COLUMN ═══════════════════════════════════════════════════ */}
        <div className="col-stack">
          <div className="flex-between" style={{ paddingBottom: '12px', position: 'relative' }}>
            <h1 style={{ fontSize: '16px' }}>Intelligence Feed</h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* FILTER BUTTON — opens a sector filter dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  id="dash-filter-btn"
                  className="btn"
                  onClick={() => setFilterOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ⊞ Filter {filterSector !== 'All' && `(${filterSector})`}
                </button>
                {filterOpen && (
                  <div style={{ position: 'absolute', top: '110%', right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-highlight)', borderRadius: '6px', zIndex: 200, minWidth: '180px', padding: '8px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                    {SECTORS.map(s => (
                      <button key={s} onClick={() => { setFilterSector(s); setFilterOpen(false); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 16px', background: filterSector === s ? 'rgba(169,68,37,0.15)' : 'transparent', border: 'none', color: filterSector === s ? 'var(--accent-violet)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* + NEW IC MEMO → /memo */}
              <Link href="/memo" id="dash-new-memo-btn">
                <button className="btn btn-primary">+ New IC Memo</button>
              </Link>
            </div>
          </div>

          <div className="panel panel-elevated fade-in" style={{ borderLeft: '3px solid var(--accent-blue)', padding: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div className="tag" style={{ background: 'rgba(169,68,37,0.1)', color: 'var(--accent-blue)' }}>AI Deal Copilot • Valuation Alert</div>
              <span className="mono text-muted">Demo</span>
            </div>
            <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>
              <Link href="/startups/1" style={{ color: 'inherit' }}>Valuation Misalignment Detected: DataScale Series A</Link>
            </h3>
            <p className="text-secondary" style={{ fontSize: '13px', marginBottom: '16px', lineHeight: 1.6 }}>
              Based on the drafted IC memo, DataScale's proposed $40M pre-money valuation deviates from recent comps. Average AI-infra comps sit around $28M.
            </p>
            <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-main)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>PROPOSED: <span style={{ color: 'var(--text-primary)' }}>$40M</span></div>
              <div style={{ color: 'var(--accent-emerald)' }}>TARGET: $30M (20% OWNERSHIP)</div>
              <div>DELTA: <span style={{ color: 'var(--accent-amber)' }}>25%</span></div>
            </div>
          </div>

          <div className="panel fade-in" style={{ borderLeft: '3px solid var(--accent-emerald)', padding: '24px' }}>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div className="tag" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--accent-emerald)' }}>Network Signal • High Velocity</div>
              <span className="mono text-muted">Demo</span>
            </div>
            <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>
              <Link href="/startups/2" style={{ color: 'inherit' }}>NeuroFlow AI — GitHub Velocity Signal</Link>
            </h3>
            <p className="text-secondary" style={{ fontSize: '13px', marginBottom: '16px', lineHeight: 1.6 }}>
              Repository gained 1,420 stars in 72 hours. Founder previously exited to Stripe. Pre-seed round opening next week.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {/* GENERATE OUTREACH → /outreach */}
              <Link href="/outreach" id="dash-outreach-btn">
                <button className="btn" style={{ borderColor: 'rgba(34,197,94,0.3)', color: 'var(--accent-emerald)' }}>Generate Outreach</button>
              </Link>
              {/* VIEW GRAPH → /graph */}
              <Link href="/graph" id="dash-graph-btn">
                <button className="btn" style={{ borderColor: 'rgba(169,68,37,0.3)', color: 'var(--accent-violet)' }}>View Graph</button>
              </Link>
            </div>
          </div>

          {meetingsLoading ? <LoadingSpinner /> : meetingsError ? <ErrorBanner message={meetingsError} /> : null}
          {meetings.slice(0, 2).map((m: any) => (
            <div key={m.id} className="panel fade-in" style={{ borderLeft: '3px solid var(--accent-violet)', padding: '24px' }}>
              <div className="flex-between" style={{ marginBottom: '16px' }}>
                <div className="tag" style={{ background: 'rgba(169,68,37,0.1)', color: 'var(--accent-violet)' }}>Meeting • {m.meeting_type ?? 'Pitch'}</div>
                <span className="mono text-muted">
                  {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
              <h3 style={{ fontSize: '15px', marginBottom: '8px' }}>
                {m.startup_id ? <Link href={`/startups/${m.startup_id}`} style={{ color: 'inherit' }}>{m.startup_name}</Link> : m.startup_name}
              </h3>
              {m.ai_summary && <p className="text-secondary" style={{ fontSize: '13px', lineHeight: 1.6 }}>{m.ai_summary}</p>}
            </div>
          ))}
        </div>

        {/* ═══ RIGHT COLUMN ════════════════════════════════════════════════════ */}
        <div className="col-stack">

          <div className="panel" style={{ background: 'var(--theme-surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="panel-header" style={{ marginBottom: '16px' }}>
              System Status
              <span className="live-dot mono" style={{ color: 'var(--accent-emerald)' }}>OK</span>
            </div>
            <div style={{ marginBottom: '20px' }}>
              {[
                ['Database Connection', '12ms'],
                ['AI Inference Engine', '450ms'],
                ['Sourcing Agents', 'SIMULATED (14)'],
                ['Background Queue Size', '2 jobs'],
              ].map(([k, v]) => (
                <div key={k} className="telemetry-row">
                  <span className="mono text-secondary">{k}</span>
                  <span className="mono text-primary">{v}</span>
                </div>
              ))}
            </div>
            <div className="panel-header" style={{ marginBottom: '12px', border: 'none', padding: 0 }}>Raw Job Logs</div>
            <div style={{ background: 'var(--theme-raised)', padding: '12px', borderRadius: '4px', height: '140px', overflowY: 'auto', border: '1px solid var(--border-subtle)' }}>
              <div className="log-line"><span className="log-timestamp">21:24:01</span><span style={{ color: 'var(--accent-blue)' }}>[INFO]</span><span>Worker ping successful.</span></div>
              <div className="log-line"><span className="log-timestamp">21:24:18</span><span style={{ color: 'var(--accent-emerald)' }}>[SYNC]</span><span>Illustrative sync event (not connected).</span></div>
              <div className="log-line"><span className="log-timestamp">21:25:05</span><span style={{ color: 'var(--accent-blue)' }}>[INFO]</span><span>Founders graph rebuild triggered.</span></div>
              <div className="log-line"><span className="log-timestamp">21:26:12</span><span style={{ color: 'var(--accent-amber)' }}>[WARN]</span><span>Illustrative job log; no LinkedIn connection.</span></div>
              <div className="log-line"><span className="log-timestamp">21:27:{tick.toString().padStart(2, '0')}</span><span style={{ color: 'var(--accent-blue)' }}>[POLL]</span><span className="live-dot">Awaiting new jobs...</span></div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">Active Workflows</div>
            {meetingsLoading ? <LoadingSpinner /> : meetingsError ? <ErrorBanner message={meetingsError} /> : null}
            {meetings.length > 0 ? meetings.slice(0, 2).map((m: any) => (
              <div key={m.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex-between" style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{m.startup_name}</span>
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{m.meeting_type}</span>
                </div>
                <div className="text-secondary" style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '8px' }}>
                  {m.ai_summary ? m.ai_summary.slice(0, 60) + '...' : 'Awaiting transcript analysis.'}
                </div>
                <Link href="/meetings"><button className="btn" style={{ width: '100%' }}>Resume Workflow</button></Link>
              </div>
            )) : (
              !meetingsLoading && <div className="mono text-muted" style={{ padding: '12px 0' }}>No active workflows.</div>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">Outreach Queue</div>
            {outreachLoading ? <LoadingSpinner /> : outreachError ? <ErrorBanner message={outreachError} /> : null}
            {outreach.length > 0 ? outreach.slice(0, 3).map((e: any) => (
              <div key={e.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex-between" style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{e.startup_name}</span>
                  {e.replied_at
                    ? <span className="tag" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--accent-emerald)' }}>REPLIED</span>
                    : e.opened_at
                      ? <span className="tag" style={{ background: 'rgba(169,68,37,0.1)', color: 'var(--accent-blue)' }}>OPENED</span>
                      : <span className="tag" style={{ background: 'var(--bg-main)', color: 'var(--text-muted)' }}>SENT</span>}
                </div>
                <div className="mono text-secondary" style={{ fontSize: '11px', marginBottom: '4px' }}>To: {e.founder_name}</div>
                <div className="text-muted" style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || 'No Subject'}</div>
              </div>
            )) : (
              !outreachLoading && <div className="mono text-muted" style={{ padding: '12px 0' }}>Queue empty.</div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
