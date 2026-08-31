import { test, expect } from './fixtures.mjs';

const LOAD_TIMEOUT = 15000;

async function readOrientationRoundTrip(page) {
    return page.evaluate(() => {
        const eng = window.APP.State.ENGINE;
        const level = eng.level;
        const canvas = window.APP.Renderer.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const base = window.APP.LevelUtils.UNPACK(level.gateKeys[0]);
        const transformed = window.APP.LevelUtils.transformPoint(
            base.x, base.y, eng.orientation, level.grid.w, level.grid.h,
        );
        const pointer = {
            clientX: rect.left + (transformed.tx + 0.5) * eng.viewport.cellW * (rect.width / canvas.width),
            clientY: rect.top + (transformed.ty + 0.5) * eng.viewport.cellH * (rect.height / canvas.height),
        };
        return {
            orientation: eng.orientation,
            base,
            mapped: window.APP.LevelUtils.getGridCoord(pointer),
            swapped: eng.viewport.swapped,
        };
    });
}

test.describe('Runtime orientation characterization', () => {
    test('perspective control cycles all eight transforms with render/input agreement and reset preservation', async ({ page }) => {
        await page.goto('/?debug=1');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

        const start = (await readOrientationRoundTrip(page)).orientation;
        for (let step = 0; step < 8; step += 1) {
            const observed = await readOrientationRoundTrip(page);
            expect(observed.orientation).toBe((start + step) % 8);
            expect(observed.mapped).toEqual(observed.base);
            expect(observed.swapped).toBe([1, 3, 6, 7].includes(observed.orientation));
            await page.locator('#whoaBtn').click();
        }

        expect((await readOrientationRoundTrip(page)).orientation).toBe(start);

        await page.locator('#whoaBtn').click();
        const beforeReset = (start + 1) % 8;
        expect((await readOrientationRoundTrip(page)).orientation).toBe(beforeReset);

        await page.locator('#resetBtn').click();
        await expect.poll(async () => (await readOrientationRoundTrip(page)).orientation).toBe(beforeReset);
        const afterReset = await readOrientationRoundTrip(page);
        expect(afterReset.mapped).toEqual(afterReset.base);
        expect(afterReset.swapped).toBe([1, 3, 6, 7].includes(beforeReset));
    });
});
