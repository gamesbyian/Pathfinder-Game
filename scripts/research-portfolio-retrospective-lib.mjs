import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchRelations } from './research-relations-lib.mjs';
import { buildResearchSystemInventory } from './research-system-inventory-lib.mjs';

const REPORT_DATE = /(?:^|\/)(\d{4}-\d{2}-\d{2})-[^/]+\.md$/u;

const unique = values => [...new Set(values.filter(Boolean))].sort();

function dateOfRef(ref) {
  const match = REPORT_DATE.exec(String(ref ?? ''));
  return match?.[1] ?? null;
}

function inWindow(date, startDate, endDate) {
  return date != null && date >= startDate && date <= endDate;
}

function refsInWindow(question, startDate, endDate) {
  return unique([
    ...(question.answeredBy ?? []),
    ...(question.constrainedBy ?? []),
  ].filter(ref => inWindow(dateOfRef(ref), startDate, endDate)));
}

function classifyAnswerability(question) {
  const state = String(question.state ?? '');
  const reopen = String(question.reopensOn ?? '');
  const result = String(question.result ?? '');
  const text = `${reopen} ${result}`.toLowerCase();

  const evidenceDeficit = /(?:obtain|population|sample|rows|telemetry|evidence|dispatch|complete the frozen|prospective)/u.test(text);
  const measurementDeficit = /(?:measure|measurement|instrument|observer|telemetry|exact-action|distance|descriptor|signature|can be completed|construction)/u.test(text);
  const computeDeficit = /(?:dispatch|run|probe|sweep|compute|budget|canary)/u.test(text);
  const codeDeficit = /(?:implement|implementation|constructor|producer|instrumentation|observer)/u.test(text);
  const conceptDeficit = /(?:ontology|representation|semantic|interface contract|missing primitive|grammar)/u.test(text);

  let disposition = 'answerable-or-concluded';
  if (state === 'deferred-reopen') {
    // Prefer the concrete reopen path over broad conceptual vocabulary. A question
    // that mentions semantic/representation concerns but already names the missing
    // population or measurement is operationally blocked by that acquisition seam.
    if (measurementDeficit) disposition = 'measurement-blocked';
    else if (evidenceDeficit) disposition = 'evidence/population-blocked';
    else if (conceptDeficit) disposition = 'concept-or-representation-blocked';
    else disposition = 'condition-blocked';
  }

  return {
    disposition,
    evidenceDeficit,
    measurementDeficit,
    computeDeficit,
    codeDeficit,
    conceptDeficit,
    reopenConditionPresent: Boolean(reopen.trim()),
  };
}

function proposalProvenance(question) {
  const triggers = unique(question.triggeredBy ?? []);
  const constraints = unique(question.constrainedBy ?? []);
  const aliases = unique(question.aliases ?? []);
  return {
    triggers,
    constraints,
    aliases,
    explicitTrigger: triggers.length > 0,
    explicitConstraintSources: constraints.length,
    candidateSetVisible: /(?:which|or |versus|candidate|discriminator|alternative)/iu.test(String(question.question ?? ''))
      || /(?:candidate|alternative|route|discriminator)/iu.test(String(question.result ?? '')),
  };
}

function negativeIntersection(questions) {
  const negatives = questions.filter(question => String(question.state) === 'concluded-negative');
  const dimensions = [
    ['premiseRef', question => question.premiseRefs ?? []],
    ['measurementOpportunity', question => question.measurementOpportunities ?? []],
    ['constraint', question => question.constrainedBy ?? []],
    ['trigger', question => question.triggeredBy ?? []],
  ];
  const intersections = [];
  for (const [dimension, values] of dimensions) {
    const owners = new Map();
    for (const question of negatives) {
      for (const value of unique(values(question))) {
        const rows = owners.get(value) ?? [];
        rows.push(question.id);
        owners.set(value, rows);
      }
    }
    for (const [value, questionIds] of owners) {
      if (questionIds.length < 2) continue;
      intersections.push({ dimension, value, questionIds: questionIds.sort(), count: questionIds.length });
    }
  }
  return intersections.sort((a, b) => b.count - a.count || a.dimension.localeCompare(b.dimension) || a.value.localeCompare(b.value));
}

function dependencySignals(inventory) {
  return inventory.sharedImplementationDependencies
    .slice(0, 25)
    .map(row => ({
      dependency: row.dependency,
      consumerCount: row.consumerCount,
      consumers: row.consumers,
      contractFunctions: row.contractFunctions,
    }));
}

export function buildResearchPortfolioRetrospective(root = process.cwd(), {
  startDate = '2026-09-12',
  endDate = '2026-09-19',
} = {}) {
  const model = buildResearchRelations(root, { discoverArtifacts: true });
  const inventory = buildResearchSystemInventory(root);
  const questions = model.relations.questions ?? [];
  const opportunities = model.relations.measurementOpportunities ?? [];
  const opportunityById = new Map(opportunities.map(row => [String(row.id), row]));

  const windowQuestions = questions.filter(question => refsInWindow(question, startDate, endDate).length > 0);
  const questionRows = windowQuestions.map(question => {
    const refs = refsInWindow(question, startDate, endDate);
    const answerability = classifyAnswerability(question);
    const provenance = proposalProvenance(question);
    const mos = unique(question.measurementOpportunities ?? []);
    return {
      id: question.id,
      owner: question.owner ?? null,
      state: question.state ?? null,
      question: question.question ?? null,
      evidenceRefs: refs,
      premiseRefs: unique(question.premiseRefs ?? []),
      measurementOpportunities: mos,
      measurementOpportunityStatus: mos.map(id => ({
        id,
        status: opportunityById.get(String(id))?.status ?? 'unknown',
      })),
      answerability,
      proposalProvenance: provenance,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  const moUse = opportunities.map(opportunity => ({
    id: opportunity.id,
    name: opportunity.name,
    status: opportunity.status,
    windowQuestionIds: questionRows.filter(row => row.measurementOpportunities.includes(opportunity.id)).map(row => row.id),
  })).sort((a, b) => b.windowQuestionIds.length - a.windowQuestionIds.length || a.id.localeCompare(b.id));

  const answerabilityCounts = Object.fromEntries(unique(questionRows.map(row => row.answerability.disposition))
    .map(disposition => [disposition, questionRows.filter(row => row.answerability.disposition === disposition).length]));

  const provenanceCounts = {
    explicitTrigger: questionRows.filter(row => row.proposalProvenance.explicitTrigger).length,
    candidateSetVisible: questionRows.filter(row => row.proposalProvenance.candidateSetVisible).length,
    neitherTriggerNorCandidateSet: questionRows.filter(row =>
      !row.proposalProvenance.explicitTrigger && !row.proposalProvenance.candidateSetVisible).length,
  };

  const instrumentShapingSignals = {
    questionsWithMeasurementOpportunity: questionRows.filter(row => row.measurementOpportunities.length > 0).length,
    questionsWithoutMeasurementOpportunity: questionRows.filter(row => row.measurementOpportunities.length === 0).length,
    uniqueMeasurementOpportunitiesUsed: moUse.filter(row => row.windowQuestionIds.length > 0).length,
    underExplicitOpportunitiesUsed: moUse.filter(row =>
      row.windowQuestionIds.length > 0 && /under-explicit/u.test(String(row.status))).map(row => row.id),
  };

  const capabilityGaps = questionRows
    .filter(row => row.answerability.disposition !== 'answerable-or-concluded')
    .map(row => ({
      questionId: row.id,
      disposition: row.answerability.disposition,
      needsEvidenceOrPopulation: row.answerability.evidenceDeficit,
      needsMeasurement: row.answerability.measurementDeficit,
      needsCompute: row.answerability.computeDeficit,
      needsCode: row.answerability.codeDeficit,
      needsConceptOrRepresentation: row.answerability.conceptDeficit,
    }));

  const negativeIntersections = negativeIntersection(windowQuestions);

  const explorationTriggers = [];
  if (provenanceCounts.neitherTriggerNorCandidateSet > 0) {
    explorationTriggers.push({
      kind: 'candidate-provenance-gap',
      detail: `${provenanceCounts.neitherTriggerNorCandidateSet} recent questions expose neither an explicit trigger nor a visible candidate set`,
    });
  }
  if (instrumentShapingSignals.uniqueMeasurementOpportunitiesUsed <= 2 && questionRows.length >= 6) {
    explorationTriggers.push({
      kind: 'measurement-concentration',
      detail: `${instrumentShapingSignals.uniqueMeasurementOpportunitiesUsed} MOs cover ${questionRows.length} recent questions`,
    });
  }
  if (capabilityGaps.filter(row => row.needsConceptOrRepresentation).length > 0) {
    explorationTriggers.push({
      kind: 'ontology-or-representation-block',
      detail: `${capabilityGaps.filter(row => row.needsConceptOrRepresentation).length} recent questions appear concept/representation blocked`,
    });
  }
  if (negativeIntersections.length > 0) {
    explorationTriggers.push({
      kind: 'shared-negative-assumption',
      detail: `${negativeIntersections.length} repeated negative-result intersections merit interpretation before reopening forms`,
    });
  }

  return {
    schemaVersion: 1,
    kind: 'pathfinder-research-portfolio-retrospective',
    frozenWindow: { startDate, endDate, basis: 'dated report references retained by current question relations' },
    authority: {
      questions: 'docs/solver-research-question-relations.json',
      measurementOpportunities: 'docs/solver-premise-map-measurement-opportunities.json',
      priority: 'docs/solver-optimization-workstreams.md',
      derivedInventory: 'scripts/research-system-inventory-lib.mjs',
    },
    counts: {
      windowQuestions: questionRows.length,
      answerability: answerabilityCounts,
      proposalProvenance: provenanceCounts,
      instrumentShaping: instrumentShapingSignals,
    },
    questions: questionRows,
    measurementOpportunityUse: moUse,
    capabilityGaps,
    negativeIntersections,
    sharedImplementationDependencies: dependencySignals(inventory),
    explorationTriggers,
    interpretationLimits: [
      'Question relations are the unit of this retrospective, not individual commits, agent sessions, or researcher-hours.',
      'Dated report references approximate recent research attention; they do not measure effort or productivity.',
      'Keyword-based answerability decomposition is a transparent screening heuristic and must not replace the owning question/reopen semantics.',
      'Measurement-opportunity association can reveal instrumentation concentration but cannot prove that instruments caused the agenda.',
      'Shared negative intersections nominate common assumptions for review; they do not reopen closed tested forms by themselves.',
    ],
  };
}
