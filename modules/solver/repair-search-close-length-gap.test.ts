import assert from 'node:assert/strict';
import { test } from 'vitest';

import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { repairSearchFromGate } from './repair-search.js';
import { withFeatureDisabled } from './ablation-config.js';
import {
    replayAndValidate,
    r02560Level,
    R02560_NODE_BUDGET,
    R02560_GATE_KEY,
} from './repair-search-test-support.test.js';

const deepTest = process.env.SOLVER_DEEP_TESTS === '0' ? test.skip : test;

// Real regression rescue from reports/2026-07-17-length-gap-close-operator.md.
// The enabled and disabled searches receive the same deterministic node budget; only the
// production-default closeLengthGap feature differs.
deepTest('closeLengthGap (default-enabled) rescues R02560 within a node budget the disabled path cannot', async () => {
    const level = r02560Level();

    const prepEnabled = prepLevel(level);
    prepEnabled._metrics = { nodesExpanded: 0 };
    const outEnabled: { nodesExpanded?: number } = {};
    const pathEnabled = await repairSearchFromGate(
        R02560_GATE_KEY, level, prepEnabled, POLICY_PROFILES.repair,
        15000, Date.now(), null, undefined, false, R02560_NODE_BUDGET, outEnabled,
    );
    assert.ok(pathEnabled, 'expected the default-enabled closeLengthGap path to solve within the node budget');
    assert.equal(replayAndValidate(pathEnabled as number[], level, prepEnabled), true);

    const prepDisabled = prepLevel(level);
    prepDisabled._cfg = withFeatureDisabled('STRATEGY_REPAIR_LENGTH_GAP_CLOSE');
    prepDisabled._metrics = { nodesExpanded: 0 };
    const pathDisabled = await repairSearchFromGate(
        R02560_GATE_KEY, level, prepDisabled, POLICY_PROFILES.repair,
        15000, Date.now(), null, undefined, false, R02560_NODE_BUDGET,
    );
    assert.equal(
        pathDisabled,
        null,
        'expected the same node budget to be insufficient with every other flag held at default and only closeLengthGap disabled',
    );
}, 20000);
