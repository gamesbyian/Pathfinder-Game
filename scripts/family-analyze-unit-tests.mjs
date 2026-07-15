#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/family-analyze.mjs: joins a family manifest
 * (scripts/family-generate.mjs's output shape) against solve-result JSON
 * (scripts/portfolio-solve-sweep.mjs's --out shape) into a mutation-effect delta table.
 * Uses hand-built synthetic fixtures (not live solver output) so the expected deltas are
 * exact, hand-computable numbers rather than whatever the solver happens to do today.
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// family-analyze.mjs has no TS imports, so it runs directly under plain node (no run-bundled.mjs
// or tsx needed) — unlike family-generate.mjs, which does.
async function runAnalyze(args) {
    return execFile('node', ['scripts/family-analyze.mjs', ...args], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
}

function syntheticManifest() {
    return {
        familyId: 'family-TEST-w0',
        parentLevelId: 'TEST',
        selectedWitnessSource: 'hint[0]',
        selectedWitnessLength: 20,
        selectedWitnessIntersectionCount: 1,
        familyMode: 'local-mutant',
        acceptedCount: 2,
        requestedCount: 2,
        movableInstanceCount: 3,
        variants: [
            {
                variantId: 'F00TEST-01',
                mutationManifest: { objectType: 'blocks', operation: 'move', from: { x: 5, y: 1 }, to: { x: 5, y: 3 } },
            },
            {
                variantId: 'F00TEST-02',
                mutationManifest: { objectType: 'mustTurn', operation: 'move', role: 'mustTurn', from: { x: 2, y: 2 }, to: { x: 4, y: 4 }, },
            },
        ],
    };
}

function syntheticSolveResult() {
    return {
        summary: {},
        levels: [
            { id: 'F00TEST-01', ok: true, nodesExpanded: 500, totalMs: 20, winningConfig: 'dfs:perimeterSweep/cornerHarvest' },
            { id: 'F00TEST-02', ok: false, nodesExpanded: 900000, totalMs: 15000, winningConfig: null },
        ],
    };
}

function syntheticParentSolveResult() {
    return { summary: {}, levels: [{ id: 'TEST', ok: true, nodesExpanded: 1000, totalMs: 40, winningConfig: 'dfs:perimeterSweep/cornerHarvest' }] };
}

async function main() {
    await mkdir(path.join(ROOT, 'tmp'), { recursive: true });
    const tempDir = await mkdtemp(path.join(ROOT, 'tmp', 'family-analyze-test-'));
    try {
        const manifestPath = path.join(tempDir, 'manifest.json');
        const solveResultPath = path.join(tempDir, 'solve-result.json');
        const parentSolveResultPath = path.join(tempDir, 'parent-solve-result.json');
        await writeFile(manifestPath, JSON.stringify(syntheticManifest()));
        await writeFile(solveResultPath, JSON.stringify(syntheticSolveResult()));
        await writeFile(parentSolveResultPath, JSON.stringify(syntheticParentSolveResult()));

        // ── Without a parent solve result: no delta columns computed, but the base table still prints ──
        const noParent = await runAnalyze([`--manifest=${manifestPath}`, `--solve-result=${solveResultPath}`]);
        assert.match(noParent.stdout, /Family family-TEST-w0 — parent TEST/);
        assert.match(noParent.stdout, /2\/2 siblings generated, 3 movable instance\(s\)/);
        assert.doesNotMatch(noParent.stdout, /Parent solve:/, 'no parent-solve line without --parent-solve-result');
        assert.match(noParent.stdout, /F00TEST-01\tblocks\t\(5,1\)->\(5,3\)\ttrue\t500\t20\tdfs:perimeterSweep\/cornerHarvest\t-\t-/);
        assert.match(noParent.stdout, /F00TEST-02\tmustTurn\(mustTurn\)\t\(2,2\)->\(4,4\)\tfalse\t900000\t15000\t-\t-\t-/);

        // ── With a parent solve result: exact hand-computed deltas ──────────────────────────────────
        const withParent = await runAnalyze([
            `--manifest=${manifestPath}`, `--solve-result=${solveResultPath}`, `--parent-solve-result=${parentSolveResultPath}`,
        ]);
        assert.match(withParent.stdout, /Parent solve:\s+ok=true nodes=1000 ms=40 config=dfs:perimeterSweep\/cornerHarvest/);
        // F00TEST-01: 500-1000 = -500 nodes, 20-40 = -20 ms.
        assert.match(withParent.stdout, /F00TEST-01\tblocks\t\(5,1\)->\(5,3\)\ttrue\t500\t20\tdfs:perimeterSweep\/cornerHarvest\t-500\t-20/);
        // F00TEST-02: 900000-1000 = 899000 nodes, 15000-40 = 14960 ms — a real regression, exposed
        // exactly as a large positive delta rather than hidden behind an absolute-only report.
        assert.match(withParent.stdout, /F00TEST-02\tmustTurn\(mustTurn\)\t\(2,2\)->\(4,4\)\tfalse\t900000\t15000\t-\t899000\t14960/);

        // ── A variant with no matching solve-result row degrades gracefully, not a crash ────────────
        const partialManifestPath = path.join(tempDir, 'partial-manifest.json');
        const partialManifest = syntheticManifest();
        partialManifest.variants.push({
            variantId: 'F00TEST-03',
            mutationManifest: { objectType: 'geese', operation: 'move', from: { x: 1, y: 1 }, to: { x: 2, y: 2 } },
        });
        await writeFile(partialManifestPath, JSON.stringify(partialManifest));
        const partialResult = await runAnalyze([
            `--manifest=${partialManifestPath}`, `--solve-result=${solveResultPath}`, `--parent-solve-result=${parentSolveResultPath}`,
        ]);
        assert.match(partialResult.stdout, /F00TEST-03\tgeese\t\(1,1\)->\(2,2\)\t\?\t-\t-\t-\t-\t-/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
