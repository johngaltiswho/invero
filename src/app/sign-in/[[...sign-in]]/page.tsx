'use client';

import { SignIn, useSignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';

export const dynamic = 'force-dynamic';

function SignInComponent() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectUrl =
    searchParams.get('redirect_url') ||
    searchParams.get('redirectUrl') ||
    '/';

  const isVerifying = signIn?.status === 'needs_first_factor';
  const generalErrors = useMemo(() => (errorMessage ? [errorMessage] : []), [errorMessage]);

  async function finalizeSignIn() {
    if (!signIn || signIn.status !== 'complete' || !setActive || !signIn.createdSessionId) return;
    await setActive({
      session: signIn.createdSessionId,
      redirectUrl,
    });
  }

  async function handleRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const normalizedEmail = emailAddress.trim().toLowerCase();
      const createdSignIn = await signIn.create({ identifier: normalizedEmail });
      const emailCodeFactor = createdSignIn.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code'
      );

      if (!emailCodeFactor || !('emailAddressId' in emailCodeFactor)) {
        throw new Error('Email OTP is not available for this account.');
      }

      await createdSignIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailCodeFactor.emailAddressId,
      });
      setSubmittedEmail(normalizedEmail);

      if (createdSignIn.status === 'complete') {
        await finalizeSignIn();
      }
    } catch (error: any) {
      const message =
        error?.errors?.[0]?.longMessage ||
        error?.errors?.[0]?.message ||
        (error instanceof Error ? error.message : 'Failed to start sign-in');
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isLoaded || !signIn) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const attemptedSignIn = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: code.trim(),
      });

      if (attemptedSignIn.status === 'complete') {
        await finalizeSignIn();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Invalid or expired code');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (!signIn || !submittedEmail) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const emailCodeFactor = signIn.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'email_code'
      );

      if (!emailCodeFactor || !('emailAddressId' in emailCodeFactor)) {
        throw new Error('Email OTP is not available for this account.');
      }

      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        emailAddressId: emailCodeFactor.emailAddressId,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to resend code');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleStartOver() {
    setCode('');
    setSubmittedEmail('');
    setErrorMessage(null);
    window.location.reload();
  }

  if (!isLoaded || !signIn) {
    return <div className="text-sm text-secondary">Loading sign-in...</div>;
  }

  if (mode === 'password') {
    return (
      <div className="w-full max-w-md rounded-lg border border-neutral-medium bg-neutral-dark p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-primary">Sign in</h1>
          <p className="mt-2 text-sm text-secondary">
            Password sign-in is available if you prefer not to use a one-time code.
          </p>
        </div>

        <SignIn
          fallbackRedirectUrl={redirectUrl}
          routing="hash"
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'bg-transparent shadow-none border-none p-0',
              header: 'hidden',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              formFieldInput:
                'bg-neutral-medium border border-neutral-medium text-primary placeholder-secondary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all',
              formFieldLabel: 'text-secondary text-sm font-medium mb-1 block',
              formFieldAction: 'text-accent-orange hover:text-accent-orange/80 text-sm',
              formButtonPrimary:
                'w-full bg-accent-orange hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-orange focus:ring-offset-2 focus:ring-offset-neutral-dark',
              socialButtonsBlockButton:
                'w-full bg-neutral-medium border border-neutral-medium text-secondary hover:bg-neutral-light hover:text-primary transition-colors rounded-lg py-3 px-4 font-medium',
              socialButtonsBlockButtonText: 'text-sm',
              formFieldSuccessText: 'text-green-500 text-sm',
              formFieldErrorText: 'text-red-500 text-sm',
              identityPreviewText: 'text-primary',
              identityPreviewEditButton: 'text-accent-orange hover:text-accent-orange/80',
              footerActionText: 'text-secondary text-sm',
              footerActionLink: 'text-accent-orange hover:text-accent-orange/80 font-medium',
              dividerLine: 'bg-neutral-medium',
              dividerText: 'text-secondary bg-neutral-dark px-2 text-sm',
              footer: 'hidden',
            },
          }}
        />

        <button
          type="button"
          onClick={() => setMode('otp')}
          className="mt-6 w-full text-sm font-medium text-accent-orange transition hover:text-accent-orange/80"
        >
          Use one-time code instead
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-lg border border-neutral-medium bg-neutral-dark p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-primary">
          {isVerifying ? 'Enter your code' : 'Sign in with email OTP'}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          {isVerifying
            ? `We sent a one-time code to ${submittedEmail || 'your email address'}.`
            : 'Use a one-time code instead of a password.'}
        </p>
      </div>

      {generalErrors.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {generalErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      )}

      {isVerifying ? (
        <form className="space-y-4" onSubmit={handleVerifyCode}>
          <div>
            <label htmlFor="code" className="mb-1 block text-sm font-medium text-secondary">
              Verification code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-lg border border-neutral-medium bg-neutral-medium px-3 py-2 text-primary outline-none transition focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/20"
              placeholder="Enter the code"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-accent-orange px-4 py-2.5 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying...' : 'Verify and continue'}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-neutral-medium px-4 py-2.5 font-medium text-secondary transition hover:bg-neutral-medium/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Resend code
          </button>

          <button
            type="button"
            onClick={handleStartOver}
            disabled={isSubmitting}
            className="w-full text-sm text-secondary transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use a different email
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleRequestCode}>
          <div>
            <label htmlFor="emailAddress" className="mb-1 block text-sm font-medium text-secondary">
              Email address
            </label>
            <input
              id="emailAddress"
              name="emailAddress"
              type="email"
              autoComplete="email"
              value={emailAddress}
              onChange={(event) => setEmailAddress(event.target.value)}
              className="w-full rounded-lg border border-neutral-medium bg-neutral-medium px-3 py-2 text-primary outline-none transition focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/20"
              placeholder="you@company.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-accent-orange px-4 py-2.5 font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending code...' : 'Send login code'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-secondary">
        Need an account?{' '}
        <Link href="/sign-up" className="font-medium text-accent-orange hover:text-accent-orange/80">
          Sign up
        </Link>
      </p>

      {!isVerifying && (
        <button
          type="button"
          onClick={() => setMode('password')}
          className="mt-3 w-full text-sm font-medium text-secondary transition hover:text-primary"
        >
          Use password instead
        </button>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-neutral-darker flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Suspense fallback={<div>Loading...</div>}>
        <SignInComponent />
      </Suspense>
    </div>
  );
}
