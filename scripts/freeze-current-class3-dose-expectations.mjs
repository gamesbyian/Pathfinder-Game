#!/usr/bin/env node
/**
 * Freeze the current Class-3 exact-rescuer expectation map from the canonical committed evidence
 * boundary. This performs no solver search: it rebuilds the residual atlas from committed production
 * outcome/lifecycle/census/corpus evidence, then reduces Class-3 rows to exact rescuer identities.
 *
 * Usage:
 *   node scripts/freeze-current-class3-dose-expectations.mjs [--out=<file>]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const index = arg.indexOf('=');
    return [arg.slice(2, index), arg.slice(index + 1)];
}));
const out = args.get('out')
    ?? 'reports/stress/failure-evidence/class3-dose-expectations-2026-09-19.json';

const BASELINE = 'reports/stress/capability-runs/35066677597/per-level-corpus2.json';
const LIFECYCLE = 'reports/stress/capability-runs/35066677597/lifecycle-failure-map-corpus2.json';
const CENSUS = 'reports/stress/technique-census/33717910218/combined-cells.json';
const HINTS = 'data/stress/hints-random';

function materializeTracked(sourcePath, tempDir) {
    if (fs.existsSync(sourcePath)) return sourcePath;
    const target = path.join(tempDir, path.basename(sourcePath));
    const bytes = execFileSync('git', ['show', `HEAD:${sourcePath}`], {
        cwd: process.cwd(),
        encoding: null,
        maxBuffer: 128 * 1024 * 1024,
    });
    fs.writeFileSync(target, bytes);
    return target;
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'class3-dose-freeze-'));
try {
    // CI deliberately sparse-checks out large report JSON. Recover the exact tracked blobs from
    // HEAD rather than widening ordinary checkout or treating absence from the working tree as
    // absence from committed evidence.
    const baselineInput = materializeTracked(BASELINE, temp);
    const lifecycleInput = materializeTracked(LIFECYCLE, temp);
    const censusInput = materializeTracked(CENSUS, temp);
    const atlas = path.join(temp, 'atlas.json');
    execFileSync('node', [
        'scripts/run-bundled.mjs',
        'scripts/stress/analyze-post-1029-residual-atlas.mjs',
        '--',
        '--baseline=' + baselineInput,
        '--lifecycle=' + lifecycleInput,
        '--census=' + censusInput,
        '--hints-dir=' + HINTS,
        '--out=' + atlas,
    ], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

    const raw = execFileSync('node', [
        'scripts/build-class3-dose-expectations.mjs',
        '--atlas=' + atlas,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const result = JSON.parse(raw);
    if (result.sourceBoundary.currentResidualLevels !== 531) {
        throw new Error(`current residual boundary drifted: expected 531, got ${result.sourceBoundary.currentResidualLevels}`);
    }
    if (result.expectedParentCount !== 23) {
        throw new Error(`Class-3 population drifted: expected 23, got ${result.expectedParentCount}`);
    }

    result.sourceAtlas = 'derived from canonical committed boundary by scripts/freeze-current-class3-dose-expectations.mjs';
    result.sourceBoundary = {
        ...result.sourceBoundary,
        baseline: BASELINE,
        lifecycle: LIFECYCLE,
        census: CENSUS,
        hintsDir: HINTS,
    };
    result.freeze = {
        date: '2026-09-19',
        command: 'npm run research:freeze-current-class3-dose-expectations',
        solverSearchPerformed: false,
    };

    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(path.resolve(out), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({
        out,
        currentResidualLevels: result.sourceBoundary.currentResidualLevels,
        expectedParentCount: result.expectedParentCount,
        rescuerCount: result.parents.reduce((sum, parent) => sum + parent.rescuers.length, 0),
    }, null, 2));
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
