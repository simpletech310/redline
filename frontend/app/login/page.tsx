'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      router.replace('/feed');
    } catch {
      setError('Invalid email or password');
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
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem', marginBottom: '0.5rem'
        }}>
          <div style={{ background: '#dc2626', borderRadius: 8, padding: '0.5rem' }}>
            <Zap size={24} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', fontStyle: 'italic' }}>
            REDLINE
          </span>
        </div>
        <p style={{ color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Truth from Results
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: '#111',
        border: '1px solid #1c1c1c',
        borderRadius: '1rem',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h1 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Sign In
        </h1>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Username or Email
            </label>
            <input
              type="text"
              className="input-carbon"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="Username or Email"
              required
            />
          </div>

          <div>
            <label style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="input-carbon"
                style={{ paddingRight: '2.5rem' }}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: '0.75rem', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#555',
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-redline"
            disabled={loading}
            style={{ marginTop: '0.5rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '1.5rem' }}>
        New to Redline?{' '}
        <Link href="/register" style={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>
          Create Account
        </Link>
      </p>
    </div>
  );
}
