#!/usr/bin/env node
/**
 * Audit a frozen residual atlas's primary class-5 rows against the current hint store for later or
 * otherwise-unjoined isolated cold-solver capability evidence.
 *
 * This is a nomination/reconciliation tool, NOT an atlas reclassifier. Hint provenance may have a
 * different protocol/evidence role from the T1 census that produced the atlas. Its purpose is to
 * prevent capability-acquisition work from spending time on a row for which a current isolated
 * solver has already demonstrated capability after (or outside) the frozen census join.
 *
 * Usage:
 *   node scripts/stress/audit-class5-hint-capability-freshness.mjs \
 *     --atlas=tmp/post-1048-residual-atlas-fixed.json \
 *     --hints-dir=data/stress/hints-random \
 *     --out=tmp/class5-hint-capability-freshness.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const required = key => {
    const value = args.get(key);
    if (!value) throw new Error(`missing ${key}`);
    return value;
};
const atlasFile = required('--atlas');
const hintsDir = args.get('--hints-dir') ?? 'data/stress/hints-random';
const outFile = args.get('--out') ?? 'tmp/class5-hint-capability-freshness.json';
const afterRaw = args.get('--after') ?? null;
const afterMs = afterRaw ? Date.parse(afterRaw) : null;
if (afterRaw && !Number.isFinite(afterMs)) throw new Error(`invalid --after timestamp: ${afterRaw}`);

const atlas = JSON.parse(readFileSync(atlasFile, 'utf8'));
const class5 = (atlas.rows ?? []).filter(row => Number(row.primaryClass) === 5);
if (!class5.length) throw new Error(`no primary class-5 rows found in ${atlasFile}`);

const isColdIsolatedCapability = provenance => {
    const solver = provenance?.solver ?? {};
    const context = provenance?.context ?? {};
    return solver.id === 'pathfinder-solver'
        && context.usedExistingHints === false
        && context.hintGuided === false
        && context.isolatedTechnique === true;
};
const techniqueIdentity = provenance => {
    const solver = provenance?.solver ?? {};
    if (typeof solver.technique === 'string' && solver.technique.length) return solver.technique;
    const parts = [];
    if (solver.scoringProfileId) parts.push(`score=${solver.scoringProfileId}`);
    if (solver.orderingBiasId) parts.push(`bias=${solver.orderingBiasId}`);
    if (solver.beamWidth != null) parts.push(`width=${solver.beamWidth}`);
    if (solver.mechanicBucketRetention != null) parts.push(`mechanicBucketRetention=${solver.mechanicBucketRetention}`);
    return parts.length ? parts.join('|') : null;
};
const iso = value => {
    if (!value) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : String(value);
};

const rows = [];
for (const atlasRow of class5) {
    const levelId = String(atlasRow.id);
    const hintFile = path.join(hintsDir, `${levelId}.json`);
    const evidence = [];
    let hintCount = null;
    if (existsSync(hintFile)) {
        const hintDoc = JSON.parse(readFileSync(hintFile, 'utf8'));
        const hints = Array.isArray(hintDoc.hints) ? hintDoc.hints : [];
        hintCount = hints.length;
        for (let hintIndex = 0; hintIndex < hints.length; hintIndex++) {
            const provenanceRows = Array.isArray(hints[hintIndex]?.provenance) ? hints[hintIndex].provenance : [];
            for (const provenance of provenanceRows) {
                if (!isColdIsolatedCapability(provenance)) continue;
                const foundAt = iso(provenance.foundAt);
                const foundMs = foundAt ? Date.parse(foundAt) : null;
                evidence.push({
                    hintIndex,
                    foundAt,
                    afterRequestedCutoff: afterMs == null ? null : (Number.isFinite(foundMs) && foundMs > afterMs),
                    solverVersion: provenance.solver?.version ?? null,
                    technique: techniqueIdentity(provenance),
                    scoringProfileId: provenance.solver?.scoringProfileId ?? null,
                    orderingBiasId: provenance.solver?.orderingBiasId ?? null,
                    beamWidth: provenance.solver?.beamWidth ?? null,
                    mechanicBucketRetention: provenance.solver?.mechanicBucketRetention ?? null,
                    gateKey: provenance.solver?.gateKey ?? null,
                    nodesExpanded: provenance.search?.nodesExpanded ?? null,
                    workSpent: provenance.search?.workSpent ?? null,
                    termination: provenance.search?.termination ?? null,
                    levelRevision: provenance.context?.levelRevision ?? null,
                });
            }
        }
    }
    evidence.sort((a, b) => String(a.foundAt).localeCompare(String(b.foundAt)) || String(a.technique).localeCompare(String(b.technique)));
    const filtered = afterMs == null ? evidence : evidence.filter(item => item.afterRequestedCutoff === true);
    rows.push({
        levelId,
        routingRegime: atlasRow.routingRegime ?? null,
        hintCount,
        isolatedColdCapabilityEvidenceCount: evidence.length,
        matchingRequestedCutoffCount: filtered.length,
        latestFoundAt: evidence.at(-1)?.foundAt ?? null,
        evidence,
    });
}

const nominated = rows.filter(row => row.isolatedColdCapabilityEvidenceCount > 0);
const cutoffNominated = afterMs == null ? nominated : rows.filter(row => row.matchingRequestedCutoffCount > 0);
const techniqueCounts = new Map();
for (const row of nominated) for (const item of row.evidence) {
    const key = item.technique ?? '(unknown-technique)';
    techniqueCounts.set(key, (techniqueCounts.get(key) ?? 0) + 1);
}
const summary = {
    atlasGeneratedAt: atlas.generatedAt ?? null,
    atlasFile,
    hintsDir,
    primaryClass5Rows: class5.length,
    class5RowsWithAnyIsolatedColdHintEvidence: nominated.length,
    requestedAfter: afterRaw,
    class5RowsWithEvidenceAfterRequestedCutoff: afterMs == null ? null : cutoffNominated.length,
    uniqueTechniqueIdentities: techniqueCounts.size,
    topTechniqueIdentities: [...techniqueCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 30).map(([technique, evidenceRows]) => ({ technique, evidenceRows })),
    interpretation: 'Nominations only. Reconcile each row against current protocol/T1 admissibility before changing atlas class or production policy.',
};
const result = { schemaVersion: 1, generatedAt: new Date().toISOString(), summary, nominatedRows: nominated, rows };
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
console.log(`Wrote ${outFile}`);
