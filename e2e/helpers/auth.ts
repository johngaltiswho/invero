/**
 * Authentication Helpers for E2E Tests
 *
 * Provides utilities for setting up authenticated sessions in Playwright tests.
 *
 * Usage:
 *   import { loginAsContractor } from './helpers/auth';
 *
 *   test('my test', async ({ page }) => {
 *     await loginAsContractor(page, 'test@contractor.com', 'password');
 *     // ... rest of test
 *   });
 */

import { Page } from '@playwright/test';

/**
 * Login as a contractor user
 */
export async function loginAsContractor(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Navigate to sign-in page
  await page.goto('/sign-in');

  // Fill in credentials
  await page.fill('input[name="identifier"]', email);
  await page.fill('input[name="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
}

/**
 * Login as an admin user
 */
export async function loginAsAdmin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('input[name="identifier"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/**', { timeout: 10000 });
}

/**
 * Login as an investor user
 */
export async function loginAsInvestor(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('input[name="identifier"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/investor/**', { timeout: 10000 });
}

/**
 * Setup authenticated session using stored state
 * More efficient for running multiple tests
 */
export async function setupAuthState(email: string, password: string): Promise<string> {
  // This would use Playwright's storageState feature
  // to save authentication cookies and reuse them across tests
  // Implementation depends on your auth provider (Clerk)

  // For now, return a placeholder
  return 'auth-state.json';
}

/**
 * Logout current user
 */
export async function logout(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('button:has-text("Sign out")');
  await page.waitForURL('**/sign-in', { timeout: 5000 });
}
