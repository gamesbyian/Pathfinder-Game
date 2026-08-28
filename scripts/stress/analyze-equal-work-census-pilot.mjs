#!/usr/bin/env node
/**
 * Analyze the bounded EW1 equal-work census against the frozen full-depth T1 node census.
 *
 * This is an offline join only. It never runs the solver and never produces production steering.
 * EW1 prices early/medium capability in canonical work; frozen T1 remains the deeper within-technique
 * capability reference. Their difference is exactly the scheduler question this report surfaces.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const EW_FILE = args.get('--equal-work');
const T1_FILE = args.get('--node-census')
    || 'reports/stress/technique-census/32240161854/combined-cells.json';
const OUT_JSON = args.get('--out') || 'tmp/ew1-analysis.json';
const OUT_MD = args.get('--summary-out') || 'tmp/ew1-analysis.md';
if (!EW_FILE) throw new Error('--equal-work=<EW1 combined-cells.json> is required');

const read = p => JSON.parse(readFileSync(path.resolve(p), 'utf8'));
const ewDoc = read(EW_FILE);
const t1Doc = read(T1_FILE);
const ew = (ewDoc.results ?? []).filter(r =>
    r.tier === 'EW1' && (r.techniqueKeys?.length ?? 0) === 1);
const t1Base = (t1Doc.results ?? []).filter(r =>
    r.tier === 'T1'
    && (r.techniqueKeys?.length ?? 0) === 1
    && !r.variantLabel
    && !r.flagExperiment
    && !r.pairLabel
    && !r.ablation);

if (!ew.length) throw new Error('equal-work input contains no EW1 rows');

const idOf = r => r.levelId ?? r.id ?? null;
const techOf = r => r.techniqueKeys?.[0] ?? null;
const cellKey = r => `${r.corpus}/${idOf(r)}/${techOf(r)}`;
const levelKey = r => `${r.corpus}/${idOf(r)}`;
const t1ByCell = new Map(t1Base.map(r => [cellKey(r), r]));

const techniques = [...new Set(ew.map(techOf).filter(Boolean))].sort();
const solversByLevel = new Map();
for (const r of ew) if (r.ok) {
    const lk = levelKey(r);
    if (!solversByLevel.has(lk)) solversByLevel.set(lk, new Set());
    solversByLevel.get(lk).add(techOf(r));
}
const uniqueByTechnique = new Map();
for (const solvers of solversByLevel.values()) if (solvers.size === 1) {
    const t = [...solvers][0];
    uniqueByTechnique.set(t, (uniqueByTechnique.get(t) ?? 0) + 1);
}

function median(values) {
    if (!values.length) return null;
    const s = [...values].sort((a, b) => a - b);
    const i = Math.floor(s.length / 2);
    return s.length % 2 ? s[i] : Math.round((s[i - 1] + s[i]) / 2);
}
function family(key) {
    if (key.startsWith('beam:')) return 'beam';
    if (key.startsWith('dfs:repair')) return 'repair';
    if (key.startsWith('ida:')) return 'ida';
    if (key.startsWith('dfs:')) return 'dfs';
    return 'other';
}
const thresholds = [500_000, 2_000_000, 5_000_000, 10_000_000];

const perTechnique = techniques.map(technique => {
    const rows = ew.filter(r => techOf(r) === technique);
    const solveRows = rows.filter(r => r.ok);
    const matched = rows.map(r => ({ ew: r, t1: t1ByCell.get(cellKey(r)) })).filter(x => x.t1);
    const deepOnly = matched.filter(x => x.t1.ok && !x.ew.ok);
    const equalWorkOnly = matched.filter(x => !x.t1.ok && x.ew.ok);
    const aggregateWork = rows.reduce((s, r) => s + Number(r.workSpent ?? 0), 0);
    return {
        technique,
        family: family(technique),
        cells: rows.length,
        solved: solveRows.length,
        unique: uniqueByTechnique.get(technique) ?? 0,
        aggregateWork,
        meanWork: rows.length ? Math.round(aggregateWork / rows.length) : null,
        medianSolveWork: median(solveRows.map(r => Number(r.workSpent ?? 0))),
        solvesByWork: Object.fromEntries(thresholds.map(t => [String(t),
            solveRows.filter(r => Number(r.workSpent ?? Infinity) <= t).length])),
        workBudgetReached: rows.filter(r => r.status === 'work-budget-reached').length,
        exhausted: rows.filter(r => r.status === 'exhausted').length,
        deadlineTruncated: rows.filter(r => r.status === 'deadline-truncated').length,
        error: rows.filter(r => r.status === 'error').length,
        t1MatchedCells: matched.length,
        t1FullNodeSolvedSameCells: matched.filter(x => x.t1.ok).length,
        t1DeepOnly: deepOnly.length,
        equalWorkOnly: equalWorkOnly.length,
        t1DeepOnlyIds: deepOnly.map(x => idOf(x.ew)).filter(Boolean).sort(),
        equalWorkOnlyIds: equalWorkOnly.map(x => idOf(x.ew)).filter(Boolean).sort(),
    };
});

const familyRows = [...new Set(perTechnique.map(r => r.family))].sort().map(name => {
    const actions = perTechnique.filter(r => r.family === name);
    const cells = ew.filter(r => family(techOf(r)) === name);
    const solvedLevels = new Set(cells.filter(r => r.ok).map(levelKey));
    return {
        family: name,
        techniques: actions.length,
        cells: cells.length,
        solvedCells: cells.filter(r => r.ok).length,
        distinctLevelsSolved: solvedLevels.size,
        aggregateWork: cells.reduce((s, r) => s + Number(r.workSpent ?? 0), 0),
        uniqueLevels: [...solvedLevels].filter(lk => {
            const all = solversByLevel.get(lk);
            return all && [...all].every(t => family(t) === name);
        }).length,
        deadlineTruncated: cells.filter(r => r.status === 'deadline-truncated').length,
    };
});

// Cost-weighted greedy cover. The cost charged for selecting an action is its measured aggregate
// work over every mechanically-eligible EW1 row. This is an optimistic static-oracle diagnostic,
// not a causal production schedule: predecessor effects and early stopping after another action wins
// are deliberately not simulated.
const solveSetByTechnique = new Map(techniques.map(t => [t, new Set(
    ew.filter(r => techOf(r) === t && r.ok).map(levelKey)
)]));
const costByTechnique = new Map(perTechnique.map(r => [r.technique, r.aggregateWork]));
const remaining = new Set(techniques);
const covered = new Set();
const greedy = [];
while (remaining.size) {
    let best = null;
    for (const t of remaining) {
        const gained = [...solveSetByTechnique.get(t)].filter(lk => !covered.has(lk));
        if (!gained.length) continue;
        const cost = costByTechnique.get(t) || 1;
        const score = gained.length / cost;
        if (!best || score > best.score
            || (score === best.score && gained.length > best.gained.length)
            || (score === best.score && gained.length === best.gained.length && cost < best.cost)
            || (score === best.score && gained.length === best.gained.length && cost === best.cost && t < best.technique)) {
            best = { technique: t, gained, cost, score };
        }
    }
    if (!best) break;
    for (const lk of best.gained) covered.add(lk);
    remaining.delete(best.technique);
    greedy.push({
        rank: greedy.length + 1,
        technique: best.technique,
        family: family(best.technique),
        marginalSolves: best.gained.length,
        cumulativeSolves: covered.size,
        aggregateEligibleWork: best.cost,
        marginalIds: best.gained.sort(),
    });
}

const levelKeys = [...new Set(ew.map(levelKey))];
const t1SameSampleSolves = new Set();
for (const r of ew) {
    const t1 = t1ByCell.get(cellKey(r));
    if (t1?.ok) t1SameSampleSolves.add(levelKey(r));
}
const ewSolves = new Set(ew.filter(r => r.ok).map(levelKey));

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'development equal-work pricing join',
    equalWorkFile: EW_FILE,
    nodeCensusFile: T1_FILE,
    levels: levelKeys.length,
    cells: ew.length,
    techniques: techniques.length,
    deadlineTruncated: ew.filter(r => r.status === 'deadline-truncated').length,
    errors: ew.filter(r => r.status === 'error').length,
    equalWorkOracleLevelsSolved: ewSolves.size,
    t1FullNodeOracleLevelsSolvedOnSameCells: t1SameSampleSolves.size,
    perTechnique,
    familyRows,
    greedyCover: greedy,
};

mkdirSync(path.dirname(path.resolve(OUT_JSON)), { recursive: true });
mkdirSync(path.dirname(path.resolve(OUT_MD)), { recursive: true });
writeFileSync(path.resolve(OUT_JSON), JSON.stringify(result, null, 2));

const fmtM = n => n == null ? '—' : (n / 1_000_000).toFixed(2) + 'M';
const md = [
    '# EW1 equal-work census analysis', '',
    `Population: ${result.levels} frozen-gap levels; ${result.cells} mechanically eligible cells; ${result.techniques} base techniques.`,
    `EW1 <=10M-work oracle union: **${result.equalWorkOracleLevelsSolved}/${result.levels}**. Frozen full-node T1 oracle union over the same eligible cells: **${result.t1FullNodeOracleLevelsSolvedOnSameCells}/${result.levels}**.`,
    `Deadline-truncated cells: ${result.deadlineTruncated}; errors: ${result.errors}.`, '',
    '## Per technique', '',
    '| technique | family | EW1 solved | unique | <=0.5M | <=2M | <=5M | <=10M | mean work | work-cap | exhausted | T1 full-node solved | T1-only deep | EW1-only inversion |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...perTechnique
        .sort((a, b) => b.solved - a.solved || b.unique - a.unique || a.meanWork - b.meanWork || a.technique.localeCompare(b.technique))
        .map(r => `| \`${r.technique}\` | ${r.family} | ${r.solved}/${r.cells} | ${r.unique} | ${r.solvesByWork['500000']} | ${r.solvesByWork['2000000']} | ${r.solvesByWork['5000000']} | ${r.solvesByWork['10000000']} | ${fmtM(r.meanWork)} | ${r.workBudgetReached} | ${r.exhausted} | ${r.t1FullNodeSolvedSameCells}/${r.t1MatchedCells} | ${r.t1DeepOnly} | ${r.equalWorkOnly} |`),
    '', '## Family summary', '',
    '| family | techniques | cells | solved cells | distinct levels solved | family-only levels | aggregate work | deadline |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...familyRows.map(r => `| ${r.family} | ${r.techniques} | ${r.cells} | ${r.solvedCells} | ${r.distinctLevelsSolved} | ${r.uniqueLevels} | ${fmtM(r.aggregateWork)} | ${r.deadlineTruncated} |`),
    '', '## Cost-weighted greedy cover (diagnostic oracle only)', '',
    '| rank | action | family | marginal solves | cumulative | measured eligible work |',
    '|---:|---|---|---:|---:|---:|',
    ...greedy.map(r => `| ${r.rank} | \`${r.technique}\` | ${r.family} | ${r.marginalSolves} | ${r.cumulativeSolves} | ${fmtM(r.aggregateEligibleWork)} |`),
    '',
    '> This cover is not a production scheduler. It charges each action its measured EW1 population work but does not model predecessor-conditioned search state, displacement, or early termination after another action wins.',
].join('\n');
writeFileSync(path.resolve(OUT_MD), md + '\n');
console.log(md);
