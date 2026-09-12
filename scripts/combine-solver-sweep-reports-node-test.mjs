#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/combine-solver-sweep-reports.mjs: combines N
 * portfolio-solve-sweep.mjs report files ({summary, levels} shape) into ONE
 * scripts/stress/benchmark.mjs-shaped flat report. Uses hand-built synthetic fixtures so budgetMs
 * mismatch/duplicate-id handling is exercised deterministically.
 */
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { validateSweepIntegrity, diffPopulation } from './validate-solver-sweep-integrity.mjs';
import { analyzeOpportunity, opportunitySampleSizeForAtLeastOne } from './experiment-opportunity-audit.mjs';
import { simulateMakespan, packByMakespan, classifyTelemetry } from './plan-highbudget-shards.mjs';
import { calibrateMultipliers } from './backtest-shard-runtime-policy.mjs';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(args) {
    return execFile('node', ['scripts/combine-solver-sweep-reports.mjs', ...args], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
}

function runPlanner(args) {
    return execFile('node', ['scripts/plan-highbudget-shards.mjs', ...args], { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 });
}

function batchReport(overrides = {}) {
    return {
        summary: { commit: 'abc123', corpus: 'data/stress/stress-levels-random.json', schedulerMode: 'legacy', budgetMs: 8000, ...overrides.summary },
        levels: overrides.levels ?? [],
    };
}

async function main() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'portfolio-sweep-merge-'));
    try {
        const batch1 = path.join(tempDir, 'batch-01.json');
        const batch2 = path.join(tempDir, 'batch-02.json');
        const outFile = path.join(tempDir, 'combined.json');

        await writeFile(batch1, JSON.stringify(batchReport({
            levels: [{ level: 1, id: 'R00001', ok: true, status: 'success', totalMs: 100, elapsedMs: 100, attempts: [], attemptCount: 0, failedStrategies: [] }],
        })));
        await writeFile(batch2, JSON.stringify(batchReport({
            levels: [{ level: 2, id: 'R00002', ok: false, status: 'timeout', totalMs: 8000, elapsedMs: 8000, attempts: [], attemptCount: 0, failedStrategies: [] }],
        })));

        await run([`--in=${batch1},${batch2}`, `--out=${outFile}`]);
        const combined = JSON.parse(await readFile(outFile, 'utf8'));
        assert.equal(combined.budgetMs, 8000, 'budgetMs flattened to top level');
        assert.equal(combined.corpus, 'data/stress/stress-levels-random.json');
        assert.equal(combined.levels.length, 2);
        assert.equal(combined.solved, 1);
        assert.equal(combined.outcomes.deadlineTruncated, 1);
        assert.equal(combined.outcomes.harnessError, 0);
        assert.equal(combined.populationIntegrity.complete, false, 'observed rows alone cannot establish intended-population completeness');
        assert.equal(combined.populationIntegrity.expectedCount, null);
        assert.equal(combined.total, null, 'unknown intended population must not use observed rows as the denominator');
        console.log('  ✓ merges two batches into one flat, budgetMs-bearing report');

        const expectedFile = path.join(tempDir, 'expected.txt');
        const exactOut = path.join(tempDir, 'combined-exact.json');
        await writeFile(expectedFile, 'R00002\nR00001\n');
        await run([`--in=${batch1},${batch2}`, `--expected-ids=${expectedFile}`, `--out=${exactOut}`]);
        const exactCombined = JSON.parse(await readFile(exactOut, 'utf8'));
        assert.equal(exactCombined.populationIntegrity.complete, true);
        assert.equal(exactCombined.expectedCount, 2);
        assert.match(exactCombined.population.identityHash, /^sha256:[0-9a-f]{64}$/);
        console.log('  ✓ intended ID input makes exact completeness and denominator explicit');

        const exact = validateSweepIntegrity({ expectedIds: ['R00001', 'R00002'], levels: combined.levels });
        assert.equal(exact.complete, true);
        assert.throws(() => validateSweepIntegrity({ expectedIds: ['R00001', 'R00002', 'R00003'], levels: combined.levels }), /missing results: R00003/);
        assert.throws(() => validateSweepIntegrity({ expectedIds: ['R00001'], levels: combined.levels }), /unexpected results: R00002/);
        const partial = validateSweepIntegrity({ expectedIds: ['R00001', 'R00002', 'R00003'], levels: combined.levels, allowIncomplete: true });
        assert.equal(partial.complete, false);
        assert.deepEqual(partial.missingIds, ['R00003']);
        console.log('  ✓ exact-population validator rejects missing and unexpected result ids');

        const participatingLevels = [
            { id: 'R00001', ok: false, attempts: [{ stageId: 'late-retry', workSpent: 12, nodesExpanded: 4 }] },
            { id: 'R00002', ok: false, attempts: [{ stageId: 'late-retry', workSpent: 0, nodesExpanded: 0 }] },
        ];
        const participation = validateSweepIntegrity({
            expectedIds: ['R00001', 'R00002'], levels: participatingLevels,
            requiredStage: 'late-retry', minParticipatingLevels: 1,
        });
        assert.equal(participation.participation.participatingLevels, 1);
        assert.equal(participation.participation.participationRate, 0.5);
        assert.throws(() => validateSweepIntegrity({
            expectedIds: ['R00001', 'R00002'], levels: participatingLevels,
            requiredStage: 'late-retry', minParticipatingLevels: 2,
        }), /below required minimum 2/);
        console.log('  ✓ target-stage gate distinguishes nominal zero-work reach from real participation');

        // minParticipatingLevels alone is an ABSOLUTE floor -- trivially satisfied on a large
        // population even at a near-zero rate. minParticipationRate closes that gap.
        assert.throws(() => validateSweepIntegrity({
            expectedIds: ['R00001', 'R00002'], levels: participatingLevels,
            requiredStage: 'late-retry', minParticipatingLevels: 1, minParticipationRate: 0.75,
        }), /below required minimum rate 75\.00%/);
        const rateOk = validateSweepIntegrity({
            expectedIds: ['R00001', 'R00002'], levels: participatingLevels,
            requiredStage: 'late-retry', minParticipatingLevels: 1, minParticipationRate: 0.5,
        });
        assert.equal(rateOk.participation.participatingLevels, 1);
        console.log('  ✓ rate-based participation floor catches a population too large for the absolute floor to matter');

        const opportunityRows = Array.from({ length: 100 }, (_, i) => ({
            id: `R${String(i + 1).padStart(5, '0')}`,
            ok: i < 90,
            attempts: i >= 90 && i < 95 ? [{ stageId: 'late-retry', workSpent: 10, nodesExpanded: 2 }] : [],
        }));
        const opportunity = analyzeOpportunity({
            levels: opportunityRows,
            stageId: 'late-retry',
            mode: 'rescue',
            targetOpportunities: 10,
            proposedTotal: 1000,
            conditionalEventRate: 0.1,
            detectionProbability: 0.8,
        });
        assert.equal(opportunity.controlFailed, 10);
        assert.equal(opportunity.stageParticipated, 5);
        assert.equal(opportunity.opportunities, 5);
        assert.equal(opportunity.opportunityRate, 0.05);
        assert.equal(opportunity.sizing.pointTotal, 200);
        assert.ok(opportunity.warnings.some(w => w.startsWith('OVERPROVISIONED:')));
        assert.equal(opportunitySampleSizeForAtLeastOne(0.1, 0.8), 16);
        console.log('  ✓ opportunity audit prices sample size from control-failure + real-stage exposure rather than raw N');

        const noOpportunity = analyzeOpportunity({
            levels: opportunityRows.map(row => ({ ...row, attempts: [] })),
            stageId: 'late-retry',
            mode: 'rescue',
        });
        assert.equal(noOpportunity.opportunities, 0);
        assert.ok(noOpportunity.warnings.some(w => w.startsWith('ZERO_OPPORTUNITY:')));
        console.log('  ✓ opportunity audit identifies populations structurally unable to demonstrate the treatment');

        const corpus2 = JSON.parse(await readFile(path.join(ROOT, 'data/stress/stress-levels-random.json'), 'utf8'));
        const plannerIds = corpus2.levels.slice(0, 2).map(level => level.id);
        assert.equal(plannerIds.length, 2, 'planner fixture needs two corpus2 ids');
        const plannerIdsFile = path.join(tempDir, 'planner-ids.txt');
        const plannerTelemetry = path.join(tempDir, 'runtime-telemetry.json');
        const plannerOut = path.join(tempDir, 'planner.json');
        await writeFile(plannerIdsFile, plannerIds.join('\n') + '\n');
        await writeFile(plannerTelemetry, JSON.stringify({
            levels: {
                [plannerIds[0]]: { emaMsPerGiganode: 100000, samples: 2 },
                [plannerIds[1]]: { emaMsPerGiganode: 300000, samples: 2 },
            },
        }));
        await runPlanner([
            `--ids-file=${plannerIdsFile}`,
            '--corpus2=data/stress/stress-levels-random.json',
            `--telemetry=${plannerTelemetry}`,
            '--node-budget=50000000',
            '--workers=4',
            '--target-wall-minutes=20',
            '--seed=node-test',
            `--out=${plannerOut}`,
        ]);
        const planned = JSON.parse(await readFile(plannerOut, 'utf8'));
        assert.equal(planned.planning.telemetryPath, plannerTelemetry);
        assert.equal(planned.planning.telemetryKnownIds, 2);
        assert.equal(planned.planning.telemetryRequestedIds, 2);
        assert.equal(planned.shard.flatMap(shard => shard.ids).length, 2);
        const plannerSource = await readFile(path.join(ROOT, 'scripts/plan-highbudget-shards.mjs'), 'utf8');
        assert.match(plannerSource, /DEFAULT_TELEMETRY_PATH = 'logs\/solver-stress-refresh\/corpus2-runtime-telemetry\.json'/u);
        assert.match(plannerSource, /existsSync\(path\.resolve\(root, DEFAULT_TELEMETRY_PATH\)\)/u);
        console.log('  ✓ shard planner uses supplied runtime telemetry and retains standing-telemetry autodiscovery');

        // Every predicted wall time above is tiny (a few seconds), so the timeout floor dominates
        // both shards' timeoutMinutes regardless of --target-wall-minutes -- exactly the case a
        // caller who already knows telemetry is underestimating a population's real cost (this
        // recurred twice in one day, 2026-09-10, on the connectivity-volume-* research line) needs
        // to raise without fabricating fake telemetry or forcing levels to pack together.
        assert.ok(planned.shard.every(s => s.timeoutMinutes === 30), 'default floor is still 30 when --min-timeout-minutes is omitted');
        const plannerOutRaisedFloor = path.join(tempDir, 'planner-raised-floor.json');
        await runPlanner([
            `--ids-file=${plannerIdsFile}`,
            '--corpus2=data/stress/stress-levels-random.json',
            `--telemetry=${plannerTelemetry}`,
            '--node-budget=50000000',
            '--workers=4',
            '--target-wall-minutes=20',
            '--min-timeout-minutes=90',
            '--seed=node-test',
            `--out=${plannerOutRaisedFloor}`,
        ]);
        const plannedRaisedFloor = JSON.parse(await readFile(plannerOutRaisedFloor, 'utf8'));
        assert.ok(plannedRaisedFloor.shard.every(s => s.timeoutMinutes === 90), '--min-timeout-minutes raises the floor for every shard');
        console.log('  ✓ --min-timeout-minutes raises the per-shard timeout floor above telemetry-derived predictions');

        // --fixed-group-size bypasses telemetry-driven packing entirely: groups of exactly N ids,
        // regardless of what the (already-known-wrong) telemetry predicts for any of them.
        const fixedGroupIds = corpus2.levels.slice(0, 9).map(level => level.id);
        assert.equal(fixedGroupIds.length, 9, 'fixed-group fixture needs nine corpus2 ids');
        const fixedGroupIdsFile = path.join(tempDir, 'fixed-group-ids.txt');
        const fixedGroupOut = path.join(tempDir, 'fixed-group-plan.json');
        await writeFile(fixedGroupIdsFile, fixedGroupIds.join('\n') + '\n');
        await runPlanner([
            `--ids-file=${fixedGroupIdsFile}`,
            '--corpus2=data/stress/stress-levels-random.json',
            '--node-budget=50000000',
            '--workers=4',
            '--fixed-group-size=4',
            '--min-timeout-minutes=90',
            '--seed=node-test',
            `--out=${fixedGroupOut}`,
        ]);
        const fixedGroupPlanned = JSON.parse(await readFile(fixedGroupOut, 'utf8'));
        assert.equal(fixedGroupPlanned.shard.length, 3, '9 ids at group size 4 makes 3 shards (4, 4, 1)');
        assert.deepEqual(fixedGroupPlanned.shard.map(s => s.ids.length).sort(), [1, 4, 4]);
        assert.deepEqual(fixedGroupPlanned.shard.flatMap(s => s.ids).sort(), fixedGroupIds.slice().sort(), 'every id appears in exactly one shard');
        assert.ok(fixedGroupPlanned.shard.every(s => s.timeoutMinutes === 90), 'fixed-group shards use --min-timeout-minutes directly, not a telemetry-derived estimate');
        console.log('  ✓ --fixed-group-size groups ids into fixed-size shards independent of telemetry');

        const sweepSource = await readFile(path.join(ROOT, 'scripts/level-blind-capability-sweep.mjs'), 'utf8');
        assert.match(sweepSource, /solveOpts\.admissibleOrderNonDefaultRetryBudgetFractionOverride = admissibleOrderNonDefaultRetryBudgetFraction/u);
        assert.match(sweepSource, /admissibleOrderNonDefaultRetryBudgetFraction: Number\.isFinite\(admissibleOrderNonDefaultRetryBudgetFraction\)/u);
        console.log('  ✓ capability sweep persists the admissible-order retry treatment it applies');

        const config1 = path.join(tempDir, 'config-01.json');
        const config2 = path.join(tempDir, 'config-02.json');
        const configOut = path.join(tempDir, 'combined-config.json');
        const executionSummary = {
            levelBlind: true,
            historicalInputs: [],
            workers: 4,
            enableFlags: ['FLAG_B', 'FLAG_A'],
            disableFlags: [],
            strictTotalWorkBudget: true,
            admissibleOrderNonDefaultRetryBudgetFraction: 0.18,
            repairLateProbeNodeBudget: null,
        };
        await writeFile(config1, JSON.stringify(batchReport({
            summary: executionSummary,
            levels: [{ level: 11, id: 'R00111', ok: false }],
        })));
        await writeFile(config2, JSON.stringify(batchReport({
            summary: { ...executionSummary, enableFlags: ['FLAG_A', 'FLAG_B'] },
            levels: [{ level: 12, id: 'R00112', ok: false }],
        })));
        await run([`--in=${config1},${config2}`, `--out=${configOut}`]);
        const configCombined = JSON.parse(await readFile(configOut, 'utf8'));
        assert.deepEqual(configCombined.executionConfig.enableFlags, ['FLAG_A', 'FLAG_B']);
        assert.equal(configCombined.executionConfig.workers, 4);
        assert.equal(configCombined.executionConfig.admissibleOrderNonDefaultRetryBudgetFraction, 0.18);
        assert.equal(configCombined.executionConfig.strictTotalWorkBudget, true);
        console.log('  ✓ combined artifact preserves canonical resolved treatment configuration');

        const configMismatch = path.join(tempDir, 'config-mismatch.json');
        await writeFile(configMismatch, JSON.stringify(batchReport({
            summary: { ...executionSummary, admissibleOrderNonDefaultRetryBudgetFraction: 0.25 },
            levels: [{ level: 13, id: 'R00113', ok: false }],
        })));
        await assert.rejects(
            () => run([`--in=${config1},${configMismatch}`, `--out=${path.join(tempDir, 'combined-config-mismatch.json')}`]),
            /Mismatched execution config admissibleOrderNonDefaultRetryBudgetFraction/,
        );
        console.log('  ✓ combiner rejects shards that disagree on decision-bearing execution configuration');

        const batch3 = path.join(tempDir, 'batch-03-mismatch.json');
        await writeFile(batch3, JSON.stringify(batchReport({ summary: { budgetMs: 20000 }, levels: [{ level: 3, id: 'R00003', ok: true }] })));
        await assert.rejects(() => run([`--in=${batch1},${batch3}`, `--out=${outFile}`]), /Mismatched budgetMs/);
        console.log('  ✓ rejects mismatched budgetMs across batches');

        const batchWrongRef = path.join(tempDir, 'batch-wrong-ref.json');
        await writeFile(batchWrongRef, JSON.stringify(batchReport({ summary: { commit: 'def456' }, levels: [{ level: 4, id: 'R00004', ok: true }] })));
        await assert.rejects(() => run([`--in=${batch1},${batchWrongRef}`, `--out=${outFile}`]), /Mismatched commit \(wrong-ref exposure\)/);
        console.log('  ✓ rejects shards that ran at different commits (a mutable ref moved mid-dispatch)');

        const batchLocalCommit = path.join(tempDir, 'batch-local-commit.json');
        await writeFile(batchLocalCommit, JSON.stringify(batchReport({ summary: { commit: 'local' }, levels: [{ level: 5, id: 'R00005', ok: true }] })));
        await run([`--in=${batch1},${batchLocalCommit}`, `--out=${outFile}`]);
        console.log('  ✓ exempts local/unknown commit provenance from the wrong-ref check');

        const batch1Again = path.join(tempDir, 'batch-01-again.json');
        await writeFile(batch1Again, JSON.stringify(batchReport({
            levels: [{ level: 1, id: 'R00001', ok: false, status: 'timeout', totalMs: 8000, elapsedMs: 8000, attempts: [], attemptCount: 0, failedStrategies: [] }],
        })));
        await assert.rejects(() => run([`--in=${batch1},${batch1Again}`, `--out=${path.join(tempDir, 'combined-dup.json')}`]), /Duplicate level id R00001/);
        console.log('  ✓ rejects duplicate level ids across overlapping batches');

        const duplicatePosition = path.join(tempDir, 'batch-position-overlap.json');
        await writeFile(duplicatePosition, JSON.stringify(batchReport({
            levels: [{ level: 1, id: 'R99999', ok: false, status: 'timeout' }],
        })));
        await assert.rejects(() => run([`--in=${batch1},${duplicatePosition}`, `--out=${outFile}`]), /Duplicate level position 1/);
        console.log('  ✓ rejects duplicate level positions even when ids differ');

        // Cross-run reconciliation (e.g. an original dispatch plus gap-fill dispatches for ids
        // that individually timed out) feeds this tool's OWN previously-flattened output back in as
        // input -- no `summary` wrapper, budgetMs/corpus/etc. sit at the top level -- so combining
        // must be idempotent rather than requiring a raw {summary, levels} shard shape every time.
        const flatSource1 = path.join(tempDir, 'flat-source-01.json');
        const flatSource2 = path.join(tempDir, 'flat-source-02.json');
        await run([`--in=${batch1}`, `--out=${flatSource1}`]);
        await writeFile(flatSource2, JSON.stringify({
            commitSha: 'abc123', corpus: 'data/stress/stress-levels-random.json', budgetMs: 8000, nodeBudget: 50000000,
            levels: [{ level: 2, id: 'R00002', ok: true, status: 'success', totalMs: 200, elapsedMs: 200, attempts: [], attemptCount: 0, failedStrategies: [] }],
        }));
        const reconciled = path.join(tempDir, 'reconciled.json');
        await run([`--in=${flatSource1},${flatSource2}`, `--out=${reconciled}`]);
        const reconciledReport = JSON.parse(await readFile(reconciled, 'utf8'));
        assert.equal(reconciledReport.levels.length, 2, 'both already-flattened sources merged into one population');
        assert.deepEqual(reconciledReport.levels.map(l => l.id).sort(), ['R00001', 'R00002']);
        assert.equal(reconciledReport.solved, 2);
        console.log('  ✓ re-combines already-flattened reports (cross-run reconciliation) idempotently');

        const flatMismatch = path.join(tempDir, 'flat-mismatch.json');
        await writeFile(flatMismatch, JSON.stringify({
            corpus: 'data/stress/stress-levels-random.json', budgetMs: 99999,
            levels: [{ level: 3, id: 'R00003', ok: true }],
        }));
        await assert.rejects(() => run([`--in=${flatSource1},${flatMismatch}`, `--out=${reconciled}`]), /Mismatched budgetMs/);
        console.log('  ✓ still enforces budgetMs agreement across already-flattened sources');

        const nb1 = path.join(tempDir, 'nb-01.json');
        const nb2 = path.join(tempDir, 'nb-02.json');
        const nbOut = path.join(tempDir, 'combined-nb.json');
        await writeFile(nb1, JSON.stringify(batchReport({
            summary: { nodeBudget: 20000000, repairBudgetFraction: 0 },
            levels: [{ level: 1, id: 'R00001', ok: true }],
        })));
        await writeFile(nb2, JSON.stringify(batchReport({
            summary: { nodeBudget: 20000000, repairBudgetFraction: 0 },
            levels: [{ level: 2, id: 'R00002', ok: false }],
        })));
        await run([`--in=${nb1},${nb2}`, `--out=${nbOut}`]);
        const nbCombined = JSON.parse(await readFile(nbOut, 'utf8'));
        assert.equal(nbCombined.nodeBudget, 20000000, 'agreed nodeBudget carried through as a scalar');
        assert.equal(nbCombined.repairBudgetFraction, 0, 'repairBudgetFraction carried through');
        console.log('  ✓ carries nodeBudget/repairBudgetFraction through when every shard agrees');

        const nb3 = path.join(tempDir, 'nb-03.json');
        const nbMixedOut = path.join(tempDir, 'combined-nb-mixed.json');
        await writeFile(nb3, JSON.stringify(batchReport({
            summary: { nodeBudget: 120000000 },
            levels: [{ level: 3, id: 'R00003', ok: false }],
        })));
        await run([`--in=${nb1},${nb3}`, `--out=${nbMixedOut}`]);
        const nbMixed = JSON.parse(await readFile(nbMixedOut, 'utf8'));
        assert.deepEqual(nbMixed.nodeBudget, [20000000, 120000000], 'differing node budgets recorded as a set, not silently collapsed');
        console.log('  ✓ records differing per-shard node budgets instead of collapsing or throwing');

        const noNbOut = path.join(tempDir, 'combined-no-nb.json');
        await run([`--in=${batch1},${batch2}`, `--out=${noNbOut}`]);
        const noNb = JSON.parse(await readFile(noNbOut, 'utf8'));
        assert.equal(noNb.nodeBudget, null, 'absent node budget recorded as explicit null');
        assert.ok(!('repairBudgetFraction' in noNb), 'absent repairBudgetFraction omitted, not null-filled');
        console.log('  ✓ records an absent node budget as explicit null');

        // --- simulateMakespan: LPT list scheduling, not sum(durations)/workers ---
        {
            // Four equal 10-minute jobs on 4 workers: sum/workers and LPT agree (10 min each).
            const even = simulateMakespan([600_000, 600_000, 600_000, 600_000], 4);
            assert.equal(even.makespanMs, 600_000);

            // One id far larger than the rest: sum/workers would predict (3600000+3*60000)/4 =
            // 945,000ms (~15.75min), but the real queue puts the 60-minute job on its own worker
            // and the makespan is bottlenecked by IT, not the average -- exactly the failure mode
            // that produced a 23-level shard completing only 5 levels in 40 minutes on 2026-09-10.
            const uneven = simulateMakespan([3_600_000, 60_000, 60_000, 60_000], 4);
            assert.equal(uneven.makespanMs, 3_600_000, 'makespan is bottlenecked by the single largest job, not the average');

            // Five 20-minute jobs on 4 workers: one worker must take two (queueing), so makespan is
            // 40 minutes, not 25 (sum/workers would say (5*1200000)/4 = 1,500,000ms = 25min).
            const queued = simulateMakespan([1_200_000, 1_200_000, 1_200_000, 1_200_000, 1_200_000], 4);
            assert.equal(queued.makespanMs, 2_400_000, 'a 5th job queues behind whichever worker took the least so far');
            console.log('  ✓ simulateMakespan models the real 4-worker queue, not sum(durations)/workers');
        }

        // --- packByMakespan: capacity packing + optional hard group-size cap ---
        {
            const msById = new Map([...Array(10).keys()].map(i => [`P${i}`, 600_000])); // 10 min each
            const ids = [...msById.keys()];
            const uncapped = packByMakespan(ids, msById, { workerCount: 4, capacityMs: 20 * 60_000, seedStr: 'test' });
            // Capacity alone (20-minute makespan budget, 4 workers, 10-minute jobs) permits up to 8
            // per bin (2 waves of 4) before a 3rd wave would exceed 20 minutes -- packByMakespan
            // should use that headroom when nothing caps it further.
            assert.ok(uncapped.some(bin => bin.ids.length > 4), 'uncapped packing uses full makespan headroom, not just one job per worker');
            assert.deepEqual(uncapped.flatMap(b => b.ids).sort(), ids.slice().sort(), 'every id placed exactly once');

            const capped = packByMakespan(ids, msById, { workerCount: 4, capacityMs: 20 * 60_000, maxGroupSize: 4, seedStr: 'test' });
            assert.ok(capped.every(bin => bin.ids.length <= 4), 'maxGroupSize caps every bin even when capacity would allow more');
            assert.equal(capped.length, 3, '10 ids at a hard cap of 4/bin makes 3 bins (4, 4, 2)');
            console.log('  ✓ packByMakespan respects makespan capacity and an independent hard group-size cap');
        }

        // --- classifyTelemetry: scale mismatch and config mismatch, calibrated from real incidents ---
        {
            const telemetryById = {
                // Confident: matching config (both default), requested budget within tolerance of
                // telemetry's own.
                R1: { emaMsPerGiganode: 100_000, lastNodeBudget: 60_000_000 },
                // Scale mismatch: same (default) config, but telemetry was recorded at 1.2B nodes --
                // 24x the 50M this dispatch requests, exactly the real connectivity-volume-portal-
                // ab-001 control-arm gap-fill mismatch (run 34414099319).
                R2: { emaMsPerGiganode: 100_000, lastNodeBudget: 1_200_000_000 },
                // Config mismatch: recorded under a different flag combination than requested.
                R3: { emaMsPerGiganode: 100_000, lastNodeBudget: 50_000_000, configKey: 'PRUNE_CONNECTIVITY_VOLUME_PORTAL|' },
                // Legacy entry with no configKey field at all -- must be treated as production
                // default ('|'), not as an automatic mismatch, since every entry written before this
                // field existed genuinely was production default (solver-highbudget-unsolved-
                // sweep.yml never varies flags).
                R4: { emaMsPerGiganode: 100_000, lastNodeBudget: 50_000_000 },
            };
            const opts = { telemetryById, nodeBudget: 50_000_000, configKey: '|', scaleTolerance: 3 };
            assert.equal(classifyTelemetry('R1', opts).tier, 'confident');
            assert.equal(classifyTelemetry('R2', opts).tier, 'scale-mismatch');
            assert.equal(classifyTelemetry('R3', opts).tier, 'config-mismatch');
            assert.equal(classifyTelemetry('R4', opts).tier, 'confident', 'a legacy entry with no configKey is treated as production-default, not a mismatch');
            assert.equal(classifyTelemetry('R5', opts).tier, 'none', 'an id with no telemetry entry at all');
            console.log('  ✓ classifyTelemetry distinguishes confident/scale-mismatch/config-mismatch/none');
        }

        // --- calibrateMultipliers: backtest fitting from data/stress/shard-runtime-backtest-cases.json's own shape ---
        {
            const cases = [
                { id: 'scale-case', mismatchKind: 'scale-only', observedOverPredictedRatio: 5 },
                { id: 'config-case', mismatchKind: 'scale-and-config', observedOverPredictedRatio: 8 },
            ];
            const result = calibrateMultipliers(cases, 1.1);
            assert.equal(result.scaleMismatchMultiplier, Math.ceil(5 * 1.1));
            assert.equal(result.noTelemetryOrConfigMismatchMultiplier, Math.ceil(8 * 1.1));
            // A config-mismatch multiplier can never come out BELOW the scale-only multiplier: a
            // caller with less information (no matching telemetry at any scale) must never get a
            // smaller safety margin than one with partial information (matching config, wrong
            // scale).
            const inverted = calibrateMultipliers([
                { id: 'scale-case', mismatchKind: 'scale-only', observedOverPredictedRatio: 9 },
                { id: 'config-case', mismatchKind: 'scale-and-config', observedOverPredictedRatio: 3 },
            ], 1.0);
            assert.ok(inverted.noTelemetryOrConfigMismatchMultiplier >= inverted.scaleMismatchMultiplier, 'config-mismatch multiplier is floored at the scale multiplier');
            console.log('  ✓ calibrateMultipliers fits from backtest cases and floors config-mismatch at the scale multiplier');
        }

        // --- End-to-end: the planner CLI actually applies uncertainty multipliers and reports diagnostics ---
        {
            const uncertainCorpusIds = corpus2.levels.slice(0, 6).map(level => level.id);
            assert.equal(uncertainCorpusIds.length, 6, 'uncertainty fixture needs six corpus2 ids');
            const uncertainIdsFile = path.join(tempDir, 'uncertain-ids.txt');
            const uncertainTelemetry = path.join(tempDir, 'uncertain-telemetry.json');
            const uncertainOut = path.join(tempDir, 'uncertain-plan.json');
            await writeFile(uncertainIdsFile, uncertainCorpusIds.join('\n') + '\n');
            await writeFile(uncertainTelemetry, JSON.stringify({
                levels: {
                    // Confident: default config, matching scale.
                    [uncertainCorpusIds[0]]: { emaMsPerGiganode: 100_000, lastNodeBudget: 50_000_000 },
                    [uncertainCorpusIds[1]]: { emaMsPerGiganode: 100_000, lastNodeBudget: 50_000_000 },
                    // Scale mismatch: recorded at 1.2B nodes.
                    [uncertainCorpusIds[2]]: { emaMsPerGiganode: 100_000, lastNodeBudget: 1_200_000_000 },
                    // ids 3-5 (index 3,4,5) get no telemetry entry at all -- 'none' tier.
                },
            }));
            await runPlanner([
                `--ids-file=${uncertainIdsFile}`,
                '--corpus2=data/stress/stress-levels-random.json',
                `--telemetry=${uncertainTelemetry}`,
                '--node-budget=50000000',
                '--workers=4',
                '--target-wall-minutes=20',
                '--seed=node-test',
                `--out=${uncertainOut}`,
            ]);
            const uncertainPlanned = JSON.parse(await readFile(uncertainOut, 'utf8'));
            assert.equal(uncertainPlanned.planning.telemetryKnownIds, 2, 'only the 2 confident ids count toward telemetryKnownIds');
            assert.equal(uncertainPlanned.planning.uncertaintyPolicy.scaleMismatchMultiplier, 8);
            assert.equal(uncertainPlanned.planning.uncertaintyPolicy.noTelemetryOrConfigMismatchMultiplier, 11);
            const allUncertainIds = new Set(uncertainPlanned.shard.flatMap(s => s.uncertainIds));
            assert.ok(allUncertainIds.has(uncertainCorpusIds[2]), 'the scale-mismatched id is reported as uncertain');
            assert.ok(allUncertainIds.has(uncertainCorpusIds[3]), 'a no-telemetry id is reported as uncertain');
            assert.ok(!allUncertainIds.has(uncertainCorpusIds[0]), 'a confident id is not reported as uncertain');
            assert.ok(uncertainPlanned.shard.some(s => s.confidence === 'low'), 'at least one shard is marked low-confidence');
            console.log('  ✓ planner CLI applies uncertainty multipliers and reports per-shard telemetryCoverage/confidence/uncertainIds');
        }

        // --- Uncertain ids get a hard group-size cap even when confident ids in the same run do not ---
        {
            const capCorpusIds = corpus2.levels.slice(0, 20).map(level => level.id);
            assert.equal(capCorpusIds.length, 20, 'group-size-cap fixture needs twenty corpus2 ids');
            const capIdsFile = path.join(tempDir, 'cap-ids.txt');
            const capOut = path.join(tempDir, 'cap-plan.json');
            await writeFile(capIdsFile, capCorpusIds.join('\n') + '\n');
            // No --telemetry file at all: every id is 'none' tier (uncertain), fallback-based.
            await runPlanner([
                `--ids-file=${capIdsFile}`,
                '--corpus2=data/stress/stress-levels-random.json',
                '--telemetry=/dev/null/does-not-exist.json',
                '--node-budget=50000000',
                '--workers=4',
                '--target-wall-minutes=200',
                '--max-uncertain-group-size=4',
                '--seed=node-test',
                `--out=${capOut}`,
            ]);
            const capPlanned = JSON.parse(await readFile(capOut, 'utf8'));
            assert.ok(capPlanned.shard.every(s => s.ids.length <= 4), '--max-uncertain-group-size caps every shard even at a generous 200-minute capacity');
            assert.equal(capPlanned.shard.length, 5, '20 uncertain ids at a cap of 4/shard makes 5 shards');
            console.log('  ✓ --max-uncertain-group-size caps uncertain-id shards independent of makespan capacity headroom');
        }

        // --- Output JSON shape: every field the GHA matrices (solve-shards/solve-recovery-shards)
        // and their steps actually read off `matrix.shard.*` must be present with the right type.
        // A silent shape drift here (a renamed/dropped field) would not fail locally -- it would
        // only surface as a broken or zero-instance matrix in a live dispatch, exactly the
        // `planning`-spread-into-matrix regression this workflow's own comment already documents.
        {
            const shapeIds = corpus2.levels.slice(20, 25).map(level => level.id);
            assert.equal(shapeIds.length, 5, 'output-shape fixture needs five corpus2 ids');
            const shapeIdsFile = path.join(tempDir, 'shape-ids.txt');
            const shapeOut = path.join(tempDir, 'shape-plan.json');
            await writeFile(shapeIdsFile, shapeIds.join('\n') + '\n');
            await runPlanner([
                `--ids-file=${shapeIdsFile}`,
                '--corpus2=data/stress/stress-levels-random.json',
                '--telemetry=/dev/null/does-not-exist.json',
                '--node-budget=50000000',
                '--workers=4',
                '--target-wall-minutes=20',
                '--fixed-group-size=2',
                '--min-timeout-minutes=30',
                '--seed=node-test',
                `--out=${shapeOut}`,
            ]);
            const shapePlanned = JSON.parse(await readFile(shapeOut, 'utf8'));
            assert.ok(Array.isArray(shapePlanned.shard) && shapePlanned.shard.length > 0, 'top-level shard is a nonempty array (not wrapped/spread with `planning`)');
            assert.ok(shapePlanned.planning && typeof shapePlanned.planning === 'object' && !Array.isArray(shapePlanned.planning), 'planning is a sibling object, not part of the shard array GHA matrices consume');
            const allShapeIds = new Set();
            for (const s of shapePlanned.shard) {
                assert.equal(typeof s.idx, 'string', 'idx is a string (zero-padded), used verbatim in artifact/file names');
                assert.match(s.idx, /^\d{3}$/, 'idx is zero-padded to 3 digits');
                assert.ok(Array.isArray(s.ids) && s.ids.length > 0, 'ids is a nonempty array');
                assert.equal(typeof s.levels, 'string', 'levels is a comma-joined "pos:N" string, passed straight to --levels');
                assert.ok(s.levels.split(',').every(part => /^pos:\d+$/.test(part)), 'every levels entry is a pos:N token');
                assert.equal(s.levels.split(',').length, s.ids.length, 'levels has exactly one pos:N token per id');
                assert.equal(typeof s.timeoutMinutes, 'number', 'timeoutMinutes is a number, used in the shell timeout wrapper');
                assert.equal(typeof s.jobTimeoutMinutes, 'number', 'jobTimeoutMinutes is a number, used as the job-level timeout-minutes');
                assert.ok(s.jobTimeoutMinutes >= s.timeoutMinutes, 'jobTimeoutMinutes is never less than the inner shell-wrapper timeout');
                assert.ok(['high', 'low', 'bypassed'].includes(s.confidence), 'confidence is one of the three documented tiers');
                assert.equal(typeof s.telemetryCoverage, 'object', 'telemetryCoverage is present for planner-log/diagnostics readers');
                assert.ok(Array.isArray(s.uncertainIds), 'uncertainIds is always an array (possibly empty), never undefined');
                for (const id of s.ids) { assert.ok(!allShapeIds.has(id), `id ${id} appears in only one shard`); allShapeIds.add(id); }
            }
            assert.deepEqual([...allShapeIds].sort(), shapeIds.slice().sort(), 'every requested id appears in exactly one shard, none dropped or invented');
            assert.equal(typeof shapePlanned.planning.telemetryKnownIds, 'number');
            assert.equal(typeof shapePlanned.planning.uncertaintyPolicy, 'object');
            console.log('  ✓ shard-plan.json shard[] entries carry every field the GHA matrix and its steps read, with the documented types');
        }

        // --- End-to-end timeout-recovery completeness: planner + derive-timeout-recovery-population
        // together must reconstruct the EXACT original population after a simulated timeout-
        // truncated first pass, with no id duplicated or dropped across the two passes. ---
        {
            const recIds = corpus2.levels.slice(25, 31).map(level => level.id);
            assert.equal(recIds.length, 6, 'recovery-completeness fixture needs six corpus2 ids');
            const recIdsFile = path.join(tempDir, 'recovery-e2e-ids.txt');
            await writeFile(recIdsFile, recIds.join('\n') + '\n');

            // First-pass plan: 2 fixed-size shards of 3 ids each.
            const firstPlanOut = path.join(tempDir, 'recovery-e2e-first-plan.json');
            await runPlanner([
                `--ids-file=${recIdsFile}`,
                '--corpus2=data/stress/stress-levels-random.json',
                '--telemetry=/dev/null/does-not-exist.json',
                '--node-budget=50000000',
                '--workers=4',
                '--target-wall-minutes=20',
                '--fixed-group-size=3',
                '--seed=node-test',
                `--out=${firstPlanOut}`,
            ]);
            const firstPlanned = JSON.parse(await readFile(firstPlanOut, 'utf8'));
            assert.equal(firstPlanned.shard.length, 2, '6 ids at fixed-group-size 3 makes 2 first-pass shards');

            // Simulate a timeout: shard 1 fully completes, shard 2's job dies partway through with
            // only its first id's row written (its other 2 ids are simply absent -- exactly what a
            // job-level timeout looks like, per this workflow's own RESULT INTEGRITY INVARIANT).
            const [shard1, shard2] = firstPlanned.shard;
            const completedIds = [...shard1.ids, shard2.ids[0]];
            const missingIdsExpected = shard2.ids.slice(1);
            const firstPassResult = path.join(tempDir, 'recovery-e2e-first-result.json');
            await writeFile(firstPassResult, JSON.stringify({
                levels: completedIds.map((id, i) => ({ level: i + 1, id, ok: true, status: 'success' })),
            }));

            const missingOut = path.join(tempDir, 'recovery-e2e-missing.txt');
            const { stdout: recoveryStdout } = await execFile('node', [
                'scripts/derive-timeout-recovery-population.mjs',
                `--expected-ids=${recIdsFile}`,
                `--result=${firstPassResult}`,
                `--out=${missingOut}`,
            ], { cwd: ROOT });
            assert.match(recoveryStdout, /RECOVERABLE: 2\/6 id\(s\) missing/);
            const missingIdsActual = (await readFile(missingOut, 'utf8')).trim().split('\n').filter(Boolean);
            assert.deepEqual(missingIdsActual.sort(), missingIdsExpected.slice().sort(), 'derived missing-id population is exactly the ids the simulated timeout dropped');

            // Recovery plan: re-plan over exactly the missing ids, per plan-recovery's own
            // --fixed-group-size=workers policy.
            const recoveryPlanOut = path.join(tempDir, 'recovery-e2e-recovery-plan.json');
            await runPlanner([
                `--ids-file=${missingOut}`,
                '--corpus2=data/stress/stress-levels-random.json',
                '--telemetry=/dev/null/does-not-exist.json',
                '--node-budget=50000000',
                '--workers=4',
                '--target-wall-minutes=20',
                '--min-timeout-minutes=60',
                '--fixed-group-size=4',
                '--seed=node-test-recovery',
                `--out=${recoveryPlanOut}`,
            ]);
            const recoveryPlanned = JSON.parse(await readFile(recoveryPlanOut, 'utf8'));
            const recoveryPlannedIds = recoveryPlanned.shard.flatMap(s => s.ids);
            assert.deepEqual(recoveryPlannedIds.sort(), missingIdsExpected.slice().sort(), 'the recovery pass plans over exactly the missing ids, no more and no fewer');
            assert.ok(recoveryPlannedIds.every(id => !completedIds.includes(id)), 'no id already completed in the first pass is re-planned in the recovery pass');

            // Simulate the recovery pass completing both missing ids, then combine both passes'
            // rows exactly as combine-final does and re-validate against the ORIGINAL population.
            const recoveryRows = missingIdsExpected.map((id, i) => ({ level: 100 + i, id, ok: true, status: 'success' }));
            const finalLevels = [...JSON.parse(await readFile(firstPassResult, 'utf8')).levels, ...recoveryRows];
            const finalDiff = diffPopulation(recIds, finalLevels);
            assert.equal(finalDiff.malformed, false);
            assert.deepEqual(finalDiff.duplicates, [], 'no id is duplicated across the first and recovery passes');
            assert.deepEqual(finalDiff.missing, [], 'no id from the original population is still missing after the recovery pass');
            assert.deepEqual(finalDiff.unexpected, [], 'no row belongs to an id outside the original population');
            assert.equal(finalDiff.actualCount, 6);
            console.log('  ✓ planner + derive-timeout-recovery-population reconstruct the exact original population after a simulated timeout-truncated first pass');
        }
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
