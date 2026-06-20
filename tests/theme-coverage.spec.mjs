import { test, expect } from 'playwright/test';

// Regression test for theme coverage: every colored UI element must actually
// repaint when the active theme changes. A hardcoded Tailwind color class (or a
// derived theme token that resolves to the same value for every theme) renders
// fine on day one but silently stops following theme switches forever after.
//
// Method: force every gated modal/overlay/pane into the DOM at once (bypassing
// the real multi-step flows that normally gate them — sign-in, dev mode, specific
// game states — which would be far too slow/fragile to drive here), then snapshot
// each element's computed background/text/border color across every real theme.
// An element whose three colors are byte-identical across ALL themes never
// actually varies with the active theme and is flagged.

const LOAD_TIMEOUT = 15000;

const SKIP_TAGS = new Set(['html', 'head', 'meta', 'title', 'link', 'script', 'style', 'br', 'noscript']);
const SVG_PRIMITIVES = new Set(['svg', 'rect', 'g', 'line', 'path', 'circle', 'polygon', 'polyline', 'ellipse', 'defs', 'clippath', 'lineargradient', 'stop']);
const isTransparentish = (c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent';

// Known, deliberate exceptions — colors that are tied to something other than the
// active theme by design, not a coverage gap:
const isKnownException = (el) =>
    // Theme picker swatch name labels: each label's contrast color is computed from
    // THAT SWATCH's own background, not the globally active theme, so it stays
    // constant while other themes are selected (see theme-picker-renderer.js).
    el.ancestorId === 'themeGrid' ||
    // Editor palette group icons: colored by object-type identity (e.g. "park" =
    // green), not by the active theme (see editor-toolbar-controller.js variantColor()).
    (el.tag === 'use' && el.cls.includes('palette-group-icon'));

async function collectStyles(page) {
    return page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).map(el => {
            const cs = getComputedStyle(el);
            let anc = el.parentElement;
            let ancestorId = null;
            while (anc) { if (anc.id) { ancestorId = anc.id; break; } anc = anc.parentElement; }
            // el.className is an SVGAnimatedString (not a plain string) on SVG
            // elements — read the raw attribute instead so it works for both.
            const cls = el.getAttribute('class') || '';
            return {
                id: el.id || null,
                cls,
                tag: el.tagName.toLowerCase(),
                hasIdOrClass: !!(el.id || cls.trim()),
                bg: cs.backgroundColor,
                color: cs.color,
                borderColor: cs.borderTopColor,
                ancestorId,
            };
        });
    });
}

test.describe('Theme coverage', () => {
    test('every colored element varies across all real themes', async ({ page }) => {
        // `?debug` opts into the full mutable window.APP facade; the default production
        // surface is read-only window.PATHFINDER (see modules/app.js bootstrapApp).
        await page.goto('/?debug=1');
        await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });

        const themeNames = await page.evaluate(() => Object.keys(window.APP.Themes.THEMES || {}));
        // 'chaos' randomizes every token independently per-build by design — it has
        // no fixed per-theme identity to diff against, so it's not a useful sample.
        const realThemes = themeNames.filter(n => n !== 'chaos');
        expect(realThemes.length).toBeGreaterThan(1);

        // Reveal every gated screen/modal/overlay simultaneously so this single pass
        // can inspect all of them without driving each one's real open-flow.
        await page.evaluate(() => {
            window.APP.State.ENGINE.isDevMode = true;
            window.APP.Engine.updatePlayModeLayout();
            document.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
        });
        await page.waitForTimeout(300);

        const snapshots = [];
        for (const name of realThemes) {
            await page.evaluate((themeName) => window.APP.Themes.applyTheme(themeName), name);
            // Many buttons have a CSS `transition` on color/background; without a
            // settle wait, getComputedStyle can read a mid-interpolation color.
            await page.waitForTimeout(250);
            snapshots.push(await collectStyles(page));
        }

        const baseline = snapshots[0];
        const unthemed = [];
        for (let i = 0; i < baseline.length; i++) {
            const rows = snapshots.map(s => s[i]);
            const first = rows[0];
            if (SKIP_TAGS.has(first.tag)) continue;
            if (SVG_PRIMITIVES.has(first.tag) && !first.hasIdOrClass) continue;

            const hasVisibleColor = rows.some(r => !isTransparentish(r.bg) || !isTransparentish(r.color) || !isTransparentish(r.borderColor));
            if (!hasVisibleColor) continue;

            const allIdentical = rows.every(r => r.bg === first.bg && r.color === first.color && r.borderColor === first.borderColor);
            if (allIdentical && !isKnownException(first)) {
                unthemed.push({ id: first.id, tag: first.tag, cls: first.cls, ancestorId: first.ancestorId, bg: first.bg, color: first.color, borderColor: first.borderColor });
            }
        }

        // Dedupe by identity (id, or tag+class signature when no id) for a readable failure message.
        const seen = new Set();
        const deduped = unthemed.filter(r => {
            const key = r.id ? `#${r.id}` : `${r.tag}.${r.cls}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        expect(deduped, `Found elements whose color never changes across any of ${realThemes.length} themes:\n${JSON.stringify(deduped, null, 2)}`).toEqual([]);
    });
});
