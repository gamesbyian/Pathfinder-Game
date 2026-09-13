#!/usr/bin/env node
/**
 * Known-solution sample-profile generator for the known-solvable corpora.
 *
 * Builds one observed-solution profile per level (combined + per-provenance-origin; see
 * solution-profile-lib.mjs) from that level's saved hint corpus, plus a corpus-wide summary.
 * Read-only against the corpus (never writes levels.json/hints/*); output is analysis tooling
 * under reports/stress/, per docs/solver-solution-profile.md.
 *
 * This is a thin CLI over solution-profile-lib.mjs's regenerateCorpusProfile() — the same
 * function solution-profile-compare.mjs calls automatically when it finds a full library stale.
 * Run this directly when you want to force a regen or build a non-default/partial library via
 * --levels=. A generated profile describes the stored solution sample; it does not assert that
 * the latent solution space has been exhaustively measured.
 *
 * Run via tsx (needed for the TS domain-layer imports solution-profile-lib.mjs pulls in). --levels
 * accepts positions or, for a corpus whose levels carry an id (both stress corpora), the id
 * itself (see level-data-io.mjs's parseLevelSelector, the shared parser every corpus-capable tool
 * uses):
 *   npx tsx scripts/stress/solution-profile.mjs [--levels-json=data/stress/stress-levels.json]
 *       [--out=reports/stress/solution-profile-corpus1.json] [--levels=all|id:1,id:2,id:3|id:1-10|S00028,R00042]
 *       [--min-hints-per-source=3] [--seed=20260703]
 */
import path from 'node:path';
import process from 'node:process';

import { regenerateCorpusProfile } from './solution-profile-lib.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const LEVELS_JSON = args.get('--levels-json') || 'data/stress/stress-levels.json';
const CORPUS_TAG = path.basename(LEVELS_JSON, '.json') === 'levels' ? 'published' : path.basename(LEVELS_JSON, '.json');
const OUT_FILE = args.get('--out') || `reports/stress/solution-profile-${CORPUS_TAG}.json`;
const MIN_HINTS_PER_SOURCE = Number(args.get('--min-hints-per-source') || 3);
const SEED = Number(args.get('--seed') ?? 20260703);
const LEVEL_SPEC = args.get('--levels') || 'all';

function main() {
    const { output, outAbsPath, mdPath } = regenerateCorpusProfile({
        levelsJsonAbsPath: path.resolve(ROOT, LEVELS_JSON),
        levelsJsonLabel: LEVELS_JSON,
        outAbsPath: path.resolve(ROOT, OUT_FILE),
        levelSpec: LEVEL_SPEC,
        minHintsPerSource: MIN_HINTS_PER_SOURCE,
        seed: SEED,
    });

    console.log(`Wrote ${output.levels.length} level profile(s) to ${path.relative(ROOT, outAbsPath)}`);
    console.log(`Wrote corpus summary to ${path.relative(ROOT, mdPath)}`);
    console.log(JSON.stringify(output.corpusSummary, null, 1));
}

main();
