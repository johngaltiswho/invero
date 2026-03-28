/**
 * Visual Regression Tests
 *
 * Takes screenshots of key pages and compares them to baseline images.
 * Catches unintended UI changes that break the design.
 *
 * How it works:
 * 1. First run: Creates baseline screenshots
 * 2. Subsequent runs: Compares against baseline
 * 3. Fails if visual differences exceed threshold
 *
 * Update baselines when UI changes are intentional:
 *   pnpm test:e2e --update-snapshots
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Public Pages', () => {
  test('homepage looks correct', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Take screenshot and compare to baseline
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow small rendering differences
    });
  });

  test('contractors page looks correct', async ({ page }) => {
    await page.goto('/contractors');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('contractors-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('investors page looks correct', async ({ page }) => {
    await page.goto('/investors');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('investors-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

test.describe('Visual Regression - Components', () => {
  test.skip(true, 'Requires authentication');

  test('project card looks correct', async ({ page }) => {
    // await loginAsContractor(page, 'test@contractor.com', 'password');
    // await page.goto('/dashboard/contractor/projects');
    // await page.waitForLoadState('networkidle');

    // // Screenshot just the first project card
    // const card = page.locator('[data-testid="project-card"]').first();
    // await expect(card).toHaveScreenshot('project-card.png');
  });

  test('BOQ table looks correct', async ({ page }) => {
    // await loginAsContractor(page, 'test@contractor.com', 'password');
    // await page.goto('/dashboard/contractor/projects/PROJECT_ID');

    // const boqTable = page.locator('[data-testid="boq-table"]');
    // await expect(boqTable).toHaveScreenshot('boq-table.png');
  });
});

test.describe('Visual Regression - Responsive', () => {
  test('homepage mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
    });
  });

  test('homepage tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.skip(true, 'Enable when dark mode is implemented');

  test('homepage in dark mode', async ({ page }) => {
    // Set dark mode
    // await page.emulateMedia({ colorScheme: 'dark' });

    // await page.goto('/');
    // await page.waitForLoadState('networkidle');

    // await expect(page).toHaveScreenshot('homepage-dark.png', {
    //   fullPage: true,
    // });
  });
});
