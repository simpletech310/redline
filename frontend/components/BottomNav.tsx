'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Zap,
  Flag,
  Car,
  TrendingUp,
  Wallet,
  Trophy,
  Swords,
  Radio,
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  roles?: Array<'spectator' | 'jockey' | 'team_owner'>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/feed',       icon: Zap,        label: 'Feed' },
  { href: '/watch',      icon: Radio,      label: 'Live' },
  { href: '/runs',       icon: Flag,       label: 'Runs',       roles: ['jockey', 'team_owner'] },
  { href: '/challenges', icon: Swords,     label: 'Callouts',   roles: ['jockey', 'team_owner'] },
  { href: '/picks',      icon: TrendingUp, label: 'Picks' },
  { href: '/garage',     icon: Car,        label: 'Garage',     roles: ['jockey', 'team_owner'] },
  { href: '/wallet',     icon: Wallet,     label: 'Wallet' },
];

export function BottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Don't show on auth pages
  if (!user || pathname === '/login' || pathname === '/register') return null;

  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || item.roles.includes(user.account_type)
  );

  // Add tournaments for team owners
  const allItems = user.account_type === 'team_owner'
    ? [...visibleItems, { href: '/tournaments', icon: Trophy, label: 'Events' }]
    : visibleItems;

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around">
        {allItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="nav-item"
            >
              <div className={`nav-item-icon ${active ? 'nav-item-active' : ''}`}
                style={{
                  background: active ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.8}
                  style={{
                    color: active ? 'var(--crimson-500)' : 'var(--text-muted)',
                    filter: active ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              </div>
              <span
                className="nav-item-label"
                style={{
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
