#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

const getArgValue = (prefix, fallback = null) => {
  const found = args.find((arg) => arg.startsWith(`${prefix}=`));
  return found ? found.slice(prefix.length + 1) : fallback;
};

const parseNumber = (raw, fallback) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const levelsArg = getArgValue('--levels', '7');
const watchedLevels = levelsArg
  .split(',')
  .map((entry) => Number(entry.trim()))
  .filter((entry) => Number.isFinite(entry) && entry > 0);

if (watchedLevels.length === 0) {
  console.error('No valid watched levels provided. Example: --levels=7,92');
  process.exit(1);
}

const maxConsecutiveFailures = Math.max(1, parseNumber(getArgValue('--max-consecutive-failures', '1'), 1));
const windowSize = Math.max(maxConsecutiveFailures + 1, parseNumber(getArgValue('--window', '3'), 3));
const sourceDir = path.resolve(getArgValue('--dir', 'audits/raw'));

if (!fs.existsSync(sourceDir)) {
  console.error(`Audit directory not found: ${sourceDir}`);
  process.exit(1);
}

const allFiles = fs
  .readdirSync(sourceDir)
  .filter((file) => file.endsWith('.json') && file !== 'latest.json')
  .sort();

if (allFiles.length === 0) {
  console.error(`No audit JSON files found in: ${sourceDir}`);
  process.exit(1);
}

const files = allFiles.slice(-windowSize);

const parseAudit = (file) => {
  const fullPath = path.join(sourceDir, file);
  const payload = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const levels = Array.isArray(payload?.levels) ? payload.levels : [];
  return {
    file,
    byLevel: new Map(levels.map((row) => [Number(row?.level), row]))
  };
};

const audits = files.map(parseAudit);

const getStatus = (row) => `${row?.finalStatus || row?.status || 'missing'}`;
const isSolved = (status) => status === 'solved' || status === 'success';

let failures = 0;
console.log(`Regression guard window: ${files.length} file(s), max consecutive failures allowed: ${maxConsecutiveFailures}`);
console.log(`Files: ${files.join(', ')}`);

for (const levelNumber of watchedLevels) {
  let streak = 0;
  let worstStreak = 0;
  const trajectory = [];

  for (const audit of audits) {
    const row = audit.byLevel.get(levelNumber);
    const status = getStatus(row);
    const solved = isSolved(status);
    streak = solved ? 0 : (streak + 1);
    worstStreak = Math.max(worstStreak, streak);
    trajectory.push(`${audit.file}:${status}`);
  }

  console.log(`Level ${levelNumber}: ${trajectory.join(' | ')}`);

  if (worstStreak > maxConsecutiveFailures) {
    console.error(`Level ${levelNumber} exceeded consecutive-failure guard (worstStreak=${worstStreak}, allowed=${maxConsecutiveFailures}).`);
    failures += 1;
  }
}

if (failures > 0) {
  process.exit(1);
}

console.log('Regression guard passed.');
