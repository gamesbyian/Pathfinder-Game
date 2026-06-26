import { test, expect } from './fixtures.mjs';

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

    test('icon sprite sheet is injected and symbols resolve', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        // The SVG <defs> sprite sheet is no longer inline in index.html; it is injected at
        // boot by modules/ui/svg-defs.js. Verify the sheet and a representative symbol exist,
        // and that a static <use href="#def-*"> actually renders (non-zero painted size).
        const spriteState = await page.evaluate(() => ({
            sheet: !!document.getElementById('iconSpriteSheet'),
            navSymbol: !!document.getElementById('def-nav-next'),
            closeSymbol: !!document.getElementById('def-close'),
            navBtnPainted: (() => {
                const use = document.querySelector('#nextLevelBtn use');
                if (!use) return false;
                const box = use.getBoundingClientRect();
                return box.width > 0 && box.height > 0;
            })(),
        }));
        expect(spriteState).toEqual({ sheet: true, navSymbol: true, closeSymbol: true, navBtnPainted: true });
    });

    test('boot builders populate their mount points (guide cards, submit steps)', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        const built = await page.evaluate(() => ({
            guideCards: document.querySelectorAll('#guideObjectGrid .card').length,
            submitSteps: [...document.querySelectorAll('#submitStepList > li')].map((li) => li.id),
        }));
        expect(built.guideCards).toBe(8);
        expect(built.submitSteps).toEqual(['smStep-validate', 'smStep-duplicate', 'smStep-solve', 'smStep-save']);
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
