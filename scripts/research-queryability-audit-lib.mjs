import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchQueryGraph } from './research-query-lib.mjs';
import { buildResearchQueryView } from './research-query-views-lib.mjs';
import { buildResearchQuerySnapshot, diffResearchQuerySnapshots } from './research-query-snapshot-lib.mjs';
import { buildResearchSystemFindingIndex } from './research-system-query-lib.mjs';

function loadBenchmarks(root) {
    const filename = path.join(root, 'docs/research-queryability-benchmarks.json');
    const parsed = JSON.parse(readFileSync(filename, 'utf8'));
    if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.benchmarks)) {
        throw new Error('invalid research queryability benchmark registry');
    }
    return parsed;
}

function evaluateSupported(graph, benchmark, root) {
    let view;
    if (benchmark.kind === 'temporal-change') {
        const snapshot = buildResearchQuerySnapshot(graph);
        view = diffResearchQuerySnapshots(snapshot, snapshot);
    } else if (benchmark.kind === 'system-findings') {
        view = buildResearchSystemFindingIndex(root);
    } else if (benchmark.kind === 'system-lineage') {
        view = {
            systemFindings: buildResearchSystemFindingIndex(root),
            reportLineage: buildResearchQueryView(graph, { view: 'non-question-lineage' }),
        };
    } else {
        view = buildResearchQueryView(graph, {
            view: benchmark.kind,
            entity: benchmark.entity ?? '',
            minimum: benchmark.minimum ?? 2,
        });
    }

    const failures = [];
    if (benchmark.mustIncludeQuestion) {
        const rows = view.impactedQuestions ?? [];
        if (!rows.some(row => row.questionId === benchmark.mustIncludeQuestion)) {
            failures.push('missing required question ' + benchmark.mustIncludeQuestion);
        }
    }
    if (benchmark.mustIncludeMeasurement) {
        const rows = view.rows ?? [];
        if (!rows.some(row => row.measurementOpportunityId === benchmark.mustIncludeMeasurement)) {
            failures.push('missing required measurement opportunity ' + benchmark.mustIncludeMeasurement);
        }
    }
    if (benchmark.requireZeroUnresolvedEdges && (view.unresolvedEdges?.length ?? 0) !== 0) {
        failures.push('unresolved authored graph edges remain');
    }
    if (benchmark.requireFullyClassified) {
        const unclassified = view.unclassified ?? view.structuredGateCoverage?.unclassified ?? null;
        if (unclassified !== null && (Array.isArray(unclassified) ? unclassified.length : unclassified) !== 0) {
            failures.push('one or more canonical workstream gates are unclassified');
        }
    }
    if (benchmark.requireNonEmpty) {
        const count = view.count ?? view.rows?.length ?? view.findings?.length ?? 0;
        if (count === 0) failures.push('expected a non-empty result');
    }
    if (benchmark.mustIncludeSupport) {
        const match = (view.rows ?? []).find(row =>
            row.questionId === benchmark.mustIncludeSupport.questionId
            && row.disposition === benchmark.mustIncludeSupport.disposition);
        if (!match) {
            failures.push('missing required support impact '
                + benchmark.mustIncludeSupport.questionId + ':'
                + benchmark.mustIncludeSupport.disposition);
        }
    }

    return { view, failures };
}

export function runResearchQueryabilityAudit(root = process.cwd(), { discoverArtifacts = false } = {}) {
    const registry = loadBenchmarks(root);
    const graph = buildResearchQueryGraph(root, { discoverArtifacts });
    const results = [];

    for (const benchmark of registry.benchmarks) {
        if (benchmark.expected === 'known-gap') {
            results.push({
                id: benchmark.id,
                question: benchmark.question,
                expected: benchmark.expected,
                status: 'known-gap',
                gap: benchmark.gap,
            });
            continue;
        }
        let evaluation;
        try {
            evaluation = evaluateSupported(graph, benchmark, root);
        } catch (error) {
            results.push({
                id: benchmark.id,
                question: benchmark.question,
                expected: benchmark.expected,
                status: 'failed',
                failures: [String(error?.message ?? error)],
            });
            continue;
        }
        const supportedStatus = benchmark.expected === 'partial'
            ? 'partial'
            : benchmark.expected === 'conditional' ? 'conditional' : 'passed';
        results.push({
            id: benchmark.id,
            question: benchmark.question,
            expected: benchmark.expected,
            status: evaluation.failures.length ? 'failed' : supportedStatus,
            gap: benchmark.gap ?? null,
            failures: evaluation.failures,
            summary: (() => {
                const view = evaluation.view;
                if (benchmark.kind === 'answerability') return {
                    noSolverCompute: view.noSolverCompute.length,
                    boundedCompute: view.boundedCompute.length,
                    dormantOrConditional: view.dormantOrConditional.length,
                    unclassified: view.unclassified.length,
                };
                if (Array.isArray(view.rows)) return { rows: view.rows.length };
                if (Array.isArray(view.impactedQuestions)) return { impactedQuestions: view.impactedQuestions.length };
                if (benchmark.kind === 'ownership-gaps') return {
                    capabilityDemandsWithoutQuestion: view.capabilityDemandsWithoutQuestion.length,
                    experimentsWithoutStableQuestionRef: view.experimentsWithoutStableQuestionRef.length,
                    evidenceWithoutQuestionRef: view.evidenceWithoutQuestionRef.length,
                    queueWithoutQuestionRef: view.queueWithoutQuestionRef.length,
                    acquisitionNeedLexicalFallbackQuestions: view.acquisitionNeedLexicalFallbackQuestions.length,
                };
                if (benchmark.kind === 'coverage') return {
                    unresolvedEdges: view.unresolvedEdges.length,
                    gateUnclassified: view.structuredGateCoverage.unclassified,
                };
                if (benchmark.kind === 'system-findings') return { findings: view.count };
                if (benchmark.kind === 'system-lineage') return {
                    findings: view.systemFindings.count,
                    reportLineageRows: view.reportLineage.rows.length,
                };
                if (benchmark.kind === 'temporal-change') return {
                    addedNodes: view.addedNodes.length,
                    gateChanges: view.gateChanges.length,
                };
                return {};
            })(),
        });
    }

    const passed = results.filter(row => row.status === 'passed').length;
    const partial = results.filter(row => row.status === 'partial').length;
    const conditional = results.filter(row => row.status === 'conditional').length;
    const failed = results.filter(row => row.status === 'failed').length;
    const knownGaps = results.filter(row => row.status === 'known-gap').length;
    return {
        schemaVersion: 1,
        benchmarkCount: results.length,
        passed,
        partial,
        conditional,
        failed,
        knownGaps,
        results,
        graphDiagnostics: graph.diagnostics,
    };
}
