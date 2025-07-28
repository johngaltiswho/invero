'use client';

import React, { useState } from 'react';
import { AuthLayout } from '@/components/AuthLayout';
import { Button, Input } from '@/components';

export default function AuthPage(): React.ReactElement {
  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<'contractor' | 'investor'>('contractor');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
    phone: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement auth logic
    console.log('Form submitted:', { isLogin, userType, formData });
  };

  return (
    <AuthLayout 
      title={isLogin ? 'Welcome Back' : 'Create Account'}
      subtitle={isLogin ? 'Access your Invero dashboard' : 'Join the institutional revolution'}
    >
      {/* User Type Selector */}
      {!isLogin && (
        <div className="mb-6">
          <div className="text-sm font-medium text-primary mb-3">I AM A:</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUserType('contractor')}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                userType === 'contractor'
                  ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                  : 'border-neutral-medium text-secondary hover:border-accent-orange/50'
              }`}
            >
              CONTRACTOR
            </button>
            <button
              type="button"
              onClick={() => setUserType('investor')}
              className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                userType === 'investor'
                  ? 'border-accent-orange bg-accent-orange/10 text-accent-orange'
                  : 'border-neutral-medium text-secondary hover:border-accent-orange/50'
              }`}
            >
              INVESTOR
            </button>
          </div>
        </div>
      )}

      {/* Auth Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                placeholder="John"
              />
              <Input
                label="Last Name"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                placeholder="Doe"
              />
            </div>
            
            <Input
              label={userType === 'contractor' ? 'Company Name' : 'Organization'}
              name="company"
              type="text"
              value={formData.company}
              onChange={handleInputChange}
              required
              placeholder={userType === 'contractor' ? 'Construction Co.' : 'Investment Firm'}
            />

            <Input
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              required
              placeholder="+91 98765 43210"
            />
          </>
        )}

        <Input
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          required
          placeholder="you@company.com"
        />

        <Input
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          required
          placeholder="••••••••"
        />

        {!isLogin && (
          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            placeholder="••••••••"
          />
        )}

        {isLogin && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 accent-accent-orange rounded border-neutral-medium"
              />
              <span className="ml-2 text-secondary">Remember me</span>
            </label>
            <a href="/auth/forgot-password" className="text-accent-orange hover:text-accent-orange/80">
              Forgot password?
            </a>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
        >
          {isLogin ? 'Sign In' : 'Create Account'}
        </Button>

        {!isLogin && (
          <p className="text-xs text-secondary text-center">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="text-accent-orange hover:text-accent-orange/80">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-accent-orange hover:text-accent-orange/80">
              Privacy Policy
            </a>
          </p>
        )}
      </form>

      {/* Toggle between login/signup */}
      <div className="mt-8 text-center">
        <p className="text-secondary">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-accent-orange hover:text-accent-orange/80 font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>

      {/* Social divider */}
      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-medium"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-primary text-secondary">Or continue with</span>
          </div>
        </div>

        {/* Auth0 integration placeholder */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="w-full inline-flex justify-center py-3 px-4 rounded-lg border border-neutral-medium bg-neutral-dark hover:bg-neutral-medium transition-colors"
          >
            <span className="text-sm font-medium text-secondary">Google</span>
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center py-3 px-4 rounded-lg border border-neutral-medium bg-neutral-dark hover:bg-neutral-medium transition-colors"
          >
            <span className="text-sm font-medium text-secondary">LinkedIn</span>
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}