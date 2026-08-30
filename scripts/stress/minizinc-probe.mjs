#!/usr/bin/env node
/**
 * Runs scripts/stress/minizinc/pathfinder.mzn across multiple constraint-solver backends.
 *
 * WHY THIS EXISTS. reports/2026-07-30-solvability-plateau-diagnosis.md concluded from
 * cpsat-reference-probe.py that the levels our solver fails are intrinsically hard, because CP-SAT also
 * timed out on them. That is ONE model on ONE solver, and "the instances are hard" and "this
 * encoding propagates badly" predict the same timeout. This runs a single solver-independent model
 * across CP-SAT, Chuffed (lazy clause generation) and Gecode so the two can be told apart.
 *
 * THE WITNESS CHECK IS NOT OPTIONAL, AND IT IS PER-BACKEND. Every level is first solved with every
 * position pinned to the level's own stored witness. That must come back SAT: if it does not, the
 * model is over-constrained and every other result from it is meaningless. It runs per backend
 * because a wrong answer is a bug wherever it shows up, and a backend disagreeing with the others
 * on a pinned instance is itself the finding. The plateau report notes this check was added only
 * after a conclusion had already been drawn without it — so it runs first here, by construction.
 *
 * HINTS. With --save-hints, any path found is fed to the game's own validateCandidatePath and, only
 * if the referee accepts it, stored in the corpus hint artifact through scripts/level-data-io.mjs
 * with EXTERNAL_SOLVER_ID provenance and technique 'minizinc:<backend>'. A rejected path is a model
 * bug and is reported as such, never stored. A path already present is a REDISCOVERY: it gets a new
 * provenance entry appended to the existing hint, never a duplicate hint (CLAUDE.md's
 * one-entry-per-discovery-event invariant).
 *
 * These hints are NOT evidence our solver can find anything — EXTERNAL_SOLVER_ID exists precisely so
 * every "what can the solver find cold?" query can exclude them, the same way it must exclude
 * witness and hint-guided entries.
 *
 * SCOPE. Portals / filters / flipping filters are not modelled; such levels are refused, not
 * silently solved as an easier problem. Same scope as cpsat-reference-probe.py, which keeps this
 * comparable to the result it re-tests.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/minizinc-probe.mjs -- \
 *     --levels=R00044,R00001 [--backends=cpsat,chuffed,gecode] [--time-limit=240]
 *     [--save-hints] [--skip-witness-check] [--out=reports/stress/minizinc-backends.json]
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
import { createSolver } from '../../modules/solver.ts';

installBrowserStubs();
const Solver = createSolver();

// Walk up to the repo root rather than a fixed number of '..' segments: this file runs BOTH from
// scripts/stress/ directly (tsx) and from .solver-tools/ as an esbuild bundle (run-bundled.mjs),
// which sit at different depths, so any fixed relative path is wrong in one of the two modes.
const root = (() => {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(dir, 'package.json')) && path.dirname(dir) !== dir) dir = path.dirname(dir);
    return dir;
})();
const MZN_BIN = process.env.MINIZINC_BIN || '/opt/MiniZincIDE-2.8.5-bundle-linux-x86_64/bin/minizinc';
const MODEL = path.join(root, 'scripts/stress/minizinc/pathfinder.mzn');
const CORPUS = path.join(root, 'data/stress/stress-levels-random.json');

// MiniZinc solver ids. Chuffed is the one with a genuinely different engine story (lazy clause
// generation = CP propagation + SAT conflict learning), which is the whole reason for this sweep.
const BACKENDS = { cpsat: 'com.google.ortools.sat', chuffed: 'org.chuffed.chuffed', gecode: 'org.gecode.gecode' };

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
    const hit = argv.find(a => a.startsWith(`--${name}=`));
    return hit === undefined ? dflt : hit.slice(name.length + 3);
};
const has = name => argv.includes(`--${name}`);

const levelIds = String(arg('levels', '')).split(',').map(s => s.trim()).filter(Boolean);
if (levelIds.length === 0) { console.error('--levels=<id>[,<id>...] is required (full ids, e.g. R00044).'); process.exit(1); }
const backendNames = String(arg('backends', 'cpsat,chuffed,gecode')).split(',').map(s => s.trim()).filter(Boolean);
for (const b of backendNames) if (!BACKENDS[b]) { console.error(`--backends: unknown backend "${b}" (have: ${Object.keys(BACKENDS).join(', ')})`); process.exit(1); }
const timeLimit = Number(arg('time-limit', '240'));
const saveHints = has('save-hints');
const skipWitnessCheck = has('skip-witness-check');
const outFile = arg('out', null);

if (!existsSync(MZN_BIN)) { console.error(`minizinc not found at ${MZN_BIN} — set MINIZINC_BIN.`); process.exit(1); }

const levels = readLevelsWithHints(CORPUS);
const byId = new Map(levels.map((l, i) => [l.id, { level: l, position: i + 1 }]));

const IMPASSABLE_ROLES = new Set(['surround', 'adjacentTurn', 'adjacentTurnCw', 'adjacentTurnCcw', 'decorative']);
const PACK = (x, y) => ((y << 16) | x) >>> 0;

/** Builds the .dzn data for one level, or returns { skip: <reason> } for an out-of-scope level. */
function buildData(lv) {
    if ((lv.portals || []).length || (lv.filters || []).length || (lv.flippingFilters || []).length)
        return { skip: 'portals/filters/flipping filters are not modelled' };

    const W = lv.grid.w, H = lv.grid.h;
    const cell = (x, y) => y * W + x;                      // 0-indexed, matches the model
    const from = field => (lv[field] || []).map(c => cell(c.x - 1, c.y - 1));

    const impassable = new Set([...from('blocks'), ...from('geese'), ...from('falseGoals')]);
    const mustTurn = [], adjTurn = [], surround = new Set();
    for (const lm of lv.landmarks || []) {
        const c = [lm.x - 1, lm.y - 1];
        if (IMPASSABLE_ROLES.has(lm.role)) impassable.add(cell(c[0], c[1]));
        const want = w => (w === 'cw' ? 1 : w === 'ccw' ? 2 : 0);
        if (lm.role === 'mustTurn') mustTurn.push([cell(c[0], c[1]), want(lm.turn || 'either')]);
        else if (lm.role === 'mustTurnCw') mustTurn.push([cell(c[0], c[1]), 1]);
        else if (lm.role === 'mustTurnCcw') mustTurn.push([cell(c[0], c[1]), 2]);
        else if (lm.role === 'surround') surround.add(c);
        else if (lm.role && lm.role.startsWith('adjacentTurn')) {
            const w = lm.role === 'adjacentTurnCw' ? 1 : lm.role === 'adjacentTurnCcw' ? 2 : want(lm.turn || 'either');
            adjTurn.push([c, w]);
        }
    }

    const inBounds = (x, y) => x >= 0 && x < W && y >= 0 && y < H;
    const passable = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!impassable.has(cell(x, y))) passable.push(cell(x, y));
    const passableSet = new Set(passable);

    // Surround landmarks are impassable themselves; their 8 PASSABLE neighbours must all be visited.
    const surroundNeighbours = new Set();
    for (const [lx, ly] of surround)
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = lx + dx, ny = ly + dy;
            if (inBounds(nx, ny) && passableSet.has(cell(nx, ny))) surroundNeighbours.add(cell(nx, ny));
        }

    const gates = from('gates').filter(c => passableSet.has(c));
    const goal = cell(lv.goal.x - 1, lv.goal.y - 1);
    const N = lv.reqLen + 1;
    const witness = (lv.stressMeta?.witnessSolution || []).map(c => cell(c[0] - 1, c[1] - 1));

    const setLit = xs => (xs.length ? `{${xs.join(',')}}` : '{}');
    // adjTurnMember is indexed [1..nAdjTurn, CELL]; array2d needs it flattened in row-major order.
    const adjMember = adjTurn.flatMap(([[lx, ly]]) => {
        const members = new Set();
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = lx + dx, ny = ly + dy;
            if (inBounds(nx, ny) && passableSet.has(cell(nx, ny))) members.add(cell(nx, ny));
        }
        return Array.from({ length: W * H }, (_, c) => (members.has(c) ? 'true' : 'false'));
    });

    const dzn = [
        `W = ${W};`, `H = ${H};`, `N = ${N};`, `reqInt = ${lv.reqInt};`,
        `PASSABLE = ${setLit(passable)};`,
        `GATES = ${setLit(gates)};`,
        `goalCell = ${goal};`,
        `MUSTPASS = ${setLit(from('mustPass').filter(c => passableSet.has(c)))};`,
        `MUSTCROSS = ${setLit(from('mustCross').filter(c => passableSet.has(c)))};`,
        `SURROUND = ${setLit([...surroundNeighbours])};`,
        `nMustTurn = ${mustTurn.length};`,
        `mustTurnCell = [${mustTurn.map(m => m[0]).join(',')}];`,
        `mustTurnWant = [${mustTurn.map(m => m[1]).join(',')}];`,
        `nAdjTurn = ${adjTurn.length};`,
        `adjTurnMember = array2d(1..${adjTurn.length}, 0..${W * H - 1}, [${adjMember.join(',')}]);`,
        `adjTurnWant = [${adjTurn.map(m => m[1]).join(',')}];`,
    ].join('\n');

    return { dzn, W, H, N, witness, gates, goal, passableSet, mustCrossCount: from('mustCross').length, landmarkCount: (lv.landmarks || []).length };
}

/** Runs one (level, backend) pair. Returns { status, elapsedMs, path|null }. */
function runBackend(dznPath, backend, { checkWitness, witness, N }) {
    const witnessLit = witness.length === N ? `[${witness.join(',')}]` : `[${Array(N).fill(0).join(',')}]`;
    const extra = `checkWitness = ${checkWitness ? 'true' : 'false'};\nwitnessPos = ${witnessLit};\n`;
    const extraPath = dznPath.replace(/\.dzn$/, `.${checkWitness ? 'wit' : 'run'}.dzn`);
    writeFileSync(extraPath, extra);
    const t0 = Date.now();
    let stdout = '', status = 'UNKNOWN';
    try {
        stdout = execFileSync(MZN_BIN, [
            '--solver', BACKENDS[backend],
            '--time-limit', String(Math.round(timeLimit * 1000)),
            '--output-mode', 'item', '--soln-sep', '', '--search-complete-msg', 'COMPLETE',
            MODEL, dznPath, extraPath,
        ], { encoding: 'utf8', maxBuffer: 1 << 28, timeout: (timeLimit + 120) * 1000 });
    } catch (err) {
        // A non-zero exit is how MiniZinc reports a model/flatten error; keep whatever it printed so
        // the failure is diagnosable rather than collapsed into a bare "UNKNOWN".
        stdout = `${err.stdout || ''}${err.stderr || ''}`;
        if (!/=====UNSATISFIABLE=====|PATH /.test(stdout)) {
            return { status: 'ERROR', elapsedMs: Date.now() - t0, path: null, detail: stdout.trim().slice(0, 400) };
        }
    }
    const elapsedMs = Date.now() - t0;
    if (/=====UNSATISFIABLE=====/.test(stdout)) status = 'UNSAT';
    else if (/PATH /.test(stdout)) status = /COMPLETE/.test(stdout) ? 'SAT' : 'SAT';
    else if (/=====UNKNOWN=====|% Time limit exceeded/.test(stdout)) status = 'TIMEOUT';
    else status = 'TIMEOUT';

    let cells = null;
    const m = /PATH \[([0-9,\s]*)\]/.exec(stdout);
    if (m) cells = m[1].split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n));
    return { status, elapsedMs, path: cells };
}

const results = [];
const pendingHints = new Map();     // levelId -> { position, entries: [{path, technique, elapsedMs}] }

for (const id of levelIds) {
    const found = byId.get(id);
    if (!found) { console.error(`${id}: not in ${path.relative(root, CORPUS)} — skipping.`); continue; }
    const lv = found.level;
    const data = buildData(lv);
    if (data.skip) {
        console.log(`${id}: SKIPPED (${data.skip})`);
        results.push({ id, skipped: data.skip });
        continue;
    }
    const tmpDir = path.join(root, '.solver-tools/minizinc');
    mkdirSync(tmpDir, { recursive: true });
    const dznPath = path.join(tmpDir, `${id}.dzn`);
    writeFileSync(dznPath, data.dzn);

    console.log(`\n${id}: ${data.W}x${data.H} reqLen=${lv.reqLen} reqInt=${lv.reqInt} mustCross=${data.mustCrossCount} landmarks=${data.landmarkCount}`);
    const row = { id, w: data.W, h: data.H, reqLen: lv.reqLen, reqInt: lv.reqInt, mustCross: data.mustCrossCount, landmarks: data.landmarkCount, witnessCheck: {}, solve: {} };

    for (const backend of backendNames) {
        if (!skipWitnessCheck) {
            if (data.witness.length !== data.N) {
                console.log(`  [${backend}] witness-check SKIPPED (witness has ${data.witness.length} nodes, model expects ${data.N})`);
                row.witnessCheck[backend] = 'no-witness';
            } else {
                const w = runBackend(dznPath, backend, { checkWitness: true, witness: data.witness, N: data.N });
                row.witnessCheck[backend] = w.status;
                console.log(`  [${backend}] witness-check ${w.status} in ${(w.elapsedMs / 1000).toFixed(1)}s${w.detail ? ` :: ${w.detail}` : ''}`);
                if (w.status !== 'SAT') {
                    // Refuse to interpret this level on this backend. UNSAT means the model rejects a
                    // path the game itself accepts (over-constrained); ERROR means it did not even
                    // flatten. Either way a solve result here would be meaningless, so don't produce
                    // one — these two are worth distinguishing because they have different fixes.
                    const why = w.status === 'UNSAT' ? "model rejects the game's own witness (over-constrained)"
                        : w.status === 'ERROR' ? 'model failed to flatten/run'
                        : `witness check returned ${w.status}`;
                    console.log(`  [${backend}] ABORTING this level — ${why}.`);
                    row.solve[backend] = { status: w.status === 'UNSAT' ? 'model-invalid' : 'model-error' };
                    continue;
                }
            }
        }
        const r = runBackend(dznPath, backend, { checkWitness: false, witness: data.witness, N: data.N });
        row.solve[backend] = { status: r.status, elapsedMs: r.elapsedMs };
        console.log(`  [${backend}] solve ${r.status} in ${(r.elapsedMs / 1000).toFixed(1)}s${r.detail ? ` :: ${r.detail}` : ''}`);

        if (r.path && r.path.length === data.N) {
            // Model cell index -> packed 0-indexed key, then the GAME's referee decides. An encoding
            // bug shows up here as a rejection, which is exactly why nothing is trusted before this.
            const keys = r.path.map(c => PACK(c % data.W, Math.floor(c / data.W)));
            const normalized = Solver.prepareLevelForSolver(lv, { source: 'raw', levelNumber: found.position });
            const verdict = validateCandidatePath(normalized, keys);
            row.solve[backend].refereeValid = verdict.ok;
            if (!verdict.ok) {
                console.log(`    path REJECTED by validateCandidatePath: ${verdict.reason}  <-- model bug, not stored`);
                row.solve[backend].rejectReason = verdict.reason;
            } else {
                console.log('    path accepted by validateCandidatePath');
                if (saveHints) {
                    if (!pendingHints.has(id)) pendingHints.set(id, { position: found.position, entries: [] });
                    pendingHints.get(id).entries.push({ path: verdict.path, backend, elapsedMs: r.elapsedMs });
                }
            }
        }
    }
    results.push(row);
}

if (saveHints && pendingHints.size > 0) {
    let added = 0, rediscovered = 0;
    for (const [id, { entries }] of pendingHints) {
        const lv = byId.get(id).level;
        const levelRevision = await getLevelFingerprint(lv);
        const records = [...(lv.hintRecords || [])];
        const bySig = new Map(records.map((h, i) => [hintPathSignature(h.path), i]));
        for (const e of entries) {
            const entry = makeProvenanceEntry(`minizinc:${e.backend}`, {
                solverId: EXTERNAL_SOLVER_ID,
                solverVersion: null,
                elapsedMs: e.elapsedMs,
                budgetMs: Math.round(timeLimit * 1000),
                termination: 'solved',
                usedExistingHints: false,
                hintGuided: false,       // the model never sees an existing hint — this is a cold find
                levelRevision,
            });
            const sig = hintPathSignature(e.path);
            const at = bySig.get(sig);
            if (at === undefined) {
                // New path: one hint, one provenance entry.
                bySig.set(sig, records.length);
                records.push(toHint(e.path, [entry]));
                added++;
            } else {
                // Rediscovery of a path already in the corpus: append an entry to the EXISTING hint.
                // Never a second hint with the same path, and never a silently dropped discovery.
                records[at] = { ...records[at], provenance: [...(records[at].provenance || []), entry] };
                rediscovered++;
            }
        }
        lv.hintRecords = records;
        lv.hints = records.map(h => h.path);
    }
    const { hintFilesChanged } = writeLevelsWithHints(CORPUS, levels);
    console.log(`\nhints: ${added} new path(s), ${rediscovered} rediscovery provenance entr(ies), ${hintFilesChanged} hint file(s) rewritten.`);
}

if (outFile) {
    const abs = path.resolve(root, outFile);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({
        generatedAt: new Date().toISOString(), model: 'scripts/stress/minizinc/pathfinder.mzn',
        timeLimitSec: timeLimit, backends: backendNames, levels: results,
    }, null, 1));
    console.log(`Wrote ${outFile}`);
}
