'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';

interface Startup {
  id: number;
  name: string;
  sector: string;
  stage: string;
  description: string;
  revenue_arr: string;
  revenue_growth_pct: string;
  ai_score: number;
  valuation: string;
}

export default function ReturnModeler() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
  const [loading, setLoading] = useState(true);

  // Modeling States
  const [investmentM, setInvestmentM] = useState<number>(2); // in Millions
  const [preMoneyM, setPreMoneyM] = useState<number>(10); // in Millions
  const [dilutionPct, setDilutionPct] = useState<number>(20); // 20%
  const [exitValueM, setExitValueM] = useState<number>(1000); // 1 Billion

  useEffect(() => {
    apiFetch('/api/startups')
      
      .then(data => {
        setStartups(data);
        if (data.length > 0) setSelectedStartup(data[0]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Calculations
  const postMoneyM = preMoneyM + investmentM;
  const initialOwnershipPct = (investmentM / postMoneyM) * 100;
  const finalOwnershipPct = initialOwnershipPct * (1 - (dilutionPct / 100));
  const payoutM = exitValueM * (finalOwnershipPct / 100);
  const multiple = investmentM > 0 ? (payoutM / investmentM) : 0;

  const formatM = (val: number) => {
    if (val >= 1000) return `$${(val / 1000).toFixed(2)}B`;
    return `$${val.toLocaleString()}M`;
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>Cap Table & Return Modeler</h1>
        <div className="mono text-muted">MODULE: INVESTMENT SCENARIO SIMULATION & TRACKING</div>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          LOADING FINANCIAL MODELS...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          {/* Left Column: Tracking & Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Startup Tracking Information */}
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '12px' }}>Startup Intelligence & Tracking</div>
              
              <div style={{ marginBottom: '16px' }}>
                <select 
                  value={selectedStartup?.id || ''}
                  onChange={e => {
                    const found = startups.find(s => s.id === parseInt(e.target.value));
                    if (found) setSelectedStartup(found);
                  }}
                  style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', padding: '8px', fontSize: '12px', outline: 'none' }}
                >
                  {startups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {selectedStartup && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '10px' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '4px' }}>SECTOR / STAGE</div>
                    <div style={{ fontSize: '11px', fontWeight: 600 }}>{selectedStartup.sector} • {selectedStartup.stage}</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '10px' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '4px' }}>AI SCORE</div>
                    <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-emerald)' }}>{selectedStartup.ai_score}/100</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '10px' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '4px' }}>TRACTION (ARR)</div>
                    <div className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-cyan)' }}>{selectedStartup.revenue_arr}</div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '10px' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '4px' }}>ASKING VALUATION</div>
                    <div className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>{selectedStartup.valuation || 'Not Disclosed'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '10px' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '4px' }}>BUSINESS SUMMARY</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selectedStartup.description}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modeler Inputs */}
            <div className="panel" style={{ borderLeft: '2px solid var(--accent-blue)' }}>
              <div className="panel-header" style={{ marginBottom: '16px' }}>Scenario Parameters</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span className="mono text-secondary" style={{ fontSize: '10px' }}>INVESTMENT AMOUNT</span>
                    <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: '11px' }}>{formatM(investmentM)}</span>
                  </div>
                  <input type="range" min="0.1" max="50" step="0.1" value={investmentM} onChange={e => setInvestmentM(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }} />
                </div>

                <div>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span className="mono text-secondary" style={{ fontSize: '10px' }}>PRE-MONEY VALUATION</span>
                    <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '11px' }}>{formatM(preMoneyM)}</span>
                  </div>
                  <input type="range" min="1" max="200" step="1" value={preMoneyM} onChange={e => setPreMoneyM(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--text-primary)', cursor: 'pointer' }} />
                </div>

                <div style={{ padding: '10px', background: 'var(--bg-main)', border: '1px dashed var(--border-subtle)', margin: '8px 0' }}>
                  <div className="flex-between mono" style={{ fontSize: '10px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>IMPLIED POST-MONEY</span>
                    <span>{formatM(postMoneyM)}</span>
                  </div>
                  <div className="flex-between mono" style={{ fontSize: '10px', marginTop: '4px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>INITIAL OWNERSHIP</span>
                    <span style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{initialOwnershipPct.toFixed(2)}%</span>
                  </div>
                </div>

                <div>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span className="mono text-secondary" style={{ fontSize: '10px' }}>EXPECTED FUTURE DILUTION</span>
                    <span className="mono" style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: '11px' }}>{dilutionPct}%</span>
                  </div>
                  <input type="range" min="0" max="60" step="1" value={dilutionPct} onChange={e => setDilutionPct(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-amber)', cursor: 'pointer' }} />
                </div>

                <div>
                  <div className="flex-between" style={{ marginBottom: '6px' }}>
                    <span className="mono text-secondary" style={{ fontSize: '10px' }}>TARGET EXIT VALUE</span>
                    <span className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 600, fontSize: '11px' }}>{formatM(exitValueM)}</span>
                  </div>
                  <input type="range" min="10" max="10000" step="50" value={exitValueM} onChange={e => setExitValueM(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }} />
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Visualization Output */}
          <div className="col-stack">
            <div className="panel panel-elevated" style={{ height: '100%', borderTop: '4px solid var(--accent-emerald)', display: 'flex', flexDirection: 'column' }}>
              <div className="panel-header" style={{ textAlign: 'center', marginBottom: '24px' }}>Return Simulation Outcome</div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '32px' }}>
                
                {/* Big Multiple Number */}
                <div style={{ textAlign: 'center' }}>
                  <div className="mono text-muted" style={{ fontSize: '10px', letterSpacing: '0.1em', marginBottom: '8px' }}>CASH-ON-CASH RETURN</div>
                  <div className="mono" style={{ fontSize: '64px', fontWeight: 800, color: 'var(--accent-emerald)', lineHeight: 1 }}>
                    {multiple.toFixed(1)}x
                  </div>
                  <div className="mono text-secondary" style={{ fontSize: '11px', marginTop: '12px' }}>
                    FINAL OWNERSHIP AT EXIT: <span style={{ color: 'var(--accent-blue)' }}>{finalOwnershipPct.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Visual Waterfall Box */}
                <div style={{ width: '100%', maxWidth: '350px', background: 'var(--theme-surface)', border: '1px solid var(--border-subtle)', padding: '20px', borderRadius: '4px' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '11px' }}>
                    <span className="mono text-muted">INVESTED CAPITAL</span>
                    <span className="mono" style={{ color: 'var(--text-primary)' }}>{formatM(investmentM)}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-elevated)', marginBottom: '24px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '10%', background: 'var(--text-primary)' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span className="mono text-muted" style={{ color: 'var(--accent-emerald)' }}>GROSS PAYOUT</span>
                    <span className="mono" style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>{formatM(payoutM)}</span>
                  </div>
                  <div style={{ width: '100%', height: '12px', background: 'var(--bg-elevated)', marginBottom: '16px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(100, (payoutM / (investmentM * 50)) * 100)}%`, 
                      background: 'var(--accent-emerald)',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                  
                  <div className="mono text-muted" style={{ fontSize: '9px', textAlign: 'center', marginTop: '16px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '16px' }}>
                    PROFIT: <span style={{ color: 'var(--accent-emerald)' }}>{formatM(payoutM - investmentM)}</span>
                  </div>
                </div>

              </div>

              <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%', fontSize: '11px', padding: '10px' }}>
                ATTACH SIMULATION TO IC MEMO
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
