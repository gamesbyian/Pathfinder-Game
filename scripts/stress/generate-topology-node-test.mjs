#!/usr/bin/env node
/**
 * End-to-end smoke coverage for the topology-composition stress generator.
 *
 * The important contract is not merely "it writes JSON": generated rows must carry a referee-valid
 * witness, preserve the prespecified zero/crossing mixture, remain structurally unique, reproduce
 * from the same seed, and keep geometry construction independent from witness.mjs's generateWitness.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const { PACK } = await import('../../modules/domain/cell-key.js');
const { validateRawLevel } = await import('../../modules/domain/level-schema.js');
const { validateLevelDetailed } = await import('../../modules/domain/level-validation.js');
const { validateCandidatePath } = await import('../../modules/domain/path-validator.js');
const { getLevelFingerprintSource } = await import('../../modules/domain/level-fingerprint.js');
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');

async function generate(outFile) {
    return execFile('node', [
        'scripts/run-bundled.mjs',
        'scripts/stress/generate-topology.mjs',
        '--',
        '--count=12',
        '--master-seed=424242',
        '--id-prefix=Q',
        '--out=' + path.relative(ROOT, outFile),
    ], {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
    });
}

function packedWitness(level) {
    return level.stressMeta.witnessSolution.map(([x, y]) => PACK(x - 1, y - 1));
}

function countedIntersections(pathKeys) {
    const counts = new Map();
    let intersections = 0;
    for (const key of pathKeys) {
        const prior = counts.get(key) || 0;
        if (prior > 0) intersections++;
        counts.set(key, prior + 1);
    }
    return intersections;
}

function reproducibleShape(corpus) {
    return corpus.levels.map(level => ({
        fingerprint: getLevelFingerprintSource(level),
        witness: level.stressMeta.witnessSolution,
        intersectionProfile: level.stressMeta.intersectionProfile,
        macroGrid: level.stressMeta.macroGrid,
        macroPathLength: level.stressMeta.macroPathLength,
        crossingModules: level.stressMeta.crossingModules,
        mechanicCounts: level.stressMeta.mechanicCounts,
    }));
}

async function main() {
    const tmpRoot = path.join(ROOT, 'tmp');
    const tempDir = await mkdtemp(path.join(tmpRoot, 'topology-generator-test-'));
    try {
        const outA = path.join(tempDir, 'a.json');
        const outB = path.join(tempDir, 'b.json');

        const firstRun = await generate(outA);
        assert.match(firstRun.stdout, /Topology-composition stress generator/);
        assert.match(firstRun.stdout, /12 level\(s\)/);

        const corpusA = JSON.parse(await readFile(outA, 'utf8'));
        assert.equal(corpusA.generatorVersion, '0.1.0');
        assert.equal(corpusA.corpusName, 'topology-composition-v1');
        assert.equal(corpusA.levels.length, 12);

        const fingerprints = new Set();
        let zeroProfiles = 0;
        let crossingProfiles = 0;

        for (const level of corpusA.levels) {
            const schema = validateRawLevel(level);
            assert.ok(schema.ok, 'schema-valid: ' + (schema.errors || []).join('; '));

            const normalized = normalizeRawLevel(level, null);
            const structural = validateLevelDetailed(normalized);
            assert.ok(structural.ok, 'structurally valid: ' + structural.reasons.join('; '));

            const witness = packedWitness(level);
            const referee = validateCandidatePath(normalized, witness);
            assert.ok(referee.ok, 'stored witness passes canonical referee: ' + referee.reason);
            assert.equal(countedIntersections(witness), level.reqInt, 'reqInt matches witness revisits');

            const fingerprint = getLevelFingerprintSource(level);
            assert.ok(!fingerprints.has(fingerprint), 'generated rows are structurally unique');
            fingerprints.add(fingerprint);

            assert.equal(level.provenance.origin, 'procedural');
            assert.equal(
                level.provenance.history[0].method,
                'stress-topology-composition-generator'
            );
            assert.equal(level.stressMeta.generatorFamily, 'topology-composition');
            assert.equal(level.stressMeta.topologyKind, 'perfect-maze-diameter');
            assert.ok([4, 5].includes(level.stressMeta.macroGrid.w));
            assert.equal(level.stressMeta.macroGrid.w, level.stressMeta.macroGrid.h);
            assert.equal(level.grid.w, level.stressMeta.macroGrid.w * 3);
            assert.equal(level.grid.h, level.stressMeta.macroGrid.h * 3);
            assert.ok(level.stressMeta.macroPathLength >= 4);

            // v0.1 intentionally keeps these mechanics out so this is a distinct, cheap
            // construction family rather than a stealth expansion of reference-model scope.
            assert.equal(level.portals.length, 0);
            assert.equal(level.filters.length, 0);

            if (level.stressMeta.intersectionProfile === 'none') {
                zeroProfiles++;
                assert.equal(level.reqInt, 0);
                assert.equal(level.stressMeta.crossingModules, 0);
            } else {
                crossingProfiles++;
                assert.ok(level.reqInt >= 1);
                assert.equal(level.reqInt, level.stressMeta.crossingModules);
            }
        }

        assert.equal(zeroProfiles, 3, 'one quarter of a 12-row run is prespecified zero-intersection');
        assert.equal(crossingProfiles, 9, 'three quarters of a 12-row run use crossing modules');

        await generate(outB);
        const corpusB = JSON.parse(await readFile(outB, 'utf8'));
        assert.deepEqual(
            reproducibleShape(corpusA),
            reproducibleShape(corpusB),
            'same seed reproduces level structures, witnesses, topology metadata, and mechanic counts'
        );

        const source = await readFile(path.join(ROOT, 'scripts/stress/generate-topology.mjs'), 'utf8');
        const witnessImport = source.match(
            /import\s*\{([\s\S]*?)\}\s*from '\.\/witness\.mjs';/
        );
        assert.ok(witnessImport, 'generator imports shared witness validation/assembly helpers');
        assert.doesNotMatch(
            witnessImport[1],
            /\bgenerateWitness\b/,
            'topology generator does not import the Corpus-1/2 stochastic witness walker'
        );

        console.log('topology-composition generator smoke: OK');
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

await main();
