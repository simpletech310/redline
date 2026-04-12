'use client';

import { useEffect, useState } from 'react';
import { getAvailablePicks, getMyPicks, placePick } from '@/lib/api';
import { TrendingUp, Lock, CheckCircle, XCircle } from 'lucide-react';

interface Pick {
  id: string;
  pick_type?: string;
  event_name?: string;
  run_name?: string;
  prediction?: string;
  amount?: number;
  odds?: number;
  locked?: boolean;
  won?: boolean | null;
  payout?: number;
  run_date?: string;
  run_format?: string;
}

export default function PicksPage() {
  const [tab, setTab] = useState<'available' | 'my'>('available');
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const fn = tab === 'available' ? getAvailablePicks : getMyPicks;
      const res = await fn();
      setPicks(res.data || []);
    } catch {
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tab]);

  const formatLabel = (s?: string) => s?.replace(/_/g, ' ') || '';

  const statusIcon = (p: Pick) => {
    if (!p.locked) return null;
    if (p.won === true) return <CheckCircle size={16} style={{ color: '#4ade80' }} />;
    if (p.won === false) return <XCircle size={16} style={{ color: '#f87171' }} />;
    return <Lock size={14} style={{ color: '#555' }} />;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
          Picks
        </h1>
        <p style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Marketplace
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#111', borderRadius: '0.75rem', padding: '0.25rem', marginBottom: '1rem', border: '1px solid #1c1c1c' }}>
        {(['available', 'my'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '0.6rem',
              borderRadius: '0.5rem',
              background: tab === t ? '#1c1c1c' : 'transparent',
              color: tab === t ? '#fff' : '#555',
              border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 700,
              textTransform: 'uppercase',
              transition: 'all 0.2s',
            }}
          >
            {t === 'available' ? 'Available' : 'My Picks'}
          </button>
        ))}
      </div>

      {/* Picks list */}
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>Loading...</div>
      ) : picks.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>
          <TrendingUp size={36} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.9rem' }}>
            {tab === 'available' ? 'No picks available right now' : 'You haven\'t placed any picks'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {picks.map(pick => (
            <div key={pick.id} className="carbon-card" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.2rem' }}>
                    {formatLabel(pick.pick_type)} · {pick.event_name || pick.run_name || 'Race'}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                    {pick.prediction || 'Winner Prop'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {statusIcon(pick)}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#facc15', fontWeight: 900, fontSize: '1rem', fontFamily: 'monospace' }}>
                      {pick.odds?.toFixed(2) || '—'}x
                    </div>
                    <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase' }}>Odds</div>
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px solid #1c1c1c', paddingTop: '0.625rem' }}>
                {pick.amount && (
                  <div>
                    <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>Amount</div>
                    <div style={{ color: '#d1d5db', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>${pick.amount.toFixed(2)}</div>
                  </div>
                )}
                {pick.payout !== undefined && pick.payout > 0 && (
                  <div>
                    <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>Payout</div>
                    <div style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700 }}>+${pick.payout.toFixed(2)}</div>
                  </div>
                )}
                {pick.run_format && (
                  <div>
                    <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>Format</div>
                    <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{formatLabel(pick.run_format)}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
