#!/usr/bin/env node
/**
 * Shadow-only audit of dependency-local CI routing potential.
 *
 * Builds literal local-import closures for registered validators/Node tests and records where
 * static imports are insufficient because a closure also uses filesystem/process/env/network or
 * nonliteral dynamic loading. This is evidence for future routing, never an activation decision.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const EXTENSIONS = ['.mjs', '.js', '.cjs', '.ts', '.tsx', '.mts', '.cts', '.json'];
const SOURCE_EXTENSIONS = new Set(['.mjs', '.js', '.cjs', '.ts', '.tsx', '.mts', '.cts']);

function normalize(p) {
  return p.split(path.sep).join('/');
}

function parseArgs(argv) {
  const out = { output: 'tmp/ci-dependency-local-routing-audit.json' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output') out.output = argv[++i];
    else if (arg.startsWith('--output=')) out.output = arg.slice(9);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-dependency-local-routing-audit.mjs [--output FILE]');
      process.exit(0);
    } else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function packageEntrypoint(command) {
  if (typeof command !== 'string') return null;
  const matches = [...command.matchAll(/(?:^|\s)((?:scripts|modules)\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|ts|tsx|mts|cts))/gu)];
  if (!matches.length) return null;
  const paths = matches.map(match => match[1]).filter(p => p !== 'scripts/run-bundled.mjs');
  return paths[0] ?? matches[0][1];
}

function localSpecifiers(source) {
  const literal = [];
  const patterns = [
    /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/gu,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/')) literal.push(specifier);
    }
  }
  const dynamicCalls = [...source.matchAll(/\bimport\s*\(/gu)].length;
  const literalDynamic = [...source.matchAll(/\bimport\(\s*['"][^'"]+['"]\s*\)/gu)].length;
  return {
    literal: [...new Set(literal)],
    unknownDynamicCount: Math.max(0, dynamicCalls - literalDynamic),
  };
}

function resolveLocal(importer, specifier) {
  const importerDir = path.dirname(path.join(ROOT, importer));
  const rawBase = specifier.startsWith('/')
    ? path.join(ROOT, specifier.slice(1))
    : path.resolve(importerDir, specifier);

  const candidates = [rawBase];
  if (!path.extname(rawBase)) {
    for (const ext of EXTENSIONS) candidates.push(rawBase + ext);
    for (const ext of EXTENSIONS) candidates.push(path.join(rawBase, `index${ext}`));
  } else if (rawBase.endsWith('.js')) {
    candidates.push(rawBase.slice(0, -3) + '.ts', rawBase.slice(0, -3) + '.tsx');
  } else if (rawBase.endsWith('.mjs')) {
    candidates.push(rawBase.slice(0, -4) + '.mts');
  }

  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isFile()) return normalize(path.relative(ROOT, candidate));
    } catch {}
  }
  return null;
}

function sourceTraits(source) {
  return {
    filesystem: /node:fs|from ['"]fs['"]|require\(['"]fs['"]\)/u.test(source),
    childProcess: /node:child_process|from ['"]child_process['"]|require\(['"]child_process['"]\)/u.test(source),
    environment: /process\.env/u.test(source),
    network: /\bfetch\s*\(|https?:\/\//u.test(source),
  };
}

function mergeTraits(target, source) {
  for (const key of Object.keys(target)) target[key] ||= source[key];
}

function closure(entrypoint) {
  const seen = new Set();
  const stack = [entrypoint];
  const unresolved = [];
  let unknownDynamicCount = 0;
  const traits = { filesystem: false, childProcess: false, environment: false, network: false };

  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    const absolute = path.join(ROOT, current);
    if (!fs.existsSync(absolute)) {
      unresolved.push({ importer: null, specifier: current, reason: 'entrypoint-missing' });
      continue;
    }
    seen.add(current);
    if (!SOURCE_EXTENSIONS.has(path.extname(current))) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    const parsed = localSpecifiers(source);
    unknownDynamicCount += parsed.unknownDynamicCount;
    mergeTraits(traits, sourceTraits(source));
    for (const specifier of parsed.literal) {
      const resolved = resolveLocal(current, specifier);
      if (!resolved) {
        unresolved.push({ importer: current, specifier, reason: 'unresolved-local-import' });
        continue;
      }
      if (!seen.has(resolved)) stack.push(resolved);
    }
  }

  return {
    files: [...seen].sort(),
    unresolved,
    unknownDynamicCount,
    traits,
    staticImportSufficientCandidate:
      unresolved.length === 0
      && unknownDynamicCount === 0
      && !traits.filesystem
      && !traits.childProcess
      && !traits.environment
      && !traits.network,
  };
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

const options = parseArgs(process.argv.slice(2));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'validation-groups.json'), 'utf8'));

const contracts = [];
for (const [registryFamily, outputFamily] of [['validators', 'validator'], ['nodeTests', 'test']]) {
  for (const [ownerGroup, names] of Object.entries(registry[registryFamily] ?? {})) {
    for (const name of names) {
      const command = pkg.scripts?.[name] ?? null;
      const entrypoint = packageEntrypoint(command);
      const surfaces = registry.contractSurfaces?.[registryFamily]?.[name] ?? [ownerGroup];
      const graph = entrypoint ? closure(entrypoint) : null;
      contracts.push({
        family: outputFamily,
        ownerGroup,
        surfaces,
        name,
        command,
        entrypoint,
        graph,
      });
    }
  }
}

const consumers = new Map();
for (const contract of contracts) {
  for (const file of contract.graph?.files ?? []) {
    if (!consumers.has(file)) consumers.set(file, new Set());
    consumers.get(file).add(contract.name);
  }
}

const consumerRows = [...consumers.entries()].map(([file, names]) => ({
  file,
  consumerCount: names.size,
  consumers: [...names].sort(),
})).sort((a, b) => b.consumerCount - a.consumerCount || a.file.localeCompare(b.file));

const traced = contracts.filter(row => row.graph);
const closureSizes = traced.map(row => row.graph.files.length);
const sufficient = traced.filter(row => row.graph.staticImportSufficientCandidate);

const bySurface = {};
for (const surface of ['repo', 'game', 'persistence', 'solver', 'research', 'data', 'shared']) {
  const rows = contracts.filter(row => row.surfaces.includes(surface) || (surface === 'shared' && row.ownerGroup === 'shared'));
  const tracedRows = rows.filter(row => row.graph);
  bySurface[surface] = {
    contracts: rows.length,
    tracedContracts: tracedRows.length,
    staticImportSufficientCandidates: tracedRows.filter(row => row.graph.staticImportSufficientCandidate).length,
    withUnresolvedEdges: tracedRows.filter(row => row.graph.unresolved.length > 0).length,
    withUnknownDynamicImports: tracedRows.filter(row => row.graph.unknownDynamicCount > 0).length,
    withFilesystemDependency: tracedRows.filter(row => row.graph.traits.filesystem).length,
    withChildProcessDependency: tracedRows.filter(row => row.graph.traits.childProcess).length,
    withEnvironmentDependency: tracedRows.filter(row => row.graph.traits.environment).length,
    withNetworkDependency: tracedRows.filter(row => row.graph.traits.network).length,
  };
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  note: 'Shadow-only lower-bound import graph. Static import reachability is never sufficient evidence for contracts with unresolved/dynamic/filesystem/process/env/network dependencies.',
  summary: {
    contracts: contracts.length,
    contractsWithEntrypoints: traced.length,
    staticImportSufficientCandidates: sufficient.length,
    contractsWithUnresolvedEdges: traced.filter(row => row.graph.unresolved.length > 0).length,
    contractsWithUnknownDynamicImports: traced.filter(row => row.graph.unknownDynamicCount > 0).length,
    closureSize: {
      median: percentile(closureSizes, 0.5),
      p90: percentile(closureSizes, 0.9),
      max: closureSizes.length ? Math.max(...closureSizes) : null,
    },
    sourceFilesWithRegisteredConsumers: consumerRows.length,
  },
  bySurface,
  topSharedDependencies: consumerRows.slice(0, 100),
  contracts,
};

const outPath = path.resolve(ROOT, options.output);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
  summary: output.summary,
  bySurface: output.bySurface,
  topSharedDependencies: output.topSharedDependencies.slice(0, 20),
}, null, 2));
