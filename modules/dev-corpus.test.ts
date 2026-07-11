/** Regression test: switching the Dev-Mode Play/Edit corpus must not wipe out theme data.
 *  createDevCorpusSwitcher's switchTo() re-ingests the level list via data.ingest({ levels, ... }) —
 *  data.ingest() rebuilds its whole theme map on every call rather than preserving what it had, so
 *  omitting `themes` here silently reset it to {}, which crashed the renderer's th.canvasBg lookup
 *  and froze the canvas on the last frame it managed to paint before the corpus switch. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createData } from './data.js';
import { createDevCorpusSwitcher } from './dev-corpus.js';

const deepClone = (v: any) => JSON.parse(JSON.stringify(v));
const makeLevel = () => ({ grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 } });
const THEMES = { classic: { canvasBg: '#fff', grid: '#000', path: '#111' } };

function fakeFetch(levels: any[]) {
    return async () => ({ ok: true, json: async () => ({ levels }) });
}

test('switching to a stress corpus preserves the theme map', async () => {
    const data = createData({ deepClone });
    data.ingest({ levels: [makeLevel()], themes: THEMES });
    assert.deepEqual(data.getThemes(), THEMES);

    const devCorpus = createDevCorpusSwitcher({ data, fetchImpl: fakeFetch([makeLevel(), makeLevel()]) });
    await devCorpus.switchTo('stress1');

    assert.deepEqual(data.getThemes(), THEMES, 'theme map must survive a levels-only corpus switch');
    assert.equal(data.getLevels().length, 2);
});

test('switching back to published preserves the theme map', async () => {
    const data = createData({ deepClone });
    data.ingest({ levels: [makeLevel()], themes: THEMES });

    const devCorpus = createDevCorpusSwitcher({ data, fetchImpl: fakeFetch([makeLevel(), makeLevel(), makeLevel()]) });
    await devCorpus.switchTo('stress1');
    await devCorpus.switchTo('published');

    assert.deepEqual(data.getThemes(), THEMES, 'theme map must survive switching back to published');
    assert.equal(data.getLevels().length, 1);
});

test('the Firestore local-hints merge is wired only for the published corpus, never a stress corpus', async () => {
    const data = createData({ deepClone });
    data.ingest({ levels: [makeLevel()], themes: THEMES });
    const getLocalLevelHints = async () => [{ path: [9, 9], provenance: [] }];

    const devCorpus = createDevCorpusSwitcher({
        data, fetchImpl: fakeFetch([makeLevel()]), getLocalLevelHints,
    });

    await devCorpus.switchTo('stress1');
    assert.deepEqual(await data.getHints(1), [], 'stress corpus must not merge in Firestore local-level hints');

    // switchTo('published') repoints hintsSource at its own real fetcher (unrelated to this
    // test's fakeFetch, which only serves level lists) — the point here is only that the
    // Firestore-sourced hint shows up, not what the local set resolves to.
    await devCorpus.switchTo('published');
    const hints = await data.getHints(1);
    assert.ok(
        hints.some((h: any) => JSON.stringify(h.path) === JSON.stringify([9, 9])),
        'published corpus must merge in the Firestore local-level hint',
    );
});
