#!/usr/bin/env node
/**
 * Batch driver for family-parent-hint-replay-lib.mjs's replay logic: walks every family manifest
 * in the wide research trove, tries every variant's discovered hint path against its canonical
 * parent (inverse-transformed for symmetry, as-is for exact-coordinate witness relations -- the
 * same eligibility replayVariantPath itself enforces), and persists every referee-accepted path as
 * a new parent hint via the existing hint-merge/provenance system (mergeVariantDerivedHint).
 *
 * Read-only until --save-hints is passed (dry run reports counts without writing).
 *
 * Usage: npx tsx scripts/family-parent-hint-replay-batch.mjs [--save-hints]
 *   [--corpora=published,corpus1,corpus2] [--variant-family-dataset-root=<data-worktree>] [--out=<report.json>]
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';
import { normalizeRawLevel } from '../modules/solver/normalization.ts';
import { validateCandidatePath } from '../modules/domain/path-validator.ts';
import { getLevelFingerprint } from '../modules/domain/level-fingerprint.ts';
import { mergeVariantDerivedHint, replayVariantPath } from './family-parent-hint-replay-lib.mjs';
import { familyArtifactRoots, variantFamilyDatasetRootArg } from './family-paths.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const SAVE = process.argv.includes('--save-hints');
const CORPORA = (args.get('--corpora') || 'published,corpus1,corpus2').split(',');
const OUT = args.get('--out') || 'reports/families/2026-08-08-parent-hint-replay.json';
const FAMILY_DATASET = familyArtifactRoots(variantFamilyDatasetRootArg());

const CORPUS_LEVELS_FILE = {
    published: 'data/levels.json',
    corpus1: 'data/stress/stress-levels.json',
    corpus2: 'data/stress/stress-levels-random.json',
};

const startedAt = Date.now();
const perCorpus = {};
const newlyRescued = []; // parents that went from 0 hints to >=1 hint via this pass

function discoverFamilyManifests(dir) {
    const found = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'hints') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...discoverFamilyManifests(fullPath));
        else if (entry.name.endsWith('-manifest.json')) {
            const manifest = JSON.parse(readFileSync(fullPath, 'utf8'));
            // `fragile-robust-census-manifest.json` is an array-shaped census, not a family.
            if (manifest && !Array.isArray(manifest) && Array.isArray(manifest.variants)) {
                found.push({ fullPath, manifest });
            }
        }
    }
    return found;
}

if (!existsSync(FAMILY_DATASET.families)) throw new Error(`family data root does not exist: ${FAMILY_DATASET.families}`);
const allManifests = discoverFamilyManifests(FAMILY_DATASET.families);

for (const corpus of CORPORA) {
    const levelsFile = CORPUS_LEVELS_FILE[corpus];
    if (!levelsFile) throw new Error(`unknown corpus: ${corpus}`);

    const levels = readLevelsWithHints(levelsFile);
    const byId = new Map(levels.map(l => [String(l.id), l]));
    const preExistingHintCount = new Map(levels.map(l => [String(l.id), l.hints.length]));
    const normalizedCache = new Map();

    const manifestFiles = allManifests.filter(({ manifest }) => manifest.parentCorpus === levelsFile);
    let variantsChecked = 0, variantsAccepted = 0, parentsTouched = new Set();

    for (const { fullPath: manifestPath, manifest } of manifestFiles) {
        const mf = path.relative(FAMILY_DATASET.families, manifestPath);
        const parent = byId.get(String(manifest.parentLevelId));
        // A missing parent is corpus/manifest drift, not an ineligible replay. Silently skipping
        // here previously omitted S00141's entire family after its manifest and level corpus used
        // different ids, while the batch still looked successful. Fail with enough context to fix
        // the data rather than publishing a knowingly incomplete report.
        if (!parent) {
            throw new Error(`${corpus}: ${mf} references missing parent level ${String(manifest.parentLevelId)}`);
        }
        let normalized = normalizedCache.get(parent.id);
        if (!normalized) {
            normalized = normalizeRawLevel(parent, null);
            normalizedCache.set(parent.id, normalized);
        }

        for (const edge of manifest.variants || []) {
            const hintFile = path.join(path.dirname(manifestPath), 'hints', `${edge.variantId}.json`);
            if (!existsSync(hintFile)) continue;
            let hintDoc;
            try {
                hintDoc = JSON.parse(readFileSync(hintFile, 'utf8'));
            } catch (error) {
                throw new Error(`${corpus}: could not parse variant hint file ${hintFile}`, { cause: error });
            }
            for (const hint of hintDoc.hints || []) {
                variantsChecked++;
                const result = replayVariantPath({
                    parentLevel: normalized, variantPath: hint.path, edge, validate: validateCandidatePath,
                });
                if (!result.accepted) continue;
                variantsAccepted++;
                parentsTouched.add(parent.id);
                // Merge in memory even during a dry run. Otherwise `newlyRescued` below always
                // reported zero without --save-hints because the parent's simulated after-count
                // never changed, defeating the point of previewing the write.
                parent.hintRecords = mergeVariantDerivedHint(parent.hintRecords, result.parentPath, {
                    variantId: edge.variantId,
                    parentId: manifest.parentLevelId,
                    familyId: manifest.familyId,
                    levelRevision: null, // filled in below, once per parent, not per hint
                    foundAt: manifest.lastUpdatedTimestamp ?? manifest.createdTimestamp,
                });
                parent.hints = parent.hintRecords.map(h => h.path);
            }
        }
    }

    if (SAVE) {
        // Backfill levelRevision now that every parent's final pre-write fingerprint is stable
        // (fingerprint excludes hints from its comparison fields, so computing it once per parent
        // after all merges is equivalent to per-hint and far cheaper).
        for (const parentId of parentsTouched) {
            const parent = byId.get(parentId);
            const revision = await getLevelFingerprint(parent);
            for (const rec of parent.hintRecords) {
                for (const p of rec.provenance) {
                    if (p.solver?.technique?.startsWith('variant-parent-replay:') && p.context && p.context.levelRevision == null) {
                        p.context.levelRevision = revision;
                    }
                }
            }
        }
        const changed = writeLevelsWithHints(levelsFile, levels);
        console.log(`${corpus}: wrote ${changed.hintFilesChanged} changed hint file(s), ${changed.levelsChanged} levels.json change(s).`);
    }

    for (const parentId of parentsTouched) {
        const before = preExistingHintCount.get(parentId) ?? 0;
        const after = byId.get(parentId).hints.length;
        if (before === 0 && after > 0) newlyRescued.push({ corpus, parentId, hintsGained: after });
    }

    perCorpus[corpus] = {
        manifestsProcessed: manifestFiles.length,
        manifestsSkippedNoParent: 0,
        variantsChecked, variantsAccepted,
        parentsTouched: parentsTouched.size,
    };
    console.log(`${corpus}: checked ${variantsChecked} variant hint(s), ${variantsAccepted} referee-accepted on parent, ${parentsTouched.size} distinct parent(s) touched.`);
}

const report = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), dryRun: !SAVE,
    elapsedMs: Date.now() - startedAt, perCorpus, newlyRescued,
};
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`\nNewly-rescued (canonical parent went from 0 to >=1 hint): ${newlyRescued.length}`);
for (const r of newlyRescued) console.log(`  ${r.corpus} ${r.parentId} (+${r.hintsGained} hint(s))`);
console.log(`\nWrote ${OUT}${SAVE ? '' : ' (dry run -- pass --save-hints to persist)'}.`);
