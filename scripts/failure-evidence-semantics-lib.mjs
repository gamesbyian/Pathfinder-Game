import { RESEARCH_EVIDENCE_APPLICABILITY } from './research-evidence-applicability-lib.mjs';

/**
 * Query-dependent evidence semantics for compact failure-response records.
 *
 * This mirrors the useful epistemic shape of hint provenance without inventing a second failure
 * taxonomy. Applicability answers "may this observation support this stated research purpose?"
 * It does not rewrite the row, assign a causal F-class, or alter Resource Contract authority.
 */

export const FAILURE_EVIDENCE_PURPOSES = Object.freeze([
    'forensic',
    'mechanism-nomination',
    'longitudinal-process',
    'population-prevalence',
]);

export const FAILURE_EVIDENCE_APPLICABILITY = RESEARCH_EVIDENCE_APPLICABILITY;

function nonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function parentIdentity(row) {
    return row?.parentId ?? row?.levelId ?? row?.identity ?? null;
}

function protocolOf(document, row) {
    return row?.protocolHash ?? document?.protocolHash ?? null;
}

function solverRefOf(document, row) {
    return row?.solverRef ?? document?.solverRef ?? null;
}

function substantiveOutcome(row) {
    return !['malformed', 'missing', 'harnessError'].includes(String(row?.outcome ?? 'unknown'));
}

/**
 * Conservative support-counting stratum. Compact failure rows from repeated runs/attempts on the
 * same parent are repeated measures, not independent parents. Callers may count richer repeated
 * measures separately, but must not turn them into extra independent support.
 */
export function failureEvidenceDependencyStratum(document, row) {
    const populationIdentity = document?.populationIntegrity?.populationIdentityHash
        ?? document?.populationIdentityHash
        ?? null;
    const parent = parentIdentity(row);
    if (parent != null && String(parent).length) {
        return populationIdentity
            ? `population:${String(populationIdentity)}:parent:${String(parent)}`
            : `parent:${String(parent)}`;
    }
    if (row?.identity != null && String(row.identity).length) return `record:${String(row.identity)}`;
    return 'unattributed-record';
}

export function classifyFailureEvidenceApplicability(document, row, purpose, {
    comparableProtocolHashes = [],
    comparableSolverRefs = [],
    populationSamplingDeclared = false,
} = {}) {
    if (!FAILURE_EVIDENCE_PURPOSES.includes(purpose)) {
        throw new Error(`unknown failure evidence purpose: ${purpose}`);
    }
    if (!row || typeof row !== 'object') {
        return { applicability: 'inadmissible', reason: 'missing-record' };
    }
    if (parentIdentity(row) == null) {
        return { applicability: 'inadmissible', reason: 'missing-parent-identity' };
    }

    if (purpose === 'forensic') {
        return { applicability: 'admissible', reason: 'recorded-execution-observation' };
    }

    if (purpose === 'mechanism-nomination') {
        if (!substantiveOutcome(row)) {
            return { applicability: 'inadmissible', reason: 'infrastructure-or-malformed-outcome' };
        }
        if (row.outcome === 'deadlineTruncated') {
            return { applicability: 'context-bound', reason: 'censored-terminal-outcome' };
        }
        if (row.outcome === 'unknown') {
            return { applicability: 'context-bound', reason: 'unknown-terminal-outcome' };
        }
        const hasProcessContext = nonEmpty(row?.actionKey)
            || nonEmpty(row?.stageId)
            || (Array.isArray(row?.attempts) && row.attempts.length > 0);
        return hasProcessContext
            ? { applicability: 'admissible', reason: 'parent-bound-process-observation' }
            : { applicability: 'context-bound', reason: 'terminal-outcome-without-process-context' };
    }

    const protocolHash = protocolOf(document, row);
    const solverRef = solverRefOf(document, row);

    if (purpose === 'longitudinal-process') {
        if (!nonEmpty(row?.runId) || !nonEmpty(protocolHash) || !nonEmpty(solverRef)) {
            return { applicability: 'context-bound', reason: 'missing-run-protocol-or-solver-identity' };
        }
        if (!comparableProtocolHashes.length || !comparableSolverRefs.length) {
            return { applicability: 'context-bound', reason: 'comparison-regime-not-specified' };
        }
        if (!comparableProtocolHashes.includes(protocolHash) || !comparableSolverRefs.includes(solverRef)) {
            return { applicability: 'context-bound', reason: 'different-protocol-or-solver-regime' };
        }
        return { applicability: 'admissible', reason: 'matching-comparable-run-regime' };
    }

    const integrity = document?.populationIntegrity;
    if (!populationSamplingDeclared) {
        return { applicability: 'context-bound', reason: 'population-sampling-design-not-declared' };
    }
    if (!integrity || integrity.coverageComplete !== true) {
        return { applicability: 'context-bound', reason: 'population-coverage-not-established' };
    }
    if (integrity.decisionValidComplete !== true) {
        return { applicability: 'context-bound', reason: 'population-includes-censored-or-indeterminate-outcomes' };
    }
    if (!nonEmpty(protocolHash) || !nonEmpty(solverRef)) {
        return { applicability: 'context-bound', reason: 'missing-protocol-or-solver-identity' };
    }
    if (['unknown', 'malformed', 'missing', 'harnessError', 'deadlineTruncated'].includes(row.outcome)) {
        return { applicability: 'inadmissible', reason: 'non-interpretable-population-outcome' };
    }
    return { applicability: 'admissible', reason: 'declared-complete-parent-population' };
}

export function summarizeFailureEvidenceApplicability(document, purpose, options = {}) {
    const counts = Object.fromEntries(FAILURE_EVIDENCE_APPLICABILITY.map(value => [value, 0]));
    const reasons = new Map();
    const admissibleStrata = new Set();
    let admissibleRecords = 0;

    for (const row of document?.records ?? []) {
        const classification = classifyFailureEvidenceApplicability(document, row, purpose, options);
        counts[classification.applicability] += 1;
        reasons.set(classification.reason, (reasons.get(classification.reason) ?? 0) + 1);
        if (classification.applicability === 'admissible') {
            admissibleRecords += 1;
            admissibleStrata.add(failureEvidenceDependencyStratum(document, row));
        }
    }

    return {
        purpose,
        records: document?.records?.length ?? 0,
        applicabilityCounts: counts,
        admissibleRecords,
        independentSupportStrata: admissibleStrata.size,
        rawAdmissibleRecordsPerStratum: admissibleStrata.size
            ? admissibleRecords / admissibleStrata.size
            : null,
        reasons: Object.fromEntries([...reasons.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    };
}
