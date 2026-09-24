#!/usr/bin/env node
/**
 * Pre-v4 Hint codec baseline benchmark.
 *
 * This does not choose or implement schema v4. It freezes the measurement vocabulary that any
 * candidate codec must beat while preserving decoded Hint semantics.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';
import { performance } from 'node:perf_hooks';
import { decodeHintArtifact, hintPaths } from '../modules/domain/hint-runtime.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';
import { discoverHintStoreDirs, hintStoreLabel } from './hint-store-roots.mjs';

const ROOTS = discoverHintStoreDirs(process.cwd()).map(dir => ({ corpus: hintStoreLabel(dir), dir }));

function pct(values, p) {
  if (!values.length) return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  const i=Math.min(sorted.length-1, Math.max(0, Math.ceil(sorted.length*p)-1));
  return sorted[i];
}

export function measureHintArtifact(rawText) {
  const rawBytes=Buffer.byteLength(rawText);
  const t0=performance.now();
  const decoded=decodeHintArtifact(JSON.parse(rawText));
  const decodeMs=performance.now()-t0;
  const semantic=stableStringify(decoded);
  const pathOnly=JSON.stringify({ hints: hintPaths(decoded) });
  return {
    hints: decoded.length,
    provenanceEvents: decoded.reduce((n,h)=>n+(h.provenance?.length??0),0),
    rawBytes,
    rawGzipBytes: gzipSync(rawText).byteLength,
    semanticBytes: Buffer.byteLength(semantic),
    pathOnlyBytes: Buffer.byteLength(pathOnly),
    pathOnlyGzipBytes: gzipSync(pathOnly).byteLength,
    decodeMs,
  };
}

export function summarizeMeasurements(rows) {
  const sum = key => rows.reduce((n,r)=>n+r[key],0);
  const rawBytes=rows.map(r=>r.rawBytes);
  const rawGzip=rows.map(r=>r.rawGzipBytes);
  return {
    files: rows.length,
    hints: sum('hints'),
    provenanceEvents: sum('provenanceEvents'),
    bytes: {
      raw: sum('rawBytes'),
      rawGzip: sum('rawGzipBytes'),
      decodedSemantic: sum('semanticBytes'),
      pathOnly: sum('pathOnlyBytes'),
      pathOnlyGzip: sum('pathOnlyGzipBytes'),
    },
    fileDistribution: {
      rawBytes: { p50:pct(rawBytes,.5), p95:pct(rawBytes,.95), p99:pct(rawBytes,.99), max:pct(rawBytes,1) },
      rawGzipBytes: { p50:pct(rawGzip,.5), p95:pct(rawGzip,.95), p99:pct(rawGzip,.99), max:pct(rawGzip,1) },
    },
    decodeMs: {
      total: Number(sum('decodeMs').toFixed(3)),
      p50: Number(pct(rows.map(r=>r.decodeMs),.5).toFixed(3)),
      p95: Number(pct(rows.map(r=>r.decodeMs),.95).toFixed(3)),
      max: Number(pct(rows.map(r=>r.decodeMs),1).toFixed(3)),
    },
  };
}

function files(dir) {
  if (!statSync(dir).isDirectory()) return [];
  return readdirSync(dir).filter(n=>n.endsWith('.json') && !n.startsWith('_')).sort();
}

export function benchmarkHintCodecBaseline(root=process.cwd()) {
  const corpora=[];
  for(const spec of ROOTS){
    const dir=path.join(root,spec.dir);
    const rows=files(dir).map(name=>measureHintArtifact(readFileSync(path.join(dir,name),'utf8')));
    corpora.push({ corpus:spec.corpus, dir:spec.dir, ...summarizeMeasurements(rows) });
  }
  const totals = {
    files: corpora.reduce((n,c)=>n+c.files,0),
    hints: corpora.reduce((n,c)=>n+c.hints,0),
    provenanceEvents: corpora.reduce((n,c)=>n+c.provenanceEvents,0),
    bytes: {
      raw: corpora.reduce((n,c)=>n+c.bytes.raw,0),
      rawGzip: corpora.reduce((n,c)=>n+c.bytes.rawGzip,0),
      decodedSemantic: corpora.reduce((n,c)=>n+c.bytes.decodedSemantic,0),
      pathOnly: corpora.reduce((n,c)=>n+c.bytes.pathOnly,0),
      pathOnlyGzip: corpora.reduce((n,c)=>n+c.bytes.pathOnlyGzip,0),
    },
    decodeMs: {
      total: Number(corpora.reduce((n,c)=>n+c.decodeMs.total,0).toFixed(3)),
    },
  };
  return {
    schemaVersion:1,
    kind:'pathfinder-hint-codec-baseline-benchmark',
    codec:'current-v1-v3-compatible-canonical-json',
    generatedAt:new Date().toISOString(),
    corpora,
    totals,
    semantics:{
      purpose:'pre-v4 measurement baseline only; no encoding choice implied',
      equalityBoundary:'all candidates must decode to the same ordered semantic Hint[]',
      requiredComparisons:['raw bytes','gzip bytes','decode cost','path-only delivery bytes','diff/reviewability assessed separately'],
    },
  };
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) {
  const report=benchmarkHintCodecBaseline();
  const outArg=process.argv.find(a=>a.startsWith('--out='))?.slice(6);
  if(outArg) writeFileSync(outArg, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
