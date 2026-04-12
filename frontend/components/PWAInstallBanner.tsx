'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    const alreadyDismissed = localStorage.getItem('rl_pwa_dismissed');
    if (alreadyDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setShow(false);
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('rl_pwa_dismissed', '1');
  };

  if (!show || dismissed) return null;

  return (
    <div
      className="animate-slide-up"
      style={{
        position: 'fixed',
        bottom: 80,
        left: '1rem',
        right: '1rem',
        maxWidth: 448,
        margin: '0 auto',
        zIndex: 60,
        background: '#111',
        border: '1px solid #2a2a2a',
        borderRadius: '1rem',
        padding: '1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '0.625rem',
        background: '#dc2626',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Download size={20} color="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.1rem' }}>
          Add Redline to Home Screen
        </div>
        <div style={{ color: '#555', fontSize: '0.72rem' }}>
          Install for a native app experience
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#555' }}
        >
          <X size={16} />
        </button>
        <button onClick={handleInstall} className="btn-redline" style={{ fontSize: '0.75rem', padding: '0.45rem 0.875rem' }}>
          Install
        </button>
      </div>
    </div>
  );
}
