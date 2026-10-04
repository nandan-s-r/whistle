'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Startup {
  id: number;
  name: string;
}

export default function ICMemoGenerator() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [selectedStartup, setSelectedStartup] = useState('');
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    apiFetch('/api/startups')
      
      .then(data => {
        setStartups(data);
        if (data.length > 0) setSelectedStartup(data[0].name);
        setFetching(false);
      })
      .catch(err => {
        console.error(err);
        setFetching(false);
      });
  }, []);

  const generateMemo = async () => {
    if (!selectedStartup) return;
    setLoading(true);
    setMemo('');
    
    try {
      const res = await apiFetch('/api/generate-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup_name: selectedStartup })
      });
      const data = res;
      setMemo(data.memo_markdown || 'No content generated.');
    } catch (e) {
      console.error(e);
      setMemo('# Error\\nFailed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '12px', height: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>IC Memo Generator</h1>
        <div className="mono text-muted">MODULE: AUTOMATED INVESTMENT COMMITTEE DOCUMENTATION</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Settings */}
        <div className="panel col-stack">
          <div className="panel-header">Memo Configuration</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label className="mono text-muted" style={{ fontSize: '9px' }}>SELECT STARTUP TARGET</label>
            {fetching ? (
              <div className="mono text-muted" style={{ fontSize: '10px' }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={selectedStartup}
                  onChange={e => setSelectedStartup(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontFamily: 'Inter',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                >
                  {startups.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                {selectedStartup && (
                  <Link 
                    href={`/startups/${startups.find(s => s.name === selectedStartup)?.id || 1}`}
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--accent-blue)',
                      padding: '8px 12px',
                      fontSize: '11px',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ↗
                  </Link>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label className="mono text-muted" style={{ fontSize: '9px' }}>INCLUSION VECTORS</label>
            {[
              { label: 'Pitch Deck Extraction', checked: true },
              { label: 'Live Copilot Transcripts', checked: true },
              { label: 'Founder Execution Metrics', checked: true },
              { label: 'Risk Monitor Anomalies', checked: true },
            ].map((v, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-secondary)' }} className="mono">
                <input type="checkbox" checked={v.checked} readOnly style={{ accentColor: 'var(--accent-blue)' }} />
                {v.label}
              </label>
            ))}
          </div>

          <div style={{ marginTop: '12px', marginBottom: '12px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-red)', borderRadius: '4px', fontSize: '10px', color: 'var(--accent-red)', lineHeight: 1.4 }} className="mono">
            ⚠️ WARNING: AI may hallucinate if facts are missing. Review all claims before IC submission.
          </div>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', fontSize: '10px', marginTop: 'auto' }}
            onClick={generateMemo}
            disabled={loading || !selectedStartup}
          >
            {loading ? 'GENERATING...' : 'COMPILE IC MEMO'}
          </button>
        </div>

        {/* Right Column: Editor */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, minHeight: 0 }}>
          <div className="panel-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', margin: 0, display: 'flex', justifyContent: 'space-between' }}>
            <span>Document Preview</span>
            <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              {memo ? 'EDITABLE MARKDOWN' : 'WAITING FOR GENERATION'}
            </span>
          </div>
          
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '24px', height: '24px', border: '3px solid var(--accent-blue)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div className="mono text-muted" style={{ fontSize: '10px' }}>COMPILING FROM KNOWLEDGE BASE...</div>
            </div>
          ) : memo ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, minHeight: 0 }}>
              {/* Raw Markdown Editor */}
              <textarea 
                value={memo}
                onChange={e => setMemo(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'var(--theme-surface)',
                  border: 'none',
                  borderRight: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  padding: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none'
                }}
              />
              
              {/* Rendered Preview */}
              <div style={{ padding: '24px', overflowY: 'auto', background: 'var(--bg-main)' }}>
                <div className="markdown-preview" style={{ 
                  color: 'var(--text-primary)', 
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  lineHeight: 1.7
                }}>
                  <ReactMarkdown>{memo}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }} className="mono">
              SELECT A STARTUP TO GENERATE MEMO
            </div>
          )}
        </div>

      </div>
      
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .markdown-preview h1 { font-size: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 16px; }
        .markdown-preview h2 { font-size: 16px; color: var(--accent-blue); margin-top: 24px; margin-bottom: 12px; }
        .markdown-preview p { margin-bottom: 12px; color: var(--text-secondary); }
        .markdown-preview ul { padding-left: 20px; margin-bottom: 12px; }
        .markdown-preview li { color: var(--text-secondary); margin-bottom: 4px; }
      `}</style>
    </div>
  );
}
