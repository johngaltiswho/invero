import React from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-primary flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-neutral-dark via-neutral-medium to-neutral-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-accent-orange/20 to-transparent"></div>
        <div className="relative z-10 flex flex-col justify-center px-12">
          <Link href="/" className="text-3xl font-bold text-primary mb-8 inline-block">
            <span className="accent-orange">INVERO</span>
          </Link>
          <h2 className="text-4xl font-bold text-primary mb-6 leading-tight">
            Institutional Capital for the Digital Age
          </h2>
          <p className="text-lg text-secondary leading-relaxed mb-8">
            Powering India's project economy through intelligent capital allocation, 
            proprietary risk assessment, and transparent deal structures.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-accent-orange rounded-full"></div>
              <span className="text-secondary">Enterprise-grade security</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-accent-orange rounded-full"></div>
              <span className="text-secondary">Real-time project monitoring</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-accent-orange rounded-full"></div>
              <span className="text-secondary">Institutional-grade due diligence</span>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-32 h-32 border border-accent-orange/30 rounded-lg rotate-12"></div>
        <div className="absolute bottom-20 right-32 w-24 h-24 border border-accent-orange/20 rounded-lg -rotate-12"></div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 py-12">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="text-3xl font-bold text-primary inline-block">
              <span className="accent-orange">INVERO</span>
            </Link>
          </div>

          {/* Form header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>
            {subtitle && (
              <p className="text-secondary">{subtitle}</p>
            )}
          </div>

          {/* Form content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};