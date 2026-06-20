import { test, expect } from 'playwright/test';

// Visual-regression baselines for the modal chrome. Purpose: make refactors of the modal
// markup (e.g. adopting the semantic .modal-header/.modal-title/.modal-body classes) safe —
// a layout shift the colour-only theme-coverage test can't see will fail here instead.
//
// This spec runs in its own Playwright project ("visual"), NOT in the default e2e run, and
// is NOT part of `npm run ci` — visual baselines are environment-sensitive (font/AA
// rendering), so they're a developer tool: regenerate with `npm run test:visual:update`,
// compare with `npm run test:visual`.

const LOAD_TIMEOUT = 15000;

// Each modal is forced open through the debug facade so the snapshot doesn't depend on
// triggering a real game flow; we capture the modal container's structural chrome.
const MODALS = ['guideModal', 'themeModal', 'solveOptionsModal', 'winModal', 'unsavedModal', 'editorHelpModal', 'publishedLevelsModal'];

test.describe('Visual — modal layout baselines', () => {
    for (const id of MODALS) {
        test(`${id} layout`, async ({ page }) => {
            await page.goto('/?debug=1');
            await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

            // Pin a deterministic theme and wait for web fonts so text metrics are stable.
            await page.evaluate(() => window.APP.Themes.applyTheme('classic'));
            await page.evaluate(() => document.fonts.ready.then(() => true));

            await page.evaluate((mid) => {
                window.APP.UI.closeAllModals();
                window.APP.UI.openModal(mid);
            }, id);

            const modal = page.locator(`#${id}`);
            await expect(modal).toBeVisible();
            await expect(modal).toHaveScreenshot(`${id}.png`, {
                animations: 'disabled',
                maxDiffPixelRatio: 0.02,
            });
        });
    }
});
