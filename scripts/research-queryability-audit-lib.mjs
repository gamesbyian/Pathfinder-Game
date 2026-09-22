import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchQueryGraph } from './research-query-lib.mjs';
import { buildResearchQueryView } from './research-query-views-lib.mjs';

function loadBenchmarks(root) {
    const filename = path.join(root, 'docs/research-queryability-benchmarks.json');
    const parsed = JSON.parse(readFileSync(filename, 'utf8'));
    if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed.benchmarks)) {
        throw new Error('invalid research queryability benchmark registry');
    }
    return parsed;
}

function evaluateSupported(graph, benchmark) {
    const view = buildResearchQueryView(graph, {
        view: benchmark.kind,
        entity: benchmark.entity ?? '',
        minimum: benchmark.minimum ?? 2,
    });

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
            evaluation = evaluateSupported(graph, benchmark);
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
        results.push({
            id: benchmark.id,
            question: benchmark.question,
            expected: benchmark.expected,
            status: evaluation.failures.length ? 'failed' : 'passed',
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
                return {};
            })(),
        });
    }

    const passed = results.filter(row => row.status === 'passed').length;
    const failed = results.filter(row => row.status === 'failed').length;
    const knownGaps = results.filter(row => row.status === 'known-gap').length;
    return {
        schemaVersion: 1,
        benchmarkCount: results.length,
        passed,
        failed,
        knownGaps,
        results,
        graphDiagnostics: graph.diagnostics,
    };
}
