'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getCard, getGarage } from '@/lib/api';
import { Shield, Trophy, Car, Users, Edit2 } from 'lucide-react';
import Link from 'next/link';

interface TeamCard {
  name: string;
  bio: string;
  trust_score?: number;
  stats?: { total_wins?: number; total_runs?: number };
}

interface Machine {
  id: string;
  name?: string;
  vehicle_type: string;
  build_level?: string;
  motorsport?: string;
  is_public?: boolean;
}

export default function TeamCardPage() {
  const { user } = useAuth();
  const [card, setCard] = useState<TeamCard | null>(null);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCard().catch(() => null), getGarage().catch(() => null)])
      .then(([c, m]) => {
        if (c) setCard(c.data);
        if (m) setMachines(m.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const trust = card?.trust_score ?? 0;

  if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Loading...</div>;

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
            Team Command
          </h1>
          <p style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Organization Center
          </p>
        </div>
        <Link href="/card" className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', textDecoration: 'none', color: '#9ca3af' }}>
          <Edit2 size={13} />
          Edit Profile
        </Link>
      </div>

      {/* Team Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #3b0000 0%, #1c1c1c 70%)',
        border: '1px solid #2a2a2a',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 50%, rgba(220,38,38,0.08), transparent 60%)' }} />
        <div style={{ position: 'relative' }}>
          {/* Team Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '0.75rem',
              background: 'linear-gradient(135deg, #dc2626, #7a0000)',
              border: '2px solid #2a2a2a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 900, color: '#fff',
              fontStyle: 'italic',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic' }}>
                {card?.name || user?.username}
              </h2>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                <span className="badge badge-redline">Team Owner</span>
                <span className="badge badge-gray">{machines.length} Vehicles</span>
              </div>
            </div>
          </div>
          {card?.bio && (
            <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.5' }}>{card.bio}</p>
          )}
        </div>
      </div>

      {/* Team Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '0.875rem', textAlign: 'center' }}>
          <Shield size={18} style={{ color: trust >= 80 ? '#facc15' : '#60a5fa', margin: '0 auto 0.3rem', display: 'block' }} />
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace' }}>{trust.toFixed(0)}</div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Trust</div>
        </div>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '0.875rem', textAlign: 'center' }}>
          <Trophy size={18} style={{ color: '#facc15', margin: '0 auto 0.3rem', display: 'block' }} />
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace' }}>{card?.stats?.total_wins ?? 0}</div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Wins</div>
        </div>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '0.875rem', textAlign: 'center' }}>
          <Car size={18} style={{ color: '#60a5fa', margin: '0 auto 0.3rem', display: 'block' }} />
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace' }}>{machines.length}</div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Fleet</div>
        </div>
      </div>

      {/* Fleet Preview */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
          <h2 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Fleet
          </h2>
          <Link href="/garage" style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
            Manage →
          </Link>
        </div>
        {machines.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#555', background: '#111', borderRadius: '0.75rem', border: '1px solid #1c1c1c' }}>
            <Car size={24} style={{ opacity: 0.2, margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem' }}>No vehicles registered</p>
            <Link href="/garage/new" style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>+ Add First Machine</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {machines.slice(0, 4).map(m => (
              <Link key={m.id} href={`/garage/${m.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.625rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Car size={18} style={{ color: '#555', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name || m.vehicle_type}
                    </div>
                    {m.motorsport && <span style={{ color: '#555', fontSize: '0.7rem' }}>{m.motorsport}</span>}
                  </div>
                  <span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: '0.6rem' }}>{m.build_level || 'Stock'}</span>
                </div>
              </Link>
            ))}
            {machines.length > 4 && (
              <Link href="/garage" style={{ color: '#555', fontSize: '0.75rem', textAlign: 'center', padding: '0.5rem', textDecoration: 'none' }}>
                +{machines.length - 4} more vehicles
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        <Link href="/tournaments" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }} className="carbon-card-hover">
            <Trophy size={22} style={{ color: '#facc15', margin: '0 auto 0.4rem', display: 'block' }} />
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>Tournaments</div>
            <div style={{ color: '#555', fontSize: '0.65rem', marginTop: '0.15rem' }}>Create & manage events</div>
          </div>
        </Link>
        <Link href="/runs" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }} className="carbon-card-hover">
            <Users size={22} style={{ color: '#60a5fa', margin: '0 auto 0.4rem', display: 'block' }} />
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>Race Events</div>
            <div style={{ color: '#555', fontSize: '0.65rem', marginTop: '0.15rem' }}>Create hosted runs</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
