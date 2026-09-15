/**
 * Compact projection of the resolved B2 exact-prefix labels recorded in the original result
 * authority. Every consumer shares this projection and verifies it against the report tables.
 */
export const CLASS5_B2_EXACT_LABEL_PROJECTION = Object.freeze({
  schemaVersion: 1,
  authorityReport: 'reports/2026-08-12-b2-extinction-adjacent-cpsat-labels.md',
  sourceRunId: '31858783552',
  sourceWorkflow: 'cpsat-explicit-prefix-oracle.yml',
  sourceCommitAsRecorded: '4efc2d1',
  exactLabelledPrefixes: 28,
});

const labels = new Map(Object.entries({
  S00001: { 'top-rank1': 'dead', 'witness-culled': 'live' },
  S00028: { 'top-rank1': 'live', 'witness-culled': 'live' },
  S00030: { 'top-rank1': 'dead', 'witness-culled': 'live', 'cutoff-survivor': 'live' },
  S00035: { 'witness-culled': 'live' },
  S00048: { 'top-rank1': 'dead', 'witness-culled': 'live', 'cutoff-survivor': 'live' },
  S00095: { 'top-rank1': 'live', 'witness-culled': 'live' },
  S00099: { 'witness-culled': 'live' },
  S00108: { 'top-rank1': 'live', 'witness-culled': 'live' },
  S00120: { 'top-rank1': 'live', 'witness-culled': 'live' },
  S00140: { 'top-rank1': 'live', 'witness-culled': 'live' },
  R00058: { 'top-rank1': 'live', 'witness-culled': 'live' },
  R00060: { 'top-rank1': 'live', 'witness-culled': 'live' },
  R00064: { 'top-rank1': 'live', 'witness-culled': 'live' },
  R00104: { 'top-rank1': 'dead', 'witness-culled': 'live' },
}));

export function class5B2ExactLabel(levelId, role) {
  return labels.get(levelId)?.[role] ?? null;
}

export function class5B2ExactLabelCount() {
  return [...labels.values()].reduce((sum, byRole) => sum + Object.keys(byRole).length, 0);
}

/** Mechanically reject projection drift from the authority's original + superseding tables. */
export function verifyClass5B2ExactLabelProjection(authorityMarkdown) {
  const resolved = new Map();
  for (const line of authorityMarkdown.split(/\r?\n/u)) {
    if (!/^\| [SR]\d{5} \|/u.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim().replaceAll('**', ''));
    const [levelId] = cells;
    const offset = cells.length === 7 ? 4 : 2;
    for (const [role, index] of [['top-rank1', offset], ['witness-culled', offset + 1], ['cutoff-survivor', offset + 2]]) {
      const match = cells[index]?.match(/^(live|dead)\b/iu);
      if (match) resolved.set(`${levelId}|${role}`, match[1].toLowerCase());
    }
  }
  const mismatches = [];
  for (const [levelId, byRole] of labels) for (const [role, label] of Object.entries(byRole)) {
    if (resolved.get(`${levelId}|${role}`) !== label) mismatches.push(`${levelId}:${role}`);
  }
  if (mismatches.length || resolved.size !== class5B2ExactLabelCount()) {
    throw new Error(`B2 exact-label projection disagrees with authority: ${mismatches.join(', ') || `authority=${resolved.size}, projection=${class5B2ExactLabelCount()}`}`);
  }
}
