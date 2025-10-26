'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './Button';
import { UserButton, useUser } from '@clerk/nextjs';
import { useContractorV2 } from '@/contexts/ContractorContextV2';

interface ContractorDashboardLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export function ContractorDashboardLayout({ children, activeTab }: ContractorDashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open on desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const { user } = useUser();
  const { contractor } = useContractorV2();

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
      id: 'materials',
      name: 'Material Master',
      href: '/dashboard/contractor/materials',
      icon: '🏗️',
      description: 'Materials & requests'
    },
    {
      id: 'network',
      name: 'Network',
      href: '/dashboard/contractor/network',
      icon: '🌐',
      description: 'Vendors & suppliers'
    }
    // Hidden: Progress Reports, Funding Requests, Documents, Payments
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
              {/* Mobile menu button */}
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
              
              {/* Desktop collapse button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden lg:block p-2 rounded-lg hover:bg-neutral-medium text-secondary hover:text-primary"
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <div className="w-5 h-5">
                  {isSidebarCollapsed ? '→' : '←'}
                </div>
              </button>
              <Link href="/" className="flex items-center space-x-3 hover:text-accent-orange transition-colors">
                <div className="text-2xl">🏗️</div>
                <div>
                  <div className="text-lg font-bold text-primary">Finverno</div>
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
                    {contractor?.contact_person || user?.firstName + ' ' + user?.lastName || 'User'}
                  </div>
                  <div className="text-xs text-secondary">
                    {contractor?.company_name}
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
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } bg-neutral-dark border-r border-neutral-medium transform transition-all duration-200 ease-in-out`}>
          <div className={`${isSidebarCollapsed ? 'p-2' : 'p-6'}`}>
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center ${
                    isSidebarCollapsed ? 'justify-center px-2 py-3' : 'space-x-3 px-4 py-3'
                  } rounded-lg transition-colors ${
                    isActive(item.id)
                      ? 'bg-accent-amber text-primary'
                      : 'text-secondary hover:text-primary hover:bg-neutral-medium'
                  }`}
                  title={isSidebarCollapsed ? item.name : undefined}
                >
                  <span className="text-lg">{item.icon}</span>
                  {!isSidebarCollapsed && (
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs opacity-70">{item.description}</div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Support - only show when not collapsed */}
          {!isSidebarCollapsed && (
            <div className="p-6 border-t border-neutral-medium">
              <div className="text-xs text-secondary mb-2">Need Help?</div>
              <Button variant="outline" size="sm" className="w-full">
                Contact Support
              </Button>
            </div>
          )}
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