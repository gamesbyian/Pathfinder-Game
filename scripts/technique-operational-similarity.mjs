#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { POLICY_PROFILES } from '../modules/solver/policy.js';
import { normalizeAttemptIdentityKey, parseAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';

const argv = new Map(process.argv.slice(2).filter(x => x.includes('=')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const source = argv.get('--source') ?? 'reports/stress/technique-census/32240161854/second-order-analysis.json';
const cellsSource = argv.get('--cells') ?? 'reports/stress/technique-census/32240161854/combined-cells.json';
const out = argv.get('--out') ?? 'reports/stress/technique-census/32240161854/operational-similarity.json';
const samplePerOutcome = Number(argv.get('--sample-per-outcome') ?? 8);
const census = JSON.parse(readFileSync(source, 'utf8'));
const cells = JSON.parse(readFileSync(cellsSource, 'utf8')).results.filter(row => row.tier === 'T1' && row.techniqueKeys?.length === 1);

function describe(key) {
    const canonicalKey = normalizeAttemptIdentityKey(key);
    const fields = parseAttemptIdentityKey(canonicalKey);
    const searchFamily = fields.repair ? 'repair'
        : fields.admissibleOrder ? 'admissible-order'
            : fields.beamWidth ? 'beam' : 'dfs';
    const scoringProfile = fields.repair ? 'repair'
        : fields.admissibleOrderNoTieBreak ? null : fields.profileName;
    const repairGuidance = fields.repairMustTurnBiased ? 'must-turn-biased'
        : fields.repairTurnBiased ? 'turn-biased'
            : fields.repair ? 'standard' : null;
    return {
        searchFamily,
        scoringProfile,
        scoringWeights: scoringProfile && POLICY_PROFILES[scoringProfile] ? POLICY_PROFILES[scoringProfile] : null,
        structuralTemplate: fields.templateId ?? null,
        beamWidth: fields.beamWidth ?? null,
        diverseBeamRetention: !!fields.diverseBeam,
        dedupNearTieMode: 'default',
        pruneChanges: [],
        admissibleTieBreakMode: fields.admissibleOrder
            ? (fields.admissibleOrderNoTieBreak ? 'none' : fields.profileName) : null,
        repairVariantBiasSeedMode: repairGuidance,
        retryContext: null,
        budgetBand: null,
    };
}
const byTechnique = new Map();
for (const row of cells) {
    const key = normalizeAttemptIdentityKey(row.techniqueKeys[0]);
    byTechnique.set(key, [...(byTechnique.get(key) ?? []), row]);
}
const techniqueKeys = [...byTechnique.keys()].sort();
const pairOutcome = new Map([...census.closestTechniquePairs, ...census.mostDistinctTechniquePairs]
    .map(pair => [[normalizeAttemptIdentityKey(pair.a), normalizeAttemptIdentityKey(pair.b)].sort().join('\0'), pair]));
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
    const leftKey = normalizeAttemptIdentityKey(pair.left);
    const rightKey = normalizeAttemptIdentityKey(pair.right);
    const left = describe(leftKey), right = describe(rightKey);
    const indexedOutcome = pairOutcome.get([leftKey, rightKey].sort().join('\0'));
    const union = pair.all.leftOnly + pair.all.rightOnly + pair.all.both;
    const outcome = indexedOutcome ?? {
        common: pair.all.common, disagreement: pair.all.leftOnly + pair.all.rightOnly,
        jaccard: union ? pair.all.both / union : null, mutualInformationBits: null,
    };
    return {
        label: pair.label, leftTechnique: leftKey, rightTechnique: rightKey,
        implementation: { left, right, perTermScoringWeightDifferences: weightDifferences(left.scoringWeights, right.scoringWeights), sourceProxyOnly: true },
        outcomeSimilarity: { jaccard: outcome.jaccard, mutualInformationBits: outcome.mutualInformationBits ?? null, disagreement: outcome.disagreement, common: outcome.common },
        diagnosticCohort: exactCohort(leftKey, rightKey),
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
