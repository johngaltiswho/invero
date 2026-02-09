'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/verification', label: 'Verification' },
  { href: '/admin/capital', label: 'Capital' },
  { href: '/admin/investors', label: 'Investors' },
  { href: '/admin/finance', label: 'Finance' }
];

export default function AdminNavbar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <header className="bg-neutral-dark border-b border-neutral-medium sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-primary hover:text-accent-amber transition-colors">
              Finverno
            </Link>
            <span className="text-xs text-secondary uppercase tracking-wide">Admin</span>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-amber text-neutral-dark'
                      : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
