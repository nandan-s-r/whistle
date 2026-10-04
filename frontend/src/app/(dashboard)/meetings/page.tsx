'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Meeting {
  id: number;
  startup_id?: number;
  startup_name: string;
  meeting_type: string;
  scheduled_at: string;
  duration_minutes: number;
  ai_summary: string;
  key_concerns: string[];
  action_items: string[];
  founder_score: number;
  raw_transcript: string;
  live_mode_used: boolean;
}

export default function MeetingsIntelligence() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'actions' | 'transcript'>('summary');
  const [transcriptFilter, setTranscriptFilter] = useState('');
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch('/api/meetings')
      
      .then(data => {
        setMeetings(data);
        if (data.length > 0) setSelectedMeeting(data[0]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleToggleAction = (item: string) => {
    setCompletedActions(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const getFilteredTranscript = (text: string) => {
    if (!transcriptFilter.trim()) return text;
    const lines = text.split('\n');
    return lines
      .filter(line => line.toLowerCase().includes(transcriptFilter.toLowerCase()))
      .join('\n') || '[No matching transcript logs found]';
  };

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h1 style={{ fontSize: '14px', letterSpacing: '0' }}>Meeting Intelligence</h1>
        <div className="mono text-muted">MODULE: EXECUTIVE TRANSCRIPTION & AUDIT LOGS • SYSTEM: STT PIPELINE</div>
      </div>

      {loading ? (
        <div className="panel text-muted" style={{ textAlign: 'center', padding: '40px' }}>
          LOADING INTELLIGENCE LEDGER...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.1fr', gap: '12px' }}>
          
          {/* Left Panel: Ledger */}
          <div className="panel" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <div className="panel-header">Historical Meeting Ledger</div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>STARTUP</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>TYPE</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>DATE</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>SCORE</th>
                  <th className="mono" style={{ padding: '8px 4px', fontSize: '10px' }}>CO-PILOT</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr 
                    key={m.id} 
                    onClick={() => {
                      setSelectedMeeting(m);
                      setActiveTab('summary');
                      setTranscriptFilter('');
                    }}
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)', 
                      cursor: 'pointer',
                      background: selectedMeeting?.id === m.id ? 'var(--bg-elevated)' : 'transparent',
                      color: selectedMeeting?.id === m.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                    className="hover-row"
                  >
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>
                      {m.startup_id ? (
                        <Link href={`/startups/${m.startup_id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'underline', textDecorationColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--accent-blue)'} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'} onClick={e => e.stopPropagation()}>
                          {m.startup_name}
                        </Link>
                      ) : (
                        m.startup_name
                      )}
                    </td>
                    <td style={{ padding: '8px 4px' }}>{m.meeting_type}</td>
                    <td className="mono" style={{ padding: '8px 4px' }}>{m.scheduled_at ? new Date(m.scheduled_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="mono" style={{ padding: '8px 4px', color: m.founder_score >= 90 ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                      {m.founder_score}/100
                    </td>
                    <td className="mono" style={{ padding: '8px 4px', color: m.live_mode_used ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {m.live_mode_used ? 'ACTIVE' : 'OFFLINE'}
                    </td>
                  </tr>
                ))}
                {meetings.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "60px 20px" }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)', fontSize: '24px' }}>
                          🎙️
                        </div>
                        <div className="mono" style={{ fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>NO AUDIT LOGS</div>
                        <div className="text-muted" style={{ fontSize: '12px', textAlign: 'center', maxWidth: '300px' }}>
                          No meetings have been processed yet. Open the Co-Pilot to record and analyze your first pitch.
                        </div>
                        <Link href="/copilot">
                          <button className="btn btn-primary" style={{ marginTop: '8px' }}>LAUNCH CO-PILOT</button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right Panel: Selected Meeting Inspector */}
          <div className="col-stack">
            {selectedMeeting ? (
              <div className="panel panel-elevated" style={{ borderLeft: '2px solid var(--accent-emerald)', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Executive Audit Log</span>
                  <span className="mono" style={{ background: 'var(--accent-emerald)', color: 'var(--bg-main)', padding: '1px 6px', fontWeight: 600, fontSize: '10px' }}>
                    FOUNDER SCORE: {selectedMeeting.founder_score}
                  </span>
                </div>

                <div style={{ paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {selectedMeeting.startup_id ? (
                      <Link href={`/startups/${selectedMeeting.startup_id}`} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'transparent' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}>
                        {selectedMeeting.startup_name}
                      </Link>
                    ) : (
                      selectedMeeting.startup_name
                    )}
                  </h2>
                  <div className="mono text-muted" style={{ fontSize: '10px' }}>
                    {selectedMeeting.meeting_type} • {selectedMeeting.duration_minutes} MINS • {selectedMeeting.scheduled_at ? new Date(selectedMeeting.scheduled_at).toLocaleString() : 'N/A'}
                  </div>
                </div>

                {/* Tabs Selector */}
                <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '2px', gap: '2px', marginBottom: '12px' }}>
                  {(['summary', 'actions', 'transcript'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="mono"
                      style={{
                        flex: 1,
                        background: activeTab === tab ? 'var(--bg-elevated)' : 'transparent',
                        border: 'none',
                        color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                        padding: '6px 0',
                        fontSize: '9px',
                        fontWeight: activeTab === tab ? 600 : 400,
                        cursor: 'pointer',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  
                  {activeTab === 'summary' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <div className="panel-header" style={{ fontSize: '9px', color: 'var(--accent-blue)', letterSpacing: '0.08em' }}>EXECUTIVE BRIEF</div>
                        <p className="text-secondary" style={{ fontSize: '11px', lineHeight: 1.6, background: 'var(--bg-main)', padding: '10px', border: '1px solid var(--border-subtle)' }}>
                          {selectedMeeting.ai_summary}
                        </p>
                      </div>

                      <div>
                        <div className="panel-header" style={{ fontSize: '9px', color: 'var(--accent-red)', letterSpacing: '0.08em' }}>KEY CONCERNS FLAGGED</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {selectedMeeting.key_concerns?.map((c, i) => (
                            <div key={i} className="mono" style={{ background: 'rgba(225,29,72,0.05)', border: '1px solid rgba(225,29,72,0.15)', padding: '6px 8px', fontSize: '10px', display: 'flex', gap: '8px' }}>
                              <span style={{ color: 'var(--accent-red)' }}>[⚠]</span>
                              <span style={{ color: 'var(--text-secondary)' }}>{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'actions' && (
                    <div>
                      <div className="panel-header" style={{ fontSize: '9px', color: 'var(--accent-blue)', letterSpacing: '0.08em' }}>ACTION ITEMS CHECKLIST</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {selectedMeeting.action_items?.map((item, i) => {
                          const isDone = !!completedActions[item];
                          return (
                            <div 
                              key={i} 
                              onClick={() => handleToggleAction(item)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                background: isDone ? 'rgba(16,185,129,0.04)' : 'var(--bg-main)', 
                                border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
                                padding: '8px 10px', 
                                fontSize: '11px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input 
                                type="checkbox" 
                                checked={isDone}
                                onChange={() => {}} 
                                style={{ accentColor: 'var(--accent-emerald)', cursor: 'pointer' }} 
                              />
                              <span style={{ 
                                textDecoration: isDone ? 'line-through' : 'none', 
                                color: isDone ? 'var(--text-muted)' : 'var(--text-secondary)',
                                fontFamily: "'IBM Plex Mono', monospace",
                                fontSize: '10px'
                              }}>
                                {item}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'transcript' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
                      <div style={{ display: 'flex', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '2px 8px', alignItems: 'center', gap: '6px' }}>
                        <span className="mono text-muted" style={{ fontSize: '9px' }}>FILTER:</span>
                        <input
                          type="text"
                          value={transcriptFilter}
                          onChange={e => setTranscriptFilter(e.target.value)}
                          placeholder="Search lines..."
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            padding: '4px 0'
                          }}
                        />
                        {transcriptFilter && (
                          <button className="mono btn" onClick={() => setTranscriptFilter('')} style={{ fontSize: '8px', padding: '1px 5px' }}>RESET</button>
                        )}
                      </div>

                      <pre className="mono" style={{ 
                        flex: 1,
                        background: 'var(--theme-surface)',
                        border: '1px solid var(--border-subtle)', 
                        padding: '10px', 
                        fontSize: '10px', 
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap',
                        overflowY: 'auto',
                        lineHeight: 1.6
                      }}>
                        {getFilteredTranscript(selectedMeeting.raw_transcript)}
                      </pre>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                SELECT A MEETING FROM THE LEDGER TO INSPECT
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
