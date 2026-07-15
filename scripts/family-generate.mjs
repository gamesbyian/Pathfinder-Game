#!/usr/bin/env node
/* global structuredClone */
/**
 * Sibling/cousin research generator — local-mutant tier (docs/sibling-cousin-system.md).
 *
 * Takes a PARENT level + one of its own already-known witness paths (a stored hint, or a stress
 * level's stressMeta.witnessSolution), then produces "local mutant" siblings: single-object moves
 * that preserve the EXACT witness coordinate path under strict inventory. Reuses
 * scripts/stress/witness.mjs's buildRawLevel/validateWitnessOnRaw/witnessCellData verbatim (the
 * same referee-backed assembly the stress corpora are built with) and scripts/stress/witness-
 * adapter.mjs to turn the existing level+path into the witness-object shape those functions
 * expect. The per-object-type eligible-cell logic below intentionally MIRRORS (does not import)
 * scripts/stress/generate-random.mjs's opXUniform functions: importing them isn't possible
 * without either exporting private closures out of a script whose byte-stable determinism is
 * load-bearing for the already-shipped stress corpus, or refactoring it — both riskier than a
 * small, independently-tested duplication of ~10-15 line pure functions. See docs/sibling-cousin-
 * system.md section 11a for provenance handling and section 8 for the generation-mode vocabulary.
 *
 * Usage (needs the esbuild wrapper — imports TS domain modules):
 *   node scripts/run-bundled.mjs scripts/family-generate.mjs -- \
 *     --parent-corpus=data/levels.json --parent=P00006 --witness-index=0 --count=12 \
 *     --seed=20260716 --out=data/families/family-P00006.json
 *
 * --parent=<id-or-position>       required.
 * --witness-index=<n>             which of the parent's stored hints to preserve (default 0);
 *                                  falls back to stressMeta.witnessSolution if the parent has no
 *                                  stored hints (stress-corpus parents).
 * --mutation-types=<csv>          restrict which object types may be moved (default: all types
 *                                  the parent actually has an instance of).
 * --count=<n>                     target number of distinct siblings (default 12).
 * --max-attempts-per-sibling=<n>  generation-attempt budget per requested sibling (default 40).
 * --out=<path>                    sibling corpus file (default data/families/family-<id>.json).
 * --manifest-out=<path>           family manifest (default <out>, .json -> -manifest.json).
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const { PACK, UNPACK } = await import('../modules/domain/cell-key.js');
const { validateRawLevel } = await import('../modules/domain/level-schema.js');
const { baseLandmarkRole, resolveLandmarkTurn } = await import('../modules/domain/landmark-rules.js');
const { makeLevelProvenance, makeProvenanceEntry } = await import('../modules/domain/level-provenance-types.js');
const { getLevelFingerprint, getLevelFingerprintSource } = await import('../modules/domain/level-fingerprint.js');
const {
    mulberry32, buildRawLevel, validateWitnessOnRaw, witnessCellData,
} = await import('./stress/witness.mjs');
const { witnessFromLevelAndPath } = await import('./stress/witness-adapter.mjs');
const { inheritedWitnessHint } = await import('./stress/witness-provenance.mjs');
const { readLevelsWithHints, writeLevelsWithHints } = await import('./level-data-io.mjs');

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
const SEED = Number(args.get('--seed') || 20260716);
const MAX_ATTEMPTS_PER_SIBLING = Number(args.get('--max-attempts-per-sibling') || 40);
const MUTATION_TYPES_ARG = args.get('--mutation-types');

if (!PARENT_SELECTOR) {
    console.error('usage: family-generate.mjs --parent=<id-or-position> [--parent-corpus=data/levels.json] [--count=12] ...');
    process.exit(2);
}

const root = process.cwd();

// ─── load parent ────────────────────────────────────────────────────────────
const parentCorpusPath = path.join(root, PARENT_CORPUS);
const parentLevels = readLevelsWithHints(parentCorpusPath);
const parentIndex = parentLevels.findIndex((lv, i) => lv.id === PARENT_SELECTOR || String(i + 1) === PARENT_SELECTOR);
if (parentIndex === -1) {
    console.error(`No level matching --parent=${PARENT_SELECTOR} in ${PARENT_CORPUS}`);
    process.exit(2);
}
const rawParent = parentLevels[parentIndex];
const parentId = rawParent.id || `pos${parentIndex + 1}`;

const OUT_FILE = args.get('--out') || `data/families/family-${parentId}.json`;
const MANIFEST_FILE = args.get('--manifest-out') || OUT_FILE.replace(/\.json$/, '-manifest.json');
const FAMILY_ID = `family-${parentId}-w${WITNESS_INDEX}`;

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
    if (availableInstances.length === 0) {
        console.log(`family capacity: 0 — parent has no movable objects under strict inventory (mutation-types=${[...mutationTypes].join(',')}). Nothing to generate.`);
        process.exit(0);
    }

    const accepted = [];
    const seenFingerprints = new Set([parentFingerprintSource]);
    const variantManifests = [];
    let attempts = 0;
    const attemptBudget = COUNT * MAX_ATTEMPTS_PER_SIBLING;

    while (accepted.length < COUNT && attempts < attemptBudget) {
        attempts++;
        const attemptLog = [];
        const result = generateOneSibling(ctx, baseExtras, mutationTypes, attemptLog);
        if (!result) continue;

        const finalRaw = buildRawLevelWithFilters(witness, result.extras);
        finalRaw.designerName = rawParent.designerName || '';
        finalRaw.description = `Local-mutant sibling of ${parentId}: moved one ${result.mutation.objectType} object.`;
        finalRaw.difficulty = rawParent.difficulty ?? null;

        const fpSource = getLevelFingerprintSource(finalRaw);
        if (seenFingerprints.has(fpSource)) continue; // degenerate duplicate of parent or another accepted sibling
        seenFingerprints.add(fpSource);

        const schemaCheck = validateRawLevel(finalRaw);
        if (!schemaCheck.ok) { console.log(`  attempt ${attempts}: rejected at schema: ${schemaCheck.errors.join('; ')}`); continue; }
        const witnessCheck = validateWitnessOnRaw(finalRaw, witness.path);
        if (!witnessCheck.ok) { console.log(`  attempt ${attempts}: rejected at final witness re-check: ${witnessCheck.reason}`); continue; }

        const siblingId = `F${parentId.replace(/^[A-Za-z]/, '')}-${String(accepted.length + 1).padStart(2, '0')}`;
        finalRaw.id = siblingId;
        finalRaw.provenance = makeLevelProvenance([makeProvenanceEntry('procedural', 'local-mutant-generated', {
            method: 'family-generate.mjs',
            detail: {
                familyId: FAMILY_ID, parentLevelId: parentId, parentContentHash,
                relation: 'local-mutant', witnessRelation: 'exact-coordinate',
                mutation: result.mutation, generationSeed: SEED, generatorVersion: GENERATOR_VERSION,
            },
        })]);
        const levelFp = await getLevelFingerprint(finalRaw);
        finalRaw.hintRecords = [inheritedWitnessHint(witness.path, levelFp)];
        finalRaw.hints = [witness.path];

        accepted.push(finalRaw);
        variantManifests.push({
            variantId: siblingId, familyId: FAMILY_ID, relation: 'local-mutant',
            witnessRelation: 'exact-coordinate', randomSeed: SEED, inventoryPolicy: 'strict',
            parentContentHash, variantContentHash: levelFp,
            mutationManifest: result.mutation, generationAttempts: attempts,
        });
        console.log(`  attempt ${attempts}: accepted ${siblingId} — moved ${result.mutation.objectType} (${result.mutation.from.x},${result.mutation.from.y}) -> (${result.mutation.to.x},${result.mutation.to.y})`);
    }

    console.log(`\n${accepted.length}/${COUNT} local-mutant sibling(s) generated for ${parentId} in ${attempts} attempt(s) (budget ${attemptBudget}).`);
    if (accepted.length === 0) {
        console.log('family capacity: 0 accepted — every movable instance had zero legal alternative placement, or every attempt degenerated to an already-seen fingerprint. See per-attempt log above.');
    }

    // ─── write outputs ───────────────────────────────────────────────────────
    const outAbs = path.join(root, OUT_FILE);
    mkdirSync(path.dirname(outAbs), { recursive: true });
    const { levelsChanged, hintFilesChanged } = writeLevelsWithHints(outAbs, accepted);
    console.log(`Wrote ${accepted.length} level(s) to ${OUT_FILE} (changed=${levelsChanged}), ${hintFilesChanged} hint file(s) written to ${path.join(path.dirname(OUT_FILE), 'hints')}/.`);

    const manifestAbs = path.join(root, MANIFEST_FILE);
    const manifest = {
        familyId: FAMILY_ID, parentLevelId: parentId, parentCorpus: PARENT_CORPUS, parentContentHash,
        selectedWitnessSource: witnessSelection.source, selectedWitnessLength: witness.path.length - witness.jumps.size,
        selectedWitnessIntersectionCount: rawParent.reqInt,
        familyMode: 'local-mutant', generatorVersion: GENERATOR_VERSION, randomSeed: SEED,
        createdTimestamp: new Date().toISOString(),
        requestedCount: COUNT, acceptedCount: accepted.length, generationAttempts: attempts, attemptBudget,
        movableInstanceCount: availableInstances.length,
        variants: variantManifests,
    };
    if (!existsSync(path.dirname(manifestAbs))) mkdirSync(path.dirname(manifestAbs), { recursive: true });
    writeFileSync(manifestAbs, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote family manifest to ${MANIFEST_FILE}.`);
}

main().catch(err => {
    console.error('family-generate error:', err);
    process.exit(1);
});
