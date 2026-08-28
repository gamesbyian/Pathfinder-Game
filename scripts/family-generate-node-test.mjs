#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/family-generate.mjs: the sibling/cousin research system's
 * local-mutant generator (docs/sibling-cousin-system.md). Fixtures are deliberately synthetic,
 * small, and independently referee-validated below. That keeps CLI correctness independent of the
 * live published corpus and makes landmark/filter coverage unconditional instead of silently
 * disappearing when today's corpus happens not to contain a matching specimen. This proves the
 * CLI end to end: extras conversion,
 * single-object relocation + re-validation, landmark-derived-coordinate exclusion, static-filter
 * preservation (buildRawLevel hardcodes `filters: []` — see family-generate.mjs's own comment),
 * provenance stamping, and manifest/hint-file output — not the underlying witness.mjs primitives,
 * which are covered by their own module.
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { buildBundle } from './run-bundled.mjs';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_GENERATE_BUNDLE = buildBundle('scripts/family-generate.mjs');
const { writeLevelsWithHints } = await import('./level-data-io.mjs');
const { validateRawLevel } = await import('../modules/domain/level-schema.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');
const { parseRawLevel } = await import('../modules/domain/level-codec.js');
const { getLevelFingerprintSource } = await import('../modules/domain/level-fingerprint.js');

async function runGenerate(args) {
    return execFile('node', [FAMILY_GENERATE_BUNDLE, ...args], {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
    });
}

const pack = (x, y) => (x | (y << 16)) >>> 0;
const witnessPath = [
    pack(0,0), pack(1,0), pack(2,0), pack(3,0), pack(4,0),
    pack(4,1), pack(4,2), pack(4,3), pack(4,4),
];

function fixtureLevel(id, overrides = {}) {
    const level = {
        id,
        grid: { w: 5, h: 5 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 5 },
        reqLen: 8,
        reqInt: 0,
        blocks: [{ x: 2, y: 3 }, { x: 3, y: 3 }],
        mustPass: [],
        mustCross: [],
        filters: [],
        flippingFilters: [],
        portals: [],
        geese: [],
        falseGoals: [],
        landmarks: [],
        hints: [witnessPath],
        designerName: '',
        description: '',
        difficulty: null,
        ...overrides,
    };
    const normalized = parseRawLevel(level, 0);
    assert.ok(normalized, `${id}: synthetic fixture parses`);
    const referee = validateCandidatePath(normalized, witnessPath);
    assert.ok(referee.ok, `${id}: synthetic witness is PLAY-valid: ${referee.reason}`);
    return level;
}

function movableFixture() {
    return fixtureLevel('TGEN01');
}

function landmarkFixture() {
    // Published/editor wire exports redundantly encode an impassable decorative landmark in
    // blocks. The generator must recognize those coordinates as one conceptual object.
    return fixtureLevel('TGEN02', {
        blocks: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }],
        landmarks: [{ x: 2, y: 3, objectType: 'park', role: 'decorative' }],
    });
}

function filterFixture() {
    // The witness traverses (3,1) horizontally, so this static filter is a real constraint that
    // must survive every generated sibling unchanged.
    return fixtureLevel('TGEN03', {
        filters: [{ x: 3, y: 1, axis: 1 }],
    });
}

async function writeFixtureCorpus(dirAbs, level) {
    await mkdir(dirAbs, { recursive: true });
    const levelsPathAbs = path.join(dirAbs, 'levels.json');
    // level.id is required: family-generate.mjs resolves --parent by id-or-position, and re-using
    // the parent's own real id keeps sibling ids (F<suffix>-NN) traceable in assertions below.
    writeLevelsWithHints(levelsPathAbs, [level]);
    return levelsPathAbs;
}

function assertSiblingValid(sibling, parent, witnessPath) {
    const schema = validateRawLevel(sibling);
    assert.ok(schema.ok, `schema-valid: ${schema.errors?.join('; ')}`);
    const normalized = parseRawLevel(sibling, 0);
    const referee = validateCandidatePath(normalized, witnessPath);
    assert.ok(referee.ok, `witness still validates on sibling: ${referee.reason}`);
    assert.equal(sibling.reqLen, parent.reqLen, 'reqLen preserved (strict inventory)');
    assert.equal(sibling.reqInt, parent.reqInt, 'reqInt preserved (strict inventory)');
    assert.notEqual(getLevelFingerprintSource(sibling), getLevelFingerprintSource(parent), 'sibling is structurally distinct from parent');
}

// family-generate.mjs resolves --parent-corpus/--out/--manifest-out as `path.join(process.cwd(),
// arg)`, which (unlike path.resolve) does NOT special-case an already-absolute `arg` — it
// concatenates unconditionally, producing a doubled/broken path. Every path handed to the CLI
// must therefore be ROOT-relative even though tempDir itself is absolute (mkdtemp's contract).
const rel = p => path.relative(ROOT, p);

async function main() {
    await mkdir(path.join(ROOT, 'tmp'), { recursive: true });
    const tempDir = await mkdtemp(path.join(ROOT, 'tmp', 'family-generate-test-'));
    try {
        // ── Test 1: happy path — generic movable objects, strict-inventory local mutants ──────
        const parent = movableFixture();
        const fixtureDir = path.join(tempDir, 'movable');
        const fixtureLevelsPathAbs = await writeFixtureCorpus(fixtureDir, parent);
        const outPath = path.join(tempDir, 'movable', 'out.json');
        const manifestPath = path.join(tempDir, 'movable', 'manifest.json');

        const result = await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--count=3', '--seed=42',
            `--out=${rel(outPath)}`, `--manifest-out=${rel(manifestPath)}`,
        ]);
        assert.match(result.stdout, /movable object instance\(s\)/);
        assert.match(result.stdout, /3\/3 new local-mutant sibling\(s\) generated/);

        const generated = JSON.parse(await readFile(outPath, 'utf8'));
        assert.ok(generated.length >= 1 && generated.length <= 3, 'generated 1-3 siblings');

        const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
        assert.equal(manifest.parentLevelId, parent.id);
        assert.equal(manifest.acceptedCount, generated.length);
        assert.equal(manifest.variants.length, generated.length);
        assert.equal(manifest.familyMode, 'local-mutant');

        const witnessPath = parent.hints[0];
        const seenIds = new Set();
        for (const sibling of generated) {
            assert.ok(/^F.+-\d{2}$/.test(sibling.id), `sibling id looks like F<suffix>-NN: ${sibling.id}`);
            assert.ok(!seenIds.has(sibling.id), 'sibling ids are unique within the family');
            seenIds.add(sibling.id);
            assertSiblingValid(sibling, parent, witnessPath);

            // Exactly one object moved: object-count deltas per mechanic sum to zero net, and
            // the provenance's own mutation record says 'move' with distinct from/to.
            const history = sibling.provenance.history;
            assert.equal(history.length, 1);
            assert.equal(history[0].actor, 'procedural');
            assert.equal(history[0].action, 'local-mutant-generated');
            assert.equal(history[0].detail.relation, 'local-mutant');
            assert.equal(history[0].detail.witnessRelation, 'exact-coordinate');
            assert.equal(history[0].detail.parentLevelId, parent.id);
            const mutation = history[0].detail.mutation;
            assert.equal(mutation.operation, 'move');
            assert.notDeepEqual(mutation.from, mutation.to, 'mutation actually relocated the object');
        }

        // The preserved witness's hint file carries exactly one INHERITED_WITNESS_ID-tagged entry.
        const firstSibling = generated[0];
        const hintsDirAbs = path.join(path.dirname(outPath), 'hints');
        const siblingHint = JSON.parse(await readFile(path.join(hintsDirAbs, `${firstSibling.id}.json`), 'utf8'));
        assert.equal(siblingHint.hints.length, 1);
        assert.deepEqual(siblingHint.hints[0].path, witnessPath);
        assert.equal(siblingHint.hints[0].provenance.length, 1);
        assert.equal(siblingHint.hints[0].provenance[0].solver.id, 'sibling-inherited-witness');
        assert.equal(siblingHint.hints[0].provenance[0].search.termination, 'witness');

        // ── Test 1b: --parent-corpus/--out/--manifest-out also work as ABSOLUTE paths ──────────
        // Regression test: family-generate.mjs used to resolve these via a bare
        // `path.join(process.cwd(), arg)`, which does NOT special-case an already-absolute `arg`
        // (path.join('/a/b', '/c/d') === '/a/b/c/d', not '/c/d') — an absolute --out would
        // silently write to a doubled, bogus nested path instead of the real location. Now fixed
        // via resolveFromRoot (path.isAbsolute-aware), matching hint-corpus-expand.mjs/hint-
        // complete-enumeration-sharded.mjs's existing pattern.
        const absOutPath = path.join(tempDir, 'movable', 'abs-out.json');
        const absManifestPath = path.join(tempDir, 'movable', 'abs-manifest.json');
        await runGenerate([
            `--parent-corpus=${fixtureLevelsPathAbs}`, // absolute, deliberately NOT relativized
            `--parent=${parent.id}`, '--count=2', '--seed=99',
            `--out=${absOutPath}`, `--manifest-out=${absManifestPath}`, // absolute
        ]);
        const absGenerated = JSON.parse(await readFile(absOutPath, 'utf8'));
        assert.ok(absGenerated.length >= 1, 'absolute --out/--manifest-out/--parent-corpus resolve to the real paths, not a doubled/bogus one');
        const absManifest = JSON.parse(await readFile(absManifestPath, 'utf8'));
        assert.equal(absManifest.parentLevelId, parent.id);

        // ── Test 2: --mutation-types restricts which object type gets moved ───────────────────
        const restrictedOut = path.join(tempDir, 'movable', 'restricted-out.json');
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--count=3', '--seed=1',
            '--mutation-types=blocks',
            `--out=${rel(restrictedOut)}`, `--manifest-out=${rel(path.join(tempDir, 'movable', 'restricted-manifest.json'))}`,
        ]);
        const restricted = JSON.parse(await readFile(restrictedOut, 'utf8'));
        for (const sibling of restricted) {
            assert.equal(sibling.provenance.history[0].detail.mutation.objectType, 'blocks', '--mutation-types=blocks only moves blocks');
        }

        // ── Test 3: landmark-derived blocks/mustPass are excluded, never double-placed ─────────
        const lmParent = landmarkFixture();
        const lmDir = path.join(tempDir, 'landmark');
        const lmLevelsPathAbs = await writeFixtureCorpus(lmDir, lmParent);
        const lmOut = path.join(lmDir, 'out.json');
        const lmResult = await runGenerate([
            `--parent-corpus=${path.relative(ROOT, lmLevelsPathAbs)}`,
            `--parent=${lmParent.id}`, '--count=3', '--seed=7',
            `--out=${rel(lmOut)}`, `--manifest-out=${rel(path.join(lmDir, 'manifest.json'))}`,
        ]);
        assert.doesNotMatch(lmResult.stderr || '', /INTERNAL/, 'no internal round-trip failure on a landmark-bearing parent');
        const lmGenerated = JSON.parse(await readFile(lmOut, 'utf8'));
        assert.ok(lmGenerated.length >= 1, 'synthetic landmark fixture must exercise at least one generated sibling');
        for (const sibling of lmGenerated) {
            assert.equal(sibling.landmarks.length, lmParent.landmarks.length, 'landmark count preserved (strict inventory)');
            const landmarkKeys = new Set(sibling.landmarks.map(l => `${l.x},${l.y}`));
            for (const b of sibling.blocks) assert.ok(!landmarkKeys.has(`${b.x},${b.y}`), 'no block duplicated onto a landmark cell');
            for (const m of sibling.mustPass) assert.ok(!landmarkKeys.has(`${m.x},${m.y}`), 'no mustPass duplicated onto a landmark cell');
            assertSiblingValid(sibling, lmParent, lmParent.hints[0]);
        }

        // ── Test 4: static filters are carried through unchanged, never dropped ────────────────
        const fParent = filterFixture();
        const fDir = path.join(tempDir, 'filter');
        const fLevelsPathAbs = await writeFixtureCorpus(fDir, fParent);
        const fOut = path.join(fDir, 'out.json');
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fLevelsPathAbs)}`,
            `--parent=${fParent.id}`, '--count=3', '--seed=3',
            `--out=${rel(fOut)}`, `--manifest-out=${rel(path.join(fDir, 'manifest.json'))}`,
        ]);
        const fGenerated = JSON.parse(await readFile(fOut, 'utf8'));
        assert.ok(fGenerated.length >= 1, 'at least one sibling generated for the filter fixture');
        for (const sibling of fGenerated) {
            assert.deepEqual(sibling.filters, fParent.filters, 'static filters carried through unchanged');
            assertSiblingValid(sibling, fParent, fParent.hints[0]);
        }

        // ── Test 5: symmetry mode — all 7 non-identity variants, transformed-witness provenance ──
        const symDir = path.join(tempDir, 'symmetry');
        const symOut = path.join(symDir, 'out.json');
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=symmetry', '--seed=1',
            `--out=${rel(symOut)}`, `--manifest-out=${rel(path.join(symDir, 'manifest.json'))}`,
        ]);
        const symGenerated = JSON.parse(await readFile(symOut, 'utf8'));
        assert.equal(symGenerated.length, 7, 'symmetry mode generates all 7 non-identity variants (grids are always square)');
        for (const sibling of symGenerated) {
            assert.equal(sibling.grid.w, parent.grid.w, 'symmetry never changes grid width (square grids)');
            assert.equal(sibling.grid.h, parent.grid.h, 'symmetry never changes grid height');
            assert.equal(sibling.reqLen, parent.reqLen);
            assert.equal(sibling.reqInt, parent.reqInt);
            assert.equal(sibling.provenance.history[0].detail.relation, 'symmetry');
            assert.equal(sibling.provenance.history[0].detail.witnessRelation, 'transformed');
            const symHint = JSON.parse(await readFile(path.join(symDir, 'hints', `${sibling.id}.json`), 'utf8'));
            assert.equal(symHint.hints[0].provenance[0].solver.id, 'sibling-transformed-witness', 'symmetry tags its witness as transformed, not inherited');
            assert.notDeepEqual(symHint.hints[0].path, witnessPath, 'a rotated/reflected witness has different coordinates from the parent\'s (except in the coincidental self-symmetric case, not expected for this fixture)');
            const referee = validateCandidatePath(parseRawLevel(sibling, 0), symHint.hints[0].path);
            assert.ok(referee.ok, `transformed witness still validates on its own transformed level: ${referee.reason}`);
        }

        // ── Test 6: swap mode — relation/mutation shape, still referee-valid ────────────────────
        const swapDir = path.join(tempDir, 'swap');
        const swapOut = path.join(swapDir, 'out.json');
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=swap', '--count=3', '--seed=1',
            `--out=${rel(swapOut)}`, `--manifest-out=${rel(path.join(swapDir, 'manifest.json'))}`,
        ]);
        const swapGenerated = JSON.parse(await readFile(swapOut, 'utf8'));
        for (const sibling of swapGenerated) {
            const detail = sibling.provenance.history[0].detail;
            assert.equal(detail.relation, 'swap');
            assert.equal(detail.mutation.operation, 'swap');
            assert.ok(detail.mutation.a && detail.mutation.b, 'swap mutation records both swapped instances');
            assertSiblingValid(sibling, parent, witnessPath);
        }

        // ── Test 7: group-reshuffle mode — only the targeted type moves, its count is preserved ──
        const grDir = path.join(tempDir, 'group-reshuffle');
        const grOut = path.join(grDir, 'out.json');
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=group-reshuffle', '--group=blocks', '--count=3', '--seed=1',
            `--out=${rel(grOut)}`, `--manifest-out=${rel(path.join(grDir, 'manifest.json'))}`,
        ]);
        const grGenerated = JSON.parse(await readFile(grOut, 'utf8'));
        assert.ok(grGenerated.length >= 1, 'at least one group-reshuffle sibling generated');
        for (const sibling of grGenerated) {
            assert.equal(sibling.provenance.history[0].detail.relation, 'group-reshuffle');
            assert.equal((sibling.blocks || []).length, (parent.blocks || []).length, 'block count preserved (strict inventory)');
            assertSiblingValid(sibling, parent, witnessPath);
        }

        // ── Test 8: constrained-shuffle mode — every movable type's count preserved at once ──────
        const csDir = path.join(tempDir, 'constrained-shuffle');
        const csOut = path.join(csDir, 'out.json');
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=constrained-shuffle', '--count=3', '--seed=1',
            `--out=${rel(csOut)}`, `--manifest-out=${rel(path.join(csDir, 'manifest.json'))}`,
        ]);
        const csGenerated = JSON.parse(await readFile(csOut, 'utf8'));
        assert.ok(csGenerated.length >= 1, 'at least one constrained-shuffle sibling generated');
        for (const sibling of csGenerated) {
            assert.equal(sibling.provenance.history[0].detail.relation, 'constrained-shuffle');
            for (const kind of ['blocks', 'mustPass', 'mustCross', 'geese', 'falseGoals']) {
                assert.equal((sibling[kind] || []).length, (parent[kind] || []).length, `${kind} count preserved`);
            }
            assertSiblingValid(sibling, parent, witnessPath);
        }

        // ── Test 9: re-embed mode — the first COUSIN tier: grid grows, navDensity drops, reqLen/reqInt fixed ──
        const reDir = path.join(tempDir, 're-embed');
        const reOut = path.join(reDir, 'out.json');
        const biggerW = parent.grid.w + 4, biggerH = parent.grid.h + 4;
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=re-embed', `--re-embed-grid=${biggerW}x${biggerH}`, '--count=3', '--seed=1',
            `--out=${rel(reOut)}`, `--manifest-out=${rel(path.join(reDir, 'manifest.json'))}`,
        ]);
        const reGenerated = JSON.parse(await readFile(reOut, 'utf8'));
        assert.ok(reGenerated.length >= 1, 'at least one re-embed cousin generated');
        for (const sibling of reGenerated) {
            const detail = sibling.provenance.history[0].detail;
            assert.equal(detail.relation, 're-embedded-cousin');
            assert.equal(detail.witnessRelation, 'transformed');
            assert.equal(sibling.grid.w, biggerW, 're-embed actually grows the grid width');
            assert.equal(sibling.grid.h, biggerH, 're-embed actually grows the grid height');
            assert.equal(sibling.reqLen, parent.reqLen, 'reqLen fixed across re-embedding');
            assert.equal(sibling.reqInt, parent.reqInt, 'reqInt fixed across re-embedding');
            const reHint = JSON.parse(await readFile(path.join(reDir, 'hints', `${sibling.id}.json`), 'utf8'));
            const referee = validateCandidatePath(parseRawLevel(sibling, 0), reHint.hints[0].path);
            assert.ok(referee.ok, `re-embedded witness still validates in the larger grid: ${referee.reason}`);
        }
        // A grid that's too small in either dimension must be rejected, not silently clamped.
        const tooSmall = await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=re-embed', `--re-embed-grid=${parent.grid.w - 1}x${parent.grid.h}`,
            `--out=${rel(path.join(reDir, 'toosmall.json'))}`,
        ]).catch(e => e);
        assert.ok(tooSmall instanceof Error && tooSmall.code === 2, '--re-embed-grid smaller than the parent exits 2, not a silent no-op');

        // ── Test 10: regression — different modes against the SAME parent, writing into a SHARED
        // hints/ directory, must never collide on sibling ids or overwrite each other's hint files.
        // This is a real bug this test file previously did not catch: before mode-qualified ids
        // (F<suffix>-<modeAbbrev>-NN, not just F<suffix>-NN), two modes run back to back into the
        // same directory silently overwrote each other's hint files with a DIFFERENT witness path
        // under the SAME id, and the second corpus's own witness would fail re-validation against
        // whichever mode wrote last. ─────────────────────────────────────────────────────────────
        const sharedDir = path.join(tempDir, 'shared');
        const lmSharedOut = path.join(sharedDir, 'local-mutant.json');
        const symSharedOut = path.join(sharedDir, 'symmetry.json');
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=local-mutant', '--count=3', '--seed=1',
            `--out=${rel(lmSharedOut)}`, `--manifest-out=${rel(path.join(sharedDir, 'lm-manifest.json'))}`,
        ]);
        await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=symmetry', '--seed=1',
            `--out=${rel(symSharedOut)}`, `--manifest-out=${rel(path.join(sharedDir, 'sym-manifest.json'))}`,
        ]);
        const lmShared = JSON.parse(await readFile(lmSharedOut, 'utf8'));
        const symShared = JSON.parse(await readFile(symSharedOut, 'utf8'));
        const lmIds = new Set(lmShared.map(l => l.id));
        const symIds = new Set(symShared.map(l => l.id));
        assert.equal([...lmIds].filter(id => symIds.has(id)).length, 0, 'local-mutant and symmetry ids never collide in a shared hints directory');
        for (const l of lmShared) assert.ok(l.id.includes('-lm-'), `local-mutant id is mode-tagged: ${l.id}`);
        for (const s of symShared) assert.ok(s.id.includes('-sym-'), `symmetry id is mode-tagged: ${s.id}`);
        // Each corpus's own hint file must still validate against ITS OWN level, not the other
        // mode's — this is the actual data-corruption check, not just an id-string check.
        for (const l of lmShared) {
            const hint = JSON.parse(await readFile(path.join(sharedDir, 'hints', `${l.id}.json`), 'utf8'));
            const referee = validateCandidatePath(parseRawLevel(l, 0), hint.hints[0].path);
            assert.ok(referee.ok, `${l.id}'s own hint file still validates against its own level (no cross-mode corruption): ${referee.reason}`);
        }
        for (const s of symShared) {
            const hint = JSON.parse(await readFile(path.join(sharedDir, 'hints', `${s.id}.json`), 'utf8'));
            const referee = validateCandidatePath(parseRawLevel(s, 0), hint.hints[0].path);
            assert.ok(referee.ok, `${s.id}'s own hint file still validates against its own level (no cross-mode corruption): ${referee.reason}`);
        }

        // ── Test 11: re-running the SAME mode with a different seed ADDS to, not replaces, the
        // existing output — append-safe re-runs (docs/sibling-cousin-system.md section 23). ──────
        const rerunResult = await runGenerate([
            `--parent-corpus=${path.relative(ROOT, fixtureLevelsPathAbs)}`,
            `--parent=${parent.id}`, '--mode=local-mutant', '--count=2', '--seed=999',
            `--out=${rel(lmSharedOut)}`, `--manifest-out=${rel(path.join(sharedDir, 'lm-manifest.json'))}`,
        ]);
        assert.match(rerunResult.stdout, /Found 3 existing sibling\(s\)/, 're-run detects and reports the existing siblings');
        const lmAfterRerun = JSON.parse(await readFile(lmSharedOut, 'utf8'));
        assert.equal(lmAfterRerun.length, 5, 're-run ADDS 2 more to the existing 3, not replaces them (3+2=5)');
        const idsAfterRerun = new Set(lmAfterRerun.map(l => l.id));
        assert.equal(idsAfterRerun.size, 5, 'no id collisions across the two runs');
        for (const originalId of lmIds) assert.ok(idsAfterRerun.has(originalId), `original sibling ${originalId} survived the re-run untouched`);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
