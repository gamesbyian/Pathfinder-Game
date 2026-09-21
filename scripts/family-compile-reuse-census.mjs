#!/usr/bin/env node
/**
 * Family compilation-reuse census.
 *
 * Measures which broad prep dependency classes remain invariant across committed generated variants.
 * This is opportunity sizing only. It does not claim that a class can be cached until the field-level
 * dependency proof in reports/2026-09-20-compiled-level-solve-context-boundary-audit.md is satisfied.
 */
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).sort().join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k)+':'+stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value ?? null);
}

function coordFields(raw, fields) {
  return Object.fromEntries(fields.map(field => [field, raw?.[field] ?? null]));
}

function dependencySignatures(raw) {
  return {
    grid: stable(raw?.grid ?? null),
    challengeMetric: stable({ reqLen: raw?.reqLen ?? null, reqInt: raw?.reqInt ?? null }),
    endpoints: stable(coordFields(raw, ['gates', 'goal'])),
    staticOccupancy: stable(coordFields(raw, ['blocks', 'falseGoals', 'geese'])),
    obligations: stable(coordFields(raw, ['mustPass', 'mustCross'])),
    mechanics: stable(coordFields(raw, ['filters', 'flippingFilters', 'portals'])),
    landmarks: stable(raw?.landmarks ?? null),
  };
}

function loadCorpus(root, relative, cache) {
  if (cache.has(relative)) return cache.get(relative);
  const absolute = path.resolve(root, relative);
  if (!existsSync(absolute)) throw new Error(`missing parent corpus: ${relative}`);
  const doc = readJson(absolute);
  const levels = Array.isArray(doc) ? doc : doc.levels;
  if (!Array.isArray(levels)) throw new Error(`${relative} has no level array`);
  cache.set(relative, levels);
  return levels;
}

function companionFamilyPath(manifestPath) {
  return manifestPath.replace(/-manifest\.json$/u, '.json');
}

export function analyzeFamilyCompileReuse(root) {
  const familyRoot = path.join(root, 'data', 'families');
  const manifests = walk(familyRoot).filter(file => file.endsWith('-manifest.json'));
  const corpusCache = new Map();
  const rows = [];

  for (const manifestPath of manifests) {
    const manifest = readJson(manifestPath);
    if (!Array.isArray(manifest?.variants) || !manifest.parentCorpus || !manifest.parentLevelId) continue;

    const familyPath = companionFamilyPath(manifestPath);
    if (!existsSync(familyPath)) continue;
    const variantsDoc = readJson(familyPath);
    const variantLevels = Array.isArray(variantsDoc) ? variantsDoc : variantsDoc.levels;
    if (!Array.isArray(variantLevels)) continue;
    const variantById = new Map(variantLevels.map(v => [String(v?.id ?? ''), v]));

    const parents = loadCorpus(root, manifest.parentCorpus, corpusCache);
    const parent = parents.find(level => String(level?.id ?? '') === String(manifest.parentLevelId));
    if (!parent) continue;
    const p = dependencySignatures(parent);

    for (const vm of manifest.variants) {
      const variantId = String(vm?.variantId ?? vm?.id ?? '');
      const child = variantById.get(variantId);
      if (!child) continue;
      const v = dependencySignatures(child);
      const invariant = Object.fromEntries(Object.keys(p).map(key => [key, p[key] === v[key]]));
      rows.push({
        familyId: manifest.familyId ?? null,
        parentLevelId: manifest.parentLevelId,
        parentCorpus: manifest.parentCorpus,
        familyMode: manifest.familyMode ?? null,
        relation: vm.relation ?? null,
        variantId,
        invariant,
        allExceptChallengeMetric: Object.entries(invariant).every(([key, same]) => key === 'challengeMetric' || same),
        allExceptSingleClass: Object.values(invariant).filter(value => !value).length <= 1,
        changedClasses: Object.entries(invariant).filter(([,same]) => !same).map(([key]) => key),
      });
    }
  }

  const classes = ['grid','challengeMetric','endpoints','staticOccupancy','obligations','mechanics','landmarks'];
  const summarizeSubset = subset => ({
    variants: subset.length,
    invariantCounts: Object.fromEntries(classes.map(key => [key, subset.filter(row => row.invariant[key]).length])),
    invariantRates: Object.fromEntries(classes.map(key => [key, subset.length ? subset.filter(row => row.invariant[key]).length / subset.length : null])),
    allExceptChallengeMetric: subset.filter(row => row.allExceptChallengeMetric).length,
    allExceptSingleClass: subset.filter(row => row.allExceptSingleClass).length,
  });

  const modes = [...new Set(rows.map(row => String(row.familyMode ?? 'unknown')))].sort();
  return {
    schemaVersion: 1,
    kind: 'pathfinder-family-compile-reuse-census',
    evidenceRole: 'development-opportunity-census',
    inferenceScope: 'broad family delta invariance; not proof of cache-key sufficiency',
    summary: {
      ...summarizeSubset(rows),
      familyCount: new Set(rows.map(row => row.familyId)).size,
      byMode: Object.fromEntries(modes.map(mode => [mode, summarizeSubset(rows.filter(row => String(row.familyMode ?? 'unknown') === mode))])),
    },
    rows,
  };
}

async function main() {
  const root = new URL('..', import.meta.url).pathname;
  const report = analyzeFamilyCompileReuse(root);
  const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(arg => {
    const i = arg.indexOf('=');
    return [i >= 0 ? arg.slice(0,i) : arg, i >= 0 ? arg.slice(i+1) : true];
  }));
  const out = path.resolve(String(args.get('--out') || path.join(root,'tmp','family-compile-reuse-census.json')));
  mkdirSync(path.dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ out, ...report.summary }, null, 2));
}
if (process.argv[1] && path.basename(process.argv[1]).includes('family-compile-reuse-census')) await main();
