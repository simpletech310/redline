'use client';

import { useEffect, useState } from 'react';
import { getCard, updateCard } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Shield, Trophy, Car, Edit2, Save, X } from 'lucide-react';

interface RedlineCard {
  id: string;
  name: string;
  bio: string;
  trust_score?: number;
  stats?: {
    total_runs?: number;
    total_wins?: number;
    win_rate?: number;
  };
}

export default function CardPage() {
  const { user } = useAuth();
  const [card, setCard] = useState<RedlineCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCard()
      .then(r => {
        setCard(r.data);
        setForm({ name: r.data.name || '', bio: r.data.bio || '' });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateCard(form);
      setCard(res.data);
      setEditing(false);
    } catch {} finally {
      setSaving(false);
    }
  };

  const trust = card?.trust_score ?? 0;
  const trustColor = trust >= 90 ? '#facc15' : trust >= 70 ? '#4ade80' : trust >= 50 ? '#60a5fa' : '#f87171';

  if (loading) return <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>Loading...</div>;

  return (
    <div className="page-container">
      {/* Hero Card */}
      <div style={{
        background: 'linear-gradient(135deg, #3b0000 0%, #1c1c1c 60%)',
        border: '1px solid #2a2a2a',
        borderRadius: '1rem',
        padding: '1.5rem',
        marginBottom: '1rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background texture effect */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(220,38,38,0.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'relative' }}>
          {/* Avatar + Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: `hsl(${user?.username?.charCodeAt(0)! * 37 % 360}, 60%, 30%)`,
              border: '3px solid #2a2a2a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', fontWeight: 900, color: '#fff',
            }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                {card?.name || user?.username}
              </h1>
              <span className="badge" style={{ background: 'rgba(220,38,38,0.15)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)', textTransform: 'uppercase', fontSize: '0.6rem' }}>
                {user?.account_type?.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Bio */}
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input className="input-carbon" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Display name..." />
              <textarea className="input-carbon" value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Your bio..." rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleSave} disabled={saving} className="btn-redline" style={{ flex: 1, fontSize: '0.85rem', padding: '0.6rem' }}>
                  <Save size={14} style={{ marginRight: '0.3rem', display: 'inline' }} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-ghost" style={{ padding: '0.6rem 0.875rem' }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: '1.5', flex: 1 }}>
                {card?.bio || 'No bio yet. Tap edit to add one.'}
              </p>
              <button onClick={() => setEditing(true)} className="btn-ghost" style={{ padding: '0.5rem', marginLeft: '0.75rem', flexShrink: 0 }}>
                <Edit2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '0.875rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem' }}>
            <Shield size={18} style={{ color: trustColor }} />
          </div>
          <div style={{ color: trustColor, fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace' }}>
            {trust.toFixed(0)}
          </div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Trust</div>
        </div>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '0.875rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem' }}>
            <Trophy size={18} style={{ color: '#facc15' }} />
          </div>
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace' }}>
            {card?.stats?.total_wins ?? 0}
          </div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Wins</div>
        </div>
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '0.875rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.3rem' }}>
            <Car size={18} style={{ color: '#60a5fa' }} />
          </div>
          <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace' }}>
            {card?.stats?.total_runs ?? 0}
          </div>
          <div style={{ color: '#555', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Events</div>
        </div>
      </div>

      {/* Win Rate Bar */}
      {(card?.stats?.win_rate !== undefined) && (
        <div style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '0.75rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}>Win Rate</span>
            <span style={{ color: '#facc15', fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {(card.stats.win_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 6, background: '#1c1c1c', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#dc2626', borderRadius: 9999, width: `${Math.min(100, card.stats.win_rate * 100)}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}
    </div>
  );
}
