#!/usr/bin/env node
/**
 * Minimal DEAD-core / minimum-relaxation diagnosis, per docs/solver-future-work.md's queue item 3
 * and the cheapest falsifier named in reports/2026-09-16-assumption-breaking-solver-development-
 * moonshots-001.md's Moonshot A: "On a frozen exact-labelled sibling set, ask whether DEAD states
 * admit small recurring cores and whether those cores reject other DEAD siblings while sparing LIVE
 * siblings. If cores are large, parent-specific, or non-recurring, stop before runtime machinery."
 *
 * Population: the 4 exact-DEAD B2 states already used by H1 (no new labelling). For each state,
 * relaxes exactly ONE pending must-cross or must-pass obligation at a time (via
 * cpsat-reference-probe.py's new --relax hook) and checks whether that single relaxation alone
 * flips the state from DEAD to LIVE -- the smallest possible causal-core test before considering
 * pairs/larger combinations. Frozen before any solve: the case list is built from H1's already-
 * committed query population's own pending-obligation enumeration, never from a new label.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, parseEmittedPath } from './cpsat-explicit-prefix-reference-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const h1QueriesFile = args.get('--h1-queries') ?? 'reports/stress/h1-event-feasibility-queries-2026-09-16.json';
const timeLimit = Number(args.get('--time-limit') ?? 60);
const outFile = args.get('--out') ?? 'reports/stress/dead-core-relaxation-results.json';

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const h1Doc = JSON.parse(readFileSync(h1QueriesFile, 'utf8'));
const deadStates = h1Doc.states.filter(s => s.exactLabel === 'dead');
const cases = [];
for (const s of deadStates) {
    const mustCrossAxes = [...new Set(s.queries.filter(q => q.type === 'cross-via').map(q => JSON.stringify(q.axis)))].map(x => JSON.parse(x));
    const mustPassCells = [...new Set(s.queries.filter(q => q.type === 'pass-via').map(q => JSON.stringify(q.cell)))].map(x => JSON.parse(x));
    for (const axis of mustCrossAxes) cases.push({ caseId: s.caseId, levelId: s.levelId, corpus: s.corpus, prefixXY: s.prefixXY, commitment: 'mustCross', cell: axis, relax: { mustCross: [axis] } });
    for (const cell of mustPassCells) cases.push({ caseId: s.caseId, levelId: s.levelId, corpus: s.corpus, prefixXY: s.prefixXY, commitment: 'mustPass', cell, relax: { mustPass: [cell] } });
}
console.log(`Dead-core relaxation diagnosis: ${cases.length} single-commitment relaxation queries across ${deadStates.length} DEAD states.`);

const rows = [];
for (const item of cases) {
    const prefixJson = JSON.stringify(item.prefixXY);
    const result = spawnSync('python3', [
        'scripts/stress/cpsat-reference-probe.py', item.levelId, String(timeLimit),
        '--emit-path', `--corpus=${item.corpus}`, `--prefix=${prefixJson}`, `--relax=${JSON.stringify(item.relax)}`,
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
    // IMPORTANT: unlike H1's queries (which ask about the REAL, unrelaxed rules and therefore need
    // referee agreement to trust a 'live' claim), a relaxed model is a deliberate hypothetical --
    // "if this one commitment didn't exist, would completion be possible?" A witness satisfying the
    // relaxed model is EXPECTED to fail the real referee whenever the relaxation actually mattered
    // (if it didn't need the relaxation, the original state could not have been exact-DEAD, which
    // this population already established). So a referee rejection here CONFIRMS the relaxed
    // commitment is part of a minimal causal core; it is not a correctness alarm. Only a witness
    // that the referee ACCEPTS despite the relaxation would be an alarm -- that would mean the
    // original DEAD label was wrong.
    const row = {
        caseId: item.caseId, levelId: item.levelId, commitment: item.commitment, cell: item.cell,
        cpSatStatus: classified.status ?? null, causesFlipToFeasible: classified.label === 'live',
        timeLimitSec: timeLimit, exitCode,
    };
    if (classified.label === 'live') {
        const emitted = parseEmittedPath(result.stdout ?? '');
        if (!emitted) { row.emittedPathMissing = true; }
        else {
            const rawDoc = JSON.parse(readFileSync(item.corpus, 'utf8'));
            const rawLevels = Array.isArray(rawDoc) ? rawDoc : rawDoc.levels;
            const raw = rawLevels.find(l => String(l.id) === String(item.levelId));
            const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
            const verdict = Solver.validateCandidatePath(level, emitted.map(([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16))));
            row.refereeValid = verdict.ok;
            // A relaxed witness the REAL referee accepts anyway contradicts this population's own
            // DEAD label -- that is the one genuine correctness alarm this diagnosis can surface.
            if (verdict.ok) row.correctnessAlarm = true;
        }
    } else if (classified.label === 'dead') {
        row.causesFlipToFeasible = false;
    } else {
        row.indeterminate = true;
    }
    rows.push(row);
    console.log(`${item.caseId} relax(${item.commitment} ${JSON.stringify(item.cell)}): cpSatStatus=${row.cpSatStatus}${row.causesFlipToFeasible ? ' (CAUSAL: flips to feasible)' : ''}`);
}

const document = {
    schemaVersion: 1, kind: 'dead-core-relaxation-diagnosis', generatedAt: new Date().toISOString(), solverRef,
    sourceH1Queries: h1QueriesFile, moonshot: 'reports/2026-09-16-assumption-breaking-solver-development-moonshots-001.md',
    summary: {
        total: rows.length,
        flippedToLive: rows.filter(r => r.causesFlipToFeasible === true).length,
        stayedDead: rows.filter(r => r.causesFlipToFeasible === false).length,
        indeterminate: rows.filter(r => r.indeterminate).length,
        correctnessAlarms: rows.filter(r => r.correctnessAlarm).length,
    },
    rows,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify(document.summary, null, 2));
