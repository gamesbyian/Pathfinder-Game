#!/usr/bin/env node
/**
 * Lane D question 2: constrained-event feasibility, per
 * docs/solver-per-instance-relational-feasibility-preflight.md's question 2 ("ask whether
 * completion remains possible through a nominated current-input event/region/interface: a
 * crossing cell/axis, separator side, portal family, chokepoint, or required approach class").
 *
 * Zero new solver compute. H1 (docs/solver-capability-gap-stop-condition-reconciliation.md)
 * already ran exactly this query shape -- cross-via/pass-via CP-SAT feasibility checks pinning a
 * specific crossing/passing event -- against the B2 exact-labelled population, but scored it for
 * CROSS-LEVEL recurrence of a fixed low-cardinality event vocabulary (closed: no compact universal
 * relation). This script re-groups the same already-committed per-query results PER STATE instead,
 * asking the different, still-open question: within one instance, does per-instance constrained-
 * event feasibility vary at all, and does it carry information beyond the state's own binary
 * exactLabel? Per solver-capability-gap-stop-condition-reconciliation.md's "procedure
 * generalization vs. output recurrence" distinction, this per-instance reframing is not the same
 * claim H1 closed.
 *
 * Inputs (already committed, no new compute):
 *   reports/stress/h1-event-feasibility-results-merged-2026-09-16.json -- 449 per-query CP-SAT
 *     verdicts (cross-via/pass-via) across the 28-state/14-parent B2 population, 0 correctness
 *     alarms per H1's own audit.
 *
 * Usage:
 *   node scripts/stress/lane-d-constrained-event-feasibility-reanalysis.mjs \
 *     --out=reports/stress/lane-d-constrained-event-feasibility-2026-09-17.json
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const RESULTS_FILE = arg('results', 'reports/stress/h1-event-feasibility-results-merged-2026-09-16.json');
const OUT_FILE = arg('out', null);

const results = JSON.parse(readFileSync(path.resolve(ROOT, RESULTS_FILE), 'utf8'));

const perState = new Map();
for (const row of results.rows) {
    if (!perState.has(row.caseId)) {
        perState.set(row.caseId, {
            caseId: row.caseId, levelId: row.levelId, role: row.role, exactLabel: row.exactLabel,
            total: 0, feasible: 0, infeasible: 0, unknown: 0,
        });
    }
    const s = perState.get(row.caseId);
    s.total++;
    if (row.cpSatStatus === 'OPTIMAL') s.feasible++;
    else if (row.cpSatStatus === 'INFEASIBLE') s.infeasible++;
    else s.unknown++;
}

const states = [...perState.values()];
const deadStates = states.filter((s) => s.exactLabel === 'dead');
const liveStates = states.filter((s) => s.exactLabel === 'live');

const deadQueries = deadStates.reduce((a, s) => a + s.total, 0);
const deadInfeasible = deadStates.reduce((a, s) => a + s.infeasible, 0);
const liveQueries = liveStates.reduce((a, s) => a + s.total, 0);
const liveFeasible = liveStates.reduce((a, s) => a + s.feasible, 0);
const liveInfeasible = liveStates.reduce((a, s) => a + s.infeasible, 0);
const liveUnknown = liveStates.reduce((a, s) => a + s.unknown, 0);

const liveStateClassification = {
    fullyFeasible: liveStates.filter((s) => s.feasible === s.total).map((s) => s.caseId),
    fullyInfeasible: liveStates.filter((s) => s.infeasible === s.total).map((s) => s.caseId),
    mixed: liveStates.filter((s) => s.feasible > 0 && s.infeasible > 0).map((s) => ({
        caseId: s.caseId, feasible: s.feasible, infeasible: s.infeasible, unknown: s.unknown, total: s.total,
    })),
};

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Lane D question 2 -- constrained-event feasibility, per-instance re-analysis of already-committed H1 query results, zero new solver compute',
    inputFile: RESULTS_FILE,
    inputProvenance: 'H1 cross-via/pass-via CP-SAT queries, 449 rows, 0 correctness alarms (see H1 own audit)',
    stateCount: states.length,
    deadStateCount: deadStates.length,
    liveStateCount: liveStates.length,
    deadStates: {
        queries: deadQueries,
        infeasible: deadInfeasible,
        infeasibleRate: deadQueries ? deadInfeasible / deadQueries : null,
        note: 'trivial by construction: a DEAD state has no completion at all, so every additional constraint remains infeasible. Zero new information.',
    },
    liveStates: {
        queries: liveQueries,
        feasible: liveFeasible,
        infeasible: liveInfeasible,
        unknown: liveUnknown,
        infeasibleRate: liveQueries ? liveInfeasible / liveQueries : null,
        feasibleRate: liveQueries ? liveFeasible / liveQueries : null,
        unknownRate: liveQueries ? liveUnknown / liveQueries : null,
    },
    liveStateClassification: {
        fullyFeasibleCount: liveStateClassification.fullyFeasible.length,
        fullyInfeasibleCount: liveStateClassification.fullyInfeasible.length,
        mixedCount: liveStateClassification.mixed.length,
        fullyFeasible: liveStateClassification.fullyFeasible,
        fullyInfeasible: liveStateClassification.fullyInfeasible,
        mixed: liveStateClassification.mixed,
    },
    perState: states,
};

console.log(`Dead states: ${deadStates.length} (${deadQueries} queries, ${deadInfeasible} infeasible = ${(deadInfeasible / deadQueries * 100).toFixed(1)}%, trivial)`);
console.log(`Live states: ${liveStates.length} (${liveQueries} queries: ${liveFeasible} feasible / ${liveInfeasible} infeasible / ${liveUnknown} unknown)`);
console.log(`Live-state pattern: ${liveStateClassification.fullyFeasible.length} fully-feasible, ${liveStateClassification.fullyInfeasible.length} fully-infeasible, ${liveStateClassification.mixed.length} mixed`);

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
