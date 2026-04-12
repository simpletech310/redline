'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTournaments } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Trophy, Plus, MapPin, Calendar, DollarSign, Users } from 'lucide-react';

interface Tournament {
  id: string;
  name: string;
  motorsport?: string;
  location: string;
  date_time: string;
  entry_fee_cents?: number;
  prize_pool_cents?: number;
  max_participants?: number;
  status?: string;
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTournaments()
      .then(r => setTournaments(r.data || []))
      .catch(() => setTournaments([]))
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    registration: '#60a5fa',
    in_progress: '#facc15',
    completed: '#4ade80',
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>Tournaments</h1>
          <p style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Official Events</p>
        </div>
        {user?.account_type === 'team_owner' && (
          <button onClick={() => router.push('/tournaments/create')} className="btn-redline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
            <Plus size={15} />Create
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>Loading...</div>
      ) : tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: '3rem', color: '#555' }}>
          <Trophy size={40} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>No tournaments scheduled</p>
          {user?.account_type === 'team_owner' && (
            <button onClick={() => router.push('/tournaments/create')} className="btn-redline" style={{ fontSize: '0.85rem' }}>
              Create First Tournament
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {tournaments.map(t => (
            <div
              key={t.id}
              className="carbon-card carbon-card-hover"
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => router.push(`/tournaments/${t.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {t.motorsport && <span className="badge badge-redline">{t.motorsport}</span>}
                    {t.status && (
                      <span className="badge" style={{ background: `${statusColor[t.status] || '#555'}20`, color: statusColor[t.status] || '#555', border: `1px solid ${statusColor[t.status] || '#555'}40`, textTransform: 'uppercase', fontSize: '0.6rem' }}>
                        {t.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
                <Trophy size={18} style={{ color: '#facc15', flexShrink: 0 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                  <MapPin size={12} style={{ color: '#555' }} />{t.location}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                  <Calendar size={12} style={{ color: '#555' }} />{formatDate(t.date_time)}
                </div>
                {t.entry_fee_cents !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#facc15', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                    <DollarSign size={12} style={{ color: '#facc15' }} />
                    {t.entry_fee_cents > 0 ? `${(t.entry_fee_cents / 100).toFixed(2)} entry` : 'Free'}
                  </div>
                )}
                {t.prize_pool_cents !== undefined && t.prize_pool_cents > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#4ade80', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 700 }}>
                    <DollarSign size={12} style={{ color: '#4ade80' }} />
                    {(t.prize_pool_cents / 100).toFixed(0)} prize pool
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #1c1c1c', marginTop: '0.625rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#555', fontSize: '0.75rem' }}>
                  <Users size={12} />
                  <span>Max {t.max_participants || '—'}</span>
                </div>
                <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>View Bracket →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
