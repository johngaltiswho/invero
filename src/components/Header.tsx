'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { useUser, SignOutButton } from '@clerk/nextjs';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isLoaded } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get display name from user data
  const getDisplayName = () => {
    if (user?.firstName) return user.firstName;
    if (user?.username) return user.username;
    return user?.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User';
  };

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'For Contractors', href: '/contractors' },
    { label: 'For Investors', href: '/investors' },
    { label: 'About Us', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-primary/95 backdrop-blur-sm border-b border-neutral-dark/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-primary inline-block">
            <span className="accent-amber">INVERO</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-secondary hover:text-accent-amber transition-colors duration-200 text-sm font-medium uppercase tracking-wide"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isMounted || !isLoaded ? (
              // Loading state to prevent hydration mismatch
              <div className="w-24 h-8 bg-neutral-medium animate-pulse rounded"></div>
            ) : user ? (
              // Logged in state
              <>
                <div className="text-right">
                  <div className="text-secondary text-sm">
                    Welcome, {getDisplayName()}
                  </div>
                </div>
                <SignOutButton>
                  <Button variant="outline" size="sm">
                    Logout
                  </Button>
                </SignOutButton>
              </>
            ) : (
              // Not logged in state
              <>
                <Link
                  href="/sign-in"
                  className="text-secondary hover:text-accent-amber transition-colors duration-200 text-sm font-medium uppercase tracking-wide"
                >
                  Login
                </Link>
                <Link href="/sign-up" className="inline-block">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-secondary hover:text-primary focus:outline-none"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-neutral-dark">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-secondary hover:text-primary transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col space-y-2 pt-4 border-t border-neutral-dark">
                {!isMounted || !isLoaded ? (
                  // Mobile loading state
                  <div className="w-24 h-8 bg-neutral-medium animate-pulse rounded"></div>
                ) : user ? (
                  // Mobile logged in state
                  <>
                    <div className="text-left">
                      <div className="text-secondary text-sm">
                        Welcome, {getDisplayName()}
                      </div>
                    </div>
                    <SignOutButton>
                      <Button variant="outline" size="sm" className="w-fit">
                        Logout
                      </Button>
                    </SignOutButton>
                  </>
                ) : (
                  // Mobile not logged in state
                  <>
                    <Link
                      href="/sign-in"
                      className="text-secondary hover:text-primary transition-colors duration-200"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Login
                    </Link>
                    <Link href="/sign-up" className="inline-block">
                      <Button variant="primary" size="sm" className="w-fit">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};