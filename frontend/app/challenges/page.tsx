'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getChallenges, getMyChallenges, acceptChallenge, declineChallenge, cancelChallenge } from '@/lib/api';
import { Swords, Clock, MapPin, Trophy, ChevronRight, Plus, Check, X } from 'lucide-react';

interface Challenge {
  id: string;
  challenger: { id: string; username: string };
  challenged: { id: string; username: string };
  motorsport?: string;
  vehicle_class?: string;
  location: string;
  proposed_time: string;
  stakes: number;
  message?: string;
  status: string;
  run_id?: string;
  expires_at: string;
  created_at: string;
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'board' | 'my'>('board');
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<{ sent: Challenge[]; received: Challenge[] }>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'board') {
      getChallenges()
        .then(r => setChallenges(r.data.challenges || []))
        .catch(() => setChallenges([]))
        .finally(() => setLoading(false));
    } else {
      getMyChallenges()
        .then(r => setMyChallenges(r.data))
        .catch(() => setMyChallenges({ sent: [], received: [] }))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await acceptChallenge(id);
      if (res.data.run_id) {
        router.push(`/runs/${res.data.run_id}`);
      }
    } catch {
      alert('Failed to accept challenge');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: string) => {
    setActionLoading(id);
    try {
      await declineChallenge(id);
      setMyChallenges(prev => ({
        ...prev,
        received: prev.received.map(c => c.id === id ? { ...c, status: 'declined' } : c)
      }));
    } catch {
      alert('Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await cancelChallenge(id);
      setMyChallenges(prev => ({
        ...prev,
        sent: prev.sent.filter(c => c.id !== id)
      }));
    } catch {
      alert('Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const timeUntil = (dt: string) => {
    const diff = new Date(dt).getTime() - Date.now();
    const hours = Math.floor(diff / 3600000);
    if (hours < 0) return 'Expired';
    if (hours < 24) return `${hours}h left`;
    return `${Math.floor(hours / 24)}d left`;
  };

  const formatTime = (dt: string) => {
    return new Date(dt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  };

  const renderChallenge = (c: Challenge, showActions: 'accept' | 'cancel' | 'none' = 'none') => (
    <div key={c.id} className="carbon-card" style={{ padding: '1rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Swords size={16} color="#f87171" />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            @{c.challenger.username}
          </span>
          <span style={{ color: '#555' }}>vs</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            @{c.challenged.username}
          </span>
        </div>
        <span style={{
          padding: '0.2rem 0.5rem', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 700,
          textTransform: 'uppercase',
          background: c.status === 'pending' ? 'rgba(234,179,8,0.15)' : c.status === 'accepted' ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)',
          color: c.status === 'pending' ? '#eab308' : c.status === 'accepted' ? '#22c55e' : '#6b7280',
        }}>
          {c.status}
        </span>
      </div>

      {c.message && (
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>
          "{c.message}"
        </p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <MapPin size={12} />
          {c.location}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Clock size={12} />
          {formatTime(c.proposed_time)}
        </div>
        {c.stakes > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#22c55e' }}>
            <Trophy size={12} />
            ${c.stakes} stakes
          </div>
        )}
        {c.motorsport && (
          <span className="badge badge-redline">{c.motorsport}</span>
        )}
      </div>

      {c.status === 'pending' && (
        <div style={{ color: '#555', fontSize: '0.7rem', marginTop: '0.5rem' }}>
          {timeUntil(c.expires_at)}
        </div>
      )}

      {showActions === 'accept' && c.status === 'pending' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            onClick={() => handleAccept(c.id)}
            disabled={actionLoading === c.id}
            className="btn-redline"
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
          >
            <Check size={14} style={{ marginRight: '0.25rem' }} />
            Accept
          </button>
          <button
            onClick={() => handleDecline(c.id)}
            disabled={actionLoading === c.id}
            className="btn-ghost"
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
          >
            <X size={14} style={{ marginRight: '0.25rem' }} />
            Decline
          </button>
        </div>
      )}

      {showActions === 'cancel' && c.status === 'pending' && (
        <button
          onClick={() => handleCancel(c.id)}
          disabled={actionLoading === c.id}
          className="btn-ghost"
          style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.5rem' }}
        >
          Cancel Challenge
        </button>
      )}

      {c.status === 'accepted' && c.run_id && (
        <button
          onClick={() => router.push(`/runs/${c.run_id}`)}
          className="btn-redline"
          style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.5rem' }}
        >
          View Race <ChevronRight size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ background: '#dc2626', borderRadius: 6, padding: '0.35rem' }}>
            <Swords size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.01em' }}>
              CALLOUTS
            </h1>
            <p style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Challenge Board
            </p>
          </div>
        </div>
        {user && user.account_type !== 'spectator' && (
          <button
            onClick={() => router.push('/challenges/new')}
            className="btn-redline"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}
          >
            <Plus size={14} style={{ marginRight: '0.25rem' }} />
            Issue Challenge
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['board', 'my'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t as 'board' | 'my'); setLoading(true); }}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              background: tab === t ? '#dc2626' : '#1c1c1c',
              color: tab === t ? '#fff' : '#9ca3af',
              border: `1px solid ${tab === t ? '#dc2626' : '#2a2a2a'}`,
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t === 'board' ? 'Public Board' : 'My Challenges'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>Loading...</div>
      ) : tab === 'board' ? (
        challenges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>
            <Swords size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
            <p>No active challenges</p>
          </div>
        ) : (
          challenges.map(c => renderChallenge(c))
        )
      ) : (
        <>
          {myChallenges.received.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Challenges To You
              </h2>
              {myChallenges.received.map(c => renderChallenge(c, 'accept'))}
            </div>
          )}
          {myChallenges.sent.length > 0 && (
            <div>
              <h2 style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Challenges You Sent
              </h2>
              {myChallenges.sent.map(c => renderChallenge(c, 'cancel'))}
            </div>
          )}
          {myChallenges.received.length === 0 && myChallenges.sent.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>
              <Swords size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
              <p>No challenges yet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
