#!/usr/bin/env node
/**
 * Builds the exact-labelling case batch for the precommitted Lane A C0 signature-collision
 * experiment (reports/2026-09-18-lane-a-c0-signature-collision-preflight-001.md): every crossing
 * prefix belonging to a distinct geometric cut (levelId + sorted cutCells) with >=2 crossing
 * prefixes in the already-frozen population, in cpsat-explicit-prefix-reference.yml's "cases"
 * format ({corpus, cases: [{id, levelId, prefix}]}).
 *
 * Reuses scripts/stress/lane-a-c0-collision-population-size.mjs's exact grouping logic (grouping by
 * the interface's real cutCells identity, not by level+target label, to avoid the redundancy that
 * report already documented) but emits the actual case rows instead of only counts. Zero new solver
 * compute: pure re-derivation from the already-frozen population/geometry artifacts, matching the
 * preflight's own precommitment (no new frontier sampling, no outcome inspected before dispatch).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const POPULATION_FILE = arg('population', 'reports/stress/lane-a-frozen-prefix-population-2026-09-18.json');
const GEOMETRY_FILE = arg('geometry', 'reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json');
const MIN_GROUP_SIZE = Number(arg('min-group-size', '2'));
const CORPUS = arg('corpus', 'data/stress/stress-levels-random.json');
const OUT = arg('out', 'reports/stress/lane-a-c0-signature-collision-cases-2026-09-19.json');

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));

const population = readJson(POPULATION_FILE);
const geometry = readJson(GEOMETRY_FILE);
const geometryByLevel = new Map(geometry.levels.map((l) => [l.id, l]));

const groupsByCutSignature = new Map();
for (const row of population.crossingRows) {
    const level = geometryByLevel.get(row.levelId);
    const iface = level.interfaces.find((i) => i.target === row.interfaceTarget && i.targetKey === row.interfaceTargetKey);
    const cutCells = [...iface.cutCells].sort((a, b) => a - b);
    const cutSignature = `${row.levelId}:${cutCells.join(',')}`;
    if (!groupsByCutSignature.has(cutSignature)) {
        groupsByCutSignature.set(cutSignature, { levelId: row.levelId, cutCells, rows: new Map() });
    }
    groupsByCutSignature.get(cutSignature).rows.set(row.caseId, row);
}

const groups = [...groupsByCutSignature.values()].map((g) => ({ ...g, rows: [...g.rows.values()] }));
const eligibleGroups = groups.filter((g) => g.rows.length >= MIN_GROUP_SIZE);

const cases = eligibleGroups.flatMap((group) => {
    const cutSignature = `${group.levelId}:${group.cutCells.join(',')}`;
    return group.rows.map((row) => ({
        // row.caseId alone is not globally unique across groups: the same physical crossing
        // prefix can legitimately cross two distinct chokepoints, so it appears as a member of
        // two different cut-signature groups with the identical caseId. Each (cut, prefix) pair
        // is still one query the analysis treats as belonging to its own signature group, so the
        // dispatched id must disambiguate by cutSignature or the GHA combiner rejects the batch
        // as containing duplicate case ids across shards.
        id: `${cutSignature}::${row.caseId}`,
        levelId: row.levelId,
        prefix: row.prefix,
        // C0 signature metadata, carried through verbatim so the analysis pass can group results by
        // the real cut identity without re-deriving it from the geometry census a second time.
        source: {
            cutSignature,
            cutCells: group.cutCells,
            interfaceTarget: row.interfaceTarget,
            interfaceTargetKey: row.interfaceTargetKey,
        },
    }));
});

writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify({
    schemaVersion: 1,
    kind: 'lane-a-c0-signature-collision-cases',
    corpus: CORPUS,
    populationSource: POPULATION_FILE,
    geometrySource: GEOMETRY_FILE,
    minGroupSize: MIN_GROUP_SIZE,
    eligibleGroups: eligibleGroups.length,
    distinctLevels: new Set(eligibleGroups.map((g) => g.levelId)).size,
    cases,
}, null, 2)}\n`);

console.log(JSON.stringify({
    eligibleGroups: eligibleGroups.length,
    distinctLevels: new Set(eligibleGroups.map((g) => g.levelId)).size,
    totalCases: cases.length,
    out: OUT,
}, null, 2));
