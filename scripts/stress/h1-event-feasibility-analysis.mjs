#!/usr/bin/env node
/**
 * Analyzes the frozen H1 event-feasibility results per reports/2026-09-16-h1-event-feasibility-
 * prespec-001.md's "Primary analysis"/advancement bar. Read-only join of the frozen queries
 * (scripts/stress/h1-event-feasibility-query-builder.mjs) to their CP-SAT results
 * (scripts/stress/h1-event-feasibility-runner.mjs); does not run CP-SAT and does not alter either
 * upstream artifact.
 *
 * DEAD base states are excluded from the "recurring relation" search: since the whole state has no
 * valid completion, every event query on it is trivially infeasible by monotonicity, which restates
 * the state's own label rather than revealing anything about a specific missing joint-order regime.
 * They are reported separately only as a consistency check (every query on a DEAD state must show
 * infeasible; a live result there would indicate a modelling bug).
 *
 * The one relation this script can test directly from its own query construction is the flip-order
 * "nearer-ranked-before-farther-ranked" hypothesis (both rankings come from the same board-distance
 * ranking the query builder used) -- reported explicitly. Per-event-type realizability rates for
 * LIVE states are reported for the other event types without asserting a specific hypothesis the
 * builder did not construct a direct test for.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const queriesFile = args.get('--queries') ?? 'reports/stress/h1-event-feasibility-queries.json';
const resultsFile = args.get('--results') ?? 'reports/stress/h1-event-feasibility-results.json';
const outFile = args.get('--out') ?? 'reports/stress/h1-event-feasibility-analysis.json';

const queriesDoc = JSON.parse(readFileSync(queriesFile, 'utf8'));
const resultsDoc = JSON.parse(readFileSync(resultsFile, 'utf8'));
const resultByQueryId = new Map(resultsDoc.rows.map(r => [r.queryId, r]));

const rows = [];
for (const state of queriesDoc.states) {
    state.queries.forEach((query, queryIndex) => {
        const queryId = `${state.caseId}::q${queryIndex}:${query.type}`;
        const result = resultByQueryId.get(queryId);
        if (!result) throw new Error(`missing result for ${queryId}`);
        rows.push({
            queryId, caseId: state.caseId, levelId: state.levelId, role: state.role, exactLabel: state.exactLabel,
            query, referenceLabel: result.referenceLabel, referenceReason: result.referenceReason,
            resolved: result.referenceLabel === 'live' || result.referenceLabel === 'dead',
            realizable: result.referenceLabel === 'live',
            correctnessAlarm: !!result.correctnessAlarm,
        });
    });
}

const total = rows.length;
const resolved = rows.filter(r => r.resolved);
const unresolvedFraction = total > 0 ? (total - resolved.length) / total : 1;
const correctnessAlarms = rows.filter(r => r.correctnessAlarm).length;

// Consistency check: every query on a DEAD base state must be infeasible (monotonicity of
// infeasibility under an added constraint). A resolved-but-realizable row here is a modelling bug,
// not a scientific finding, and blocks any advancement verdict until root-caused.
const deadStateRows = rows.filter(r => r.exactLabel === 'dead');
const deadStateViolations = deadStateRows.filter(r => r.resolved && r.realizable);

const liveRows = rows.filter(r => r.exactLabel === 'live');
const liveResolved = liveRows.filter(r => r.resolved);

function rateByType(list) {
    const byType = new Map();
    for (const r of list) {
        if (!byType.has(r.query.type)) byType.set(r.query.type, { total: 0, resolved: 0, realizable: 0 });
        const bucket = byType.get(r.query.type);
        bucket.total++;
        if (r.resolved) { bucket.resolved++; if (r.realizable) bucket.realizable++; }
    }
    return Object.fromEntries([...byType].map(([type, b]) => [type, { ...b, realizableRateOfResolved: b.resolved ? b.realizable / b.resolved : null }]));
}
const liveRatesByType = rateByType(liveRows);

// Flip-order queries pin `before_pairs[(i, j)] == true` where i is the nearer-ranked (rank r) and
// j the farther-ranked (rank r+1) pending flipper by board distance from the state's position; per
// cpsat-reference-probe.py's own before_ij semantics that literally asks "does a completion exist
// where the FARTHER flipper (j) is crossed before the NEARER one (i)" -- i.e. realizable here means
// the board-distance-farther obligation is resolvable ahead of the nearer one, not the other way
// round. Report the raw realizable/unrealizable split; do not assume a direction the prespec did
// not itself predict.
const flipOrderResolved = liveRows.filter(r => r.query.type === 'flip-order' && r.resolved);
const flipOrderRealizable = flipOrderResolved.filter(r => r.realizable).length;

const byParentFamily = new Map();
for (const r of liveRows) {
    if (!byParentFamily.has(r.levelId)) byParentFamily.set(r.levelId, []);
    byParentFamily.get(r.levelId).push(r);
}
const parentSummary = [...byParentFamily.entries()].map(([levelId, list]) => ({
    levelId, queries: list.length, resolved: list.filter(r => r.resolved).length,
    realizable: list.filter(r => r.realizable).length,
    byType: rateByType(list),
}));

// The advancement bar is qualitative ("a compact categorical relation recurs across unrelated
// parents") rather than a single numeric threshold; this script reports the raw material a human
// reviewer needs to apply it (per-type realizability rates per parent, the flip-order split, the
// consistency check) rather than asserting a verdict from a formula the prespec did not specify.
const document = {
    schemaVersion: 1,
    kind: 'h1-event-feasibility-analysis',
    generatedAt: new Date().toISOString(),
    prespec: 'reports/2026-09-16-h1-event-feasibility-prespec-001.md',
    sourceQueries: queriesFile,
    sourceResults: resultsFile,
    summary: {
        totalQueries: total, resolvedQueries: resolved.length, unresolvedFraction, correctnessAlarms,
        deadStateQueries: deadStateRows.length, deadStateConsistencyViolations: deadStateViolations.length,
        liveStateQueries: liveRows.length, liveStateResolvedQueries: liveResolved.length,
        liveRatesByType,
        flipOrder: { resolved: flipOrderResolved.length, realizable: flipOrderRealizable, unrealizable: flipOrderResolved.length - flipOrderRealizable },
    },
    parentSummary,
    deadStateConsistencyViolations: deadStateViolations,
    rows,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify(document.summary, null, 2));
console.log(JSON.stringify(parentSummary.map(p => ({ levelId: p.levelId, queries: p.queries, resolved: p.resolved, realizable: p.realizable })), null, 2));
