#!/usr/bin/env node
/**
 * Bounded canary for two research-only/non-default beam frontier-selection modes on the frozen
 * 28-level first-loss frontier population: `--mode=ints` (default; search.ts's `_intsBucketSelect`,
 * 2026-09-12, bucketed by `ints`/required-intersections-visited) and `--mode=mechanic` (the
 * EXISTING, already-promoted `mechanicBucketRetention`/`_mechanicBucketSelect`, bucketed by
 * (mustCrossMask, flipperUsedMask), applied here purely as a routing-eligibility experiment: all
 * 28 of these intersection-heavy-regime levels turn out to have nonzero mustCross counts (1-8) —
 * checked directly, not assumed — so this existing mechanism has real bucket diversity available
 * on them even though current `ATTEMPT_POLICY` never routes them to a mechanic-bucket-retaining
 * beam config (that retention mode is reserved for the must-cross-heavy routing regime). No new
 * code is exercised for `--mode=mechanic`; it is zero-cost evidence about whether an already-live
 * mechanism, simply never offered to this regime, would help if it were.
 *

 * Why now: docs/solver-optimization-workstreams.md's WS2/WS4 gate requires either cross-action
 * recurrence (tested negative — repair's failure mode is exposure, not rank-retention-loss; see
 * reports/2026-09-11-repair-side-first-loss-exposure-001.md) or "a materially new bounded retention
 * mechanism" before WS4 reopens. This pilot is that mechanism's smallest possible test: does
 * bucketing by `ints` change the score-width-cull outcome on the exact 28-level frozen population
 * (14 dev-sample + 14 confirmation-sample ids) that the two 2026-09-11 first-loss reports already
 * doubly confirmed loses known-live support via `score-width-culled`, width-insensitively, with a
 * DFS-falsified shared-scorer hypothesis?
 *
 * Frozen design (recorded before running, per the operating model's own discipline):
 *  - Population: the exact 28 ids from reports/2026-09-11-bounded-class4-class5-first-loss-
 *    phenotyping-001.md (dev) + reports/2026-09-11-ws2-independent-first-loss-confirmation-001.md
 *    (confirmation) — the same population reports/2026-09-11-repair-side-first-loss-exposure-001.md
 *    already reused for its own repair-side follow-up. No new sampling.
 *  - Comparator: control = plain top-K width selection (mechanicBucketRetention=false,
 *    intsBucketRetention=false — what all 28 already ran under in both source reports); treatment =
 *    intsBucketRetention=true. Same gate, profile (`default`), beam width (2000) and node budget
 *    (3,000,000) as the dev/confirmation reports' own width=2000 run, so this is a matched-work
 *    comparison against already-published control numbers, not a fresh unconstrained run.
 *  - Metrics: (1) solved (referee-validated) — the primary signal; (2) for still-unsolved levels,
 *    final-known-support depth vs. control's own recorded depth (from the source survival files);
 *    (3) correctness alarms (must stay 0).
 *  - Advancement rule, fixed in advance: zero solves AND no survival-depth improvement beyond the
 *    already-characterized 0-13-step width-insensitivity noise band (i.e. indistinguishable from
 *    the 2000-vs-5000 width delta already measured) closes this mechanism negative — do not scale
 *    up. Any solve, or a depth improvement clearly outside that noise band on multiple levels, is
 *    genuine positive evidence earning a larger prespecified A/B design (not itself a promotion).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/ints-bucket-retention-pilot.mjs -- \
 *     --mode=ints --out=reports/stress/ints-bucket-retention-pilot-001.json
 *   node scripts/run-bundled.mjs scripts/stress/ints-bucket-retention-pilot.mjs -- \
 *     --mode=mechanic --out=reports/stress/mechanic-bucket-on-intersection-heavy-pilot-001.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const beamWidth = Number(args.get('--beam-width') ?? 2000);
const nodeBudget = Number(args.get('--node-budget') ?? 3000000);
const outFile = args.get('--out') ?? 'reports/stress/ints-bucket-retention-pilot-001.json';
const mode = args.get('--mode') ?? 'ints';
if (mode !== 'ints' && mode !== 'mechanic') throw new Error(`--mode must be 'ints' or 'mechanic', got '${mode}'`);

// Frozen population: dev sample (14) + confirmation sample (14), verbatim from the two source
// reports' own tables. Do not resample or curate.
const DEV_SAMPLE = ['R03101', 'R00329', 'R03275', 'R02530', 'R02309', 'R03351', 'R01190',
    'R01632', 'R03088', 'R01097', 'R03229', 'R03197', 'R02185', 'R02733'];
const CONFIRMATION_SAMPLE = ['R02438', 'R02590', 'R02897', 'R03223', 'R00786', 'R03083', 'R01023',
    'R00139', 'R02801', 'R02170', 'R02210', 'R02025', 'R01290', 'R02324'];
const FULL_POPULATION = [...DEV_SAMPLE, ...CONFIRMATION_SAMPLE];
// --only is a smoke-test escape hatch (same convention as census-repair-rollback-windows.mjs), not
// a resampling mechanism: the frozen population above is FULL_POPULATION and the committed pilot
// result must use every id, unfiltered.
const onlyIds = (args.get('--only') ?? '').split(',').map(x => x.trim()).filter(Boolean);
const POPULATION = onlyIds.length ? onlyIds : FULL_POPULATION;
if (onlyIds.length && onlyIds.some(id => !FULL_POPULATION.includes(id))) throw new Error('--only ids must be a subset of the frozen 28-id population');

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const rawLevels = readLevelsWithHints(levelsFile);
const byId = new Map(rawLevels.filter(level => level.hints?.length > 0).map(level => [String(level.id), level]));
const missing = POPULATION.filter(id => !byId.has(id));
if (missing.length) throw new Error(`frozen population ids not found with stored hints in ${levelsFile}: ${missing.join(', ')}`);

const rows = [];
for (const id of POPULATION) {
    const raw = byId.get(id);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const valid = [];
    for (let i = 0; i < raw.hints.length; i++) {
        const candidate = raw.hints[i];
        const verdict = Solver.validateCandidatePath(level, candidate);
        if (!verdict.ok) throw new Error(`${id}: stored hint ${i} failed canonical referee: ${verdict.reason}`);
        valid.push({ path: candidate, provenance: JSON.stringify(raw.hintRecords?.[i]?.provenance ?? []) });
    }
    const byGate = new Map();
    for (const label of valid) { const list = byGate.get(label.path[0]) ?? []; list.push(label); byGate.set(label.path[0], list); }
    const [gateKey, labels] = [...byGate.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])[0];

    const runArm = (arm) => {
        const prep = api.prepLevel(level); prep._cfg = null; prep._metrics = { nodesExpanded: 0 };
        const observer = new api.KnownSolutionPrefixSurvivalObserver(new api.KnownSolutionPrefixIndex(labels));
        prep._beamResearchObserver = observer;
        return { arm, prep, observer };
    };

    const control = runArm('control');
    const controlPath = await api.beamSearchFromGate(gateKey, level, control.prep, api.SCORING_PROFILES.default,
        120000, Date.now(), null, beamWidth, null, false, {}, nodeBudget);

    const treatment = runArm('treatment');
    const treatmentPath = mode === 'ints'
        ? await api.beamSearchFromGate(gateKey, level, treatment.prep, api.SCORING_PROFILES.default,
            120000, Date.now(), null, beamWidth, null, false, {}, nodeBudget, undefined, undefined, undefined, true)
        : await api.beamSearchFromGate(gateKey, level, treatment.prep, api.SCORING_PROFILES.default,
            120000, Date.now(), null, beamWidth, null, true, {}, nodeBudget);

    const controlSummary = control.observer.summary(level.requiredLength);
    const treatmentSummary = treatment.observer.summary(level.requiredLength);

    let treatmentSolveVerdict = null;
    if (treatmentPath) {
        const verdict = Solver.validateCandidatePath(level, treatmentPath);
        treatmentSolveVerdict = verdict.ok ? 'ok' : `REFEREE-REJECTED: ${verdict.reason}`;
    }

    const row = {
        levelId: id, gateKey, validLabels: labels.length, requiredLength: level.requiredLength,
        beamWidth, nodeBudget,
        control: { solved: !!controlPath, nodesExpanded: control.prep._metrics.nodesExpanded,
            lastSupportDepth: controlSummary.lastSupportDepth, lossCause: controlSummary.finalSupportLoss?.lossCause ?? null,
            correctnessAlarms: controlSummary.correctnessAlarms.length },
        treatment: { solved: !!treatmentPath, solveVerdict: treatmentSolveVerdict,
            nodesExpanded: treatment.prep._metrics.nodesExpanded,
            lastSupportDepth: treatmentSummary.lastSupportDepth, lossCause: treatmentSummary.finalSupportLoss?.lossCause ?? null,
            correctnessAlarms: treatmentSummary.correctnessAlarms.length },
        depthDelta: (treatmentSummary.lastSupportDepth ?? 0) - (controlSummary.lastSupportDepth ?? 0),
    };
    rows.push(row);
    console.error(`${id}: control solved=${row.control.solved} depth=${row.control.lastSupportDepth} | ` +
        `treatment solved=${row.treatment.solved} depth=${row.treatment.lastSupportDepth} delta=${row.depthDelta}`);
}

const document = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), levelsFile,
    purpose: `${mode}-bucket-retention canary on the frozen 28-level first-loss frontier population`,
    mode, beamWidth, nodeBudget, population: POPULATION, rows,
    summary: {
        levels: rows.length,
        controlSolved: rows.filter(r => r.control.solved).length,
        treatmentSolved: rows.filter(r => r.treatment.solved).length,
        newSolves: rows.filter(r => r.treatment.solved && !r.control.solved).length,
        regressions: rows.filter(r => r.control.solved && !r.treatment.solved).length,
        correctnessAlarms: rows.reduce((n, r) => n + r.control.correctnessAlarms + r.treatment.correctnessAlarms, 0),
        depthDeltaMean: rows.reduce((n, r) => n + r.depthDelta, 0) / rows.length,
        depthDeltaMax: Math.max(...rows.map(r => r.depthDelta)),
        depthDeltaMin: Math.min(...rows.map(r => r.depthDelta)),
    },
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
console.log(JSON.stringify(document.summary, null, 2));
