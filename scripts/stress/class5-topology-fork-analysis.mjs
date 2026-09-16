#!/usr/bin/env node
/**
 * Joins frozen class5-topology-fork-construct.mjs candidate pairs to their exact-label results
 * (cpsat-explicit-prefix-reference.mjs output) and applies the frozen interpretation rules from
 * docs/solver-class5-controlled-topology-acquisition-preflight.md. Read-only join; does not
 * construct candidates, does not run CP-SAT, and does not alter either upstream artifact.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...v] = x.split('='); return [k, v.join('=')]; }));
const candidateFiles = (args.get('--candidates') ?? '').split(',').map(s => s.trim()).filter(Boolean);
const labelFiles = (args.get('--labels') ?? '').split(',').map(s => s.trim()).filter(Boolean);
const outFile = args.get('--out') ?? 'reports/stress/class5-topology-fork-analysis.json';
if (candidateFiles.length === 0 || labelFiles.length === 0) throw new Error('--candidates and --labels are required, comma-separated');

const candidates = candidateFiles.flatMap(f => JSON.parse(readFileSync(f, 'utf8')).candidates);
const labelRows = new Map(labelFiles.flatMap(f => JSON.parse(readFileSync(f, 'utf8')).rows).map(row => [row.caseId, row]));

const pairs = candidates.map(c => {
    const originalRow = labelRows.get(c.original.id);
    const alternateRow = labelRows.get(c.alternate.id);
    if (!originalRow || !alternateRow) throw new Error(`missing exact-label row for pair ${c.pairId}`);
    const label = row => row.referenceLabel === 'live' ? 'live' : row.referenceLabel === 'dead' ? 'dead' : 'indeterminate';
    const originalLabel = label(originalRow);
    const alternateLabel = label(alternateRow);
    const bothResolved = originalLabel !== 'indeterminate' && alternateLabel !== 'indeterminate';
    const discordant = bothResolved && originalLabel !== alternateLabel;
    return {
        pairId: c.pairId, parentId: c.parentId,
        anchorA: c.anchorA, anchorB: c.anchorB, segmentLength: c.segmentLength,
        maxPhaseDelta: c.maxPhaseDelta,
        controlFingerprintMatch: c.controlFingerprintMatch,
        endpointGeometryKeyMatch: c.endpointGeometryKeyMatch,
        portalExcludedBoth: c.portalExcludedBoth,
        originalLabel, alternateLabel, bothResolved, discordant,
        originalReason: originalRow.referenceReason, alternateReason: alternateRow.referenceReason,
        originalRefereeValid: originalRow.refereeValid ?? null, alternateRefereeValid: alternateRow.refereeValid ?? null,
    };
});

const totalPairs = pairs.length;
const resolvedPairs = pairs.filter(p => p.bothResolved);
const unresolvedPairs = pairs.filter(p => !p.bothResolved);
const discordantPairs = pairs.filter(p => p.discordant);
const discordantFamilies = new Set(discordantPairs.map(p => p.parentId));
const allValidControls = pairs.every(p => p.controlFingerprintMatch && p.endpointGeometryKeyMatch && p.portalExcludedBoth && p.maxPhaseDelta > 1e-12);

const unresolvedFraction = totalPairs > 0 ? unresolvedPairs.length / totalPairs : 1;
let decision;
if (unresolvedFraction > 0.25) {
    decision = 'exact-tooling-limited';
} else if (totalPairs < 6) {
    decision = 'construction-starved';
} else if (discordantPairs.length >= 3 && discordantFamilies.size >= 2 && allValidControls) {
    decision = 'premise-earned';
} else if (discordantPairs.length >= 1) {
    decision = 'discovery-only';
} else if (resolvedPairs.length >= 8) {
    decision = 'tested-construction-negative';
} else {
    decision = 'inconclusive-below-negative-closure-bar';
}

const byParent = new Map();
for (const p of pairs) {
    if (!byParent.has(p.parentId)) byParent.set(p.parentId, []);
    byParent.get(p.parentId).push(p);
}
const parentSummary = [...byParent.entries()].map(([parentId, rows]) => ({
    parentId, pairs: rows.length,
    discordant: rows.filter(r => r.discordant).length,
    labels: rows.map(r => `${r.originalLabel}/${r.alternateLabel}`),
}));

const output = {
    schemaVersion: 1,
    kind: 'class5-controlled-topology-fork-analysis',
    generatedAt: new Date().toISOString(),
    preflight: 'docs/solver-class5-controlled-topology-acquisition-preflight.md',
    sourceCandidates: candidateFiles,
    sourceLabels: labelFiles,
    summary: {
        totalPairs, resolvedPairs: resolvedPairs.length, unresolvedPairs: unresolvedPairs.length,
        unresolvedFraction, discordantPairs: discordantPairs.length,
        independentParentFamilies: [...new Set(pairs.map(p => p.parentId))].length,
        discordantParentFamilies: discordantFamilies.size,
        allValidControls, decision,
    },
    parentSummary,
    pairs,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary, null, 2));
console.log(JSON.stringify(parentSummary, null, 2));
