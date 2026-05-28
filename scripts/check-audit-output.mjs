import { readFile } from 'node:fs/promises';
import process from 'node:process';

const args = process.argv.slice(2);
let sources = [];

if (args.length > 0) {
  sources = await Promise.all(args.map(async (file) => ({ file, text: await readFile(file, 'utf8') })));
} else {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  sources = [{ file: 'stdin', text: Buffer.concat(chunks).toString('utf8') }];
}

const forbiddenPatterns = [
  /preExpansionAbort\.code\s*={1,3}\s*['"]unexpected-exception['"]/i,
  /preExpansionAbortCode\s*[:=]\s*['"]unexpected-exception['"]/i,
  /"preExpansionAbort"\s*:\s*\{[^}]*"code"\s*:\s*"unexpected-exception"/is
];

const validateSegment0AttemptTelemetry = (parsed, fileLabel) => {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.levels)) return 0;
  let telemetryViolations = 0;
  let attemptsChecked = 0;
  let nonZeroPruneSeen = false;
  for (const level of parsed.levels) {
    const attempts = Array.isArray(level?.attempts) ? level.attempts : [];
    for (const attempt of attempts) {
      attemptsChecked += 1;
      const nodesExpanded = Math.max(0, Number(attempt?.nodesExpanded) || 0);
      const pruneBreakdown = attempt?.pruneBreakdown;
      const memoHitRate = attempt?.memoHitRate;
      const dominanceHitRate = attempt?.dominanceHitRate;
      const nogoodHitRate = attempt?.nogoodHitRate;
      const counterIntegrityStatus = attempt?.counterIntegrityStatus;
      const statsProvenance = attempt?.statsProvenance;
      const pruneTotal = Math.max(0, Number(pruneBreakdown?.total) || 0);
      if (pruneTotal > 0) nonZeroPruneSeen = true;
      const hasRequiredTelemetry = pruneBreakdown && typeof pruneBreakdown === 'object'
        && Number.isFinite(memoHitRate)
        && Number.isFinite(dominanceHitRate)
        && Number.isFinite(nogoodHitRate)
        && counterIntegrityStatus && typeof counterIntegrityStatus === 'object'
        && statsProvenance && typeof statsProvenance === 'object';
      if (!hasRequiredTelemetry) {
        telemetryViolations += 1;
        console.error(`Segment-0 telemetry missing required fields in ${fileLabel} level=${level?.level ?? 'unknown'} attempt=${attempt?.label ?? 'unknown'}.`);
      }
      if (nodesExpanded > 0) {
        const generatedNodes = Math.max(0, Number(attempt?.counterIntegrityStatus?.generatedNodes) || 0);
        const hasNonTrivialSignal = pruneTotal > 0
          || generatedNodes > 0
          || Number(memoHitRate) > 0
          || Number(dominanceHitRate) > 0
          || Number(nogoodHitRate) > 0;
        if (!hasNonTrivialSignal) {
          telemetryViolations += 1;
          console.error(`Segment-0 invariant failed (nodesExpanded>0 without progress/prune signal) in ${fileLabel} level=${level?.level ?? 'unknown'} attempt=${attempt?.label ?? 'unknown'}.`);
        }
      }
    }
  }
  if (attemptsChecked > 0 && !nonZeroPruneSeen) {
    telemetryViolations += 1;
    console.error(`Segment-0 invariant failed in ${fileLabel}: no attempts contained non-zero pruneBreakdown.total.`);
  }
  return telemetryViolations;
};

let violations = 0;
for (const src of sources) {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(src.text)) {
      violations += 1;
      console.error(`Forbidden unexpected-exception preExpansionAbort detected in ${src.file}.`);
      break;
    }
  }
  try {
    const parsed = JSON.parse(src.text);
    violations += validateSegment0AttemptTelemetry(parsed, src.file);
  } catch {
    // Non-JSON sources (e.g. logs) are only checked with regex guards.
  }
}

if (violations > 0) process.exit(1);
console.log('Audit output check passed: no unexpected-exception preExpansionAbort entries and Segment-0 telemetry invariants satisfied.');
