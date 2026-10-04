'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PortfolioRisk {
  id: number;
  startup_id?: number;
  startup_name: string;
  current_valuation: string;
  current_ownership: number;
  runway_months: number;
  burn_rate: string;
  risk_level: string;
  last_update: string;
}

interface CostAlert {
  id: number;
  startup_id?: number;
  startup_name: string;
  event_type: string;
  event_data: { [key: string]: any };
  ai_summary: string;
  importance_score: number;
  detected_at: string;
}

export default function RiskEngine() {
  const [portfolio, setPortfolio] = useState<PortfolioRisk[]>([]);
  const [alerts, setAlerts] = useState<CostAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchedId, setDispatchedId] = useState<number | null>(null);

  useEffect(() => {
    apiFetch('/api/portfolio')
      
      .then(data => {
        setPortfolio(data.portfolio);
        setAlerts(data.alerts);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return 'var(--accent-red)';
      case 'MEDIUM':
      case 'WARN':
        return 'var(--accent-amber)';
      default:
        return 'var(--accent-emerald)';
    }
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>Risk Monitoring Engine</h1>
          <div className="mono text-muted">MODULE: PORTFOLIO TELEMETRY & COST ANOMALIES • ACTIVE CRON</div>
        </div>
        <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-red)' }}>
          ● SYSTEM RUNNING AT RISK LEVEL: SIGNIFICANT
        </div>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          PARSING FINANCIAL BURNS & AWS COMPUTE LOGS...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          
          {/* Left Column: Cost & Operation Alerts */}
          <div className="col-stack">
            <div className="panel" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <div className="panel-header" style={{ color: 'var(--accent-red)', borderBottomColor: 'rgba(225,29,72,0.1)' }}>
                Active Operational Risk Alerts
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {alerts.map((a) => (
                  <div key={a.id} className="panel" style={{ background: 'var(--bg-main)', borderLeft: '2px solid var(--accent-red)', padding: '10px' }}>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <span className="mono" style={{ color: 'var(--accent-red)', fontWeight: 600 }}>[{a.event_type}]</span>
                      <span className="mono text-muted" style={{ fontSize: '9px' }}>{new Date(a.detected_at).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>
                      {a.startup_id ? (
                        <Link href={`/startups/${a.startup_id}`} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}>
                          {a.startup_name}
                        </Link>
                      ) : (
                        a.startup_name
                      )}
                    </div>
                    <p className="text-secondary" style={{ fontSize: '11px', marginBottom: '8px', lineHeight: 1.4 }}>{a.ai_summary}</p>
                    
                    <div className="mono" style={{ display: 'flex', gap: '12px', background: 'var(--bg-surface)', padding: '6px', fontSize: '9px', border: '1px solid var(--border-subtle)' }}>
                      {Object.entries(a.event_data).map(([key, val]) => (
                        <div key={key}>
                          <span className="text-muted">{key.toUpperCase()}:</span> {val}
                        </div>
                      ))}
                    </div>

                    <button 
                      className="btn" 
                      style={{ marginTop: '8px', fontSize: '9px', color: dispatchedId === a.id ? 'var(--accent-emerald)' : 'var(--accent-red)', borderColor: dispatchedId === a.id ? 'rgba(16,185,129,0.3)' : 'rgba(225,29,72,0.2)' }}
                      onClick={() => setDispatchedId(a.id)}
                    >
                      {dispatchedId === a.id ? '✓ PROTOCOL DISPATCHED' : 'DISPATCH INTERVENTION PROTOCOL'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Runway Monitor Ledger */}
          <div className="col-stack">
            <div className="panel" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <div className="panel-header">Portfolio Runway & Burn Matrix</div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>STARTUP</th>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>RUNWAY</th>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>BURN RATE</th>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px', textAlign: 'right' }}>SEVERITY</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="hover-row">
                      <td style={{ padding: '8px 4px', fontWeight: 600 }}>
                        {p.startup_id ? (
                          <Link href={`/startups/${p.startup_id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'underline', textDecorationColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}>
                            {p.startup_name}
                          </Link>
                        ) : (
                          p.startup_name
                        )}
                      </td>
                      <td className="mono" style={{ padding: '8px 4px', color: p.runway_months <= 6 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                        {p.runway_months} months
                      </td>
                      <td className="mono" style={{ padding: '8px 4px' }}>{p.burn_rate}/mo</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                        <span className="mono" style={{ color: getRiskColor(p.risk_level), fontWeight: 700 }}>
                          {p.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
