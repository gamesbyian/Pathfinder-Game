#!/usr/bin/env node
/**
 * Stress-corpus novelty comparison tool.
 *
 * Compares every stress level against (a) the published corpus (data/levels.json +
 * representative hints as witness geometry) and (b) the rest of the stress corpus,
 * over dimensions, reqLen/reqInt, mechanic counts and distributions, block/portal/
 * flipper topology, gate layout, and witness geometry (occupancy, coverage, perimeter/
 * center usage, turn profile, intersection timing, branching/closure characteristics).
 *
 * Pure JS — runs under plain node:
 *   node scripts/stress/compare.mjs [--corpus=data/stress/stress-levels.json]
 *       [--out=reports/stress/novelty-report.json] [--dupe-threshold=0.1]
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { levelFeatures, levelDistance, packedToPair } from './features.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels.json';
const OUT_FILE = args.get('--out') || 'reports/stress/novelty-report.json';
const DUPE_THRESHOLD = Number(args.get('--dupe-threshold') || 0.1);

function loadPublished() {
    const levels = JSON.parse(readFileSync(path.join(ROOT, 'data', 'levels.json'), 'utf8'));
    return levels.map((raw, i) => {
        let witness = null;
        const hintFile = path.join(ROOT, 'data', 'hints', `${String(i + 1).padStart(5, '0')}.json`);
        if (existsSync(hintFile)) {
            try {
                const hints = JSON.parse(readFileSync(hintFile, 'utf8'));
                if (Array.isArray(hints) && hints.length > 0) witness = hints[0].map(packedToPair);
            } catch { /* witness geometry is optional */ }
        }
        return { id: `L${i + 1}`, features: levelFeatures(raw, witness) };
    });
}

function main() {
    const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
    const published = loadPublished();
    const stress = corpus.levels.map(lvl => ({
        id: lvl.id,
        batch: lvl.stressMeta?.generationBatch ?? '?',
        features: levelFeatures(lvl, lvl.stressMeta?.witnessSolution ?? null),
    }));

    const rows = stress.map(entry => {
        let minPub = Infinity, nearPub = null;
        for (const p of published) {
            const d = levelDistance(entry.features, p.features);
            if (d < minPub) { minPub = d; nearPub = p.id; }
        }
        let minInt = Infinity, nearInt = null;
        for (const s of stress) {
            if (s.id === entry.id) continue;
            const d = levelDistance(entry.features, s.features);
            if (d < minInt) { minInt = d; nearInt = s.id; }
        }
        return {
            id: entry.id,
            batch: entry.batch,
            vsPublished: { nearest: nearPub, distance: Number(minPub.toFixed(4)) },
            vsStress: { nearest: nearInt, distance: Number(minInt.toFixed(4)) },
            noveltyScore: Number(Math.min(minPub, minInt).toFixed(4)),
        };
    });

    const dupes = rows.filter(r => r.noveltyScore < DUPE_THRESHOLD);
    const sorted = [...rows].sort((a, b) => b.noveltyScore - a.noveltyScore);
    const byBatch = {};
    for (const r of rows) {
        byBatch[r.batch] = byBatch[r.batch] || { count: 0, sum: 0, min: Infinity };
        byBatch[r.batch].count++;
        byBatch[r.batch].sum += r.noveltyScore;
        byBatch[r.batch].min = Math.min(byBatch[r.batch].min, r.noveltyScore);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        corpus: CORPUS_FILE,
        publishedLevels: published.length,
        stressLevels: stress.length,
        dupeThreshold: DUPE_THRESHOLD,
        nearDuplicates: dupes.map(d => d.id),
        batchSummary: Object.fromEntries(Object.entries(byBatch).map(([b, s]) => [b, {
            count: s.count,
            meanNovelty: Number((s.sum / s.count).toFixed(4)),
            minNovelty: Number(s.min.toFixed(4)),
        }])),
        mostNovel: sorted.slice(0, 10).map(r => ({ id: r.id, batch: r.batch, noveltyScore: r.noveltyScore })),
        leastNovel: sorted.slice(-10).reverse().map(r => ({ id: r.id, batch: r.batch, noveltyScore: r.noveltyScore })),
        levels: rows,
    };

    mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(report, null, 1));

    console.log(`Novelty comparison: ${stress.length} stress levels vs ${published.length} published + each other.`);
    for (const [b, s] of Object.entries(report.batchSummary))
        console.log(`  batch ${b}: mean ${s.meanNovelty}  min ${s.minNovelty}`);
    console.log(`Near-duplicates (< ${DUPE_THRESHOLD}): ${dupes.length ? dupes.map(d => d.id).join(', ') : 'none'}`);
    console.log(`Report → ${OUT_FILE}`);
    if (dupes.length > 0) process.exitCode = 1;
}

main();
