import { normalizeAuthRedirect } from '@/lib/auth-redirect';

describe('normalizeAuthRedirect', () => {
  it('returns a safe internal path unchanged', () => {
    expect(normalizeAuthRedirect('/dashboard/investor/agreement')).toBe('/dashboard/investor/agreement');
  });

  it('normalizes same-origin absolute-looking input down to path/search/hash', () => {
    expect(
      normalizeAuthRedirect('https://finverno.example.com/dashboard/investor/agreement?tab=docs#latest')
    ).toBe('/dashboard/investor/agreement?tab=docs#latest');
  });

  it('falls back for malformed input', () => {
    expect(normalizeAuthRedirect(':::not-a-url:::', '/dashboard')).toBe('/dashboard');
  });

  it('falls back for non-path relative input', () => {
    expect(normalizeAuthRedirect('dashboard/investor', '/dashboard')).toBe('/dashboard');
  });
});
