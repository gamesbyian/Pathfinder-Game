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

const docs = files.map(name => ({
  name,
  document: JSON.parse(readFileSync(path.join(dir, name), 'utf8')),
}));
const first = docs[0].document;
const legacyLabelKey = ['oracle', 'Label'].join('');
const shardIndices = new Set();
for (const { name, document: doc } of docs) {
  const fileIndex = Number(name.match(/-(\d+)\.json$/u)?.[1]);
  if (doc.shardCount !== expectedShards) {
    throw new Error(`shard ${doc.shardIndex} declares shardCount=${doc.shardCount}; expected ${expectedShards}`);
  }
  if (!Number.isInteger(doc.shardIndex) || doc.shardIndex < 1 || doc.shardIndex > expectedShards) {
    throw new Error(`invalid shardIndex ${JSON.stringify(doc.shardIndex)}`);
  }
  if (doc.shardIndex !== fileIndex) {
    throw new Error(`shard filename/index mismatch: ${name} contains shardIndex=${doc.shardIndex}`);
  }
  if (shardIndices.has(doc.shardIndex)) throw new Error(`duplicate shardIndex ${doc.shardIndex}`);
  shardIndices.add(doc.shardIndex);
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
    doc.technique !== first.technique ||
    doc.sourceCases !== first.sourceCases ||
    doc.sourceFormat !== first.sourceFormat ||
    doc.coordinateConvention !== first.coordinateConvention ||
    doc.requestedTimeLimitSec !== first.requestedTimeLimitSec ||
    doc.selectedCaseCount !== first.selectedCaseCount
  ) {
    throw new Error(`metadata mismatch in shard ${doc.shardIndex}`);
  }
  const expectedRows = doc.selectedCaseCount < doc.shardIndex
    ? 0
    : Math.floor((doc.selectedCaseCount - doc.shardIndex) / expectedShards) + 1;
  if ((doc.rows?.length ?? 0) !== expectedRows) {
    throw new Error(
      `incomplete shard ${doc.shardIndex}: found ${doc.rows?.length ?? 0}/${expectedRows} round-robin case rows`,
    );
  }
}
const expectedIndexList = Array.from({ length: expectedShards }, (_, index) => index + 1);
if (JSON.stringify([...shardIndices].sort((a, b) => a - b)) !== JSON.stringify(expectedIndexList)) {
  throw new Error(`incomplete shard-index coverage: observed ${[...shardIndices].sort((a, b) => a - b).join(',')}`);
}

const rows = docs.flatMap(({ document }) => document.rows ?? []);
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
