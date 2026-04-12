'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) {
      if (user) router.replace('/feed');
      else router.replace('/login');
    }
  }, [user, loading, router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#0a0a0a' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, background: '#dc2626', borderRadius: 8 }} />
        <span style={{ color: '#555', fontSize: '0.8rem' }}>Loading...</span>
      </div>
    </div>
  );
}
