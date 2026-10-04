'use client';

import { useEffect, useState } from 'react';

interface Stats {
  startups: number;
  meetings: number;
  outreach: number;
  portfolio: number;
  leads: number;
  invest: number;
  maybe: number;
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use relative URLs so that the Next.js rewrites proxy them to the backend server-side
        const [startups, meetings, outreach, portfolio, scores, leads] = await Promise.allSettled([
          fetch('/api/startups').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch('/api/meetings').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch('/api/outreach').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch('/api/portfolio').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch('/api/scores').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
          fetch('/api/leads').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
        ]);

        const scoreData = scores.status === 'fulfilled' ? scores.value : [];
        const invest = scoreData.filter((s: any) => s.verdict === 'INVEST').length;
        const maybe  = scoreData.filter((s: any) => s.verdict === 'MAYBE').length;

        const portData = portfolio.status === 'fulfilled' ? portfolio.value : {};

        setStats({
          startups: startups.status === 'fulfilled' ? startups.value.length : 0,
          meetings: meetings.status === 'fulfilled' ? meetings.value.length : 0,
          outreach: outreach.status === 'fulfilled' ? outreach.value.length : 0,
          portfolio: portData?.portfolio?.length ?? 0,
          leads: leads.status === 'fulfilled' ? leads.value.length : 0,
          invest,
          maybe,
        });
      } catch {
        // silently fail — stats bar is non-critical
      }
    };

    fetchStats();
    // refresh every 30 seconds
    const id = setInterval(fetchStats, 30000);
    return () => clearInterval(id);
  }, []);

  const items = stats ? [
    { label: 'STARTUPS TRACKED', value: stats.startups, color: 'var(--accent-blue)' },
    { label: 'MEETINGS LOGGED', value: stats.meetings, color: 'var(--accent-violet)' },
    { label: 'OUTREACH SENT',   value: stats.outreach,  color: 'var(--accent-cyan)' },
    { label: 'PORTFOLIO COS',   value: stats.portfolio,  color: 'var(--accent-emerald)' },
    { label: 'SOURCING LEADS',  value: stats.leads,      color: 'var(--accent-amber)' },
    { label: 'INVEST SIGNALS',  value: stats.invest,     color: 'var(--accent-emerald)' },
    { label: 'WATCH LIST',      value: stats.maybe,      color: 'var(--accent-amber)' },
  ] : [];

  return (
    <div className="stats-bar">
      {items.map(item => (
        <div key={item.label} className="stat-item">
          <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '4px' }}>
            {item.label}
          </span>
          <span className="mono" style={{ fontSize: '16px', fontWeight: 700, color: item.color, lineHeight: 1 }}>
            {item.value}
          </span>
        </div>
      ))}
      {!stats && (
        <div className="stat-item">
          <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LOADING STATS...</span>
        </div>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: '5px', height: '5px', background: 'var(--accent-emerald)', borderRadius: '50%', animation: 'blink 2s infinite' }} />
        <span className="mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>LIVE</span>
      </div>
    </div>
  );
}
