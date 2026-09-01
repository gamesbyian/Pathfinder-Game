#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
  const eq = arg.indexOf('=');
  return eq === -1 ? [arg.slice(2), 'true'] : [arg.slice(2, eq), arg.slice(eq + 1)];
}));
const dir = args.get('in-dir') || 'artifact-staging';
const out = args.get('out');
const expectedShards = Number(args.get('shards'));

if (!out) {
  console.error('combine-cpsat-explicit-prefix-reference-shards: --out=<path> is required');
  process.exit(2);
}
if (!Number.isInteger(expectedShards) || expectedShards < 1) {
  console.error('combine-cpsat-explicit-prefix-reference-shards: --shards=<positive integer> is required');
  process.exit(2);
}

const files = readdirSync(dir)
  .filter(name => /^cpsat-explicit-prefix-reference-shard-\d+\.json$/u.test(name))
  .sort();
if (files.length !== expectedShards) {
  throw new Error(`missing shard artifacts: found ${files.length}/${expectedShards}`);
}

const docs = files.map(name => JSON.parse(readFileSync(path.join(dir, name), 'utf8')));
const first = docs[0];
const legacyLabelKey = ['oracle', 'Label'].join('');
for (const doc of docs) {
  if (doc.schemaVersion !== 2) {
    throw new Error(`unexpected explicit-prefix shard schemaVersion ${doc.schemaVersion}`);
  }
  for (const row of doc.rows ?? []) {
    if (!('referenceLabel' in row) || legacyLabelKey in row) {
      throw new Error(`noncanonical explicit-prefix result row in shard ${doc.shardIndex}`);
    }
  }
  if (
    doc.solverRef !== first.solverRef ||
    doc.sourceCases !== first.sourceCases ||
    doc.sourceFormat !== first.sourceFormat ||
    doc.requestedTimeLimitSec !== first.requestedTimeLimitSec
  ) {
    throw new Error(`metadata mismatch in shard ${doc.shardIndex}`);
  }
}

const rows = docs.flatMap(doc => doc.rows ?? []);
const seen = new Set();
for (const row of rows) {
  if (seen.has(row.caseId)) throw new Error(`duplicate case across shards: ${row.caseId}`);
  seen.add(row.caseId);
}
const count = label => rows.filter(row => row.referenceLabel === label).length;
const correctnessAlarms = rows.filter(row => row.correctnessAlarm).length;
const inputAlarms = rows.filter(row => row.inputAlarm).length;
const expectedCases = first.selectedCaseCount;
if (rows.length !== expectedCases) {
  throw new Error(`incomplete case coverage: ${rows.length}/${expectedCases}`);
}

const combined = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  solverRef: first.solverRef,
  technique: first.technique,
  sourceCases: first.sourceCases,
  sourceFormat: first.sourceFormat,
  coordinateConvention: first.coordinateConvention,
  requestedTimeLimitSec: first.requestedTimeLimitSec,
  shardCount: expectedShards,
  summary: {
    cases: rows.length,
    live: count('live'),
    dead: count('dead'),
    abstain: count('timeout/abstain'),
    correctnessAlarms,
    inputAlarms,
  },
  rows,
  caution: first.caution,
};
writeFileSync(out, `${JSON.stringify(combined, null, 2)}\n`);
console.log(
  `Combined ${rows.length} cases: ${combined.summary.live} live / ${combined.summary.dead} dead / ${combined.summary.abstain} abstain`,
);
if (correctnessAlarms || inputAlarms) process.exitCode = 2;
