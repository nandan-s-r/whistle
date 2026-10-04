'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CommandBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const q = query.trim().toLowerCase();
      if (q === '/memo') router.push('/memo');
      else if (q === '/source') router.push('/source');
      else if (q === '/deck') router.push('/deck');
      else if (q === '/startups') router.push('/startups');
      else if (q === '/meetings') router.push('/meetings');
      else if (q === '/graph') router.push('/graph');
      else if (q === '/outreach') router.push('/outreach');
      else if (q.startsWith('/')) alert(`Unknown command: ${q}`);
      else if (q) {
        // Route to search (which is currently a demo unavailable page)
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
      setQuery('');
    }
  };

  return (
    <div className="cmd-search" style={{ position: 'relative' }}>
      <span style={{ color: 'var(--accent-blue)', fontSize: '11px', fontWeight: 600 }}>[CMD]</span>
      <input 
        type="text" 
        placeholder="Try /memo, /source, /deck..." 
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Command palette and search"
      />
    </div>
  );
}
