#!/usr/bin/env node
/**
 * Mechanic-conditioned breakdown of Lane D3's residual-interface commutativity result
 * (reports/2026-09-17-lane-d-residual-interface-commutativity-result-001.md). That result pooled
 * 12,277 commuting-candidate splices across 25 levels and found a 46.6% legal rate among
 * length-matched pairs; it did not ask whether commutativity concentrates in mechanic-free levels
 * or holds up equally on levels with portals/flippers in play.
 *
 * Zero new solver compute: this only joins the already-committed per-candidate results
 * (reports/stress/lane-d-residual-interface-commutativity-2026-09-17.json) to each level's own
 * static mechanic inventory (portal-pair count, flipping-filter count) already present in the
 * corpus file -- no replay, no CP-SAT, no new candidate mining.
 *
 * Usage:
 *   node scripts/stress/lane-d3-mechanic-conditioned-breakdown.mjs \
 *     --results=reports/stress/lane-d-residual-interface-commutativity-2026-09-17.json \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --out=reports/stress/lane-d3-mechanic-conditioned-breakdown-2026-09-17.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const RESULTS_FILE = arg('results', 'reports/stress/lane-d-residual-interface-commutativity-2026-09-17.json');
const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const OUT_FILE = arg('out', null);

const results = JSON.parse(readFileSync(path.resolve(ROOT, RESULTS_FILE), 'utf8'));
const corpusDoc = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const levels = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const levelById = new Map(levels.map((l) => [l.id, l]));

function mechanicBucket(level) {
    const portals = level.portals?.length ?? 0;
    const flippers = level.flippingFilters?.length ?? 0;
    if (portals === 0 && flippers === 0) return 'mechanic-free';
    if (portals > 0 && flippers === 0) return 'portal-only';
    if (portals === 0 && flippers > 0) return 'flipper-only';
    return 'portal-and-flipper';
}

const buckets = new Map();
function record(bucketName, lengthMatched, legal) {
    if (!buckets.has(bucketName)) buckets.set(bucketName, { all: { total: 0, legal: 0 }, lengthMatched: { total: 0, legal: 0 } });
    const b = buckets.get(bucketName);
    b.all.total++;
    if (legal) b.all.legal++;
    if (lengthMatched) {
        b.lengthMatched.total++;
        if (legal) b.lengthMatched.legal++;
    }
}

const levelBucketCounts = new Map();
for (const lvl of results.perLevel) {
    const level = levelById.get(lvl.id);
    if (!level) throw new Error(`level ${lvl.id} not found in ${CORPUS_FILE}`);
    const bucket = mechanicBucket(level);
    levelBucketCounts.set(bucket, (levelBucketCounts.get(bucket) ?? 0) + 1);
    for (const r of lvl.results) {
        const lengthMatched = r.aLength === r.bLength;
        record(bucket, lengthMatched, r.legal);
        record('__all__', lengthMatched, r.legal);
    }
}

const summaryRows = [...buckets.entries()].map(([bucket, b]) => ({
    bucket,
    levelsInBucket: bucket === '__all__' ? results.perLevel.length : (levelBucketCounts.get(bucket) ?? 0),
    allCandidates: b.all.total, allLegal: b.all.legal,
    allLegalRate: b.all.total ? b.all.legal / b.all.total : null,
    lengthMatchedCandidates: b.lengthMatched.total, lengthMatchedLegal: b.lengthMatched.legal,
    lengthMatchedLegalRate: b.lengthMatched.total ? b.lengthMatched.legal / b.lengthMatched.total : null,
}));

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Mechanic-conditioned breakdown of Lane D3\'s residual-interface commutativity result -- zero new solver compute, pure join of already-committed per-candidate results to each level\'s static mechanic inventory',
    sourceResults: RESULTS_FILE, sourceCorpus: CORPUS_FILE,
    bucketDefinition: 'mechanic-free = 0 portals/0 flippers; portal-only/flipper-only = exactly one family present; portal-and-flipper = both present. Bucketed per LEVEL (all of that level\'s candidates inherit its bucket), not per candidate segment.',
    rows: summaryRows.sort((a, b) => (a.bucket === '__all__' ? -1 : b.bucket === '__all__' ? 1 : a.bucket.localeCompare(b.bucket))),
};
console.log(JSON.stringify(summary.rows, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
