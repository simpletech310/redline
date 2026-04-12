'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Zap } from 'lucide-react';

const ACCOUNT_TYPES = [
  { value: 'jockey', label: '🏁 Jockey', desc: 'Racer & Competitor' },
  { value: 'team_owner', label: '🏆 Team Owner', desc: 'Organization Manager' },
  { value: 'spectator', label: '👁 Spectator', desc: 'Watch & Pick' },
] as const;

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    account_type: 'jockey' as 'spectator' | 'jockey' | 'team_owner',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      router.replace('/feed');
    } catch {
      setError('Registration failed. Username or email may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '0.5rem' }}>
            <Zap size={24} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', fontStyle: 'italic' }}>
            REDLINE
          </span>
        </div>
      </div>

      <div style={{
        background: '#111',
        border: '1px solid #1c1c1c',
        borderRadius: '1rem',
        padding: '2rem',
        width: '100%',
        maxWidth: '420px',
      }}>
        <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Create Account
        </h1>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '0.5rem', padding: '0.75rem 1rem', color: '#f87171',
            fontSize: '0.85rem', marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Account Type Selection */}
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Role
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
              {ACCOUNT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, account_type: type.value }))}
                  style={{
                    background: form.account_type === type.value ? 'rgba(220,38,38,0.15)' : '#1c1c1c',
                    border: `1px solid ${form.account_type === type.value ? '#dc2626' : '#2a2a2a'}`,
                    borderRadius: '0.5rem',
                    padding: '0.625rem 0.25rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.15rem' }}>{type.label.split(' ')[0]}</div>
                  <div style={{ color: form.account_type === type.value ? '#f87171' : '#9ca3af', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {type.label.split(' ').slice(1).join(' ')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Username
            </label>
            <input
              type="text"
              className="input-carbon"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              placeholder="@handle"
              required
              minLength={3}
            />
          </div>

          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Email
            </label>
            <input
              type="email"
              className="input-carbon"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="yourname@redline.io"
              required
            />
          </div>

          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Password
            </label>
            <input
              type="password"
              className="input-carbon"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn-redline"
            disabled={loading}
            style={{ marginTop: '0.5rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>

      <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '1.5rem' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>
          Sign In
        </Link>
      </p>
    </div>
  );
}
