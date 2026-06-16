import { test, expect } from 'playwright/test';

// Boot smoke tests — verify the game loads and reaches a playable state.
// These tests run against a local static server (`npx serve .`).

const LOAD_TIMEOUT = 15000;

test.describe('Boot and load', () => {
    test('page title is Pathfinder', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle('Pathfinder');
    });

    test('loading overlay appears and then hides after boot', async ({ page }) => {
        await page.goto('/');
        const overlay = page.locator('#loadingOverlay');
        // Overlay should be visible initially (or transition quickly)
        // Wait for it to hide — boot completes when overlay is gone
        await expect(overlay).toBeHidden({ timeout: LOAD_TIMEOUT });
    });

    test('game canvas is visible after load', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        const canvas = page.locator('#gameCanvas');
        await expect(canvas).toBeVisible();
    });

    test('level 1 title shows in header after load', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        const levelTitle = page.locator('#levelTitle');
        await expect(levelTitle).toBeVisible();
        // Level title shows the current level number (1-indexed)
        await expect(levelTitle).toHaveText('1');
    });

    test('play metrics panel shows length and crosses targets', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        const lengthInfo = page.locator('#lengthInfo');
        const crossInfo  = page.locator('#intersectionInfo');
        await expect(lengthInfo).toBeVisible();
        await expect(crossInfo).toBeVisible();
        // Format is "current/required" — both should show a target > 0
        const lengthText = await lengthInfo.textContent();
        expect(lengthText).toMatch(/\d+\/\d+/);
    });
});

test.describe('Level navigation', () => {
    test('next level button advances to level 2', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        await page.locator('#nextLevelBtn').click();
        await expect(page.locator('#levelTitle')).toHaveText('2', { timeout: 3000 });
    });

    test('previous level button returns to level 1 from level 2', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        await page.locator('#nextLevelBtn').click();
        await expect(page.locator('#levelTitle')).toHaveText('2', { timeout: 3000 });
        await page.locator('#prevLevelBtn').click();
        await expect(page.locator('#levelTitle')).toHaveText('1', { timeout: 3000 });
    });
});
