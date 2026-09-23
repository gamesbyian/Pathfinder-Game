import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    expectedHintArtifactFileNames,
    hintArtifactFileName,
    hintDirectoryNameForLevelsFile,
    hintKeyForLevel,
    isHintArtifactFileName,
} from './hint-artifact-layout.mjs';
import { createDefaultHintsSource } from './data-asset-loaders.js';

test('corpus filename determines the same hint directory for browser and Node adapters', () => {
    assert.equal(hintDirectoryNameForLevelsFile('levels.json'), 'hints');
    assert.equal(hintDirectoryNameForLevelsFile('/repo/data/stress/stress-levels.json'), 'hints');
    assert.equal(hintDirectoryNameForLevelsFile('/repo/data/stress/stress-levels-random.json'), 'hints-random');
    assert.equal(hintDirectoryNameForLevelsFile('C:\\repo\\data\\stress\\stress-levels-variants.json'), 'hints-variants');
});

test('writer-legal persistent ids are discoverable under the same filename contract', () => {
    assert.equal(hintArtifactFileName('P00042'), 'P00042.json');
    assert.equal(hintArtifactFileName('F00001-gr-04'), 'F00001-gr-04.json');
    assert.equal(hintArtifactFileName(7), '00007.json');

    assert.equal(isHintArtifactFileName('P00042.json'), true);
    assert.equal(isHintArtifactFileName('F00001-gr-04.json'), true);
    assert.equal(isHintArtifactFileName('00007.json'), true);
    assert.equal(isHintArtifactFileName('README.md'), false);
    assert.equal(isHintArtifactFileName('.json'), false);

    assert.throws(() => hintArtifactFileName('../escape'), /safe filename identity/);
    assert.throws(() => hintArtifactFileName('nested/level'), /safe filename identity/);
});

test('expected hint artifacts derive from level ids with explicit positional fallback', () => {
    const levels = [{ id: 'R00001' }, { id: 'F00001-gr-04' }, {}];
    assert.deepEqual(expectedHintArtifactFileNames(levels), [
        'R00001.json',
        'F00001-gr-04.json',
        '00003.json',
    ]);
    assert.equal(hintKeyForLevel(levels[0], 1), 'R00001');
    assert.equal(hintKeyForLevel(levels[2], 3), 3);
});

test('browser hint source derives stress-corpus directory instead of accepting an independent mapping', async () => {
    const requested: string[] = [];
    const fetchImpl = async (url: string) => {
        requested.push(url);
        return { ok: true, json: async () => ({ schemaVersion: 3, hints: [] }) };
    };
    const source = createDefaultHintsSource({
        fetchImpl,
        basePath: './data/stress',
        levelsFile: 'stress-levels-random.json',
    });
    assert.deepEqual(await source('R00042'), []);
    assert.deepEqual(requested, ['./data/stress/hints-random/R00042.json']);

    assert.throws(
        () => createDefaultHintsSource({
            fetchImpl,
            basePath: './data/stress',
            levelsFile: 'stress-levels-random.json',
            hintsDirName: 'hints',
        }),
        /conflicts with layout-derived directory/,
    );
});
