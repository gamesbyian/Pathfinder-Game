#!/usr/bin/env node
/** Offline shadow pilot: does first-tranche lifecycle outcome predict a later-tranche rescue? */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { createCellRunner } from './technique-census-cell.mjs';

const args = new Map(process.argv.slice(2).filter(v => v.startsWith('--') && v.includes('='))
    .map(v => { const [k, ...rest] = v.split('='); return [k, rest.join('=')]; }));
const populationFile = args.get('--population') ?? 'data/stress/portfolio-18-specialists-production-envelope-confirmation-001-population.json';
const capMapFile = args.get('--cap-map') ?? 'data/stress/portfolio-18-specialists-tranche-cap-map-v2.json';
// The accepted decision-bearing artifact used 24 levels. Keep the default aligned with the
// canonical reproduction command so an unqualified rerun cannot recreate the obsolete 12-level draft.
const limit = Number(args.get('--limit') ?? 24);
const outFile = args.get('--out');
if (!Number.isSafeInteger(limit) || limit < 2) throw new Error('--limit must be an integer >= 2');

const population = JSON.parse(readFileSync(populationFile, 'utf8'));
const ids = (Array.isArray(population) ? population : population.levels)
    .map(row => typeof row === 'string' ? row : (row.levelId ?? row.id)).slice(0, limit);
const corpus = JSON.parse(readFileSync('data/stress/stress-levels-random.json', 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;
const positionById = new Map(levels.map((level, index) => [level.id, index + 1]));
const capMap = JSON.parse(readFileSync(capMapFile, 'utf8'));
const defaultTechniques = [
    'beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain',
    'beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets',
    'dfs|score=portalFirstTransfer|bias=none',
];
const techniques = (args.get('--techniques')?.split(',') ?? defaultTechniques);
for (const key of techniques) if (!capMap[key]) throw new Error(`No tranche-v2 cap for ${key}`);

const { runCell } = await createCellRunner();
const rows = [];
for (const [levelIndex, levelId] of ids.entries()) {
    const levelPos = positionById.get(levelId);
    if (!levelPos) throw new Error(`Population id ${levelId} is absent from Corpus 2`);
    for (const techniqueKey of techniques) {
        const firstCap = capMap[techniqueKey];
        const fullCap = firstCap * 2;
        const common = { tier: 'dynamic-tranche-pilot', corpus: 'corpus2', levelPos, techniqueKeys: [techniqueKey],
            budgetMs: Number(args.get('--budget-ms') ?? 30_000), collectAttemptTelemetry: true };
        const first = await runCell({ ...common, cellId: `${levelId}:first:${techniqueKey}`, workBudget: firstCap });
        const full = await runCell({ ...common, cellId: `${levelId}:full:${techniqueKey}`, workBudget: fullCap });
        if (first.deadlineTruncated || full.deadlineTruncated) throw new Error(`${levelId}/${techniqueKey}: wall-censored pilot cell`);
        const outcome = first.attempts?.at(-1)?.outcome ?? 'not-dispatched';
        rows.push({ levelId, levelIndex, split: levelIndex % 2 ? 'test' : 'train', techniqueKey, firstCap, fullCap,
            firstSolved: first.ok, fullSolved: full.ok, continuationBenefit: !first.ok && full.ok,
            firstOutcome: outcome, firstWorkSpent: first.workSpent, fullWorkSpent: full.workSpent });
    }
}

const risk = rows.filter(row => !row.firstSolved);
const summarize = subset => ({ n: subset.length, benefits: subset.filter(row => row.continuationBenefit).length,
    rate: subset.length ? subset.filter(row => row.continuationBenefit).length / subset.length : null });
const by = (key, subset = risk) => Object.fromEntries([...new Set(subset.map(row => row[key]))].sort()
    .map(value => [value, summarize(subset.filter(row => row[key] === value))]));
const train = risk.filter(row => row.split === 'train');
const test = risk.filter(row => row.split === 'test');
const smoothedRate = subset => (subset.filter(row => row.continuationBenefit).length + 1) / (subset.length + 2);
const brier = (featureKeys) => test.length ? test.reduce((sum, row) => {
    let bucket = train.filter(candidate => featureKeys.every(key => candidate[key] === row[key]));
    if (!bucket.length) bucket = train.filter(candidate => candidate.techniqueKey === row.techniqueKey);
    const predicted = smoothedRate(bucket);
    return sum + (predicted - Number(row.continuationBenefit)) ** 2;
}, 0) / test.length : null;
const levelGroups = Map.groupBy(rows, row => row.levelId);
const matchedRows = [...levelGroups].map(([levelId, levelRows]) => {
    const envelope = levelRows.reduce((sum, row) => sum + row.firstCap, 0);
    const firstWorkSpent = levelRows.reduce((sum, row) => sum + row.firstWorkSpent, 0);
    let remainingWork = Math.max(0, envelope - firstWorkSpent);
    const controlSolved = levelRows.some(row => row.firstSolved);
    let treatmentSolved = controlSolved;
    const continuations = [];
    if (!controlSolved) for (const row of levelRows) {
        if (row.firstOutcome !== 'timed-out' || remainingWork < row.fullCap) continue;
        continuations.push(row.techniqueKey);
        remainingWork = Math.max(0, remainingWork - row.fullWorkSpent);
        if (row.fullSolved) { treatmentSolved = true; break; }
    }
    return { levelId, envelope, firstWorkSpent, unusedFirstTrancheWork: Math.max(0, envelope - firstWorkSpent),
        controlSolved, treatmentSolved, continuations };
});
const output = { schemaVersion: 1, evidenceRole: 'development-shadow', populationFile, capMapFile,
    prespecification: { question: 'Does natural exhaustion versus censoring add split-sample information beyond technique identity?',
        success: 'lower held-out Brier score and same directional conditional-value separation in both splits',
        stop: 'no held-out improvement, instability between splits, or no continuation-benefit events' },
    sample: { levels: ids.length, techniques, rows: rows.length, riskRows: risk.length },
    overall: summarize(risk), byOutcome: by('firstOutcome'), trainByOutcome: by('firstOutcome', train), testByOutcome: by('firstOutcome', test),
    heldOutBrier: { techniqueOnly: brier(['techniqueKey']), techniqueAndOutcome: brier(['techniqueKey', 'firstOutcome']) },
    matchedEnvelopeShadow: { policy: 'static-v2 first tranches; in static order, run a 2x-cap restart only when same-solve unused work covers its full cap',
        levels: matchedRows.length, controlSolved: matchedRows.filter(row => row.controlSolved).length,
        treatmentSolved: matchedRows.filter(row => row.treatmentSolved).length,
        continuationDispatches: matchedRows.reduce((sum, row) => sum + row.continuations.length, 0), rows: matchedRows }, rows };
const rendered = `${JSON.stringify(output, null, 2)}\n`;
if (outFile) writeFileSync(outFile, rendered);
else process.stdout.write(rendered);
