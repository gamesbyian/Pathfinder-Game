#!/usr/bin/env node
/**
 * Prints a stable "what's slow" summary from the JSON reporter output `npm run test:coverage` /
 * `test:unit` write alongside their normal console output (see vitest.config.mjs's `reporters`).
 *
 * Exists so nobody has to eyeball a wall of dot-reporter output (or, worse, a multi-minute CI log)
 * to find out which file or test grew the suite's wall time — the report below answers that in one
 * glance, every run. Report-only: it never fails the build, it just makes the cost visible.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPORT_PATH = process.argv[2] || 'tmp/vitest-timings.json';
const TOP_N = 15;

if (!fs.existsSync(REPORT_PATH)) {
  console.error(`vitest-slow-test-report: no report found at ${REPORT_PATH} (run vitest with --reporter=json --outputFile=${REPORT_PATH} first)`);
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const cwd = process.cwd();

const files = data.testResults.map((file) => ({
  name: path.relative(cwd, file.name),
  ms: file.endTime - file.startTime,
  tests: file.assertionResults.length,
}));

const tests = data.testResults.flatMap((file) =>
  file.assertionResults.map((assertion) => ({
    file: path.relative(cwd, file.name),
    name: assertion.fullName || assertion.title,
    ms: assertion.duration ?? 0,
  })),
);

const fmt = (ms) => `${(ms / 1000).toFixed(1)}s`;

function printTop(label, rows, count) {
  console.log(`\n--- ${label} (top ${Math.min(count, rows.length)} of ${rows.length}) ---`);
  const sorted = [...rows].sort((a, b) => b.ms - a.ms).slice(0, count);
  for (const row of sorted) console.log(row.line());
}

printTop('slowest Vitest files', files.map((f) => ({
  ms: f.ms,
  line: () => `  ${fmt(f.ms).padStart(7)}  ${f.name} (${f.tests} tests)`,
})), TOP_N);

printTop('slowest individual tests', tests.map((t) => ({
  ms: t.ms,
  line: () => `  ${fmt(t.ms).padStart(7)}  ${t.file} > ${t.name}`,
})), TOP_N);

const totalTestMs = tests.reduce((sum, t) => sum + t.ms, 0);
const totalFileMs = files.reduce((sum, f) => sum + f.ms, 0);
console.log(`\n${data.numTotalTests} tests across ${data.numTotalTestSuites} files. `
  + `Sum of per-test durations: ${fmt(totalTestMs)}. Sum of per-file wall time (file-level parallelism `
  + `already collapses most of this): ${fmt(totalFileMs)}.`);
