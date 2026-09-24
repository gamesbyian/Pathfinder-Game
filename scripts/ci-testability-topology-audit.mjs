#!/usr/bin/env node
/**
 * Static topology audit for Pathfinder's permanent CI validation graph.
 *
 * This is intentionally observational and dependency-free. It reads package.json plus
 * scripts/validation-groups.json, inspects each local validator / Node-test entrypoint, and reports
 * structural traits that affect CI economics and testability:
 * - invocation/runtime mode,
 * - subprocess/bundling boundaries,
 * - temporary/filesystem activity,
 * - direct repository-data dependencies,
 * - source-grep / repository-authority coupling,
 * - environment/network/git dependencies,
 * - likely direct-module candidates.
 *
 * The output is not a delete/keep score. It is a refactor map: broad or expensive execution should
 * become easier to scope when contracts have narrow inputs, small fixtures, and direct-import seams.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv) {
  const out = {
    root: process.cwd(),
    output: 'tmp/ci-testability-topology.json',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root') out.root = argv[++i];
    else if (arg.startsWith('--root=')) out.root = arg.slice(7);
    else if (arg === '--output') out.output = argv[++i];
    else if (arg.startsWith('--output=')) out.output = arg.slice(9);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/ci-testability-topology-audit.mjs [--root DIR] [--output FILE]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return out;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseCommand(command) {
  let match;
  if ((match = command.match(/^node scripts\/run-bundled\.mjs\s+([^\s]+)/u))) {
    return { invocation: 'run-bundled', entrypoint: match[1] };
  }
  if ((match = command.match(/^node\s+([^\s]+)/u))) {
    return { invocation: 'node', entrypoint: match[1] };
  }
  if ((match = command.match(/^tsx\s+([^\s]+)/u))) {
    return { invocation: 'tsx', entrypoint: match[1] };
  }
  if (/^tsc\b/u.test(command)) return { invocation: 'tsc', entrypoint: null };
  if (/^eslint\b/u.test(command)) return { invocation: 'eslint', entrypoint: null };
  if (/^vitest\b/u.test(command)) return { invocation: 'vitest', entrypoint: null };
  if (/^npm\b/u.test(command)) return { invocation: 'npm', entrypoint: null };
  return { invocation: 'other', entrypoint: null };
}

function sourceFeatures(source) {
  const childProcess = /node:child_process|from ['"]child_process['"]/u.test(source);
  const tempFiles = /\bmkdtemp(?:Sync)?\b|\btmpdir\(\)|\bos\.tmpdir\b/u.test(source);
  const writesFiles = /\bwriteFile(?:Sync)?\b|\bappendFile(?:Sync)?\b|\bmkdir(?:Sync)?\b|\brm(?:Sync)?\b|\bunlink(?:Sync)?\b/u.test(source);
  const readsFiles = /\breadFile(?:Sync)?\b|\breaddir(?:Sync)?\b|\bopendir\b/u.test(source);
  const buildBundle = /\bbuildBundle\b|run-bundled\.mjs/u.test(source);
  const repoAssetRefs = /['"`][^'"`]*(?:data|reports|logs)\//u.test(source);
  const processEnv = /process\.env/u.test(source);
  const network = /\bfetch\s*\(|https?:\/\//u.test(source);
  const gitProcess = childProcess && /['"]git['"]|\bgit\s+(?:ls-files|diff|show|rev-parse|status|log)\b/u.test(source);
  const sourceInspection = /readFile(?:Sync)?\([^)]*(?:scripts|modules)|assert\.(?:match|doesNotMatch)\([^,]*(?:Source|source)/u.test(source);
  const importsTs = /from ['"][^'"]+\.ts['"]/u.test(source);
  const nodeTest = /from ['"]node:test['"]|require\(['"]node:test['"]\)/u.test(source);
  const vitest = /from ['"]vitest['"]|require\(['"]vitest['"]\)/u.test(source);
  const subprocessCalls = [...source.matchAll(/\b(?:execFile|execFileSync|spawn|spawnSync|fork)\s*\(/gu)].length;
  const fileIoCalls = [...source.matchAll(/\b(?:readFile|readFileSync|writeFile|writeFileSync|readdir|readdirSync|mkdir|mkdirSync|rm|rmSync)\s*\(/gu)].length;
  const imports = [...source.matchAll(/^\s*import\b/gmu)].length;

  return {
    childProcess,
    tempFiles,
    writesFiles,
    readsFiles,
    buildBundle,
    repoAssetRefs,
    processEnv,
    network,
    gitProcess,
    sourceInspection,
    importsTs,
    nodeTest,
    vitest,
    subprocessCalls,
    fileIoCalls,
    imports,
    lines: source.split('\n').length,
  };
}

function classifyRefactorCandidates(row) {
  const candidates = [];
  const f = row.features;
  if (!f) return candidates;

  if (!f.childProcess && !f.tempFiles && !f.writesFiles && !f.repoAssetRefs &&
      !f.gitProcess && !f.network && !f.sourceInspection) {
    candidates.push('direct-module/batch-runner-candidate');
  }
  if (f.childProcess && row.invocation !== 'run-bundled') {
    candidates.push('cli/subprocess-seam-candidate');
  }
  if (f.buildBundle || row.invocation === 'run-bundled') {
    candidates.push('bundle-once/direct-library-seam-candidate');
  }
  if (f.tempFiles || f.writesFiles) {
    candidates.push('filesystem-fixture-candidate');
  }
  if (f.repoAssetRefs) {
    candidates.push('repository-data-fixture-candidate');
  }
  if (f.sourceInspection) {
    candidates.push('source-grep/structural-contract-candidate');
  }
  if (row.group === 'shared') {
    candidates.push('ownership-disambiguation-candidate');
  }
  return candidates;
}

function addCounter(target, key, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(options.root);
const pkg = readJson(path.join(root, 'package.json'));
const registry = readJson(path.join(root, 'scripts/validation-groups.json'));

const rows = [];
for (const [family, groups] of [
  ['validator', registry.validators ?? {}],
  ['test', registry.nodeTests ?? {}],
]) {
  for (const [group, names] of Object.entries(groups)) {
    for (const name of names) {
      const command = pkg.scripts?.[name] ?? null;
      if (!command) throw new Error(`registered command missing from package.json: ${name}`);
      const parsed = parseCommand(command);
      let features = null;
      let entrypointExists = null;
      if (parsed.entrypoint) {
        const full = path.resolve(root, parsed.entrypoint);
        entrypointExists = fs.existsSync(full);
        if (entrypointExists) {
          features = sourceFeatures(fs.readFileSync(full, 'utf8'));
        }
      }
      const contractFamily = family === 'validator' ? 'validators' : 'nodeTests';
      const surfaces = registry.contractSurfaces?.[contractFamily]?.[name] ?? [group];
      const row = {
        family,
        group,
        surfaces,
        name,
        command,
        invocation: parsed.invocation,
        entrypoint: parsed.entrypoint,
        entrypointExists,
        features,
      };
      row.refactorCandidates = classifyRefactorCandidates(row);
      rows.push(row);
    }
  }
}

const summary = {
  totalContracts: rows.length,
  validators: rows.filter(row => row.family === 'validator').length,
  nodeTests: rows.filter(row => row.family === 'test').length,
  invocationModes: {},
  sourceTraits: {},
  refactorCandidateCounts: {},
  byGroup: {},
};

for (const row of rows) {
  addCounter(summary.invocationModes, row.invocation);
  for (const candidate of row.refactorCandidates) {
    addCounter(summary.refactorCandidateCounts, candidate);
  }
  if (row.features) {
    for (const key of [
      'childProcess', 'tempFiles', 'writesFiles', 'readsFiles', 'buildBundle', 'repoAssetRefs',
      'processEnv', 'network', 'gitProcess', 'sourceInspection', 'importsTs', 'nodeTest', 'vitest',
    ]) {
      if (row.features[key]) addCounter(summary.sourceTraits, key);
    }
  }

  const groupKey = `${row.family}:${row.group}`;
  if (!summary.byGroup[groupKey]) {
    summary.byGroup[groupKey] = {
      contracts: 0,
      invocationModes: {},
      sourceTraits: {},
      refactorCandidateCounts: {},
      sourceLines: 0,
      subprocessCalls: 0,
      fileIoCalls: 0,
    };
  }
  const group = summary.byGroup[groupKey];
  group.contracts += 1;
  addCounter(group.invocationModes, row.invocation);
  if (row.features) {
    group.sourceLines += row.features.lines;
    group.subprocessCalls += row.features.subprocessCalls;
    group.fileIoCalls += row.features.fileIoCalls;
    for (const key of [
      'childProcess', 'tempFiles', 'writesFiles', 'readsFiles', 'buildBundle', 'repoAssetRefs',
      'processEnv', 'network', 'gitProcess', 'sourceInspection', 'importsTs', 'nodeTest', 'vitest',
    ]) {
      if (row.features[key]) addCounter(group.sourceTraits, key);
    }
  }
  for (const candidate of row.refactorCandidates) {
    addCounter(group.refactorCandidateCounts, candidate);
  }
}

const candidateQueues = {};
for (const row of rows) {
  for (const candidate of row.refactorCandidates) {
    if (!candidateQueues[candidate]) candidateQueues[candidate] = [];
    candidateQueues[candidate].push({
      family: row.family,
      group: row.group,
      surfaces: row.surfaces,
      name: row.name,
      invocation: row.invocation,
      entrypoint: row.entrypoint,
      lines: row.features?.lines ?? null,
      subprocessCalls: row.features?.subprocessCalls ?? null,
      fileIoCalls: row.features?.fileIoCalls ?? null,
    });
  }
}
for (const queue of Object.values(candidateQueues)) {
  queue.sort((a, b) =>
    (b.subprocessCalls ?? 0) - (a.subprocessCalls ?? 0) ||
    (b.fileIoCalls ?? 0) - (a.fileIoCalls ?? 0) ||
    (b.lines ?? 0) - (a.lines ?? 0) ||
    a.name.localeCompare(b.name));
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  note: 'Static topology only. Traits identify refactor candidates; they do not prove a test is redundant or safe to demote.',
  summary,
  candidateQueues,
  contracts: rows,
};

const outputPath = path.resolve(root, options.output);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
