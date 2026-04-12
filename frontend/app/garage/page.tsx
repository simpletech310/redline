'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getGarage, togglePrivacy } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Car, Eye, EyeOff, Plus, Wrench, Gauge, Trophy, Zap, ChevronRight, Shield } from 'lucide-react';

interface Machine {
  id: string;
  name?: string;
  vehicle_type?: string;
  vehicle_class?: string;
  build_level?: string;
  reliability_level?: number;
  motorsport?: string;
  is_public?: boolean;
  inferred_stats?: {
    win_rate?: number;
    reliability?: number;
    engine?: string;
    total_races?: number;
    wins?: number;
  };
}

const BUILD_CONFIG: Record<string, { color: string; bg: string; glow: string }> = {
  stock: { color: 'var(--text-secondary)', bg: 'rgba(156, 163, 175, 0.1)', glow: 'none' },
  mild: { color: 'var(--nitro-400)', bg: 'rgba(34, 211, 238, 0.1)', glow: '0 0 12px rgba(34, 211, 238, 0.3)' },
  performance: { color: 'var(--crimson-400)', bg: 'rgba(239, 68, 68, 0.1)', glow: '0 0 12px rgba(239, 68, 68, 0.3)' },
  monster: { color: 'var(--gold)', bg: 'rgba(255, 215, 0, 0.1)', glow: '0 0 16px rgba(255, 215, 0, 0.4)' },
};

export default function GaragePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGarage();
      setMachines(res.data || []);
    } catch {
      setMachines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTogglePrivacy = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePrivacy(id);
    load();
  };

  const getBuildConfig = (level?: string) => BUILD_CONFIG[level?.toLowerCase() || ''] || BUILD_CONFIG.stock;

  const stats = {
    total: machines.length,
    public: machines.filter(m => m.is_public).length,
    totalWins: machines.reduce((acc, m) => acc + (m.inferred_stats?.wins || 0), 0),
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
              <Car size={28} strokeWidth={2} color="#fff" />
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
                GARAGE
              </h1>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 500,
              }}>
                Fleet Manager
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push('/garage/new')}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
            }}
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Fleet Stats */}
      <div className="animate-fade-in-up stagger-1" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <div className="carbon-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.5rem',
          }}>
            <Gauge size={18} color="var(--text-muted)" />
          </div>
          <div className="stat-value" style={{ marginBottom: '0.25rem' }}>{stats.total}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Fleet
          </div>
        </div>

        <div className="carbon-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(74, 222, 128, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.5rem',
          }}>
            <Eye size={18} color="var(--victory-500)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--victory-500)', marginBottom: '0.25rem' }}>{stats.public}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Public
          </div>
        </div>

        <div className="carbon-card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(255, 215, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.5rem',
          }}>
            <Trophy size={18} color="var(--gold)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>{stats.totalWins}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Wins
          </div>
        </div>
      </div>

      {/* Machines */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loading-pulse" style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading fleet...</p>
        </div>
      ) : machines.length === 0 ? (
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
            <Car size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          </div>
          <p style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.1rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
          }}>
            Your Garage is Empty
          </p>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}>
            Register your first machine to start building your fleet
          </p>
          <button
            onClick={() => router.push('/garage/new')}
            className="btn btn-primary"
          >
            Register First Machine
          </button>
        </div>
      ) : (
        <div className="animate-fade-in-up stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {machines.map((m, idx) => {
            const buildConfig = getBuildConfig(m.build_level);
            const winRate = m.inferred_stats?.win_rate ?? 0;

            return (
              <button
                key={m.id}
                className="carbon-card"
                style={{
                  padding: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                  animationDelay: `${idx * 0.05}s`,
                }}
                onClick={() => router.push(`/garage/${m.id}`)}
              >
                {/* Diagonal accent stripe */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '4px',
                  height: '100%',
                  background: buildConfig.color,
                  boxShadow: buildConfig.glow,
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  {/* Machine icon */}
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: buildConfig.bg,
                    border: `1px solid ${buildConfig.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Car size={24} color={buildConfig.color} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name & Type */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      {m.name && (
                        <div style={{
                          color: 'var(--crimson-400)',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '0.2rem',
                        }}>
                          {m.name}
                        </div>
                      )}
                      <h3 style={{
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {m.vehicle_type || 'Vehicle'}
                      </h3>
                    </div>

                    {/* Tags */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                      {m.motorsport && (
                        <span className="badge badge-outline" style={{ fontSize: '0.65rem' }}>{m.motorsport}</span>
                      )}
                      {m.vehicle_class && (
                        <span className="badge badge-outline" style={{ fontSize: '0.65rem' }}>{m.vehicle_class}</span>
                      )}
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        background: buildConfig.bg,
                        color: buildConfig.color,
                        letterSpacing: '0.05em',
                      }}>
                        {m.build_level || 'Stock'}
                      </span>
                    </div>

                    {/* Stats Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                    }}>
                      {/* Win Rate */}
                      {m.inferred_stats?.win_rate !== undefined && (
                        <div style={{ flex: 1 }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.35rem',
                          }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600 }}>
                              Win Rate
                            </span>
                            <span style={{ color: 'var(--text-primary)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {(winRate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div style={{
                            height: '4px',
                            background: 'var(--surface-elevated)',
                            borderRadius: '999px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, winRate * 100)}%`,
                              background: winRate > 0.5 ? 'var(--victory-500)' : 'var(--crimson-500)',
                              borderRadius: '999px',
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      )}

                      {/* Engine */}
                      {m.inferred_stats?.engine && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.5rem',
                          background: 'var(--surface-elevated)',
                          borderRadius: '6px',
                        }}>
                          <Wrench size={12} color="var(--text-muted)" />
                          <span style={{
                            color: 'var(--text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            maxWidth: '80px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {m.inferred_stats.engine}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side: Privacy toggle & arrow */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      onClick={e => handleTogglePrivacy(m.id, e)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: m.is_public ? 'rgba(74, 222, 128, 0.1)' : 'var(--surface-elevated)',
                        border: `1px solid ${m.is_public ? 'var(--victory-500)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      title={m.is_public ? 'Public — click to hide' : 'Private — click to show'}
                    >
                      {m.is_public
                        ? <Eye size={14} color="var(--victory-500)" />
                        : <EyeOff size={14} color="var(--text-muted)" />
                      }
                    </button>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
