'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getRedliner, getRedlinerStats, getRedlinerHistory } from '@/lib/api';
import { ArrowLeft, Trophy, Clock, Zap, Car, MapPin, Calendar, ChevronRight, Target, Award, Gauge, Shield } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  account_type: string;
  region?: string;
  card: {
    name: string;
    bio: string;
    trust_score: number;
    stats: Record<string, number>;
  };
  machines: Array<{
    id: string;
    name: string;
    vehicle_type: string;
    build_level: string;
    inferred_stats?: Record<string, number>;
  }>;
}

interface Stats {
  core_stats: {
    total_races: number;
    wins: number;
    losses: number;
    win_rate: number;
    best_et?: number;
    avg_reaction_time?: number;
  };
  sport_stats: Record<string, { races: number; wins: number; best_et?: number }>;
  trust_score: number;
}

interface Race {
  run_id: string;
  run_name: string;
  motorsport?: string;
  location: string;
  date_time: string;
  placement?: number;
  best_et?: number;
  reaction_time?: number;
  won: boolean;
}

const BUILD_CONFIG: Record<string, { color: string; bg: string }> = {
  stock: { color: 'var(--text-secondary)', bg: 'rgba(156, 163, 175, 0.1)' },
  mild: { color: 'var(--nitro-400)', bg: 'rgba(34, 211, 238, 0.1)' },
  performance: { color: 'var(--gold)', bg: 'rgba(255, 215, 0, 0.1)' },
  monster: { color: 'var(--crimson-400)', bg: 'rgba(239, 68, 68, 0.1)' },
};

export default function RedlinerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stats' | 'garage' | 'history'>('stats');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getRedliner(id as string).then(r => setProfile(r.data)),
      getRedlinerStats(id as string).then(r => setStats(r.data)),
      getRedlinerHistory(id as string).then(r => setRaces(r.data.races || [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const formatDate = (dt: string) => {
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getBuildConfig = (level?: string) => BUILD_CONFIG[level?.toLowerCase() || ''] || BUILD_CONFIG.stock;

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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
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
            <Zap size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Redliner Not Found
          </p>
          <button onClick={() => router.back()} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const accountTypeConfig = {
    team_owner: { color: 'var(--crimson-400)', bg: 'rgba(239, 68, 68, 0.15)', label: 'Team Owner' },
    jockey: { color: 'var(--nitro-400)', bg: 'rgba(34, 211, 238, 0.15)', label: 'Jockey' },
    spectator: { color: 'var(--text-muted)', bg: 'var(--surface-elevated)', label: 'Spectator' },
  }[profile.account_type] || { color: 'var(--text-muted)', bg: 'var(--surface-elevated)', label: profile.account_type };

  return (
    <div className="page-container">
      {/* Profile Header */}
      <div className="glass-panel animate-fade-in-up" style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glow based on username */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 20% 50%, hsl(${profile.username.charCodeAt(0) * 37 % 360}, 60%, 15%) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
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
              marginBottom: '1rem',
            }}
          >
            <ArrowLeft size={18} color="var(--text-primary)" />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Avatar */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              background: `linear-gradient(135deg, hsl(${profile.username.charCodeAt(0) * 37 % 360}, 60%, 45%), hsl(${profile.username.charCodeAt(0) * 37 % 360 + 30}, 60%, 35%))`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 400,
              color: '#fff',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              {profile.username[0].toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
                marginBottom: '0.5rem',
              }}>
                @{profile.username.toUpperCase()}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  background: accountTypeConfig.bg,
                  color: accountTypeConfig.color,
                }}>
                  {accountTypeConfig.label}
                </span>
                {profile.region && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                  }}>
                    <MapPin size={12} />
                    {profile.region}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.card.bio && (
        <div className="carbon-card animate-fade-in-up stagger-1" style={{
          padding: '1rem',
          marginBottom: '1rem',
          borderLeft: '3px solid var(--crimson-500)',
        }}>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "{profile.card.bio}"
          </p>
        </div>
      )}

      {/* Quick Stats Grid */}
      {stats && (
        <div className="animate-fade-in-up stagger-2" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}>
          <div className="carbon-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem',
            }}>
              <Target size={16} color="var(--text-muted)" />
            </div>
            <div className="stat-value" style={{ fontSize: '1.25rem', marginBottom: '0.15rem' }}>
              {stats.core_stats.total_races}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Races
            </div>
          </div>

          <div className="carbon-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(74, 222, 128, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem',
            }}>
              <Trophy size={16} color="var(--victory-500)" />
            </div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--victory-500)', marginBottom: '0.15rem' }}>
              {stats.core_stats.wins}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Wins
            </div>
          </div>

          <div className="carbon-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem',
            }}>
              <Gauge size={16} color="var(--crimson-400)" />
            </div>
            <div className="stat-value" style={{ fontSize: '1.25rem', marginBottom: '0.15rem' }}>
              {(stats.core_stats.win_rate * 100).toFixed(0)}%
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Win Rate
            </div>
          </div>

          <div className="carbon-card" style={{ padding: '0.875rem', textAlign: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 215, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.5rem',
            }}>
              <Shield size={16} color="var(--gold)" />
            </div>
            <div className="stat-value" style={{ fontSize: '1.25rem', color: 'var(--gold)', marginBottom: '0.15rem' }}>
              {stats.trust_score.toFixed(0)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>
              Trust
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs animate-fade-in-up stagger-3" style={{ marginBottom: '1.25rem' }}>
        {[
          { key: 'stats', label: 'Stats', icon: Trophy },
          { key: 'garage', label: 'Garage', icon: Car },
          { key: 'history', label: 'History', icon: Clock },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'stats' | 'garage' | 'history')}
            className={`tab ${tab === t.key ? 'tab-active' : ''}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'stats' && stats && (
        <div className="animate-fade-in-up">
          {/* Best Times */}
          <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Award size={16} color="var(--gold)" />
              <h3 style={{
                color: 'var(--text-secondary)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
              }}>
                Personal Bests
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Best ET
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontSize: '2rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}>
                  {stats.core_stats.best_et ? `${stats.core_stats.best_et.toFixed(2)}` : '—'}
                  {stats.core_stats.best_et && <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>s</span>}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                  Avg Reaction
                </div>
                <div style={{
                  color: 'var(--text-primary)',
                  fontSize: '2rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                }}>
                  {stats.core_stats.avg_reaction_time ? `${stats.core_stats.avg_reaction_time.toFixed(3)}` : '—'}
                  {stats.core_stats.avg_reaction_time && <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>s</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Per-Sport Stats */}
          {Object.keys(stats.sport_stats).length > 0 && (
            <div>
              <h3 style={{
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}>
                By Motorsport
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(stats.sport_stats).map(([sport, data]) => (
                  <div key={sport} className="carbon-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-crimson">{sport}</span>
                      <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{data.races} races</span>
                        <span style={{ color: 'var(--victory-500)', fontWeight: 600 }}>{data.wins} wins</span>
                        {data.best_et && (
                          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {data.best_et.toFixed(2)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'garage' && (
        <div className="animate-fade-in-up">
          {profile.machines.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--surface-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Car size={28} color="var(--text-muted)" style={{ opacity: 0.5 }} />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                No Public Machines
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                This jockey hasn't shared any vehicles
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {profile.machines.map((m, idx) => {
                const buildConfig = getBuildConfig(m.build_level);

                return (
                  <div
                    key={m.id}
                    className="carbon-card"
                    style={{
                      padding: '1.25rem',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Side accent */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      background: buildConfig.color,
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 700,
                          fontSize: '1rem',
                          marginBottom: '0.25rem',
                        }}>
                          {m.name || m.vehicle_type}
                        </div>
                        {m.name && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.vehicle_type}</div>
                        )}
                      </div>
                      <span style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: buildConfig.bg,
                        color: buildConfig.color,
                        letterSpacing: '0.03em',
                      }}>
                        {m.build_level}
                      </span>
                    </div>

                    {m.inferred_stats && Object.keys(m.inferred_stats).length > 0 && (
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        fontSize: '0.8rem',
                        padding: '0.75rem',
                        background: 'var(--surface-elevated)',
                        borderRadius: '8px',
                      }}>
                        {m.inferred_stats.horsepower && (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>{m.inferred_stats.horsepower}</strong> HP
                          </span>
                        )}
                        {m.inferred_stats.estimated_60ft_sec && (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            60ft: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{m.inferred_stats.estimated_60ft_sec}s</strong>
                          </span>
                        )}
                        {m.inferred_stats.estimated_top_mph && (
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Top: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{m.inferred_stats.estimated_top_mph}</strong> mph
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="animate-fade-in-up">
          {races.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--surface-elevated)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <Clock size={28} color="var(--text-muted)" style={{ opacity: 0.5 }} />
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                No Race History
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                This jockey hasn't competed yet
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {races.map((race, idx) => (
                <button
                  key={race.run_id}
                  onClick={() => router.push(`/runs/${race.run_id}`)}
                  className="carbon-card"
                  style={{
                    padding: '1rem',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    {/* Result indicator */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: race.won ? 'rgba(74, 222, 128, 0.15)' : 'var(--surface-elevated)',
                      border: race.won ? '1px solid var(--victory-500)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {race.won ? (
                        <Trophy size={18} color="var(--victory-500)" />
                      ) : (
                        <span style={{
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}>
                          #{race.placement}
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        marginBottom: '0.35rem',
                      }}>
                        {race.run_name}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {race.motorsport && (
                          <span className="badge badge-outline" style={{ fontSize: '0.6rem' }}>{race.motorsport}</span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={10} />
                          {formatDate(race.date_time)}
                        </span>
                        {race.best_et && (
                          <span style={{ fontFamily: 'var(--font-mono)' }}>
                            ET: {race.best_et.toFixed(2)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
