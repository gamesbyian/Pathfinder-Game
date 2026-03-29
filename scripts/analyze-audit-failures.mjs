#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rawDir = path.resolve('audits/raw');
const args = process.argv.slice(2);

const parsed = {
  window: 3,
  level: 50,
  files: []
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--window' || arg === '-w') {
    const value = Number(args[index + 1]);
    if (!Number.isFinite(value) || value < 2) {
      console.error('Expected --window to be an integer >= 2.');
      process.exit(1);
    }
    parsed.window = Math.floor(value);
    index += 1;
    continue;
  }
  if (arg === '--level' || arg === '-l') {
    const value = Number(args[index + 1]);
    if (!Number.isFinite(value) || value < 1) {
      console.error('Expected --level to be a positive integer.');
      process.exit(1);
    }
    parsed.level = Math.floor(value);
    index += 1;
    continue;
  }
  parsed.files.push(arg);
}

const allRawFiles = fs
  .readdirSync(rawDir)
  .filter((file) => file.endsWith('.json') && file !== 'latest.json')
  .sort();

const selectedFiles = parsed.files.length > 0 ? parsed.files : allRawFiles.slice(-parsed.window);

if (selectedFiles.length < 2) {
  console.error('Need at least two audit raw files to compare.');
  process.exit(1);
}

const readAudit = (file) => {
  const fullPath = path.join(rawDir, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing audit raw file: ${file}`);
  }
  const parsedAudit = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const levels = Array.isArray(parsedAudit.levels) ? parsedAudit.levels : [];
  const failed = levels.filter((levelRow) => levelRow.finalStatus !== 'solved');
  return {
    file,
    levels,
    failed,
    failedSet: new Set(failed.map((levelRow) => levelRow.level))
  };
};

const audits = selectedFiles.map(readAudit);

const printFailureSummary = () => {
  console.log('Failure counts and failing levels:');
  for (const audit of audits) {
    const failLevels = audit.failed.map((levelRow) => levelRow.level).sort((a, b) => a - b);
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

const printStabilitySummary = () => {
  const appearanceCounts = new Map();
  for (const audit of audits) {
    for (const level of audit.failedSet) {
      appearanceCounts.set(level, (appearanceCounts.get(level) || 0) + 1);
    }
  }

  const persistent = [...appearanceCounts.entries()]
    .filter(([, count]) => count === audits.length)
    .map(([level]) => level)
    .sort((a, b) => a - b);

  const volatile = [...appearanceCounts.entries()]
    .filter(([, count]) => count > 0 && count < audits.length)
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => a.level - b.level);

  console.log('Failure stability summary:');
  console.log(`- persistent across all ${audits.length} runs=[${persistent.join(', ')}]`);
  if (volatile.length === 0) {
    console.log('- volatile=[]');
  } else {
    const encoded = volatile.map((entry) => `${entry.level}:${entry.count}/${audits.length}`);
    console.log(`- volatile=[${encoded.join(', ')}]`);
  }
  console.log('');
};

const printTrackedLevelTrajectory = () => {
  const targetLevel = parsed.level;
  const rows = audits.map((audit) => {
    const row = audit.levels.find((levelRow) => levelRow.level === targetLevel);
    if (!row) {
      return {
        file: audit.file,
        finalStatus: 'missing',
        failureCategory: 'missing',
        totalSolveTimeMs: null,
        nodesExpanded: null
      };
    }
    return {
      file: audit.file,
      finalStatus: row.finalStatus,
      failureCategory: row.failureCategory,
      totalSolveTimeMs: row.totalSolveTimeMs,
      nodesExpanded: row.nodesExpanded
    };
  });

  console.log(`Level ${targetLevel} trajectory:`);
  for (const row of rows) {
    console.log(
      `- ${row.file}: status=${row.finalStatus}; category=${row.failureCategory}; totalSolveTimeMs=${row.totalSolveTimeMs}; nodes=${row.nodesExpanded}`
    );
  }

  const solvedCount = rows.filter((row) => row.finalStatus === 'solved').length;
  const failedCount = rows.length - solvedCount;
  console.log(`- solved=${solvedCount}/${rows.length}; failed=${failedCount}/${rows.length}`);
};

printFailureSummary();
printWindowTransitions();
printStabilitySummary();
printTrackedLevelTrajectory();
