#!/usr/bin/env node
/**
 * PG-A BC1 perturbation microscope (docs/solver-premise-map-post-exhaustion-status-2026-10-01.json,
 * reports/2026-10-01-post-exhaustion-solver-premise-space-refresh-001.md lane A).
 *
 * For each level, runs the raw width-W beam twice from the first gate (control = STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE
 * off with the BC1 fresh-only shadow tagging dead candidates, treatment = flag on), recording each phase's
 * incoming frontier as a set of path hashes. Reports the first frontier divergence, how many control slots held
 * BC1-dead states there (dead occupancy), how many replacements treatment promoted, and where the winning
 * lineage (whichever arm solves) departs from the other arm's frontier. Strictly observational: the observer
 * never changes search behaviour (checked against an observer-free control run).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...r] = x.split('='); return [k, r.join('=')]; }));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const beamWidth = Number(args.get('--beam-width') ?? 500);
const nodeBudget = Number(args.get('--node-budget') ?? 3000000);
const budgetMs = Number(args.get('--budget-ms') ?? 300000);
const outFile = args.get('--out') ?? 'reports/stress/bc1-perturbation-microscope.json';
const idsFile = args.get('--ids-file');
const ids = (idsFile ? readFileSync(idsFile, 'utf8').split(/[\s,]+/) : (args.get('--level-ids') ?? '').split(',')).map(x => x.trim()).filter(Boolean);
if (!ids.length) throw new Error('--level-ids or --ids-file required');
const solverRef = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { defaultConfig } = await import('../../modules/solver/ablation-config.ts');
const Solver = createSolver();
const byId = new Map(readLevelCorpusDocumentWithHints(levelsFile).levels.map(l => [String(l.id), l]));

/** Incremental prefix hashes of a path: one 53-bit-ish string key per prefix length. */
function prefixKeys(p) {
    const keys = new Array(p.length);
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < p.length; i++) {
        h1 = Math.imul(h1 ^ p[i], 0x01000193) >>> 0;
        h2 = (Math.imul(h2 + p[i] + i, 0x85ebca6b) ^ (h2 >>> 13)) >>> 0;
        keys[i] = `${h1.toString(36)}${h2.toString(36)}`;
    }
    return keys;
}

class FrontierObserver {
    constructor(trackDead) {
        this.frontiers = new Map(); // depth -> Set(full-path key)
        this.paths = new Map();     // depth -> full paths (kept for dead tagging)
        this.stats = new Map();     // depth -> { pool, mergeRemoved, widthCulled } (candidate pool entering selection at that depth)
        this.flagged = new Set();   // prefix keys flagged BC1-dead (control only)
        if (trackDead) {
            this.bc1FreshOnly = true;
            this.observeBc1Candidate = info => { if (info.theorem !== 'bc1g') this.flagged.add(prefixKeys(info.path).at(-1)); };
        }
    }
    stat(d) { let s = this.stats.get(d); if (!s) { s = { pool: 0, mergeRemoved: 0, widthCulled: 0 }; this.stats.set(d, s); } return s; }
    observe(rec) {
        if (rec.stage === 'post-hard-prune') { this.stat(rec.depth).pool += rec.paths.length; return; }
        if (rec.stage === 'coarse-state-merge-removed') { this.stat(rec.depth).mergeRemoved += rec.paths.length; return; }
        if (rec.stage === 'score-width-culled') { this.stat(rec.depth).widthCulled += rec.paths.length; return; }
        if (rec.stage !== 'incoming-frontier') return;
        const set = new Set(); const paths = [];
        for (const p of rec.paths) { set.add(prefixKeys(p).at(-1)); paths.push(p); }
        this.frontiers.set(rec.depth, set); this.paths.set(rec.depth, paths);
    }
    isDeadPath(p) { const ks = prefixKeys(p); return ks.some(k => this.flagged.has(k)); }
}

async function arm(level, flag, observer) {
    const prep = api.prepLevel(level);
    prep._cfg = { ...defaultConfig(), STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE: flag };
    prep._metrics = { nodesExpanded: 0 };
    if (observer) prep._beamResearchObserver = observer;
    const p = await api.beamSearchFromGate(level.gateKeys[0], level, prep, api.SCORING_PROFILES.default,
        budgetMs, Date.now(), null, beamWidth, null, false, {}, nodeBudget);
    return { path: p, nodes: prep._metrics.nodesExpanded, work: prep._workMeter.units };
}

const rows = [];
for (const id of ids) {
    const raw = byId.get(id);
    if (!raw) throw new Error(`level not found: ${id}`);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const plainControl = await arm(level, false, null);
    const cObs = new FrontierObserver(true);
    const control = await arm(level, false, cObs);
    if (JSON.stringify(plainControl.path) !== JSON.stringify(control.path) || plainControl.work !== control.work)
        throw new Error(`${id}: observer changed control behaviour`);
    const tObs = new FrontierObserver(false);
    const treatment = await arm(level, true, tObs);

    const depths = [...cObs.frontiers.keys()].sort((a, b) => a - b);
    let firstDiv = null; let deadOccupancyAtDiv = null; let removed = null; let promoted = null;
    const deadByDepth = [];
    for (const d of depths) {
        const cSet = cObs.frontiers.get(d); const tSet = tObs.frontiers.get(d);
        const deadN = cObs.paths.get(d).filter(p => cObs.isDeadPath(p)).length;
        if (deadN > 0 || firstDiv !== null) deadByDepth.push([d, cSet.size, deadN]);
        if (firstDiv === null && tSet && (cSet.size !== tSet.size || [...cSet].some(k => !tSet.has(k)))) {
            firstDiv = d;
            removed = [...cSet].filter(k => !tSet.has(k)).length;
            promoted = [...tSet].filter(k => !cSet.has(k)).length;
            deadOccupancyAtDiv = deadN;
        }
    }
    // Mechanism at first divergence (depth labels match: stats[d] describes the pool that produced incoming-frontier[d]).
    let mechanism = null; let poolControl = null; let poolTreatment = null; let mergeControl = null; let mergeTreatment = null;
    if (firstDiv !== null) {
        const cs = cObs.stat(firstDiv); const ts = tObs.stat(firstDiv);
        poolControl = cs.pool; poolTreatment = ts.pool; mergeControl = cs.mergeRemoved; mergeTreatment = ts.mergeRemoved;
        const cOver = cs.pool > beamWidth; const tOver = ts.pool > beamWidth;
        mechanism = cOver && !tOver ? 'merge-gate-toggle'
            : cOver && tOver ? 'slot-freeing-both-over-width'
            : !cOver && !tOver ? 'both-under-width' : 'treatment-over-only';
    }
    // Merge-run asymmetry across the whole run: depths where exactly one arm ran the coarse merge (pool > width).
    let mergeAsymDepths = 0; let mergeAsymFirstToggle = null;
    for (const d of depths) {
        const cs = cObs.stats.get(d); const ts = tObs.stats.get(d);
        if (!cs || !ts) continue;
        if ((cs.pool > beamWidth) !== (ts.pool > beamWidth)) { mergeAsymDepths++; if (mergeAsymFirstToggle === null) mergeAsymFirstToggle = d; }
    }
    // Winner lineage: whichever arm solved, find the first depth where its prefix is absent from the other arm's frontier.
    const lineage = (winPath, otherObs) => {
        if (!winPath) return null;
        const ks = prefixKeys(winPath);
        // frontier depth d holds nodes with path length d+1 (depth = path length - 1)
        for (let d = 0; d < winPath.length - 1; d++) {
            const f = otherObs.frontiers.get(d);
            if (f && !f.has(ks[d])) return { firstAbsentDepth: d, pathLength: winPath.length };
        }
        return { firstAbsentDepth: null, pathLength: winPath.length };
    };
    const outcome = !!control.path === !!treatment.path ? (control.path ? 'both' : 'neither') : (treatment.path ? 'gain' : 'loss');
    const row = {
        levelId: id, outcome, requiredLength: level.requiredLength,
        portals: level.portalMap.size,
        control: { solved: !!control.path, nodes: control.nodes, work: control.work, pathLength: control.path?.length ?? null },
        treatment: { solved: !!treatment.path, nodes: treatment.nodes, work: treatment.work, pathLength: treatment.path?.length ?? null },
        frontierDepths: depths.length, firstDivergenceDepth: firstDiv,
        removedAtDivergence: removed, promotedAtDivergence: promoted, deadControlSlotsAtDivergence: deadOccupancyAtDiv,
        mechanism, poolControl, poolTreatment, mergeRemovedControl: mergeControl, mergeRemovedTreatment: mergeTreatment,
        mergeAsymDepths, mergeAsymFirstToggle,
        controlFlaggedTotal: cObs.flagged.size,
        // dead-slot occupancy trajectory (depth, frontier size, dead count) from first dead slot onward, thinned
        deadOccupancy: deadByDepth.filter((_, i) => i % 5 === 0).slice(0, 80),
        maxDeadFraction: deadByDepth.reduce((m, [, n, dd]) => Math.max(m, n ? dd / n : 0), 0),
        // for gains: where the treatment winner's lineage leaves control's frontier; for losses: where control winner leaves treatment's
        winnerLineage: outcome === 'gain' ? lineage(treatment.path, cObs) : outcome === 'loss' ? lineage(control.path, tObs) : null,
    };
    rows.push(row);
    console.error(`${id}: ${outcome} mech=${mechanism} div=${firstDiv} dead@div=${deadOccupancyAtDiv} removed=${removed} promoted=${promoted} maxDead=${row.maxDeadFraction.toFixed(2)} lineage=${JSON.stringify(row.winnerLineage)}`);
}
const count = o => rows.filter(r => r.outcome === o).length;
const doc = { schemaVersion: 1, kind: 'pathfinder-bc1-perturbation-microscope', solverRef, generatedAt: new Date().toISOString(),
    levelsFile, beamWidth, nodeBudget, budgetMs, rows,
    summary: { levels: rows.length, gains: count('gain'), losses: count('loss'), both: count('both'), neither: count('neither'),
        diverged: rows.filter(r => r.firstDivergenceDepth !== null).length,
        mechanismByOutcome: rows.reduce((a, r) => { const k = `${r.outcome}:${r.mechanism}`; a[k] = (a[k] ?? 0) + 1; return a; }, {}) } };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(doc) + '\n');
console.log(JSON.stringify(doc.summary));
