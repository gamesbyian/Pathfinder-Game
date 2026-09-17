#!/usr/bin/env node
/**
 * DEAD-core relaxation diagnosis on the fresh Class-5 sibling harvest (see
 * docs/solver-fresh-dead-sibling-harvest-preflight.md's "First consumer: DEAD-core confirmation").
 * Generalizes the exhausted-B2 dead-core-relaxation-diagnosis.mjs to the fresh harvest's own
 * per-state pending-obligation lists. For each DEAD state, relaxes exactly ONE pending must-cross
 * or must-pass commitment at a time via cpsat-reference-probe.py's --relax hook and checks whether
 * that single relaxation alone flips the state to feasible -- the same size-1 causal-core test, on
 * a materially larger, independent-parent population than the exhausted 4-state B2 set.
 *
 * Population: reads a merged {rows:[...]} document of already-labelled DEAD rows (raw-XY prefix,
 * from cpsat-explicit-prefix-reference.mjs's own output shape) plus the harvest's own per-state
 * pending-obligation metadata (packed keys) to build relax cases -- no new labelling of the base
 * states, only relaxed hypothetical queries on top of already-confirmed DEAD states.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { classifyProbeProcess, parseEmittedPath, unpackPackedCell } from './cpsat-explicit-prefix-reference-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const deadRowsFile = args.get('--dead-rows');
const harvestFile = args.get('--harvest');
const timeLimit = Number(args.get('--time-limit') ?? 45);
const shardIndex = Number(args.get('--shard-index') ?? 1);
const shardCount = Number(args.get('--shard-count') ?? 1);
const levelFilter = args.get('--levels') ? new Set(args.get('--levels').split(',')) : null;
const outFile = args.get('--out') ?? 'reports/stress/class5-fresh-dead-core-relaxation-results.json';
if (!deadRowsFile || !harvestFile) throw new Error('--dead-rows and --harvest are required');

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const solverRef = git('rev-parse', 'HEAD');

const deadRowsDoc = JSON.parse(readFileSync(deadRowsFile, 'utf8'));
const deadRows = (deadRowsDoc.rows ?? deadRowsDoc).filter(r => r.referenceLabel === 'dead');
const harvest = JSON.parse(readFileSync(harvestFile, 'utf8'));
const harvestByKey = new Map(harvest.rows.map(r => [`${r.levelId}:fresh-sibling-${r.siblingIndex}`, r]));

const cases = [];
for (const row of deadRows) {
    if (levelFilter && !levelFilter.has(row.levelId)) continue;
    const meta = harvestByKey.get(row.caseId);
    if (!meta) continue;
    const mustCrossCells = meta.mustCrossPending.map(unpackPackedCell);
    const mustPassCells = meta.mustPassPending.map(unpackPackedCell);
    for (const cell of mustCrossCells) cases.push({ caseId: row.caseId, levelId: row.levelId, corpus: row.corpus, prefixXY: row.prefix, commitment: 'mustCross', cell, relax: { mustCross: [cell] } });
    for (const cell of mustPassCells) cases.push({ caseId: row.caseId, levelId: row.levelId, corpus: row.corpus, prefixXY: row.prefix, commitment: 'mustPass', cell, relax: { mustPass: [cell] } });
}
const sharded = cases.filter((_, i) => i % shardCount === shardIndex - 1);
console.log(`Fresh DEAD-core relaxation shard ${shardIndex}/${shardCount}: ${sharded.length}/${cases.length} single-commitment queries across ${new Set(cases.map(c => c.caseId)).size} DEAD states.`);

const rows = [];
for (const item of sharded) {
    const prefixJson = JSON.stringify(item.prefixXY);
    const result = spawnSync('python3', [
        'scripts/stress/cpsat-reference-probe.py', item.levelId, String(timeLimit),
        '--emit-path', `--corpus=${item.corpus}`, `--prefix=${prefixJson}`, `--relax=${JSON.stringify(item.relax)}`,
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    const classified = classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
    // Same reasoning as dead-core-relaxation-diagnosis.mjs: a relaxed witness is EXPECTED to fail
    // the real referee whenever the relaxation genuinely mattered (the base state is already
    // confirmed exact-DEAD). Referee rejection under relaxation confirms causality; only a witness
    // the real referee accepts anyway would be a correctness alarm.
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
            if (verdict.ok) row.correctnessAlarm = true;
        }
    } else if (classified.label !== 'dead') {
        row.indeterminate = true;
    }
    rows.push(row);
    console.log(`${item.caseId} relax(${item.commitment} ${JSON.stringify(item.cell)}): cpSatStatus=${row.cpSatStatus}${row.causesFlipToFeasible ? ' (CAUSAL: flips to feasible)' : ''}`);
}

const document = {
    schemaVersion: 1, kind: 'class5-fresh-dead-core-relaxation-diagnosis', generatedAt: new Date().toISOString(), solverRef,
    sourceDeadRows: deadRowsFile, sourceHarvest: harvestFile, shardIndex, shardCount,
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
