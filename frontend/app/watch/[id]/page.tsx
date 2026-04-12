'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getStream, viewerPing } from '@/lib/api';
import { ArrowLeft, Radio, Users, Share2, Heart, Clock, Trophy, ChevronRight } from 'lucide-react';
import { StreamPlayer } from '@/components/StreamPlayer';

interface StreamData {
  id: string;
  title: string;
  description?: string;
  motorsport?: string;
  creator_id: string;
  creator_username?: string;
  run_id?: string;
  status: string;
  viewer_count: number;
  playback_id?: string;
  playback_url?: string;
  thumbnail_url?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export default function WatchStreamPage() {
  const { id } = useParams();
  const router = useRouter();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (!id) return;

    getStream(id as string)
      .then(r => {
        setStream(r.data);
        setViewerCount(r.data.viewer_count || 0);
      })
      .catch(() => setError('Stream not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleViewerPing = useCallback(() => {
    if (!id) return;
    viewerPing(id as string)
      .then(r => setViewerCount(r.data.viewer_count))
      .catch(() => {});
  }, [id]);

  const formatDuration = (start: string) => {
    const diff = Date.now() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading stream...</p>
        </div>
      </div>
    );
  }

  if (error || !stream) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--void-950)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '320px' }}>
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
            <Radio size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            {error || 'Stream not found'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            This stream may have ended or doesn't exist
          </p>
          <button
            onClick={() => router.push('/watch')}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            Back to Streams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void-950)' }}>
      {/* Video Player Section */}
      <div style={{ position: 'relative', background: '#000' }}>
        {stream.playback_url && stream.status === 'active' ? (
          <StreamPlayer
            src={stream.playback_url}
            poster={stream.thumbnail_url}
            isLive={stream.status === 'active'}
            onViewerPing={handleViewerPing}
            autoPlay
          />
        ) : (
          <div style={{
            width: '100%',
            aspectRatio: '16/9',
            background: stream.thumbnail_url
              ? `url(${stream.thumbnail_url}) center/cover`
              : 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--void-900) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Overlay gradient */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
            }} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              {stream.status === 'ended' ? (
                <>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}>
                    <Radio size={32} color="var(--text-muted)" />
                  </div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Stream Ended
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Recording may be available soon
                  </p>
                </>
              ) : (
                <>
                  <div className="loading-pulse" style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--crimson-500)',
                    }} />
                  </div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Waiting to go live...
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Stream starting soon
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Back button overlay */}
        <button
          onClick={() => router.push('/watch')}
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '40px',
            height: '40px',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <ArrowLeft size={20} color="#fff" />
        </button>

        {/* Live indicator & viewer count */}
        {stream.status === 'active' && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <div className="badge badge-crimson" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
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
            <div style={{
              padding: '0.4rem 0.75rem',
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(8px)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600,
            }}>
              <Users size={14} /> {viewerCount}
            </div>
          </div>
        )}
      </div>

      {/* Stream Info */}
      <div className="page-container" style={{ paddingTop: '1.25rem' }}>
        {/* Title & Creator */}
        <div className="animate-fade-in-up">
          <h1 style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '1rem',
            lineHeight: 1.3,
          }}>
            {stream.title}
          </h1>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            {/* Creator avatar */}
            <div className="avatar avatar-md" style={{
              background: `linear-gradient(135deg, hsl(${(stream.creator_username || 'U').charCodeAt(0) * 37 % 360}, 70%, 45%), hsl(${(stream.creator_username || 'U').charCodeAt(0) * 37 % 360 + 30}, 70%, 35%))`,
            }}>
              {(stream.creator_username || 'U')[0].toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                marginBottom: '0.25rem',
              }}>
                @{stream.creator_username}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {stream.motorsport && (
                  <span className="badge badge-outline">{stream.motorsport}</span>
                )}
                {stream.started_at && stream.status === 'active' && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                  }}>
                    <Clock size={12} />
                    Live for {formatDuration(stream.started_at)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {stream.description && (
            <p style={{
              color: 'var(--text-secondary)',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              marginBottom: '1.25rem',
            }}>
              {stream.description}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="animate-fade-in-up stagger-1" style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}>
          <button
            onClick={() => setLiked(!liked)}
            className={liked ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
            {liked ? 'Supported' : 'Support'}
          </button>
          <button
            onClick={() => {
              navigator.share?.({
                title: stream.title,
                text: `Watch ${stream.title} on Redline TV`,
                url: window.location.href,
              }).catch(() => {
                navigator.clipboard.writeText(window.location.href);
              });
            }}
            className="btn btn-secondary"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Share2 size={18} />
            Share
          </button>
        </div>

        {/* Linked Run Card */}
        {stream.run_id && (
          <button
            onClick={() => router.push(`/runs/${stream.run_id}`)}
            className="glass-panel animate-fade-in-up stagger-2"
            style={{
              width: '100%',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
              border: '1px solid var(--crimson-500)',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Trophy size={22} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '0.95rem',
                marginBottom: '0.25rem',
              }}>
                View Race Details
              </div>
              <div style={{
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}>
                Make picks and place bets on this race
              </div>
            </div>
            <ChevronRight size={20} color="var(--crimson-500)" />
          </button>
        )}
      </div>
    </div>
  );
}
