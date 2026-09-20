export const INVESTIGATION_REPORT_STATUSES = Object.freeze([
  'active',
  'concluded-positive',
  'concluded-negative',
  'inconclusive',
  'superseded',
  'cancelled',
]);

export const RESEARCH_CLOSEOUT_SCHEMA = 'pathfinder.research-closeout/v1';

const singleLine = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  if (/\r|\n/u.test(value)) throw new Error(`${field} must be a single line`);
  return value.trim();
};

const optionalSingleLine = (value, field) => {
  if (value == null || value === '') return null;
  return singleLine(value, field);
};

const validateDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)
      || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error('lastEvidenceDate must be YYYY-MM-DD');
  }
  return value;
};

const normalizeStringList = (value, field) => {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array of strings`);
  return value.map((item, index) => singleLine(item, `${field}[${index}]`));
};

const assertKnownStatus = status => {
  if (!INVESTIGATION_REPORT_STATUSES.includes(status)) {
    throw new Error(`unknown report status ${JSON.stringify(status)}; expected one of ${INVESTIGATION_REPORT_STATUSES.join(', ')}`);
  }
  return status;
};

export function createResearchCloseoutCapsule({
  status,
  lastEvidenceDate,
  decision,
  remainingGate,
  researchQuestion = null,
  premiseRefs = [],
  measurementOpportunity = null,
  evidenceRole = null,
  populationIdentity = null,
  selection = null,
  inferenceScope = null,
  claimRefs = [],
  sourceArtifacts = [],
  expectation = null,
  surprise = null,
  anomaly = null,
} = {}) {
  return {
    schema: RESEARCH_CLOSEOUT_SCHEMA,
    status: assertKnownStatus(status),
    lastEvidenceDate: validateDate(lastEvidenceDate),
    decision: singleLine(decision, 'decision'),
    remainingGate: singleLine(remainingGate, 'remainingGate'),
    joins: {
      researchQuestion: optionalSingleLine(researchQuestion, 'researchQuestion'),
      premiseRefs: normalizeStringList(premiseRefs, 'premiseRefs'),
      measurementOpportunity: optionalSingleLine(measurementOpportunity, 'measurementOpportunity'),
    },
    evidenceRole: optionalSingleLine(evidenceRole, 'evidenceRole'),
    scope: {
      populationIdentity: optionalSingleLine(populationIdentity, 'populationIdentity'),
      selection: optionalSingleLine(selection, 'selection'),
      inferenceScope: optionalSingleLine(inferenceScope, 'inferenceScope'),
    },
    claimRefs: normalizeStringList(claimRefs, 'claimRefs'),
    sourceArtifacts: normalizeStringList(sourceArtifacts, 'sourceArtifacts'),
    prospective: {
      expectation: optionalSingleLine(expectation, 'expectation'),
      surprise: optionalSingleLine(surprise, 'surprise'),
      anomaly: optionalSingleLine(anomaly, 'anomaly'),
    },
  };
}

export function formatResearchCloseoutCapsule(input) {
  const capsule = createResearchCloseoutCapsule(input);
  return `<!-- research-closeout ${JSON.stringify(capsule)} -->`;
}

export function parseResearchCloseoutCapsule(markdown) {
  if (typeof markdown !== 'string') throw new Error('markdown must be a string');
  const matches = [...markdown.matchAll(/<!--\s*research-closeout\s+({[^\r\n]*})\s*-->/gu)];
  if (matches.length === 0) return null;
  if (matches.length > 1) throw new Error('report contains multiple research-closeout capsules');

  let parsed;
  try {
    parsed = JSON.parse(matches[0][1]);
  } catch (error) {
    throw new Error(`research-closeout capsule is not valid JSON: ${error.message}`);
  }
  if (parsed?.schema !== RESEARCH_CLOSEOUT_SCHEMA) {
    throw new Error(`unsupported research-closeout schema ${JSON.stringify(parsed?.schema)}`);
  }

  return createResearchCloseoutCapsule({
    status: parsed.status,
    lastEvidenceDate: parsed.lastEvidenceDate,
    decision: parsed.decision,
    remainingGate: parsed.remainingGate,
    researchQuestion: parsed.joins?.researchQuestion,
    premiseRefs: parsed.joins?.premiseRefs,
    measurementOpportunity: parsed.joins?.measurementOpportunity,
    evidenceRole: parsed.evidenceRole,
    populationIdentity: parsed.scope?.populationIdentity,
    selection: parsed.scope?.selection,
    inferenceScope: parsed.scope?.inferenceScope,
    claimRefs: parsed.claimRefs,
    sourceArtifacts: parsed.sourceArtifacts,
    expectation: parsed.prospective?.expectation,
    surprise: parsed.prospective?.surprise,
    anomaly: parsed.prospective?.anomaly,
  });
}

export function formatInvestigationReportStatusBlock({
  status,
  lastEvidenceDate,
  lastEvidenceSummary,
  decision,
  remainingGate,
} = {}) {
  assertKnownStatus(status);
  validateDate(lastEvidenceDate);
  const evidence = singleLine(lastEvidenceSummary, 'lastEvidenceSummary');
  const currentDecision = singleLine(decision, 'decision');
  const gate = singleLine(remainingGate, 'remainingGate');
  return [
    `> **Status:** ${status}`,
    `> **Last evidence:** ${lastEvidenceDate} — ${evidence}`,
    `> **Decision:** ${currentDecision}`,
    `> **Remaining gate:** ${gate}`,
  ].join('\n');
}
