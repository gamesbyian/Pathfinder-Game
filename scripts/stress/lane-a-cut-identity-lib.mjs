/**
 * Current Lane A C0 rows/cases must carry structured source.cutSignature.
 * Only explicitly historical callers may recover the signature from the pre-transport case-id
 * convention `${cutSignature}::${originalCaseId}`.
 */

export function historicalLaneACutSignatureFromCaseId(caseId) {
  const value = String(caseId ?? '');
  const marker = value.indexOf('::');
  if (marker <= 0) throw new Error(`historical Lane-A case id has no cut-signature delimiter: ${value}`);
  return value.slice(0, marker);
}

export function laneACutSignature(row, frozenCase, { allowHistoricalCaseId = false } = {}) {
  const structured = row?.source?.cutSignature ?? frozenCase?.source?.cutSignature;
  if (typeof structured === 'string' && structured) return structured;
  if (!allowHistoricalCaseId) {
    throw new Error('Lane-A row has no structured source.cutSignature; historical case-id decoding is disabled');
  }
  return historicalLaneACutSignatureFromCaseId(row?.caseId ?? row?.id);
}
