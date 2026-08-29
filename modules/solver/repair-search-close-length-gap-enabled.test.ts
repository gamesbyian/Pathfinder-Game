import assert from 'node:assert/strict';
import { test } from 'vitest';

import { SCORING_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { repairSearchFromGate } from './repair-search.js';
import {
    replayAndValidate,
    r02560Level,
    R02560_NODE_BUDGET,
    R02560_GATE_KEY,
} from './repair-search-test-support.test.js';

const deepTest =
  process.env.SOLVER_DEEP_TESTS === '0' || process.env.SOLVER_R02560_PROOF_SKIP === '1'
    ? test.skip
    : test;

deepTest('closeLengthGap enabled rescues R02560 within the shared regression node budget', async () => {
    const level = r02560Level();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const out: { nodesExpanded?: number } = {};
    const path = await repairSearchFromGate(
        R02560_GATE_KEY, level, prep, SCORING_PROFILES.repair,
        15000, Date.now(), null, undefined, false, R02560_NODE_BUDGET, out,
    );
    assert.ok(path, 'expected production-default closeLengthGap to solve within the shared node budget');
    assert.equal(replayAndValidate(path as number[], level, prep), true);
}, 20000);
