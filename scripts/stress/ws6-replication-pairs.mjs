#!/usr/bin/env node
/**
 * WS6-DEPENDENCY-CONDITIONED-REPAIR independent-parent replication, step 1 (population, frozen before any
 * outcome inspection): build candidate DEAD/LIVE matched pairs from RETAINED evidence only.
 *  - DEAD side: retained exact-DEAD (CP-SAT INFEASIBLE) prefixes from the class-5 exact-label files, every parent except R03147
 *    (the original development parent).
 *  - LIVE side: the same parent's stored referee-valid hint solutions (every prefix of a valid solution is exactly LIVE).
 *  - Divergence: the first index c where the DEAD prefix leaves the hint with the longest common prefix.
 *  - Causal contract (checked in step 2, one exact CP-SAT query per pair): the DEAD branch prefix P[:c+1] must itself be exactly
 *    infeasible, i.e. the divergence IS the point of no return (Lane E contract). Independent unit = parent level.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...r] = x.split('='); return [k, r.join('=')]; }));
const outFile = args.get('--out') ?? 'data/stress/ws6-replication-pairs-001.json';
const casesOut = args.get('--cases-out') ?? 'data/stress/ws6-replication-cpsat-cases-001.json';
const EXCLUDE = new Set(['R03147']);
const SOURCES = [
    'reports/stress/class5-production-search-sibling-harvest-exact-labels-2026-09-17.json',
    'reports/stress/class5-fresh-sibling-harvest-exact-labels-2026-09-17.json',
    'reports/stress/class5-production-search-frontier-multi-pick-exact-labels-2026-09-17.json',
    'reports/stress/class5-topology-fork-exact-labels-2026-09-16.json',
    'reports/stress/class5-topology-fork-extension-exact-labels-2026-09-17.json',
    'reports/stress/class5-topology-fork-replication-exact-labels-2026-09-16.json',
];
installBrowserStubs();
const corpus = 'data/stress/stress-levels-random.json';
const levels = new Map(readLevelCorpusDocumentWithHints(corpus).levels.map(l => [String(l.id), l]));
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const pack = ([x, y]) => api.PACK(Number(x) - 1, Number(y) - 1);
const unpack = key => [(key & 0xffff) + 1, (key >>> 16) + 1];

const dead = new Map();
for (const src of SOURCES) {
    const doc = JSON.parse(readFileSync(src, 'utf8'));
    for (const row of doc.rows ?? []) {
        if (row.referenceLabel !== 'dead' || EXCLUDE.has(String(row.levelId))) continue;
        const key = `${row.levelId}|${JSON.stringify(row.prefix)}`;
        if (!dead.has(key)) dead.set(key, { levelId: String(row.levelId), prefix: row.prefix.map(pack), source: path.basename(src), caseId: row.caseId });
    }
}
const pairs = []; const noHint = new Set(); const noDivergence = [];
for (const d of dead.values()) {
    const raw = levels.get(d.levelId); if (!raw?.hints?.length) { noHint.add(d.levelId); continue; }
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    let best = null;
    for (const h of raw.hints) {
        if (!Solver.validateCandidatePath(level, h).ok) continue;
        let c = 0; while (c < d.prefix.length && c < h.length && d.prefix[c] === h[c]) c++;
        if (!best || c > best.c) best = { c, hint: h };
    }
    if (!best || best.c < 1 || best.c >= d.prefix.length || best.c >= best.hint.length) { noDivergence.push({ levelId: d.levelId, caseId: d.caseId, c: best?.c ?? null }); continue; }
    const c = best.c;
    pairs.push({ levelId: d.levelId, sourceCaseId: d.caseId, deadPrefix: d.prefix.slice(0, c + 1), livePrefix: best.hint.slice(0, c + 1), divergenceIndex: c });
}
const seen = new Set(); const unique = [];
for (const p of pairs) { const k = `${p.levelId}|${p.deadPrefix.join(',')}|${p.livePrefix.join(',')}`; if (!seen.has(k)) { seen.add(k); unique.push(p); } }
unique.forEach((p, i) => { p.pairId = `${p.levelId}:wp${i}`; });
const parents = new Set(unique.map(p => p.levelId));
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ kind: 'pathfinder-ws6-replication-pairs', corpus, excluded: [...EXCLUDE], sources: SOURCES, candidatePairs: unique.length, parents: parents.size, noHintParents: [...noHint], noDivergence: noDivergence.length, pairs: unique }, null, 2) + '\n');
writeFileSync(casesOut, JSON.stringify({ corpus, cases: unique.map(p => ({ id: p.pairId, levelId: p.levelId, prefix: p.deadPrefix.map(unpack), label: 'dead-candidate' })) }, null, 2) + '\n');
console.log(JSON.stringify({ deadSourceRows: dead.size, candidatePairs: unique.length, parents: parents.size, noHintParents: noHint.size, noDivergence: noDivergence.length, divergenceIndexHistogram: unique.reduce((a, p) => { a[p.divergenceIndex] = (a[p.divergenceIndex] ?? 0) + 1; return a; }, {}) }));
