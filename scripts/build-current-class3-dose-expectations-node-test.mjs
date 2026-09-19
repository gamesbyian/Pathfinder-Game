import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'class3-current-freeze-'));
try {
    const atlas = path.join(temp, 'atlas.json');
    execFileSync('node', [
        'scripts/run-bundled.mjs',
        'scripts/stress/analyze-post-1029-residual-atlas.mjs',
        '--',
        '--baseline=reports/stress/capability-runs/35066677597/per-level-corpus2.json',
        '--lifecycle=reports/stress/capability-runs/35066677597/lifecycle-failure-map-corpus2.json',
        '--census=reports/stress/technique-census/33717910218/combined-cells.json',
        '--hints-dir=data/stress/hints-random',
        '--out=' + atlas,
    ], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

    const raw = execFileSync('node', [
        'scripts/build-class3-dose-expectations.mjs',
        '--atlas=' + atlas,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    const result = JSON.parse(raw);

    assert.equal(result.sourceBoundary.currentResidualLevels, 531);
    assert.equal(result.expectedParentCount, 23);
    assert.equal(result.parents.length, 23);
    assert.ok(result.parents.every(parent => parent.rescuers.length > 0));
    assert.ok(result.parents.every(parent => parent.rescuers.every(rescuer => typeof rescuer.actionKey === 'string' && rescuer.actionKey.length > 0)));

    // Deliberately print the small derived artifact so a branch/CI-only recovery session can freeze
    // it without rerunning solver search. This is evidence reduction over committed assets only.
    console.log('CLASS3_EXPECTATION_MAP_BEGIN');
    console.log(JSON.stringify(result));
    console.log('CLASS3_EXPECTATION_MAP_END');
    console.log('current Class-3 expectation-map derivation passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
