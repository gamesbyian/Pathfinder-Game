import { test, expect } from 'playwright/test';

const LOAD_TIMEOUT = 15000;

// Returns the center of a grid cell (1-indexed coords) in CSS pixels.
async function cellCenter(page, col, row, gridCols = 9, gridRows = 9) {
    const box = await page.locator('#gameCanvas').boundingBox();
    const cellW = box.width  / gridCols;
    const cellH = box.height / gridRows;
    return {
        x: box.x + (col - 0.5) * cellW,
        y: box.y + (row - 0.5) * cellH,
    };
}

// Parse "current/required" metric text, return [current, required].
async function getMetric(locator) {
    const text = await locator.textContent();
    const [cur, req] = (text ?? '0/0').split('/').map(Number);
    return [cur, req];
}

test.describe('Gameplay — path drawing', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        // Brief settle for initial render
        await page.waitForTimeout(300);
    });

    test('length counter starts at 0 and updates after drawing one step', async ({ page }) => {
        const [, reqLen] = await getMetric(page.locator('#lengthInfo'));
        expect(reqLen).toBeGreaterThan(0);

        // Level 1: gate at (5,1), adjacent cell right at (6,1)
        const gate = await cellCenter(page, 5, 1);
        const adj  = await cellCenter(page, 6, 1);

        // Drag: pointerdown on gate, move to adjacent, release
        await page.mouse.move(gate.x, gate.y);
        await page.mouse.down();
        await page.mouse.move(adj.x, adj.y, { steps: 5 });
        await page.mouse.up();

        // Length counter should now show 1 (one edge drawn)
        const [cur] = await getMetric(page.locator('#lengthInfo'));
        expect(cur).toBeGreaterThanOrEqual(1);
    });

    test('reset button clears the path and resets length to 0', async ({ page }) => {
        // Draw one step first
        const gate = await cellCenter(page, 5, 1);
        const adj  = await cellCenter(page, 6, 1);
        await page.mouse.move(gate.x, gate.y);
        await page.mouse.down();
        await page.mouse.move(adj.x, adj.y, { steps: 5 });
        await page.mouse.up();

        // Verify something was drawn
        const [curBefore] = await getMetric(page.locator('#lengthInfo'));
        expect(curBefore).toBeGreaterThanOrEqual(1);

        // Click reset
        await page.locator('#resetBtn').click();
        await page.waitForTimeout(200);

        const [curAfter] = await getMetric(page.locator('#lengthInfo'));
        expect(curAfter).toBe(0);
    });

    test('undo button removes the last step', async ({ page }) => {
        // Draw two steps from gate
        const gate  = await cellCenter(page, 5, 1);
        const step1 = await cellCenter(page, 6, 1);
        const step2 = await cellCenter(page, 7, 1);

        await page.mouse.move(gate.x, gate.y);
        await page.mouse.down();
        await page.mouse.move(step1.x, step1.y, { steps: 5 });
        await page.mouse.move(step2.x, step2.y, { steps: 5 });
        await page.mouse.up();

        const [curBefore] = await getMetric(page.locator('#lengthInfo'));
        expect(curBefore).toBeGreaterThanOrEqual(2);

        await page.locator('#undoBtn').click();
        await page.waitForTimeout(200);

        const [curAfter] = await getMetric(page.locator('#lengthInfo'));
        expect(curAfter).toBeLessThan(curBefore);
    });
});

test.describe('UI controls', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
        await page.waitForTimeout(300);
    });

    test('guide button opens guide modal', async ({ page }) => {
        await page.locator('#guideBtn').click();
        await expect(page.locator('#guideModal')).toBeVisible({ timeout: 2000 });
    });

    test('guide modal object cards are rendered from the data-driven builder', async ({ page }) => {
        await page.locator('#guideBtn').click();
        await expect(page.locator('#guideModal')).toBeVisible({ timeout: 2000 });
        // 8 cards rendered into #guideObjectGrid at boot by renderGuideCards(), each with a
        // painted sprite icon and a heading.
        const cards = page.locator('#guideObjectGrid .card');
        await expect(cards).toHaveCount(8);
        await expect(page.locator('#guideObjectGrid .card-header').first()).toHaveText('Gate');
        const iconBox = await page.locator('#guideObjectGrid .card-icon svg').first().boundingBox();
        expect(iconBox.width).toBeGreaterThan(0);
    });

    test('closing guide modal hides it', async ({ page }) => {
        await page.locator('#guideBtn').click();
        await expect(page.locator('#guideModal')).toBeVisible({ timeout: 2000 });
        await page.locator('#closeGuideX').click();
        await expect(page.locator('#guideModal')).toBeHidden({ timeout: 2000 });
    });
});
