import { test, expect } from './fixtures.mjs';

// Editor coverage — pins the level-editor palette and grid-transform flows so the palette
// keyboard-accessibility work can't silently regress drag/tap selection. Uses ?debug to read
// the live ENGINE via window.APP (see modules/app.js bootstrapApp).

const LOAD_TIMEOUT = 15000;
const EDITOR_MODE = 1; // core.MODES.EDITOR

async function enterEditor(page) {
    await page.goto('/?debug=1');
    await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
    await page.locator('#modeToggleShellBtn').click();
    await expect(page.locator('#editorPalette')).toBeVisible();
    expect(await page.evaluate(() => window.APP.State.ENGINE.mode)).toBe(EDITOR_MODE);
}

test.describe('Level editor', () => {
    test('tapping a palette tool selects it', async ({ page }) => {
        await enterEditor(page);
        await page.locator('.palette-item[data-type="gate"]').click();
        expect(await page.evaluate(() => window.APP.State.ENGINE.editor.selectedTool)).toBe('gate');
    });

    test('the data-driven palette renders all 12 object tools with painted icons', async ({ page }) => {
        await enterEditor(page);
        const info = await page.evaluate(() => {
            const items = [...document.querySelectorAll('#editorPalette .palette-grid .palette-item[data-type]')];
            const gateUse = document.querySelector('.palette-item[data-type="gate"] use');
            const box = gateUse?.getBoundingClientRect();
            return {
                count: items.length,
                groups: document.querySelectorAll('#editorPalette .palette-grid .palette-expandable').length,
                painted: !!box && box.width > 0 && box.height > 0,
            };
        });
        expect(info.count).toBe(12);
        expect(info.groups).toBe(5);
        expect(info.painted).toBe(true);
    });

    test('palette tools are keyboard-focusable and activate on Enter', async ({ page }) => {
        await enterEditor(page);
        const gate = page.locator('.palette-item[data-type="gate"]');
        expect(await gate.getAttribute('role')).toBe('button');
        expect(await gate.getAttribute('tabindex')).toBe('0');
        expect(await gate.getAttribute('aria-label')).toBeTruthy();
        await gate.focus();
        await page.keyboard.press('Enter');
        expect(await page.evaluate(() => window.APP.State.ENGINE.editor.selectedTool)).toBe('gate');
    });

    test('tapping an expandable palette group opens its variant popup', async ({ page }) => {
        await enterEditor(page);
        await page.locator('.palette-item[data-group="visit"]').click();
        await expect(page.locator('#paletteVariantPopup')).toBeVisible();
    });

    test('grid size buttons resize the working level', async ({ page }) => {
        await enterEditor(page);
        const before = await page.evaluate(() => window.APP.State.ENGINE.editor.workingLevel.grid.w);
        await page.locator('#gridSizePlusBtn').click();
        const after = await page.evaluate(() => window.APP.State.ENGINE.editor.workingLevel.grid.w);
        expect(after).toBe(before + 1);
    });

    test('rotate and mirror keep editor geometry and pointer mapping consistent', async ({ page }) => {
        await enterEditor(page);
        const before = await page.evaluate(() => {
            const eng = window.APP.State.ENGINE;
            const l = eng.editor.workingLevel;
            const unpack = (key) => ({ x: key & 0xFFFF, y: key >> 16 });
            const firstPortal = [...l.portalMap.entries()][0];
            return {
                w: l.grid.w, h: l.grid.h, goal: unpack(l.goalKey),
                portal: firstPortal ? [unpack(firstPortal[0]), unpack(firstPortal[1].dest)] : null,
            };
        });

        await page.locator('#gridRotateBtn').click();
        await page.locator('#gridMirrorBtn').click();

        const after = await page.evaluate(() => {
            const eng = window.APP.State.ENGINE;
            const l = eng.editor.workingLevel;
            const unpack = window.APP.LevelUtils.UNPACK;
            const firstPortal = [...l.portalMap.entries()][0];
            const goal = unpack(l.goalKey);
            const canvas = window.APP.Renderer.getCanvas();
            const rect = canvas.getBoundingClientRect();
            const pointer = {
                clientX: rect.left + (goal.x + 0.5) * eng.viewport.cellW * (rect.width / canvas.width),
                clientY: rect.top + (goal.y + 0.5) * eng.viewport.cellH * (rect.height / canvas.height),
            };
            return {
                goal, pointerGoal: window.APP.Input.getGridCoord(pointer),
                portal: firstPortal ? [unpack(firstPortal[0]), unpack(firstPortal[1].dest)] : null,
                mirrorHorizontal: eng.editor.mirrorHorizontal,
            };
        });

        const rotate = ({ x, y }) => ({ x: before.h - 1 - y, y: x });
        const mirror = after.mirrorHorizontal
            ? ({ x, y }) => ({ x: before.h - 1 - x, y })
            : ({ x, y }) => ({ x, y: before.w - 1 - y });
        expect(after.goal).toEqual(mirror(rotate(before.goal)));
        expect(after.pointerGoal).toEqual(after.goal);
        if (before.portal) {
            const expected = before.portal.map(point => mirror(rotate(point)));
            expect(after.portal).toEqual(expected);
        }
    });
});
