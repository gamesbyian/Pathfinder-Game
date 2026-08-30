#!/usr/bin/env node
/**
 * Nearest-neighbor triage: compares one target level (typically an unsolved stress-corpus-2 level,
 * profiled from its hidden witness and/or whatever hints it has) against the solution-space
 * fingerprint library built by solution-profile.mjs, and reports which known-solvable levels its
 * solution behavior most resembles — see docs/solution-profile.md.
 *
 * Freshness: before loading each --library file, checks it against its source corpus's CURRENT
 * hint content (see solution-profile-lib.mjs's computeHintSignature) and transparently
 * regenerates it in place if stale — this is the one place these libraries are actually read, so
 * it's the right (and only) place staleness is repaired; see docs/solution-profile.md's Freshness
 * section for why this isn't instead hooked into hint-discovery tooling. A library built from a
 * `--levels=` partial selection is left untouched (can't safely infer "stale" vs "intentionally
 * partial" from a hint-count mismatch alone) — regenerate those by hand if needed.
 *
 * Run via tsx (--target-level accepts a position, or, for a corpus whose levels carry an id like
 * both stress corpora do, the id itself — e.g. --target-level=R00042; see level-data-io.mjs's
 * parseLevelSelector for the shared resolution logic every corpus-capable tool uses):
 *   npx tsx scripts/stress/solution-profile-compare.mjs --target-level=42
 *       [--target-levels-json=data/stress/stress-levels-random.json]
 *       [--library=reports/stress/solution-profile-published.json,reports/stress/solution-profile-corpus1.json]
 *       [--bucket=combined] [--top=8]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readLevelsWithHints, parseLevelSelector } from '../level-data-io.mjs';
import { PACK } from '../../modules/domain/cell-key.ts';
import {
    buildBucketProfile, buildSinglePathProfile, extractObjectives, nearestProfiles,
    computeHintSignature, regenerateCorpusProfile,
} from './solution-profile-lib.mjs';
import { mustCrossKeysOf, requiredPathCoverageRatio } from '../../modules/domain/hint-novelty.ts';
import { NEAR_HAMILTONIAN_COVERAGE_THRESHOLD } from '../../modules/domain/path-features.ts';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const TARGET_LEVELS_JSON = args.get('--target-levels-json') || 'data/stress/stress-levels-random.json';
// A position number ("42") or, for a corpus whose levels carry an id, the id itself ("R00042") —
// resolved against the actual corpus in main(), not here, since resolution needs the loaded
// levels array (see parseLevelSelector in level-data-io.mjs).
const TARGET_LEVEL_SPEC = args.get('--target-level');
const LIBRARY_FILES = (args.get('--library') || 'reports/stress/solution-profile-published.json,reports/stress/solution-profile-corpus1.json')
    .split(',').map(s => s.trim()).filter(Boolean);
const BUCKET = args.get('--bucket') || 'combined';
const TOP_K = Number(args.get('--top') || 8);

/** Loads one library file, transparently regenerating it first if it's gone stale relative to its
 *  source corpus's current hint content (see module doc). Libraries missing `hintSignature`/
 *  `levelSpec` (files written before this check existed) are treated as stale full-corpus
 *  libraries and upgraded on first use, since the CLI always defaulted to a full-corpus run
 *  before --levels= existed. */
function ensureFreshLibrary(fullPath, fileLabel) {
    const parsed = JSON.parse(readFileSync(fullPath, 'utf8'));
    if (parsed.levelSpec && parsed.levelSpec !== 'all') return parsed; // intentionally partial — leave it alone
    if (!parsed.source) return parsed; // no known source corpus to check freshness against
    const sourceAbsPath = path.resolve(ROOT, parsed.source);
    if (!existsSync(sourceAbsPath)) return parsed;

    const levels = readLevelsWithHints(sourceAbsPath);
    const currentSignature = computeHintSignature(levels);
    if (parsed.hintSignature?.hash === currentSignature.hash) return parsed; // fresh

    console.warn(`[solution-profile] ${fileLabel} is stale relative to ${parsed.source} ` +
        `(${parsed.hintSignature?.totalHints ?? '?'} -> ${currentSignature.totalHints} hints) — regenerating...`);
    const { output } = regenerateCorpusProfile({
        levelsJsonAbsPath: sourceAbsPath,
        levelsJsonLabel: parsed.source,
        outAbsPath: fullPath,
        levelSpec: 'all',
        minHintsPerSource: parsed.minHintsPerSource ?? 3,
        seed: parsed.seed ?? 20260703,
    });
    console.warn(`[solution-profile] regenerated ${fileLabel} (${output.levels.length} levels, ${output.hintSignature.totalHints} hints).`);
    return output;
}

function loadPool(files, bucket) {
    const pool = [];
    for (const file of files) {
        const fullPath = path.resolve(ROOT, file);
        if (!existsSync(fullPath)) { console.warn(`[warn] library file not found, skipping: ${file}`); continue; }
        const parsed = ensureFreshLibrary(fullPath, file);
        const corpusTag = path.basename(file, '.json').replace(/^solution-profile-/, '');
        for (const levelEntry of parsed.levels || []) {
            const profile = bucket === 'combined' ? levelEntry.combined : levelEntry.bySource?.[bucket];
            if (!profile || profile.insufficientData) continue;
            pool.push({ id: `${corpusTag}#${levelEntry.level}`, solutionProfile: profile });
        }
    }
    return pool;
}

/** Resolves --target-level's raw spec (a position, or a corpus-level id like "R00042") against
 *  the loaded corpus into a single 1-based position. Errors on zero or more than one match — this
 *  flag names exactly one level, unlike --levels='s multi-level spec elsewhere. */
function resolveTargetPosition(levels, spec) {
    if (!spec) throw new Error('--target-level is required');
    const matches = [...parseLevelSelector(levels, spec)];
    if (matches.length === 0) throw new Error(`--target-level=${spec} matched no level`);
    if (matches.length > 1) throw new Error(`--target-level=${spec} matched ${matches.length} levels (${matches.join(',')}) — name exactly one`);
    return matches[0];
}

/** Builds the target's own profile: prefers its mined hints (if any exist on disk for this
 *  corpus), falls back to its hidden witness path (stressMeta.witnessSolution) — the only
 *  solution guaranteed to exist for an as-yet-unsolved-by-the-production-solver level. */
function buildTargetProfile(levels, levelNumber) {
    const level = levels[levelNumber - 1];
    if (!level) throw new Error(`Level ${levelNumber} not found`);

    const objectives = extractObjectives(level);
    const mcKeys = mustCrossKeysOf(level);
    const useCrossings = requiredPathCoverageRatio(level) >= NEAR_HAMILTONIAN_COVERAGE_THRESHOLD;

    if (level.hintRecords && level.hintRecords.length) {
        return {
            source: `${level.hintRecords.length} mined hint(s)`,
            solutionProfile: buildBucketProfile(level.hintRecords, level, objectives, mcKeys, useCrossings),
        };
    }
    const witnessPairs = level.stressMeta?.witnessSolution;
    if (Array.isArray(witnessPairs) && witnessPairs.length) {
        const path_ = witnessPairs.map(([x, y]) => PACK(x - 1, y - 1));
        return { source: 'hidden witness (single path — no mined corpus yet)', solutionProfile: buildSinglePathProfile(path_, level) };
    }
    throw new Error(`Level ${levelNumber} has neither mined hints nor a stressMeta.witnessSolution to profile.`);
}

function main() {
    if (!TARGET_LEVEL_SPEC) {
        console.error('Usage: --target-level=<n or id> [--target-levels-json=...] [--library=a.json,b.json] [--bucket=combined] [--top=8]');
        process.exit(1);
    }

    const targetLevelsPath = path.resolve(ROOT, TARGET_LEVELS_JSON);
    const targetLevels = readLevelsWithHints(targetLevelsPath);
    const targetPosition = resolveTargetPosition(targetLevels, TARGET_LEVEL_SPEC);
    const { source, solutionProfile: targetProfile } = buildTargetProfile(targetLevels, targetPosition);
    const pool = loadPool(LIBRARY_FILES, BUCKET);
    if (!pool.length) {
        console.error('No usable library entries found — run `npm run stress:solution-profile` for each corpus first.');
        process.exit(1);
    }

    const results = nearestProfiles(targetProfile, pool, TOP_K);

    console.log(`Target: ${TARGET_LEVELS_JSON}#${targetPosition} (--target-level=${TARGET_LEVEL_SPEC}) — profiled from ${source}`);
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
