import React from 'react';
import Link from 'next/link';
import { Button } from './Button';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeTab = 'overview' }) => {
  const sidebarItems = [
    { id: 'overview', label: 'Portfolio Overview', icon: '📊', href: '/dashboard/investor' },
    { id: 'opportunities', label: 'Investment Opportunities', icon: '🎯', href: '/dashboard/investor/opportunities' },
    { id: 'projects', label: 'Project Monitoring', icon: '📈', href: '/dashboard/investor/projects' },
    { id: 'analytics', label: 'Performance Analytics', icon: '📉', href: '/dashboard/investor/analytics' },
    { id: 'documents', label: 'Due Diligence', icon: '📋', href: '/dashboard/investor/documents' },
    { id: 'transactions', label: 'Financial Management', icon: '💰', href: '/dashboard/investor/transactions' },
    { id: 'insights', label: 'Market Intelligence', icon: '🌐', href: '/dashboard/investor/insights' },
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* Top Navigation */}
      <header className="bg-neutral-darker border-b border-neutral-medium">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold inline-block">
                <span className="accent-amber">INVERO</span>
              </Link>
              <div className="text-secondary text-sm">
                <span className="text-accent-blue">●</span> Investor Portal
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-secondary">
                <span className="text-primary font-medium">Rajesh Sharma</span>
                <br />
                <span className="text-xs">Premium Investor</span>
              </div>
              <div className="w-8 h-8 bg-accent-amber rounded-full flex items-center justify-center text-primary font-bold text-sm">
                RS
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-neutral-darker border-r border-neutral-medium min-h-screen">
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

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};