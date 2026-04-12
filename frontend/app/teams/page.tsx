'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getTeams, getMyTeamInvites, acceptTeamInvite, declineTeamInvite } from '@/lib/api';
import { Users, Plus, ChevronRight, MapPin, Bell, Check, X, Shield, Crown } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  owner: { id: string; username: string };
  bio: string;
  region?: string;
  motorsport?: string;
  member_count: number;
}

interface Invite {
  id: string;
  team: { id: string; name: string };
  inviter: { id: string; username: string };
  message?: string;
}

export default function TeamsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getTeams().then(r => setTeams(r.data.teams || [])).catch(() => {}),
      user ? getMyTeamInvites().then(r => setInvites(r.data.invites || [])).catch(() => {}) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, [user]);

  const handleAcceptInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      const res = await acceptTeamInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      router.push(`/teams/${res.data.team_id}`);
    } catch {
      alert('Failed to accept invite');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    setActionLoading(inviteId);
    try {
      await declineTeamInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch {
      alert('Failed to decline');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page-container">
      {/* Hero Header */}
      <div className="glass-panel animate-fade-in-up" style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background accent */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'linear-gradient(135deg, var(--crimson-500) 0%, var(--crimson-600) 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4)',
            }}>
              <Shield size={28} strokeWidth={2} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
                marginBottom: '0.25rem',
              }}>
                TEAMS
              </h1>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 500,
              }}>
                Racing Crews
              </p>
            </div>
          </div>

          {user?.account_type === 'team_owner' && (
            <button
              onClick={() => router.push('/teams/new')}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
              }}
            >
              <Plus size={16} />
              <span>Create</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div className="animate-fade-in-up stagger-1" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(234, 179, 8, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Bell size={16} color="var(--gold)" />
            </div>
            <span style={{
              color: 'var(--gold)',
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Team Invites ({invites.length})
            </span>
          </div>

          {invites.map(invite => (
            <div
              key={invite.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                marginBottom: '0.75rem',
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}>
                  {invite.team.name}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                  invited by @{invite.inviter.username}
                </span>
              </div>
              {invite.message && (
                <p style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                  fontStyle: 'italic',
                  padding: '0.75rem',
                  background: 'var(--surface-elevated)',
                  borderRadius: '8px',
                  borderLeft: '3px solid var(--gold)',
                }}>
                  "{invite.message}"
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => handleAcceptInvite(invite.id)}
                  disabled={actionLoading === invite.id}
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Check size={16} /> Accept
                </button>
                <button
                  onClick={() => handleDeclineInvite(invite.id)}
                  disabled={actionLoading === invite.id}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <X size={16} /> Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Teams List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loading-pulse" style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading teams...</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-panel animate-fade-in-up stagger-2" style={{
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <Users size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          </div>
          <p style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}>
            No Teams Yet
          </p>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}>
            Be the first to create a racing crew
          </p>
          {user?.account_type === 'team_owner' && (
            <button
              onClick={() => router.push('/teams/new')}
              className="btn btn-primary"
            >
              Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="animate-fade-in-up stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {teams.map((team, idx) => (
            <button
              key={team.id}
              onClick={() => router.push(`/teams/${team.id}`)}
              className="carbon-card"
              style={{
                padding: '1.25rem',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                animationDelay: `${idx * 0.05}s`,
              }}
            >
              {/* Team avatar */}
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, hsl(${team.name.charCodeAt(0) * 37 % 360}, 60%, 35%), hsl(${team.name.charCodeAt(0) * 37 % 360 + 30}, 60%, 25%))`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#fff',
                fontFamily: 'var(--font-display)',
              }}>
                {team.name[0].toUpperCase()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}>
                    {team.name}
                  </span>
                  {team.motorsport && (
                    <span className="badge badge-crimson" style={{ fontSize: '0.6rem' }}>{team.motorsport}</span>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.5rem',
                }}>
                  <Crown size={12} color="var(--gold)" />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    @{team.owner.username}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={12} />
                    {team.member_count} {team.member_count === 1 ? 'member' : 'members'}
                  </span>
                  {team.region && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={12} />
                      {team.region}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
