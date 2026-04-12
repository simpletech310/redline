'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchRedliners } from '@/lib/api';
import { Search, Users, Shield, Trophy } from 'lucide-react';

interface Redliner {
  id: string;
  username: string;
  account_type: string;
  region?: string;
  card?: {
    trust_score?: number;
    stats?: { total_wins?: number; total_runs?: number };
  };
}

export default function RedlinersPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Redliner[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchRedliners(query);
      setResults(res.data?.racers || res.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const trust = (r: Redliner) => r.card?.trust_score ?? 0;
  const trustColor = (score: number) =>
    score >= 90 ? '#facc15' : score >= 70 ? '#4ade80' : score >= 50 ? '#60a5fa' : '#555';

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
          Redliners
        </h1>
        <p style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Community Directory
        </p>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input
            className="input-carbon"
            style={{ paddingLeft: '2.25rem' }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search racers..."
          />
        </div>
        <button onClick={handleSearch} className="btn-redline" style={{ padding: '0.625rem 1rem', fontSize: '0.85rem' }}>
          Search
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>Searching...</div>
      ) : searched && results.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>
          <Users size={36} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.9rem' }}>No racers found for "{query}"</p>
        </div>
      ) : !searched ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>
          <Users size={40} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.9rem' }}>Search for racers, jockeys, and team owners</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {results.map(r => (
            <div
              key={r.id}
              className="carbon-card carbon-card-hover"
              style={{ padding: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.875rem' }}
              onClick={() => router.push(`/redliners/${r.id}`)}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: `hsl(${r.username.charCodeAt(0) * 37 % 360}, 50%, 28%)`,
                border: '2px solid #2a2a2a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 900, color: '#fff',
              }}>
                {r.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  @{r.username}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-gray">{r.account_type.replace('_', ' ')}</span>
                  {r.region && <span className="badge badge-gray">{r.region}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flex: 0, gap: '0.75rem', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                    <Shield size={11} style={{ color: trustColor(trust(r)) }} />
                    <span style={{ color: trustColor(trust(r)), fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>
                      {trust(r).toFixed(0)}
                    </span>
                  </div>
                  <div style={{ color: '#555', fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 600 }}>Trust</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', justifyContent: 'center' }}>
                    <Trophy size={11} style={{ color: '#facc15' }} />
                    <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>
                      {r.card?.stats?.total_wins || 0}
                    </span>
                  </div>
                  <div style={{ color: '#555', fontSize: '0.55rem', textTransform: 'uppercase', fontWeight: 600 }}>Wins</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
