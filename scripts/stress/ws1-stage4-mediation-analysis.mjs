#!/usr/bin/env node
/**
 * WS1 stage-4 solution-space mediation: mechanic event-order + basin-signature descriptors.
 * See reports/2026-09-11-ws1-stage4-solution-space-mediation-preflight-001.md for the frozen
 * prespecification. Reuses committed stage-3 20M-work solved paths (already-decided winner/loser
 * per sibling) and retained raw family variant JSON. No new solver compute.
 *
 * Usage (bundled):
 *   node scripts/run-bundled.mjs scripts/stress/ws1-stage4-mediation-analysis.mjs -- \
 *     --families=/path/to/variant-worktree/data/families/corpus2 --out=tmp/ws1-stage4-mediation.json
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { normalizeRawLevel } = await import('../../modules/solver/normalization.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { createState, applyMove } = await import('../../modules/solver/search-state.js');

const args = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
    const [k, ...v] = a.split('='); return [k, v.join('=')];
}));
const root = (() => {
    let dir = new URL('.', import.meta.url).pathname;
    for (let i = 0; i < 6; i++) {
        if (existsSync(path.join(dir, 'package.json'))) return dir;
        dir = path.dirname(dir);
    }
    throw new Error('package root not found');
})();
const familiesDir = args.get('--families');
if (!familiesDir) throw new Error('--families=<dir> is required');
const stage3Dir = path.join(root, 'reports/stress/ws1-stage3-isolated-resolve-001');
const outPath = args.get('--out') ? path.join(root, args.get('--out')) : null;

const MODES = ['cs', 'gr', 'lm', 'swap', 'sym'];
const PAIRS = [
    { parent: 'R02094', config: 'intersectionHarvest' },
    { parent: 'R02687', config: 'objectiveFirst' },
];

function loadStage3(parent, mode, retention, config) {
    const fp = path.join(stage3Dir, `${config}-${parent}-${mode}-${retention}-20m.json`);
    if (!existsSync(fp)) return null;
    return JSON.parse(readFileSync(fp, 'utf8')).levels;
}

function loadFamilyRaw(parent, mode) {
    const fp = path.join(familiesDir, `family-${parent}-${mode}.json`);
    if (!existsSync(fp)) return null;
    return JSON.parse(readFileSync(fp, 'utf8'));
}

/** Replay a solved path through real search state, recording ordered mechanic events. */
function mechanicEvents(pathKeys, level, prep) {
    const events = []; // {type: 'M'|'P'|'X', idx, key}
    let state;
    try { state = createState(pathKeys[0], level, prep); } catch { return null; }
    const seenAny = new Set([pathKeys[0]]);
    const seenMc = new Set();
    if (level.mustCrossKeys.includes(pathKeys[0])) { seenMc.add(pathKeys[0]); events.push({ type: 'M', idx: 0, key: pathKeys[0] }); }

    for (let i = 1; i < pathKeys.length; i++) {
        const prevKey = pathKeys[i - 1];
        const portal = level.portalMap.get(prevKey);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === pathKeys[i]);
        try { applyMove(pathKeys[i], state, level, prep, isJump); } catch { return null; }
        if (isJump) events.push({ type: 'P', idx: i, key: pathKeys[i] });
        if (level.mustCrossKeys.includes(pathKeys[i]) && !seenMc.has(pathKeys[i])) {
            seenMc.add(pathKeys[i]);
            events.push({ type: 'M', idx: i, key: pathKeys[i] });
        }
        if (seenAny.has(pathKeys[i])) events.push({ type: 'X', idx: i, key: pathKeys[i] });
        seenAny.add(pathKeys[i]);
    }
    events.sort((a, b) => a.idx - b.idx);
    return { events, n: pathKeys.length };
}

function descriptor1(events, n) {
    const mEvents = events.filter(e => e.type === 'M');
    const pEvents = events.filter(e => e.type === 'P');
    if (!mEvents.length || !pEvents.length) return null;
    const firstP = pEvents[0].idx;
    const fracBefore = mEvents.filter(e => e.idx < firstP).length / mEvents.length;
    const dists = mEvents.map(e => Math.min(...pEvents.map(p => Math.abs(e.idx - p.idx))) / Math.max(n - 1, 1));
    const sortedDists = [...dists].sort((a, b) => a - b);
    const medianDist = sortedDists[Math.floor(sortedDists.length / 2)];
    const mPositions = mEvents.map(e => e.idx).sort((a, b) => a - b);
    const medianMPos = mPositions[Math.floor(mPositions.length / 2)];
    return {
        fracMcBeforeFirstPortal: fracBefore,
        medianNormDistMcToPortal: medianDist,
        firstPortalBeforeMedianMc: firstP < medianMPos,
    };
}

function descriptor2(events, n) {
    const mIdxs = events.map((e, i) => [e, i]).filter(([e]) => e.type === 'M');
    if (!mIdxs.length) return null;
    const texture = mIdxs.map(([, i]) => ({
        prev: i > 0 ? events[i - 1].type : 'none',
        next: i + 1 < events.length ? events[i + 1].type : 'none',
    }));
    const basinSignature = events.map(e => e.type).join('');
    const normPositions = mIdxs.map(([e]) => Math.round((e.idx / Math.max(n - 1, 1)) * 1000) / 1000);
    return { basinSignature, texture, normPositions };
}

function classify(plainLevels, bucketsLevels) {
    return plainLevels.map((pl, i) => {
        const bl = bucketsLevels[i];
        let cls;
        if (pl.ok && bl.ok) cls = 'both';
        else if (pl.ok) cls = 'plain-only';
        else if (bl.ok) cls = 'buckets-only';
        else cls = 'neither';
        return { cls, pl, bl };
    });
}

const report = { pairs: [] };

for (const { parent, config } of PAIRS) {
    const pairReport = { parent, config, modes: [], exclusiveRows: [] };
    for (const mode of MODES) {
        const plainLevels = loadStage3(parent, mode, 'plain', config);
        const bucketsLevels = loadStage3(parent, mode, 'mechanic-buckets', config);
        const raw = loadFamilyRaw(parent, mode);
        if (!plainLevels || !bucketsLevels || !raw) {
            pairReport.modes.push({ mode, missing: true });
            continue;
        }
        const classified = classify(plainLevels, bucketsLevels);
        const counts = { both: 0, neither: 0, 'plain-only': 0, 'buckets-only': 0 };
        classified.forEach(c => counts[c.cls]++);
        pairReport.modes.push({ mode, n: raw.length, counts });

        classified.forEach((c, i) => {
            if (c.cls !== 'plain-only' && c.cls !== 'buckets-only') return;
            const rawVariant = raw[i];
            let level, prep;
            try { level = normalizeRawLevel(rawVariant); prep = prepLevel(level); } catch { return; }
            const winner = c.cls === 'plain-only' ? c.pl : c.bl;
            if (!winner.solution) return;
            const walk = mechanicEvents(winner.solution, level, prep);
            if (!walk) return;
            const d1 = descriptor1(walk.events, walk.n);
            const d2 = descriptor2(walk.events, walk.n);
            pairReport.exclusiveRows.push({
                mode, variantIdx: i, cls: c.cls,
                nMustCross: level.mustCrossKeys.length,
                nPortals: level.portalMap.size / 2,
                d1, d2,
            });
        });
    }
    report.pairs.push(pairReport);
}

// Summaries printed to stdout; full detail in JSON if --out given.
for (const p of report.pairs) {
    console.log(`\n=== ${p.parent} / ${p.config} ===`);
    for (const m of p.modes) {
        if (m.missing) { console.log(`  [${m.mode}] missing stage-3/family file`); continue; }
        console.log(`  mode=${m.mode} n=${m.n} both=${m.counts.both} neither=${m.counts.neither} plain-only=${m.counts['plain-only']} buckets-only=${m.counts['buckets-only']}`);
    }
    const withMc = p.exclusiveRows.filter(r => r.nMustCross > 0);
    const noMc = p.exclusiveRows.filter(r => r.nMustCross === 0);
    console.log(`  exclusive-response siblings with mustCross>0: ${withMc.length}; with mustCross=0 (descriptors structurally inapplicable): ${noMc.length}`);

    const d1ByClass = {};
    for (const r of withMc) {
        if (!r.d1) continue;
        (d1ByClass[r.cls] ??= []).push(r.d1.fracMcBeforeFirstPortal);
    }
    for (const [cls, vals] of Object.entries(d1ByClass)) {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        console.log(`    d1.fracMcBeforeFirstPortal[${cls}] n=${vals.length} mean=${mean.toFixed(3)} vals=${vals.map(v => v.toFixed(2)).join(',')}`);
    }
    const d1NoPortalEvent = withMc.filter(r => !r.d1).length;
    console.log(`    rows with no portal-traversal event detected in the winning path (d1 inapplicable): ${d1NoPortalEvent}/${withMc.length}`);

    console.log('  d2 basin signatures (mustCross>0 rows):');
    for (const r of withMc) {
        console.log(`    mode=${r.mode} idx=${r.variantIdx} cls=${r.cls} mc=${r.nMustCross} portals=${r.nPortals} sig=${r.d2 ? r.d2.basinSignature : null} texture=${r.d2 ? JSON.stringify(r.d2.texture) : null}`);
    }
}

if (outPath) {
    const fs = await import('node:fs');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\nWrote ${outPath}`);
}
