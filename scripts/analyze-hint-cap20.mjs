#!/usr/bin/env node
/**
 * Compare display caps/allocations for hint selection (read-only; changes nothing).
 * For a total per-level cap, compares two ways to spend the budget across gates:
 *   • even     — split the cap evenly across gates; each gate fills its share by max-min diversity.
 *   • weighted — one GLOBAL max-min selection across all gates pooled, so gates with more genuine
 *                diversity naturally get more slots and low-diversity gates don't waste any.
 * Both early-stop at FLOOR (never pad with near-duplicates). Distinctiveness = edge-set Jaccard.
 * Reports, per cap, how many levels' full distinct-variety fits (nothing distinct dropped) vs is
 * truncated, plus the displayed-count distribution.
 *
 * Usage: node scripts/analyze-hint-cap20.mjs [--caps=4,12,20] [--floor=0.5]
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const CAPS  = (args.get('--caps') || '4,12,20').split(',').map(Number);
const FLOOR = Number(args.get('--floor') || 0.5);
// Exclude specific 1-based level numbers (e.g. the dev-tagged "garbage" levels, which are often
// garbage *because* they have too many boring solutions — not representative of real variety needs).
const EXCLUDE = new Set((args.get('--exclude') || '').split(',').filter(Boolean).map(Number));
const levels = JSON.parse(readFileSync('data/levels.json', 'utf8')).filter((_, i) => !EXCLUDE.has(i + 1));
if (EXCLUDE.size) console.log(`(excluding ${EXCLUDE.size} levels: ${[...EXCLUDE].sort((a, b) => a - b).join(',')})`);

const UNPACK = k => ({ x: k & 0xFFFF, y: (k >>> 16) & 0xFFFF });
function edgeSet(path) {
    const s = new Set();
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], pa = UNPACK(a), pb = UNPACK(b);
        if (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) !== 1) continue;
        s.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    }
    return s;
}
function dist(eA, eB) {
    if (eA.size === 0 && eB.size === 0) return 0;
    let inter = 0; const [small, big] = eA.size < eB.size ? [eA, eB] : [eB, eA];
    for (const e of small) if (big.has(e)) inter++;
    const union = eA.size + eB.size - inter;
    return union === 0 ? 0 : 1 - inter / union;
}
/** Max-min order over a set of items (edge-sets + tags). Seed = longest. Returns [{tag, minDist}]. */
function order(items) {
    const n = items.length; if (!n) return [];
    let seed = 0; for (let i = 1; i < n; i++) if (items[i].len > items[seed].len) seed = i;
    const out = [{ tag: items[seed].tag, minDist: 1 }];
    const md = items.map(it => dist(items[seed].e, it.e)); md[seed] = -1;
    while (out.length < n) {
        let b = -1, bd = -1; for (let i = 0; i < n; i++) if (md[i] >= 0 && md[i] > bd) { bd = md[i]; b = i; }
        if (b === -1) break;
        out.push({ tag: items[b].tag, minDist: bd }); md[b] = -1;
        for (let i = 0; i < n; i++) if (md[i] >= 0) md[i] = Math.min(md[i], dist(items[b].e, items[i].e));
    }
    return out;
}
/** count of leading picks that stay ≥ FLOOR distinct (seed always counts). */
const distinctCount = ord => { let c = 0; for (const o of ord) { if (c === 0 || o.minDist >= FLOOR) c++; else break; } return c; };

const per = levels.map((lvl) => {
    const hints = Array.isArray(lvl.hints) ? lvl.hints : [];
    if (!hints.length) return null;
    const byGate = new Map();
    hints.forEach((h, i) => { const g = h[0]; if (!byGate.has(g)) byGate.set(g, []); byGate.get(g).push(i); });
    const gates = [...byGate.values()];
    // Global (pooled) order → the level's true distinct-variety ceiling.
    const globalItems = hints.map((h, i) => ({ e: edgeSet(h), len: h.length, tag: i }));
    const globalOrd = order(globalItems);
    const trueDistinct = distinctCount(globalOrd);
    // Per-gate orders (for the "even" split).
    const gateOrders = gates.map(idxs => order(idxs.map(i => ({ e: edgeSet(hints[i]), len: hints[i].length, tag: i }))));
    const gateDistinct = gateOrders.map(distinctCount);
    return { gates: gates.length, trueDistinct, globalOrd, gateDistinct };
}).filter(Boolean);

function selectEven(row, cap) {
    // Even share per gate (distribute remainder to earliest gates), each capped by its distinct count.
    const base = Math.floor(cap / row.gates); let rem = cap - base * row.gates;
    return row.gateDistinct.reduce((sum, dc, gi) => sum + Math.min(dc, base + (gi < rem ? 1 : 0)), 0);
}
function selectWeighted(row, cap) {
    // Global max-min already ranks by diversity across gates → take min(cap, trueDistinct).
    return Math.min(cap, row.trueDistinct);
}

console.log(`\nCap / allocation comparison — distinctiveness floor=${FLOOR} (edge-Jaccard). ${per.length} levels with hints.`);
console.log(`Levels whose FULL distinct variety exceeds a cap (i.e. still truncated): trueDistinct distribution below.\n`);

for (const cap of CAPS) {
    for (const mode of ['even', 'weighted']) {
        const shown = per.map(r => mode === 'even' ? selectEven(r, cap) : selectWeighted(r, cap));
        const truncated = per.filter((r, i) => shown[i] < r.trueDistinct).length; // distinct hints still dropped
        const totalShown = shown.reduce((a, b) => a + b, 0);
        const hist = {}; shown.forEach(s => hist[s] = (hist[s] || 0) + 1);
        const distShown = Object.keys(hist).map(Number).sort((a, b) => a - b);
        console.log(`cap=${cap} ${mode.padEnd(8)}  mean ${(totalShown / per.length).toFixed(1)}/level, max ${Math.max(...shown)}  ·  levels still dropping a DISTINCT hint: ${truncated}/${per.length}`);
        if (mode === 'weighted') console.log(`            displayed-count spread: ${distShown.map(k => `${k}:${hist[k]}`).join('  ')}`);
    }
    console.log('');
}

// How much true distinct variety do levels actually have? (the ceiling the caps chase)
const td = per.map(r => r.trueDistinct).sort((a, b) => a - b);
const pctile = p => td[Math.floor(p / 100 * (td.length - 1))];
console.log(`True distinct-variety per level (global, floor=${FLOOR}): min ${td[0]}, p50 ${pctile(50)}, p75 ${pctile(75)}, p90 ${pctile(90)}, max ${td[td.length - 1]}`);
const over = n => per.filter(r => r.trueDistinct > n).length;
console.log(`Levels with > 12 distinct: ${over(12)} · > 20: ${over(20)} · > 30: ${over(30)}`);
