#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/family-generate.mjs: the sibling/cousin research system's
 * local-mutant generator (docs/sibling-cousin-system.md). Fixtures are drawn from the REAL
 * published corpus (data/levels.json) rather than hand-built, because every entry there is
 * already referee-valid (enforced by check:hint-validity/test:hint-path-oracle in CI) — hand-
 * crafting a witness path with a genuine self-crossing (for mustCross coverage) or turn cells
 * (for landmark coverage) risks an accidentally-illegal fixture, which a search over already-
 * proven-valid real levels avoids entirely. This proves the CLI end to end: extras conversion,
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

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { readLevelsWithHints, writeLevelsWithHints } = await import('./level-data-io.mjs');
const { validateRawLevel } = await import('../modules/domain/level-schema.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');
const { parseRawLevel } = await import('../modules/domain/level-codec.js');
const { getLevelFingerprintSource } = await import('../modules/domain/level-fingerprint.js');

async function runGenerate(args) {
    return execFile('node', ['scripts/run-bundled.mjs', 'scripts/family-generate.mjs', ...args], {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
    });
}

/** First level in data/levels.json with >=1 stored hint and >=`minMovable` combined
 *  blocks/mustPass/mustCross/geese/falseGoals instances (movable under strict inventory). */
function findMovableFixture(levels, minMovable = 2) {
    for (let i = 0; i < levels.length; i++) {
        const lv = levels[i];
        if (!Array.isArray(lv.hints) || lv.hints.length === 0) continue;
        const movable = (lv.blocks?.length || 0) + (lv.mustPass?.length || 0)
            + (lv.mustCross?.length || 0) + (lv.geese?.length || 0) + (lv.falseGoals?.length || 0);
        if (movable >= minMovable) return { level: lv, position: i + 1 };
    }
    throw new Error(`no data/levels.json entry with a stored hint and >=${minMovable} movable instances`);
}

/** First level with a stored hint, >=1 landmark, AND a redundant landmark-derived blocks/mustPass
 *  entry (the real editor-export shape — see extrasFromParent's landmarkDerivedCoordSets comment). */
function findLandmarkFixture(levels) {
    for (let i = 0; i < levels.length; i++) {
        const lv = levels[i];
        if (!Array.isArray(lv.hints) || lv.hints.length === 0) continue;
        if (!Array.isArray(lv.landmarks) || lv.landmarks.length === 0) continue;
        const landmarkKeys = new Set(lv.landmarks.map(l => `${l.x},${l.y}`));
        const hasRedundant = (lv.blocks || []).some(b => landmarkKeys.has(`${b.x},${b.y}`))
            || (lv.mustPass || []).some(m => landmarkKeys.has(`${m.x},${m.y}`));
        if (hasRedundant) return { level: lv, position: i + 1 };
    }
    return null;
}

/** First level with a stored hint, >=1 static filter, AND >=2 movable objects — >=1 alone isn't
 *  enough to reliably test filter preservation: a single movable instance can legitimately have
 *  ZERO alternative legal cells (e.g. a lone mustCross when the witness only self-crosses once,
 *  which is the real "family capacity: 0" case data/levels.json's P00012 hits), producing zero
 *  siblings through no fault of the generator. >=2 instances makes it very likely at least one
 *  has somewhere to move. */
function findFilterFixture(levels) {
    for (let i = 0; i < levels.length; i++) {
        const lv = levels[i];
        if (!Array.isArray(lv.hints) || lv.hints.length === 0) continue;
        if (!Array.isArray(lv.filters) || lv.filters.length === 0) continue;
        const movable = (lv.blocks?.length || 0) + (lv.mustPass?.length || 0)
            + (lv.mustCross?.length || 0) + (lv.geese?.length || 0) + (lv.falseGoals?.length || 0);
        if (movable >= 2) return { level: lv, position: i + 1 };
    }
    return null;
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
        const allLevels = readLevelsWithHints(path.join(ROOT, 'data/levels.json'));

        // ── Test 1: happy path — generic movable objects, strict-inventory local mutants ──────
        const { level: parent } = findMovableFixture(allLevels, 2);
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
        assert.match(result.stdout, /\/3 local-mutant sibling\(s\) generated/);

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
        const landmarkFixture = findLandmarkFixture(allLevels);
        if (landmarkFixture) {
            const { level: lmParent } = landmarkFixture;
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
            for (const sibling of lmGenerated) {
                assert.equal(sibling.landmarks.length, lmParent.landmarks.length, 'landmark count preserved (strict inventory)');
                const landmarkKeys = new Set(sibling.landmarks.map(l => `${l.x},${l.y}`));
                for (const b of sibling.blocks) assert.ok(!landmarkKeys.has(`${b.x},${b.y}`), 'no block duplicated onto a landmark cell');
                for (const m of sibling.mustPass) assert.ok(!landmarkKeys.has(`${m.x},${m.y}`), 'no mustPass duplicated onto a landmark cell');
                assertSiblingValid(sibling, lmParent, lmParent.hints[0]);
            }
        } else {
            console.log('  (skipped: no landmark+redundant-encoding fixture found in the live corpus)');
        }

        // ── Test 4: static filters are carried through unchanged, never dropped ────────────────
        const filterFixture = findFilterFixture(allLevels);
        if (filterFixture) {
            const { level: fParent } = filterFixture;
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
        } else {
            console.log('  (skipped: no static-filter fixture found in the live corpus)');
        }
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
