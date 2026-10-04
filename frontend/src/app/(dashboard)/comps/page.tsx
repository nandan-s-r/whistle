'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CompRow {
  id: number;
  name: string;
  sector: string;
  stage: string;
  arr: string;
  growth: string;
  implied_valuation: string;
  multiple: string;
  rule_of_40: string;
  verdict: string;
}

export default function CompsEngine() {
  const [comps, setComps] = useState<CompRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Calculator states
  const [preMoney, setPreMoney] = useState<number>(30);
  const [raiseSize, setRaiseSize] = useState<number>(5);
  const [arr, setArr] = useState<number>(2.5);

  useEffect(() => {
    apiFetch('/api/comps')
      
      .then(data => {
        setComps(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Calculations
  const postMoney = preMoney + raiseSize;
  const dilution = postMoney > 0 ? (raiseSize / postMoney) * 100 : 0;
  const impliedMultiple = arr > 0 ? (preMoney / arr) : 0;

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>Multiples & Trading Comparables</h1>
          <div className="mono text-muted">MODULE: VALUATION BENCHMARKS • REFERENCE DATABASE: ACTIVE</div>
        </div>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          LOADING VALUATION COEFFICIENTS...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Main Comps Table */}
          <div className="panel">
            <div className="panel-header">Comparable Software Transactions</div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>NAME</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>SECTOR</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>STAGE</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>ARR</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>GROWTH</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>MULTIPLE</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>RULE OF 40</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>IMPLIED VAL</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px', textAlign: 'right' }}>VERDICT</th>
                </tr>
              </thead>
              <tbody>
                {comps.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }} className="hover-row">
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>
                      <Link href={`/startups/${row.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'underline', textDecorationColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}>
                        {row.name}
                      </Link>
                    </td>
                    <td style={{ padding: '8px 4px' }}>{row.sector}</td>
                    <td style={{ padding: '8px 4px' }}>{row.stage}</td>
                    <td className="mono" style={{ padding: '8px 4px' }}>{row.arr}</td>
                    <td className="mono" style={{ padding: '8px 4px', color: 'var(--accent-emerald)' }}>{row.growth}</td>
                    <td className="mono" style={{ padding: '8px 4px', fontWeight: 600 }}>{row.multiple}</td>
                    <td className="mono" style={{ padding: '8px 4px' }}>{row.rule_of_40}</td>
                    <td className="mono" style={{ padding: '8px 4px' }}>{row.implied_valuation}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                      <span className="mono tag" style={{ 
                        background: row.verdict === 'INVEST' || row.verdict === 'STRONG INVEST' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                        color: row.verdict === 'INVEST' || row.verdict === 'STRONG INVEST' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                      }}>
                        {row.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pricing Calculator Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            
            <div className="panel panel-elevated" style={{ borderLeft: '2px solid var(--accent-blue)' }}>
              <div className="panel-header">Pre/Post Money Dilution Calculator</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>ARR ($M)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', fontSize: '11px', outline: 'none' }}
                    value={arr}
                    onChange={(e) => setArr(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>PRE-MONEY VALUATION ($M)</label>
                  <input 
                    type="number" 
                    style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', fontSize: '11px', outline: 'none' }}
                    value={preMoney}
                    onChange={(e) => setPreMoney(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>RAISE SIZE ($M)</label>
                  <input 
                    type="number" 
                    style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '6px', fontSize: '11px', outline: 'none' }}
                    value={raiseSize}
                    onChange={(e) => setRaiseSize(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="mono" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'var(--bg-main)', padding: '12px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <div>
                  <div className="text-muted" style={{ fontSize: '9px' }}>POST-MONEY</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>${postMoney.toFixed(2)}M</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '9px' }}>DILUTION</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-red)' }}>{dilution.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: '9px' }}>ARR MULTIPLE</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-emerald)' }}>{impliedMultiple.toFixed(1)}x</div>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">Multiple Benchmarks (Q3)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
                <div className="flex-between">
                  <span className="text-secondary">AI Infrastructure</span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>20.0x - 30.0x</span>
                </div>
                <div className="flex-between">
                  <span className="text-secondary">Enterprise B2B SaaS</span>
                  <span className="mono" style={{ fontWeight: 600 }}>8.0x - 12.0x</span>
                </div>
                <div className="flex-between">
                  <span className="text-secondary">FinTech Ledgers</span>
                  <span className="mono" style={{ fontWeight: 600 }}>6.0x - 9.0x</span>
                </div>
                <div className="flex-between">
                  <span className="text-secondary">eBPF / Cybersecurity Dev</span>
                  <span className="mono" style={{ fontWeight: 600 }}>12.0x - 16.0x</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
