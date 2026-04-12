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

const mergeHistogram = (target, source) => {
  if (!source || typeof source !== 'object') return target;
  Object.entries(source).forEach(([key, value]) => {
    const bucket = `${key}`;
    const count = Number(value) || 0;
    if (!Number.isFinite(count) || count <= 0) return;
    target[bucket] = (target[bucket] || 0) + count;
  });
  return target;
};

const summarizeHistogram = (hist, limit = 6) => {
  const entries = Object.entries(hist || {})
    .map(([bucket, count]) => [bucket, Number(count) || 0])
    .filter(([, count]) => count > 0)
    .sort((a, b) => {
      const aNum = Number(a[0]);
      const bNum = Number(b[0]);
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
      return a[0].localeCompare(b[0]);
    });
  if (entries.length === 0) return 'none';
  return entries.slice(0, limit).map(([bucket, count]) => `${bucket}:${count}`).join(', ');
};

const getAttemptTimeoutDiagnostics = (attempt) => {
  const diag = attempt?.timeoutDiagnostics;
  if (diag && typeof diag === 'object') return diag;
  return null;
};

const collectLevelTimeoutDiagnostics = (level) => {
  const attempts = Array.isArray(level?.attempts) ? level.attempts : [];
  return attempts
    .filter((attempt) => `${attempt?.status || ''}`.toLowerCase() === 'timeout')
    .map((attempt) => getAttemptTimeoutDiagnostics(attempt))
    .filter(Boolean);
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

const printTimeoutDiagnosticsSummary = () => {
  console.log('Timeout diagnostics summary (failed levels):');
  for (const audit of audits) {
    const mustPassDist = {};
    const interactionDist = {};
    const nearSolutionByDimension = {};
    let timeoutAttemptsWithDiag = 0;
    let nearSolutionStates = 0;
    let bestLowerBound = null;

    audit.failed.forEach((level) => {
      const diagnostics = collectLevelTimeoutDiagnostics(level);
      diagnostics.forEach((diag) => {
        timeoutAttemptsWithDiag += 1;
        mergeHistogram(mustPassDist, diag.frontierMustPassDistribution);
        mergeHistogram(interactionDist, diag.frontierInteractionDeficitDistribution);
        mergeHistogram(nearSolutionByDimension, diag.nearSolutionByDimension);
        nearSolutionStates += Number(diag.nearSolutionStates) || 0;
        const lb = Number(diag.bestLowerBoundToValidSolution);
        if (Number.isFinite(lb)) {
          bestLowerBound = bestLowerBound === null ? lb : Math.min(bestLowerBound, lb);
        }
      });
    });

    console.log(`- ${audit.file}: timeoutAttemptsWithDiag=${timeoutAttemptsWithDiag}`);
    console.log(`  frontierMustPassDistribution=${summarizeHistogram(mustPassDist)}`);
    console.log(`  frontierInteractionDeficitDistribution=${summarizeHistogram(interactionDist)}`);
    console.log(`  bestLowerBoundToValidSolution=${bestLowerBound === null ? 'n/a' : bestLowerBound}`);
    console.log(`  nearSolutionStates=${nearSolutionStates}; nearSolutionByDimension=${summarizeHistogram(nearSolutionByDimension)}`);
  }
  console.log('');
};

const summarizeNumberSeries = (values) => {
  const nums = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (nums.length === 0) return { min: null, max: null, avg: null };
  const sum = nums.reduce((acc, value) => acc + value, 0);
  return {
    min: Math.min(...nums),
    max: Math.max(...nums),
    avg: Number((sum / nums.length).toFixed(2))
  };
};

const printPersistentFailureProfiles = () => {
  const persistent = audits
    .map((audit) => new Set(audit.failed.map((row) => row.level)))
    .reduce((acc, set) => new Set([...acc].filter((level) => set.has(level))));

  const ordered = [...persistent].sort((a, b) => a - b);
  console.log('Persistent hard-level profiles (failed in every selected audit):');
  if (ordered.length === 0) {
    console.log('- none');
    console.log('');
    return;
  }

  for (const levelNumber of ordered) {
    const rows = audits
      .map((audit) => ({ audit, row: audit.levels.find((entry) => entry.level === levelNumber) }))
      .filter(({ row }) => !!row)
      .map(({ audit, row }) => ({ file: audit.file, row }));

    const statusSet = new Set(rows.map(({ row }) => row.finalStatus || row.status || 'unknown'));
    const categorySet = new Set(rows.map(({ row }) => row.failureCategory || 'unknown'));
    const nodesSummary = summarizeNumberSeries(rows.map(({ row }) => row.nodesExpanded));
    const rootSummary = summarizeNumberSeries(rows.map(({ row }) => getRootCandidateDepth0(row)));
    const bestLbValues = [];
    const nearDimHistogram = {};
    let timeoutAttempts = 0;

    rows.forEach(({ row }) => {
      const diagnostics = collectLevelTimeoutDiagnostics(row);
      diagnostics.forEach((diag) => {
        timeoutAttempts += 1;
        const lb = Number(diag.bestLowerBoundToValidSolution);
        if (Number.isFinite(lb)) bestLbValues.push(lb);
        mergeHistogram(nearDimHistogram, diag.nearSolutionByDimension);
      });
    });

    const bestLbSummary = summarizeNumberSeries(bestLbValues);
    console.log(`- L${levelNumber}: statuses=[${[...statusSet].join(', ')}]; categories=[${[...categorySet].join(', ')}]`);
    console.log(`  nodesExpanded avg=${nodesSummary.avg ?? 'n/a'} min=${nodesSummary.min ?? 'n/a'} max=${nodesSummary.max ?? 'n/a'}; rootDepth0 avg=${rootSummary.avg ?? 'n/a'} min=${rootSummary.min ?? 'n/a'} max=${rootSummary.max ?? 'n/a'}`);
    console.log(`  timeoutDiagnostics attempts=${timeoutAttempts}; bestLowerBoundToValidSolution avg=${bestLbSummary.avg ?? 'n/a'} min=${bestLbSummary.min ?? 'n/a'} max=${bestLbSummary.max ?? 'n/a'}`);
    console.log(`  nearSolutionByDimension=${summarizeHistogram(nearDimHistogram)}`);
    rows.forEach(({ file, row }) => {
      console.log(`  • ${file}: stopReason=${row.stopReason || 'n/a'} attempts=${row.attemptCount || 0} nodes=${row.nodesExpanded || 0} rootExpanded=${row.rootCandidatesExpanded || 0}`);
    });
  }
  console.log('');
};

printFailureSummary();
printWindowTransitions();
printCollapseFamilySummary();
printTimeoutDiagnosticsSummary();
printPersistentFailureProfiles();
printLevel50Trajectory();
