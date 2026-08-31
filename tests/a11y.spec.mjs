import { test, expect } from './fixtures.mjs';

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

        // The shared close-X icon was injected into the modal-close button and paints.
        expect(await page.evaluate(() => {
            const use = document.querySelector('#closeGuideX use');
            const box = use?.getBoundingClientRect();
            return !!box && box.width > 0 && box.height > 0;
        })).toBe(true);

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

    test('Escape closes a loading overlay via its data-modal-dismiss control', async ({ page }) => {
        await page.goto('/?debug=1');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        await page.evaluate(() => window.APP.UI.openModal('diverseSearchResultModal'));
        await expect(page.locator('#diverseSearchResultModal')).toBeVisible();
        // Its Close button carries data-modal-dismiss, so Escape runs that handler (not just a hide).
        await page.keyboard.press('Escape');
        await expect(page.locator('#diverseSearchResultModal')).toBeHidden();
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

    test('the grid is keyboard-playable (arrows draw the path, Backspace undoes)', async ({ page }) => {
        await page.goto('/?debug=1');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

        await page.locator('#gameCanvas').focus();
        expect(await page.evaluate(() => window.APP.State.engineState.nav.path.length)).toBe(0);

        // From the gate, at least one cardinal direction is a valid first move on any
        // solvable level. Stop at the first one so exactly one step (one undo snapshot)
        // exists, making the Backspace-undo assertion deterministic.
        let drawn = 0;
        for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
            await page.keyboard.press(key);
            drawn = await page.evaluate(() => window.APP.State.engineState.nav.path.length);
            if (drawn >= 2) break;
        }
        expect(drawn).toBeGreaterThanOrEqual(2);

        await page.keyboard.press('Backspace');
        const undone = await page.evaluate(() => window.APP.State.engineState.nav.path.length);
        expect(undone).toBeLessThan(drawn);
    });

    test('keyboard focus shows a visible focus ring', async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

        // Tabbing through the controls must surface a visible focus-visible outline on at
        // least one control (the app previously suppressed all keyboard focus rings).
        let sawRing = false;
        for (let i = 0; i < 10 && !sawRing; i++) {
            await page.keyboard.press('Tab');
            const width = await page.evaluate(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return 0;
                return parseFloat(getComputedStyle(el).outlineWidth) || 0;
            });
            if (width > 0) sawRing = true;
        }
        expect(sawRing).toBe(true);
    });
});
