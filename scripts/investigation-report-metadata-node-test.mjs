import assert from 'node:assert/strict';

import {
  INVESTIGATION_REPORT_STATUSES,
  formatInvestigationReportStatusBlock,
} from './investigation-report-metadata.mjs';

for (const status of INVESTIGATION_REPORT_STATUSES) {
  const block = formatInvestigationReportStatusBlock({
    status,
    lastEvidenceDate: '2026-09-19',
    lastEvidenceSummary: 'fixture evidence',
    decision: 'fixture decision',
    remainingGate: 'none',
  });
  assert.match(block, new RegExp(`^> \\*\\*Status:\\*\\* ${status}$`, 'm'));
  assert.match(block, /^> **Last evidence:** 2026-09-19 — fixture evidence$/m);
}
assert.throws(() => formatInvestigationReportStatusBlock({
  status: 'basically done',
  lastEvidenceDate: '2026-09-19',
  lastEvidenceSummary: 'fixture',
  decision: 'fixture',
  remainingGate: 'none',
}), /unknown report status/);
assert.throws(() => formatInvestigationReportStatusBlock({
  status: 'active',
  lastEvidenceDate: '2026/09/19',
  lastEvidenceSummary: 'fixture',
  decision: 'fixture',
  remainingGate: 'none',
}), /YYYY-MM-DD/);
assert.throws(() => formatInvestigationReportStatusBlock({
  status: 'active',
  lastEvidenceDate: '2026-09-19',
  lastEvidenceSummary: 'line one\nline two',
  decision: 'fixture',
  remainingGate: 'none',
}), /single line/);

console.log('investigation report metadata constructor tests passed');
