'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getAvailableRuns, getMyRuns } from '@/lib/api';
import { Flag, Plus, Calendar, MapPin, DollarSign, Users, Clock, Trophy } from 'lucide-react';
import CreateRunModal from '@/components/CreateRunModal';

interface Run {
  id: string;
  run_id?: string;
  name: string;
  motorsport?: string;
  race_type?: string;
  race_format?: string;
  distance?: string;
  surface?: string;
  location: string;
  date_time: string;
  entry_fee?: number;
  max_participants?: number;
  participant_count?: number;
  results_posted?: boolean;
}

export default function RunsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'available' | 'my'>('available');
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fn = tab === 'available' ? getAvailableRuns : getMyRuns;
      const res = await fn();
      setRuns(res.data || []);
    } catch {
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const runId = (r: Run) => r.run_id || r.id;

  const formatDate = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatLabel = (s?: string) => s?.replace(/_/g, ' ') || '—';

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
            Races
          </h1>
          <p style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Event Center
          </p>
        </div>
        {user?.account_type !== 'spectator' && (
          <button onClick={() => setShowCreate(true)} className="btn-redline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.8rem' }}>
            <Plus size={15} />
            Create Run
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#111', borderRadius: '0.75rem', padding: '0.25rem', marginBottom: '1rem', border: '1px solid #1c1c1c' }}>
        {(['available', 'my'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '0.5rem',
              background: tab === t ? '#1c1c1c' : 'transparent',
              color: tab === t ? '#fff' : '#555',
              border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              transition: 'all 0.2s',
            }}
          >
            {t === 'available' ? 'Available' : 'My Runs'}
          </button>
        ))}
      </div>

      {/* Run Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>Loading...</div>
      ) : runs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>
          <Flag size={36} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.9rem' }}>
            {tab === 'available' ? 'No available races right now' : 'You haven\'t joined any races yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {runs.map(run => (
            <div
              key={runId(run)}
              className="carbon-card carbon-card-hover"
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => router.push(`/runs/${runId(run)}`)}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {run.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {run.motorsport && (
                      <span className="badge badge-redline">{run.motorsport}</span>
                    )}
                    {run.results_posted && (
                      <span className="badge badge-green">Results Posted</span>
                    )}
                  </div>
                </div>
                {run.entry_fee !== undefined && run.entry_fee > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#facc15', fontWeight: 700, fontSize: '0.875rem', fontFamily: 'monospace' }}>
                    <DollarSign size={13} />
                    {run.entry_fee.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                  <MapPin size={12} style={{ color: '#555' }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{run.location}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af', fontSize: '0.75rem' }}>
                  <Calendar size={12} style={{ color: '#555' }} />
                  {formatDate(run.date_time)}
                </div>
                {run.race_type && (
                  <div style={{ color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    {formatLabel(run.race_type)}
                  </div>
                )}
                {(run.surface || run.distance) && (
                  <div style={{ color: '#6b7280', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>
                    {[run.distance, run.surface].filter(Boolean).join(' • ')}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1c1c1c', paddingTop: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#555', fontSize: '0.75rem' }}>
                  <Users size={12} />
                  <span>{run.participant_count || 0}/{run.max_participants || '∞'}</span>
                </div>
                <span style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600 }}>View Details →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateRunModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}
