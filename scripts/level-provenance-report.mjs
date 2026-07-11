#!/usr/bin/env node
/**
 * Generates a machine-readable provenance report across all level corpora — the reporting half of
 * docs/level-corpus-provenance.md's "Machine-readable phase". Classification logic lives in
 * scripts/level-corpus-provenance.mjs (pure, unit-tested); this script is only the I/O: read the
 * corpus files (+ optionally an exported ratings snapshot for the published corpus), classify every
 * level, and write one combined JSON report plus a console summary.
 *
 * Read-only. Never mutates any corpus file.
 *
 * Usage:
 *   npm run levels:provenance-report
 *   npm run levels:provenance-report -- --ratings=tmp/ratings.json --output=tmp/provenance.json
 *
 * `--ratings=<path>` is the same flat JSON array `scripts/level-ratings-report.mjs --json` and
 * scripts/hint-corpus-expand.mjs's `--ratings` already consume: `[{levelNumber, tags, customTags, ...}]`.
 * Without it, every published level classifies purely from its level number (no tag-based tiers
 * reachable), which is still useful but strictly less informative.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
    classifyPublishedLevelProvenance, classifyStressLevelProvenance,
} from './level-corpus-provenance.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const resolveFromRoot = p => (path.isAbsolute(p) ? p : path.join(ROOT, p));

function parseArgs(argv) {
    const args = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const [key, ...rest] = arg.split('=');
        args.set(key, rest.length ? rest.join('=') : 'true');
    }
    return args;
}

async function atomicWriteJson(filePath, data) {
    const abs = path.resolve(filePath);
    await mkdir(path.dirname(abs), { recursive: true });
    const tmp = `${abs}.tmp-${process.pid}`;
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, abs);
}

async function loadRatingsByLevelNumber(ratingsPath) {
    if (!ratingsPath) return new Map();
    const raw = JSON.parse(await readFile(resolveFromRoot(ratingsPath), 'utf8'));
    const byLevel = new Map();
    for (const r of Array.isArray(raw) ? raw : []) {
        if (!Number.isInteger(r.levelNumber)) continue;
        const tags = [...(r.tags || []), ...(r.customTags || [])].map(t => String(t).toLowerCase());
        byLevel.set(r.levelNumber, tags);
    }
    return byLevel;
}

async function reportPublishedCorpus(ratingsPath) {
    const levels = JSON.parse(await readFile(resolveFromRoot('data/levels.json'), 'utf8'));
    const ratings = await loadRatingsByLevelNumber(ratingsPath);
    const perLevel = levels.map((_level, i) => {
        const levelNumber = i + 1;
        const classification = classifyPublishedLevelProvenance(levelNumber, ratings.get(levelNumber) || []);
        return { levelNumber, ...classification };
    });
    const byTier = {};
    for (const entry of perLevel) byTier[entry.tier] = (byTier[entry.tier] || 0) + 1;
    return {
        totalLevels: levels.length,
        ratingsLoaded: ratings.size,
        byTier,
        levels: perLevel,
    };
}

async function reportStressCorpusFile(relativePath) {
    const abs = resolveFromRoot(relativePath);
    let data;
    try {
        data = JSON.parse(await readFile(abs, 'utf8'));
    } catch {
        return null; // corpus file not present in this checkout (e.g. a slimmed-down clone) — skip, not fatal
    }
    const perLevel = (data.levels || []).map(level => ({
        id: level.id ?? null,
        ...classifyStressLevelProvenance(level.stressMeta),
    }));
    const byAdversarialIntent = {};
    const byOverfitRisk = {};
    const byBatch = {};
    for (const entry of perLevel) {
        byAdversarialIntent[entry.adversarialIntent] = (byAdversarialIntent[entry.adversarialIntent] || 0) + 1;
        byOverfitRisk[entry.overfitRisk] = (byOverfitRisk[entry.overfitRisk] || 0) + 1;
        if (entry.batch) byBatch[entry.batch] = (byBatch[entry.batch] || 0) + 1;
    }
    return {
        file: relativePath,
        totalLevels: perLevel.length,
        byAdversarialIntent,
        byOverfitRisk,
        byBatch,
        levels: perLevel,
    };
}

async function main() {
    const argMap = parseArgs(process.argv.slice(2));
    const output = argMap.get('--output') || 'reports/level-corpus-provenance-latest.json';
    const includeLevels = argMap.get('--include-levels') !== 'false';

    const published = await reportPublishedCorpus(argMap.get('--ratings'));
    const stress1 = await reportStressCorpusFile('data/stress/stress-levels.json');
    const stress2 = await reportStressCorpusFile('data/stress/stress-levels-random.json');

    const stripLevels = section => (section && !includeLevels ? { ...section, levels: undefined } : section);

    const report = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        published: stripLevels(published),
        stressCorpus1: stripLevels(stress1),
        stressCorpusRandom: stripLevels(stress2),
    };
    await atomicWriteJson(resolveFromRoot(output), report);

    console.log(`Published corpus (${published.totalLevels} levels, ${published.ratingsLoaded} rated): ${JSON.stringify(published.byTier)}`);
    if (stress1) console.log(`Stress corpus 1 (${stress1.totalLevels} levels): adversarialIntent=${JSON.stringify(stress1.byAdversarialIntent)} overfitRisk=${JSON.stringify(stress1.byOverfitRisk)} byBatch=${JSON.stringify(stress1.byBatch)}`);
    else console.log('Stress corpus 1: not present in this checkout, skipped.');
    if (stress2) console.log(`Stress corpus random (${stress2.totalLevels} levels): adversarialIntent=${JSON.stringify(stress2.byAdversarialIntent)} overfitRisk=${JSON.stringify(stress2.byOverfitRisk)}`);
    else console.log('Stress corpus random: not present in this checkout, skipped.');
    console.log(`\nReport -> ${output}`);
    if (!argMap.get('--ratings')) console.log("Tip: pass --ratings=<path to a level-ratings-report.mjs --json export> for tag-based published-corpus tiers ('great'/'common'/'garbage'); without it, only the level-number-based default applies.");
}

await main();
