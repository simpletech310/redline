'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTournament, joinTournament, getTournamentParticipants } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Trophy, MapPin, Calendar, DollarSign, Users, Settings, UserPlus } from 'lucide-react';

interface Match {
  id: string;
  round: number;
  position: number;
  player1?: string;
  player2?: string;
  winner?: string;
}

interface TournamentDetail {
  id: string;
  name: string;
  motorsport?: string;
  location: string;
  date_time: string;
  entry_fee_cents?: number;
  prize_pool_cents?: number;
  max_participants?: number;
  current_round?: number;
  status?: string;
  bracket?: { rounds?: Match[][] };
  creator_id?: string;
}

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<string[]>([]);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  const loadData = async () => {
    try {
      const [tournamentRes, participantsRes] = await Promise.all([
        getTournament(id),
        getTournamentParticipants(id).catch(() => ({ data: { participants: [] } }))
      ]);
      setTournament(tournamentRes.data);
      setParticipants(participantsRes.data?.participants || []);
    } catch {
      // Error handled by empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const handleJoin = async () => {
    setJoining(true);
    setJoinError('');
    setJoinSuccess(false);
    try {
      const res = await joinTournament(id);
      setParticipants(prev => [...prev, user?.username || '']);
      setJoinSuccess(true);
      // Reload to get updated data
      await loadData();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to join';
      setJoinError(errorMsg);
    } finally {
      setJoining(false);
    }
  };

  const isRegistered = participants.includes(user?.username || '');
  const canJoin = tournament?.status === 'registration' &&
                  !isRegistered &&
                  user?.account_type !== 'spectator' &&
                  participants.length < (tournament?.max_participants || 8);

  if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Loading...</div>;
  if (!tournament) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Tournament not found</div>;

  const isOwner = tournament.creator_id === user?.id;
  const rounds = tournament.bracket?.rounds || [];
  const statusColor: Record<string, string> = {
    registration: '#60a5fa',
    in_progress: '#facc15',
    completed: '#4ade80',
  };

  const formatDate = (dt: string) =>
    new Date(dt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tournament.name}
          </h1>
        </div>
        {isOwner && (
          <button onClick={() => router.push(`/tournaments/${id}/command`)} className="btn-ghost" style={{ padding: '0.5rem', flexShrink: 0 }}>
            <Settings size={16} style={{ color: '#dc2626' }} />
          </button>
        )}
      </div>

      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1c1c1c 0%, #111 100%)', border: '1px solid #2a2a2a', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: -20, right: -20, width: 100, height: 100, background: '#facc15', opacity: 0.04, borderRadius: '50%', filter: 'blur(30px)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {tournament.motorsport && <span className="badge badge-redline">{tournament.motorsport}</span>}
            {tournament.status && (
              <span className="badge" style={{ background: `${statusColor[tournament.status] || '#555'}20`, color: statusColor[tournament.status] || '#555', border: `1px solid ${statusColor[tournament.status] || '#555'}40`, textTransform: 'uppercase', fontSize: '0.6rem' }}>
                {tournament.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af', fontSize: '0.78rem' }}>
              <MapPin size={12} style={{ color: '#555' }} />{tournament.location}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#9ca3af', fontSize: '0.78rem' }}>
              <Calendar size={12} style={{ color: '#555' }} />{formatDate(tournament.date_time)}
            </div>
            {tournament.entry_fee_cents !== undefined && (
              <div style={{ color: '#facc15', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700 }}>
                ${tournament.entry_fee_cents > 0 ? (tournament.entry_fee_cents / 100).toFixed(2) : '0'} Entry
              </div>
            )}
            {tournament.prize_pool_cents !== undefined && tournament.prize_pool_cents > 0 && (
              <div style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700 }}>
                ${(tournament.prize_pool_cents / 100).toFixed(0)} Prize Pool
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bracket */}
      {rounds.length > 0 ? (
        <div>
          <h2 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Bracket
          </h2>
          {rounds.map((round, ri) => (
            <div key={ri} style={{ marginBottom: '1rem' }}>
              <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.5rem' }}>
                {ri === rounds.length - 1 ? 'Final' : ri === rounds.length - 2 ? 'Semi-Final' : `Round ${ri + 1}`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {round.map((match, mi) => (
                  <div key={mi} style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.625rem', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ color: match.winner === match.player1 ? '#facc15' : '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                        {match.player1 || 'TBD'}
                      </div>
                    </div>
                    <div style={{ color: '#555', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.4rem', background: '#1c1c1c', borderRadius: '0.25rem' }}>VS</div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ color: match.winner === match.player2 ? '#facc15' : '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                        {match.player2 || 'TBD'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#111', borderRadius: '0.75rem', border: '1px solid #1c1c1c', color: '#555' }}>
          <Trophy size={32} style={{ opacity: 0.15, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.85rem' }}>
            {tournament.status === 'registration'
              ? 'Bracket will be revealed once registration closes'
              : 'Bracket coming soon'}
          </p>
        </div>
      )}

      {/* Participants List */}
      {participants.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h2 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={14} />
            Registered ({participants.length}/{tournament.max_participants})
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {participants.map((p, i) => (
              <div
                key={i}
                style={{
                  padding: '0.4rem 0.75rem',
                  background: p === user?.username ? 'rgba(74,222,128,0.1)' : '#111',
                  border: `1px solid ${p === user?.username ? 'rgba(74,222,128,0.3)' : '#1c1c1c'}`,
                  borderRadius: '0.5rem',
                  color: p === user?.username ? '#4ade80' : '#9ca3af',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                @{p}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Join Button */}
      {user && tournament.status === 'registration' && (
        <div style={{ marginTop: '1rem' }}>
          {joinError && (
            <div style={{
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '0.75rem'
            }}>{joinError}</div>
          )}

          {joinSuccess && (
            <div style={{
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: '#4ade80',
              fontSize: '0.8rem',
              marginBottom: '0.75rem'
            }}>Successfully registered!</div>
          )}

          {canJoin ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="btn-redline"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: joining ? 0.6 : 1 }}
            >
              <UserPlus size={16} />
              {joining ? 'Joining...' : 'Join Tournament'}
            </button>
          ) : isRegistered ? (
            <div style={{
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)',
              borderRadius: '0.5rem',
              padding: '0.875rem',
              textAlign: 'center',
              color: '#4ade80',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              ✓ You are registered for this tournament
            </div>
          ) : user?.account_type === 'spectator' ? (
            <div style={{
              background: '#111',
              border: '1px solid #1c1c1c',
              borderRadius: '0.5rem',
              padding: '0.875rem',
              textAlign: 'center',
              color: '#555',
              fontSize: '0.85rem',
            }}>
              Spectators cannot join tournaments
            </div>
          ) : participants.length >= (tournament.max_participants || 8) ? (
            <div style={{
              background: '#111',
              border: '1px solid #1c1c1c',
              borderRadius: '0.5rem',
              padding: '0.875rem',
              textAlign: 'center',
              color: '#555',
              fontSize: '0.85rem',
            }}>
              Tournament is full
            </div>
          ) : null}
        </div>
      )}

      {/* Participants info footer */}
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#555', fontSize: '0.8rem' }}>
        <Users size={14} />
        <span>Max {tournament.max_participants} competitors · Round {tournament.current_round ?? 0}</span>
      </div>
    </div>
  );
}
