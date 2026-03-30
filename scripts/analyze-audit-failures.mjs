#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rawDir = path.resolve('audits/raw');
const explicitFiles = process.argv.slice(2).filter(Boolean);

const allRawFiles = fs
  .readdirSync(rawDir)
  .filter((file) => file.endsWith('.json') && file !== 'latest.json')
  .sort();

const selectedFiles = explicitFiles.length > 0 ? explicitFiles : allRawFiles.slice(-3);

if (selectedFiles.length < 2) {
  console.error('Need at least two audit raw files to compare.');
  process.exit(1);
}

const getSoftBoundTotal = (row) => {
  if (Number.isFinite(row?.softBoundActivations?.total)) return row.softBoundActivations.total;
  return (Number(row?.softBoundActivations?.minRemOverflow) || 0)
    + (Number(row?.softBoundActivations?.mustPassBound) || 0)
    + (Number(row?.softBoundActivations?.mustCrossBound) || 0);
};

const getRootCandidateDepth0 = (row) =>
  Number.isFinite(row?.rootCandidateCountDepth0)
    ? row.rootCandidateCountDepth0
    : (Number.isFinite(row?.rootCandidatesGenerated) ? row.rootCandidatesGenerated : null);

const isCollapseFamily = (row) => {
  const failureCategory = `${row?.failureCategory || ''}`.toLowerCase();
  if (failureCategory.includes('collapse')) return true;
  if (failureCategory.includes('pre-expansion')) return true;
  const status = `${row?.finalStatus || row?.status || ''}`.toLowerCase();
  if (status === 'timeout' || status === 'no-solution-inconclusive') {
    const rootDepth0 = getRootCandidateDepth0(row);
    const rootExpanded = Number(row?.rootCandidatesExpanded) || 0;
    const nodes = Number(row?.nodesExpanded) || 0;
    return (Number.isFinite(rootDepth0) && rootDepth0 <= 1) || rootExpanded <= 1 || nodes <= 2;
  }
  return false;
};

const readAudit = (file) => {
  const fullPath = path.join(rawDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing audit raw file: ${file}`);
  }
  const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const levels = Array.isArray(parsed.levels) ? parsed.levels : [];
  const failed = levels.filter((level) => level.finalStatus !== 'solved');
  return {
    file,
    levels,
    failed,
    failedSet: new Set(failed.map((level) => level.level))
  };
};

const audits = selectedFiles.map(readAudit);

const printFailureSummary = () => {
  console.log('Failure counts and failing levels:');
  for (const audit of audits) {
    const failLevels = audit.failed.map((level) => level.level).sort((a, b) => a - b);
    console.log(`- ${audit.file}: failures=${audit.failed.length}; levels=[${failLevels.join(', ')}]`);
  }
  console.log('');
};

const diffFailSet = (fromAudit, toAudit) => {
  const introduced = [...toAudit.failedSet].filter((level) => !fromAudit.failedSet.has(level)).sort((a, b) => a - b);
  const recovered = [...fromAudit.failedSet].filter((level) => !toAudit.failedSet.has(level)).sort((a, b) => a - b);
  return { introduced, recovered };
};

const printWindowTransitions = () => {
  console.log('Window-to-window failure-set transitions:');
  for (let index = 1; index < audits.length; index += 1) {
    const prev = audits[index - 1];
    const next = audits[index];
    const { introduced, recovered } = diffFailSet(prev, next);
    console.log(`- ${prev.file} -> ${next.file}`);
    console.log(`  introduced=[${introduced.join(', ')}] recovered=[${recovered.join(', ')}]`);
  }
  console.log('');
};

const printCollapseFamilySummary = () => {
  console.log('Collapse-family summary (new metrics):');
  for (const audit of audits) {
    const collapseRows = audit.failed.filter(isCollapseFamily);
    const suppressionByType = {};
    let rootDepth0Sum = 0;
    let rootDepth0Count = 0;
    let softBoundTotal = 0;
    let lowBranchCount = 0;

    collapseRows.forEach((row) => {
      const rootDepth0 = getRootCandidateDepth0(row);
      if (Number.isFinite(rootDepth0)) {
        rootDepth0Sum += rootDepth0;
        rootDepth0Count += 1;
      }
      softBoundTotal += getSoftBoundTotal(row);
      if (row?.lowBranchModeActivated) lowBranchCount += 1;
      if (Array.isArray(row?.rootSuppressionLog)) {
        row.rootSuppressionLog.forEach((entry) => {
          const type = `${entry?.type || 'other'}`;
          suppressionByType[type] = (suppressionByType[type] || 0) + 1;
        });
      }
    });

    const avgRootDepth0 = rootDepth0Count > 0 ? (rootDepth0Sum / rootDepth0Count).toFixed(2) : 'n/a';
    const suppressionSummary = Object.entries(suppressionByType)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => `${key}:${count}`)
      .join(', ') || 'none';

    console.log(`- ${audit.file}: collapseFailures=${collapseRows.length}/${audit.failed.length}`);
    console.log(`  avgRootCandidateCountDepth0=${avgRootDepth0}; softBoundActivations=${softBoundTotal}; lowBranchModeActivated=${lowBranchCount}`);
    console.log(`  rootSuppressionTypes=${suppressionSummary}`);
  }
  console.log('');
};

const printLevel50Trajectory = () => {
  const l50 = audits.map((audit) => {
    const row = audit.levels.find((level) => level.level === 50);
    if (!row) {
      return {
        file: audit.file,
        finalStatus: 'missing',
        failureCategory: 'missing',
        totalSolveTimeMs: null,
        nodesExpanded: null,
        rootCandidateCountDepth0: null,
        softBoundActivations: 0,
        lowBranchModeActivated: false
      };
    }
    return {
      file: audit.file,
      finalStatus: row.finalStatus,
      failureCategory: row.failureCategory,
      totalSolveTimeMs: row.totalSolveTimeMs,
      nodesExpanded: row.nodesExpanded,
      rootCandidateCountDepth0: getRootCandidateDepth0(row),
      softBoundActivations: getSoftBoundTotal(row),
      lowBranchModeActivated: !!row.lowBranchModeActivated
    };
  });

  console.log('Level 50 trajectory:');
  for (const row of l50) {
    console.log(
      `- ${row.file}: status=${row.finalStatus}; category=${row.failureCategory}; totalSolveTimeMs=${row.totalSolveTimeMs}; nodes=${row.nodesExpanded}; rootDepth0=${row.rootCandidateCountDepth0}; softBounds=${row.softBoundActivations}; lowBranch=${row.lowBranchModeActivated}`
    );
  }

  const solvedCount = l50.filter((row) => row.finalStatus === 'solved').length;
  const failedCount = l50.length - solvedCount;
  console.log(`- solved=${solvedCount}/${l50.length}; failed=${failedCount}/${l50.length}`);
};

const REQUIRED_TIMEOUT_TELEMETRY_KEYS = [
  'maxProgress',
  'bestPhaseReached',
  'remainingMustPass',
  'remainingMustCross',
  'plateauDetected',
  'plateauNodeWindow'
];

const summarizeFailureAttemptTelemetry = () => {
  console.log('Failure attempt telemetry summary (timeout/inconclusive attempts):');
  for (const audit of audits) {
    const failedLevels = audit.failed;
    let timeoutLikeAttempts = 0;
    let sentinelMaxProgress = 0;
    let sentinelBestPhase = 0;
    let sentinelRemainingMustPass = 0;
    let sentinelRemainingMustCross = 0;
    let sentinelPlateauWindow = 0;
    let plateauDetectedCount = 0;
    let missingKeys = 0;

    const levelSnapshots = [];
    for (const level of failedLevels) {
      const attempts = Array.isArray(level?.attempts) ? level.attempts : [];
      const timeoutAttempts = attempts.filter((attempt) =>
        ['timeout', 'no-solution-inconclusive'].includes(`${attempt?.status || ''}`));
      if (timeoutAttempts.length === 0) continue;
      const latest = timeoutAttempts[timeoutAttempts.length - 1];
      levelSnapshots.push({
        level: level.level,
        status: level.finalStatus || level.status || 'unknown',
        maxProgress: latest?.maxProgress,
        bestPhaseReached: latest?.bestPhaseReached,
        remainingMustPass: latest?.remainingMustPass,
        remainingMustCross: latest?.remainingMustCross,
        plateauDetected: latest?.plateauDetected,
        plateauNodeWindow: latest?.plateauNodeWindow
      });
      for (const attempt of timeoutAttempts) {
        timeoutLikeAttempts += 1;
        for (const key of REQUIRED_TIMEOUT_TELEMETRY_KEYS) {
          if (!Object.prototype.hasOwnProperty.call(attempt, key)) missingKeys += 1;
        }
        if (!Number.isFinite(Number(attempt?.maxProgress)) || Number(attempt?.maxProgress) < 0) sentinelMaxProgress += 1;
        if (`${attempt?.bestPhaseReached || ''}`.trim() === '' || `${attempt?.bestPhaseReached || ''}` === 'unknown') sentinelBestPhase += 1;
        if (!Number.isFinite(Number(attempt?.remainingMustPass)) || Number(attempt?.remainingMustPass) < 0) sentinelRemainingMustPass += 1;
        if (!Number.isFinite(Number(attempt?.remainingMustCross)) || Number(attempt?.remainingMustCross) < 0) sentinelRemainingMustCross += 1;
        if (!Number.isFinite(Number(attempt?.plateauNodeWindow)) || Number(attempt?.plateauNodeWindow) < 0) sentinelPlateauWindow += 1;
        if (attempt?.plateauDetected === true) plateauDetectedCount += 1;
      }
    }

    console.log(`- ${audit.file}: timeoutLikeAttempts=${timeoutLikeAttempts}; missingTelemetryKeys=${missingKeys}`);
    console.log(`  sentinels maxProgress=${sentinelMaxProgress}, bestPhaseReached=${sentinelBestPhase}, remainingMustPass=${sentinelRemainingMustPass}, remainingMustCross=${sentinelRemainingMustCross}, plateauNodeWindow=${sentinelPlateauWindow}, plateauDetected=true count=${plateauDetectedCount}`);
    const preview = levelSnapshots
      .sort((a, b) => a.level - b.level)
      .slice(0, 8)
      .map((row) => `L${row.level}:${row.status} p=${row.maxProgress} phase=${row.bestPhaseReached} rem=(${row.remainingMustPass}/${row.remainingMustCross}) plateau=${row.plateauDetected ? 'Y' : 'N'}@${row.plateauNodeWindow}`)
      .join(' | ');
    console.log(`  samples=${preview || 'none'}`);
  }
  console.log('');
};

printFailureSummary();
printWindowTransitions();
printCollapseFamilySummary();
summarizeFailureAttemptTelemetry();
printLevel50Trajectory();
