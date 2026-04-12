'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTeam } from '@/lib/api';
import { ArrowLeft, Users } from 'lucide-react';

const MOTORSPORTS = ['Mini Bikes', 'Cars', 'Motorcycles', 'Drift', 'Go-Karts'];

export default function CreateTeamPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    bio: '',
    region: '',
    motorsport: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Team name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await createTeam({
        name: form.name.trim(),
        bio: form.bio || undefined,
        region: form.region || undefined,
        motorsport: form.motorsport || undefined,
      });
      router.push(`/teams/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
            Create Team
          </h1>
          <p style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Start your crew
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Team Name */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Team Name *
          </label>
          <input
            className="input-carbon"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Enter team name..."
            required
          />
        </div>

        {/* Bio */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Bio (optional)
          </label>
          <textarea
            className="input-carbon"
            value={form.bio}
            onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            placeholder="Describe your team..."
            rows={3}
            style={{ resize: 'none' }}
          />
        </div>

        {/* Region */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Region (optional)
          </label>
          <input
            className="input-carbon"
            value={form.region}
            onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
            placeholder="e.g. California, Texas, UK..."
          />
        </div>

        {/* Primary Motorsport */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Primary Motorsport (optional)
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {MOTORSPORTS.map(s => (
              <button key={s} type="button"
                onClick={() => setForm(p => ({ ...p, motorsport: p.motorsport === s ? '' : s }))}
                style={{
                  padding: '0.4rem 0.75rem', borderRadius: '9999px',
                  background: form.motorsport === s ? '#dc2626' : '#1c1c1c',
                  color: form.motorsport === s ? '#fff' : '#9ca3af',
                  border: `1px solid ${form.motorsport === s ? '#dc2626' : '#2a2a2a'}`,
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}>{s}</button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-redline" style={{ marginTop: '0.5rem' }}>
          <Users size={16} style={{ marginRight: '0.5rem' }} />
          {loading ? 'Creating...' : 'Create Team'}
        </button>
      </form>
    </div>
  );
}
