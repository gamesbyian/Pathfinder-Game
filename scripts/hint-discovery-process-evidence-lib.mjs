/**
 * Build a sibling evidence document linking exact-path hint discoveries to an immutable experiment
 * envelope without expanding the persisted Hint schema.
 *
 * The owning experiment contract remains authoritative for protocol/configuration/population
 * semantics. This document carries only the small identity projection needed to join later.
 */
import { decisionContractIssues, stableHash } from './solver-experiment-contract.mjs';

export const HINT_DISCOVERY_PROCESS_EVIDENCE_KIND = 'pathfinder-hint-discovery-process-evidence';
export const HINT_DISCOVERY_PROCESS_EVIDENCE_SCHEMA_VERSION = 1;

function nonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function resolvedSolverRef(contract, arm) {
    if (arm != null) return contract?.experiment?.arms?.[arm]?.resolvedSha ?? null;
    return contract?.experiment?.resolvedSha ?? null;
}

export function discoveryProcessEnvelopeFromContract(contract, {
    runId,
    contractRef = null,
    arm = null,
} = {}) {
    const issues = decisionContractIssues(contract);
    if (issues.length) {
        throw new Error(`experiment contract is not decision-grade: ${issues.join(', ')}`);
    }
    if (!nonEmpty(runId)) throw new Error('runId is required');
    if (arm != null && !contract?.experiment?.arms?.[arm]) {
        throw new Error(`unknown experiment arm: ${arm}`);
    }

    const solverRef = resolvedSolverRef(contract, arm);
    if (!nonEmpty(solverRef)) {
        throw new Error('experiment contract does not resolve one immutable solver ref for this evidence document');
    }

    return {
        runId,
        contractRef: contractRef ?? null,
        arm,
        workflowFamily: contract.experiment.workflowFamily,
        producer: contract.experiment.producer,
        entrypoint: contract.experiment.entrypoint,
        protocolHash: contract.experiment.configurationHash,
        configurationHash: contract.experiment.configurationHash,
        solverRef,
        populationIdentity: contract.population.identityHash,
        independentUnit: contract.population.independentUnit ?? null,
        corpusIdentity: contract.population.corpusIdentity ?? null,
        levelBlind: contract.execution.levelBlind,
        historyAware: contract.execution.historyAware,
        schedulerMode: contract.execution.schedulerMode,
        researchBlock: contract.population.researchBlock ?? null,
    };
}

export function buildHintDiscoveryProcessEvidence(joinResult, {
    sourceReport,
    levels,
    contract,
    runId,
    contractRef = null,
    arm = null,
} = {}) {
    if (!joinResult || !Array.isArray(joinResult.joined) || !joinResult.summary) {
        throw new Error('joinResult must come from joinSolvedRowsToHintDiscoveryProcesses');
    }
    if (!nonEmpty(sourceReport)) throw new Error('sourceReport is required');
    if (!nonEmpty(levels)) throw new Error('levels is required');

    const run = discoveryProcessEnvelopeFromContract(contract, { runId, contractRef, arm });
    const records = joinResult.joined.map(item => ({
        evidenceId: stableHash({
            runId: run.runId,
            protocolHash: run.protocolHash,
            solverRef: run.solverRef,
            parentId: item.parentId,
            solutionSignature: item.solutionSignature,
            rowIndex: item.rowIndex,
        }),
        parentId: item.parentId,
        solutionSignature: item.solutionSignature,
        matchingHintIndices: item.matchingHintIndices,
        exactHintMatchCount: item.exactHintMatchCount,
        sourceRowIndex: item.rowIndex,
        process: item.process,
    }));

    return {
        schemaVersion: HINT_DISCOVERY_PROCESS_EVIDENCE_SCHEMA_VERSION,
        kind: HINT_DISCOVERY_PROCESS_EVIDENCE_KIND,
        sourceReport,
        levels,
        run,
        semantics: {
            binding: 'exact complete solution path equality',
            experimentAuthority: 'run identity projection references the owning experiment contract; this document does not redefine protocol semantics',
            hintPersistence: 'stored Hint provenance remains unchanged',
            process: 'attempt sequence through the first successful attempt; later attempts excluded',
            unmatched: 'no exact stored hint match means unavailable join evidence, not a negative discovery claim',
            independentUnit: run.independentUnit ?? 'parent level unless owning contract declares otherwise',
        },
        summary: {
            ...joinResult.summary,
            evidenceRecords: records.length,
            unmatchedRowsRetainedAsCountOnly: joinResult.unmatched?.length ?? 0,
        },
        records,
    };
}

export function validateHintDiscoveryProcessEvidence(document) {
    const issues = [];
    if (!document || typeof document !== 'object' || Array.isArray(document)) issues.push('document');
    else {
        if (document.schemaVersion !== HINT_DISCOVERY_PROCESS_EVIDENCE_SCHEMA_VERSION) issues.push('schemaVersion');
        if (document.kind !== HINT_DISCOVERY_PROCESS_EVIDENCE_KIND) issues.push('kind');
        if (!nonEmpty(document.sourceReport)) issues.push('sourceReport');
        if (!nonEmpty(document.levels)) issues.push('levels');
        for (const field of ['runId', 'protocolHash', 'configurationHash', 'solverRef', 'populationIdentity']) {
            if (!nonEmpty(document?.run?.[field])) issues.push(`run.${field}`);
        }
        if (!Array.isArray(document.records)) issues.push('records');
        else for (const [index, record] of document.records.entries()) {
            if (!nonEmpty(record?.evidenceId)) issues.push(`records[${index}].evidenceId`);
            if (record?.parentId == null) issues.push(`records[${index}].parentId`);
            if (!nonEmpty(record?.solutionSignature)) issues.push(`records[${index}].solutionSignature`);
            if (!record?.process || typeof record.process !== 'object') issues.push(`records[${index}].process`);
        }
    }
    if (issues.length) throw new Error(`invalid hint discovery process evidence: ${issues.join(', ')}`);
    return document;
}
