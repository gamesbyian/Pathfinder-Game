import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';
import { defaultConfig } from './ablation-config.js';
import {
    buildCanonicalSolverRequestProjection,
    canonicalSolverRequestString,
    SOLVER_REQUEST_SEMANTIC_FIELDS,
} from './solver-request-projection.js';

const inventoryPath = fileURLToPath(new URL('../../docs/solver-request-semantics-inventory.json', import.meta.url));

describe('canonical solver request projection', () => {
    test('field ownership exactly matches the machine-readable solver-semantic inventory', () => {
        const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        const expected = inventory.commonSolveOpts
            .filter((row: any) => row.identityLayer === 'solver-semantic')
            .map((row: any) => row.field)
            .sort();
        assert.deepEqual([...SOLVER_REQUEST_SEMANTIC_FIELDS].sort(), expected);
    });

    test('omitted syntax and explicit production defaults project identically', () => {
        const omitted = canonicalSolverRequestString({});
        const explicit = canonicalSolverRequestString({
            timeBudgetMs: 30000,
            baseWorkBudget: 100_500_000,
            strictTotalWorkBudget: false,
            schedulerMode: 'production',
            ablation: defaultConfig(),
            disableExtraBudgetPasses: false,
        });
        assert.equal(explicit, omitted);
    });

    test('observation and level/history-specific dimensions do not contaminate run-wide request identity', () => {
        const baseline = canonicalSolverRequestString({});
        const withExcludedDimensions = canonicalSolverRequestString({
            attemptBudgetTelemetry: true,
            lifecycleTelemetry: true,
            beamFlowCounters: {},
            pruneDiagnostics: {},
            forcedFirstStepKey: 123,
            forcedPortalExitKey: { from: 4, to: 5 },
            primeAttempt: { gateKey: 10, configKey: 'dfs|score=default|bias=none', nodeBudget: 99, seedSalt: 2 },
        } as any);
        assert.equal(withExcludedDimensions, baseline);
    });

    test('sparse ablation preserves every unrelated production default while changing the requested flag', () => {
        const baseline = buildCanonicalSolverRequestProjection({});
        const changed = buildCanonicalSolverRequestProjection({
            ablation: { SCORE_GOAL_ATTRACTION: false },
        });
        assert.equal(changed.ablation.flags.SCORE_GOAL_ATTRACTION, false);
        assert.equal(
            changed.ablation.flags.PRUNE_CONNECTIVITY,
            baseline.ablation.flags.PRUNE_CONNECTIVITY,
        );
        assert.notEqual(canonicalSolverRequestString(changed as any), canonicalSolverRequestString({}));
    });

    test('disableExtraBudgetPasses resolves the additive cascade but does not zero independent node-reserve policy', () => {
        const baseline = buildCanonicalSolverRequestProjection({});
        const disabled = buildCanonicalSolverRequestProjection({ disableExtraBudgetPasses: true });
        assert.equal(disabled.stagePolicy.repairAdditiveBudgetMultiplier, 0);
        assert.equal(disabled.stagePolicy.goalAttractionDisabledRetryBudgetFraction, 0);
        assert.equal(disabled.stagePolicy.coarseStateNearTieRetentionRetryBudgetFraction, 0);
        assert.equal(disabled.stagePolicy.admissibleOrderNonDefaultRetryBudgetFraction, 0);
        assert.equal(disabled.stagePolicy.connectivityAxisExhaustedRetryBudgetFraction, 0);
        assert.equal(disabled.stagePolicy.repairElitePrefixDfsRetryBudgetFraction, 0);
        assert.equal(disabled.stagePolicy.mcNeighborBudgetRetryBudgetFraction, 0);
        assert.equal(disabled.stagePolicy.repairLateProbeNodeBudget, 0);
        assert.equal(disabled.stagePolicy.admissibleOrderBudgetFraction, 0);

        assert.equal(
            disabled.stagePolicy.admissibleOrderNodeReserveFraction,
            baseline.stagePolicy.admissibleOrderNodeReserveFraction,
        );
        assert.equal(
            disabled.stagePolicy.mainSearchLateReserveFraction,
            baseline.stagePolicy.mainSearchLateReserveFraction,
        );
    });

    test('an explicit per-tier additive override wins over disableExtraBudgetPasses', () => {
        const projected = buildCanonicalSolverRequestProjection({
            disableExtraBudgetPasses: true,
            repairAdditiveBudgetMultiplierOverride: 2.5,
            repairLateProbeNodeBudgetOverride: 12345,
        });
        assert.equal(projected.stagePolicy.repairAdditiveBudgetMultiplier, 2.5);
        assert.equal(projected.stagePolicy.repairLateProbeNodeBudget, 12345);
    });

    test('must-cross reserve widening is represented in the run-wide requested config-count default', () => {
        const baseline = buildCanonicalSolverRequestProjection({});
        const widened = buildCanonicalSolverRequestProjection({
            ablation: { STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE: true },
        });
        assert.equal(widened.stagePolicy.mainSearchLateReserveConfigCount,
            baseline.stagePolicy.mainSearchLateReserveConfigCount + 1);
    });

    test('static portfolio projection uses canonical attempt identities and sorted cap keys', () => {
        const projected = buildCanonicalSolverRequestProjection({
            schedulerMode: 'static-portfolio',
            staticPortfolio: {
                techniqueConfigs: [
                    {
                        scoringProfileId: 'objectiveFirst',
                        orderingBias: null,
                        beamWidth: 5000,
                        mechanicBucketRetention: false,
                    } as any,
                ],
                workBudget: 123456,
                perTechniqueWorkCapByKey: { z: 9, a: 1 },
            },
        });
        assert.equal(projected.scheduler.mode, 'static-portfolio');
        assert.deepEqual(
            Object.keys(projected.scheduler.staticPortfolio!.perTechniqueWorkCapByKey),
            ['a', 'z'],
        );
        assert.equal(projected.scheduler.staticPortfolio!.attemptBudgetMs, 600000);
        assert.match(projected.scheduler.staticPortfolio!.techniqueConfigs[0], /^beam\|/u);
    });

    test('legacy latency sets are projected as deterministic sorted arrays', () => {
        const projected = buildCanonicalSolverRequestProjection({
            schedulerMode: 'legacy-latency-portfolio-experiment',
        });
        const legacy = projected.scheduler.legacyLatencyPortfolioExperiment!;
        assert.deepEqual([...legacy.pass2Configs].sort(), legacy.pass2Configs);
        assert.deepEqual([...legacy.pass3Configs].sort(), legacy.pass3Configs);
    });

    test('unsupported scheduler syntax and missing static portfolio fail closed', () => {
        assert.throws(
            () => buildCanonicalSolverRequestProjection({ schedulerMode: 'future-mode' as any }),
            /unsupported schedulerMode/,
        );
        assert.throws(
            () => buildCanonicalSolverRequestProjection({ schedulerMode: 'static-portfolio' }),
            /requires staticPortfolio/,
        );
    });
});
