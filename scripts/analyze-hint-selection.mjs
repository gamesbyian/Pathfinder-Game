#!/usr/bin/env node
/**
 * Hint-selection analysis (read-only; deletes/modifies nothing).
 *
 * For each level, groups its hint paths by starting gate, then selects the most mutually-distinct
 * ~N hints per gate via farthest-point (max–min) diversity, interleaving gates so a cycling player
 * alternates between them. Distinctiveness = edge-set Jaccard distance: the set of drawn segments
 * (undirected pairs of orthogonally-adjacent consecutive cells; portal jumps are not drawn edges).
 * Two hints are "visually distinct" to the degree their drawn lines don't overlap.
 *
 * It also answers the design question: would a per-gate cap of ~5 / total cap of ~15 ever
 * substantially restrict a level's variety? We measure, per gate, how many *genuinely distinct*
 * hints exist at a distinctiveness floor D (greedy picks whose incremental min-distance ≥ D), and
 * flag levels where that count exceeds the cap — i.e. where the cap would drop a still-distinct hint.
 *
 * Usage: node scripts/analyze-hint-selection.mjs [--per-gate=5] [--total=15] [--floor=0.5] [--json=out.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const PER_GATE = Number(args.get('--per-gate') || 5);
const TOTAL    = Number(args.get('--total') || 15);
const FLOOR    = Number(args.get('--floor') || 0.5);   // distinctiveness floor (edge-Jaccard distance)
const jsonOut  = args.get('--json') || null;

const levels = JSON.parse(readFileSync('data/levels.json', 'utf8'));

const UNPACK = k => ({ x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF });
/** Set of drawn segments for a hint path: "min-max" over orthogonally-adjacent consecutive cells. */
function edgeSet(path) {
    const s = new Set();
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        const pa = UNPACK(a), pb = UNPACK(b);
        if (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) !== 1) continue; // portal jump / non-adjacent — not a drawn edge
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

/** Greedy farthest-point ordering of `items` (indices) by max–min edge distance. Returns
 *  [{idx, minDistWhenPicked}] in pick order. Seed = the longest path (most visual content). */
function diversityOrder(edgeSets, lengths) {
    const n = edgeSets.length;
    if (n === 0) return [];
    let seed = 0;
    for (let i = 1; i < n; i++) if (lengths[i] > lengths[seed]) seed = i;
    const picked = [seed];
    const order = [{ idx: seed, minDistWhenPicked: 1 }];
    const minDist = edgeSets.map((e, i) => dist(edgeSets[seed], e));
    minDist[seed] = -1;
    while (picked.length < n) {
        let best = -1, bestD = -1;
        for (let i = 0; i < n; i++) if (minDist[i] >= 0 && minDist[i] > bestD) { bestD = minDist[i]; best = i; }
        if (best === -1) break;
        order.push({ idx: best, minDistWhenPicked: bestD });
        picked.push(best);
        minDist[best] = -1;
        for (let i = 0; i < n; i++) if (minDist[i] >= 0) minDist[i] = Math.min(minDist[i], dist(edgeSets[best], edgeSets[i]));
    }
    return order;
}

const report = [];
let restrictedCount = 0;

levels.forEach((lvl, li) => {
    const hints = Array.isArray(lvl.hints) ? lvl.hints : [];
    if (hints.length === 0) { report.push({ level: li + 1, hints: 0, gates: 0, selected: 0, perGate: [], restricted: false }); return; }

    // Group hint indices by starting gate (first packed key).
    const byGate = new Map();
    hints.forEach((h, i) => { const g = h[0]; if (!byGate.has(g)) byGate.set(g, []); byGate.get(g).push(i); });

    const gateStats = [];
    for (const [gateKey, idxs] of byGate) {
        const edgeSets = idxs.map(i => edgeSet(hints[i]));
        const lengths  = idxs.map(i => hints[i].length);
        const order = diversityOrder(edgeSets, lengths);
        // Genuinely-distinct count: greedy picks whose incremental distinctiveness ≥ FLOOR.
        // (The seed always counts; subsequent picks count while still distinct.)
        let distinctCount = 0;
        for (const o of order) { if (o.minDistWhenPicked >= FLOOR || distinctCount === 0) distinctCount++; else break; }
        const p = UNPACK(gateKey);
        gateStats.push({
            gate: { x: p.x + 1, y: p.y + 1 },
            total: idxs.length,
            distinctAtFloor: distinctCount,
            selected: Math.min(PER_GATE, idxs.length),
            // distinctiveness of the best hint dropped by the PER_GATE cap (0 if none dropped):
            bestDroppedDist: order.length > PER_GATE ? order[PER_GATE].minDistWhenPicked : 0,
            order,
        });
    }

    // Interleave gates round-robin up to TOTAL, each gate capped at PER_GATE.
    const perGateSel = gateStats.map(g => g.order.slice(0, g.selected).map(o => o.idx));
    const interleaved = [];
    for (let r = 0; r < PER_GATE && interleaved.length < TOTAL; r++)
        for (const sel of perGateSel) if (sel[r] !== undefined && interleaved.length < TOTAL) interleaved.push(sel[r]);

    // Restriction: a gate has more genuinely-distinct hints than we can show (per-gate or via total cap),
    // AND the best dropped hint is still clearly distinct (≥ FLOOR).
    const gateShown = gateStats.map((g, gi) => Math.min(g.selected, perGateSel[gi].filter(x => interleaved.includes(x)).length));
    const restrictedGates = gateStats.filter((g, gi) => g.distinctAtFloor > gateShown[gi] && g.bestDroppedDist >= FLOOR);
    const restricted = restrictedGates.length > 0;
    if (restricted) restrictedCount++;

    report.push({
        level: li + 1,
        hints: hints.length,
        gates: byGate.size,
        selected: interleaved.length,
        perGate: gateStats.map(g => ({ gate: g.gate, total: g.total, distinctAtFloor: g.distinctAtFloor, bestDroppedDist: +g.bestDroppedDist.toFixed(2) })),
        restricted,
    });
});

// ── Output ────────────────────────────────────────────────────────────────────
const totalHints = report.reduce((a, r) => a + r.hints, 0);
const totalSelected = report.reduce((a, r) => a + r.selected, 0);
console.log(`\nHint-selection analysis — per-gate cap=${PER_GATE}, total cap=${TOTAL}, distinctiveness floor=${FLOOR} (edge-Jaccard)`);
console.log(`Levels: ${report.length} · total hints: ${totalHints} · total selected for display: ${totalSelected} (${(100 * totalSelected / totalHints).toFixed(1)}%)`);
console.log(`Levels where the cap drops a still-distinct hint (variety-restricted): ${restrictedCount}\n`);

const worst = report.filter(r => r.restricted)
    .map(r => ({ ...r, worstDrop: Math.max(...r.perGate.map(g => g.bestDroppedDist)) }))
    .sort((a, b) => b.worstDrop - a.worstDrop);
if (worst.length) {
    console.log('Restricted levels (dropped a hint still ≥ floor distinct from all shown):');
    for (const r of worst) {
        const gs = r.perGate.map(g => `gate(${g.gate.x},${g.gate.y}): ${g.total}→${g.distinctAtFloor} distinct, bestDrop=${g.bestDroppedDist}`).join(' | ');
        console.log(`  L${r.level} [${r.hints} hints, ${r.gates} gates, showing ${r.selected}]  ${gs}`);
    }
} else {
    console.log('No level is variety-restricted at these caps: every genuinely-distinct hint fits.');
}

// Distribution of distinct-at-floor per gate across the corpus.
const distinctPerGate = report.flatMap(r => r.perGate.map(g => g.distinctAtFloor));
const hist = {};
for (const d of distinctPerGate) hist[d] = (hist[d] || 0) + 1;
console.log('\nDistinct-hints-per-gate distribution (how many gates have exactly K genuinely-distinct hints):');
console.log('  ' + Object.keys(hist).map(Number).sort((a, b) => a - b).map(k => `${k}:${hist[k]}`).join('  '));

if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(report, null, 2)); console.log(`\nPer-level detail written to ${jsonOut}`); }
