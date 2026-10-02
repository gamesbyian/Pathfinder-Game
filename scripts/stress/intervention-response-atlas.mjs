#!/usr/bin/env node
/**
 * PG-B intervention-response residual atlas over retained Corpus-2 capability runs.
 *
 * Inputs are repository-resident only: every reports/stress/capability-runs/<run>/per-level-corpus2.json
 * (1,700 levels, one row per level), the 2026-09-13 capability-memory signatures, and the BC1 random-300
 * production A/B gain/loss ids. Consecutive capability runs are treated as natural interventions (code or
 * flag changes between them); response cells are per-level solved/unsolved transitions.
 *
 * Optional prospective mode: --control=<runId> --treatment=<runId> compares two retained runs at the same
 * solver ref (e.g. a current-main control and a single-flag ablation) and tests the pre-registered
 * regime predictions in reports/2026-10-02-intervention-response-atlas-result-001.md.
 *
 * Usage: node scripts/stress/intervention-response-atlas.mjs [--out=<file.json>] [--control=<id> --treatment=<id>]
 * Output is descriptive/forensic; nothing here may route cold policy (historical outcomes are not level-blind).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';

const DIR = 'reports/stress/capability-runs';
const MANIFEST = 'reports/stress/capability-memory-manifests/2026-09-13-five-source-partial-union/manifest.json';
const BC1_POP = 'data/stress/bc1-prune-ab-001-ids.txt';
// Representative production A/B (GHA 36772811676 control / 36772815197 treatment), from the BC1 A/B result report.
const BC1_GAINS = 'R00046 R00180 R00440 R02084 R02274 R02422 R02425 R02431 R02440 R02590 R02629 R02666 R02676 R02703 R02748 R02956 R03024 R03115 R03117 R03121 R03152 R03261 R03301'.split(' ');
const BC1_LOSSES = 'R01273 R02333 R02874 R03242'.split(' ');
// Runs before this one belong to the volatile August/early-September era (large symmetric churn between shas).
const STABLE_ERA_START = '32526927206';

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const readJson = f => JSON.parse(readFileSync(f, 'utf8'));

function loadRun(runId) {
    const rows = readJson(`${DIR}/${runId}/per-level-corpus2.json`).rows;
    const summary = existsSync(`${DIR}/${runId}/summary.json`) ? readJson(`${DIR}/${runId}/summary.json`) : {};
    const byId = Object.fromEntries(rows.map(r => [r.id, r]));
    return {
        runId, solverRef: summary.solverRef ?? null, enableFlags: summary.enableFlags || '', disableFlags: summary.disableFlags || '',
        ok: Object.fromEntries(rows.map(r => [r.id, r.ok === true])), byId,
        solved: rows.filter(r => r.ok === true).length, total: rows.length,
    };
}

/** Fisher exact two-sided p for a 2x2 table [[a,b],[c,d]]. */
function fisher(a, b, c, d) {
    const lf = n => { let s = 0; for (let i = 2; i <= n; i++) s += Math.log(i); return s; };
    const n = a + b + c + d, r1 = a + b, c1 = a + c;
    const p = x => Math.exp(lf(r1) + lf(n - r1) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(n - r1 - c1 + x));
    const p0 = p(a); let s = 0;
    for (let x = Math.max(0, r1 + c1 - n); x <= Math.min(r1, c1); x++) { const px = p(x); if (px <= p0 * (1 + 1e-9)) s += px; }
    return Math.min(1, s);
}
function contrast(label, universe, responders, marker) {
    const r = universe.filter(x => responders.has(x)), n = universe.filter(x => !responders.has(x));
    const a = r.filter(marker).length, b = r.length - a, c = n.filter(marker).length, d = n.length - c;
    return { label, responders: r.length, respondersMarked: a, nonResponders: n.length, nonRespondersMarked: c,
        oddsRatio: (b * c) === 0 ? null : +((a * d) / (b * c)).toFixed(3), fisherP: +fisher(a, b, c, d).toPrecision(3) };
}

const runIds = readdirSync(DIR).filter(r => existsSync(`${DIR}/${r}/per-level-corpus2.json`)).sort();
const prospective = arg('control') && arg('treatment') ? [arg('control'), arg('treatment')] : null;
const historical = runIds.filter(r => !prospective?.includes(r)).map(loadRun);
const ids = Object.keys(historical[0].ok);

// Per-level history over consecutive historical runs.
const history = {};
for (const id of ids) {
    let flips = 0, lost = 0, lostStable = 0;
    for (let i = 1; i < historical.length; i++) {
        const [p, q] = [historical[i - 1].ok[id], historical[i].ok[id]];
        if (p !== q) flips++;
        if (p && !q) { lost++; if (historical[i - 1].runId >= STABLE_ERA_START) lostStable++; }
    }
    history[id] = { flips, lost, lostStable, everSolved: historical.some(r => r.ok[id]) };
}
const latest = historical.at(-1);
const transitions = historical.slice(1).map((q, i) => {
    const p = historical[i];
    return { from: p.runId, to: q.runId, toFlags: q.enableFlags || q.disableFlags ? { enable: q.enableFlags, disable: q.disableFlags } : null,
        gains: ids.filter(x => !p.ok[x] && q.ok[x]).length, losses: ids.filter(x => p.ok[x] && !q.ok[x]).length };
});
const unrecoveredStableLosses = ids.filter(x => !latest.ok[x] && historical.some(r => r.runId >= STABLE_ERA_START && r.ok[x]));

// Retrospective cross-intervention contrasts on the BC1 random-300 population (all historical runs predate BC1).
const sigs = Object.fromEntries(readJson(MANIFEST).candidates.map(c => [c.id, new Set(c.signature.gainIds)]));
const nominated = x => Object.values(sigs).some(s => s.has(x));
const pop = readFileSync(BC1_POP, 'utf8').split(/\s+/).filter(Boolean);
const popResidual = pop.filter(x => !latest.ok[x]), popSolved = pop.filter(x => latest.ok[x]);
const gains = new Set(BC1_GAINS), losses = new Set(BC1_LOSSES);
const retrospective = [
    contrast('BC1 gains vs capability-signature nomination (pre-BC1 residual)', popResidual, gains, nominated),
    contrast('BC1 gains vs historical flip (pre-BC1 residual)', popResidual, gains, x => history[x].flips > 0),
    contrast('BC1 losses vs historical ever-lost (pre-BC1 solved)', popSolved, losses, x => history[x].lost > 0),
];

let prospectiveResult = null;
if (prospective) {
    const [ctl, trt] = prospective.map(loadRun);
    // Orientation: treatment is the arm under test vs control; "gain" = solved only in treatment.
    const g = new Set(ids.filter(x => !ctl.ok[x] && trt.ok[x])), l = new Set(ids.filter(x => ctl.ok[x] && !trt.ok[x]));
    const ctlResidual = ids.filter(x => !ctl.ok[x]), ctlSolved = ids.filter(x => ctl.ok[x]);
    const work = (run, xs) => xs.reduce((s, x) => s + (run.byId[x]?.workSpent ?? 0), 0);
    prospectiveResult = {
        control: { runId: ctl.runId, solverRef: ctl.solverRef, solved: ctl.solved, enableFlags: ctl.enableFlags, disableFlags: ctl.disableFlags },
        treatment: { runId: trt.runId, solverRef: trt.solverRef, solved: trt.solved, enableFlags: trt.enableFlags, disableFlags: trt.disableFlags },
        sameSolverRef: ctl.solverRef === trt.solverRef,
        gains: [...g].sort(), losses: [...l].sort(),
        controlVsLatestHistorical: { gains: ids.filter(x => !latest.ok[x] && ctl.ok[x]).length, losses: ids.filter(x => latest.ok[x] && !ctl.ok[x]).sort(),
            unrecoveredStableLossesNowSolved: unrecoveredStableLosses.filter(x => ctl.ok[x]) },
        // Dead-last retry pricing: treatment arm re-run only where control failed (deterministic outcomes assumed).
        deadLastRetryPricing: {
            retryPopulation: ctlResidual.length,
            recoveredSolves: g.size,
            additiveWorkSpent: work(trt, ctlResidual),
            controlTotalWorkSpent: work(ctl, ids),
            workPerRecoveredSolve: g.size ? Math.round(work(trt, ctlResidual) / g.size) : null,
            recoveredWinningStages: Object.entries([...g].reduce((m, x) => { const k = trt.byId[x].winningActionKey?.split('|')[0] ?? trt.byId[x].winningConfig ?? 'unknown'; m[k] = (m[k] ?? 0) + 1; return m; }, {})),
        },
        contrasts: [
            contrast('treatment gains vs capability-signature nomination (control residual)', ctlResidual, g, nominated),
            contrast('treatment gains vs historical flip (control residual)', ctlResidual, g, x => history[x].flips > 0),
            contrast('treatment losses vs historical ever-lost (control solved)', ctlSolved, l, x => history[x].lost > 0),
        ],
    };
}

const doc = {
    schemaVersion: 1, kind: 'pathfinder-intervention-response-atlas', evidenceRole: 'forensic',
    historicalRuns: historical.map(r => ({ runId: r.runId, solverRef: r.solverRef, enableFlags: r.enableFlags, disableFlags: r.disableFlags, solved: r.solved, total: r.total })),
    transitions,
    levelHistorySummary: {
        levels: ids.length,
        flipDistribution: ids.reduce((m, x) => { m[history[x].flips] = (m[history[x].flips] ?? 0) + 1; return m; }, {}),
        latestResidual: ids.filter(x => !latest.ok[x]).length,
        latestResidualEverSolved: ids.filter(x => !latest.ok[x] && history[x].everSolved).length,
        latestSolvedEverLost: ids.filter(x => latest.ok[x] && history[x].lost > 0).length,
        latestSolvedEverLostInStableEra: ids.filter(x => latest.ok[x] && history[x].lostStable > 0).length,
        unrecoveredStableEraLosses: unrecoveredStableLosses,
    },
    retrospective,
    prospective: prospectiveResult,
};
const out = arg('out');
if (out) writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({ transitions: transitions.length, levelHistorySummary: doc.levelHistorySummary, retrospective, prospective: prospectiveResult && { ...prospectiveResult, gains: prospectiveResult.gains.length, losses: prospectiveResult.losses } }, null, 1));
