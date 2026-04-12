'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { searchRedliners, createChallenge } from '@/lib/api';
import { ArrowLeft, Swords, Search, User } from 'lucide-react';

const MOTORSPORTS = ['Mini Bikes', 'Cars', 'Motorcycles', 'Drift', 'Go-Karts'];

interface Redliner {
  id: string;
  username: string;
  account_type: string;
}

export default function NewChallengePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Redliner[]>([]);
  const [selectedUser, setSelectedUser] = useState<Redliner | null>(null);
  const [form, setForm] = useState({
    motorsport: 'Mini Bikes',
    vehicle_class: '',
    location: '',
    proposed_time: '',
    stakes: 0,
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchRedliners(searchQuery)
        .then(r => {
          const racers = r.data.racers || [];
          setSearchResults(racers.filter((r: Redliner) =>
            r.id !== user?.id && r.account_type !== 'spectator'
          ));
        })
        .catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setError('Please select an opponent');
      return;
    }
    if (!form.location || !form.proposed_time) {
      setError('Location and time are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createChallenge({
        challenged_id: selectedUser.id,
        motorsport: form.motorsport,
        vehicle_class: form.vehicle_class || undefined,
        location: form.location,
        proposed_time: new Date(form.proposed_time).toISOString(),
        stakes: form.stakes,
        message: form.message || undefined,
      });
      router.push('/challenges');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to issue challenge';
      setError(errorMessage);
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
            Issue Challenge
          </h1>
          <p style={{ color: '#555', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Call out a racer
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '0.5rem', padding: '0.75rem', color: '#f87171', fontSize: '0.8rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Opponent Search */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Challenge Who? *
          </label>
          {selectedUser ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
              borderRadius: '0.5rem', padding: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `hsl(${selectedUser.username.charCodeAt(0) * 37 % 360}, 60%, 30%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', fontWeight: 700, color: '#fff',
                }}>
                  {selectedUser.username[0].toUpperCase()}
                </div>
                <span style={{ color: '#fff', fontWeight: 700 }}>@{selectedUser.username}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{ color: '#9ca3af', fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                <input
                  className="input-carbon"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  style={{ paddingLeft: '2.25rem' }}
                />
              </div>
              {searchResults.length > 0 && (
                <div style={{
                  background: '#1c1c1c', border: '1px solid #2a2a2a', borderRadius: '0.5rem',
                  marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto',
                }}>
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => { setSelectedUser(r); setSearchQuery(''); setSearchResults([]); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                        padding: '0.75rem', background: 'none', border: 'none', cursor: 'pointer',
                        borderBottom: '1px solid #2a2a2a',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `hsl(${r.username.charCodeAt(0) * 37 % 360}, 60%, 30%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                      }}>
                        {r.username[0].toUpperCase()}
                      </div>
                      <span style={{ color: '#fff', fontSize: '0.85rem' }}>@{r.username}</span>
                      <span style={{ color: '#555', fontSize: '0.7rem' }}>({r.account_type})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Motorsport */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
            Motorsport
          </label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {MOTORSPORTS.map(s => (
              <button key={s} type="button"
                onClick={() => setForm(p => ({ ...p, motorsport: s }))}
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

        {/* Location */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Location *
          </label>
          <input
            className="input-carbon"
            value={form.location}
            onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
            placeholder="Where do you want to race?"
            required
          />
        </div>

        {/* Time */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Proposed Time *
          </label>
          <input
            type="datetime-local"
            className="input-carbon"
            value={form.proposed_time}
            onChange={e => setForm(p => ({ ...p, proposed_time: e.target.value }))}
            required
          />
        </div>

        {/* Stakes */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Stakes (optional)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[0, 10, 25, 50, 100].map(amount => (
              <button
                key={amount}
                type="button"
                onClick={() => setForm(p => ({ ...p, stakes: amount }))}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: '0.375rem',
                  background: form.stakes === amount ? 'rgba(34,197,94,0.15)' : '#1c1c1c',
                  color: form.stakes === amount ? '#22c55e' : '#9ca3af',
                  border: `1px solid ${form.stakes === amount ? '#22c55e' : '#2a2a2a'}`,
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label style={{ color: '#9ca3af', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Message (optional)
          </label>
          <textarea
            className="input-carbon"
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            placeholder="Got something to say?"
            rows={2}
            style={{ resize: 'none' }}
          />
        </div>

        <button type="submit" disabled={loading} className="btn-redline" style={{ marginTop: '0.5rem' }}>
          <Swords size={16} style={{ marginRight: '0.5rem' }} />
          {loading ? 'Issuing...' : 'Issue Challenge'}
        </button>
      </form>
    </div>
  );
}
