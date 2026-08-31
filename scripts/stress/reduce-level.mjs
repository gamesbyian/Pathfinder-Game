#!/usr/bin/env node
/**
 * Automatic level reducer (docs/solver-dev-tooling-plan.md Component G) — shrinks a stress-corpus
 * level toward a minimal reproducing example of whatever solver behavior made it interesting
 * (timeout, wrong-path, exception, excessive node count), via classic delta-debugging (ddmin),
 * specialized to this domain via a witness-guided free-shrink pass first.
 *
 * Two phases, run in order:
 *
 *   1. Witness-guided free shrink — NEVER invokes the production solver. Removes one row/column
 *      (from whichever grid edge is furthest from the witness path) or one off-witness object at
 *      a time, re-validating after EVERY single step via schema (validateRawLevel) + referee
 *      (Solver.validateCandidatePath) against the correspondingly-translated witness — both cheap
 *      and deterministic. Safe by construction: an object the witness never touches cannot affect
 *      the witness's own validity, and grid cells outside its (margin-padded) bounding box are
 *      never visited by it either — but each step is still independently re-validated rather than
 *      assumed safe, since that assumption is exactly the kind of reasoning that's wrong once.
 *
 *   2. Solver-in-the-loop shrink — 1-minimal delta-debugging (deliberately not the full
 *      hierarchical ddmin algorithm: with at most a few dozen objects/rows/cols per level, there's
 *      no benefit to chunk-based acceleration — trying every single-element removal to a fixed
 *      point is already fast at this scale). Each candidate removal is accepted only if the
 *      production solver still reproduces the SAME interestingness signature (status category),
 *      checked via Solver.solveLevel's nodeBudget option (orchestration.ts) rather than wall-clock,
 *      consistent with this session's finding that wall-clock timing is unreliable in
 *      CPU-throttled environments.
 *
 * Termination: monotonically decreasing in (grid area + object count + reqLen) — guarantees the
 * loop ends. A genuine fixed point (no further defined step survives re-validation) is reported
 * distinctly from hitting --max-iterations first — the tool never claims a capped-out candidate
 * is provably minimal.
 *
 * Run via the esbuild wrapper (imports the TS solver):
 *   node scripts/run-bundled.mjs scripts/stress/reduce-level.mjs
 *       --corpus=data/stress/stress-levels-random.json --id=R0648
 *       [--node-budget=15000000] [--time-budget-ms=30000] [--work-budget=<1.34x node-budget>] [--max-iterations=500]
 *       [--target-signature=timeout|failed|node-budget-reached|invalid-path|error]
 *       [--out=<file>]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_ID = args.get('--id');
const NODE_BUDGET = Number(args.get('--node-budget') || 15_000_000);
const TIME_BUDGET_MS = Number(args.get('--time-budget-ms') || 30000);
// Without an explicit workBudget, Solver.solveLevel() derives one from TIME_BUDGET_MS alone (x
// DEFAULT_WORK_PER_MS, orchestration.ts) -- at this tool's defaults that's ~100.5M work units
// against a 15M node ceiling, a 6.7x ratio loose enough that the ladder's own per-attempt
// fair-division doesn't bind before a single early attempt does: confirmed directly (2026-08-06),
// a level's first-tried config claimed 59-65% of the node budget with 14/17 later attempts getting
// exactly 0 -- the same starvation shape (just milder) that motivated
// ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION and the solver-stress-refresh.yml --work-budget fix (see
// reports/2026-08-06-near-twin-starvation-fix.md). That under-tests most techniques before this
// tool accepts a "still reproduces" verdict, which can shrink a level to something that merely
// stayed unsolved because most of the ladder never got a turn, not because it's genuinely minimal.
// 1.34x matches the same validated ratio used elsewhere (solver-typical-budget-baseline.yml's
// 26,800,000/20,000,000 and 67,000,000/50,000,000, itself DEFAULT_WORK_PER_MS x 8000ms/20,000,000
// nodes) rather than a new number invented for this tool.
const WORK_BUDGET = args.has('--work-budget') ? Number(args.get('--work-budget')) : Math.round(NODE_BUDGET * 1.34);
const MAX_ITERATIONS = Number(args.get('--max-iterations') || 500);
const TARGET_SIGNATURE_OVERRIDE = args.get('--target-signature') || null;
const OUT_FILE = args.get('--out') || null;

if (!LEVEL_ID) {
    console.error('Usage: reduce-level.mjs --corpus=<file> --id=<levelId> [--node-budget=15000000] ' +
        '[--time-budget-ms=30000] [--max-iterations=500] [--target-signature=...] [--out=<file>]');
    process.exit(2);
}

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { validateRawLevel } = await import('../../modules/domain/level-schema.js');
const Solver = createSolver();
const { PACK } = SOLVER_TESTING_API;

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const entry = corpus.levels.find((l) => l.id === LEVEL_ID);
if (!entry) { console.error(`Level ${LEVEL_ID} not found in ${CORPUS_FILE}`); process.exit(2); }
const witnessRaw = entry.stressMeta?.witnessSolution;
if (!Array.isArray(witnessRaw) || witnessRaw.length < 2) {
    console.error(`Level ${LEVEL_ID} has no usable witnessSolution — phase 1 needs one.`);
    process.exit(2);
}
const { id: _id, stressMeta: _stressMeta, ...originalRaw } = entry;
void _id; void _stressMeta;

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const deepClone = (x) => JSON.parse(JSON.stringify(x));

function validateSchema(raw) {
    try { return validateRawLevel(raw).ok; } catch { return false; }
}

function witnessToPackedKeys(witnessPath) {
    return witnessPath.map(([x, y]) => PACK(x - 1, y - 1));
}

/** Phase 1's ONLY validation: schema + the real PLAY referee against the witness. Never solves. */
function validateWitnessAgainstRaw(raw, witnessPath) {
    if (!validateSchema(raw)) return false;
    let level;
    try { level = Solver.prepareLevelForSolver(raw, { source: 'raw' }); }
    catch { return false; }
    try {
        const check = Solver.validateCandidatePath(level, witnessToPackedKeys(witnessPath));
        return !!check.ok;
    } catch { return false; }
}

async function solveAndClassify(raw, { mainLoopOnly = false } = {}) {
    let level;
    try { level = Solver.prepareLevelForSolver(raw, { source: 'raw' }); }
    catch (err) { return { signature: 'error', detail: `normalize: ${err?.message}` }; }
    let result;
    try {
        result = await Solver.solveLevel(level, {
            timeBudgetMs: TIME_BUDGET_MS,
            nodeBudget: NODE_BUDGET,
            workBudget: WORK_BUDGET,
            ...(mainLoopOnly ? { repairAdditiveBudgetMultiplierOverride: 0 } : {}),
        });
    }
    catch (err) { return { signature: 'error', detail: `solve: ${err?.message}` }; }
    if (result.ok) {
        let check;
        try { check = Solver.validateCandidatePath(level, result.solution); } catch { check = { ok: false }; }
        return check.ok ? { signature: 'solved', result } : { signature: 'invalid-path', result };
    }
    if (result.nodeBudgetReached) return { signature: 'node-budget-reached', result };
    if (result.status === 'timeout') return { signature: 'timeout', result };
    return { signature: 'failed', result };
}

function sizeMeasure(raw) {
    const objectCount = ['blocks', 'mustPass', 'mustCross', 'geese', 'falseGoals', 'filters', 'flippingFilters']
        .reduce((n, k) => n + (raw[k]?.length ?? 0), 0) + (raw.portals?.length ?? 0) * 2;
    return raw.grid.w * raw.grid.h + objectCount + raw.reqLen;
}

// ---------------------------------------------------------------------------
// Phase 1: witness-guided free shrink (no solver invocation)
// ---------------------------------------------------------------------------

const MARGIN = 1;

function tryShrinkOneEdge(raw, witnessPath) {
    const xs = witnessPath.map(([x]) => x), ys = witnessPath.map(([, y]) => y);
    const minX = Math.min(...xs) - MARGIN, maxX = Math.max(...xs) + MARGIN;
    const minY = Math.min(...ys) - MARGIN, maxY = Math.max(...ys) + MARGIN;

    const edges = [
        { side: 'left', can: raw.grid.w > 1 && minX > 1 },
        { side: 'right', can: raw.grid.w > 1 && maxX < raw.grid.w },
        { side: 'top', can: raw.grid.h > 1 && minY > 1 },
        { side: 'bottom', can: raw.grid.h > 1 && maxY < raw.grid.h },
    ];
    for (const { side, can } of edges) {
        if (!can) continue;
        const candidate = deepClone(raw);
        let offX = 0, offY = 0;
        if (side === 'left') { candidate.grid.w -= 1; offX = 1; }
        else if (side === 'right') candidate.grid.w -= 1;
        else if (side === 'top') { candidate.grid.h -= 1; offY = 1; }
        else candidate.grid.h -= 1;

        const shift = (o) => ({ ...o, x: o.x - offX, y: o.y - offY });
        const shiftPair = (o) => ({ ...o, x1: o.x1 - offX, y1: o.y1 - offY, x2: o.x2 - offX, y2: o.y2 - offY });
        candidate.gates = raw.gates.map(shift);
        candidate.goal = shift(raw.goal);
        for (const k of ['blocks', 'mustPass', 'mustCross', 'geese', 'falseGoals', 'filters', 'flippingFilters']) {
            candidate[k] = (raw[k] || []).map(shift);
        }
        candidate.portals = (raw.portals || []).map(shiftPair);
        const candidateWitness = witnessPath.map(([x, y]) => [x - offX, y - offY]);

        if (validateWitnessAgainstRaw(candidate, candidateWitness)) {
            return { raw: candidate, witness: candidateWitness, applied: true, description: `shrink grid edge: ${side}` };
        }
    }
    return { applied: false };
}

function tryRemoveOneOffWitnessObject(raw, witnessPath) {
    const witnessCells = new Set(witnessPath.map(([x, y]) => `${x},${y}`));
    const singleKeys = ['blocks', 'mustPass', 'mustCross', 'geese', 'falseGoals', 'filters', 'flippingFilters'];
    for (const k of singleKeys) {
        const arr = raw[k] || [];
        for (let i = 0; i < arr.length; i++) {
            if (witnessCells.has(`${arr[i].x},${arr[i].y}`)) continue; // witness-touched: keep
            const candidate = deepClone(raw);
            candidate[k] = arr.filter((_, j) => j !== i);
            if (validateWitnessAgainstRaw(candidate, witnessPath)) {
                return { raw: candidate, witness: witnessPath, applied: true, description: `remove off-witness ${k}[${i}]` };
            }
        }
    }
    const portals = raw.portals || [];
    for (let i = 0; i < portals.length; i++) {
        const p = portals[i];
        const touched = witnessCells.has(`${p.x1},${p.y1}`) || witnessCells.has(`${p.x2},${p.y2}`);
        if (touched) continue;
        const candidate = deepClone(raw);
        candidate.portals = portals.filter((_, j) => j !== i);
        if (validateWitnessAgainstRaw(candidate, witnessPath)) {
            return { raw: candidate, witness: witnessPath, applied: true, description: `remove off-witness portal pair[${i}]` };
        }
    }
    return { applied: false };
}

function phase1(raw, witnessPath) {
    let current = deepClone(raw);
    let currentWitness = witnessPath.map(([x, y]) => [x, y]);
    const steps = [];
    let guard = 0;
    while (guard++ < 1000) {
        const edgeResult = tryShrinkOneEdge(current, currentWitness);
        if (edgeResult.applied) {
            current = edgeResult.raw; currentWitness = edgeResult.witness;
            steps.push(edgeResult.description);
            continue;
        }
        const objResult = tryRemoveOneOffWitnessObject(current, currentWitness);
        if (objResult.applied) {
            current = objResult.raw; currentWitness = objResult.witness;
            steps.push(objResult.description);
            continue;
        }
        break; // fixed point for phase 1
    }
    return { raw: current, witness: currentWitness, steps, hitGuardCap: guard >= 1000 };
}

// ---------------------------------------------------------------------------
// Phase 2: solver-in-the-loop 1-minimal delta-debugging
// ---------------------------------------------------------------------------

function* candidateSteps(raw) {
    const singleKeys = ['blocks', 'mustPass', 'mustCross', 'geese', 'falseGoals', 'filters', 'flippingFilters'];
    for (const k of singleKeys) {
        const arr = raw[k] || [];
        for (let i = 0; i < arr.length; i++) {
            const candidate = deepClone(raw);
            candidate[k] = arr.filter((_, j) => j !== i);
            yield { raw: candidate, description: `remove ${k}[${i}]` };
        }
    }
    const portals = raw.portals || [];
    for (let i = 0; i < portals.length; i++) {
        const candidate = deepClone(raw);
        candidate.portals = portals.filter((_, j) => j !== i);
        yield { raw: candidate, description: `remove portal pair[${i}]` };
    }
    if (raw.reqLen > 0) {
        const candidate = deepClone(raw);
        candidate.reqLen -= 1;
        yield { raw: candidate, description: 'reqLen -= 1' };
    }
    // Grid edges — only where no remaining object (gate/goal/anything else) sits in that
    // row/column, since phase 2 no longer has a witness to guarantee safety and must check
    // via validateRawLevel + the solver instead.
    const objectsAt = (x, y) => [raw.goal, ...raw.gates, ...(raw.blocks||[]), ...(raw.mustPass||[]), ...(raw.mustCross||[]),
        ...(raw.geese||[]), ...(raw.falseGoals||[]), ...(raw.filters||[]), ...(raw.flippingFilters||[]),
        ...(raw.portals||[]).flatMap(p => [{x:p.x1,y:p.y1},{x:p.x2,y:p.y2}])]
        .some(o => o.x === x && o.y === y);
    const edgeSpecs = [
        { side: 'left', clear: !Array.from({length: raw.grid.h}, (_, y) => y+1).some(y => objectsAt(1, y)) },
        { side: 'right', clear: !Array.from({length: raw.grid.h}, (_, y) => y+1).some(y => objectsAt(raw.grid.w, y)) },
        { side: 'top', clear: !Array.from({length: raw.grid.w}, (_, x) => x+1).some(x => objectsAt(x, 1)) },
        { side: 'bottom', clear: !Array.from({length: raw.grid.w}, (_, x) => x+1).some(x => objectsAt(x, raw.grid.h)) },
    ];
    for (const { side, clear } of edgeSpecs) {
        if (!clear) continue;
        if ((side === 'left' || side === 'right') && raw.grid.w <= 1) continue;
        if ((side === 'top' || side === 'bottom') && raw.grid.h <= 1) continue;
        const candidate = deepClone(raw);
        const offX = side === 'left' ? 1 : 0, offY = side === 'top' ? 1 : 0;
        if (side === 'left' || side === 'right') candidate.grid.w -= 1; else candidate.grid.h -= 1;
        const shift = (o) => ({ ...o, x: o.x - offX, y: o.y - offY });
        const shiftPair = (o) => ({ ...o, x1: o.x1 - offX, y1: o.y1 - offY, x2: o.x2 - offX, y2: o.y2 - offY });
        candidate.gates = raw.gates.map(shift);
        candidate.goal = shift(raw.goal);
        for (const k of singleKeys) candidate[k] = (raw[k] || []).map(shift);
        candidate.portals = (raw.portals || []).map(shiftPair);
        yield { raw: candidate, description: `shrink grid edge: ${side}` };
    }
}

async function phase2(raw, targetSignature, maxIterations, mainLoopSignature = null) {
    let current = deepClone(raw);
    const steps = [];
    let iterations = 0;
    let fixedPoint = false;
    while (iterations < maxIterations) {
        let acceptedThisPass = false;
        for (const { raw: candidateRaw, description } of candidateSteps(current)) {
            iterations++;
            if (iterations > maxIterations) break;
            if (!validateSchema(candidateRaw)) continue;
            if (sizeMeasure(candidateRaw) >= sizeMeasure(current)) continue; // must strictly decrease
            const { signature } = await solveAndClassify(candidateRaw);
            if (signature === targetSignature) {
                // Repair is incomplete: it can keep burning its budget after a reduction has
                // collapsed the ordinary search into immediate complete exhaustion. Preserve the
                // repair-disabled control signature as well, so that R00440-style false minima are
                // rejected instead of merely carrying the same top-level timeout signature.
                if (mainLoopSignature !== null) {
                    const control = await solveAndClassify(candidateRaw, { mainLoopOnly: true });
                    if (control.signature !== mainLoopSignature) continue;
                }
                current = candidateRaw;
                steps.push(description);
                acceptedThisPass = true;
                break; // restart the candidate scan from the new, smaller current
            }
        }
        if (!acceptedThisPass) { fixedPoint = true; break; }
    }
    return { raw: current, steps, fixedPoint, iterations };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`Reducing ${LEVEL_ID} from ${CORPUS_FILE} (node-budget=${NODE_BUDGET}, time-budget-ms=${TIME_BUDGET_MS}).`);

const baseline = await solveAndClassify(originalRaw);
const targetSignature = TARGET_SIGNATURE_OVERRIDE || baseline.signature;
console.log(`Baseline signature: ${baseline.signature}${TARGET_SIGNATURE_OVERRIDE ? ` (overridden to target ${targetSignature})` : ''}.`);
if (targetSignature === 'solved') {
    console.error('Baseline solves cleanly — nothing "interesting" to reduce toward (this tool targets ' +
        'timeout/failed/node-budget-reached/invalid-path/error; pass --target-signature to force one anyway).');
    process.exit(2);
}

console.log(`\nPhase 1 (witness-guided, no solver invocation), starting size=${sizeMeasure(originalRaw)}:`);
const p1 = phase1(originalRaw, witnessRaw);
console.log(`  ${p1.steps.length} step(s) applied, size now ${sizeMeasure(p1.raw)}.`);
for (const s of p1.steps) console.log(`    - ${s}`);

const repairParticipated = baseline.result?.attempts?.some(attempt => attempt.repair === true) === true;
const mainLoopControl = repairParticipated
    ? await solveAndClassify(p1.raw, { mainLoopOnly: true })
    : null;
if (mainLoopControl) console.log(`  Repair-gated control signature (repair disabled): ${mainLoopControl.signature}.`);

console.log(`\nPhase 2 (solver-in-the-loop, target signature=${targetSignature}${mainLoopControl ? `, main-search control=${mainLoopControl.signature}` : ''}):`);
const p2 = await phase2(p1.raw, targetSignature, MAX_ITERATIONS, mainLoopControl?.signature ?? null);
console.log(`  ${p2.steps.length} step(s) applied, ${p2.iterations} candidate solve(s), size now ${sizeMeasure(p2.raw)}.`);
for (const s of p2.steps) console.log(`    - ${s}`);

const finalCheck = await solveAndClassify(p2.raw);
const finalMainLoopCheck = mainLoopControl
    ? await solveAndClassify(p2.raw, { mainLoopOnly: true })
    : null;
console.log(`\nFinal candidate signature: ${finalCheck.signature} (target: ${targetSignature}) — ` +
    (finalCheck.signature === targetSignature ? 'MATCHES.' : '!! DOES NOT MATCH — reduction is unsound, investigate.'));
console.log(p2.fixedPoint
    ? 'Phase 2 reached a genuine fixed point (no further defined step survives re-validation).'
    : `Phase 2 stopped at --max-iterations=${MAX_ITERATIONS} WITHOUT reaching a fixed point — this candidate is NOT proven minimal, only the best found within the iteration cap.`);

if (finalCheck.signature !== targetSignature) process.exitCode = 1;
if (finalMainLoopCheck && finalMainLoopCheck.signature !== mainLoopControl.signature) {
    console.error(`Final repair-disabled signature ${finalMainLoopCheck.signature} does not match control ${mainLoopControl.signature}.`);
    process.exitCode = 1;
}

if (OUT_FILE) {
    mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({
        sourceLevel: LEVEL_ID, sourceCorpus: CORPUS_FILE,
        baselineSignature: baseline.signature, targetSignature,
        originalSize: sizeMeasure(originalRaw), finalSize: sizeMeasure(p2.raw),
        phase1Steps: p1.steps, phase2Steps: p2.steps,
        phase2FixedPoint: p2.fixedPoint, phase2Iterations: p2.iterations,
        finalSignatureMatches: finalCheck.signature === targetSignature,
        mainLoopControlSignature: mainLoopControl?.signature ?? null,
        finalMainLoopSignature: finalMainLoopCheck?.signature ?? null,
        finalMainLoopSignatureMatches: finalMainLoopCheck ? finalMainLoopCheck.signature === mainLoopControl.signature : null,
        reducedLevel: p2.raw,
    }, null, 2) + '\n');
    console.log(`\nWrote ${OUT_FILE}`);
}
