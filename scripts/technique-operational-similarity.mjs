#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { POLICY_PROFILES } from '../modules/solver/policy.js';

const argv = new Map(process.argv.slice(2).filter(x => x.includes('=')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const source = argv.get('--source') ?? 'reports/stress/technique-census/32240161854/second-order-analysis.json';
const cellsSource = argv.get('--cells') ?? 'reports/stress/technique-census/32240161854/combined-cells.json';
const out = argv.get('--out') ?? 'reports/stress/technique-census/32240161854/operational-similarity.json';
const samplePerOutcome = Number(argv.get('--sample-per-outcome') ?? 8);
const census = JSON.parse(readFileSync(source, 'utf8'));
const cells = JSON.parse(readFileSync(cellsSource, 'utf8')).results.filter(row => row.tier === 'T1' && row.techniqueKeys?.length === 1);

function describe(key) {
    const family = key.startsWith('dfs:repair:') ? 'repair' : key.split(':')[0];
    const rest = family === 'repair' ? key.slice('dfs:repair:'.length) : key.slice(family.length + 1);
    const profile = family === 'repair' ? 'repair' : rest.split(/[\/@(]/)[0];
    return {
        searchFamily: family === 'ida' ? 'admissible-order' : family,
        scoringProfile: family === 'ida' && profile === 'none' ? null : profile,
        scoringWeights: profile && POLICY_PROFILES[profile] ? POLICY_PROFILES[profile] : null,
        structuralTemplate: rest.includes('/') ? rest.split('/')[1].split('@')[0] : null,
        beamWidth: Number(rest.match(/@beam(\d+)/)?.[1]) || null,
        diverseBeamRetention: rest.includes('(diverse)'),
        dedupNearTieMode: rest.includes('dedup') ? rest.match(/\(([^)]+)\)/)?.[1] ?? 'enabled' : 'default',
        pruneChanges: [],
        admissibleTieBreakMode: family === 'ida' ? (profile === 'none' ? 'none' : profile) : null,
        repairVariantBiasSeedMode: family === 'repair' ? rest : null,
        retryContext: null,
        budgetBand: null,
    };
}
const byTechnique = new Map();
for (const row of cells) byTechnique.set(row.techniqueKeys[0], [...(byTechnique.get(row.techniqueKeys[0]) ?? []), row]);
const techniqueKeys = [...byTechnique.keys()].sort();
const pairOutcome = new Map([...census.closestTechniquePairs, ...census.mostDistinctTechniquePairs]
    .map(pair => [[pair.a, pair.b].sort().join('\0'), pair]));
function exactCohort(left, right) {
    const l = new Map((byTechnique.get(left) ?? []).map(r => [`${r.corpus}/${r.levelPos}`, r]));
    const r = new Map((byTechnique.get(right) ?? []).map(x => [`${x.corpus}/${x.levelPos}`, x]));
    const groups = { leftOnly: [], rightOnly: [], both: [], neither: [] };
    for (const [id, a] of l) if (r.has(id)) {
        const b = r.get(id); const group = a.ok ? (b.ok ? 'both' : 'leftOnly') : (b.ok ? 'rightOnly' : 'neither');
        if (groups[group].length < samplePerOutcome) groups[group].push({ levelKey: id, levelId: a.levelId });
    }
    return groups;
}
function weightDifferences(left, right) {
    if (!left || !right) return null;
    const terms = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    return Object.fromEntries(terms.map(term => [term, { left: left[term] ?? 1, right: right[term] ?? 1, delta: (right[term] ?? 1) - (left[term] ?? 1) }]));
}
const controlledPairs = census.controlledComparisons.map(pair => {
    const left = describe(pair.left), right = describe(pair.right);
    const indexedOutcome = pairOutcome.get([pair.left, pair.right].sort().join('\0'));
    const union = pair.all.leftOnly + pair.all.rightOnly + pair.all.both;
    const outcome = indexedOutcome ?? {
        common: pair.all.common, disagreement: pair.all.leftOnly + pair.all.rightOnly,
        jaccard: union ? pair.all.both / union : null, mutualInformationBits: null,
    };
    return {
        label: pair.label, leftTechnique: pair.left, rightTechnique: pair.right,
        implementation: { left, right, perTermScoringWeightDifferences: weightDifferences(left.scoringWeights, right.scoringWeights), sourceProxyOnly: true },
        outcomeSimilarity: { jaccard: outcome.jaccard, mutualInformationBits: outcome.mutualInformationBits ?? null, disagreement: outcome.disagreement, common: outcome.common },
        diagnosticCohort: exactCohort(pair.left, pair.right),
        operationalSimilarity: { status: 'not-measured-by-source-proxy', localRanking: null, boundedTrace: null, beamFrontier: null, admissibleSlack: null, repairFingerprint: null },
    };
});
const result = {
    schemaVersion: 1,
    distinction: { implementation: 'source/config description only', operational: 'encountered-state/search behavior', outcome: 'level success-vector relationship' },
    provenance: { census: source, cells: cellsSource, policy: 'modules/solver/policy.ts', samplePerOutcome },
    taxonomy: Object.fromEntries(techniqueKeys.map(key => [key, describe(key)])),
    controlledPairs,
    censoring: 'Cohorts are deterministic bounded fixture nominations. Null operational fields are deliberate: source distance and outcome overlap must not masquerade as measured search behavior.',
};
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${out}: ${Object.keys(result.taxonomy).length} techniques, ${controlledPairs.length} controlled pairs`);
