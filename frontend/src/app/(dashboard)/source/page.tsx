'use client';

import { apiFetch } from '@/lib/apiClient';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AddStartupModal from '@/components/AddStartupModal';

interface Lead {
  id: number;
  company_name: string;
  website: string;
  description: string;
  source: string;
  signal_score: number;
  status: string;
  discovered_at: string;
}

type CrawlerState = 'idle' | 'warming' | 'running' | 'done' | 'error';

export default function DealSourcing() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [loading, setLoading]           = useState(true);
  const [crawlerState, setCrawlerState] = useState<CrawlerState>('idle');
  const [errorMsg, setErrorMsg]         = useState('');
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [toast, setToast]               = useState('');
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const refreshLeads = useCallback(() => {
    apiFetch('/api/leads')
      .then(data => { setLeads(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { refreshLeads(); }, [refreshLeads]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

  const handleCrawl = async () => {
    if (crawlerState === 'running' || crawlerState === 'warming') return;

    setCrawlerState('warming');
    setErrorMsg('');

    try {
      // POST to start crawlers — if backend is cold this may take 30-60s
      await apiFetch('/api/sourcing/run', { method: 'POST' });
      setCrawlerState('running');

      // Poll every 4 seconds for up to 60 seconds (15 attempts)
      let attempts = 0;
      const initialCount = leads.length;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const fresh = await apiFetch('/api/leads');
          const freshLeads = Array.isArray(fresh) ? fresh : [];
          setLeads(freshLeads);

          if (freshLeads.length > initialCount || attempts >= 15) {
            clearInterval(poll);
            setCrawlerState('done');
            if (freshLeads.length > initialCount) {
              showToast(`✓ ${freshLeads.length - initialCount} new leads added to queue.`);
            } else {
              showToast('Demo load finished. Existing fictional fixtures were deduplicated.');
            }
          }
        } catch (_) {
          // Backend may briefly restart — keep polling
        }
      }, 4000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Demo load failed';
      setCrawlerState('error');
      setErrorMsg(msg);
    }
  };

  const handleConvert = async (lead: Lead) => {
    setConvertingId(lead.id);
    try {
      await apiFetch('/api/startups', {
        method: 'POST',
        body: JSON.stringify({
          name: lead.company_name,
          website: lead.website,
          description: lead.description,
          sector: 'Unclassified',
          stage: 'Sourced',
          pipeline_stage: 'Sourced',
        }),
      });
      // Mark lead as converted
      await apiFetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Converted' }),
      });
      showToast(`✓ "${lead.company_name}" added to Startups Database.`);
      refreshLeads();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Conversion failed';
      showToast(`✗ Failed: ${msg}`);
    } finally {
      setConvertingId(null);
    }
  };

  const getSignalColor = (score: number) => {
    if (score >= 90) return 'var(--accent-emerald)';
    if (score >= 80) return 'var(--accent-blue)';
    return 'var(--accent-violet)';
  };

  const crawlerLabel = {
    idle:    'LOAD DEMO LEADS',
    warming: '⏳ WAKING BACKEND...',
    running: '⟳ LOADING DEMO LEADS...',
    done:    '✓ COMPLETED — RUN AGAIN',
    error:   '✗ RETRY DEMO LOAD',
  }[crawlerState];

  const crawlerColor = {
    idle:    undefined,
    warming: 'var(--accent-amber)',
    running: 'var(--accent-emerald)',
    done:    'var(--accent-emerald)',
    error:   'var(--accent-red)',
  }[crawlerState];

  return (
    <div style={{ padding: '12px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fade-in { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:none;} } .fade-in { animation: fade-in 0.3s ease both; }`}</style>

      {/* Header */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>Illustrative lead queue</h1>
          <p className="mono text-muted" style={{ fontSize: '12px' }}>Fictional fixtures and manual leads. No external crawling or LinkedIn connection.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" id="source-manual-btn" onClick={() => setIsModalOpen(true)}>
            + MANUAL ENTRY
          </button>
          <button
            id="source-run-crawlers-btn"
            className="btn btn-primary"
            onClick={handleCrawl}
            disabled={crawlerState === 'warming' || crawlerState === 'running'}
            style={{
              fontSize: '11px',
              background: crawlerState === 'idle' || crawlerState === 'done' ? undefined : 'var(--theme-raised)',
              color: crawlerColor,
              borderColor: crawlerColor,
            }}
          >
            {crawlerLabel}
          </button>
        </div>
      </div>

      {/* State banners */}
      {crawlerState === 'warming' && (
        <div className="mono" style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', fontSize: '12px', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', border: '2px solid var(--accent-amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          WAKING BACKEND... Render free tier takes 30-60 seconds to start. Please wait.
        </div>
      )}
      {crawlerState === 'running' && (
        <div className="mono" style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '4px', fontSize: '12px', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', border: '2px solid var(--accent-emerald)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          LOADING FICTIONAL DEMO FIXTURES — no external sources are being retrieved...
        </div>
      )}
      {crawlerState === 'error' && (
        <div className="mono" style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px', fontSize: '12px', color: 'var(--accent-red)' }}>
          ✗ CRAWLER ERROR: {errorMsg} — Click "RETRY DEMO LOAD" to try again.
        </div>
      )}
      {toast && (
        <div className="mono fade-in" style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px', fontSize: '12px', color: 'var(--accent-emerald)', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
        <div className="panel" style={{ borderLeft: '2px solid var(--accent-blue)' }}>
          <div className="mono text-muted" style={{ fontSize: '9px' }}>GITHUB TRACKER</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>{leads.length} leads tracked</span>
            <span className="mono" style={{ color: 'var(--accent-emerald)', fontSize: '9px' }}>LIVE</span>
          </div>
        </div>
        <div className="panel" style={{ borderLeft: '2px solid var(--accent-violet)' }}>
          <div className="mono text-muted" style={{ fontSize: '9px' }}>HACKER NEWS MONITORS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>2,410 companies scraped</span>
            <span className="mono" style={{ color: 'var(--accent-emerald)', fontSize: '9px' }}>ONLINE</span>
          </div>
        </div>
        <div className="panel" style={{ borderLeft: '2px solid var(--accent-amber)' }}>
          <div className="mono text-muted" style={{ fontSize: '9px' }}>FOUNDER NETWORKS</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>38 talent nodes mapped</span>
            <span className="mono" style={{ color: 'var(--accent-blue)', fontSize: '9px' }}>8 alerts</span>
          </div>
        </div>
      </div>

      {/* Leads table */}
      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', border: '2px solid var(--accent-violet)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            LOADING LEAD DATABASE...
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-header">
            Raw Sourcing Signal Leads Queue
            <span className="mono" style={{ color: 'var(--accent-blue)', fontSize: '9px' }}>{leads.length} SIGNALS</span>
          </div>

          {leads.length === 0 && (
            <div className="mono text-muted" style={{ textAlign: 'center', padding: '40px 20px' }}>
              No leads yet. Click <strong style={{ color: 'var(--accent-emerald)' }}>LOAD DEMO LEADS</strong> to discover top 1% founders from LinkedIn & Twitter, or use <strong>+ MANUAL ENTRY</strong>.
            </div>
          )}

          {leads.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th className="mono" style={{ padding: '8px 6px', fontSize: '10px' }}>COMPANY</th>
                  <th className="mono" style={{ padding: '8px 6px', fontSize: '10px' }}>SOURCE</th>
                  <th className="mono" style={{ padding: '8px 6px', fontSize: '10px' }}>DESCRIPTION</th>
                  <th className="mono" style={{ padding: '8px 6px', fontSize: '10px' }}>SIGNAL</th>
                  <th className="mono" style={{ padding: '8px 6px', fontSize: '10px' }}>STATUS</th>
                  <th className="mono" style={{ padding: '8px 6px', fontSize: '10px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 6px', fontWeight: 600 }}>
                      <a href={l.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>
                        {l.company_name}
                      </a>
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <span className="mono" style={{ fontSize: '9px', background: 'var(--bg-main)', padding: '2px 6px', border: '1px solid var(--border-subtle)' }}>
                        {l.source}
                      </span>
                    </td>
                    <td className="text-secondary" style={{ padding: '10px 6px', fontSize: '11px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.description}
                    </td>
                    <td className="mono" style={{ padding: '10px 6px', color: getSignalColor(l.signal_score), fontWeight: 700, fontSize: '13px' }}>
                      {l.signal_score}
                    </td>
                    <td style={{ padding: '10px 6px' }}>
                      <span className="mono" style={{
                        fontSize: '9px', padding: '2px 6px',
                        background: l.status === 'New' ? 'rgba(169,68,37,0.08)' : 'var(--bg-main)',
                        color: l.status === 'New' ? 'var(--accent-blue)' : l.status === 'Screening' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn"
                          style={{ fontSize: '9px', color: 'var(--accent-emerald)', borderColor: 'rgba(16,185,129,0.3)' }}
                          onClick={() => handleConvert(l)}
                          disabled={convertingId === l.id}
                          title="Convert this lead to a Startup record"
                        >
                          {convertingId === l.id ? '...' : '→ STARTUP'}
                        </button>
                        <Link href="/outreach">
                          <button className="btn" style={{ fontSize: '9px', color: 'var(--accent-violet)', borderColor: 'rgba(169,68,37,0.3)' }}>
                            OUTREACH
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <AddStartupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refreshLeads();
          showToast('Manual entry saved successfully.');
        }}
      />
    </div>
  );
}
