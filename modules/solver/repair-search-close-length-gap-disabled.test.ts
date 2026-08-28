import assert from 'node:assert/strict';
import { test } from 'vitest';

import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { repairSearchFromGate } from './repair-search.js';
import { withFeatureDisabled } from './ablation-config.js';
import {
    r02560Level,
    R02560_NODE_BUDGET,
    R02560_GATE_KEY,
} from './repair-search-test-support.test.js';

const deepTest =
  process.env.SOLVER_DEEP_TESTS === '0' || process.env.SOLVER_R02560_PROOF_SKIP === '1'
    ? test.skip
    : test;

deepTest('closeLengthGap disabled cannot rescue R02560 within the shared regression node budget', async () => {
    const level = r02560Level();
    const prep = prepLevel(level);
    prep._cfg = withFeatureDisabled('STRATEGY_REPAIR_LENGTH_GAP_CLOSE');
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(
        R02560_GATE_KEY, level, prep, POLICY_PROFILES.repair,
        15000, Date.now(), null, undefined, false, R02560_NODE_BUDGET,
    );
    assert.equal(
        path,
        null,
        'expected the shared node budget to remain insufficient when only closeLengthGap is disabled',
    );
}, 20000);
