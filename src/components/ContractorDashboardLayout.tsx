'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './Button';
import { UserButton, useUser } from '@clerk/nextjs';
import { useContractor } from '@/contexts/ContractorContext';

interface ContractorDashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function ContractorDashboardLayout({ children, activeTab }: ContractorDashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const { contractor } = useContractor();

  const navigationItems = [
    {
      id: 'overview',
      name: 'Dashboard',
      href: '/dashboard/contractor',
      icon: '📊',
      description: 'Overview & metrics'
    },
    {
      id: 'projects',
      name: 'My Projects',
      href: '/dashboard/contractor/projects',
      icon: '📋',
      description: 'Project management'
    },
    {
      id: 'progress',
      name: 'Progress Reports',
      href: '/dashboard/contractor/progress',
      icon: '📈',
      description: 'Submit updates'
    },
    {
      id: 'funding',
      name: 'Funding Requests',
      href: '/dashboard/contractor/funding',
      icon: '💰',
      description: 'Working capital'
    },
    {
      id: 'documents',
      name: 'Documents',
      href: '/dashboard/contractor/documents',
      icon: '📄',
      description: 'Upload & manage'
    },
    {
      id: 'payments',
      name: 'Payments',
      href: '/dashboard/contractor/payments',
      icon: '💳',
      description: 'Track payments'
    }
  ];

  const isActive = (itemId: string) => {
    if (activeTab) return activeTab === itemId;
    return pathname === navigationItems.find(item => item.id === itemId)?.href;
  };

  return (
    <div className="min-h-screen bg-neutral-darkest">
      {/* Header */}
      <header className="bg-neutral-dark border-b border-neutral-medium sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo & Company */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-neutral-medium"
              >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <div className="w-full h-0.5 bg-primary"></div>
                  <div className="w-full h-0.5 bg-primary"></div>
                  <div className="w-full h-0.5 bg-primary"></div>
                </div>
              </button>
              <Link href="/" className="flex items-center space-x-3 hover:text-accent-orange transition-colors">
                <div className="text-2xl">🏗️</div>
                <div>
                  <div className="text-lg font-bold text-primary">Invero</div>
                  <div className="text-xs text-secondary">Contractor Portal</div>
                </div>
              </Link>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-sm text-secondary hover:text-primary transition-colors">
                ← Back to Home
              </Link>
              <Button variant="primary" size="sm">
                Submit Report
              </Button>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">
                    {contractor?.contactPerson || user?.firstName + ' ' + user?.lastName || 'User'}
                  </div>
                  <div className="text-xs text-secondary">
                    {contractor?.id && `ID: ${contractor.id}`}
                    {contractor?.companyName && ` • ${contractor.companyName}`}
                  </div>
                </div>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonPopoverCard: "bg-neutral-dark border border-neutral-medium",
                      userButtonPopoverActionButton: "text-primary hover:bg-neutral-medium",
                    }
                  }}
                  afterSignOutUrl="/"
                  showName={false}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className={`${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-64 bg-neutral-dark border-r border-neutral-medium transform transition-transform duration-200 ease-in-out`}>
          <div className="p-6">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.id)
                      ? 'bg-accent-amber text-primary'
                      : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="p-6 border-t border-neutral-medium">
            <h3 className="text-sm font-medium text-primary mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-neutral-medium rounded">
                📊 Submit Progress Report
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-neutral-medium rounded">
                💰 Request Funding
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-neutral-medium rounded">
                📄 Upload Document
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="p-6 border-t border-neutral-medium">
            <div className="text-xs text-secondary mb-2">Need Help?</div>
            <Button variant="outline" size="sm" className="w-full">
              Contact Support
            </Button>
          </div>
        </nav>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}