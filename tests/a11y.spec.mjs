import { test, expect } from 'playwright/test';

// Accessibility: modal focus management (modules/ui/focus-trap.js).
// When a modal opens, focus moves into it; Tab is trapped within it; Escape closes it
// and focus is restored to the control that opened it.

const LOAD_TIMEOUT = 15000;

test.describe('Modal focus management', () => {
    test('guide modal traps focus, closes on Escape, and restores focus', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

        // Open the guide modal via its button (so the button is the focus-restore target).
        await page.locator('#guideBtn').click();
        await expect(page.locator('#guideModal')).toBeVisible();

        // Focus moved into the modal.
        expect(await page.evaluate(() =>
            document.getElementById('guideModal').contains(document.activeElement))).toBe(true);

        // Tab keeps focus within the modal (does not escape to page chrome behind it).
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() =>
            document.getElementById('guideModal').contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Shift+Tab');
        expect(await page.evaluate(() =>
            document.getElementById('guideModal').contains(document.activeElement))).toBe(true);

        // Escape closes the modal and restores focus to the opener.
        await page.keyboard.press('Escape');
        await expect(page.locator('#guideModal')).toBeHidden();
        expect(await page.evaluate(() => document.activeElement?.id)).toBe('guideBtn');

        // The modal advertises dialog semantics for assistive tech.
        expect(await page.evaluate(() => {
            const m = document.getElementById('guideModal');
            return { role: m.getAttribute('role'), modal: m.getAttribute('aria-modal'), label: !!m.getAttribute('aria-label') };
        })).toEqual({ role: 'dialog', modal: 'true', label: true });
    });

    test('theme swatches are keyboard-focusable buttons, not clickable divs', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        const swatches = await page.evaluate(() => ({
            buttons: document.querySelectorAll('#themeGrid button').length,
            divs: document.querySelectorAll('#themeGrid > div').length,
            allLabeled: [...document.querySelectorAll('#themeGrid button')].every(b => !!b.getAttribute('aria-label')),
        }));
        expect(swatches.buttons).toBeGreaterThan(0);
        expect(swatches.divs).toBe(0);
        expect(swatches.allLabeled).toBe(true);
    });
});
