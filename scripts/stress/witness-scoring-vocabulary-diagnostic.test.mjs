import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'tmp', 'witness-scoring-vocabulary-diagnostic-test.json');

afterEach(() => {
    if (existsSync(OUT)) rmSync(OUT, { force: true });
});

describe('witness scoring-vocabulary CLI', () => {
    it('bundles and scores one real corpus witness with an exact active-profile reconstruction', () => {
        execFileSync(process.execPath, [
            'scripts/run-bundled.mjs',
            'scripts/stress/witness-scoring-vocabulary-diagnostic.mjs',
            '--',
            '--corpus=corpus2',
            '--sources=witness',
            '--limit=1',
            '--out=tmp/witness-scoring-vocabulary-diagnostic-test.json',
        ], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 120_000,
        });

        const result = JSON.parse(readFileSync(OUT, 'utf8'));
        expect(result.schemaVersion).toBe(1);
        expect(result.corpus).toBe('corpus2');
        expect(result.sources).toEqual(['witness']);
        expect(result.totals.levelsScored).toBe(1);
        expect(result.totals.decisionsVisited).toBeGreaterThan(0);
        expect(result.totals.branchingDecisions).toBeGreaterThan(0);
        expect(result.totals.absentKnownContinuation).toBe(0);
        expect(result.totals.reconstructionFailures).toBe(0);
        expect(result.totals.maxReconstructionError).toBeLessThanOrEqual(result.epsilon);
        expect(result.levels).toHaveLength(1);
    });
});
