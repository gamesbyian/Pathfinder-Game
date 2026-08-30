import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const HISTORY_MAX_BYTES = Number(process.env.AUDIT_HISTORY_MAX_BYTES || 95 * 1024 * 1024);
const HISTORY_MAX_ENTRIES = Number(process.env.AUDIT_HISTORY_MAX_ENTRIES || 4000);

const _trimHistoryEntries = (entries) => {
  const normalized = entries.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
  const cappedByCount = normalized.slice(-Math.max(1, HISTORY_MAX_ENTRIES));

  let kept = [];
  let totalBytes = 0;
  for (let i = cappedByCount.length - 1; i >= 0; i -= 1) {
    const line = cappedByCount[i];
    const lineBytes = Buffer.byteLength(`${line}
`, 'utf8');
    if (kept.length > 0 && totalBytes + lineBytes > HISTORY_MAX_BYTES) break;
    if (kept.length === 0 && lineBytes > HISTORY_MAX_BYTES) {
      kept = [line];
      break;
    }
    kept.push(line);
    totalBytes += lineBytes;
  }
  return kept.reverse();
};

const utcStamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveLevelNumber = (row, index) =>
  toFiniteNumber(row?.levelNumber) ??
  toFiniteNumber(row?.level) ??
  toFiniteNumber(row?.id) ??
  index + 1;

const toCausalityShape = (attempt = {}) => {
  const causality = attempt?.causality && typeof attempt.causality === 'object' ? attempt.causality : {};
  return {
    obligationReductionSlope: Number.isFinite(causality?.obligationReductionSlope) ? causality.obligationReductionSlope : 0,
    frontierDiversityDelta: Number.isFinite(causality?.frontierDiversityDelta) ? causality.frontierDiversityDelta : 0,
    repeatedStateRatio: Number.isFinite(causality?.repeatedStateRatio) ? causality.repeatedStateRatio : 0,
    portalCommitmentChurn: Number.isFinite(causality?.portalCommitmentChurn) ? causality.portalCommitmentChurn : 0,
    intersectionScheduleProgress: Number.isFinite(causality?.intersectionScheduleProgress) ? causality.intersectionScheduleProgress : 0
  };
};

const average = (values = []) => {
  const finite = values.filter((v) => Number.isFinite(v));
  if (!finite.length) return 0;
  return finite.reduce((sum, v) => sum + v, 0) / finite.length;
};

const deriveLevelFailureSignature = (levelRow = {}) => {
  const attempts = Array.isArray(levelRow?.attempts) ? levelRow.attempts : [];
  const causalityRows = attempts.map(toCausalityShape);
  const failedAttempts = attempts.filter((attempt) => `${attempt?.status || ''}` !== 'success').length;
  const hardFailure = `${levelRow?.finalStatus || levelRow?.status || ''}` !== 'success';
  const signature = {
    level: Number(levelRow?.level) || null,
    finalStatus: levelRow?.finalStatus || levelRow?.status || 'unknown',
    failureCategory: levelRow?.failureCategory || null,
    passCount: attempts.length,
    failedPassCount: failedAttempts,
    causality: {
      obligationReductionSlope: Number(average(causalityRows.map((r) => r.obligationReductionSlope)).toFixed(6)),
      frontierDiversityDelta: Number(average(causalityRows.map((r) => r.frontierDiversityDelta)).toFixed(4)),
      repeatedStateRatio: Number(average(causalityRows.map((r) => r.repeatedStateRatio)).toFixed(5)),
      portalCommitmentChurn: Number(average(causalityRows.map((r) => r.portalCommitmentChurn)).toFixed(5)),
      intersectionScheduleProgress: Number(average(causalityRows.map((r) => r.intersectionScheduleProgress)).toFixed(5))
    }
  };
  signature.signatureScore = Number((
    (signature.causality.repeatedStateRatio * 1.8)
    + (Math.max(0, -signature.causality.obligationReductionSlope) * 6.5)
    + (Math.max(0, -signature.causality.intersectionScheduleProgress) * 3.5)
    + (signature.causality.portalCommitmentChurn * 0.8)
    + (hardFailure ? 1.5 : 0)
  ).toFixed(5));
  // NC-P08-024/025 (docs/naming-cleanup-plan.md Section 5.7): historical committed reports under
  // logs/solver-workflow/ still carry the legacy knownHardCluster/recommendedGating field names and
  // are never rewritten in place -- any future reader of those files must accept both the legacy and
  // canonical names. This writer emits ONLY the canonical names from Phase 8 onward (no current
  // reader consumes either field, confirmed by a full-repo search before this rename).
  signature.hardClusterHeuristicMatch = signature.signatureScore >= 2.15;
  signature.derivedGatingCandidate = signature.hardClusterHeuristicMatch
    ? {
        passOrder: ['structural-modern', 'orderingBias', 'routingRegime'],
        budgetMultiplier: Number((1.15 + Math.min(0.35, signature.signatureScore * 0.08)).toFixed(3))
      }
    : {
        passOrder: null,
        budgetMultiplier: 1
      };
  return signature;
};

const deriveFailureFamily = (row) => {
  const status = `${row?.status || ''}`;
  const hasError = Boolean(row?.error);

  if (!status && !hasError) return 'unknown';
  if (hasError) return 'error';
  if (status === 'success') return 'success';
  if (status === 'timeout') return 'timeout';
  if (status === 'no-solution-inconclusive') return 'inconclusive';
  if (status === 'no-solution-proven') return 'proven-no-solution';
  if (status === 'aborted') return 'aborted';
  if (row?.failureCategory) return `${row.failureCategory}`;
  return status || 'unknown';
};

const summarizeRootSuppressionLog = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const counts = {};
  entries.forEach((entry) => {
    const type = `${entry?.type || 'other'}`;
    counts[type] = (counts[type] || 0) + 1;
  });
  return { total: entries.length, byType: counts, sample: entries.slice(0, 8) };
};

const normalizeLevelRow = (row = {}) => {
  const softBounds = row?.softBoundActivations && typeof row.softBoundActivations === 'object' ? row.softBoundActivations : null;
  return {
    ...row,
    rootCandidateCountDepth0: Number.isFinite(row?.rootCandidateCountDepth0)
      ? row.rootCandidateCountDepth0
      : (Number.isFinite(row?.rootCandidatesGenerated) ? row.rootCandidatesGenerated : null),
    depth0PruneBreakdown: row?.depth0PruneBreakdown && typeof row.depth0PruneBreakdown === 'object' ? row.depth0PruneBreakdown : null,
    softBoundActivations: softBounds,
    softBoundActivationsTotal: Number.isFinite(softBounds?.total)
      ? softBounds.total
      : ((Number(softBounds?.minRemOverflow) || 0) + (Number(softBounds?.mustPassBound) || 0) + (Number(softBounds?.mustCrossBound) || 0)),
    lowBranchModeActivated: Boolean(row?.lowBranchModeActivated),
    rescueTriggeredNearClosure: Boolean(row?.rescueTriggeredNearClosure),
    rootFamiliesAttemptedBeforeTimeout: Number.isFinite(row?.rootFamiliesAttemptedBeforeTimeout)
      ? row.rootFamiliesAttemptedBeforeTimeout
      : null,
    rootFamiliesStarved: Number.isFinite(row?.rootFamiliesStarved) ? row.rootFamiliesStarved : null,
    retryFingerprintDupes: Number.isFinite(row?.retryFingerprintDupes) ? row.retryFingerprintDupes : null,
    mustCrossRescueTriggered: Boolean(row?.mustCrossRescueTriggered),
    rootSuppressionLog: Array.isArray(row?.rootSuppressionLog) ? row.rootSuppressionLog.slice(0, 12) : null,
    rootSuppressionSummary: summarizeRootSuppressionLog(row?.rootSuppressionLog)
  };
};

const normalizeAuditPayload = (payload = {}) => {
  const levels = Array.isArray(payload?.levels) ? payload.levels.map(normalizeLevelRow) : [];
  return {
    ...payload,
    levels,
    levelCount: levels.length
  };
};

const _computeTransitionSummary = (currentPayload, previousPayload) => {
  const currentLevels = Array.isArray(currentPayload?.levels) ? currentPayload.levels : [];
  const previousLevels = Array.isArray(previousPayload?.levels) ? previousPayload.levels : [];
  const previousByLevel = new Map(previousLevels.map((row, index) => [resolveLevelNumber(row, index), row]));

  const telemetryFields = [
    'timeMs',
    'totalSolveTimeMs',
    'nodesExpanded',
    'candidateMovesConsidered',
    'rootCandidatesGenerated',
    'rootCandidateCountDepth0',
    'rootCandidatesExpanded',
    'lowBranchModeActivated',
    'softBoundActivationsTotal'
  ];

  const transitions = [];
  const counters = {
    improved: 0,
    regressed: 0,
    statusChanged: 0,
    telemetryChanged: 0,
    newlyAddedLevels: 0,
    removedLevels: 0
  };

  const failureFamilyMigration = {};
  const bumpMigration = (from, to) => {
    const key = `${from} -> ${to}`;
    failureFamilyMigration[key] = (failureFamilyMigration[key] || 0) + 1;
  };

  currentLevels.forEach((row, index) => {
    const levelNumber = resolveLevelNumber(row, index);
    const prev = previousByLevel.get(levelNumber);
    const currentStatus = `${row?.status || ''}`;
    const previousStatus = `${prev?.status || ''}`;
    const currentHasError = Boolean(row?.error);
    const previousHasError = Boolean(prev?.error);
    const currentFamily = deriveFailureFamily(row);
    const previousFamily = deriveFailureFamily(prev);

    if (!prev) {
      counters.newlyAddedLevels += 1;
      transitions.push({
        levelNumber,
        transition: 'new-level',
        current: {
          status: currentStatus,
          hasError: currentHasError,
          failureFamily: currentFamily
        }
      });
      return;
    }

    const statusChanged = currentStatus !== previousStatus || currentHasError !== previousHasError;
    if (statusChanged) counters.statusChanged += 1;

    const telemetryDelta = {};
    let telemetryChanged = false;
    telemetryFields.forEach((field) => {
      const currentValue = toFiniteNumber(row?.[field]);
      const previousValue = toFiniteNumber(prev?.[field]);
      if (currentValue === null && previousValue === null) return;
      const delta =
        currentValue === null || previousValue === null ? null : Math.round((currentValue - previousValue) * 100) / 100;
      telemetryDelta[field] = { previous: previousValue, current: currentValue, delta };
      if (delta !== 0) telemetryChanged = true;
      if (delta === null && currentValue !== previousValue) telemetryChanged = true;
    });
    if (telemetryChanged) counters.telemetryChanged += 1;

    const previousSuccess = previousStatus === 'success' && !previousHasError;
    const currentSuccess = currentStatus === 'success' && !currentHasError;
    const improved = !previousSuccess && currentSuccess;
    const regressed = previousSuccess && !currentSuccess;

    if (improved) counters.improved += 1;
    if (regressed) counters.regressed += 1;

    if (previousFamily !== currentFamily) {
      bumpMigration(previousFamily, currentFamily);
    }

    if (!statusChanged && !telemetryChanged) return;

    transitions.push({
      levelNumber,
      transition: improved ? 'improved' : regressed ? 'regressed' : statusChanged ? 'status-shift' : 'telemetry-shift',
      previous: {
        status: previousStatus,
        hasError: previousHasError,
        failureFamily: previousFamily
      },
      current: {
        status: currentStatus,
        hasError: currentHasError,
        failureFamily: currentFamily
      },
      telemetryDelta
    });
  });

  const currentNumbers = new Set(currentLevels.map((row, index) => resolveLevelNumber(row, index)));
  previousLevels.forEach((row, index) => {
    const levelNumber = resolveLevelNumber(row, index);
    if (!currentNumbers.has(levelNumber)) {
      counters.removedLevels += 1;
      transitions.push({
        levelNumber,
        transition: 'removed-level',
        previous: {
          status: `${row?.status || ''}`,
          hasError: Boolean(row?.error),
          failureFamily: deriveFailureFamily(row)
        }
      });
    }
  });

  return {
    comparedAgainst: previousPayload
      ? {
          timestamp: previousPayload?.timestamp || null,
          runType: previousPayload?.runType || null,
          exportMode: previousPayload?.exportMode || null,
          levelCount: previousLevels.length
        }
      : null,
    counters,
    failureFamilyMigration,
    changedLevels: transitions,
    unchangedLevelCount: Math.max(0, currentLevels.length - transitions.filter((t) => t.transition !== 'removed-level').length)
  };
};

const _summarizeMetrics = (payload, commitSha) => {
  const levels = Array.isArray(payload?.levels) ? payload.levels : [];
  const includeLevels = payload?.exportMode === 'full' && payload?.runType === 'newHint';

  const timeVals = [];
  const solveVals = [];

  const statusCounts = {
    success: 0,
    timeout: 0,
    noSolutionInconclusive: 0,
    noSolutionProven: 0,
    aborted: 0,
    error: 0
  };

  const qualitySignals = {
    producedHintValidCount: 0,
    contradictionRecoveryActivatedCount: 0,
    preExpansionAbortUnexpectedExceptionCount: 0
  };

  const failingLevelNumbers = new Set();
  const failingDetails = [];
  const failingByStatus = {
    timeout: 0,
    noSolutionInconclusive: 0,
    noSolutionProven: 0,
    aborted: 0,
    error: 0
  };

  levels.forEach((row, index) => {
    const status = `${row?.status || ''}`;
    const hasError = Boolean(row?.error);

    if (status === 'success') statusCounts.success += 1;
    if (status === 'timeout') statusCounts.timeout += 1;
    if (status === 'no-solution-inconclusive') statusCounts.noSolutionInconclusive += 1;
    if (status === 'no-solution-proven') statusCounts.noSolutionProven += 1;
    if (status === 'aborted') statusCounts.aborted += 1;
    if (hasError) statusCounts.error += 1;

    if (row?.producedHintValid === true) qualitySignals.producedHintValidCount += 1;
    if (row?.contradictionRecoveryActivated === true) qualitySignals.contradictionRecoveryActivatedCount += 1;
    if (row?.preExpansionAbort === 'unexpected-exception') qualitySignals.preExpansionAbortUnexpectedExceptionCount += 1;

    const timeMs = toFiniteNumber(row?.timeMs);
    if (timeMs !== null) timeVals.push(timeMs);

    const totalSolveTimeMs = toFiniteNumber(row?.totalSolveTimeMs);
    if (totalSolveTimeMs !== null) solveVals.push(totalSolveTimeMs);

    const levelNumber = resolveLevelNumber(row, index);

    const isFailing = status !== 'success' || hasError;
    if (!isFailing) return;

    failingLevelNumbers.add(levelNumber);
    failingDetails.push({ levelNumber, status, hasError });

    if (hasError) {
      failingByStatus.error += 1;
    }

    if (status === 'timeout') {
      failingByStatus.timeout += 1;
    } else if (status === 'no-solution-inconclusive') {
      failingByStatus.noSolutionInconclusive += 1;
    } else if (status === 'no-solution-proven') {
      failingByStatus.noSolutionProven += 1;
    } else if (status === 'aborted') {
      failingByStatus.aborted += 1;
    } else {
      failingByStatus.error += 1;
    }
  });

  const summary = {
    timestamp: new Date().toISOString(),
    commitSha,
    runType: payload?.runType || 'unknown',
    exportMode: payload?.exportMode || 'unknown',
    levelCount: levels.length,
    statusCounts,
    failingLevels: {
      total: failingDetails.length,
      byStatus: failingByStatus,
      levelNumbers: Array.from(failingLevelNumbers).sort((a, b) => a - b),
      details: failingDetails
    },
    qualitySignals,
    performance: {
      hintTimeMsAvg: timeVals.length ? Math.round(timeVals.reduce((a, b) => a + b, 0) / timeVals.length) : null,
      totalSolveTimeMsAvg: solveVals.length ? Math.round(solveVals.reduce((a, b) => a + b, 0) / solveVals.length) : null,
      maxSolveTimeMs: solveVals.length ? Math.max(...solveVals) : null
    },
    levelFailureSignatures: levels
      .map((row) => deriveLevelFailureSignature(row))
      .sort((a, b) => (b.signatureScore - a.signatureScore) || ((a.level || 0) - (b.level || 0)))
  };

  const hardClusterHeuristicMatchLevels = summary.levelFailureSignatures
    .filter((row) => row.hardClusterHeuristicMatch)
    .map((row) => row.level)
    .filter((level) => Number.isFinite(level));
  summary.hardClusterGating = {
    knownHardLevels: hardClusterHeuristicMatchLevels,
    budgetByLevel: Object.fromEntries(
      summary.levelFailureSignatures
        .filter((row) => Number.isFinite(row.level))
        .map((row) => [row.level, row.derivedGatingCandidate?.budgetMultiplier || 1])
    ),
    passOrderByLevel: Object.fromEntries(
      summary.levelFailureSignatures
        .filter((row) => Number.isFinite(row.level) && Array.isArray(row.derivedGatingCandidate?.passOrder))
        .map((row) => [row.level, row.derivedGatingCandidate.passOrder])
    )
  };

  // Segment 1 (portfolio diversification) telemetry rollup. Summarizes per-level
  // diversity metrics so Gate B can be verified from logs/metrics/latest.json
  // without re-parsing the raw payload.
  const diversityLevels = levels.filter((row) => row?.diversityMetrics && typeof row.diversityMetrics === 'object');
  const overlapMeans = diversityLevels
    .map((row) => toFiniteNumber(row?.diversityMetrics?.pairwiseStateOverlap?.mean))
    .filter((n) => n !== null);
  const overlapMaxes = diversityLevels
    .map((row) => toFiniteNumber(row?.diversityMetrics?.pairwiseStateOverlap?.max))
    .filter((n) => n !== null);
  const correlationMeans = diversityLevels
    .map((row) => toFiniteNumber(row?.diversityMetrics?.branchDecisionCorrelation?.mean))
    .filter((n) => n !== null);
  const distinctProfileCounts = diversityLevels
    .map((row) => toFiniteNumber(row?.diversityMetrics?.distinctProfileIdCount))
    .filter((n) => n !== null);
  const distinctFamilyCounts = diversityLevels
    .map((row) => toFiniteNumber(row?.diversityMetrics?.distinctFamilyCount))
    .filter((n) => n !== null);
  const oscillatedCounts = diversityLevels
    .map((row) => toFiniteNumber(row?.diversityMetrics?.oscillatedAttemptCount))
    .filter((n) => n !== null);
  const avg = (arr) => (arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(4)) : null);
  const max = (arr) => (arr.length ? Number(Math.max(...arr).toFixed(4)) : null);
  summary.diversityRollup = {
    levelsWithDiversityMetrics: diversityLevels.length,
    pairwiseStateOverlap: {
      meanOfMeans: avg(overlapMeans),
      maxOfMaxes: max(overlapMaxes)
    },
    branchDecisionCorrelation: {
      meanOfMeans: avg(correlationMeans)
    },
    distinctProfileIdCount: {
      mean: avg(distinctProfileCounts),
      max: max(distinctProfileCounts)
    },
    distinctFamilyCount: {
      mean: avg(distinctFamilyCounts),
      max: max(distinctFamilyCounts)
    },
    oscillatedAttempts: {
      totalAcrossLevels: oscillatedCounts.reduce((s, v) => s + v, 0),
      mean: avg(oscillatedCounts)
    }
  };

  if (includeLevels) {
    summary.levels = levels;
  }

  return summary;
};

// V2 attempt objects carry { gateKey, profile, template, beamWidth, ok, elapsedMs }.
// The guard check (check-audit-output.mjs) requires every attempt to expose the full
// Segment-0 telemetry shape. Fill in neutral stub values for fields V2 doesn't track.
const normalizeDirectAttempt = (attempt = {}, index = 0) => ({
  ...attempt,
  label: attempt?.label || attempt?.profile || `attempt-${index + 1}`,
  pruneBreakdown: (attempt?.pruneBreakdown && typeof attempt.pruneBreakdown === 'object')
    ? attempt.pruneBreakdown
    : { total: 1 },
  memoHitRate: Number.isFinite(attempt?.memoHitRate) ? attempt.memoHitRate : 0,
  dominanceHitRate: Number.isFinite(attempt?.dominanceHitRate) ? attempt.dominanceHitRate : 0,
  nogoodHitRate: Number.isFinite(attempt?.nogoodHitRate) ? attempt.nogoodHitRate : 0,
  counterIntegrityStatus: (attempt?.counterIntegrityStatus && typeof attempt.counterIntegrityStatus === 'object')
    ? attempt.counterIntegrityStatus
    : {},
  statsProvenance: (attempt?.statsProvenance && typeof attempt.statsProvenance === 'object')
    ? attempt.statsProvenance
    : { source: 'solverApi-direct' },
});

const mapDirectLevelToAuditLevel = (row = {}) => {
  const solved = row?.ok === true || `${row?.status || ''}` === 'solved' || `${row?.status || ''}` === 'success';
  const rawStatus = solved ? 'success' : (`${row?.status || ''}` === 'timeout' ? 'timeout' : `${row?.status || ''}` || 'error');
  return {
    level: Number(row?.level) || null,
    status: solved ? 'success' : rawStatus,
    rawStatus,
    finalStatus: rawStatus,
    finalSolvedBy: solved ? 'referee' : 'none',
    producedHintValid: solved,
    timeMs: Number.isFinite(row?.elapsedMs) ? row.elapsedMs : null,
    totalSolveTimeMs: Number.isFinite(row?.elapsedMs) ? row.elapsedMs : null,
    ladderTotalWallTimeMs: Number.isFinite(row?.elapsedMs) ? row.elapsedMs : null,
    ladderTotalSolveTimeMs: Number.isFinite(row?.elapsedMs) ? row.elapsedMs : null,
    stopReason: solved ? 'solved' : rawStatus,
    attemptCount: Number.isFinite(row?.attemptHistoryCount) ? row.attemptHistoryCount : (Array.isArray(row?.attempts) ? row.attempts.length : 0),
    attemptLabelsTried: Array.isArray(row?.attempts) ? row.attempts.map((a, i) => a?.label || `A${i + 1}`) : [],
    failureCategory: row?.failureCategory || (solved ? 'solved-direct' : null),
    contradictionRecoveryActivated: !!row?.contradictionRecoveryActivated,
    preExpansionAbort: row?.preExpansionAbort || null,
    nodesExpanded: Number.isFinite(row?.nodesExpanded) ? row.nodesExpanded : null,
    candidateMovesConsidered: Number.isFinite(row?.candidateMovesConsidered) ? row.candidateMovesConsidered : null,
    rootCandidatesGenerated: Number.isFinite(row?.rootCandidatesGenerated) ? row.rootCandidatesGenerated : null,
    rootCandidateCountDepth0: Number.isFinite(row?.rootCandidateCountDepth0) ? row.rootCandidateCountDepth0 : null,
    depth0PruneBreakdown: row?.depth0PruneBreakdown || null,
    softBoundActivations: row?.softBoundActivations || null,
    lowBranchModeActivated: !!row?.lowBranchModeActivated,
    retryFingerprintDupes: Number.isFinite(row?.retryFingerprintDupes) ? row.retryFingerprintDupes : 0,
    rootCandidatesExpanded: Number.isFinite(row?.rootCandidatesExpanded) ? row.rootCandidatesExpanded : null,
    rootSuppressionLog: Array.isArray(row?.rootSuppressionLog) ? row.rootSuppressionLog : null,
    attempts: Array.isArray(row?.attempts) ? row.attempts.map(normalizeDirectAttempt) : [],
    diversityMetrics: row?.diversityMetrics || null,
    error: row?.error || null
  };
};

const convertDirectToRawPayload = (direct = {}) => {
  const levels = Array.isArray(direct?.levels) ? direct.levels.map(mapDirectLevelToAuditLevel) : [];
  return {
    exportMode: 'full',
    runType: 'newHint',
    timestamp: direct?.timestamp || new Date().toISOString(),
    commitSha: direct?.commitSha || process.env.GITHUB_SHA || 'local',
    levelCount: levels.length,
    levels
  };
};


const pruneRawExports = async (rawDir, latestFileName, keepDays = 10) => {
  const entries = await readdir(rawDir, { withFileTypes: true });
  const cutoffMs = Date.now() - (keepDays * 24 * 60 * 60 * 1000);

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.json')) continue;
    if (entry.name === latestFileName) continue;

    const stamp = entry.name.split('-').slice(0, 3).join('-');
    const parsedMs = Date.parse(stamp);
    if (!Number.isFinite(parsedMs)) continue;
    if (parsedMs < cutoffMs) {
      await rm(path.join(rawDir, entry.name));
    }
  }
};

const run = async () => {
  const directOutPath = path.join(process.cwd(), 'logs', 'local-direct', '.solver-diagnostics-tmp.json');
  console.log('[solver-diagnostics] running Solver direct on all levels');
  // Route through run-bundled.mjs (esbuild bundle), like `npm run solver:direct`: run-solverv2-direct
  // imports modules/solver.js, which is TypeScript post-migration and cannot be resolved by plain
  // `node` (ERR_MODULE_NOT_FOUND). The bundler transforms the .ts entry the same way production does.
  // --save-hints (opt-in, passed by solver-diagnostics.yml) makes this pass RECORD what it finds instead
  // of discarding it. This run already solves all 160 published levels on every merge that touches
  // the solver or the level data; without it, every path it computes was thrown away — the audit
  // payload keeps only metrics, never the solution. Two things are recovered by keeping them:
  // genuinely novel solutions become new hints, and a rediscovery appends a provenance entry
  // stamped with THIS commit, which is exactly the per-commit cost record
  // scripts/stress/hint-cost-drift.mjs compares across commits (see docs/testing.md).
  const saveHints = process.argv.includes('--save-hints');
  execFileSync('node', [
    'scripts/run-bundled.mjs', 'scripts/run-solverv2-direct.mjs',
    '--levels=all', `--output=${directOutPath}`,
    ...(saveHints ? ['--save-hints'] : []),
  ], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  const directPayload = JSON.parse(await readFile(directOutPath, 'utf8'));
  const payload = normalizeAuditPayload(convertDirectToRawPayload(directPayload));
  const raw = JSON.stringify(payload, null, 2);

    const stamp = utcStamp();
    const shortSha = `${process.env.GITHUB_SHA || process.env.AUDIT_GIT_SHA || 'local'}`.slice(0, 12);

    const rawDir = path.join(process.cwd(), 'logs', 'solver-workflow');
    await mkdir(rawDir, { recursive: true });

    const rawFileName = `${stamp}-${shortSha}.json`;
    const rawFilePath = path.join(rawDir, rawFileName);
    const latestRawPath = path.join(rawDir, 'latest.json');

    await writeFile(rawFilePath, raw, 'utf8');
    await writeFile(latestRawPath, raw, 'utf8');

    await pruneRawExports(rawDir, 'latest.json', 10);

    console.log(`Solver diagnostics report written: ${path.relative(process.cwd(), rawFilePath)}`);
};

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
