'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '../lib/auth/session';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { BrandLogo } from './brand-logo';

const ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/scan', label: 'Scan' },
  { href: '/history', label: 'Riwayat' },
  { href: '/profile', label: 'Profil' }
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Card className="glass top-nav">
      <BrandLogo variant="header" />
      <div className="top-nav__links">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`small top-nav__link ${pathname === item.href ? 'active' : ''}`.trim()}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="nav-logout"
        onClick={() => {
          clearToken();
          router.push('/login');
        }}
      >
        Keluar
      </Button>
    </Card>
  );
}
