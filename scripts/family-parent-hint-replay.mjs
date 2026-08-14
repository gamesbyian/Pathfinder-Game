#!/usr/bin/env node
/** Validate a variant-discovered path on its canonical parent; writes only with --save-hints. */
import { readFileSync } from 'node:fs';
import { findFamilyResultRow } from './family-edge-identity.mjs';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';
import { normalizeRawLevel } from '../modules/solver/normalization.ts';
import { validateCandidatePath } from '../modules/domain/path-validator.ts';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.ts';
import { mergeVariantDerivedHint, replayVariantPath } from './family-parent-hint-replay-lib.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
for (const key of ['--parent-levels', '--manifest', '--variant-id']) {
    if (args.get(key)) continue;
    console.error('Usage: --parent-levels=<json> --manifest=<json> --variant-id=<id> ' +
        '(--path=k,k,...|--result=<json>) [--save-hints]');
    process.exit(2);
}

const levelsFile = args.get('--parent-levels');
const levels = readLevelsWithHints(levelsFile);
const manifest = JSON.parse(readFileSync(args.get('--manifest'), 'utf8'));
const edge = manifest.variants.find(variant => String(variant.variantId) === args.get('--variant-id'));
if (!edge) throw new Error('variant is absent from manifest');
const parent = levels.find(level => String(level.id) === String(manifest.parentLevelId));
if (!parent) throw new Error('canonical parent not found');

let variantPath = args.get('--path')?.split(',').map(Number);
let discoveryFoundAt = manifest.lastUpdatedTimestamp ?? manifest.createdTimestamp;
if (args.get('--result')) {
    const document = JSON.parse(readFileSync(args.get('--result'), 'utf8'));
    const row = findFamilyResultRow(document.levels ?? document.results ?? [], { parentCorpus:manifest.parentCorpus, parentId:manifest.parentLevelId, variantId:edge.variantId });
    if (!variantPath) variantPath = row?.solution ?? row?.path;
    discoveryFoundAt = row?.foundAt ?? row?.generatedAt ?? document.generatedAt ?? document.timestamp ?? discoveryFoundAt;
}

const normalized = normalizeRawLevel(parent, null);
const result = replayVariantPath({ parentLevel: normalized, variantPath, edge, validate: validateCandidatePath });
const save = argv.includes('--save-hints');
let persistence = { requested: save, written: false };
if (result.accepted && save) {
    const levelRevision = await getLevelFingerprint(parent);
    parent.hintRecords = mergeVariantDerivedHint(parent.hintRecords, result.parentPath, {
        variantId: edge.variantId,
        parentId: manifest.parentLevelId,
        familyId: manifest.familyId,
        levelRevision,
        foundAt: discoveryFoundAt,
    });
    parent.hints = parent.hintRecords.map(hint => hint.path);
    const changed = writeLevelsWithHints(levelsFile, levels);
    persistence = { requested: true, written: changed.hintFilesChanged > 0, ...changed };
}

const output = {
    schemaVersion: 1,
    dryRun: !save,
    parentId: manifest.parentLevelId,
    variantId: edge.variantId,
    familyId: manifest.familyId,
    ...result,
    persistence,
};
console.log(JSON.stringify(output, null, 2));
if (!result.accepted) process.exitCode = 1;
