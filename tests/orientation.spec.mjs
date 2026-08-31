import { test, expect } from './fixtures.mjs';

const LOAD_TIMEOUT = 15000;

async function readOrientationRoundTrip(page) {
    return page.evaluate(() => {
        const eng = window.APP.State.ENGINE;
        const level = eng.level;
        const canvas = window.APP.Renderer.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const unpack = (key) => ({ x: key & 0xFFFF, y: key >> 16 });
        const transformPoint = (x, y, orientation, W, H) => {
            switch (orientation) {
                case 0: return { tx: x, ty: y };
                case 1: return { tx: H - 1 - y, ty: x };
                case 2: return { tx: W - 1 - x, ty: H - 1 - y };
                case 3: return { tx: y, ty: W - 1 - x };
                case 4: return { tx: W - 1 - x, ty: y };
                case 5: return { tx: x, ty: H - 1 - y };
                case 6: return { tx: y, ty: x };
                case 7: return { tx: H - 1 - y, ty: W - 1 - x };
                default: return { tx: x, ty: y };
            }
        };
        const base = unpack(level.gateKeys[0]);
        const transformed = transformPoint(base.x, base.y, eng.orientation, level.grid.w, level.grid.h);
        const pointer = {
            clientX: rect.left + (transformed.tx + 0.5) * eng.viewport.cellW * (rect.width / canvas.width),
            clientY: rect.top + (transformed.ty + 0.5) * eng.viewport.cellH * (rect.height / canvas.height),
        };
        return {
            orientation: eng.orientation,
            base,
            mapped: window.APP.Input.getGridCoord(pointer),
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
