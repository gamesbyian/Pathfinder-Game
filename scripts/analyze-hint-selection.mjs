#!/usr/bin/env node
/**
 * Hint-selection analysis (read-only; deletes/modifies nothing).
 *
 * Design goal: *showcase* a small, curated variety of hints per level — "oh cool, a few different
 * approaches" — not the full breadth (which overwhelms). Rule:
 *   • Group a level's hint paths by starting gate (the first packed key IS the gate cell).
 *   • Per gate, order hints by farthest-point (max–min) edge diversity, then take up to PER_GATE,
 *     STOPPING EARLY once the next candidate isn't ≥ FLOOR distinct from everything already shown
 *     (so a gate of look-alikes shows 2 clearly-different ones, never 4 near-duplicates). The seed
 *     always counts, so every gate shows ≥1.
 *   • Interleave gates round-robin so a cycling player alternates between them.
 * Distinctiveness = edge-set Jaccard distance: overlap of *drawn segments* (undirected pairs of
 * orthogonally-adjacent consecutive cells; portal jumps aren't drawn edges). 0 = identical line,
 * 1 = no shared segment. By construction every displayed hint is ≥ FLOOR from all others shown.
 *
 * This does NOT touch data/levels.json or the heatmap — it reports what a display-time filter would
 * show. Usage: node scripts/analyze-hint-selection.mjs [--per-gate=4] [--floor=0.5] [--json=out.json]
 */
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { readLevelsWithHints } from './level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const PER_GATE = Number(args.get('--per-gate') || 4);
const FLOOR    = Number(args.get('--floor') || 0.5);   // early-stop distinctiveness floor (edge-Jaccard)
const jsonOut  = args.get('--json') || null;

const levels = readLevelsWithHints('data/levels.json');

const UNPACK = k => ({ x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF });
/** Set of drawn segments for a hint path: "min-max" over orthogonally-adjacent consecutive cells. */
function edgeSet(path) {
    const s = new Set();
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        const pa = UNPACK(a), pb = UNPACK(b);
        if (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) !== 1) continue; // portal jump / non-adjacent — not drawn
        s.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    }
    return s;
}
/** Edge-set Jaccard distance in [0,1]: 0 = identical drawn line, 1 = no shared segment. */
function dist(eA, eB) {
    if (eA.size === 0 && eB.size === 0) return 0;
    let inter = 0;
    const [small, big] = eA.size < eB.size ? [eA, eB] : [eB, eA];
    for (const e of small) if (big.has(e)) inter++;
    const union = eA.size + eB.size - inter;
    return union === 0 ? 0 : 1 - inter / union;
}
/** Greedy farthest-point order (indices) by max–min edge distance; seed = longest path. Returns
 *  [{idx, minDistWhenPicked}] — minDistWhenPicked is monotonically non-increasing. */
function diversityOrder(edgeSets, lengths) {
    const n = edgeSets.length;
    if (n === 0) return [];
    let seed = 0;
    for (let i = 1; i < n; i++) if (lengths[i] > lengths[seed]) seed = i;
    const order = [{ idx: seed, minDistWhenPicked: 1 }];
    const minDist = edgeSets.map(e => dist(edgeSets[seed], e));
    minDist[seed] = -1;
    while (order.length < n) {
        let best = -1, bestD = -1;
        for (let i = 0; i < n; i++) if (minDist[i] >= 0 && minDist[i] > bestD) { bestD = minDist[i]; best = i; }
        if (best === -1) break;
        order.push({ idx: best, minDistWhenPicked: bestD });
        minDist[best] = -1;
        for (let i = 0; i < n; i++) if (minDist[i] >= 0) minDist[i] = Math.min(minDist[i], dist(edgeSets[best], edgeSets[i]));
    }
    return order;
}

const report = [];
levels.forEach((lvl, li) => {
    const hints = Array.isArray(lvl.hints) ? lvl.hints : [];
    if (hints.length === 0) { report.push({ level: li + 1, hints: 0, gates: 0, displayed: 0, perGate: [] }); return; }

    const byGate = new Map();
    hints.forEach((h, i) => { const g = h[0]; if (!byGate.has(g)) byGate.set(g, []); byGate.get(g).push(i); });

    const gateSel = [];
    for (const [gateKey, idxs] of byGate) {
        const order = diversityOrder(idxs.map(i => edgeSet(hints[i])), idxs.map(i => hints[i].length));
        // Take the seed, then picks while still ≥ FLOOR distinct, capped at PER_GATE.
        const chosen = [];
        for (const o of order) {
            if (chosen.length >= PER_GATE) break;
            if (chosen.length === 0 || o.minDistWhenPicked >= FLOOR) chosen.push(o);
            else break;
        }
        const p = UNPACK(gateKey);
        gateSel.push({
            gate: { x: p.x + 1, y: p.y + 1 },
            available: idxs.length,
            shown: chosen.length,
            cappedByLimit: order.length > PER_GATE && order[PER_GATE].minDistWhenPicked >= FLOOR, // wanted more, hit the cap
            displayIdxGlobal: chosen.map(o => idxs[o.idx]),
        });
    }
    // Interleave gates round-robin.
    const interleaved = [];
    for (let r = 0; r < PER_GATE; r++) for (const g of gateSel) if (g.displayIdxGlobal[r] !== undefined) interleaved.push(g.displayIdxGlobal[r]);

    report.push({
        level: li + 1,
        hints: hints.length,
        gates: byGate.size,
        displayed: interleaved.length,
        perGate: gateSel.map(g => ({ gate: g.gate, available: g.available, shown: g.shown, cappedByLimit: g.cappedByLimit })),
        displayOrder: interleaved,
    });
});

// ── Output ────────────────────────────────────────────────────────────────────
const withHints = report.filter(r => r.hints > 0);
const totalHints = report.reduce((a, r) => a + r.hints, 0);
const totalDisplayed = report.reduce((a, r) => a + r.displayed, 0);
const cappedGates = report.flatMap(r => r.perGate).filter(g => g.cappedByLimit).length;
const totalGates = report.reduce((a, r) => a + r.perGate.length, 0);

console.log(`\nHint display selection — per-gate cap=${PER_GATE}, early-stop floor=${FLOOR} (edge-Jaccard), interleaved by gate`);
console.log(`Levels: ${withHints.length} with hints · total hints ${totalHints} → displayed ${totalDisplayed} (${(100 * totalDisplayed / totalHints).toFixed(1)}%)`);
console.log(`Displayed per level: min ${Math.min(...withHints.map(r => r.displayed))}, max ${Math.max(...withHints.map(r => r.displayed))}, mean ${(totalDisplayed / withHints.length).toFixed(1)}`);
console.log(`Gates: ${totalGates} · hit the per-gate cap (had ≥${PER_GATE} distinct, more available) ${cappedGates} · stopped early (fewer clearly-distinct) ${totalGates - cappedGates}`);

const dispHist = {}; for (const r of withHints) dispHist[r.displayed] = (dispHist[r.displayed] || 0) + 1;
console.log('\nPer-level displayed-count distribution (displayed: #levels):');
console.log('  ' + Object.keys(dispHist).map(Number).sort((a, b) => a - b).map(k => `${k}:${dispHist[k]}`).join('  '));

const gateHist = {}; for (const g of report.flatMap(r => r.perGate)) gateHist[g.shown] = (gateHist[g.shown] || 0) + 1;
console.log('\nPer-gate shown-count distribution (shown: #gates):');
console.log('  ' + Object.keys(gateHist).map(Number).sort((a, b) => a - b).map(k => `${k}:${gateHist[k]}`).join('  '));

// The multi-gate levels (where display counts are largest) + any level that shows only 1-2.
console.log('\n3-gate levels (the biggest display counts):');
for (const r of report.filter(r => r.gates === 3)) console.log(`  L${r.level}: ${r.displayed} shown  [${r.perGate.map(g => `(${g.gate.x},${g.gate.y}):${g.shown}/${g.available}`).join(' ')}]`);
const lean = withHints.filter(r => r.displayed <= 2);
console.log(`\nLevels showing ≤2 hints (naturally low variety): ${lean.length ? lean.map(r => `L${r.level}(${r.displayed})`).join(', ') : 'none'}`);

if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(report, null, 2)); console.log(`\nPer-level detail (incl. displayOrder indices) → ${jsonOut}`); }
