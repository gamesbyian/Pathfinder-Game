#!/usr/bin/env node
/**
 * Nearest-neighbor triage: compares one target level (typically an unsolved stress-corpus-2 level,
 * profiled from its hidden witness and/or whatever hints it has) against the solution-space
 * fingerprint library built by solution-profile.mjs, and reports which known-solvable levels its
 * solution behavior most resembles — see docs/solution-profile.md.
 *
 * Run via tsx:
 *   npx tsx scripts/stress/solution-profile-compare.mjs --target-level=42
 *       [--target-levels-json=data/stress/stress-levels-random.json]
 *       [--library=reports/stress/solution-profile-published.json,reports/stress/solution-profile-corpus1.json]
 *       [--bucket=combined] [--top=8]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readLevelsWithHints } from '../level-data-io.mjs';
import { PACK } from '../../modules/domain/cell-key.ts';
import { buildBucketProfile, buildSinglePathProfile, extractObjectives, nearestProfiles } from './solution-profile-lib.mjs';
import { mustCrossKeysOf, navigableDensity } from '../../modules/domain/hint-novelty.ts';
import { NEAR_HAMILTONIAN_DENSITY } from '../../modules/domain/path-features.ts';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const TARGET_LEVELS_JSON = args.get('--target-levels-json') || 'data/stress/stress-levels-random.json';
const TARGET_LEVEL = Number(args.get('--target-level'));
const LIBRARY_FILES = (args.get('--library') || 'reports/stress/solution-profile-published.json,reports/stress/solution-profile-corpus1.json')
    .split(',').map(s => s.trim()).filter(Boolean);
const BUCKET = args.get('--bucket') || 'combined';
const TOP_K = Number(args.get('--top') || 8);

function loadPool(files, bucket) {
    const pool = [];
    for (const file of files) {
        const fullPath = path.resolve(ROOT, file);
        if (!existsSync(fullPath)) { console.warn(`[warn] library file not found, skipping: ${file}`); continue; }
        const parsed = JSON.parse(readFileSync(fullPath, 'utf8'));
        const corpusTag = path.basename(file, '.json').replace(/^solution-profile-/, '');
        for (const levelEntry of parsed.levels || []) {
            const profile = bucket === 'combined' ? levelEntry.combined : levelEntry.bySource?.[bucket];
            if (!profile || profile.insufficientData) continue;
            pool.push({ id: `${corpusTag}#${levelEntry.level}`, profile });
        }
    }
    return pool;
}

/** Builds the target's own profile: prefers its mined hints (if any exist on disk for this
 *  corpus), falls back to its hidden witness path (stressMeta.witnessSolution) — the only
 *  solution guaranteed to exist for an as-yet-unsolved-by-the-production-solver level. */
function buildTargetProfile(levelsJsonPath, levelNumber) {
    const levels = readLevelsWithHints(levelsJsonPath);
    const level = levels[levelNumber - 1];
    if (!level) throw new Error(`Level ${levelNumber} not found in ${levelsJsonPath}`);

    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = navigableDensity(level) >= NEAR_HAMILTONIAN_DENSITY;

    if (level.hintRecords && level.hintRecords.length) {
        return {
            source: `${level.hintRecords.length} mined hint(s)`,
            profile: buildBucketProfile(level.hintRecords, level, objectives, mcKeys, useCrossings),
        };
    }
    const witnessPairs = level.stressMeta?.witnessSolution;
    if (Array.isArray(witnessPairs) && witnessPairs.length) {
        const path_ = witnessPairs.map(([x, y]) => PACK(x - 1, y - 1));
        return { source: 'hidden witness (single path — no mined corpus yet)', profile: buildSinglePathProfile(path_, level) };
    }
    throw new Error(`Level ${levelNumber} has neither mined hints nor a stressMeta.witnessSolution to profile.`);
}

function main() {
    if (!Number.isFinite(TARGET_LEVEL)) {
        console.error('Usage: --target-level=<n> [--target-levels-json=...] [--library=a.json,b.json] [--bucket=combined] [--top=8]');
        process.exit(1);
    }

    const targetLevelsPath = path.resolve(ROOT, TARGET_LEVELS_JSON);
    const { source, profile: targetProfile } = buildTargetProfile(targetLevelsPath, TARGET_LEVEL);
    const pool = loadPool(LIBRARY_FILES, BUCKET);
    if (!pool.length) {
        console.error('No usable library entries found — run `npm run stress:solution-profile` for each corpus first.');
        process.exit(1);
    }

    const results = nearestProfiles(targetProfile, pool, TOP_K);

    console.log(`Target: ${TARGET_LEVELS_JSON}#${TARGET_LEVEL} — profiled from ${source}`);
    console.log(`Library: ${pool.length} level fingerprints from [${LIBRARY_FILES.join(', ')}] (bucket=${BUCKET})`);
    console.log('');
    console.log(`Nearest known-solvable levels (lower distance = more similar solution-space behavior):`);
    for (const r of results) {
        const worstAxis = Object.entries(r.terms)
            .filter(([, v]) => v !== null)
            .sort((a, b) => b[1] - a[1])[0];
        console.log(`  ${r.id.padEnd(24)} distance=${r.distance}` + (worstAxis ? `  (most different on: ${worstAxis[0]}=${worstAxis[1]})` : ''));
    }
    console.log('');
    console.log('Full per-axis breakdown for the nearest match:');
    console.log(JSON.stringify(results[0], null, 1));
}

main();
