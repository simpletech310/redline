'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getStream, getStreamKey, startStream, endStream } from '@/lib/api';
import { ArrowLeft, Copy, Check, Radio, Eye, Play, Square, ExternalLink, Settings, Shield, Wifi } from 'lucide-react';

interface StreamData {
  id: string;
  title: string;
  description?: string;
  motorsport?: string;
  creator_id: string;
  status: string;
  viewer_count: number;
  playback_id?: string;
}

interface StreamKeyData {
  stream_key: string;
  rtmp_url: string;
}

export default function StreamControlPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [stream, setStream] = useState<StreamData | null>(null);
  const [streamKey, setStreamKey] = useState<StreamKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<'key' | 'url' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      getStream(id as string),
      getStreamKey(id as string),
    ])
      .then(([streamRes, keyRes]) => {
        setStream(streamRes.data);
        setStreamKey(keyRes.data);
      })
      .catch((e) => {
        setError(e?.response?.data?.detail || 'Failed to load stream');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = (text: string, type: 'key' | 'url') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleStart = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await startStream(id as string);
      setStream(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to start stream');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!id || !confirm('Are you sure you want to end this stream?')) return;
    setActionLoading(true);
    try {
      await endStream(id as string);
      setStream(prev => prev ? { ...prev, status: 'ended' } : null);
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Failed to end stream');
    } finally {
      setActionLoading(false);
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
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading stream controls...</p>
        </div>
      </div>
    );
  }

  if (error || !stream || !streamKey) {
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
            <Shield size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Access Denied
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {error || 'Stream not found or you don\'t have permission'}
          </p>
          <button
            onClick={() => router.push('/watch')}
            className="btn btn-secondary"
          >
            Back to Streams
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    active: { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--crimson-400)', label: 'LIVE' },
    idle: { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', label: 'Ready' },
    ended: { bg: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-muted)', label: 'Ended' },
  }[stream.status] || { bg: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-muted)', label: stream.status };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-fade-in-up" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <button
          onClick={() => router.push('/watch')}
          style={{
            width: '40px',
            height: '40px',
            background: 'var(--surface-elevated)',
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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.1rem',
              fontWeight: 700,
            }}>
              Stream Control
            </h1>
            <span style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: statusConfig.bg,
              color: statusConfig.color,
            }}>
              {statusConfig.label}
            </span>
          </div>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            marginTop: '0.25rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {stream.title}
          </p>
        </div>
        <Settings size={20} color="var(--text-muted)" />
      </div>

      {/* Status Card */}
      <div className="glass-panel animate-fade-in-up stagger-1" style={{
        padding: '1.5rem',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        {stream.status === 'idle' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <Wifi size={36} color="var(--text-muted)" />
            </div>
            <p style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}>
              Ready to Stream
            </p>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              maxWidth: '280px',
              margin: '0 auto',
            }}>
              Connect your streaming software using the details below, then click "Go Live"
            </p>
          </>
        )}

        {stream.status === 'active' && (
          <>
            <div className="loading-pulse" style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--crimson-500), var(--crimson-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 0 40px rgba(239, 68, 68, 0.4)',
            }}>
              <Radio size={36} color="#fff" />
            </div>
            <p style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}>
              You're Live!
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.9rem',
            }}>
              <Eye size={16} />
              <span>{stream.viewer_count} watching</span>
            </div>
          </>
        )}

        {stream.status === 'ended' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <Square size={36} color="var(--text-muted)" />
            </div>
            <p style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}>
              Stream Ended
            </p>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
            }}>
              Your stream has been completed
            </p>
          </>
        )}
      </div>

      {/* Stream Key Info (only show if not ended) */}
      {stream.status !== 'ended' && (
        <div className="carbon-card animate-fade-in-up stagger-2" style={{
          padding: '1.25rem',
          marginBottom: '1rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            <Shield size={16} color="var(--text-muted)" />
            <h3 style={{
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 600,
            }}>
              Streaming Credentials
            </h3>
          </div>

          {/* RTMP URL */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              color: 'var(--text-muted)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'block',
              marginBottom: '0.5rem',
            }}>
              Server URL
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={streamKey.rtmp_url}
                readOnly
                className="input"
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                }}
              />
              <button
                onClick={() => copyToClipboard(streamKey.rtmp_url, 'url')}
                className="btn btn-secondary"
                style={{ padding: '0.75rem', minWidth: 'auto' }}
              >
                {copied === 'url' ? (
                  <Check size={18} color="var(--victory-500)" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Stream Key */}
          <div>
            <label style={{
              color: 'var(--text-muted)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}>
              Stream Key
              <span style={{
                fontSize: '0.6rem',
                color: 'var(--crimson-400)',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
              }}>
                PRIVATE
              </span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                value={streamKey.stream_key}
                readOnly
                className="input"
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                }}
              />
              <button
                onClick={() => copyToClipboard(streamKey.stream_key, 'key')}
                className="btn btn-secondary"
                style={{ padding: '0.75rem', minWidth: 'auto' }}
              >
                {copied === 'key' ? (
                  <Check size={18} color="var(--victory-500)" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="animate-fade-in-up stagger-3" style={{ display: 'flex', gap: '0.75rem' }}>
        {stream.status === 'idle' && (
          <button
            onClick={handleStart}
            disabled={actionLoading}
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              opacity: actionLoading ? 0.6 : 1,
            }}
          >
            <Play size={20} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
              {actionLoading ? 'Starting...' : 'Go Live'}
            </span>
          </button>
        )}

        {stream.status === 'active' && (
          <>
            <button
              onClick={() => router.push(`/watch/${stream.id}`)}
              className="btn btn-secondary"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <ExternalLink size={18} />
              View Stream
            </button>
            <button
              onClick={handleEnd}
              disabled={actionLoading}
              style={{
                flex: 1,
                padding: '0.875rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--crimson-500)',
                borderRadius: '12px',
                color: 'var(--crimson-400)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                opacity: actionLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
              }}
            >
              <Square size={18} />
              {actionLoading ? 'Ending...' : 'End Stream'}
            </button>
          </>
        )}

        {stream.status === 'ended' && (
          <button
            onClick={() => router.push('/watch')}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Back to Streams
          </button>
        )}
      </div>

      {/* Tip for OBS */}
      {stream.status !== 'ended' && (
        <div className="animate-fade-in-up stagger-4" style={{
          marginTop: '1.5rem',
          padding: '1rem',
          background: 'rgba(34, 211, 238, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(34, 211, 238, 0.2)',
        }}>
          <p style={{
            color: 'var(--nitro-400)',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: '0.35rem',
          }}>
            Quick Setup Guide
          </p>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            lineHeight: 1.5,
          }}>
            In OBS, go to Settings → Stream → select "Custom", paste the Server URL and Stream Key above. Then click "Start Streaming" in OBS, then "Go Live" here.
          </p>
        </div>
      )}
    </div>
  );
}
