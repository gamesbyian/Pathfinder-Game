#!/usr/bin/env node
import assert from 'node:assert/strict';
import { measureHintArtifact, summarizeMeasurements } from './hint-codec-baseline-benchmark.mjs';

const row=measureHintArtifact(JSON.stringify({
  schemaVersion:3,
  hints:[
    { path:[1,2,3], provenance:[{ solver:{id:'pathfinder-solver',version:null,technique:'dfs'}, search:{termination:'solved'}, context:{levelRevision:null}, foundAt:'2026-09-23T00:00:00.000Z' }] },
    { path:[4,5,6], provenance:[] }
  ]
}));
assert.equal(row.hints,2);
assert.equal(row.provenanceEvents,1);
assert.ok(row.rawBytes>0);
assert.ok(row.rawGzipBytes>0);
assert.ok(row.pathOnlyBytes<row.rawBytes);
const summary=summarizeMeasurements([row,row]);
assert.equal(summary.files,2);
assert.equal(summary.hints,4);
assert.equal(summary.provenanceEvents,2);
assert.equal(summary.bytes.raw,row.rawBytes*2);
assert.ok(summary.fileDistribution.rawBytes.p50>0);
console.log('hint-codec-baseline-benchmark-node-test: ok');
