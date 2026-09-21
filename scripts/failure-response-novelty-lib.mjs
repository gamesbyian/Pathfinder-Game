import { failureResponseIdentityView } from './solver-failure-response-lib.mjs';

/**
 * Longitudinal novelty/saturation analysis for compact failure-response evidence.
 *
 * The unit is the parent level, not the record or attempt. Phenotypes deliberately use categorical
 * process/outcome structure only; numeric work, nodes, badness, timestamps and exact parent identity
 * are excluded so ordinary dose variation does not manufacture a new "mechanism".
 *
 * Input document order is authoritative chronology. Callers must supply documents in the historical
 * order they intend to audit; this helper never guesses chronology from filenames.
 */

function stable(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}

function categoricalAttempt(attempt) {
    if (!attempt || typeof attempt !== 'object') return null;
    const mechanismFlags = {};
    for (const key of ['repair', 'repairProbe', 'admissibleOrder', 'beam', 'nodeBudgetReached', 'workBudgetReached']) {
        if (typeof attempt[key] === 'boolean') mechanismFlags[key] = attempt[key];
    }
    return {
        stageId: attempt.stageId ?? null,
        actionKey: attempt.actionKey ?? null,
        configKey: attempt.configKey ?? null,
        gateKey: attempt.gateKey ?? null,
        outcome: attempt.outcome ?? 'unknown',
        timedOut: typeof attempt.timedOut === 'boolean' ? attempt.timedOut : null,
        deadlineTruncated: typeof attempt.deadlineTruncated === 'boolean' ? attempt.deadlineTruncated : null,
        mechanismFlags,
    };
}

/**
 * Record-level descriptive phenotype. It intentionally excludes protocol/run/solver identity:
 * those are compatibility strata, not the phenomenon itself.
 */
export function failureResponseRecordPhenotype(row) {
    const identity = failureResponseIdentityView(row);
    return {
        outcome: row?.outcome ?? 'unknown',
        actionKey: identity.actionKey ?? null,
        stageId: row?.stageId ?? null,
        configurationKey: identity.configurationKey ?? null,
        participated: typeof row?.participated === 'boolean' ? row.participated : null,
        reached: typeof row?.reached === 'boolean' ? row.reached : null,
        exhausted: typeof row?.exhausted === 'boolean' ? row.exhausted : null,
        nodeCapped: typeof row?.nodeCapped === 'boolean' ? row.nodeCapped : null,
        workCapped: typeof row?.workCapped === 'boolean' ? row.workCapped : null,
        deadlineTruncated: typeof row?.deadlineTruncated === 'boolean' ? row.deadlineTruncated : null,
        refereeInvalid: typeof row?.refereeInvalid === 'boolean' ? row.refereeInvalid : null,
        solvedWithFailedAttempt: typeof row?.solvedWithFailedAttempt === 'boolean' ? row.solvedWithFailedAttempt : null,
        attempts: Array.isArray(row?.attempts) ? row.attempts.map(categoricalAttempt) : null,
    };
}

export function failureResponseRecordPhenotypeSignature(row) {
    return stable(failureResponseRecordPhenotype(row));
}

/**
 * Parent phenotype is the unordered set of distinct record phenotypes observed for that parent in
 * one evidence document. Sorting removes shard/serialization order as a source of novelty.
 */
export function failureResponseParentPhenotypes(document) {
    const byParent = new Map();
    for (const row of document?.records ?? []) {
        const parentId = String(row?.parentId ?? row?.identity ?? 'unknown');
        const set = byParent.get(parentId) ?? new Set();
        set.add(failureResponseRecordPhenotypeSignature(row));
        byParent.set(parentId, set);
    }
    return new Map([...byParent.entries()].map(([parentId, signatures]) => [
        parentId,
        stable([...signatures].sort()),
    ]));
}

export function analyzeFailureResponseNovelty(documents, { labels = [] } = {}) {
    const firstSeen = new Map();
    const cumulative = new Set();
    const steps = [];

    (documents ?? []).forEach((document, documentIndex) => {
        const parentPhenotypes = failureResponseParentPhenotypes(document);
        const newPhenotypes = new Set();
        let parentsWithNewPhenotype = 0;

        for (const [parentId, phenotype] of parentPhenotypes) {
            const isNew = !cumulative.has(phenotype);
            if (isNew) {
                newPhenotypes.add(phenotype);
                if (!firstSeen.has(phenotype)) {
                    firstSeen.set(phenotype, {
                        documentIndex,
                        label: labels[documentIndex] ?? String(documentIndex),
                        firstParentId: parentId,
                    });
                }
            }
        }
        for (const phenotype of parentPhenotypes.values()) {
            if (newPhenotypes.has(phenotype)) parentsWithNewPhenotype += 1;
            cumulative.add(phenotype);
        }

        steps.push({
            documentIndex,
            label: labels[documentIndex] ?? String(documentIndex),
            parents: parentPhenotypes.size,
            distinctPhenotypesInDocument: new Set(parentPhenotypes.values()).size,
            newPhenotypes: newPhenotypes.size,
            parentsWithNewPhenotype,
            cumulativePhenotypes: cumulative.size,
            noveltyFractionOfDocumentPhenotypes: parentPhenotypes.size
                ? newPhenotypes.size / new Set(parentPhenotypes.values()).size
                : null,
        });
    });

    return {
        documents: steps.length,
        totalDistinctPhenotypes: cumulative.size,
        steps,
        firstSeen: Object.fromEntries([...firstSeen.entries()].map(([signature, info]) => [signature, info])),
    };
}

/**
 * Retrospective frontier audit: for the target document, report which of its parent-level phenotypes
 * had already been observed before that evidence frontier.
 */
export function auditFailurePhenotypesAtFrontier(documents, targetIndex, { labels = [] } = {}) {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= (documents?.length ?? 0)) {
        throw new Error('targetIndex must identify one input document');
    }
    const prior = new Set();
    for (let i = 0; i < targetIndex; i++) {
        for (const phenotype of failureResponseParentPhenotypes(documents[i]).values()) prior.add(phenotype);
    }

    const target = failureResponseParentPhenotypes(documents[targetIndex]);
    const targetPhenotypes = new Set(target.values());
    const alreadyVisible = [...targetPhenotypes].filter(signature => prior.has(signature));
    const firstVisibleAtTarget = [...targetPhenotypes].filter(signature => !prior.has(signature));

    let parentsWhosePhenotypeWasAlreadyVisible = 0;
    for (const phenotype of target.values()) if (prior.has(phenotype)) parentsWhosePhenotypeWasAlreadyVisible += 1;

    return {
        targetIndex,
        targetLabel: labels[targetIndex] ?? String(targetIndex),
        priorDistinctPhenotypes: prior.size,
        targetParents: target.size,
        targetDistinctPhenotypes: targetPhenotypes.size,
        alreadyVisiblePhenotypes: alreadyVisible.length,
        firstVisibleAtTargetPhenotypes: firstVisibleAtTarget.length,
        parentsWhosePhenotypeWasAlreadyVisible,
        parentsWithFirstVisiblePhenotype: target.size - parentsWhosePhenotypeWasAlreadyVisible,
        alreadyVisibleFraction: targetPhenotypes.size ? alreadyVisible.length / targetPhenotypes.size : null,
        note: 'Descriptive hindsight only. Earlier categorical visibility does not prove the later research conclusion was already justified.',
    };
}
