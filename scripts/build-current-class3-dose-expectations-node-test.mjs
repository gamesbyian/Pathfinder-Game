import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'class3-current-freeze-test-'));
try {
    const out = path.join(temp, 'expectations.json');
    execFileSync('node', [
        'scripts/freeze-current-class3-dose-expectations.mjs',
        '--out=' + out,
    ], { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

    const result = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.equal(result.sourceBoundary.currentResidualLevels, 531);
    assert.equal(result.expectedParentCount, 23);
    assert.equal(result.parents.length, 23);
    assert.equal(result.freeze.solverSearchPerformed, false);
    assert.ok(result.parents.every(parent => parent.rescuers.length > 0));
    assert.ok(result.parents.every(parent => parent.rescuers.every(rescuer => typeof rescuer.actionKey === 'string' && rescuer.actionKey.length > 0)));

    // Deliberately print the small derived artifact so a branch/CI-only recovery session can freeze
    // it without needing direct access to the oversized census JSON.
    console.log('CLASS3_EXPECTATION_MAP_BEGIN');
    console.log(JSON.stringify(result));
    console.log('CLASS3_EXPECTATION_MAP_END');
    console.log('current Class-3 expectation-map derivation passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
