#!/usr/bin/env node
/**
 * Read-only readiness audit for heatmap-novelty hint corpus expansion.
 *
 * Usage:
 *   npm run hints:expansion-audit
 *   npm run hints:expansion-audit -- --ratings=tmp/ratings.json --skip-tags=garbage --max-hints=1000
 *   npm run hints:expansion-audit -- --json
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { readLevelsWithHints } from './level-data-io.mjs';
import { coverageCellsForHints, heatmapNoveltyStats, pathSignature } from '../modules/domain/hint-novelty.ts';

function parseArgs(argv) {
    const args = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        args.set(key, rest.length ? rest.join('=') : 'true');
    }
    return args;
}

function readJson(path) {
    return JSON.parse(readFileSync(path, 'utf8'));
}

function normalizeRatings(rawRatings) {
    const byLevel = new Map();
    if (!Array.isArray(rawRatings)) return byLevel;
    for (const rating of rawRatings) {
        if (!Number.isInteger(rating.levelNumber)) continue;
        const tags = [...(Array.isArray(rating.tags) ? rating.tags : []), ...(Array.isArray(rating.customTags) ? rating.customTags : [])];
        byLevel.set(rating.levelNumber, new Set(tags.map(tag => String(tag).toLowerCase())));
    }
    return byLevel;
}

function analyzeLevel(level, levelNumber, opts) {
    const hints = level.hints || [];
    const seen = new Set();
    let duplicateHints = 0;
    for (const hint of hints) {
        const signature = pathSignature(hint);
        if (seen.has(signature)) duplicateHints++;
        seen.add(signature);
    }

    const tags = opts.ratingsByLevel.get(levelNumber) || new Set();
    const matchedSkipTags = [...opts.skipTags].filter(tag => tags.has(tag));
    const hintCount = hints.length;
    const capacity = Math.max(0, opts.maxHints - hintCount);
    let status = 'eligible';
    if (matchedSkipTags.length) status = 'skipped-tag';
    else if (capacity === 0) status = 'at-cap';

    return {
        level: levelNumber,
        status,
        matchedSkipTags,
        hintCount,
        capacity,
        duplicateHints,
        coverageCells: coverageCellsForHints(hints).size,
        ...heatmapNoveltyStats(level),
    };
}

function compareRecommendations(a, b) {
    if (b.untouchedNonObjectCells !== a.untouchedNonObjectCells) return b.untouchedNonObjectCells - a.untouchedNonObjectCells;
    if (b.topCellDominance !== a.topCellDominance) return b.topCellDominance - a.topCellDominance;
    return b.capacity - a.capacity;
}

function buildAudit(levels, opts) {
    const levelsOut = levels.map((level, idx) => analyzeLevel(level, idx + 1, opts));
    const summary = {
        totalLevels: levelsOut.length,
        eligibleLevels: levelsOut.filter(level => level.status === 'eligible').length,
        skippedByTag: levelsOut.filter(level => level.status === 'skipped-tag').length,
        atCap: levelsOut.filter(level => level.status === 'at-cap').length,
        totalHints: levelsOut.reduce((sum, level) => sum + level.hintCount, 0),
        totalRemainingCapacity: levelsOut.reduce((sum, level) => sum + (level.status === 'eligible' ? level.capacity : 0), 0),
        maxHintsPerLevel: opts.maxHints,
        skipTags: [...opts.skipTags],
    };
    const recommendations = levelsOut
        .filter(level => level.status === 'eligible' && level.capacity > 0)
        .sort(compareRecommendations)
        .slice(0, opts.limit);
    return { summary, recommendations, levels: levelsOut };
}

function printHuman(audit) {
    const { summary } = audit;
    console.log('Hint expansion readiness audit');
    console.log('================================');
    console.log(`Levels: ${summary.totalLevels}`);
    console.log(`Eligible: ${summary.eligibleLevels}`);
    console.log(`Skipped by tag (${summary.skipTags.join(', ') || 'none'}): ${summary.skippedByTag}`);
    console.log(`At/over cap (${summary.maxHintsPerLevel}): ${summary.atCap}`);
    console.log(`Existing hints: ${summary.totalHints}`);
    console.log(`Eligible remaining capacity: ${summary.totalRemainingCapacity}`);
    console.log('');
    console.log('Top heatmap-novelty candidates');
    console.log('------------------------------');
    for (const level of audit.recommendations) {
        console.log(
            `L${level.level}: hints=${level.hintCount}, capacity=${level.capacity}, `
            + `coverageCells=${level.coverageCells}, untouchedNonObjectCells=${level.untouchedNonObjectCells}, `
            + `coldCells=${level.coldTouchedCells}@<=${level.coldThreshold}, `
            + `entropy=${level.entropy}, topCellDominance=${level.topCellDominance}`,
        );
    }
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const maxHints = Number(args.get('--max-hints') || 1000);
    const limit = Number(args.get('--limit') || 20);
    const skipTags = new Set(String(args.get('--skip-tags') || 'garbage').split(',').map(tag => tag.trim().toLowerCase()).filter(Boolean));
    const ratingsByLevel = args.has('--ratings') ? normalizeRatings(readJson(args.get('--ratings'))) : new Map();
    const levels = readLevelsWithHints('data/levels.json');
    const audit = buildAudit(levels, { maxHints, limit, skipTags, ratingsByLevel });
    if (args.has('--json')) console.log(JSON.stringify(audit, null, 2));
    else printHuman(audit);
}

main();
