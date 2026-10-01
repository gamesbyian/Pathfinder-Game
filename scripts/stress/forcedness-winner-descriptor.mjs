#!/usr/bin/env node
/**
 * PG-F local-forcedness descriptor oracle (reports/2026-10-01-post-exhaustion-solver-premise-space-refresh-001.md lane F).
 *
 * Question: is "a parent had exactly one post-hard-prune successor" (local forcedness) a useful search-state descriptor,
 * i.e. do winner-lineage nodes differ from their same-depth frontier peers in successor count?
 * For every level the raw width-W beam solves (production defaults, BC1 prune on), it records each incoming-frontier
 * parent's post-prune successor count (generatedCandidates from the research parent-expansion telemetry) and locates the
 * winning path's prefix at each depth. Levels (parents) are the independent unit; per level it reports the winner's mean
 * within-depth percentile of successor count (0.5 = indistinguishable), and the forced-node rate for winner vs peers. Peers are restricted to parents with at least one
 * successor, because a winner parent has one by construction.
 * Strictly observational; nothing here feeds a consumer.
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
const outFile = args.get('--out') ?? 'reports/stress/forcedness-winner-descriptor.json';
const idsFile = args.get('--ids-file');
const ids = (idsFile ? readFileSync(idsFile, 'utf8') : (args.get('--level-ids') ?? '')).split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
if (!ids.length) throw new Error('--level-ids or --ids-file required');
const solverRef = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { defaultConfig } = await import('../../modules/solver/ablation-config.ts');
const Solver = createSolver();
const byId = new Map(readLevelCorpusDocumentWithHints(levelsFile).levels.map(l => [String(l.id), l]));

/** Prefix key of a path (full path hash), matching only within one run. */
const keyOf = p => p.join(',');

const rows = [];
for (const id of ids) {
    const raw = byId.get(id);
    if (!raw) throw new Error(`level not found: ${id}`);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const succ = new Map(); // depth -> Map(pathKey -> generatedCandidates)
    const observer = {
        includeParentExpansionWork: true,
        observe(rec) {
            if (rec.stage !== 'generated') return;
            const pe = rec.details?.parentExpansions;
            if (!pe) return;
            for (const e of pe) {
                const d = e.path.length - 1;
                let m = succ.get(d); if (!m) { m = new Map(); succ.set(d, m); }
                m.set(keyOf(e.path), e.generatedCandidates);
            }
        },
    };
    const prep = api.prepLevel(level);
    prep._cfg = { ...defaultConfig() };
    prep._metrics = { nodesExpanded: 0 };
    prep._beamResearchObserver = observer;
    const win = await api.beamSearchFromGate(level.gateKeys[0], level, prep, api.SCORING_PROFILES.default,
        budgetMs, Date.now(), null, beamWidth, null, false, {}, nodeBudget);
    if (!win) { console.error(`${id}: unsolved, skipped`); continue; }
    let pctSum = 0, pctN = 0, winForced = 0, winSteps = 0, peerForced = 0, peerN = 0;
    for (const [d, m] of succ) {
        const prefix = keyOf(win.slice(0, d + 1));
        if (!m.has(prefix) || m.size < 2) continue;
        const w = m.get(prefix);
        // A winner parent has >=1 successor by construction, so compare only against peers that also kept >=1
        // (dead-end parents with 0 successors would otherwise make winners look "more branching" trivially).
        let below = 0, equal = 0, peers = 0;
        for (const [k, v] of m) { if (k === prefix || v < 1) continue; peers++; if (v < w) below++; else if (v === w) equal++; }
        if (!peers) continue;
        pctSum += (below + 0.5 * equal) / peers; pctN++;
        winSteps++; if (w === 1) winForced++;
        for (const [k, v] of m) { if (k === prefix || v < 1) continue; peerN++; if (v === 1) peerForced++; }
    }
    rows.push({ levelId: id, requiredLength: level.requiredLength, comparedDepths: pctN,
        meanWinnerPercentile: pctN ? pctSum / pctN : null,
        winnerForcedRate: winSteps ? winForced / winSteps : null, peerForcedRate: peerN ? peerForced / peerN : null });
    console.error(`${id}: depths=${pctN} winnerPct=${(pctSum / Math.max(1, pctN)).toFixed(3)} winnerForced=${(winForced / Math.max(1, winSteps)).toFixed(3)} peerForced=${(peerForced / Math.max(1, peerN)).toFixed(3)}`);
}
const pct = rows.map(r => r.meanWinnerPercentile).filter(x => x !== null);
const above = pct.filter(x => x > 0.5).length, below = pct.filter(x => x < 0.5).length;
const doc = { schemaVersion: 1, kind: 'pathfinder-forcedness-winner-descriptor', solverRef, generatedAt: new Date().toISOString(),
    levelsFile, beamWidth, nodeBudget, rows,
    summary: { levels: rows.length, levelsWinnerAboveMedian: above, levelsWinnerBelowMedian: below,
        meanOfLevelMeans: pct.length ? pct.reduce((a, b) => a + b, 0) / pct.length : null,
        meanWinnerForcedRate: rows.length ? rows.reduce((a, r) => a + (r.winnerForcedRate ?? 0), 0) / rows.length : null,
        meanPeerForcedRate: rows.length ? rows.reduce((a, r) => a + (r.peerForcedRate ?? 0), 0) / rows.length : null } };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(doc, null, 1) + '\n');
console.log(JSON.stringify(doc.summary));
