#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { levelFeatures, levelDistance, packedToPair } from './features.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORPORA = [
  { key: 'published', file: 'data/levels.json', hintsDir: 'data/hints' },
  { key: 'stress1', file: 'data/stress/stress-levels.json' },
  { key: 'stress2', file: 'data/stress/stress-levels-random.json' },
  { key: 'envelope', file: 'data/stress/stress-levels-envelope.json' },
];
const MECH = ['mustPass', 'mustCross', 'portalPairs', 'flippers', 'staticFilters', 'geese', 'falseGoals', 'surround', 'mustTurn', 'adjTurn'];

function readJson(rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); }
function quantile(values, q) {
  if (!values.length) return null;
  const a = [...values].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (pos - lo);
}
function stats(values) {
  const a = values.filter(Number.isFinite);
  return { n: a.length, min: a.length ? Math.min(...a) : null, p25: quantile(a, .25), median: quantile(a, .5), p75: quantile(a, .75), max: a.length ? Math.max(...a) : null, mean: a.length ? a.reduce((s, v) => s + v, 0) / a.length : null };
}
function inc(map, key, n = 1) { map[key] = (map[key] || 0) + n; }
function sorted(map) { return Object.fromEntries(Object.entries(map).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))); }
function firstPublishedWitness(index) {
  const p = path.join(root, 'data/hints', `${String(index + 1).padStart(5, '0')}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    const hints = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(hints) && Array.isArray(hints[0]) ? hints[0].map(packedToPair) : null;
  } catch { return null; }
}
function loadCorpus(spec) {
  const parsed = readJson(spec.file);
  const levels = Array.isArray(parsed) ? parsed : parsed.levels;
  return { ...spec, parsed, rows: levels.map((level, index) => {
    const witness = spec.key === 'published' ? firstPublishedWitness(index) : (level?.stressMeta?.witnessSolution || null);
    return { level, index, witness, features: levelFeatures(level, witness) };
  }) };
}

function summarizePopulation(corpus) {
  const rows = corpus.rows;
  const presence = {}, counts = {}, routing = {}, mechanicKinds = [], grids = {}, generations = {}, batches = {};
  for (const key of MECH) counts[key] = [];
  const witness = { coverage: [], perimeterFrac: [], centerFrac: [], turnRate: [], meanRun: [], jumps: [], crossCount: [], closureRatio: [] };
  for (const row of rows) {
    const f = row.features;
    inc(grids, `${f.w}x${f.h}`);
    inc(routing, f.routingRegime);
    const version = row.level?.stressMeta?.generatorVersion || row.level?.provenance?.history?.find(e => e?.detail?.generatorVersion)?.detail?.generatorVersion || '(none)';
    inc(generations, version);
    inc(batches, row.level?.stressMeta?.generationBatch || '(none)');
    let kinds = 0;
    for (const key of MECH) {
      counts[key].push(f[key]);
      if (f[key] > 0) kinds++;
    }
    mechanicKinds.push(kinds);
    if (f.witness) for (const key of Object.keys(witness)) witness[key].push(f.witness[key]);
  }
  for (const key of MECH) presence[key] = rows.length ? counts[key].filter(v => v > 0).length / rows.length : 0;
  const cooccurrence = {};
  for (let i = 0; i < MECH.length; i++) for (let j = i + 1; j < MECH.length; j++) {
    const a = MECH[i], b = MECH[j];
    cooccurrence[`${a}+${b}`] = rows.filter(r => r.features[a] > 0 && r.features[b] > 0).length;
  }
  return {
    rows: rows.length,
    grids: sorted(grids),
    generatorVersions: sorted(generations),
    generationBatches: sorted(batches),
    routingRegimes: sorted(routing),
    reqLen: stats(rows.map(r => r.features.reqLen)),
    reqInt: stats(rows.map(r => r.features.reqInt)),
    requiredPathCoverageRatio: stats(rows.map(r => r.features.requiredPathCoverageRatio)),
    mechanicKinds: stats(mechanicKinds),
    mechanicPresence: presence,
    mechanicCounts: Object.fromEntries(MECH.map(k => [k, stats(counts[k])])),
    mechanicPairCooccurrence: sorted(cooccurrence),
    witnessSupportRows: rows.filter(r => r.features.witness).length,
    witness: Object.fromEntries(Object.entries(witness).map(([k, v]) => [k, stats(v)])),
    generationStats: Array.isArray(corpus.parsed) ? null : (corpus.parsed.generationStats || null),
  };
}

function nearestNeighbourSummary(corpora) {
  const all = corpora.flatMap(c => c.rows.map(r => ({ corpus: c.key, id: r.level?.id || `${c.key}:${r.index + 1}`, f: r.features })));
  const byCorpus = {};
  for (const c of corpora) byCorpus[c.key] = { within: [], nearestAny: [], nearestOtherCorpus: [], ownerOfNearestAny: {} };
  for (let i = 0; i < all.length; i++) {
    let bestAny = Infinity, bestWithin = Infinity, bestOther = Infinity, owner = null;
    for (let j = 0; j < all.length; j++) {
      if (i === j) continue;
      const d = levelDistance(all[i].f, all[j].f);
      if (d < bestAny) { bestAny = d; owner = all[j].corpus; }
      if (all[i].corpus === all[j].corpus && d < bestWithin) bestWithin = d;
      if (all[i].corpus !== all[j].corpus && d < bestOther) bestOther = d;
    }
    const s = byCorpus[all[i].corpus];
    s.nearestAny.push(bestAny);
    if (Number.isFinite(bestWithin)) s.within.push(bestWithin);
    if (Number.isFinite(bestOther)) s.nearestOtherCorpus.push(bestOther);
    inc(s.ownerOfNearestAny, owner || '(none)');
  }
  return Object.fromEntries(Object.entries(byCorpus).map(([k, v]) => [k, {
    nearestAny: stats(v.nearestAny),
    nearestWithinCorpus: stats(v.within),
    nearestOtherCorpus: stats(v.nearestOtherCorpus),
    nearestAnyOwner: sorted(v.ownerOfNearestAny),
  }]));
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out); else out.push(p);
  }
  return out;
}
function exposureLowerBound(corpora) {
  const ids = new Map();
  for (const c of corpora) for (const row of c.rows) if (row.level?.id) ids.set(row.level.id, { corpus: c.key, files: new Set(), mentions: 0 });
  const roots = ['reports', 'docs', '.github/workflows', 'scripts'];
  const allowed = /\.(md|json|mjs|js|ts|yml|yaml)$/i;
  const corpusFiles = new Set(CORPORA.map(c => path.normalize(path.join(root, c.file))));
  let scannedFiles = 0;
  for (const rel of roots) for (const file of walkFiles(path.join(root, rel))) {
    if (!allowed.test(file) || corpusFiles.has(path.normalize(file))) continue;
    let text; try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    scannedFiles++;
    const found = new Set(text.match(/\b(?:L|S|R|E)\d{3,6}\b/g) || []);
    for (const id of found) if (ids.has(id)) {
      const rec = ids.get(id);
      const re = new RegExp(`\\b${id}\\b`, 'g');
      rec.mentions += (text.match(re) || []).length;
      rec.files.add(path.relative(root, file));
    }
  }
  const summary = {};
  for (const c of corpora) {
    const recs = [...ids.entries()].filter(([, v]) => v.corpus === c.key).map(([id, v]) => ({ id, files: v.files.size, mentions: v.mentions }));
    summary[c.key] = {
      rows: recs.length,
      explicitlyReferencedRows: recs.filter(r => r.files > 0).length,
      referenceFileCount: stats(recs.map(r => r.files)),
      mentionCount: stats(recs.map(r => r.mentions)),
      mostReferenced: recs.sort((a, b) => b.files - a.files || b.mentions - a.mentions || a.id.localeCompare(b.id)).slice(0, 25),
    };
  }
  return { scannedFiles, note: 'Lower bound only: explicit level-id references in reports/docs/workflows/scripts. Aggregate corpus use without row ids is not attributed.', corpora: summary };
}

const corpora = CORPORA.map(loadCorpus);
const output = {
  generatedAt: new Date().toISOString(),
  purpose: 'Population-validity/dependence audit. Descriptive only; no solver outcomes are used.',
  caveats: [
    'Accepted stress rows are conditioned on witness success, validation, novelty rejection, and placement feasibility; retained distributions are not the raw proposal priors.',
    'Nearest-neighbour distances use the repository levelDistance descriptor and are diagnostics, not proof of statistical independence.',
    'Explicit-reference exposure is a conservative lower bound, not a complete decision genealogy.',
  ],
  populations: Object.fromEntries(corpora.map(c => [c.key, summarizePopulation(c)])),
  nearestNeighbours: nearestNeighbourSummary(corpora),
  researchExposureLowerBound: exposureLowerBound(corpora),
};
console.log(JSON.stringify(output, null, 2));
