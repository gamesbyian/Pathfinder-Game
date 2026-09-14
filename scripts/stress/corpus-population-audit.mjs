#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { levelFeatures, levelDistance } from './features.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CORPORA = [
  { key: 'published', file: 'data/levels.json' },
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
function loadCorpus(spec) {
  const parsed = readJson(spec.file);
  const levels = Array.isArray(parsed) ? parsed : parsed.levels;
  return { ...spec, parsed, rows: levels.map((level, index) => {
    const witness = spec.key === 'published' ? null : (level?.stressMeta?.witnessSolution || null);
    return {
      level,
      index,
      witness,
      features: levelFeatures(level, witness),
      comparableFeatures: levelFeatures(level, null),
    };
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
  const header = Array.isArray(corpus.parsed) ? null : {
    generatedAt: corpus.parsed.generatedAt ?? null,
    generatorVersion: corpus.parsed.generatorVersion ?? null,
    masterSeed: corpus.parsed.masterSeed ?? null,
    generationStats: corpus.parsed.generationStats ?? null,
    appendHistory: corpus.parsed.appendHistory ?? null,
  };
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
    wrapperGenerationMetadata: header,
  };
}

function nearestNeighbourSummary(corpora) {
  // Deliberately omit witness-only dimensions for every row. Published rows do not carry
  // construction witnesses, and levelDistance renormalizes when witness dimensions are absent;
  // mixing witnessed and unwitnessed comparisons would make distances non-comparable.
  const all = corpora.flatMap(c => c.rows.map(r => ({
    corpus: c.key,
    id: r.level?.id || `${c.key}:${r.index + 1}`,
    f: r.comparableFeatures,
  })));
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

const corpora = CORPORA.map(loadCorpus);
const output = {
  generatedAt: new Date().toISOString(),
  purpose: 'Population-validity/dependence audit. Descriptive only; no solver outcomes are used.',
  caveats: [
    'Accepted stress rows are conditioned on witness success, validation, novelty rejection, and placement feasibility; retained distributions are not the raw proposal priors.',
    'Nearest-neighbour distances intentionally omit witness-only dimensions so all four populations use one comparable feature contract.',
    'Nearest-neighbour distances are diagnostics, not proof of statistical independence or a replacement for family/generator ancestry.',
    'Research-exposure genealogy is intentionally not inferred from raw id-reference counts: generated aggregate artifacts make that measure misleading.',
  ],
  populations: Object.fromEntries(corpora.map(c => [c.key, summarizePopulation(c)])),
  nearestNeighbours: nearestNeighbourSummary(corpora),
};
console.log(JSON.stringify(output, null, 2));
