#!/usr/bin/env node
/* global structuredClone */
/**
 * Generate witness-preserving level families for solver research.
 *
 * Modes:
 * - `local-mutant`: relocate one object under strict inventory.
 * - `density-sweep`: add/remove blocks while preserving the witness.
 * - `symmetry`: generate the seven non-identity rotations/reflections.
 * - `swap`: exchange two object positions when the referee accepts the result.
 * - `group-reshuffle`: re-place every instance of one `--group`.
 * - `constrained-shuffle`: re-place all movable types, most-constrained first.
 * - `re-embed`: translate the whole parent into a larger/equal grid.
 *
 * The parent must supply a stored hint or stress witness. Every accepted variant is schema-checked,
 * referee-checked against its preserved/transformed witness, fingerprint-deduplicated, and written
 * with provenance. See docs/sibling-cousin-system.md and docs/variant-level-research.md for relation
 * semantics and evidence policy; implementation-specific eligibility and provenance safeguards stay
 * beside the code below.
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/family-generate.mjs -- \
 *     --parent=P00006 --mode=local-mutant --count=12 --seed=20260716
 *
 * Common controls: `--parent-corpus`, `--parent`, `--witness-index`, `--mode`, `--count`, `--seed`,
 * `--mutation-types`, `--out`, and `--manifest-out`. Mode-specific validation below reports required
 * `--group`, block-delta, and re-embed arguments.
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const { PACK, UNPACK } = await import('../modules/domain/cell-key.js');
const { validateRawLevel } = await import('../modules/domain/level-schema.js');
const { baseLandmarkRole, resolveLandmarkTurn } = await import('../modules/domain/landmark-rules.js');
const { transformPoint, transformAxis, transformTurnDir } = await import('../modules/domain/geometry.js');
const { makeLevelProvenance, makeProvenanceEntry } = await import('../modules/domain/level-provenance-types.js');
const { getLevelFingerprint, getLevelFingerprintSource } = await import('../modules/domain/level-fingerprint.js');
const {
    mulberry32, randInt, buildRawLevel, validateWitnessOnRaw, witnessCellData,
} = await import('./stress/witness.mjs');
const { witnessFromLevelAndPath } = await import('./stress/witness-adapter.mjs');
const { inheritedWitnessHint, transformedWitnessHint } = await import('./stress/witness-provenance.mjs');
const { readLevelsWithHints, writeLevelsWithHints, hintsDirFor } = await import('./level-data-io.mjs');
const { generatorImplementationProvenance } = await import('./generator-implementation-provenance.mjs');

const GENERATOR_VERSION = '0.1.0';

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const PARENT_CORPUS = args.get('--parent-corpus') || 'data/levels.json';
const PARENT_SELECTOR = args.get('--parent');
const WITNESS_INDEX = Number(args.get('--witness-index') || 0);
const COUNT = Number(args.get('--count') || 12);
const SEED = Number(args.get('--seed') ?? 20260716);
const MAX_ATTEMPTS_PER_SIBLING = Number(args.get('--max-attempts-per-sibling') || 40);
const MUTATION_TYPES_ARG = args.get('--mutation-types');
const MODE = args.get('--mode') || 'local-mutant';
const BLOCK_DELTA_MIN = Number(args.get('--block-delta-min') ?? -3);
const BLOCK_DELTA_MAX = Number(args.get('--block-delta-max') ?? 3);
const GROUP_ARG = args.get('--group');
const REEMBED_GRID_ARG = args.get('--re-embed-grid');
const REEMBED_OFFSET_ARG = args.get('--re-embed-offset');

const VALID_MODES = ['local-mutant', 'density-sweep', 'symmetry', 'swap', 'group-reshuffle', 'constrained-shuffle', 're-embed'];
if (!VALID_MODES.includes(MODE)) {
    console.error(`--mode must be one of ${VALID_MODES.join(', ')}, got '${MODE}'`);
    process.exit(2);
}
if (MODE === 'group-reshuffle' && !GROUP_ARG) {
    console.error("--mode=group-reshuffle requires --group=<blocks|mustPass|mustCross|flippingFilters|geese|falseGoals|landmarks>");
    process.exit(2);
}
if (MODE === 're-embed' && !REEMBED_GRID_ARG) {
    console.error('--mode=re-embed requires --re-embed-grid=<W>x<H> (>= the parent grid in both dimensions)');
    process.exit(2);
}

if (!PARENT_SELECTOR) {
    console.error('usage: family-generate.mjs --parent=<id-or-position> [--parent-corpus=data/levels.json] [--count=12] ...');
    process.exit(2);
}

const root = process.cwd();
const generatorImplementation = generatorImplementationProvenance(root);
// path.join(root, p) does NOT special-case an already-absolute `p` — it concatenates
// unconditionally, silently producing a doubled/broken path (e.g. path.join('/a/b', '/c/d')
// === '/a/b/c/d', not '/c/d'). Matches hint-corpus-expand.mjs/hint-complete-enumeration-
// sharded.mjs's resolveFromRoot helper — every --parent-corpus/--out/--manifest-out argument
// must go through this, not a bare path.join(root, ...).
const resolveFromRoot = p => (path.isAbsolute(p) ? p : path.join(root, p));

// ─── load parent ────────────────────────────────────────────────────────────
const parentCorpusPath = resolveFromRoot(PARENT_CORPUS);
const parentLevels = readLevelsWithHints(parentCorpusPath);
const parentIndex = parentLevels.findIndex((lv, i) => lv.id === PARENT_SELECTOR || String(i + 1) === PARENT_SELECTOR);
if (parentIndex === -1) {
    console.error(`No level matching --parent=${PARENT_SELECTOR} in ${PARENT_CORPUS}`);
    process.exit(2);
}
const rawParent = parentLevels[parentIndex];
const parentId = rawParent.id || `pos${parentIndex + 1}`;

// Defaults are MODE-qualified (not just parent-qualified): two different modes run against the
// same parent with no explicit --out would otherwise silently overwrite each other's output file
// AND — the more dangerous failure, since it's silent even when --out IS distinct — collide on
// sibling ids if their output files ever share a hints/ directory (e.g. both under
// data/families/), each run's hint file overwriting the other's with a different witness. See
// MODE_ABBREV/nextSiblingCounterStart below for the id-collision half of this fix.
const OUT_FILE = args.get('--out') || `data/families/family-${parentId}-${MODE}.json`;
const MANIFEST_FILE = args.get('--manifest-out') || OUT_FILE.replace(/\.json$/, '-manifest.json');
const FAMILY_ID = `family-${parentId}-w${WITNESS_INDEX}-${MODE}`;

const MODE_ABBREV = {
    'local-mutant': 'lm', 'density-sweep': 'ds', symmetry: 'sym', swap: 'swap',
    'group-reshuffle': 'gr', 'constrained-shuffle': 'cs', 're-embed': 're',
};
const SIBLING_ID_PREFIX = `F${parentId.replace(/^[A-Za-z]/, '')}-${MODE_ABBREV[MODE]}-`;

/** Ids are never reused, even across separate runs (matches the stress generators' own
 *  makeLevelIdMinter pattern): scans the OUTPUT hints directory — the durable, cumulative record,
 *  since writeLevelsWithHints only rewrites a hint file when its content changed, unlike the
 *  levels.json output itself which a naive re-run would otherwise clobber wholesale — for the
 *  highest existing <SIBLING_ID_PREFIX><NN> and starts one past it, so re-running the same
 *  mode+parent (a different seed, topping up --count, ...) ADDS variants instead of colliding
 *  with and silently corrupting a previous run's hint files. */
function nextSiblingCounterStart() {
    const hintsDir = hintsDirFor(resolveFromRoot(OUT_FILE));
    if (!existsSync(hintsDir)) return 1;
    const escapedPrefix = SIBLING_ID_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^${escapedPrefix}(\\d+)\\.json$`);
    let max = 0;
    for (const f of readdirSync(hintsDir)) {
        const m = f.match(pattern);
        if (m) max = Math.max(max, Number(m[1]));
    }
    return max + 1;
}

// ─── resolve the witness path to preserve ───────────────────────────────────
function witnessPathFromParent() {
    if (Array.isArray(rawParent.hints) && rawParent.hints[WITNESS_INDEX]) {
        return { path: rawParent.hints[WITNESS_INDEX], source: `hint[${WITNESS_INDEX}]` };
    }
    const stressWitness = rawParent.stressMeta?.witnessSolution;
    if (Array.isArray(stressWitness) && stressWitness.length >= 2) {
        // stressMeta.witnessSolution is 1-indexed [x,y] pairs (witnessToPairs' own output shape).
        const packed = stressWitness.map(([x, y]) => PACK(x - 1, y - 1));
        return { path: packed, source: 'stressMeta.witnessSolution' };
    }
    return null;
}

const witnessSelection = witnessPathFromParent();
if (!witnessSelection) {
    console.error(`Parent ${parentId} has no hints[${WITNESS_INDEX}] and no stressMeta.witnessSolution — nothing to preserve.`);
    process.exit(2);
}

const witness = witnessFromLevelAndPath(rawParent, witnessSelection.path);

// Sanity: confirm the parent's OWN witness actually still validates against the parent's OWN
// current object placement before we start mutating anything (catches a malformed --witness-index
// input, or a corpus edited out from under a stale stored hint, with a clear error instead of
// silently generating siblings around a witness that never applied to this level in the first place).
{
    const check = validateWitnessOnRaw(rawParent, witnessSelection.path);
    if (!check.ok) {
        console.error(`Parent ${parentId}'s own witness (${witnessSelection.source}) does not validate against its current object placement: ${check.reason}`);
        process.exit(2);
    }
}

// ─── convert the parent's existing wire-format objects into the packed-key extras shape
//     scripts/stress/witness.mjs's buildRawLevel/eligibility logic operates on ─────────────────
function landmarkDerivedCoordSets(landmarks) {
    // Mirrors modules/domain/level-fingerprint.ts's landmarkDerivedCoordSets exactly: a published
    // level's real wire export (buildWireLevelData) legitimately re-declares an impassable
    // landmark's cell in `blocks` (or a mustPass/mustTurn landmark's cell in `mustPass`) alongside
    // its own `landmarks` entry — those are the same conceptual object, not two objects
    // contending for one cell, and must be excluded here or the extras conversion below would
    // double-book that cell (once via blocks/mustPass, once via landmarks) and "moving" the
    // landmark would leave a phantom block/mustPass behind at its old cell.
    const blocks = new Set(), mustPass = new Set();
    for (const lm of landmarks) {
        const key = PACK(lm.x - 1, lm.y - 1);
        if (baseLandmarkRole(lm.role) === 'mustPass' || baseLandmarkRole(lm.role) === 'mustTurn') mustPass.add(key);
        else blocks.add(key);
    }
    return { blocks, mustPass };
}

function extrasFromParent(raw, witnessObj) {
    const landmarkCoords = landmarkDerivedCoordSets(raw.landmarks || []);
    const toKey = c => PACK(c.x - 1, c.y - 1);

    const usedPortalPairKeys = new Set(
        witnessObj.portalPairs.map(p => (p.a < p.b ? `${p.a}:${p.b}` : `${p.b}:${p.a}`)),
    );
    const decoyPortals = [];
    for (const p of (raw.portals || [])) {
        const a = PACK(p.x1 - 1, p.y1 - 1), b = PACK(p.x2 - 1, p.y2 - 1);
        const pairKey = a < b ? `${a}:${b}` : `${b}:${a}`;
        if (!usedPortalPairKeys.has(pairKey)) decoyPortals.push({ a, b });
    }
    const decoyGates = (raw.gates || [])
        .map(toKey)
        .filter(k => k !== witnessObj.startKey);

    return {
        blocks: (raw.blocks || []).map(toKey).filter(k => !landmarkCoords.blocks.has(k) && !landmarkCoords.mustPass.has(k)),
        mustPass: (raw.mustPass || []).map(toKey).filter(k => !landmarkCoords.blocks.has(k) && !landmarkCoords.mustPass.has(k)),
        mustCross: (raw.mustCross || []).map(toKey),
        // Regular (non-flipping) static filters: scripts/stress/witness.mjs's buildRawLevel
        // hardcodes `filters: []` (they're deliberately excluded from the stress corpus by
        // design), so they're not one of the mutable extras it understands — carried through
        // UNCHANGED (never relocated by this generator; not in listInstances' mutation types)
        // and spliced back onto every buildRawLevelWithFilters() output below. Their cells still
        // occupy the grid, so usedCellsFor must exclude them like every other placed object.
        filters: raw.filters || [],
        flippingFilters: (raw.flippingFilters || []).map(f => ({ key: PACK(f.x - 1, f.y - 1), axis: f.axis })),
        landmarks: (raw.landmarks || []).map(lm => ({
            key: PACK(lm.x - 1, lm.y - 1),
            objectType: lm.objectType,
            role: baseLandmarkRole(lm.role),
            turn: resolveLandmarkTurn(lm.role, lm.turn),
        })),
        geese: (raw.geese || []).map(toKey),
        falseGoals: (raw.falseGoals || []).map(toKey),
        decoyGates,
        decoyPortals,
    };
}

const baseExtras = extrasFromParent(rawParent, witness);

/** buildRawLevel always emits `filters: []` (see extrasFromParent's comment) — splice the
 *  parent's real static filters back in. Every validateWitnessOnRaw call in this script must go
 *  through this wrapper, never buildRawLevel directly, or a candidate could be validated against
 *  a level that's silently missing an axis-restricting filter the real witness has to respect. */
function buildRawLevelWithFilters(witnessObj, extras) {
    const raw = buildRawLevel(witnessObj, extras);
    raw.filters = extras.filters;
    return raw;
}

// Confirm the round-trip reproduces a structurally identical level before any mutation — if this
// fails, the extras conversion above has a bug, and generating siblings from a mis-converted
// baseline would silently produce mutants of the WRONG starting arrangement.
{
    const rebuilt = buildRawLevelWithFilters(witness, baseExtras);
    rebuilt.designerName = rawParent.designerName || '';
    rebuilt.description = rawParent.description || '';
    rebuilt.difficulty = rawParent.difficulty ?? null;
    const rebuiltCheck = validateWitnessOnRaw(rebuilt, witness.path);
    if (!rebuiltCheck.ok) {
        console.error(`INTERNAL: parent->extras->buildRawLevel round-trip failed to validate: ${rebuiltCheck.reason}`);
        process.exit(1);
    }
}

// ─── per-object-type eligible-cell logic (mirrors generate-random.mjs's opXUniform bodies) ─────
function usedCellsFor(witnessObj, extras) {
    const used = new Set([witnessObj.startKey, witnessObj.goalKey]);
    for (const p of witnessObj.portalPairs) used.add(p.a).add(p.b);
    for (const k of extras.decoyGates) used.add(k);
    for (const p of extras.decoyPortals) used.add(p.a).add(p.b);
    for (const f of extras.filters) used.add(PACK(f.x - 1, f.y - 1));
    for (const k of extras.blocks) used.add(k);
    for (const k of extras.mustPass) used.add(k);
    for (const k of extras.mustCross) used.add(k);
    for (const f of extras.flippingFilters) used.add(f.key);
    for (const lm of extras.landmarks) used.add(lm.key);
    for (const k of extras.geese) used.add(k);
    for (const k of extras.falseGoals) used.add(k);
    return used;
}

function freeUnvisitedFor(ctx, extras) {
    const used = usedCellsFor(ctx.witness, extras);
    return ctx.cell.unvisited.filter(k => !used.has(k));
}

function impassableSoFarFor(extras) {
    return new Set([
        ...extras.blocks,
        ...extras.landmarks.filter(lm => lm.role === 'surround' || lm.role === 'adjacentTurn' || lm.role === 'decorative').map(lm => lm.key),
    ]);
}

function eligibleCells(eligType, ctx, extras) {
    const { w, h } = ctx.witness;
    const used = usedCellsFor(ctx.witness, extras);
    switch (eligType) {
        case 'blocks': case 'geese': case 'falseGoals': case 'decorative-landmark':
            return freeUnvisitedFor(ctx, extras);
        case 'mustPass':
            return ctx.cell.visitedOnce.concat(ctx.cell.visitedTwice).filter(k => !used.has(k));
        case 'mustCross':
            return ctx.cell.visitedTwice.filter(k => !used.has(k));
        case 'flippingFilters': {
            const onPath = ctx.cell.straightThrough.filter(k => !used.has(k));
            return [...onPath, ...freeUnvisitedFor(ctx, extras)];
        }
        case 'mustTurn-landmark':
            return [...ctx.cell.turnsAtCell.keys()].filter(k => !used.has(k));
        case 'surround-landmark': {
            const impassable = impassableSoFarFor(extras);
            return freeUnvisitedFor(ctx, extras).filter(k => {
                const p = UNPACK(k);
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = p.x + dx, ny = p.y + dy;
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const nk = PACK(nx, ny);
                    if (!ctx.cell.counts.has(nk) && !impassable.has(nk)) return false;
                }
                return true;
            });
        }
        case 'adjacentTurn-landmark':
            return freeUnvisitedFor(ctx, extras).filter(k => {
                const p = UNPACK(k);
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    if (ctx.cell.turnsAtCell.has(PACK(p.x + dx, p.y + dy))) return true;
                }
                return false;
            });
        default:
            return [];
    }
}

function shuffled(rng, arr) {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// ─── instance enumeration + single-object relocation ────────────────────────
function listInstances(extras, mutationTypes) {
    const out = [];
    const has = t => mutationTypes.has(t);
    if (has('blocks')) extras.blocks.forEach((key, index) => out.push({ kind: 'blocks', index, key }));
    if (has('mustPass')) extras.mustPass.forEach((key, index) => out.push({ kind: 'mustPass', index, key }));
    if (has('mustCross')) extras.mustCross.forEach((key, index) => out.push({ kind: 'mustCross', index, key }));
    if (has('geese')) extras.geese.forEach((key, index) => out.push({ kind: 'geese', index, key }));
    if (has('falseGoals')) extras.falseGoals.forEach((key, index) => out.push({ kind: 'falseGoals', index, key }));
    if (has('flippingFilters')) extras.flippingFilters.forEach((f, index) => out.push({ kind: 'flippingFilters', index, key: f.key, axis: f.axis }));
    if (has('landmarks')) extras.landmarks.forEach((lm, index) => out.push({ kind: 'landmarks', index, key: lm.key, role: lm.role, objectType: lm.objectType, turn: lm.turn }));
    return out;
}

function eligibilityTypeFor(instance) {
    return instance.kind === 'landmarks' ? `${instance.role}-landmark` : instance.kind;
}

function tryRelocateInstance(ctx, extras, instance) {
    const removed = structuredClone(extras);
    removed[instance.kind].splice(instance.index, 1);
    const eligType = eligibilityTypeFor(instance);
    const candidates = shuffled(ctx.rng, eligibleCells(eligType, ctx, removed).filter(k => k !== instance.key));

    for (const k of candidates) {
        const axisChoices = instance.kind === 'flippingFilters' ? [instance.axis, instance.axis === 1 ? 2 : 1] : [null];
        for (const axis of axisChoices) {
            const attempt = structuredClone(removed);
            if (instance.kind === 'flippingFilters') attempt.flippingFilters.push({ key: k, axis });
            else if (instance.kind === 'landmarks') attempt.landmarks.push({ key: k, objectType: instance.objectType, role: instance.role, turn: instance.turn });
            else attempt[instance.kind].push(k);
            if (validateWitnessOnRaw(buildRawLevelWithFilters(ctx.witness, attempt), ctx.witness.path).ok) {
                return { ok: true, extras: attempt, eligibleDomainSize: candidates.length, to: k, axis };
            }
        }
    }
    return { ok: false, eligibleDomainSize: candidates.length };
}

function generateOneSibling(ctx, extras, mutationTypes, attemptLog) {
    const instances = shuffled(ctx.rng, listInstances(extras, mutationTypes));
    for (const instance of instances) {
        const result = tryRelocateInstance(ctx, extras, instance);
        attemptLog.push({ objectType: instance.kind, key: instance.key, eligibleDomainSize: result.eligibleDomainSize, accepted: result.ok });
        if (result.ok) {
            return {
                extras: result.extras,
                mutation: {
                    objectType: instance.kind,
                    operation: 'move',
                    from: UNPACK(instance.key),
                    to: UNPACK(result.to),
                    ...(instance.kind === 'flippingFilters' ? { axisBefore: instance.axis, axisAfter: result.axis } : {}),
                    ...(instance.kind === 'landmarks' ? { role: instance.role, objectType: instance.objectType } : {}),
                },
            };
        }
    }
    return null;
}

/** navDensity exactly as solver/archetype.ts's getNavigableDensity computes it:
 *  reqLen / (w*h - blocks - geese - falseGoals - gates). Landmarks that ARE impassable already
 *  show up via their blocks-derived cell in a normalized level, but at the wire-extras level here
 *  landmarks are tracked separately — mirror that by also subtracting impassable landmark roles,
 *  matching landmarkDerivedCoordSets' own categorization (surround/adjacentTurn/decorative). */
function requiredPathCoverageRatioOf(witnessObj, extras) {
    const impassableLandmarks = extras.landmarks.filter(lm => lm.role !== 'mustPass' && lm.role !== 'mustTurn').length;
    const navArea = witnessObj.w * witnessObj.h
        - extras.blocks.length - extras.geese.length - extras.falseGoals.length
        - extras.decoyGates.length - 1 /* the witness's own gate */ - impassableLandmarks;
    return witnessObj.reqLen / navArea;
}

/** density-sweep mode: add/remove ONLY blocks, relocating nothing — see docs/sibling-cousin-system.md
 *  for why this is a separate relation from local-mutant generation. */
function applyDensityDelta(ctx, extras, delta) {
    const clone = structuredClone(extras);
    if (delta > 0) {
        const candidates = shuffled(ctx.rng, eligibleCells('blocks', ctx, clone));
        if (candidates.length < delta) return { ok: false, reason: `only ${candidates.length} free cell(s) available, need ${delta}` };
        for (const k of candidates.slice(0, delta)) clone.blocks.push(k);
    } else if (delta < 0) {
        if (clone.blocks.length < -delta) return { ok: false, reason: `parent only has ${clone.blocks.length} block(s), can't remove ${-delta}` };
        const toRemove = new Set(shuffled(ctx.rng, clone.blocks).slice(0, -delta));
        clone.blocks = clone.blocks.filter(k => !toRemove.has(k));
    } else {
        return { ok: false, reason: 'delta=0 is the parent itself, not a variant' };
    }
    return { ok: true, extras: clone };
}

// ─── symmetry mode: whole-level rotation/reflection ──────────────────────────
/** variant 1-7 (0 is identity, never generated — it would just be the parent). Reuses
 *  modules/domain/geometry.ts's transformPoint/transformAxis/transformTurnDir — the same
 *  primitives the play-mode display-variant system and the editor's permanent Rotate/Mirror
 *  rewrite already use for this exact 8-way scheme, so this is proven transform math, not
 *  hand-rolled. Grids are always square (CLAUDE.md), so W/H never change. */
function transformWitnessAndExtras(witnessObj, extras, variant) {
    const W = witnessObj.w, H = witnessObj.h;
    const tKey = (key) => {
        const p = UNPACK(key);
        const { tx, ty } = transformPoint(p.x, p.y, variant, W, H);
        return PACK(tx, ty);
    };
    const tWire = (x, y) => {
        const { tx, ty } = transformPoint(x - 1, y - 1, variant, W, H);
        return { x: tx + 1, y: ty + 1 };
    };
    const newWitness = {
        path: witnessObj.path.map(tKey),
        jumps: new Set(witnessObj.jumps), // step INDICES — unaffected by a coordinate transform
        portalPairs: witnessObj.portalPairs.map(p => ({ a: tKey(p.a), b: tKey(p.b) })),
        reqLen: witnessObj.reqLen, reqInt: witnessObj.reqInt,
        startKey: tKey(witnessObj.startKey), goalKey: tKey(witnessObj.goalKey),
        w: W, h: H,
    };
    const newExtras = {
        blocks: extras.blocks.map(tKey),
        mustPass: extras.mustPass.map(tKey),
        mustCross: extras.mustCross.map(tKey),
        filters: extras.filters.map(f => ({ ...tWire(f.x, f.y), axis: transformAxis(f.axis, variant) })),
        flippingFilters: extras.flippingFilters.map(f => ({ key: tKey(f.key), axis: transformAxis(f.axis, variant) })),
        landmarks: extras.landmarks.map(lm => ({ key: tKey(lm.key), objectType: lm.objectType, role: lm.role, turn: transformTurnDir(lm.turn, variant) })),
        geese: extras.geese.map(tKey),
        falseGoals: extras.falseGoals.map(tKey),
        decoyGates: extras.decoyGates.map(tKey),
        decoyPortals: extras.decoyPortals.map(p => ({ a: tKey(p.a), b: tKey(p.b) })),
    };
    return { witness: newWitness, extras: newExtras };
}

// ─── re-embed mode: translate the whole level into a (possibly larger) grid ──
/** Shifts every coordinate by (offsetX, offsetY); the parent's own grid content is otherwise
 *  byte-identical in relative structure. The newly-added surrounding area is left untouched. */
function reEmbedWitnessAndExtras(witnessObj, extras, newW, newH, offsetX, offsetY) {
    const shiftKey = (key) => { const p = UNPACK(key); return PACK(p.x + offsetX, p.y + offsetY); };
    const shiftWire = (x, y) => ({ x: x + offsetX, y: y + offsetY });
    const newWitness = {
        path: witnessObj.path.map(shiftKey),
        jumps: new Set(witnessObj.jumps),
        portalPairs: witnessObj.portalPairs.map(p => ({ a: shiftKey(p.a), b: shiftKey(p.b) })),
        reqLen: witnessObj.reqLen, reqInt: witnessObj.reqInt,
        startKey: shiftKey(witnessObj.startKey), goalKey: shiftKey(witnessObj.goalKey),
        w: newW, h: newH,
    };
    const newExtras = {
        blocks: extras.blocks.map(shiftKey),
        mustPass: extras.mustPass.map(shiftKey),
        mustCross: extras.mustCross.map(shiftKey),
        filters: extras.filters.map(f => ({ ...shiftWire(f.x, f.y), axis: f.axis })),
        flippingFilters: extras.flippingFilters.map(f => ({ key: shiftKey(f.key), axis: f.axis })),
        landmarks: extras.landmarks.map(lm => ({ key: shiftKey(lm.key), objectType: lm.objectType, role: lm.role, turn: lm.turn })),
        geese: extras.geese.map(shiftKey),
        falseGoals: extras.falseGoals.map(shiftKey),
        decoyGates: extras.decoyGates.map(shiftKey),
        decoyPortals: extras.decoyPortals.map(p => ({ a: shiftKey(p.a), b: shiftKey(p.b) })),
    };
    return { witness: newWitness, extras: newExtras };
}

// ─── swap mode: exchange two instances' positions ────────────────────────────
/** Removes by VALUE match (first occurrence), not stored array index — safe to call twice in a
 *  row on the same array (removing `a` then `b`, even when a.kind === b.kind) without the second
 *  removal's index having silently shifted out from under it. */
function removeInstanceByIdentity(extras, instance) {
    const arr = extras[instance.kind];
    let idx;
    if (instance.kind === 'flippingFilters') idx = arr.findIndex(f => f.key === instance.key && f.axis === instance.axis);
    else if (instance.kind === 'landmarks') idx = arr.findIndex(lm => lm.key === instance.key && lm.role === instance.role && lm.objectType === instance.objectType);
    else idx = arr.indexOf(instance.key);
    if (idx >= 0) arr.splice(idx, 1);
}

function insertInstanceAt(extras, instance, atKey) {
    if (instance.kind === 'flippingFilters') extras.flippingFilters.push({ key: atKey, axis: instance.axis });
    else if (instance.kind === 'landmarks') extras.landmarks.push({ key: atKey, objectType: instance.objectType, role: instance.role, turn: instance.turn });
    else extras[instance.kind].push(atKey);
}

/** Compatibility is decided empirically (the final referee re-check), not a precomputed
 *  type-compatibility table — most cross-type pairs (e.g. block<->mustPass) will fail because
 *  their eligible-cell pools are disjoint by construction (a block is always off-witness, a
 *  mustPass always on it), but nothing here assumes that; it just tries and lets the referee
 *  decide, same as every other mode in this file. */
function trySwapInstances(ctx, extras, a, b) {
    if (a.kind === b.kind && a.index === b.index) return { ok: false, reason: 'same instance' };
    if (a.key === b.key) return { ok: false, reason: 'same cell' };
    const clone = structuredClone(extras);
    removeInstanceByIdentity(clone, a);
    removeInstanceByIdentity(clone, b);
    insertInstanceAt(clone, a, b.key);
    insertInstanceAt(clone, b, a.key);
    const raw = buildRawLevelWithFilters(ctx.witness, clone);
    if (!validateWitnessOnRaw(raw, ctx.witness.path).ok) return { ok: false, reason: 'referee rejected the swap' };
    return { ok: true, extras: clone };
}

// ─── group-reshuffle / constrained-shuffle: fresh re-placement of one or more types ───────────
/** Clears every instance of `kind` from a clone of `extras`, then places one fresh instance per
 *  `templates[i]` (preserving each template's own role/objectType/axis where relevant) at a
 *  freshly-chosen eligible cell, one at a time with incremental re-validation — mirrors
 *  generate-random.mjs's own opXUniform "place N instances" pattern, just starting from
 *  `extras`'s current state (which may already have OTHER types freshly placed, for constrained-
 *  shuffle's sequential most-constrained-first pass) rather than always-empty. */
function tryPlaceFresh(ctx, extras, kind, templates) {
    const clone = structuredClone(extras);
    clone[kind] = [];
    for (const tmpl of templates) {
        const eligType = kind === 'landmarks' ? `${tmpl.role}-landmark` : kind;
        const candidates = shuffled(ctx.rng, eligibleCells(eligType, ctx, clone));
        let placedOk = false;
        for (const k of candidates) {
            const axisChoices = kind === 'flippingFilters' ? shuffled(ctx.rng, [tmpl.axis, tmpl.axis === 1 ? 2 : 1]) : [null];
            for (const axis of axisChoices) {
                const attempt = structuredClone(clone);
                if (kind === 'flippingFilters') attempt.flippingFilters.push({ key: k, axis });
                else if (kind === 'landmarks') attempt.landmarks.push({ key: k, objectType: tmpl.objectType, role: tmpl.role, turn: tmpl.turn });
                else attempt[kind].push(k);
                if (validateWitnessOnRaw(buildRawLevelWithFilters(ctx.witness, attempt), ctx.witness.path).ok) {
                    clone[kind] = attempt[kind];
                    placedOk = true;
                    break;
                }
            }
            if (placedOk) break;
        }
        if (!placedOk) return { ok: false, reason: `could not place a fresh ${kind}${kind === 'landmarks' ? `(${tmpl.role})` : ''} instance (${clone[kind].length}/${templates.length} placed)` };
    }
    return { ok: true, extras: clone };
}

/** Most-constrained-first order (docs/sibling-cousin-system.md section 9): mustCross has the
 *  smallest eligible pool (genuine self-crossing cells only), landmarks next (role-specific
 *  geometric constraints), then mustPass, then flippingFilters, then the free-cell types last
 *  (largest pool, least likely to get starved by earlier placements). */
const CONSTRAINED_SHUFFLE_ORDER = ['mustCross', 'landmarks', 'mustPass', 'flippingFilters', 'blocks', 'geese', 'falseGoals'];

function tryConstrainedShuffle(ctx, extras) {
    let running = extras;
    for (const kind of CONSTRAINED_SHUFFLE_ORDER) {
        const templates = kind === 'flippingFilters' ? running.flippingFilters.map(f => ({ axis: f.axis }))
            : kind === 'landmarks' ? running.landmarks.map(lm => ({ objectType: lm.objectType, role: lm.role, turn: lm.turn }))
            : running[kind].map(() => ({}));
        if (templates.length === 0) continue;
        const result = tryPlaceFresh(ctx, running, kind, templates);
        if (!result.ok) return result;
        running = result.extras;
    }
    return { ok: true, extras: running };
}

// ─── main generation loop ────────────────────────────────────────────────────
async function main() {
    const mutationTypes = new Set(
        MUTATION_TYPES_ARG
            ? MUTATION_TYPES_ARG.split(',').map(s => s.trim())
            : ['blocks', 'mustPass', 'mustCross', 'flippingFilters', 'geese', 'falseGoals', 'landmarks'],
    );

    const ctx = { witness, cell: witnessCellData(witness), rng: mulberry32(SEED) };
    const parentFingerprintSource = getLevelFingerprintSource(rawParent);
    const parentContentHash = await getLevelFingerprint(rawParent);

    const availableInstances = listInstances(baseExtras, mutationTypes);
    console.log(`Parent ${parentId}: witness ${witnessSelection.source} (len ${witness.path.length - witness.jumps.size}, ${witness.jumps.size} jump(s)), ${availableInstances.length} movable object instance(s) under strict inventory.`);
    // This capacity gate only applies to local-mutant mode: density-sweep doesn't relocate any
    // existing instance, so a parent with zero movable objects under strict inventory (every
    // object's only legal cell is the one it's already on) can still be perfectly viable for a
    // density sweep, as long as there are free cells to add blocks into or existing blocks to
    // remove — applyDensityDelta's own per-delta rejection already reports that capacity.
    if (MODE === 'local-mutant' && availableInstances.length === 0) {
        console.log(`family capacity: 0 — parent has no movable objects under strict inventory (mutation-types=${[...mutationTypes].join(',')}). Nothing to generate.`);
        process.exit(0);
    }

    // Append-safe re-runs (docs/sibling-cousin-system.md section 23): if OUT_FILE already holds
    // siblings from a previous run of this same parent+mode, load them so a topped-up re-run (a
    // different seed, a higher --count) ADDS to that set rather than silently replacing it, and
    // so it can't re-propose a variant already accepted last time.
    const outAbsForLoad = resolveFromRoot(OUT_FILE);
    const existingAccepted = existsSync(outAbsForLoad) ? readLevelsWithHints(outAbsForLoad) : [];
    if (existingAccepted.length > 0) console.log(`Found ${existingAccepted.length} existing sibling(s) at ${OUT_FILE} — this run will add to them, not replace them.`);

    const accepted = [...existingAccepted];
    const seenFingerprints = new Set([parentFingerprintSource, ...existingAccepted.map(getLevelFingerprintSource)]);
    const variantManifests = [];
    let attempts = 0;
    let nextSiblingNumber = nextSiblingCounterStart();

    // Shared accept-or-reject pipeline for one candidate's extras, regardless of which mode
    // produced it: assemble -> fingerprint-dedup -> schema -> witness re-check -> stamp -> record.
    // `witnessObj` defaults to the parent's own (unchanged-coordinate) witness; symmetry/re-embed
    // pass their transformed one instead, and `witnessTag` picks which provenance id applies
    // (inherited = byte-identical coordinates, transformed = known coordinate map applied).
    // Returns true iff accepted.
    async function tryAccept({ extras, mutation, relation, witnessRelation, inventoryPolicy, description, witnessObj = witness, witnessTag = 'inherited' }) {
        const finalRaw = buildRawLevelWithFilters(witnessObj, extras);
        finalRaw.designerName = rawParent.designerName || '';
        finalRaw.description = description;
        finalRaw.difficulty = rawParent.difficulty ?? null;

        const fpSource = getLevelFingerprintSource(finalRaw);
        if (seenFingerprints.has(fpSource)) { console.log(`  attempt ${attempts}: rejected — degenerate duplicate of parent or another accepted variant`); return false; }
        seenFingerprints.add(fpSource);

        const schemaCheck = validateRawLevel(finalRaw);
        if (!schemaCheck.ok) { console.log(`  attempt ${attempts}: rejected at schema: ${schemaCheck.errors.join('; ')}`); return false; }
        const witnessCheck = validateWitnessOnRaw(finalRaw, witnessObj.path);
        if (!witnessCheck.ok) { console.log(`  attempt ${attempts}: rejected at final witness re-check: ${witnessCheck.reason}`); return false; }

        const siblingId = `${SIBLING_ID_PREFIX}${String(nextSiblingNumber).padStart(2, '0')}`;
        nextSiblingNumber++;
        finalRaw.id = siblingId;
        finalRaw.provenance = makeLevelProvenance([makeProvenanceEntry('procedural', `${relation}-generated`, {
            method: 'family-generate.mjs',
            detail: {
                familyId: FAMILY_ID, parentLevelId: parentId, parentContentHash,
                relation, witnessRelation, mutation, generationSeed: SEED, generatorVersion: GENERATOR_VERSION,
            },
        })]);
        const levelFp = await getLevelFingerprint(finalRaw);
        finalRaw.hintRecords = [witnessTag === 'transformed' ? transformedWitnessHint(witnessObj.path, levelFp) : inheritedWitnessHint(witnessObj.path, levelFp)];
        finalRaw.hints = [witnessObj.path];

        accepted.push(finalRaw);
        variantManifests.push({
            variantId: siblingId, familyId: FAMILY_ID, relation, witnessRelation,
            randomSeed: SEED, inventoryPolicy, parentContentHash, variantContentHash: levelFp,
            generatorImplementation,
            mutationManifest: mutation, generationAttempts: attempts,
            requiredPathCoverageRatio: requiredPathCoverageRatioOf(witnessObj, extras),
        });
        return true;
    }

    let requestedCount, attemptBudget;
    if (MODE === 'density-sweep') {
        const deltas = [];
        for (let d = BLOCK_DELTA_MIN; d <= BLOCK_DELTA_MAX; d++) if (d !== 0) deltas.push(d);
        requestedCount = deltas.length;
        attemptBudget = deltas.length;
        console.log(`Density sweep: block deltas ${deltas.join(', ')} (parent requiredPathCoverageRatio ${requiredPathCoverageRatioOf(witness, baseExtras).toFixed(3)}, ${baseExtras.blocks.length} block(s)).`);
        for (const delta of deltas) {
            attempts++;
            const applied = applyDensityDelta(ctx, baseExtras, delta);
            if (!applied.ok) { console.log(`  delta ${delta > 0 ? '+' : ''}${delta}: skipped — ${applied.reason}`); continue; }
            const mutation = { objectType: 'blocks', operation: delta > 0 ? 'add' : 'remove', count: Math.abs(delta), resultingBlockCount: applied.extras.blocks.length };
            const ok = await tryAccept({
                extras: applied.extras, mutation, relation: 'density-sweep', witnessRelation: 'exact-coordinate',
                inventoryPolicy: 'density-relaxed',
                description: `Density-sweep sibling of ${parentId}: ${delta > 0 ? '+' : ''}${delta} block(s) (requiredPathCoverageRatio ${requiredPathCoverageRatioOf(witness, applied.extras).toFixed(3)}; witness/reqLen/reqInt preserved).`,
            });
            if (ok) console.log(`  delta ${delta > 0 ? '+' : ''}${delta}: accepted ${accepted[accepted.length - 1].id} — requiredPathCoverageRatio -> ${requiredPathCoverageRatioOf(witness, applied.extras).toFixed(3)}`);
        }
    } else if (MODE === 'local-mutant') {
        requestedCount = COUNT;
        attemptBudget = COUNT * MAX_ATTEMPTS_PER_SIBLING;
        while (variantManifests.length < COUNT && attempts < attemptBudget) {
            attempts++;
            const attemptLog = [];
            const result = generateOneSibling(ctx, baseExtras, mutationTypes, attemptLog);
            if (!result) continue;
            const ok = await tryAccept({
                extras: result.extras, mutation: result.mutation, relation: 'local-mutant', witnessRelation: 'exact-coordinate',
                inventoryPolicy: 'strict',
                description: `Local-mutant sibling of ${parentId}: moved one ${result.mutation.objectType} object.`,
            });
            if (ok) console.log(`  attempt ${attempts}: accepted ${accepted[accepted.length - 1].id} — moved ${result.mutation.objectType} (${result.mutation.from.x},${result.mutation.from.y}) -> (${result.mutation.to.x},${result.mutation.to.y})`);
        }
    } else if (MODE === 'symmetry') {
        const variants = [1, 2, 3, 4, 5, 6, 7];
        requestedCount = variants.length;
        attemptBudget = variants.length;
        for (const variant of variants) {
            attempts++;
            const { witness: tWitness, extras: tExtras } = transformWitnessAndExtras(witness, baseExtras, variant);
            const mutation = { objectType: 'whole-level', operation: 'transform', variant, kind: variant <= 3 ? 'rotation' : 'reflection' };
            const ok = await tryAccept({
                extras: tExtras, mutation, relation: 'symmetry', witnessRelation: 'transformed',
                inventoryPolicy: 'strict', witnessObj: tWitness, witnessTag: 'transformed',
                description: `Symmetry sibling of ${parentId}: variant ${variant} (${mutation.kind}).`,
            });
            if (ok) console.log(`  variant ${variant} (${mutation.kind}): accepted ${accepted[accepted.length - 1].id}`);
        }
    } else if (MODE === 'swap') {
        requestedCount = COUNT;
        attemptBudget = COUNT * MAX_ATTEMPTS_PER_SIBLING;
        const instances = listInstances(baseExtras, mutationTypes);
        if (instances.length < 2) {
            console.log(`family capacity: 0 — parent has fewer than 2 movable instances (mutation-types=${[...mutationTypes].join(',')}). Nothing to swap.`);
        }
        while (variantManifests.length < COUNT && attempts < attemptBudget && instances.length >= 2) {
            attempts++;
            const [a, b] = shuffled(ctx.rng, instances).slice(0, 2);
            const result = trySwapInstances(ctx, baseExtras, a, b);
            if (!result.ok) { console.log(`  attempt ${attempts}: rejected — ${result.reason}`); continue; }
            const aPos = UNPACK(a.key), bPos = UNPACK(b.key);
            const mutation = { objectType: 'swap', operation: 'swap', a: { kind: a.kind, from: aPos }, b: { kind: b.kind, from: bPos } };
            const ok = await tryAccept({
                extras: result.extras, mutation, relation: 'swap', witnessRelation: 'exact-coordinate',
                inventoryPolicy: 'strict',
                description: `Swap sibling of ${parentId}: exchanged a ${a.kind} and a ${b.kind}.`,
            });
            if (ok) console.log(`  attempt ${attempts}: accepted ${accepted[accepted.length - 1].id} — swapped ${a.kind}(${aPos.x},${aPos.y}) <-> ${b.kind}(${bPos.x},${bPos.y})`);
        }
    } else if (MODE === 'group-reshuffle') {
        requestedCount = COUNT;
        attemptBudget = COUNT * MAX_ATTEMPTS_PER_SIBLING;
        const templates = GROUP_ARG === 'flippingFilters' ? baseExtras.flippingFilters.map(f => ({ axis: f.axis }))
            : GROUP_ARG === 'landmarks' ? baseExtras.landmarks.map(lm => ({ objectType: lm.objectType, role: lm.role, turn: lm.turn }))
            : (baseExtras[GROUP_ARG] || []).map(() => ({}));
        if (templates.length === 0) {
            console.log(`family capacity: 0 — parent has no ${GROUP_ARG} instances to reshuffle.`);
        }
        while (variantManifests.length < COUNT && attempts < attemptBudget && templates.length > 0) {
            attempts++;
            const result = tryPlaceFresh(ctx, baseExtras, GROUP_ARG, templates);
            if (!result.ok) { console.log(`  attempt ${attempts}: rejected — ${result.reason}`); continue; }
            const mutation = { objectType: GROUP_ARG, operation: 'group-reshuffle', count: templates.length };
            const ok = await tryAccept({
                extras: result.extras, mutation, relation: 'group-reshuffle', witnessRelation: 'exact-coordinate',
                inventoryPolicy: 'strict',
                description: `Group-reshuffle sibling of ${parentId}: re-placed all ${templates.length} ${GROUP_ARG} instance(s).`,
            });
            if (ok) console.log(`  attempt ${attempts}: accepted ${accepted[accepted.length - 1].id} — reshuffled all ${GROUP_ARG}`);
        }
    } else if (MODE === 'constrained-shuffle') {
        requestedCount = COUNT;
        attemptBudget = COUNT * MAX_ATTEMPTS_PER_SIBLING;
        while (variantManifests.length < COUNT && attempts < attemptBudget) {
            attempts++;
            const result = tryConstrainedShuffle(ctx, baseExtras);
            if (!result.ok) { console.log(`  attempt ${attempts}: rejected — ${result.reason}`); continue; }
            const mutation = { objectType: 'all-movable-types', operation: 'constrained-shuffle', order: CONSTRAINED_SHUFFLE_ORDER };
            const ok = await tryAccept({
                extras: result.extras, mutation, relation: 'constrained-shuffle', witnessRelation: 'exact-coordinate',
                inventoryPolicy: 'strict',
                description: `Constrained-shuffle sibling of ${parentId}: re-placed every legally-movable object.`,
            });
            if (ok) console.log(`  attempt ${attempts}: accepted ${accepted[accepted.length - 1].id} — full reshuffle`);
        }
    } else if (MODE === 're-embed') {
        const gridMatch = REEMBED_GRID_ARG.match(/^(\d+)x(\d+)$/);
        if (!gridMatch) { console.error(`--re-embed-grid must look like WxH, got '${REEMBED_GRID_ARG}'`); process.exit(2); }
        const newW = Number(gridMatch[1]), newH = Number(gridMatch[2]);
        if (newW < witness.w || newH < witness.h) {
            console.error(`--re-embed-grid (${newW}x${newH}) must be >= the parent's own grid (${witness.w}x${witness.h}) in both dimensions`);
            process.exit(2);
        }
        const maxOffsetX = newW - witness.w, maxOffsetY = newH - witness.h;
        let offsets;
        if (REEMBED_OFFSET_ARG) {
            const offsetMatch = REEMBED_OFFSET_ARG.match(/^(\d+),(\d+)$/);
            if (!offsetMatch) { console.error(`--re-embed-offset must look like x,y, got '${REEMBED_OFFSET_ARG}'`); process.exit(2); }
            const ox = Number(offsetMatch[1]), oy = Number(offsetMatch[2]);
            if (ox < 0 || oy < 0 || ox > maxOffsetX || oy > maxOffsetY) {
                console.error(`--re-embed-offset (${ox},${oy}) out of bounds for a ${newW}x${newH} grid holding a ${witness.w}x${witness.h} parent (max offset ${maxOffsetX},${maxOffsetY})`);
                process.exit(2);
            }
            offsets = [{ x: ox, y: oy }];
        } else {
            const seen = new Set();
            offsets = [];
            let tries = 0;
            const poolSize = (maxOffsetX + 1) * (maxOffsetY + 1);
            while (offsets.length < COUNT && tries < COUNT * MAX_ATTEMPTS_PER_SIBLING && seen.size < poolSize) {
                tries++;
                const ox = randInt(ctx.rng, 0, maxOffsetX), oy = randInt(ctx.rng, 0, maxOffsetY);
                const key = `${ox},${oy}`;
                if (seen.has(key)) continue;
                seen.add(key);
                offsets.push({ x: ox, y: oy });
            }
        }
        requestedCount = offsets.length;
        attemptBudget = offsets.length;
        console.log(`Re-embed: ${witness.w}x${witness.h} parent into ${newW}x${newH} grid, ${offsets.length} offset(s): ${offsets.map(o => `(${o.x},${o.y})`).join(', ')}.`);
        for (const { x: ox, y: oy } of offsets) {
            attempts++;
            const { witness: eWitness, extras: eExtras } = reEmbedWitnessAndExtras(witness, baseExtras, newW, newH, ox, oy);
            const mutation = { objectType: 'whole-level', operation: 're-embed', fromGrid: { w: witness.w, h: witness.h }, toGrid: { w: newW, h: newH }, offset: { x: ox, y: oy } };
            const ok = await tryAccept({
                extras: eExtras, mutation, relation: 're-embedded-cousin', witnessRelation: 'transformed',
                inventoryPolicy: 'strict', witnessObj: eWitness, witnessTag: 'transformed',
                description: `Re-embedded cousin of ${parentId}: ${witness.w}x${witness.h} content placed at offset (${ox},${oy}) in a ${newW}x${newH} grid.`,
            });
            if (ok) console.log(`  offset (${ox},${oy}): accepted ${accepted[accepted.length - 1].id} — requiredPathCoverageRatio -> ${requiredPathCoverageRatioOf(eWitness, eExtras).toFixed(3)}`);
        }
    }

    const newlyAcceptedCount = variantManifests.length;
    console.log(`\n${newlyAcceptedCount}/${requestedCount} new ${MODE} sibling(s) generated for ${parentId} in ${attempts} attempt(s) (budget ${attemptBudget}); ${accepted.length} total in ${OUT_FILE}.`);
    if (newlyAcceptedCount === 0) {
        console.log('family capacity: 0 accepted this run — every movable instance had zero legal alternative placement, or every attempt degenerated to an already-seen fingerprint. See per-attempt log above.');
    }

    // ─── write outputs (append-safe — see the existingAccepted load above) ─────────────────────
    const outAbs = resolveFromRoot(OUT_FILE);
    mkdirSync(path.dirname(outAbs), { recursive: true });
    const { levelsChanged, hintFilesChanged } = writeLevelsWithHints(outAbs, accepted);
    console.log(`Wrote ${accepted.length} level(s) total to ${OUT_FILE} (changed=${levelsChanged}), ${hintFilesChanged} hint file(s) written to ${path.join(path.dirname(OUT_FILE), 'hints')}/.`);

    const manifestAbs = resolveFromRoot(MANIFEST_FILE);
    const existingManifest = existsSync(manifestAbs) ? JSON.parse(readFileSync(manifestAbs, 'utf8')) : null;
    const canonicalizeVariantManifest = variant => {
        if (!variant || typeof variant !== 'object') return variant;
        const requiredPathCoverageRatio = variant.requiredPathCoverageRatio ?? variant.navDensity;
        const { navDensity: _legacyNavDensity, ...rest } = variant;
        return requiredPathCoverageRatio == null ? rest : { ...rest, requiredPathCoverageRatio };
    };
    const allVariants = [
        ...(existingManifest?.variants ?? []).map(canonicalizeVariantManifest),
        ...variantManifests.map(canonicalizeVariantManifest),
    ];
    const generationRun = {
        createdTimestamp: new Date().toISOString(), randomSeed: SEED,
        generatorVersion: GENERATOR_VERSION, generatorImplementation,
        variantIds: variantManifests.map(variant => variant.variantId),
    };
    const manifest = {
        schemaVersion: 2,
        familyId: FAMILY_ID, parentLevelId: parentId, parentCorpus: PARENT_CORPUS, parentContentHash,
        selectedWitnessSource: witnessSelection.source, selectedWitnessLength: witness.path.length - witness.jumps.size,
        selectedWitnessIntersectionCount: rawParent.reqInt,
        familyMode: MODE, generatorVersion: GENERATOR_VERSION, randomSeed: SEED,
        generationRuns: [...(existingManifest?.generationRuns ?? []), generationRun],
        createdTimestamp: existingManifest?.createdTimestamp ?? new Date().toISOString(),
        lastUpdatedTimestamp: new Date().toISOString(),
        requestedCount, acceptedCount: allVariants.length, generationAttempts: attempts, attemptBudget,
        movableInstanceCount: availableInstances.length,
        parentRequiredPathCoverageRatio: requiredPathCoverageRatioOf(witness, baseExtras),
        variants: allVariants,
    };
    if (!existsSync(path.dirname(manifestAbs))) mkdirSync(path.dirname(manifestAbs), { recursive: true });
    writeFileSync(manifestAbs, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote family manifest to ${MANIFEST_FILE} (${allVariants.length} variant(s) total).`);
}

main().catch(err => {
    console.error('family-generate error:', err);
    process.exit(1);
});