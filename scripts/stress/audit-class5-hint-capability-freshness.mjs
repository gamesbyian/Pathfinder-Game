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
import { formatAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';

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

// Hint provenance's `solver.technique` is only a coarse family label for modern isolated runs
// (`beam`, `repair`, etc.). Preserve a canonical attempt identity wherever the structured fields
// make that possible; otherwise keep the raw family plus the full relevant structured fields below.
const canonicalAttemptIdentity = provenance => {
    const solver = provenance?.solver ?? {};
    const forcing = solver.forcing ?? {};
    try {
        if (solver.technique === 'repair' || solver.scoringProfileId === 'repair') {
            return formatAttemptIdentityKey({
                scoringProfileId: 'repair', orderingBiasId: null, repair: true,
                repairMustTurnBiased: forcing.repairMustTurnBiased === true,
                repairTurnBiased: forcing.repairTurnBiased === true,
            });
        }
        if (String(solver.technique ?? '').startsWith('admissible-order')) {
            const scoringProfileId = solver.scoringProfileId ?? 'none';
            return formatAttemptIdentityKey({
                scoringProfileId, orderingBiasId: null, admissibleOrder: true,
                admissibleOrderNoTieBreak: scoringProfileId === 'none',
                admissibleOrderLds: solver.admissibleOrderLds === true || forcing.admissibleOrderLds === true,
            });
        }
        if (solver.beamWidth != null) {
            return formatAttemptIdentityKey({
                scoringProfileId: solver.scoringProfileId ?? 'default',
                orderingBiasId: solver.orderingBiasId ?? null,
                beamWidth: Number(solver.beamWidth),
                mechanicBucketRetention: solver.mechanicBucketRetention === true,
            });
        }
        if (solver.technique === 'dfs') {
            return formatAttemptIdentityKey({
                scoringProfileId: solver.scoringProfileId ?? 'default',
                orderingBiasId: solver.orderingBiasId ?? null,
            });
        }
    } catch {
        return null;
    }
    return null;
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
                const solver = provenance.solver ?? {};
                const foundAt = iso(provenance.foundAt);
                const foundMs = foundAt ? Date.parse(foundAt) : null;
                evidence.push({
                    hintIndex,
                    foundAt,
                    afterRequestedCutoff: afterMs == null ? null : (Number.isFinite(foundMs) && foundMs > afterMs),
                    solverVersion: solver.version ?? null,
                    techniqueFamily: solver.technique ?? null,
                    attemptIdentity: canonicalAttemptIdentity(provenance),
                    scoringProfileId: solver.scoringProfileId ?? null,
                    orderingBiasId: solver.orderingBiasId ?? null,
                    beamWidth: solver.beamWidth ?? null,
                    mechanicBucketRetention: solver.mechanicBucketRetention ?? null,
                    admissibleOrderLds: solver.admissibleOrderLds ?? null,
                    forcing: solver.forcing ?? null,
                    gateKey: solver.gateKey ?? null,
                    attemptIndex: solver.attemptIndex ?? null,
                    nodesExpanded: provenance.search?.nodesExpanded ?? null,
                    workSpent: provenance.search?.workSpent ?? null,
                    workBudget: provenance.search?.workBudget ?? null,
                    budgetMs: provenance.search?.budgetMs ?? null,
                    termination: provenance.search?.termination ?? null,
                    randomSeed: provenance.search?.randomSeed ?? null,
                    seedSalt: provenance.search?.seedSalt ?? null,
                    levelRevision: provenance.context?.levelRevision ?? null,
                });
            }
        }
    }
    evidence.sort((a, b) => String(a.foundAt).localeCompare(String(b.foundAt))
        || String(a.attemptIdentity ?? a.techniqueFamily).localeCompare(String(b.attemptIdentity ?? b.techniqueFamily)));
    const filtered = afterMs == null ? evidence : evidence.filter(item => item.afterRequestedCutoff === true);
    const identities = [...new Set(evidence.map(item => item.attemptIdentity ?? item.techniqueFamily).filter(Boolean))].sort();
    rows.push({
        levelId,
        routingRegime: atlasRow.routingRegime ?? null,
        hintCount,
        isolatedColdCapabilityEvidenceCount: evidence.length,
        isolatedColdAttemptIdentities: identities,
        matchingRequestedCutoffCount: filtered.length,
        latestFoundAt: evidence.at(-1)?.foundAt ?? null,
        evidence,
    });
}

const nominated = rows.filter(row => row.isolatedColdCapabilityEvidenceCount > 0);
const cutoffNominated = afterMs == null ? nominated : rows.filter(row => row.matchingRequestedCutoffCount > 0);
const identityStats = new Map();
for (const row of nominated) for (const item of row.evidence) {
    const key = item.attemptIdentity ?? item.techniqueFamily ?? '(unknown-technique)';
    if (!identityStats.has(key)) identityStats.set(key, { evidenceRows: 0, levels: new Set() });
    const stat = identityStats.get(key);
    stat.evidenceRows++;
    stat.levels.add(row.levelId);
}
const topAttemptIdentities = [...identityStats.entries()]
    .map(([identity, stat]) => ({ identity, levels: stat.levels.size, evidenceRows: stat.evidenceRows }))
    .sort((a, b) => b.levels - a.levels || b.evidenceRows - a.evidenceRows || a.identity.localeCompare(b.identity))
    .slice(0, 50);
const summary = {
    atlasGeneratedAt: atlas.generatedAt ?? null,
    atlasFile,
    hintsDir,
    primaryClass5Rows: class5.length,
    class5RowsWithAnyIsolatedColdHintEvidence: nominated.length,
    requestedAfter: afterRaw,
    class5RowsWithEvidenceAfterRequestedCutoff: afterMs == null ? null : cutoffNominated.length,
    uniqueAttemptIdentities: identityStats.size,
    topAttemptIdentities,
    interpretation: 'Nominations only. Reconcile each row against current protocol/T1 admissibility before changing atlas class or production policy.',
};
const result = { schemaVersion: 2, generatedAt: new Date().toISOString(), summary, nominatedRows: nominated, rows };
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
console.log(`NOMINATED_LEVELS=${nominated.map(row => row.levelId).join(',')}`);
console.log(`Wrote ${outFile}`);
