'use client';

import { apiFetch } from '@/lib/apiClient';

import { useState, useEffect } from 'react';

interface Founder {
  id: number;
  name: string;
  email: string;
  title: string;
  startup_name: string;
  background: string;
  trust_score: number;
}

interface OutreachLog {
  id: number;
  startup_name: string;
  founder_name: string;
  subject: string;
  body: string;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
}

const TEMPLATES = [
  'Warm Intro — Fund II',
  'Repeat Founder Signal',
  'Cold Technical Outreach',
  'Follow-up After Meeting',
  'Portfolio Company Introduction',
];

export default function OutreachTerminal() {
  const [founders, setFounders]     = useState<Founder[]>([]);
  const [logs, setLogs]             = useState<OutreachLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [template, setTemplate]     = useState(TEMPLATES[0]);
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [generating, setGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast]           = useState('');

  const [identity, setIdentity]     = useState({ sender_name: 'Sarah Jenkins', firm_name: 'SR Capital', tone: 'Professional but direct' });
  const [savingIdentity, setSavingIdentity] = useState(false);

  const selectedFounder = founders.find(f => f.id === selectedId);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/founders'),
      apiFetch('/api/outreach'),
      apiFetch('/api/auth/me')
    ]).then(([f, o, u]) => {
      setFounders(f);
      setLogs(o);
      if (f.length > 0) setSelectedId(f[0].id);
      if (u.outreach_identity) {
        setIdentity({
          sender_name: u.outreach_identity.sender_name || 'Sarah Jenkins',
          firm_name: u.outreach_identity.firm_name || 'SR Capital',
          tone: u.outreach_identity.tone || 'Professional but direct'
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSaveContext = async () => {
    setSavingIdentity(true);
    try {
      await apiFetch('/api/auth/me/identity', {
        method: 'POST',
        body: JSON.stringify({ outreach_identity: identity })
      });
      showToast('✓ Identity context saved successfully.');
    } catch (e) {
      showToast('✗ Failed to save identity.');
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFounder) return;
    setGenerating(true);
    try {
      const res = await apiFetch('/api/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startup_name: selectedFounder.startup_name,
          founder_name: selectedFounder.name,
          template_type: template,
          identity: identity
        }),
      });
      if (res) {
        const data = res;
        setSubject(data.subject || '');
        setBody(data.body || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = () => {
    if (!subject || !body || !selectedFounder) return;
    const newLog: OutreachLog = {
      id: Date.now(),
      startup_name: selectedFounder.startup_name,
      founder_name: selectedFounder.name,
      subject,
      body,
      sent_at: new Date().toISOString(),
      opened_at: null,
      replied_at: null,
    };
    setLogs(prev => [newLog, ...prev]);
    setSubject('');
    setBody('');
    showToast(`✓ Email transmitted to ${selectedFounder.name} — ${selectedFounder.email}`);
  };

  // Stats
  const totalSent   = logs.filter(l => l.sent_at).length;
  const totalOpened = logs.filter(l => l.opened_at).length;
  const totalReplied= logs.filter(l => l.replied_at).length;
  const openRate    = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;
  const replyRate   = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;

  return (
    <div style={{ padding: '12px', height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideup { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
      `}</style>

      {/* Header */}
      <div className="flex-between" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <div>
          <h1 style={{ fontSize: '14px' }}>Outreach Terminal</h1>
          <div className="mono text-muted" style={{ fontSize: '9px', marginTop: '2px' }}>
            MODULE: OUTBOUND SIGNAL AGENT • ENGINE: GEMINI 2.5-FLASH • PIPELINE: SECURE SMTP
          </div>
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {[
            { label: 'SENT', value: totalSent, color: 'var(--accent-emerald)' },
            { label: 'OPEN RATE', value: `${openRate}%`, color: 'var(--accent-blue)' },
            { label: 'REPLY RATE', value: `${replyRate}%`, color: 'var(--accent-violet)' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{s.label}</div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '250px 1.2fr 1fr', gap: '12px', flex: 1, minHeight: 0 }}>

        {/* LEFT — Identity Grounding */}
        <div className="panel" style={{ borderLeft: '2px solid var(--accent-blue)', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          <div className="panel-header">Identity Grounding</div>
          
          <div>
            <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>SENDER NAME</label>
            <input
              value={identity.sender_name}
              onChange={e => setIdentity(prev => ({ ...prev, sender_name: e.target.value }))}
              style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '7px', fontSize: '11px', outline: 'none' }}
            />
          </div>
          <div>
            <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>FIRM NAME</label>
            <input
              value={identity.firm_name}
              onChange={e => setIdentity(prev => ({ ...prev, firm_name: e.target.value }))}
              style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '7px', fontSize: '11px', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>AI WRITING TONE</label>
            <textarea
              value={identity.tone}
              onChange={e => setIdentity(prev => ({ ...prev, tone: e.target.value }))}
              style={{ width: '100%', height: '80px', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '7px', fontSize: '11px', outline: 'none', resize: 'none' }}
            />
          </div>
          <button
            className="btn btn-secondary"
            style={{ width: '100%', fontSize: '10px' }}
            onClick={handleSaveContext}
            disabled={savingIdentity}
          >
            {savingIdentity ? 'SAVING...' : 'SAVE CONTEXT'}
          </button>
        </div>

        {/* MIDDLE — Composer */}
        <div className="panel panel-elevated" style={{ borderLeft: '2px solid var(--accent-violet)', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
          <div className="panel-header">AI-Assisted Email Composer</div>

          {loading ? (
            <div className="mono text-muted" style={{ fontSize: '10px' }}>Loading founders from database...</div>
          ) : (
            <>
              {/* Founder selector */}
              <div>
                <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>
                  TARGET FOUNDER
                </label>
                <select
                  value={selectedId ?? ''}
                  onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : null)}
                  style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '7px', fontSize: '11px', outline: 'none' }}
                >
                  <option value="" disabled>Select founder...</option>
                  {founders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.startup_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Founder card */}
              {selectedFounder && (
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '8px', fontSize: '11px' }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600 }}>{selectedFounder.name}</span>
                    <span className="mono" style={{ fontSize: '9px', color: 'var(--accent-violet)' }}>
                      TRUST: {selectedFounder.trust_score ?? 'N/A'}/100
                    </span>
                  </div>
                  <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '2px' }}>{selectedFounder.title} @ {selectedFounder.startup_name}</div>
                  <div className="mono" style={{ fontSize: '9px', color: 'var(--accent-blue)' }}>{selectedFounder.email}</div>
                </div>
              )}

              {/* Template */}
              <div>
                <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>TEMPLATE TYPE</label>
                <select
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '7px', fontSize: '11px', outline: 'none' }}
                >
                  {TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Generate */}
              <button
                className="btn"
                style={{ width: '100%', color: 'var(--accent-violet)', borderColor: 'var(--accent-violet)', fontSize: '10px' }}
                onClick={handleGenerate}
                disabled={generating || !selectedFounder}
              >
                {generating
                  ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                      GENERATING VIA GEMINI...
                    </span>
                  : '⚡ GENERATE PERSONALIZED AI DRAFT'}
              </button>

              {/* From/To preview */}
              {selectedFounder && (
                <div className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', borderLeft: '2px solid var(--border-subtle)', paddingLeft: '8px' }}>
                  FROM: {identity.sender_name}, Partner @ {identity.firm_name}<br />
                  TO: {selectedFounder.name} &lt;{selectedFounder.email}&gt;
                </div>
              )}

              {/* Subject */}
              <div>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <label className="mono text-muted" style={{ fontSize: '9px' }}>SUBJECT</label>
                  <span className="mono text-muted" style={{ fontSize: '9px' }}>{subject.length}/80</span>
                </div>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject line..."
                  style={{ width: '100%', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '7px', fontSize: '11px', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Body */}
              <div style={{ flex: 1 }}>
                <label className="mono text-muted" style={{ fontSize: '9px', display: 'block', marginBottom: '4px' }}>BODY</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Email body..."
                  style={{ width: '100%', height: '200px', background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', padding: '8px', fontSize: '11px', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
              </div>

              {/* Send */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '11px' }}
                onClick={handleSend}
                disabled={!subject || !body}
              >
                ↗ TRANSMIT EMAIL
              </button>
            </>
          )}
        </div>

        {/* RIGHT — Campaign log */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="panel-header">
            Campaign Intelligence Log
            <span className="mono" style={{ color: 'var(--accent-emerald)', fontSize: '9px' }}>{logs.length} TOTAL</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {logs.length === 0 && (
              <div style={{ padding: "60px 20px", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', flex: 1 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '24px', background: 'rgba(169,68,37,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-violet)', fontSize: '24px' }}>
                  ✉️
                </div>
                <div className="mono" style={{ fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>NO CAMPAIGNS SENT</div>
                <div className="text-muted" style={{ fontSize: '12px', textAlign: 'center', maxWidth: '250px' }}>
                  Your outreach log is empty. Select a target founder, generate a personalized draft, and transmit it.
                </div>
              </div>
            )}
            {logs.map(log => (
              <div key={log.id} style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', padding: '10px' }}>
                <div className="flex-between" style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600 }}>{log.startup_name}</span>
                  <span className="mono text-muted" style={{ fontSize: '9px' }}>
                    {log.sent_at ? new Date(log.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'DRAFT'}
                  </span>
                </div>
                <div className="mono text-muted" style={{ fontSize: '9px', marginBottom: '6px' }}>→ {log.founder_name}</div>
                <div className="text-secondary" style={{ fontSize: '10px', marginBottom: '8px' }}>
                  {log.subject}
                </div>
                <div style={{ display: 'flex', gap: '6px', marginBottom: expandedId === log.id ? '8px' : '0' }}>
                  <span className="mono" style={{ fontSize: '8px', padding: '2px 6px', background: 'rgba(16,185,129,0.08)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.2)' }}>✓ SENT</span>
                  <span className="mono" style={{ fontSize: '8px', padding: '2px 6px', background: log.opened_at ? 'rgba(169,68,37,0.08)' : 'transparent', color: log.opened_at ? 'var(--accent-blue)' : 'var(--text-muted)', border: `1px solid ${log.opened_at ? 'rgba(169,68,37,0.2)' : 'var(--border-subtle)'}` }}>
                    {log.opened_at ? '● OPENED' : '○ UNOPENED'}
                  </span>
                  <span className="mono" style={{ fontSize: '8px', padding: '2px 6px', background: log.replied_at ? 'rgba(16,185,129,0.08)' : 'transparent', color: log.replied_at ? 'var(--accent-emerald)' : 'var(--text-muted)', border: `1px solid ${log.replied_at ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}` }}>
                    {log.replied_at ? '↩ REPLIED' : '— NO REPLY'}
                  </span>
                  <button
                    className="btn"
                    style={{ marginLeft: 'auto', fontSize: '8px', padding: '2px 6px' }}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    {expandedId === log.id ? '▲ HIDE' : '▼ VIEW'}
                  </button>
                </div>
                {expandedId === log.id && log.body && (
                  <div className="mono text-secondary" style={{ fontSize: '10px', whiteSpace: 'pre-wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', lineHeight: 1.7, animation: 'slideup 0.2s ease' }}>
                    {log.body}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'var(--bg-elevated)', border: '1px solid var(--accent-emerald)',
          color: 'var(--accent-emerald)', padding: '10px 20px',
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
          boxShadow: '0 4px 20px rgba(16,185,129,0.2)', zIndex: 100,
          animation: 'slideup 0.3s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
