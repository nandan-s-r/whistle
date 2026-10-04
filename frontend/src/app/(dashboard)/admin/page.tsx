'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/apiClient';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<{ users: number; startups: number; leads: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch('/api/startups').catch(() => []),
      apiFetch('/api/leads').catch(() => []),
    ]).then(([startups, leads]) => {
      setStats({
        users: 1,
        startups: Array.isArray(startups) ? startups.length : 0,
        leads: Array.isArray(leads) ? leads.length : 0,
      });
      setLoading(false);
    }).catch(() => {
      setError('Failed to load admin data.');
      setLoading(false);
    });
  }, []);

  const adminLinks = [
    { href: '/startups', label: 'Startups Database', desc: 'View and manage all startups in the pipeline' },
    { href: '/source', label: 'Deal Sourcing', desc: 'Run crawlers and manage sourcing leads' },
    { href: '/memo', label: 'IC Memo Generator', desc: 'Generate investment committee memos' },
    { href: '/outreach', label: 'Outreach Terminal', desc: 'Manage outreach campaigns and emails' },
    { href: '/founders', label: 'Founder Tracking', desc: 'Track founders and team members' },
    { href: '/settings', label: 'Settings', desc: 'Configure system and account settings' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: '8px', letterSpacing: '0.1em' }}>
          SYSTEM / ADMIN CONSOLE
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Admin Console</h1>
        <p className="text-secondary" style={{ fontSize: '13px' }}>
          Full system administration and oversight panel for SR Capital VC OS.
        </p>
      </div>

      {/* System Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div className="panel" style={{ borderLeft: '3px solid var(--accent-blue)' }}>
          <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: '8px' }}>TOTAL STARTUPS</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-blue)' }}>
            {loading ? '...' : (stats?.startups ?? 0)}
          </div>
        </div>
        <div className="panel" style={{ borderLeft: '3px solid var(--accent-emerald)' }}>
          <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: '8px' }}>SOURCING LEADS</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            {loading ? '...' : (stats?.leads ?? 0)}
          </div>
        </div>
        <div className="panel" style={{ borderLeft: '3px solid var(--accent-violet)' }}>
          <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: '8px' }}>SYSTEM STATUS</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-emerald)' }}>
            ● ONLINE
          </div>
        </div>
      </div>

      {error && (
        <div className="mono" style={{ color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', padding: '12px', borderRadius: '4px', marginBottom: '24px', fontSize: '12px' }}>
          ⚠ {error} — Some data may not be available. Backend may be starting up.
        </div>
      )}

      {/* Quick Navigation */}
      <div style={{ marginBottom: '24px' }}>
        <div className="panel-header" style={{ marginBottom: '16px' }}>QUICK NAVIGATION</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {adminLinks.map(link => (
            <Link href={link.href} key={link.href}>
              <div className="panel" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}>
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{link.label}</div>
                <div className="text-secondary" style={{ fontSize: '12px' }}>{link.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div className="panel" style={{ background: 'var(--theme-surface)' }}>
        <div className="panel-header">SYSTEM INFORMATION</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            ['Application', 'Whistle'],
            ['Backend', 'FastAPI + SQLite on Render'],
            ['Frontend', 'Next.js on Vercel'],
            ['AI Engine', 'Groq (llama-3.1-8b-instant) + Gemini 2.5 Flash'],
            ['Auth', 'JWT Bearer Token'],
            ['Version', 'v2.0 — Production'],
          ].map(([k, v]) => (
            <div key={k} className="mono" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px' }}>
              <span className="text-muted">{k}</span>
              <span className="text-primary">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
