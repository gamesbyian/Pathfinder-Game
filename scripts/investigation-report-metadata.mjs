export const INVESTIGATION_REPORT_STATUSES = Object.freeze([
  'active',
  'concluded-positive',
  'concluded-negative',
  'inconclusive',
  'superseded',
  'cancelled',
]);

const singleLine = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a non-empty string`);
  if (/\r|\n/u.test(value)) throw new Error(`${field} must be a single line`);
  return value.trim();
};

export function formatInvestigationReportStatusBlock({
  status,
  lastEvidenceDate,
  lastEvidenceSummary,
  decision,
  remainingGate,
} = {}) {
  if (!INVESTIGATION_REPORT_STATUSES.includes(status)) {
    throw new Error(`unknown report status ${JSON.stringify(status)}; expected one of ${INVESTIGATION_REPORT_STATUSES.join(', ')}`);
  }
  if (typeof lastEvidenceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(lastEvidenceDate)
      || Number.isNaN(Date.parse(`${lastEvidenceDate}T00:00:00Z`))) {
    throw new Error('lastEvidenceDate must be YYYY-MM-DD');
  }
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
