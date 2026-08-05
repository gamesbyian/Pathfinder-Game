#!/usr/bin/env node
/**
 * Harvests referee-validated hints from scripts/stress/cpsat-full-probe.py.
 *
 * WHY THIS AND NOT THE MINIZINC PROBE. minizinc-probe.mjs was built to compare CP-SAT / Chuffed /
 * Gecode on one solver-independent model. That model passes the witness check on all three backends
 * in ~1s and then times out at 90s on levels the hand-rolled Python CP-SAT model solves in 7-19s —
 * i.e. it is correct but propagates far too weakly to search with. Until that encoding gap is
 * closed, the Python probe is the only external model here that actually finds paths, so it is the
 * one wired to the hint corpus. See reports/2026-07-31-minizinc-backend-comparison.md.
 *
 * WHAT IS AND IS NOT CLAIMED. A path stored by this script is a genuine, referee-validated hint. It
 * is NOT evidence our solver can find anything: nothing in modules/solver/ participated. That is
 * exactly why it is stored under EXTERNAL_SOLVER_ID with technique 'cpsat-full-probe', so every
 * "what can the solver find cold?" query can exclude it the same way it must already exclude
 * witness and hint-guided entries (CLAUDE.md's provenance section).
 *
 * The referee is the gate: every emitted path goes through the game's own validateCandidatePath
 * before storage, so an encoding bug in the Python model surfaces as a REJECTED path rather than a
 * corrupt hint. A path already in the corpus is a REDISCOVERY — it appends a provenance entry to the
 * existing hint rather than creating a duplicate (CLAUDE.md's one-entry-per-discovery-event rule).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/cpsat-hint-harvest.mjs -- \
 *     --levels=R03360,R03196 [--time-limit=120] [--save-hints] [--out=reports/...json]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readLevelsWithHints, writeLevelsWithHints } from '../level-data-io.mjs';
import { validateCandidatePath } from '../../modules/domain/path-validator.ts';
import { getLevelFingerprint } from '../../modules/domain/level-fingerprint.ts';
import { EXTERNAL_SOLVER_ID, hintPathSignature, makeProvenanceEntry, toHint } from '../../modules/domain/hint-types.ts';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver } from '../../modules/Solver.ts';

installBrowserStubs();
const Solver = createSolver();

const root = (() => {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(dir, 'package.json')) && path.dirname(dir) !== dir) dir = path.dirname(dir);
    return dir;
})();
const PROBE = path.join(root, 'scripts/stress/cpsat-full-probe.py');
const CORPUS = path.join(root, 'data/stress/stress-levels-random.json');

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const levelIds = String(arg('levels', '')).split(',').map(s => s.trim()).filter(Boolean);
if (!levelIds.length) { console.error('--levels=<id>[,<id>...] is required.'); process.exit(1); }
const timeLimit = Number(arg('time-limit', '120'));
const saveHints = argv.includes('--save-hints');
const outFile = arg('out', null);

const levels = readLevelsWithHints(CORPUS);
const byId = new Map(levels.map((l, i) => [l.id, { level: l, position: i + 1 }]));

const results = [];
const pending = new Map();

for (const id of levelIds) {
    const found = byId.get(id);
    if (!found) { console.error(`${id}: not in the corpus — skipping.`); continue; }

    const t0 = Date.now();
    let out = '';
    try {
        out = execFileSync('python3', [PROBE, id, String(timeLimit), '--emit-path'],
            { encoding: 'utf8', cwd: root, maxBuffer: 1 << 28, timeout: (timeLimit + 120) * 1000 });
    } catch (err) {
        // exit 3 is the probe's own "out of scope" signal (filters/flipping filters -- portals
        // are encoded as of 2026-08-05, see cpsat-full-probe.py's own validation-status note).
        out = `${err.stdout || ''}${err.stderr || ''}`;
        if (err.status === 3) { console.log(`${id}: SKIPPED (out of model scope)`); results.push({ id, status: 'out-of-scope' }); continue; }
    }
    const elapsedMs = Date.now() - t0;
    const statusLine = (out.split('\n').find(l => l.startsWith(`${id}:`)) || '').trim();
    const solved = /-> (OPTIMAL|FEASIBLE)/.test(statusLine);
    console.log(`${statusLine || `${id}: no status line`}`);

    const row = { id, elapsedMs, solved, status: /-> (\w+)/.exec(statusLine)?.[1] || 'UNKNOWN' };
    const m = /^PATH (\[.*\])$/m.exec(out);
    if (solved && m) {
        // The probe emits 1-indexed [x,y] pairs; validateCandidatePath accepts that shape directly
        // and returns canonical packed keys. The GAME decides — not this script, and not the model.
        const pairs = JSON.parse(m[1]);
        const normalized = Solver.prepareLevelForSolver(found.level, { source: 'raw', levelNumber: found.position });
        const verdict = validateCandidatePath(normalized, pairs);
        row.refereeValid = verdict.ok;
        if (!verdict.ok) {
            console.log(`  path REJECTED by validateCandidatePath: ${verdict.reason}  <-- model bug, not stored`);
            row.rejectReason = verdict.reason;
        } else {
            const sig = hintPathSignature(verdict.path);
            const known = new Set((found.level.hintRecords || []).map(h => hintPathSignature(h.path)));
            row.novel = !known.has(sig);
            console.log(`  path accepted by the referee — ${row.novel ? 'NOVEL' : 'already in the corpus (rediscovery)'}`);
            if (saveHints) {
                if (!pending.has(id)) pending.set(id, []);
                pending.get(id).push({ path: verdict.path, elapsedMs });
            }
        }
    }
    results.push(row);
}

if (saveHints && pending.size > 0) {
    let added = 0, rediscovered = 0;
    for (const [id, entries] of pending) {
        const lv = byId.get(id).level;
        const levelRevision = await getLevelFingerprint(lv);
        const records = [...(lv.hintRecords || [])];
        const bySig = new Map(records.map((h, i) => [hintPathSignature(h.path), i]));
        for (const e of entries) {
            const entry = makeProvenanceEntry('cpsat-full-probe', {
                solverId: EXTERNAL_SOLVER_ID,
                elapsedMs: e.elapsedMs,
                budgetMs: Math.round(timeLimit * 1000),
                termination: 'solved',
                usedExistingHints: false,
                hintGuided: false,   // the model never sees a stored hint — this is a cold find
                levelRevision,
            });
            const sig = hintPathSignature(e.path);
            const at = bySig.get(sig);
            if (at === undefined) { bySig.set(sig, records.length); records.push(toHint(e.path, [entry])); added++; }
            else { records[at] = { ...records[at], provenance: [...(records[at].provenance || []), entry] }; rediscovered++; }
        }
        lv.hintRecords = records;
        lv.hints = records.map(h => h.path);
    }
    const { hintFilesChanged } = writeLevelsWithHints(CORPUS, levels);
    console.log(`\nhints: ${added} new path(s), ${rediscovered} rediscovery entr(ies), ${hintFilesChanged} file(s) rewritten.`);
}

if (outFile) {
    const abs = path.resolve(root, outFile);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ generatedAt: new Date().toISOString(), timeLimitSec: timeLimit, levels: results }, null, 1));
    console.log(`Wrote ${outFile}`);
}
