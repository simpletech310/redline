'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getLiveStreams, getStreams, createStream } from '@/lib/api';
import { Radio, Play, Eye, Clock, Plus, X, Tv, Signal, Users, ChevronRight } from 'lucide-react';

const SPORTS = ['All', 'Mini Bikes', 'Cars', 'Motorcycles', 'Drift', 'Drag'];

interface Stream {
  id: string;
  title: string;
  description?: string;
  motorsport?: string;
  creator_username?: string;
  run_id?: string;
  status: string;
  viewer_count: number;
  playback_id?: string;
  thumbnail_url?: string;
  started_at?: string;
  created_at: string;
}

export default function WatchPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [recentStreams, setRecentStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('All');

  // Create stream modal
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMotorsport, setNewMotorsport] = useState('');
  const [creating, setCreating] = useState(false);

  const canStream = user?.account_type === 'team_owner';

  useEffect(() => {
    Promise.all([
      getLiveStreams(sport === 'All' ? undefined : sport).then(r => setLiveStreams(r.data?.streams || [])),
      getStreams('ended', sport === 'All' ? undefined : sport).then(r => setRecentStreams(r.data?.streams || [])),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport]);

  const handleCreateStream = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await createStream({
        title: newTitle,
        description: newDesc || undefined,
        motorsport: newMotorsport || undefined,
      });
      router.push(`/watch/${res.data.id}/control`);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to create stream');
    } finally {
      setCreating(false);
    }
  };

  const formatTime = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
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
        {/* Animated background pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
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
              <Tv size={28} strokeWidth={2} color="#fff" />
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
                REDLINE TV
              </h1>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 500,
              }}>
                Live Races & Replays
              </p>
            </div>
          </div>

          {canStream && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
              }}
            >
              <Signal size={16} />
              <span>Go Live</span>
            </button>
          )}
        </div>
      </div>

      {/* Sport Filter Pills */}
      <div className="animate-fade-in-up stagger-1" style={{
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        marginBottom: '1.5rem',
        scrollbarWidth: 'none',
      }}>
        {SPORTS.map(s => (
          <button
            key={s}
            onClick={() => setSport(s)}
            className={sport === s ? 'badge badge-crimson' : 'badge badge-outline'}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Create Stream Modal */}
      {showCreate && (
        <div className="glass-panel animate-fade-in-up" style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--crimson-500)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Signal size={18} color="#fff" />
              </div>
              <span style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '1rem',
              }}>Start Live Stream</span>
            </div>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <X size={18} color="var(--text-muted)" />
            </button>
          </div>

          <input
            placeholder="Stream title..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="input"
            style={{ marginBottom: '0.75rem' }}
          />

          <textarea
            placeholder="Description (optional)..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            rows={2}
            className="input"
            style={{ marginBottom: '0.75rem', resize: 'none' }}
          />

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={newMotorsport}
              onChange={e => setNewMotorsport(e.target.value)}
              className="input"
              style={{ flex: 1 }}
            >
              <option value="">Select motorsport...</option>
              {SPORTS.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button
              onClick={handleCreateStream}
              disabled={creating || !newTitle.trim()}
              className="btn btn-primary"
              style={{ opacity: creating || !newTitle.trim() ? 0.5 : 1 }}
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div className="loading-pulse" style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
            margin: '0 auto 1rem',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading streams...</p>
        </div>
      ) : (
        <>
          {/* Live Now Section */}
          <div className="animate-fade-in-up stagger-2" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="live-indicator" style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--crimson-500)',
                boxShadow: '0 0 12px var(--crimson-500)',
                animation: 'pulse-glow 2s infinite',
              }} />
              <h2 style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                fontSize: '0.875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                Live Now
              </h2>
              {liveStreams.length > 0 && (
                <span className="badge badge-crimson" style={{ fontSize: '0.65rem' }}>
                  {liveStreams.length}
                </span>
              )}
            </div>

            {liveStreams.length === 0 ? (
              <div className="carbon-card" style={{
                padding: '3rem 1.5rem',
                textAlign: 'center',
              }}>
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
                  <Radio size={28} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  No live streams right now
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Check back soon or follow your favorite teams
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {liveStreams.map((stream, idx) => (
                  <button
                    key={stream.id}
                    onClick={() => router.push(`/watch/${stream.id}`)}
                    className="carbon-card animate-fade-in-up"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      animationDelay: `${idx * 0.1}s`,
                    }}
                  >
                    {/* Live border glow */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      border: '2px solid var(--crimson-500)',
                      borderRadius: '16px',
                      pointerEvents: 'none',
                      boxShadow: '0 0 20px rgba(239, 68, 68, 0.3), inset 0 0 20px rgba(239, 68, 68, 0.1)',
                    }} />

                    {/* Thumbnail */}
                    <div style={{
                      height: '160px',
                      background: stream.thumbnail_url
                        ? `url(${stream.thumbnail_url}) center/cover`
                        : 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--void-900) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {/* Gradient overlay */}
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 60%)',
                      }} />

                      {/* Live badge */}
                      <div className="badge badge-crimson" style={{
                        position: 'absolute',
                        top: '0.75rem',
                        left: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.65rem',
                        animation: 'pulse-glow 2s infinite',
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          background: '#fff',
                          borderRadius: '50%',
                        }} />
                        LIVE
                      </div>

                      {/* Viewer count */}
                      <div style={{
                        position: 'absolute',
                        bottom: '0.75rem',
                        right: '0.75rem',
                        padding: '0.3rem 0.6rem',
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontWeight: 600,
                      }}>
                        <Users size={12} /> {stream.viewer_count}
                      </div>

                      {!stream.thumbnail_url && (
                        <Play size={48} color="var(--text-muted)" style={{ opacity: 0.2, position: 'relative', zIndex: 1 }} />
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ padding: '1rem' }}>
                      <div style={{
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 600,
                        fontSize: '1rem',
                        marginBottom: '0.5rem',
                      }}>
                        {stream.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          @{stream.creator_username}
                        </span>
                        {stream.motorsport && (
                          <span className="badge badge-outline">{stream.motorsport}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Streams */}
          {recentStreams.length > 0 && (
            <div className="animate-fade-in-up stagger-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Clock size={14} color="var(--text-muted)" />
                <h2 style={{
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Recent Streams
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {recentStreams.slice(0, 10).map((stream, idx) => (
                  <button
                    key={stream.id}
                    onClick={() => router.push(`/watch/${stream.id}`)}
                    className="carbon-card"
                    style={{
                      padding: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{
                      width: '72px',
                      height: '48px',
                      background: stream.thumbnail_url
                        ? `url(${stream.thumbnail_url}) center/cover`
                        : 'var(--surface-elevated)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {!stream.thumbnail_url && <Play size={16} color="var(--text-muted)" style={{ opacity: 0.5 }} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        marginBottom: '0.25rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {stream.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        @{stream.creator_username} · {formatTime(stream.created_at)}
                      </div>
                    </div>

                    {/* Motorsport badge & arrow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {stream.motorsport && (
                        <span className="badge badge-outline" style={{ fontSize: '0.65rem' }}>
                          {stream.motorsport}
                        </span>
                      )}
                      <ChevronRight size={16} color="var(--text-muted)" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
