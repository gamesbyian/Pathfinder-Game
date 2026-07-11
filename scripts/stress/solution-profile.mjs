#!/usr/bin/env node
/**
 * Solution-space fingerprint generator for the known-solvable corpora.
 *
 * Builds one solution-space fingerprint per level (combined + per-provenance-source — see
 * solution-profile-lib.mjs) from that level's saved hint corpus, plus a corpus-wide summary.
 * Read-only against the corpus (never writes levels.json/hints/*); output is analysis tooling
 * under reports/stress/, per docs/solution-profile.md.
 *
 * Run via tsx (needed for the TS domain-layer imports solution-profile-lib.mjs pulls in):
 *   npx tsx scripts/stress/solution-profile.mjs [--levels-json=data/stress/stress-levels.json]
 *       [--out=reports/stress/solution-profile-corpus1.json] [--levels=all|1,2,3|1-10]
 *       [--min-hints-per-source=3] [--seed=20260703]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readLevelsWithHints } from '../level-data-io.mjs';
import { buildLevelSolutionProfile, summarizeCorpusProfiles, PROVENANCE_SOURCES } from './solution-profile-lib.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const LEVELS_JSON = args.get('--levels-json') || 'data/stress/stress-levels.json';
const CORPUS_TAG = path.basename(LEVELS_JSON, '.json') === 'levels' ? 'published' : path.basename(LEVELS_JSON, '.json');
const OUT_FILE = args.get('--out') || `reports/stress/solution-profile-${CORPUS_TAG}.json`;
const MIN_HINTS_PER_SOURCE = Number(args.get('--min-hints-per-source') || 3);
const SEED = Number(args.get('--seed') || 20260703);

function parseLevelSpec(spec, maxLevel) {
    if (!spec || spec === 'all') return Array.from({ length: maxLevel }, (_, i) => i + 1);
    const levels = [];
    const seen = new Set();
    const add = (n) => { if (Number.isFinite(n) && n >= 1 && n <= maxLevel && !seen.has(n)) { seen.add(n); levels.push(n); } };
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (!t) continue;
        if (t.includes('-')) {
            const [from, to] = t.split('-').map(v => Number(v.trim()));
            if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
            const step = from <= to ? 1 : -1;
            for (let n = from; step > 0 ? n <= to : n >= to; n += step) add(n);
        } else add(Number(t));
    }
    return levels;
}

function renderSummaryMd(summary, corpusTag, levelsJson) {
    const lines = [
        `# Solution-space fingerprint summary — ${corpusTag}`,
        '',
        `Generated from \`${levelsJson}\` by \`npm run stress:solution-profile\`. See ` +
        '[`docs/solution-profile.md`](../../docs/solution-profile.md) for what each field means and ' +
        'the "saturated, not complete" caution.',
        '',
        `- Levels: **${summary.levelsTotal}** total, **${summary.levelsWithHints}** with hints, ` +
        `**${summary.levelsInsufficientData}** with none.`,
        `- **${summary.levelsProvablyExhaustive}** levels have at least one hint whose own search ` +
        'terminated `exhaustive` (a real completeness signal, not the plateau heuristic below).',
        `- Mean hints/level: **${summary.meanHintCount}**. Mean pairwise distinctiveness: ` +
        `**${summary.meanPathwiseDistinctiveness}**. Mean turn rate: **${summary.meanTurnRate}** ` +
        `(cw fraction **${summary.meanCwFraction}**).`,
        `- Must-cross order: **${summary.levelsWithRigidMustCrossOrder}** / ` +
        `${summary.levelsWithMustCrossOrder} multi-must-cross levels show a single rigid entry+completion order.`,
        summary.meanDiscoverySaturationPlateauFraction === null
            ? '- Discovery-saturation plateau: n/a (no level had enough hints to detect one).'
            : `- Mean discovery-saturation plateau point: **${summary.meanDiscoverySaturationPlateauFraction}** ` +
              'of a level\'s hint corpus (heuristic — see doc; not proof of exhaustion).',
        '',
        '## Provenance-source coverage',
        '',
        '| Source | Levels with ≥ min-hints-per-source |',
        '|---|---|',
        ...PROVENANCE_SOURCES.map(s => `| ${s} | ${summary.sourceCoverage[s]} |`),
        '',
    ];
    return lines.join('\n');
}

function main() {
    const levelsJsonPath = path.resolve(ROOT, LEVELS_JSON);
    const levels = readLevelsWithHints(levelsJsonPath);
    const wanted = parseLevelSpec(args.get('--levels'), levels.length);

    const levelProfiles = wanted.map((levelNumber) => {
        const level = levels[levelNumber - 1];
        return buildLevelSolutionProfile(level, levelNumber, { minHintsPerSource: MIN_HINTS_PER_SOURCE, seed: SEED });
    });

    const summary = summarizeCorpusProfiles(levelProfiles);
    const output = {
        generatedAt: new Date().toISOString(),
        source: LEVELS_JSON,
        description: 'Per-level solution-space fingerprints (combined + per-provenance-source) for a '
            + 'known-solvable corpus — see docs/solution-profile.md.',
        minHintsPerSource: MIN_HINTS_PER_SOURCE,
        seed: SEED,
        corpusSummary: summary,
        levels: levelProfiles,
    };

    const outPath = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(outPath), { recursive: true });
    // Compact, not pretty-printed: this is a machine-readable fingerprint library, not a
    // hand-diffed doc (that's what the accompanying -summary.md is for) — at 606-level ×
    // multi-bucket scale, indent(1) alone multiplies file size several-fold for no benefit.
    writeFileSync(outPath, `${JSON.stringify(output)}\n`);

    const mdPath = outPath.replace(/\.json$/, '-summary.md');
    writeFileSync(mdPath, renderSummaryMd(summary, CORPUS_TAG, LEVELS_JSON));

    console.log(`Wrote ${levelProfiles.length} level fingerprint(s) to ${path.relative(ROOT, outPath)}`);
    console.log(`Wrote corpus summary to ${path.relative(ROOT, mdPath)}`);
    console.log(JSON.stringify(summary, null, 1));
}

main();
