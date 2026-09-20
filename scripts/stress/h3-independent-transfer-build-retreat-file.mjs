#!/usr/bin/env node
/**
 * H3 independent transfer: build a synthetic retreat-file for repair-plateau-rollout-classifier.mjs
 * --retreat-file mode, from the frozen phenotype-screen cohort (solved===false AND
 * lossCause==='score-width-culled'), mirroring Card-E's own construction exactly
 * (reports/2026-09-16-card-e-sizing-and-state-selection-001.md, Step 3):
 *   { elite: { levelId, path: <referee-valid known-live hint path sharing the row's recorded
 *     beam gateKey>, eliteLength: path.length - 1 }, low: <beam cull depth (finalSupportLoss.depth)>,
 *     high: low + 1 }
 *
 * Usage:
 *   node scripts/stress/h3-independent-transfer-build-retreat-file.mjs \
 *     --screen=reports/stress/h3-independent-transfer-phenotype-screen-001.json \
 *     --hints-dir=data/stress/hints-random \
 *     --out=reports/stress/h3-independent-transfer-retreat-file-001.json
 */
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const SCREEN_FILE = arg('screen', 'reports/stress/h3-independent-transfer-phenotype-screen-001.json');
const HINTS_DIR = arg('hints-dir', 'data/stress/hints-random');
const OUT_FILE = arg('out', 'reports/stress/h3-independent-transfer-retreat-file-001.json');

const screen = JSON.parse(readFileSync(SCREEN_FILE, 'utf8'));
const levels = screen.levels ?? [];

const cohort = levels.filter(l => l.solved === false && l.survival?.finalSupportLoss?.lossCause === 'score-width-culled');
console.error(`Phenotype-screen cohort (solved===false && lossCause==='score-width-culled'): ${cohort.length}/${levels.length}`);

const results = {};
let skipped = 0;
for (const row of cohort) {
    const id = row.levelId;
    const gateKey = row.gateKey;
    const depth = row.survival.finalSupportLoss.depth;
    let hintsDoc;
    try {
        hintsDoc = JSON.parse(readFileSync(`${HINTS_DIR}/${id}.json`, 'utf8'));
    } catch (e) {
        console.error(`${id}: could not read hints file, skipping (${e.message})`);
        skipped++;
        continue;
    }
    const matching = (hintsDoc.hints ?? []).find(h => h.path?.[0] === gateKey);
    if (!matching) {
        console.error(`${id}: no stored hint shares recorded gateKey ${gateKey}, skipping`);
        skipped++;
        continue;
    }
    results[id] = {
        elite: { levelId: id, path: matching.path, eliteLength: matching.path.length - 1 },
        low: depth,
        high: depth + 1,
    };
}

writeFileSync(OUT_FILE, JSON.stringify({ results }, null, 2));
console.error(`Wrote ${Object.keys(results).length} retreat-file entries to ${OUT_FILE} (${skipped} skipped)`);
