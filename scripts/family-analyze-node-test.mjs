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

// Legacy compact winningConfig inputs below are intentional dual-read fixtures.
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
        assert.match(noParent.stdout, /2\/2 siblings generated \(mode: local-mutant\), 3 movable instance\(s\)/);
        assert.doesNotMatch(noParent.stdout, /Parent solve:/, 'no parent-solve line without --parent-solve-result');
        assert.match(noParent.stdout, /F00TEST-01\tblocks\t\(5,1\)->\(5,3\)\ttrue\t500\t20\tdfs\|score=perimeterSweep\|bias=cornerHarvest\t-\t-/);
        assert.match(noParent.stdout, /F00TEST-02\tmustTurn\(mustTurn\)\t\(2,2\)->\(4,4\)\tfalse\t900000\t15000\t-\t-\t-/);

        // ── With a parent solve result: exact hand-computed deltas ──────────────────────────────────
        const withParent = await runAnalyze([
            `--manifest=${manifestPath}`, `--solve-result=${solveResultPath}`, `--parent-solve-result=${parentSolveResultPath}`,
        ]);
        assert.match(withParent.stdout, /Parent solve:\s+ok=true nodes=1000 ms=40 config=dfs\|score=perimeterSweep\|bias=cornerHarvest/);
        // F00TEST-01: 500-1000 = -500 nodes, 20-40 = -20 ms.
        assert.match(withParent.stdout, /F00TEST-01\tblocks\t\(5,1\)->\(5,3\)\ttrue\t500\t20\tdfs\|score=perimeterSweep\|bias=cornerHarvest\t-500\t-20/);
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

        // ── density-sweep mutationManifest shape: {operation:'add'|'remove', count, ...}, no
        // from/to at all — this crashed the original implementation (assumed every mutation was a
        // {from,to} move). Also exercises dual-read of legacy navDensity fields while displaying canonical requiredPathCoverageRatio. ─────────
        const densityManifestPath = path.join(tempDir, 'density-manifest.json');
        const densityManifest = {
            familyId: 'family-TEST-w0', parentLevelId: 'TEST', selectedWitnessSource: 'hint[0]',
            selectedWitnessLength: 20, selectedWitnessIntersectionCount: 1, familyMode: 'density-sweep',
            parentNavDensity: 0.75, acceptedCount: 2, requestedCount: 2, movableInstanceCount: 5,
            variants: [
                {
                    variantId: 'F00TEST-04', navDensity: 0.70,
                    mutationManifest: { objectType: 'blocks', operation: 'remove', count: 2, resultingBlockCount: 4 },
                },
                {
                    variantId: 'F00TEST-05', navDensity: 0.83,
                    mutationManifest: { objectType: 'blocks', operation: 'add', count: 3, resultingBlockCount: 9 },
                },
            ],
        };
        await writeFile(densityManifestPath, JSON.stringify(densityManifest));
        const densityResult = await runAnalyze([`--manifest=${densityManifestPath}`, `--solve-result=${solveResultPath}`]);
        assert.match(densityResult.stdout, /parent requiredPathCoverageRatio 0\.750/);
        assert.match(densityResult.stdout, /mode: density-sweep/);
        assert.match(densityResult.stdout, /variant\tobjectType\tmove\trequiredPathCoverageRatio\tok\t/, 'canonical coverage column appears when legacy manifest variants carry navDensity');
        assert.match(densityResult.stdout, /F00TEST-04\tblocks\t-2 \(now 4\)\t0\.700\t\?\t-\t-\t-\t-\t-/);
        assert.match(densityResult.stdout, /F00TEST-05\tblocks\t\+3 \(now 9\)\t0\.830\t\?\t-\t-\t-\t-\t-/);

        // ── every OTHER family-generate.mjs mode's mutationManifest shape — symmetry/swap/
        // group-reshuffle/constrained-shuffle/re-embed — must each get a real description, not
        // silently fall through to the raw-JSON default (the same class of gap density-sweep hit). ──
        const otherModesManifest = {
            familyId: 'family-TEST-w0', parentLevelId: 'TEST', selectedWitnessSource: 'hint[0]',
            selectedWitnessLength: 20, selectedWitnessIntersectionCount: 1, familyMode: 'symmetry',
            acceptedCount: 5, requestedCount: 5, movableInstanceCount: 5,
            variants: [
                { variantId: 'F00TEST-06', mutationManifest: { objectType: 'whole-level', operation: 'transform', variant: 4, kind: 'reflection' } },
                { variantId: 'F00TEST-07', mutationManifest: { objectType: 'swap', operation: 'swap', a: { kind: 'blocks', from: { x: 1, y: 1 } }, b: { kind: 'geese', from: { x: 2, y: 2 } } } },
                { variantId: 'F00TEST-08', mutationManifest: { objectType: 'geese', operation: 'group-reshuffle', count: 4 } },
                { variantId: 'F00TEST-09', mutationManifest: { objectType: 'all-movable-types', operation: 'constrained-shuffle', order: ['mustCross', 'blocks'] } },
                { variantId: 'F00TEST-10', mutationManifest: { objectType: 'whole-level', operation: 're-embed', fromGrid: { w: 6, h: 6 }, toGrid: { w: 10, h: 10 }, offset: { x: 2, y: 1 } } },
            ],
        };
        await writeFile(path.join(tempDir, 'other-modes-manifest.json'), JSON.stringify(otherModesManifest));
        const otherModesResult = await runAnalyze([`--manifest=${path.join(tempDir, 'other-modes-manifest.json')}`, `--solve-result=${solveResultPath}`]);
        assert.match(otherModesResult.stdout, /F00TEST-06\twhole-level\tvariant 4 \(reflection\)\t\?/);
        assert.match(otherModesResult.stdout, /F00TEST-07\tswap\tblocks\(1,1\)<->geese\(2,2\)\t\?/);
        assert.match(otherModesResult.stdout, /F00TEST-08\tgeese\treshuffled all 4 instance\(s\)\t\?/);
        assert.match(otherModesResult.stdout, /F00TEST-09\tall-movable-types\tfull reshuffle \(mustCross,blocks\)\t\?/);
        assert.match(otherModesResult.stdout, /F00TEST-10\twhole-level\t6x6->10x10 @ offset\(2,1\)\t\?/);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
