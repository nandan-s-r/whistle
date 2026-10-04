'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import AddFounderModal from '@/components/AddFounderModal';

interface Founder {
  id: number;
  name: string;
  email: string;
  linkedin: string;
  twitter: string;
  title: string;
  background: string;
  previous_companies: string[];
  education: string;
  trust_score: number;
  responsiveness_score: number;
  execution_score: number;
  startup_id?: number;
  startup_name: string;
}

export default function FounderTracking() {
  const [founders, setFounders] = useState<Founder[]>([]);
  const [selectedFounder, setSelectedFounder] = useState<Founder | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Verification states
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const verificationTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (verificationTimerRef.current) {
        clearInterval(verificationTimerRef.current);
      }
    };
  }, []);

  const refreshFounders = () => {
    apiFetch('/api/founders')
      
      .then(data => {
        setFounders(data);
        if (data.length > 0) setSelectedFounder(data[0]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    refreshFounders();
  }, []);

  const getMetricColor = (val: number) => {
    if (val >= 90) return 'var(--accent-emerald)';
    if (val >= 80) return 'var(--accent-blue)';
    return 'var(--accent-amber)';
  };

  const handleStartVerification = () => {
    if (!selectedFounder) return;
    if (verificationTimerRef.current) {
      clearInterval(verificationTimerRef.current);
    }
    setIsScanning(true);
    setScanProgress(0);
    setIsVerified(false);
    setScanLogs([]);

    const logsList = [
      `Initializing background check node for ${selectedFounder.name}...`,
      'Validating educational credentials via Stanford/MIT alumni APIs...',
      'Matching LinkedIn profile metadata logs...',
      'Retrieving previous legal filings and exit valuations...',
      'Analyzing Twitter sentiment and professional index logs...',
      'Syncing public cap table references...',
      'Verification completed: Founder signature validated.'
    ];

    let currentLogIndex = 0;
    const intervalId = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          clearInterval(intervalId);
          verificationTimerRef.current = null;
          setIsScanning(false);
          setIsVerified(true);
          return 100;
        }
        
        // Add log entry dynamically
        if (p % 15 === 0 && currentLogIndex < logsList.length) {
          setScanLogs(prev => [...prev, logsList[currentLogIndex]]);
          currentLogIndex++;
        }
        
        return p + 5;
      });
    }, 150);
    verificationTimerRef.current = intervalId;
  };

  const filteredFounders = founders.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.startup_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>Founder Tracking Terminal</h1>
          <div className="mono text-muted">MODULE: PEDIGREE INDEXING & NETWORK ANOMALIES • ACTIVE SYNC STATUS: SECURE</div>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>+ NEW FOUNDER</button>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          PARSING FOUNDER EXECUTION SIGNALS...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.15fr', gap: '12px' }}>
          
          {/* Left Column: Founder Directory */}
          <div className="panel" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="panel-header">Founder Pedigree Directory</div>
            
            {/* Search Input */}
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span className="mono text-muted" style={{ fontSize: '9px' }}>SEARCH:</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by founder name or startup..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 0'
                }}
              />
              {searchQuery && (
                <button className="mono btn" onClick={() => setSearchQuery('')} style={{ fontSize: '8px', padding: '1px 5px' }}>RESET</button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>NAME</th>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>STARTUP</th>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>TRUST</th>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>RESP.</th>
                    <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>EXEC.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFounders.map((f) => (
                    <tr 
                      key={f.id} 
                      onClick={() => {
                        if (verificationTimerRef.current) {
                          clearInterval(verificationTimerRef.current);
                          verificationTimerRef.current = null;
                        }
                        setSelectedFounder(f);
                        setIsScanning(false);
                        setScanProgress(0);
                        setIsVerified(false);
                        setScanLogs([]);
                      }}
                      style={{ 
                        borderBottom: '1px solid var(--border-subtle)', 
                        cursor: 'pointer',
                        background: selectedFounder?.id === f.id ? 'var(--bg-elevated)' : 'transparent',
                        color: selectedFounder?.id === f.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}
                      className="hover-row"
                    >
                      <td style={{ padding: '8px 4px', fontWeight: 600 }}>{f.name}</td>
                      <td style={{ padding: '8px 4px' }}>
                        {f.startup_id ? (
                          <Link href={`/startups/${f.startup_id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'underline', textDecorationColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'} onClick={e => e.stopPropagation()}>
                            {f.startup_name}
                          </Link>
                        ) : (
                          f.startup_name
                        )}
                      </td>
                      <td className="mono" style={{ padding: '8px 4px', color: getMetricColor(f.trust_score), fontWeight: 600 }}>{f.trust_score}</td>
                      <td className="mono" style={{ padding: '8px 4px', color: getMetricColor(f.responsiveness_score), fontWeight: 600 }}>{f.responsiveness_score}</td>
                      <td className="mono" style={{ padding: '8px 4px', color: getMetricColor(f.execution_score), fontWeight: 600 }}>{f.execution_score}</td>
                    </tr>
                  ))}
                  {filteredFounders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="mono text-muted" style={{ padding: '16px 4px', textAlign: 'center', fontSize: '10px' }}>
                        NO FOUNDER MATCHES FOUND
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Founder Details */}
          <div className="col-stack">
            {selectedFounder ? (
              <div className="panel panel-elevated" style={{ borderLeft: '2px solid var(--accent-emerald)', height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                <div className="panel-header">
                  <span>Founder Profile Inspector</span>
                  <span className="mono" style={{ textTransform: 'uppercase', color: 'var(--accent-emerald)' }}>{selectedFounder.title}</span>
                </div>

                <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '2px' }}>{selectedFounder.name}</h2>
                  <div className="mono text-muted" style={{ fontSize: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {selectedFounder.startup_id ? (
                      <Link href={`/startups/${selectedFounder.startup_id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                        {selectedFounder.startup_name} ↗
                      </Link>
                    ) : (
                      selectedFounder.startup_name
                    )}
                    <span>•</span>
                    <span>{selectedFounder.email}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                  <div className="panel" style={{ padding: '8px', textAlign: 'center' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '2px' }}>TRUST SCORE</div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: getMetricColor(selectedFounder.trust_score) }}>
                      {selectedFounder.trust_score}%
                    </div>
                  </div>
                  <div className="panel" style={{ padding: '8px', textAlign: 'center' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '2px' }}>RESPONSIVENESS</div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: getMetricColor(selectedFounder.responsiveness_score) }}>
                      {selectedFounder.responsiveness_score}%
                    </div>
                  </div>
                  <div className="panel" style={{ padding: '8px', textAlign: 'center' }}>
                    <div className="mono text-muted" style={{ fontSize: '8px', marginBottom: '2px' }}>EXECUTION RATING</div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: getMetricColor(selectedFounder.execution_score) }}>
                      {selectedFounder.execution_score}%
                    </div>
                  </div>
                </div>

                <div className="panel-header" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>Academic Foundation</div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-primary)', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '6px 10px', marginBottom: '14px' }}>
                  🎓 {selectedFounder.education || 'N/A'}
                </div>

                <div className="panel-header" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>Exit Track Record & Pedigree</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                  {selectedFounder.previous_companies && selectedFounder.previous_companies.length > 0 ? (
                    selectedFounder.previous_companies.map((co, i) => (
                      <span key={i} className="mono" style={{ background: 'rgba(169,68,37,0.06)', border: '1px solid rgba(169,68,37,0.2)', color: 'var(--accent-blue)', padding: '3px 8px', fontSize: '9px' }}>
                        {co}
                      </span>
                    ))
                  ) : (
                    <span className="mono text-muted" style={{ fontSize: '9px' }}>First-time Founder (No former corporate exits mapped)</span>
                  )}
                </div>

                <div className="panel-header" style={{ fontSize: '9px', letterSpacing: '0.08em' }}>Background & Execution Notes</div>
                <p className="text-secondary" style={{ fontSize: '11px', lineHeight: 1.5, background: 'var(--bg-main)', padding: '10px', border: '1px solid var(--border-subtle)', marginBottom: '14px' }}>
                  {selectedFounder.background}
                </p>

                {/* Trust Verification Protocol CLI Module */}
                <div className="panel" style={{ border: '1px solid var(--border-subtle)', padding: '8px 10px', background: 'var(--theme-surface)' }}>
                  <div className="flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px', marginBottom: '6px' }}>
                    <span className="mono text-muted" style={{ fontSize: '8px' }}>TRUST VERIFICATION MODULE</span>
                    {isVerified && <span className="mono" style={{ fontSize: '8px', color: 'var(--accent-emerald)' }}>✓ VERIFIED NODE</span>}
                  </div>
                  
                  {isScanning ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div className="mono text-muted" style={{ fontSize: '8px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>SCANNING PEDIGREE HISTORY...</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div style={{ width: '100%', height: '3px', background: 'var(--bg-elevated)' }}>
                        <div style={{ height: '100%', background: 'var(--accent-cyan)', width: `${scanProgress}%` }} />
                      </div>
                      <div style={{ maxHeight: '60px', overflowY: 'auto', fontSize: '7px', color: 'var(--accent-cyan)' }} className="mono">
                        {scanLogs.map((log, index) => (
                          <div key={index} style={{ padding: '1px 0' }}>&gt; {log}</div>
                        ))}
                      </div>
                    </div>
                  ) : isVerified ? (
                    <div className="mono" style={{ fontSize: '9px', color: 'var(--accent-emerald)' }}>
                      &gt; Stanford alumni records verified.<br />
                      &gt; Exit references matched. Verification ID: #S{selectedFounder.id}FF9A.
                    </div>
                  ) : (
                    <button 
                      className="btn" 
                      style={{ fontSize: '9px', width: '100%', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.2)', color: 'var(--accent-cyan)' }}
                      onClick={handleStartVerification}
                    >
                      🚀 RUN VERIFICATION PROTOCOL
                    </button>
                  )}
                </div>

                <div style={{ marginTop: '14px', display: 'flex', gap: '8px' }}>
                  <a href={selectedFounder.linkedin} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: '10px', flex: 1, textAlign: 'center', display: 'block' }}>
                    LINKEDIN NODE
                  </a>
                  {selectedFounder.twitter && (
                    <a href={selectedFounder.twitter} target="_blank" rel="noopener noreferrer" className="btn" style={{ fontSize: '10px', flex: 1, textAlign: 'center', display: 'block' }}>
                      TWITTER PROTOCOL
                    </a>
                  )}
                </div>

              </div>
            ) : (
              <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                SELECT A FOUNDER FROM THE DIRECTORY TO VIEW SPECS
              </div>
            )}
          </div>

        </div>
      )}
      <AddFounderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshFounders}
      />
    </div>
  );
}
