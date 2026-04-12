'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getFeed, addReaction, createPost } from '@/lib/api';
import { uploadFile, validateMediaFile, getMediaType } from '@/lib/supabase';
import {
  Zap,
  MessageCircle,
  Clock,
  Settings,
  Image,
  Video,
  X,
  Send,
  Loader2,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';

const SPORTS = ['All', 'Mini Bikes', 'Cars', 'Motorcycles', 'Drift', 'Drag'];
const REACTIONS = ['🔥', '💯', '😤', '⚡', '🏁'];

interface Post {
  id: string;
  author_id: string;
  author_username: string;
  author_account_type?: string;
  content: string;
  motorsport?: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  reaction_counts?: Record<string, number>;
  comment_count?: number;
}

export default function FeedPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [sport, setSport] = useState('All');
  const [loading, setLoading] = useState(true);

  // Create post state
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newMotorsport, setNewMotorsport] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | ''>('');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canPost = user && (user.account_type === 'jockey' || user.account_type === 'team_owner');

  useEffect(() => {
    getFeed(sport === 'All' ? undefined : sport)
      .then(r => setPosts(r.data?.posts || r.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [sport]);

  const timeAgo = (dt: string) => {
    const diff = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const handleReaction = async (postId: string, reaction: string) => {
    if (!user) return;
    try {
      const res = await addReaction(postId, reaction);
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, reaction_counts: res.data.reaction_counts } : p
      ));
    } catch {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }
    setMediaFile(file);
    setMediaType(getMediaType(file) || '');
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview('');
    setMediaType('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!newContent.trim() && !mediaFile) return;
    setPosting(true);
    setUploadError('');

    try {
      let mediaUrl = '';
      if (mediaFile) {
        setUploading(true);
        const uploadResult = await uploadFile(mediaFile, 'posts');
        setUploading(false);
        if (uploadResult.error) {
          setUploadError(uploadResult.error);
          setPosting(false);
          return;
        }
        mediaUrl = uploadResult.url;
      }

      await createPost({
        content: newContent || (mediaFile ? `Shared a ${mediaType}` : ''),
        motorsport: newMotorsport || undefined,
        media_url: mediaUrl || undefined,
        media_type: mediaType || undefined,
      });

      const r = await getFeed(sport === 'All' ? undefined : sport);
      setPosts(r.data?.posts || []);
      setNewContent('');
      setNewMotorsport('');
      clearMedia();
      setShowCompose(false);
    } catch (e: any) {
      setUploadError(e?.response?.data?.detail || 'Failed to post');
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
      'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
      'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
      'linear-gradient(135deg, #059669 0%, #047857 100%)',
      'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--crimson-600) 0%, var(--crimson-700) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
            }}
          >
            <Zap size={22} color="#fff" fill="#fff" />
          </div>
          <div>
            <h1 className="text-display" style={{ fontSize: '1.75rem', lineHeight: 1 }}>
              THE PULSE
            </h1>
            <p className="page-subtitle">Community Feed</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/redliners/' + user?.id)}
          className="btn btn-ghost btn-icon"
          style={{ borderRadius: '50%' }}
        >
          <Settings size={18} />
        </button>
      </header>

      {/* Sport Filter Pills */}
      <div
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
          marginBottom: '1.25rem',
        }}
      >
        {SPORTS.map((s, i) => {
          const active = sport === s;
          return (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`animate-fade-in stagger-${i + 1}`}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                background: active
                  ? 'linear-gradient(135deg, var(--crimson-600) 0%, var(--crimson-700) 100%)'
                  : 'var(--void-800)',
                color: active ? '#fff' : 'var(--text-secondary)',
                border: active ? 'none' : '1px solid var(--border-subtle)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                letterSpacing: '0.02em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: active ? '0 4px 12px rgba(220, 38, 38, 0.25)' : 'none',
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Compose Button */}
      {canPost && !showCompose && (
        <button
          onClick={() => setShowCompose(true)}
          className="carbon-card carbon-card-interactive animate-fade-in"
          style={{
            width: '100%',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            border: 'none',
            textAlign: 'left',
          }}
        >
          <div
            className="avatar avatar-lg"
            style={{ background: getAvatarColor(user?.username || 'U') }}
          >
            {(user?.username || 'U')[0].toUpperCase()}
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', flex: 1 }}>
            Share a race clip, update, or victory...
          </span>
          <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
        </button>
      )}

      {/* Compose Form */}
      {showCompose && (
        <div className="carbon-card animate-scale-in" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="text-heading" style={{ fontSize: '1rem' }}>Create Post</span>
            <button
              onClick={() => { setShowCompose(false); clearMedia(); }}
              className="btn btn-ghost btn-icon btn-sm"
            >
              <X size={16} />
            </button>
          </div>

          <textarea
            placeholder="What's happening on the track?"
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={3}
            className="input-carbon"
            style={{
              resize: 'none',
              marginBottom: '1rem',
              minHeight: '100px',
            }}
          />

          {/* Media Preview */}
          {mediaPreview && (
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <button
                onClick={clearMedia}
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  padding: '0.375rem',
                  background: 'rgba(0, 0, 0, 0.8)',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  zIndex: 10,
                }}
              >
                <X size={14} color="#fff" />
              </button>
              {mediaType === 'image' && (
                <div className="media-container">
                  <img src={mediaPreview} alt="Preview" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover' }} />
                </div>
              )}
              {mediaType === 'video' && (
                <VideoPlayer src={mediaPreview} />
              )}
            </div>
          )}

          {uploadError && (
            <div
              style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--card-radius-sm)',
                color: 'var(--crimson-400)',
                fontSize: '0.8125rem',
              }}
            >
              {uploadError}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'image/*';
                  fileInputRef.current.click();
                }
              }}
              disabled={!!mediaFile}
              className={`btn btn-sm ${mediaType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ opacity: mediaFile && mediaType !== 'image' ? 0.5 : 1 }}
            >
              <Image size={14} /> Photo
            </button>
            <button
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.accept = 'video/*';
                  fileInputRef.current.click();
                }
              }}
              disabled={!!mediaFile}
              className={`btn btn-sm ${mediaType === 'video' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ opacity: mediaFile && mediaType !== 'video' ? 0.5 : 1 }}
            >
              <Video size={14} /> Video
            </button>

            <select
              value={newMotorsport}
              onChange={e => setNewMotorsport(e.target.value)}
              className="input-carbon"
              style={{
                width: 'auto',
                padding: '0.5rem 0.75rem',
                fontSize: '0.8125rem',
              }}
            >
              <option value="">Tag sport...</option>
              {SPORTS.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div style={{ flex: 1 }} />

            <button
              onClick={handlePost}
              disabled={posting || uploading || (!newContent.trim() && !mediaFile)}
              className="btn btn-primary"
            >
              {uploading ? (
                <><Loader2 size={14} className="animate-spin" /> Uploading</>
              ) : posting ? (
                <><Loader2 size={14} className="animate-spin" /> Posting</>
              ) : (
                <><Send size={14} /> Post</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Posts */}
      {loading ? (
        <div className="empty-state">
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, marginBottom: '1rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '60%', marginBottom: '0.5rem' }} />
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Flame size={28} />
          </div>
          <p className="empty-state-title">No posts yet</p>
          <p className="empty-state-description">Be the first to share something with the community</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map((post, i) => (
            <article
              key={post.id}
              className={`carbon-card animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
              style={{ padding: '1.25rem', opacity: 0 }}
            >
              {/* Post Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
                <button
                  onClick={() => router.push(`/redliners/${post.author_id}`)}
                  className="avatar avatar-lg"
                  style={{ background: getAvatarColor(post.author_username), border: 'none', cursor: 'pointer' }}
                >
                  {post.author_username?.[0]?.toUpperCase() || '?'}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => router.push(`/redliners/${post.author_id}`)}
                      className="text-heading truncate"
                      style={{
                        fontSize: '0.9375rem',
                        color: 'var(--text-primary)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    >
                      @{post.author_username}
                    </button>
                    {post.author_account_type && (
                      <span className={`badge ${post.author_account_type === 'team_owner' ? 'badge-crimson' : 'badge-nitro'}`}>
                        {post.author_account_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {post.motorsport && (
                      <span className="badge badge-muted">{post.motorsport}</span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={11} /> {timeAgo(post.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              {post.content && (
                <p style={{
                  color: 'var(--text-primary)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                  marginBottom: post.media_url ? '1rem' : '0.875rem',
                }}>
                  {post.content}
                </p>
              )}

              {/* Media */}
              {post.media_url && (
                <div style={{ marginBottom: '1rem' }}>
                  {post.media_type === 'image' && (
                    <div className="media-container">
                      <img
                        src={post.media_url}
                        alt="Post media"
                        style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  {post.media_type === 'video' && (
                    <>
                      {post.media_url.includes('youtube.com') || post.media_url.includes('youtu.be') ? (
                        <div className="media-container">
                          <iframe
                            src={post.media_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                            style={{ width: '100%', aspectRatio: '16/9', border: 'none' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <VideoPlayer src={post.media_url} />
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Reactions */}
              <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                {REACTIONS.map(r => {
                  const count = post.reaction_counts?.[r] || 0;
                  const hasReactions = count > 0;
                  return (
                    <button
                      key={r}
                      onClick={() => handleReaction(post.id, r)}
                      className={`reaction-pill ${hasReactions ? 'reaction-pill-active' : ''}`}
                      disabled={!user}
                      style={{ opacity: user ? 1 : 0.6 }}
                    >
                      <span>{r}</span>
                      <span className="reaction-pill-count">{count}</span>
                    </button>
                  );
                })}
                <button className="reaction-pill">
                  <MessageCircle size={14} />
                  <span className="reaction-pill-count">{post.comment_count || 0}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
