'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createTournament } from '@/lib/api';
import { ArrowLeft, Trophy } from 'lucide-react';

const MOTORSPORTS = ['Mini Bikes', 'Cars', 'Motorcycles', 'Drift', 'Go-Karts'];
const SIZES = [4, 8, 16, 32];

export default function CreateTournamentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    motorsport: 'Mini Bikes',
    location: '',
    date_time: '',
    max_participants: 8,
    entry_fee_cents: 0,
    prize_pool_cents: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user?.account_type !== 'team_owner') {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem', color: '#555' }}>
        <Trophy size={36} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
        <p>Only Team Owners can create tournaments</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        date_time: new Date(form.date_time).toISOString(),
        entry_fee_cents: Math.round(form.entry_fee_cents * 100),
        prize_pool_cents: Math.round(form.prize_pool_cents * 100),
      };
      const res = await createTournament(payload);
      router.push(`/tournaments/${res.data.id}`);
    } catch {
      setError('Failed to create tournament. Check all fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>Create Tournament</h1>
          <p style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Official Event</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Name */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Tournament Name *</label>
          <input className="input-carbon" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Championship Series 2026..." required />
        </div>

        {/* Motorsport */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Motorsport *</label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {MOTORSPORTS.map(s => (
              <button key={s} type="button" onClick={() => setForm(p => ({ ...p, motorsport: s }))}
                style={{ padding: '0.4rem 0.75rem', borderRadius: '9999px', background: form.motorsport === s ? '#dc2626' : '#1c1c1c', color: form.motorsport === s ? '#fff' : '#9ca3af', border: `1px solid ${form.motorsport === s ? '#dc2626' : '#2a2a2a'}`, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Location & Date */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Location *</label>
          <input className="input-carbon" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Track name or venue" required />
        </div>
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Date & Time *</label>
          <input className="input-carbon" type="datetime-local" value={form.date_time} onChange={e => setForm(p => ({ ...p, date_time: e.target.value }))} required />
        </div>

        {/* Bracket Size */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Bracket Size</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {SIZES.map(n => (
              <button key={n} type="button" onClick={() => setForm(p => ({ ...p, max_participants: n }))}
                style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', background: form.max_participants === n ? 'rgba(220,38,38,0.15)' : '#1c1c1c', border: `1px solid ${form.max_participants === n ? '#dc2626' : '#2a2a2a'}`, color: form.max_participants === n ? '#f87171' : '#9ca3af', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.2s' }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Entry Fee & Prize Pool */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Entry Fee ($)</label>
            <input className="input-carbon" type="number" min={0} step={0.01} value={form.entry_fee_cents} onChange={e => setForm(p => ({ ...p, entry_fee_cents: parseFloat(e.target.value) || 0 }))} />
          </div>
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>Prize Pool ($)</label>
            <input className="input-carbon" type="number" min={0} step={0.01} value={form.prize_pool_cents} onChange={e => setForm(p => ({ ...p, prize_pool_cents: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-redline" style={{ marginTop: '0.25rem', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Creating...' : '🏆 Create Tournament'}
        </button>
      </form>
    </div>
  );
}
