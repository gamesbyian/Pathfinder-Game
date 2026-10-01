#!/usr/bin/env node
/**
 * WS2-CUT-BALANCE-PROJECTION: matched-budget beam A/B of STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE.
 * Control = production defaults (flag off); treatment = flag on. Same level, gate, width, node budget.
 * Reports solved/nodes/workSpent per arm; canonical work is not charged for the reused-flood check.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...r] = x.split('='); return [k, r.join('=')]; }));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const beamWidth = Number(args.get('--beam-width') ?? 500);
const nodeBudget = Number(args.get('--node-budget') ?? 3000000);
const budgetMs = Number(args.get('--budget-ms') ?? 300000);
const outFile = args.get('--out') ?? 'reports/stress/bc1-prune-ab.json';
const ids = (args.get('--level-ids') ?? '').split(',').map(x => x.trim()).filter(Boolean);
if (!ids.length) throw new Error('--level-ids required');
const solverRef = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { defaultConfig } = await import('../../modules/solver/ablation-config.ts');
const Solver = createSolver();
const byId = new Map(readLevelCorpusDocumentWithHints(levelsFile).levels.map(l => [String(l.id), l]));

async function arm(level, flag) {
    const prep = api.prepLevel(level);
    prep._cfg = { ...defaultConfig(), STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE: flag };
    prep._metrics = { nodesExpanded: 0 };
    const t0 = Date.now();
    const p = await api.beamSearchFromGate(level.gateKeys[0], level, prep, api.SCORING_PROFILES.default,
        budgetMs, Date.now(), null, beamWidth, null, false, {}, nodeBudget);
    return { solved: !!p, pathLength: p ? p.length : null, nodes: prep._metrics.nodesExpanded, workSpent: prep._workMeter.units, ms: Date.now() - t0 };
}

const rows = [];
for (const id of ids) {
    const raw = byId.get(id);
    if (!raw) throw new Error(`level not found: ${id}`);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const control = await arm(level, false);
    const treatment = await arm(level, true);
    rows.push({ levelId: id, control, treatment });
    console.error(`${id}: ctl solved=${control.solved} work=${control.workSpent} | trt solved=${treatment.solved} work=${treatment.workSpent}`);
}
const doc = { schemaVersion: 1, kind: 'pathfinder-bc1-prune-ab', solverRef, generatedAt: new Date().toISOString(), levelsFile, beamWidth, nodeBudget, budgetMs, rows,
    summary: { levels: rows.length, controlSolved: rows.filter(r => r.control.solved).length, treatmentSolved: rows.filter(r => r.treatment.solved).length,
        gains: rows.filter(r => !r.control.solved && r.treatment.solved).length, losses: rows.filter(r => r.control.solved && !r.treatment.solved).length,
        controlWork: rows.reduce((n, r) => n + r.control.workSpent, 0), treatmentWork: rows.reduce((n, r) => n + r.treatment.workSpent, 0),
        controlMs: rows.reduce((n, r) => n + r.control.ms, 0), treatmentMs: rows.reduce((n, r) => n + r.treatment.ms, 0) } };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify(doc.summary));
