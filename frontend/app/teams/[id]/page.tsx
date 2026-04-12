'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getTeam, getTeamMembers, leaveTeam } from '@/lib/api';
import { ArrowLeft, Users, MapPin, Settings, Trophy, LogOut, Crown, Star, Shield } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  owner: { id: string; username: string };
  bio: string;
  region?: string;
  motorsport?: string;
  aggregate_stats: Record<string, number>;
  member_count: number;
}

interface Member {
  id: string;
  user_id: string;
  username: string;
  role: string;
  joined_at: string;
}

const ROLE_CONFIG: Record<string, { color: string; bg: string; icon: typeof Crown }> = {
  owner: { color: 'var(--gold)', bg: 'rgba(255, 215, 0, 0.15)', icon: Crown },
  captain: { color: 'var(--crimson-400)', bg: 'rgba(239, 68, 68, 0.15)', icon: Star },
  member: { color: 'var(--text-muted)', bg: 'var(--surface-elevated)', icon: Shield },
};

export default function TeamProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getTeam(id as string).then(r => setTeam(r.data)),
      getTeamMembers(id as string).then(r => setMembers(r.data.members || [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = team?.owner?.id === user?.id;
  const isMember = members.some(m => m.user_id === user?.id);

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    setLeaving(true);
    try {
      await leaveTeam(team!.id);
      router.push('/teams');
    } catch {
      alert('Failed to leave team');
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--void-950)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-pulse" style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading team...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="page-container">
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', marginTop: '2rem' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Users size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Team Not Found
          </p>
          <button onClick={() => router.push('/teams')} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header with Team Banner */}
      <div className="glass-panel animate-fade-in-up" style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background with team color */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, hsl(${team.name.charCodeAt(0) * 37 % 360}, 60%, 15%) 0%, transparent 60%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button
              onClick={() => router.back()}
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={18} color="var(--text-primary)" />
            </button>

            {isOwner && (
              <button
                onClick={() => router.push(`/teams/${team.id}/manage`)}
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Settings size={18} color="var(--text-primary)" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Team avatar */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              background: `linear-gradient(135deg, hsl(${team.name.charCodeAt(0) * 37 % 360}, 60%, 45%), hsl(${team.name.charCodeAt(0) * 37 % 360 + 30}, 60%, 35%))`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 400,
              color: '#fff',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              {team.name[0].toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}>
                  {team.name.toUpperCase()}
                </h1>
                {team.motorsport && (
                  <span className="badge badge-crimson">{team.motorsport}</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Users size={14} />
                  {team.member_count} members
                </span>
                {team.region && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={14} />
                    {team.region}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Info Card */}
      <div className="carbon-card animate-fade-in-up stagger-1" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Crown size={16} color="var(--gold)" />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
            Team Owner
          </span>
        </div>
        <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>
          @{team.owner.username}
        </div>

        {team.bio && (
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            padding: '1rem',
            background: 'var(--surface-elevated)',
            borderRadius: '10px',
            borderLeft: '3px solid var(--crimson-500)',
          }}>
            {team.bio}
          </p>
        )}
      </div>

      {/* Team Stats */}
      {team.aggregate_stats && Object.keys(team.aggregate_stats).length > 0 && (
        <div className="glass-panel animate-fade-in-up stagger-2" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Trophy size={16} color="var(--gold)" />
            <span style={{
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              Team Stats
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {Object.entries(team.aggregate_stats).map(([key, val]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div className="stat-value" style={{ marginBottom: '0.25rem' }}>{val}</div>
                <div style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                }}>
                  {key.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roster */}
      <div className="animate-fade-in-up stagger-3" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 700,
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Shield size={14} />
          Roster ({members.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {members.map((m, idx) => {
            const roleConfig = ROLE_CONFIG[m.role] || ROLE_CONFIG.member;
            const RoleIcon = roleConfig.icon;

            return (
              <div
                key={m.id}
                className="carbon-card"
                style={{
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  animationDelay: `${idx * 0.05}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                  <div className="avatar avatar-md" style={{
                    background: `linear-gradient(135deg, hsl(${m.username.charCodeAt(0) * 37 % 360}, 60%, 40%), hsl(${m.username.charCodeAt(0) * 37 % 360 + 30}, 60%, 30%))`,
                  }}>
                    {m.username[0].toUpperCase()}
                  </div>
                  <div>
                    <span style={{
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                    }}>
                      @{m.username}
                    </span>
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '8px',
                  background: roleConfig.bg,
                }}>
                  <RoleIcon size={12} color={roleConfig.color} />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: roleConfig.color,
                    letterSpacing: '0.03em',
                  }}>
                    {m.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave Team */}
      {isMember && !isOwner && (
        <div className="animate-fade-in-up stagger-4">
          <button
            onClick={handleLeave}
            disabled={leaving}
            style={{
              width: '100%',
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              color: 'var(--crimson-400)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: leaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: leaving ? 0.6 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <LogOut size={16} />
            {leaving ? 'Leaving...' : 'Leave Team'}
          </button>
        </div>
      )}
    </div>
  );
}
