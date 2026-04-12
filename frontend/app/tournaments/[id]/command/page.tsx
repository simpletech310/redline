'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTournament, getTournamentParticipants, postMatchResult, startTournament } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Settings, ChevronRight, Shield, Trophy, Play, Users } from 'lucide-react';

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
  current_round?: number;
  status?: string;
  bracket?: { rounds?: Match[][] };
  creator_id?: string;
  max_participants?: number;
}

export default function TournamentCommandPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [winner, setWinner] = useState('');
  const [posting, setPosting] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  const load = async () => {
    try {
      const [tournamentRes, participantsRes] = await Promise.all([
        getTournament(id),
        getTournamentParticipants(id).catch(() => ({ data: { participants: [] } }))
      ]);
      setTournament(tournamentRes.data);
      setParticipants(participantsRes.data?.participants || []);
    } catch {
      // Error handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleStart = async () => {
    setStarting(true);
    setStartError('');
    try {
      await startTournament(id);
      await load();
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to start tournament';
      setStartError(errorMsg);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Loading...</div>;
  if (!tournament) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Not found</div>;
  if (tournament.creator_id !== user?.id) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>
        <Shield size={36} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
        <p>Command Center — Tournament owners only</p>
      </div>
    );
  }

  const currentRound = tournament.bracket?.rounds?.[tournament.current_round ?? 0] || [];

  const handlePostResult = async () => {
    if (!selectedMatch || !winner) return;
    setPosting(true);
    try {
      await postMatchResult(id, selectedMatch.id, { winner });
      setSelectedMatch(null);
      setWinner('');
      load();
    } catch {} finally {
      setPosting(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: '1rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tournament.name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#dc2626' }}>
            <Settings size={11} />
            <span style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Command Center</span>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.625rem', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900 }}>{tournament.current_round ?? 0}</div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>Round</div>
        </div>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.625rem', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900 }}>{currentRound.length}</div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>Matches</div>
        </div>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.625rem', padding: '0.75rem', textAlign: 'center' }}>
          <div style={{ color: tournament.status === 'completed' ? '#4ade80' : tournament.status === 'in_progress' ? '#facc15' : '#60a5fa', fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            {tournament.status?.replace('_', ' ') || '—'}
          </div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600 }}>Status</div>
        </div>
      </div>

      {/* Start Tournament (Registration Phase) */}
      {tournament.status === 'registration' && (
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={14} />
            Registered ({participants.length}/{tournament.max_participants})
          </h2>

          {participants.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {participants.map((p, i) => (
                <div key={i} style={{
                  padding: '0.4rem 0.75rem',
                  background: '#111',
                  border: '1px solid #1c1c1c',
                  borderRadius: '0.5rem',
                  color: '#9ca3af',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}>
                  @{p}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: '#111', borderRadius: '0.75rem', border: '1px solid #1c1c1c', color: '#555', marginBottom: '1rem' }}>
              <Users size={24} style={{ opacity: 0.2, margin: '0 auto 0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>No participants yet</p>
            </div>
          )}

          {startError && (
            <div style={{
              background: 'rgba(220,38,38,0.1)',
              border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem',
              color: '#f87171',
              fontSize: '0.8rem',
              marginBottom: '0.75rem'
            }}>{startError}</div>
          )}

          <button
            onClick={handleStart}
            disabled={starting || participants.length < 2}
            className="btn-redline"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: (starting || participants.length < 2) ? 0.6 : 1
            }}
          >
            <Play size={16} />
            {starting ? 'Starting...' : participants.length < 2 ? 'Need 2+ Participants' : 'Start Tournament'}
          </button>
        </div>
      )}

      {/* Current Round Matches */}
      <h2 style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
        Post Match Results
      </h2>

      {currentRound.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#111', borderRadius: '0.75rem', border: '1px solid #1c1c1c', color: '#555' }}>
          <Trophy size={28} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.85rem' }}>No active matches in this round</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {currentRound.map(match => (
            <div
              key={match.id}
              onClick={() => { setSelectedMatch(match); setWinner(''); }}
              style={{
                background: selectedMatch?.id === match.id ? 'rgba(220,38,38,0.08)' : '#111',
                border: `1px solid ${selectedMatch?.id === match.id ? '#dc2626' : '#1c1c1c'}`,
                borderRadius: '0.625rem',
                padding: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, textAlign: 'center', color: match.winner === match.player1 ? '#facc15' : '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                  {match.player1 || 'TBD'}
                </div>
                <div style={{ color: '#555', fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.4rem', background: '#1c1c1c', borderRadius: '0.25rem' }}>VS</div>
                <div style={{ flex: 1, textAlign: 'center', color: match.winner === match.player2 ? '#facc15' : '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                  {match.player2 || 'TBD'}
                </div>
                {match.winner && <Trophy size={14} style={{ color: '#facc15', flexShrink: 0 }} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Result Entry Panel */}
      {selectedMatch && (
        <div className="animate-slide-up" style={{ position: 'fixed', bottom: 80, left: 0, right: 0, padding: '1rem', zIndex: 40, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 -8px 32px rgba(0,0,0,0.6)' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.875rem' }}>
              Post Result: {selectedMatch.player1} vs {selectedMatch.player2}
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {[selectedMatch.player1, selectedMatch.player2].filter(Boolean).map(p => (
                <button key={p} type="button" onClick={() => setWinner(p!)}
                  style={{
                    flex: 1, padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: winner === p ? 'rgba(220,38,38,0.15)' : '#1c1c1c',
                    border: `1px solid ${winner === p ? '#dc2626' : '#2a2a2a'}`,
                    color: winner === p ? '#f87171' : '#fff',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                  }}>
                  🏆 {p}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { setSelectedMatch(null); setWinner(''); }} className="btn-ghost" style={{ fontSize: '0.85rem' }}>
                Cancel
              </button>
              <button onClick={handlePostResult} disabled={!winner || posting} className="btn-redline" style={{ flex: 1, opacity: !winner ? 0.4 : 1 }}>
                {posting ? 'Posting...' : 'Confirm Winner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
