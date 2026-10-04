'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Scorecard {
  id: number;
  startup_id?: number;
  startup_name: string;
  dimensions: { [key: string]: number };
  total_score: number;
  verdict: string;
  rationale: string;
}

export default function AIScoringEngine() {
  const [scores, setScores] = useState<Scorecard[]>([]);
  const [selectedScore, setSelectedScore] = useState<Scorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');
  
  // Custom weights simulation state
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    apiFetch('/api/scores')
      
      .then(data => {
        setScores(data);
        if (data.length > 0) {
          setSelectedScore(data[0]);
          // Initialize weights with default 1.0
          const firstScore = data[0];
          const initialWeights: Record<string, number> = {};
          Object.keys(firstScore.dimensions).forEach(dim => {
            initialWeights[dim] = 1.0;
          });
          setWeights(initialWeights);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleWeightChange = (dimension: string, value: number) => {
    setWeights(prev => ({
      ...prev,
      [dimension]: value
    }));
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict?.toUpperCase()) {
      case 'STRONG INVEST':
      case 'INVEST':
        return 'var(--accent-emerald)';
      case 'STRONG MAYBE':
      case 'MAYBE':
        return 'var(--accent-amber)';
      default:
        return 'var(--accent-red)';
    }
  };

  // Math simulation for dynamic adjusted score
  const getSimulatedScore = (scorecard: Scorecard) => {
    let totalWeightedPoints = 0;
    let totalWeights = 0;
    
    Object.entries(scorecard.dimensions).forEach(([dim, val]) => {
      const weight = weights[dim] ?? 1.0;
      totalWeightedPoints += val * weight;
      totalWeights += weight;
    });

    if (totalWeights === 0) return 0;
    const rawVal = (totalWeightedPoints / totalWeights) * 10;
    return Math.round(rawVal);
  };

  const getSortedScores = () => {
    const sorted = [...scores];
    if (sortBy === 'score') {
      return sorted.sort((a, b) => b.total_score - a.total_score);
    } else {
      return sorted.sort((a, b) => a.startup_name.localeCompare(b.startup_name));
    }
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>AI Scoring Engine</h1>
        <div className="mono text-muted">MODULE: 100-POINT MULTI-DIMENSIONAL SCORECARD • ENGINE: PROPRIETARY EVALUATION MATRIX</div>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          COMPILING RISK-ADJUSTED SCORECARDS...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '12px' }}>
          
          {/* Left Column: Startup Selector */}
          <div className="panel" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="flex-between panel-header" style={{ marginBottom: '6px' }}>
              <span>Evaluation Targets</span>
              
              {/* Sort selector */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  onClick={() => setSortBy('score')}
                  className="mono btn"
                  style={{ fontSize: '8px', padding: '2px 4px', background: sortBy === 'score' ? 'var(--bg-elevated)' : 'transparent' }}
                >
                  SCORE
                </button>
                <button 
                  onClick={() => setSortBy('name')}
                  className="mono btn"
                  style={{ fontSize: '8px', padding: '2px 4px', background: sortBy === 'name' ? 'var(--bg-elevated)' : 'transparent' }}
                >
                  A-Z
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {getSortedScores().map((sc) => {
                const simulated = getSimulatedScore(sc);
                const hasChanged = simulated !== sc.total_score;
                return (
                  <div 
                    key={sc.id}
                    onClick={() => setSelectedScore(sc)}
                    style={{
                      padding: '8px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      background: selectedScore?.id === sc.id ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                      borderColor: selectedScore?.id === sc.id ? 'var(--text-primary)' : 'var(--border-subtle)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '11px' }}>{sc.startup_name}</span>
                      {sc.startup_id && (
                        <Link 
                          href={`/startups/${sc.startup_id}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: 'var(--accent-blue)', fontSize: '9px', textDecoration: 'underline' }}
                        >
                          Workspace ↗
                        </Link>
                      )}
                    </div>
                    <div className="flex-between mono" style={{ fontSize: '9px' }}>
                      <span style={{ color: getVerdictColor(sc.verdict) }}>{sc.verdict}</span>
                      <span>
                        {hasChanged ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: '4px' }}>{sc.total_score}</span>
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{simulated}</span>
                          </>
                        ) : (
                          `${sc.total_score}/100`
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Scorecard Matrix */}
          <div className="col-stack">
            {selectedScore ? (
              <div className="panel panel-elevated" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto', borderLeft: `2px solid ${getVerdictColor(selectedScore.verdict)}`, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                
                {/* Main dimension detail column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: '16px', margin: 0 }}>{selectedScore.startup_name} Scorecard</h2>
                    <div className="mono text-muted" style={{ fontSize: '8px' }}>SECURE TELEMETRY SCORE REPORT</div>
                  </div>

                  <div className="panel-header" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>Evaluation Dimension Vectors</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(selectedScore.dimensions).map(([dim, val]) => {
                      const weight = weights[dim] ?? 1.0;
                      return (
                        <div key={dim} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)' }}>
                          <div className="flex-between" style={{ fontSize: '10px' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{dim}</span>
                            <span className="mono" style={{ fontWeight: 600 }}>
                              {val} / 10 <span style={{ color: 'var(--text-muted)', fontSize: '8px' }}>(w: {weight.toFixed(1)})</span>
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'var(--bg-surface)' }}>
                            <div 
                              style={{ 
                                height: '100%', 
                                background: val >= 8 ? 'var(--accent-emerald)' : val >= 6 ? 'var(--accent-amber)' : 'var(--accent-red)',
                                width: `${val * 10}%`
                              }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="panel-header" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>Investment Thesis & Rationale</div>
                  <p className="text-secondary" style={{ fontSize: '11px', lineHeight: 1.6, background: 'var(--bg-main)', padding: '10px', border: '1px solid var(--border-subtle)', margin: 0 }}>
                    {selectedScore.rationale}
                  </p>
                </div>

                {/* Weights Tuning Simulator Sidebar */}
                <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: 'var(--theme-surface)', border: '1px solid var(--border-subtle)', padding: '10px', textAlign: 'center', marginBottom: '8px' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '4px' }}>CALCULATED SCORE</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '4px' }}>
                      <div className="mono" style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1 }}>
                        {getSimulatedScore(selectedScore)}
                      </div>
                      <span className="mono text-muted" style={{ fontSize: '11px' }}>/100</span>
                    </div>

                    <div className="mono" style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      BASELINE SCORE: {selectedScore.total_score}
                    </div>
                  </div>

                  <div className="panel-header" style={{ fontSize: '9px', letterSpacing: '0.08em', display: 'flex', justifyContent: 'space-between' }}>
                    <span>DIMENSION WEIGHTS TUNER</span>
                    <button 
                      className="mono" 
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', fontSize: '8px' }}
                      onClick={() => {
                        const reset: Record<string, number> = {};
                        Object.keys(selectedScore.dimensions).forEach(k => reset[k] = 1.0);
                        setWeights(reset);
                      }}
                    >
                      RESET
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', maxHeight: '340px' }} className="mono">
                    {Object.keys(selectedScore.dimensions).map(dim => {
                      const weightVal = weights[dim] ?? 1.0;
                      return (
                        <div key={dim} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div className="flex-between" style={{ fontSize: '8px', color: 'var(--text-muted)' }}>
                            <span style={{ textTransform: 'uppercase' }}>{dim}</span>
                            <span style={{ color: 'var(--accent-cyan)' }}>{weightVal.toFixed(1)}x</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="3"
                            step="0.5"
                            value={weightVal}
                            onChange={e => handleWeightChange(dim, parseFloat(e.target.value))}
                            style={{ 
                              width: '100%', 
                              accentColor: 'var(--accent-cyan)',
                              background: 'var(--bg-elevated)',
                              height: '4px',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                SELECT A STARTUP TO INSPECT MULTI-DIMENSIONAL SCORECARD
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
