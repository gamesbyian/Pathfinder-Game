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

const printLevel50Trajectory = () => {
  const l50 = audits.map((audit) => {
    const row = audit.levels.find((level) => level.level === 50);
    if (!row) {
      return { file: audit.file, finalStatus: 'missing', failureCategory: 'missing', totalSolveTimeMs: null, nodesExpanded: null };
    }
    return {
      file: audit.file,
      finalStatus: row.finalStatus,
      failureCategory: row.failureCategory,
      totalSolveTimeMs: row.totalSolveTimeMs,
      nodesExpanded: row.nodesExpanded
    };
  });

  console.log('Level 50 trajectory:');
  for (const row of l50) {
    console.log(
      `- ${row.file}: status=${row.finalStatus}; category=${row.failureCategory}; totalSolveTimeMs=${row.totalSolveTimeMs}; nodes=${row.nodesExpanded}`
    );
  }

  const solvedCount = l50.filter((row) => row.finalStatus === 'solved').length;
  const failedCount = l50.length - solvedCount;
  console.log(`- solved=${solvedCount}/${l50.length}; failed=${failedCount}/${l50.length}`);
};

printFailureSummary();
printWindowTransitions();
printLevel50Trajectory();
