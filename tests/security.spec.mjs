import { test, expect } from './fixtures.mjs';

// Debug-surface security invariant (modernization-plan §4 Phase 4 / ADR 0004):
// default boot must NOT expose a mutation-capable global. Default boot exposes only the
// read-only, snapshot-only `window.PATHFINDER`; the full mutable `window.APP` facade (which
// hands out the live ENGINE) is opt-in via the `?debug` query param alone — on any host,
// including production, so the documented debugging workflow (load the live site with
// `?debug`) needs no extra opt-in step. See modules/app.js bootstrapApp() /
// shouldExposeMutableFacade().

const LOAD_TIMEOUT = 15000;
const waitForBoot = (page) =>
    page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

test.describe('Debug-surface security', () => {
    test('default boot exposes no mutable window.APP, only frozen read-only PATHFINDER', async ({ page }) => {
        await page.goto('/');
        await waitForBoot(page);

        const surface = await page.evaluate(() => ({
            hasAppFacade: typeof window.APP !== 'undefined',
            hasDiagnostics: typeof window.PATHFINDER !== 'undefined',
            diagnosticsFrozen: window.PATHFINDER ? Object.isFrozen(window.PATHFINDER) : false,
            exposesLiveState: !!(window.PATHFINDER && window.PATHFINDER.State),
            exposesEngine: !!(window.PATHFINDER && window.PATHFINDER.Engine),
            snapshotKind: typeof window.PATHFINDER?.getStateSnapshot,
        }));

        // No mutable facade in production.
        expect(surface.hasAppFacade).toBe(false);
        // Read-only diagnostics present and frozen.
        expect(surface.hasDiagnostics).toBe(true);
        expect(surface.diagnosticsFrozen).toBe(true);
        // Diagnostics expose no live subsystem references — only snapshot getters.
        expect(surface.exposesLiveState).toBe(false);
        expect(surface.exposesEngine).toBe(false);
        expect(surface.snapshotKind).toBe('function');
    });

    test('a state snapshot is a clone — mutating it does not affect live engine state', async ({ page }) => {
        await page.goto('/');
        await waitForBoot(page);

        const result = await page.evaluate(() => {
            const before = window.PATHFINDER.getStateSnapshot();
            // Attempt to mutate through the snapshot; the live state must be unaffected.
            before.muted = !before.muted;
            const after = window.PATHFINDER.getStateSnapshot();
            return { mutatedValue: before.muted, liveValue: after.muted };
        });
        // The live snapshot's value is independent of the mutated copy.
        expect(result.liveValue).not.toBe(result.mutatedValue);
    });

    test('?debug opts into the mutable window.APP facade', async ({ page }) => {
        await page.goto('/?debug=1');
        await waitForBoot(page);

        const hasAppFacade = await page.evaluate(
            () => typeof window.APP !== 'undefined' && !!window.APP.State && !!window.APP.Engine,
        );
        expect(hasAppFacade).toBe(true);
    });

    test('?debug facade keeps the live ENGINE identity across a real reset', async ({ page }) => {
        await page.goto('/?debug=1');
        await waitForBoot(page);
        const result = await page.evaluate(() => {
            const before = window.APP.State.ENGINE;
            const beforeLevel = before.level;
            const beforeVariant = before.variant;
            const beforeStreak = before.resetStreak;
            window.APP.Engine.handleResetAction();
            return {
                sameEngine: window.APP.State.ENGINE === before,
                levelReloaded: window.APP.State.ENGINE.level !== beforeLevel,
                variantPreserved: window.APP.State.ENGINE.variant === beforeVariant,
                streakAdvanced: window.APP.State.ENGINE.resetStreak === beforeStreak + 1,
                pathLength: window.APP.State.ENGINE.nav.path.length,
            };
        });
        expect(result).toEqual({
            sameEngine: true,
            levelReloaded: true,
            variantPreserved: true,
            streakAdvanced: true,
            pathLength: 0,
        });
    });
});
