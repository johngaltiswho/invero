'use client';

import React from 'react';
import Link from 'next/link';
import type { RegistrationStep } from '@/types/contractor-access';

interface Props {
  registrationStep: RegistrationStep;
  message?: string;
  canRetry?: boolean;
}

const STEPS: { key: RegistrationStep; label: string }[] = [
  { key: 'not_applied', label: 'Apply' },
  { key: 'docs_pending', label: 'Upload Docs' },
  { key: 'docs_uploaded', label: 'Docs Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'complete', label: 'Verified' },
];

const STEP_ORDER: RegistrationStep[] = [
  'not_applied',
  'applied',
  'docs_pending',
  'docs_uploaded',
  'under_review',
  'complete',
];

function currentIndex(step: RegistrationStep) {
  const idx = STEP_ORDER.indexOf(step);
  return idx === -1 ? 0 : idx;
}

export default function RegistrationBanner({ registrationStep, message, canRetry }: Props) {
  const idx = currentIndex(registrationStep);
  const isRejected = registrationStep === 'rejected';

  const ctaHref =
    registrationStep === 'not_applied' || registrationStep === 'applied'
      ? '/contractors/apply'
      : '/contractors/status';

  const ctaLabel =
    registrationStep === 'not_applied' ? 'Start Application' :
    registrationStep === 'applied' || registrationStep === 'docs_pending' ? 'Upload Documents' :
    canRetry ? 'Re-upload Documents' :
    'View Status';

  return (
    <div
      className={`mb-6 rounded-lg border p-4 ${
        isRejected
          ? 'bg-red-900/10 border-red-500/30'
          : 'bg-accent-amber/10 border-accent-amber/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold mb-1 ${isRejected ? 'text-red-400' : 'text-accent-amber'}`}>
            {isRejected ? 'Action Required' : 'Complete your registration to unlock purchasing'}
          </p>
          {message && (
            <p className="text-xs text-secondary">{message}</p>
          )}

          {/* Step indicator */}
          {!isRejected && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {STEPS.map((step, i) => {
                const stepIdx = currentIndex(step.key);
                const done = stepIdx < idx;
                const active = step.key === registrationStep || (step.key === 'docs_pending' && registrationStep === 'applied');
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          done
                            ? 'bg-accent-amber text-neutral-darker'
                            : active
                            ? 'bg-accent-amber/40 text-accent-amber border border-accent-amber'
                            : 'bg-neutral-medium text-secondary'
                        }`}
                      >
                        {done ? '✓' : i + 1}
                      </span>
                      <span
                        className={`text-xs ${
                          active ? 'text-accent-amber font-medium' : done ? 'text-primary' : 'text-secondary'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <span className="text-neutral-medium text-xs">—</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        <Link
          href={ctaHref}
          className="shrink-0 px-4 py-2 text-xs font-semibold rounded bg-accent-amber text-neutral-darker hover:bg-accent-amber/80 transition-colors"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
