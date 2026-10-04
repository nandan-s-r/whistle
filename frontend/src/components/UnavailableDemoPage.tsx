'use client';
import Link from 'next/link';

export default function UnavailableDemoPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
      <style>{`
        @keyframes fade-in { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:none;} }
        .fade-in { animation: fade-in 0.3s ease both; }
      `}</style>
      <div className="panel fade-in" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="mono" style={{ fontSize: '10px', color: 'var(--accent-amber)', marginBottom: '8px' }}>
          ⚠ DEMO LIMITATION
        </div>
        <h1 style={{ fontSize: '18px', marginBottom: '12px' }}>{title}</h1>
        <p className="text-secondary" style={{ fontSize: '13px', lineHeight: 1.6, marginBottom: '24px' }}>
          This area is not available in the current demo deployment of Whistle. Full functionality requires a dedicated enterprise instance.
        </p>
        <Link href="/">
          <button className="btn btn-primary" style={{ width: '100%' }}>
            RETURN TO DASHBOARD
          </button>
        </Link>
      </div>
    </div>
  );
}
