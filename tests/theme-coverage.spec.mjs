import { test, expect, blockThirdParty } from './fixtures.mjs';

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
//
// Performance: this is a cross-theme *reduction* (an element is flagged only if it
// is identical across ALL themes), so it can't be decomposed into independent
// per-theme Playwright tests without false positives. Instead we (a) disable CSS
// transitions so getComputedStyle returns final colors with no per-theme settle
// wait, and (b) shard the per-theme collection across several pages that boot and
// collect concurrently, then run the single diff over the merged snapshots.

const LOAD_TIMEOUT = 15000;
const SHARDS = 4; // parallel pages used to collect theme snapshots

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

// Boot a page into the deterministic snapshot state: third-party blocked, dev mode
// on, every gated screen/modal/overlay revealed, and CSS transitions/animations
// disabled (so computed colors are final immediately — no per-theme settle wait).
// Every page is prepared identically, so element document-order aligns across pages.
async function preparePage(browser) {
    const page = await browser.newPage();
    await blockThirdParty(page);
    // `?debug` opts into the full mutable window.APP facade; the default production
    // surface is read-only window.PATHFINDER (see modules/app.js bootstrapApp).
    await page.goto('/?debug=1');
    await page.locator('#loadingOverlay').waitFor({ state: 'hidden', timeout: LOAD_TIMEOUT });
    await page.evaluate(() => {
        window.APP.State.engineState.isDevMode = true;
        window.APP.Engine.updatePlayModeLayout();
        document.querySelectorAll('.hidden').forEach(el => el.classList.remove('hidden'));
        const style = document.createElement('style');
        style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
        document.head.appendChild(style);
    });
    await page.waitForTimeout(150); // brief DOM settle after revealing gated content
    return page;
}

// Collect one snapshot per theme, sequentially on a single page.
async function collectThemes(page, themeList) {
    const out = [];
    for (const name of themeList) {
        await page.evaluate((themeName) => window.APP.Themes.applyTheme(themeName), name);
        out.push({ name, styles: await collectStyles(page) });
    }
    return out;
}

test.describe('Theme coverage', () => {
    test('every colored element varies across all real themes', async ({ browser }) => {
        const probe = await preparePage(browser);
        const themeNames = await probe.evaluate(() => Object.keys(window.APP.Themes.THEMES || {}));
        // 'chaos' randomizes every token independently per-build by design — it has
        // no fixed per-theme identity to diff against, so it's not a useful sample.
        const realThemes = themeNames.filter(n => n !== 'chaos');
        expect(realThemes.length).toBeGreaterThan(1);

        // Round-robin the themes across SHARDS pages; the probe page is shard 0.
        const shards = Array.from({ length: SHARDS }, () => []);
        realThemes.forEach((name, i) => shards[i % SHARDS].push(name));

        const extraPages = await Promise.all(shards.slice(1).map(() => preparePage(browser)));
        const pages = [probe, ...extraPages];

        // Collect each shard concurrently, then merge back into theme order.
        const shardResults = await Promise.all(pages.map((page, i) => collectThemes(page, shards[i])));
        await Promise.all(pages.map(p => p.close()));

        const byTheme = new Map();
        for (const shard of shardResults) for (const { name, styles } of shard) byTheme.set(name, styles);
        const snapshots = realThemes.map(n => byTheme.get(n));

        // Sharding only works if every page produced the same DOM (same build + same
        // reveal), so element document-order indices align across snapshots. Guard it.
        const len = snapshots[0].length;
        expect(snapshots.every(s => s.length === len), 'snapshot element counts diverged across pages — DOM is non-deterministic, index alignment is unsafe').toBe(true);

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
