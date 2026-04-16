#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const enforceSolved = args.has('--enforce-solved');
const sourceArg = [...args].find((arg) => arg.startsWith('--file='));
const sourceFile = sourceArg ? sourceArg.slice('--file='.length) : 'audits/raw/latest.json';
const hardLevels = [61, 92, 108, 134];

const fullPath = path.resolve(sourceFile);
if (!fs.existsSync(fullPath)) {
  console.error(`Audit file not found: ${fullPath}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const levels = Array.isArray(payload?.levels) ? payload.levels : [];
const byLevel = new Map(levels.map((row) => [Number(row?.level), row]));

let failures = 0;
for (const levelNumber of hardLevels) {
  const row = byLevel.get(levelNumber);
  if (!row) {
    console.error(`Level ${levelNumber}: missing from audit payload.`);
    failures += 1;
    continue;
  }
  const status = `${row.finalStatus || row.status || 'unknown'}`;
  const category = `${row.failureCategory || 'n/a'}`;
  console.log(`Level ${levelNumber}: status=${status}; category=${category}`);
  if (enforceSolved && status !== 'solved') {
    console.error(`Level ${levelNumber} is not solved (status=${status}).`);
    failures += 1;
  }
}

if (failures > 0) process.exit(1);
console.log(enforceSolved
  ? 'Persistent hard-level gate passed: all targeted levels solved.'
  : 'Persistent hard-level report generated (run with --enforce-solved to gate).');
