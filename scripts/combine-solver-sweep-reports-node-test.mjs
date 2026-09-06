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
import { validateSweepIntegrity } from './validate-solver-sweep-integrity.mjs';
import { analyzeOpportunity, opportunitySampleSizeForAtLeastOne } from './experiment-opportunity-audit.mjs';

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
        assert.equal(combined.failed, 1);
        assert.equal(combined.total, 2);
        console.log('  ✓ merges two batches into one flat, budgetMs-bearing report');

        const exact = validateSweepIntegrity({ expectedIds: ['R00001', 'R00002'], levels: combined.levels });
        assert.equal(exact.complete, true);
        assert.throws(() => validateSweepIntegrity({ expectedIds: ['R00001', 'R00002', 'R00003'], levels: combined.levels }), /missing results: R00003/);
        assert.throws(() => validateSweepIntegrity({ expectedIds: ['R00001'], levels: combined.levels }), /unexpected results: R00002/);
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
        assert.throws(() => validateSweepIntegrity({
            expectedIds: ['R00001', 'R00002'], levels: participatingLevels,
            requiredStage: 'late-retry', minParticipatingLevels: 2,
        }), /below required minimum 2/);
        console.log('  ✓ target-stage gate distinguishes nominal zero-work reach from real participation');

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
        const plannerOut = path.join(tempDir, 'planner.json');
        await writeFile(plannerIdsFile, plannerIds.join('\n') + '\n');
        await runPlanner([
            `--ids-file=${plannerIdsFile}`,
            '--corpus2=data/stress/stress-levels-random.json',
            '--node-budget=50000000',
            '--workers=4',
            '--target-wall-minutes=20',
            '--seed=node-test',
            `--out=${plannerOut}`,
        ]);
        const planned = JSON.parse(await readFile(plannerOut, 'utf8'));
        assert.equal(planned.planning.telemetryPath, 'logs/solver-stress-refresh/corpus2-runtime-telemetry.json');
        assert.equal(planned.planning.telemetryRequestedIds, 2);
        assert.equal(planned.shard.flatMap(shard => shard.ids).length, 2);
        console.log('  ✓ shard planner automatically consumes standing runtime telemetry when callers omit --telemetry');

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
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
