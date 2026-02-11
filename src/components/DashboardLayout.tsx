'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { useInvestor } from '@/contexts/InvestorContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab = 'overview' }) => {
  const { investor } = useInvestor();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  const sidebarItems = [
    { id: 'overview', label: 'Portfolio Overview', icon: '📊', href: '/dashboard/investor' },
    { id: 'opportunities', label: 'Investment Opportunities', icon: '🎯', href: '/dashboard/investor/opportunities' },
    { id: 'projects', label: 'Project Monitoring', icon: '📈', href: '/dashboard/investor/projects' },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Top Navigation */}
      <header className="bg-neutral-darker border-b border-neutral-medium">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen((open) => !open)}
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-medium text-secondary hover:text-primary hover:border-accent-amber/40 transition-colors"
                aria-label="Toggle navigation"
              >
                ☰
              </button>
            </div>
            <div className="flex-1 flex justify-center">
              <Link href="/" className="text-xl sm:text-2xl font-bold inline-block hover:text-accent-amber transition-colors">
                <span className="accent-amber">FINVERNO</span>
              </Link>
            </div>
            <div className="relative flex items-center gap-3">
              <Link href="/" className="hidden sm:inline text-xs sm:text-sm text-secondary hover:text-primary transition-colors">
                ← Back to Home
              </Link>
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <div className="hidden sm:flex flex-col items-end text-xs sm:text-sm">
                  <span className="text-primary font-medium">
                    {(investor as any)?.investorName || (investor as any)?.name || 'Investor'}
                  </span>
                  <span className="text-[10px] sm:text-xs text-secondary">Premium Investor</span>
                </div>
                <div className="w-8 h-8 bg-accent-amber rounded-full flex items-center justify-center text-primary font-bold text-xs sm:text-sm">
                  {(investor as any)?.investorName ? 
                    (investor as any).investorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 
                    'IN'
                  }
                </div>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-lg border border-neutral-medium bg-neutral-darker shadow-xl z-20">
                  <div className="px-4 py-3 border-b border-neutral-medium">
                    <div className="text-sm font-semibold text-primary">
                      {(investor as any)?.investorName || (investor as any)?.name || 'Investor'}
                    </div>
                    <div className="text-xs text-secondary">Premium Investor</div>
                  </div>
                  <div className="py-2">
                    <Link
                      href="/dashboard/investor"
                      className="block px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-neutral-medium/40"
                      onClick={() => setProfileOpen(false)}
                    >
                      Portfolio Overview
                    </Link>
                    <Link
                      href="/dashboard/investor/projects"
                      className="block px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-neutral-medium/40"
                      onClick={() => setProfileOpen(false)}
                    >
                      Project Monitoring
                    </Link>
                    <Link
                      href="/dashboard/investor/opportunities"
                      className="block px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-neutral-medium/40"
                      onClick={() => setProfileOpen(false)}
                    >
                      Investment Opportunities
                    </Link>
                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-secondary hover:text-primary hover:bg-neutral-medium/40"
                      onClick={() => setProfileOpen(false)}
                    >
                      Back to Home
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 bg-neutral-darker border-r border-neutral-medium min-h-screen">
          <div className="p-6">
            <div className="space-y-2">
              {sidebarItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
                      : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-8 pt-8 border-t border-neutral-medium">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-4">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button variant="primary" size="sm" className="w-full text-xs">
                  Invest Now
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/60"
              onClick={() => setMobileNavOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-neutral-darker border-r border-neutral-medium shadow-xl">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm text-secondary">Navigation</span>
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    className="text-secondary hover:text-primary"
                    aria-label="Close navigation panel"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2">
                  {sidebarItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
                          : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-neutral-medium">
                  <h3 className="text-xs font-semibold text-secondary uppercase tracking-wide mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    <Button variant="primary" size="sm" className="w-full text-xs">
                      Invest Now
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
