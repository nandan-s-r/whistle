'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navGroups = [
    {
      title: 'Operations',
      links: [
        { label: 'Live Meeting Copilot', href: '/copilot' },
        { label: 'Meeting Intelligence', href: '/meetings' },
        { label: 'Outreach Terminal', href: '/outreach' },
        { label: 'Startups Database', href: '/startups' },
      ],
    },
    {
      title: 'Intelligence',
      links: [
        { label: 'Pitch Deck Analyzer', href: '/deck' },
        { label: 'AI Scoring Engine', href: '/score' },
        { label: 'Deal Sourcing', href: '/source' },
        { label: 'IC Memo Generator', href: '/memo' },
      ],
    },
    {
      title: 'Risk & Portfolio',
      links: [
        { label: 'Founder Tracking', href: '/founders' },
        { label: 'Portfolio Monitor', href: '/' },
        { label: 'Risk Engine', href: '/risk' },
        { label: 'Network Graph', href: '/graph' },
        { label: 'Comps Engine', href: '/comps' },
        { label: 'Cap Table Modeler', href: '/modeling' },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      {/* Workspace Switcher */}
      <div style={{ padding: '20px 16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px', borderRadius: '6px', transition: 'background 0.2s ease' }} className="hover-bg-elevated">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="mono" style={{
              background: 'var(--accent-violet)', color: '#fff',
              padding: '4px 6px', fontWeight: 700, fontSize: '11px',
              borderRadius: '4px',
              marginRight: '12px',
              boxShadow: '0 2px 4px rgba(169,68,37,0.2)'
            }}>SR</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>SR Capital Firm</div>
              <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>FUND II • $450M</div>
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>▼</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {navGroups.map((group, i) => (
          <div key={i} style={{ marginBottom: '8px' }}>
            <div className="nav-section">{group.title}</div>
            {group.links.map((link, j) => {
              const isActive = link.href === '/' 
                ? pathname === '/' 
                : pathname.startsWith(link.href);
              return (
                <Link key={j} href={link.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      
      {/* Profile & Settings */}
      <Link href="/settings" style={{ textDecoration: 'none' }}>
        <div style={{ padding: '20px 16px', marginTop: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px', borderRadius: '6px', transition: 'background 0.2s ease' }} className={`hover-bg-elevated ${pathname.startsWith('/settings') ? 'active' : ''}`}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', marginRight: '12px', border: '1px solid var(--border-highlight)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>VC</span>
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>VC Partner</div>
              <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>auth: vcap_secure</div>
            </div>
          </div>
        </div>
      </Link>
    </aside>
  );
}

