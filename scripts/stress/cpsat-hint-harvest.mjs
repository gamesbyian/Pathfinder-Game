#!/usr/bin/env node
/**
 * Harvests referee-validated hints from scripts/stress/cpsat-reference-probe.py.
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
 * exactly why it is stored under EXTERNAL_SOLVER_ID with technique 'cpsat-reference-probe', so every
 * "what can the solver find cold?" query can exclude it the same way it must already exclude
 * witness and hint-guided entries (CLAUDE.md's provenance section).
 *
 * The referee is the gate: every emitted path goes through the game's own validateCandidatePath
 * before storage, so an encoding bug in the Python model surfaces as a REJECTED path rather than a
 * corrupt hint. A path already in the corpus is a REDISCOVERY — it appends a provenance entry to the
 * existing hint rather than creating a duplicate (CLAUDE.md's one-entry-per-discovery-event rule).
 *
 * FORCED-GRID MODE (2026-08-05, --forced-grid). A single unforced cpsat-reference-probe.py call finds AT
 * MOST one path per level (CP-SAT stops at the first feasible solution). The real solver's own
 * hint-discovery tooling (scripts/hint-workbench.mjs) gets breadth instead by forcing structural
 * choices the solver would otherwise make freely — which gate, which first step, which portal and
 * which side of it, which cell it exits to — and treating each forced combination as an independent
 * search. `--forced-grid` does the analogous thing for CP-SAT via `cpsat-reference-probe.py --prefix=`
 * (already built for prune-gap-probe.mjs's prefix-feasibility queries — no probe changes needed):
 *
 *   Tier 1 — gate x first-step direction. Every (gate, legal first neighbor) pair, enumerated via
 *   the REAL getNeighbors/createState (same primitives hint-workbench's enumerateFirstSteps uses),
 *   so "legal" means what the actual game rules say, not a raw grid-adjacency guess.
 *   Tier 2 — portal use-direction x exit-direction (portal-bearing levels only). For each portal
 *   pair and each direction of traversal (A→B and B→A), a shortest STATIC walk (plain BFS avoiding
 *   blocks/geese/false-goals/other portals — dynamic legality is deliberately NOT modeled here,
 *   since CP-SAT and the referee both re-check real feasibility regardless; an unreachable or
 *   illegal guess just wastes one call, never produces a wrong hint) from the level's first gate to
 *   the entry terminal, forced through the jump, optionally extended one more cell for each of the
 *   exit terminal's orthogonal neighbors (the "exit direction" cross product).
 *
 * Combos are capped at `--max-combos` (gate x direction first, portal combos filling the remainder)
 * — an unbounded full cross product was deliberately rejected by hint-workbench.mjs's own design
 * principle 4 ("dangerous full Cartesian products require explicit, budgeted opt-in"), and the same
 * discipline applies here: breadth is worth pursuing, an uncapped product per level is not. Each
 * combo's provenance is tagged with the SAME forcingGateKey/forcingDirection/forcingPortalDest/
 * forcingPortalExitDirection fields the native solver's own forced techniques use
 * (modules/domain/hint-types.ts's HintSolverForcing) — a forced CP-SAT find is recorded exactly the
 * way a forced native-solver find already is, not a bespoke shape.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/cpsat-hint-harvest.mjs -- \
 *     --levels=R03360,R03196 [--time-limit=120] [--save-hints] [--out=reports/...json]
 *     [--forced-grid] [--combo-time-limit=40] [--max-combos=16]
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
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.ts';
import { UNPACK } from '../../modules/domain/cell-key.ts';

installBrowserStubs();
const Solver = createSolver();
const { createState, getNeighbors } = await import('../../modules/solver/search-state.js');

const root = (() => {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(dir, 'package.json')) && path.dirname(dir) !== dir) dir = path.dirname(dir);
    return dir;
})();
const PROBE = path.join(root, 'scripts/stress/cpsat-reference-probe.py');

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const levelIds = String(arg('levels', '')).split(',').map(s => s.trim()).filter(Boolean);
if (!levelIds.length) { console.error('--levels=<id>[,<id>...] is required.'); process.exit(1); }
const timeLimit = Number(arg('time-limit', '120'));
const saveHints = argv.includes('--save-hints');
const outFile = arg('out', null);
const forcedGrid = argv.includes('--forced-grid');
const comboTimeLimit = Number(arg('combo-time-limit', '40'));
const maxCombos = Number(arg('max-combos', '16'));
const corpusFile = arg('corpus', 'data/stress/stress-levels-random.json');
const CORPUS = path.join(root, corpusFile);

const levels = readLevelsWithHints(CORPUS);
const byId = new Map(levels.map((l, i) => [l.id, { level: l, position: i + 1 }]));

const xy = k => { const p = UNPACK(k); return [p.x + 1, p.y + 1]; };

/** Every legal first step from `gateKey`, via the real getNeighbors/createState — not a raw
 *  grid-adjacency guess, so "legal" already accounts for blocks/filters/axis rules at the gate. */
function enumerateFirstSteps(level, gateKey) {
    const gateLevel = { ...level, gateKeys: [gateKey] };
    const prep = SOLVER_TESTING_API.prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep);
}

/** Plain BFS shortest path over the STATIC grid (blocks/geese/false-goals/other-portal-cells
 *  excluded as waypoints — stepping onto an unrelated portal would force an unintended jump).
 *  Deliberately ignores dynamic legality (axis reuse, filters, turn rules): this only constructs a
 *  PLAUSIBLE prefix to hand to CP-SAT, which — like the referee afterward — independently verifies
 *  real feasibility. An unreachable or illegal guess here just wastes one combo, never a wrong hint. */
function shortestStaticPath(level, fromKey, toKey) {
    if (fromKey === toKey) return [fromKey];
    const { w, h } = level.grid;
    const visited = new Set([fromKey]);
    const parent = new Map();
    const queue = [fromKey];
    for (let qi = 0; qi < queue.length; qi++) {
        const k = queue[qi];
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const nk = ((ny << 16) | nx) >>> 0;
            if (visited.has(nk)) continue;
            if (level.blockSet.has(nk) || level.gooseSet.has(nk) || level.falseGoalKeys.has(nk)) continue;
            if (level.portalMap.has(nk) && nk !== toKey) continue;
            visited.add(nk);
            parent.set(nk, k);
            if (nk === toKey) {
                const p = [nk];
                for (let cur = nk; cur !== fromKey;) { cur = parent.get(cur); p.push(cur); }
                return p.reverse();
            }
            queue.push(nk);
        }
    }
    return null;
}

/** Static (non-dynamic-checked) orthogonal neighbors of `key`, for the exit-direction cross
 *  product — see shortestStaticPath's comment on why a static approximation is safe here. */
function staticNeighbors(level, key) {
    const { w, h } = level.grid;
    const x = key & 0xFFFF, y = (key >>> 16) & 0xFFFF;
    const out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nk = ((ny << 16) | nx) >>> 0;
        if (level.blockSet.has(nk) || level.gooseSet.has(nk) || level.falseGoalKeys.has(nk)) continue;
        out.push(nk);
    }
    return out;
}

function buildCombos(raw, level, cap) {
    const combos = [];
    for (const gateKey of level.gateKeys) {
        for (const stepKey of enumerateFirstSteps(level, gateKey)) {
            combos.push({ prefixKeys: [gateKey, stepKey], forcing: { forcingGateKey: gateKey, forcingDirection: stepKey } });
        }
    }
    const portals = raw.portals || [];
    if (portals.length && level.gateKeys.length) {
        const primaryGate = level.gateKeys[0];
        for (const pair of portals) {
            const aKey = ((pair.y1 - 1) << 16 | (pair.x1 - 1)) >>> 0;
            const bKey = ((pair.y2 - 1) << 16 | (pair.x2 - 1)) >>> 0;
            for (const [srcKey, destKey] of [[aKey, bKey], [bKey, aKey]]) {
                const approach = shortestStaticPath(level, primaryGate, srcKey);
                if (!approach) continue;
                const basePrefix = [...approach, destKey];
                combos.push({ prefixKeys: basePrefix, forcing: { forcingGateKey: primaryGate, forcingPortalDest: destKey } });
                for (const exitKey of staticNeighbors(level, destKey)) {
                    if (exitKey === srcKey) continue;   // straight back across the pair -- degenerate
                    combos.push({
                        prefixKeys: [...basePrefix, exitKey],
                        forcing: { forcingGateKey: primaryGate, forcingPortalDest: destKey, forcingPortalExitDirection: exitKey },
                    });
                }
            }
        }
    }
    return combos.slice(0, cap);
}

const results = [];
const pending = new Map();   // id -> [{ path, elapsedMs, budgetMs, forcing }]

function runOneAttempt(id, found, label, prefixKeys, timeLimitForThis, forcing, knownSigs) {
    const t0 = Date.now();
    const args = [PROBE, id, String(timeLimitForThis), '--emit-path', `--corpus=${corpusFile}`];
    if (prefixKeys) args.push(`--prefix=${JSON.stringify(prefixKeys.map(xy))}`);
    let out = '';
    try {
        out = execFileSync('python3', args, { encoding: 'utf8', cwd: root, maxBuffer: 1 << 28, timeout: (timeLimitForThis + 120) * 1000 });
    } catch (err) {
        out = `${err.stdout || ''}${err.stderr || ''}`;
        if (err.status === 3) { results.push({ id, label, status: 'out-of-scope' }); return 'out-of-scope'; }
    }
    const elapsedMs = Date.now() - t0;
    const statusLine = (out.split('\n').find(l => l.startsWith(`${id}:`)) || '').trim();
    const solved = /-> (OPTIMAL|FEASIBLE)/.test(statusLine);
    console.log(`  [${label}] ${statusLine || `${id}: no status line`}`);

    const row = { id, label, elapsedMs, solved, status: /-> (\w+)/.exec(statusLine)?.[1] || 'UNKNOWN' };
    const m = /^PATH (\[.*\])$/m.exec(out);
    if (solved && m) {
        const pairs = JSON.parse(m[1]);
        const normalized = Solver.prepareLevelForSolver(found.level, { source: 'raw', levelNumber: found.position });
        const verdict = validateCandidatePath(normalized, pairs);
        row.refereeValid = verdict.ok;
        if (!verdict.ok) {
            console.log(`    path REJECTED by validateCandidatePath: ${verdict.reason}  <-- model bug, not stored`);
            row.rejectReason = verdict.reason;
        } else {
            const sig = hintPathSignature(verdict.path);
            row.novel = !knownSigs.has(sig);
            console.log(`    accepted by the referee — ${row.novel ? 'NOVEL' : 'rediscovery'}`);
            if (row.novel) {
                knownSigs.add(sig);
                if (saveHints) {
                    if (!pending.has(id)) pending.set(id, []);
                    pending.get(id).push({ path: verdict.path, elapsedMs, budgetMs: Math.round(timeLimitForThis * 1000), forcing });
                }
            }
        }
    }
    results.push(row);
    return row.status;
}

for (const id of levelIds) {
    const found = byId.get(id);
    if (!found) { console.error(`${id}: not in the corpus — skipping.`); continue; }
    const knownSigs = new Set((found.level.hintRecords || []).map(h => hintPathSignature(h.path)));

    const baselineStatus = runOneAttempt(id, found, 'baseline', null, timeLimit, {}, knownSigs);
    if (baselineStatus === 'out-of-scope') continue;

    if (forcedGrid) {
        const normalized = Solver.prepareLevelForSolver(found.level, { source: 'raw', levelNumber: found.position });
        const combos = buildCombos(found.level, normalized, maxCombos);
        console.log(`  ${id}: ${combos.length} forced combo(s) (cap ${maxCombos})`);
        for (let i = 0; i < combos.length; i++) {
            const { prefixKeys, forcing } = combos[i];
            runOneAttempt(id, found, `combo ${i + 1}/${combos.length}`, prefixKeys, comboTimeLimit, forcing, knownSigs);
        }
    }
}

if (saveHints && pending.size > 0) {
    let added = 0, rediscovered = 0;
    for (const [id, entries] of pending) {
        const lv = byId.get(id).level;
        const levelRevision = await getLevelFingerprint(lv);
        const records = [...(lv.hintRecords || [])];
        const bySig = new Map(records.map((h, i) => [hintPathSignature(h.path), i]));
        for (const e of entries) {
            const entry = makeProvenanceEntry('cpsat-reference-probe', {
                solverId: EXTERNAL_SOLVER_ID,
                elapsedMs: e.elapsedMs,
                budgetMs: e.budgetMs,
                termination: 'solved',
                usedExistingHints: false,
                hintGuided: false,   // the model never sees a stored hint -- this is a cold find
                levelRevision,
                ...e.forcing,
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
    writeFileSync(abs, JSON.stringify({ generatedAt: new Date().toISOString(), timeLimitSec: timeLimit, forcedGrid, comboTimeLimit, maxCombos, levels: results }, null, 1));
    console.log(`Wrote ${outFile}`);
}
