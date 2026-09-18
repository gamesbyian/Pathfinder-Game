#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import {
  GENERATION_METHODS,
  GENERATION_SUITES,
  compileGeneratorInvocation,
  crossConstructionStatus,
  hybridGuidance,
  normalizeMethodSelection,
  sanitizeStem,
  suiteDescriptor,
} from './research-level-generation-lib.mjs';

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  const passthrough = [];
  let afterDoubleDash = false;
  for (const arg of argv) {
    if (arg === '--') { afterDoubleDash = true; continue; }
    if (afterDoubleDash) { passthrough.push(arg); continue; }
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) flags.add(arg);
    else values.set(arg.slice(0, eq), arg.slice(eq + 1));
  }
  return { values, flags, passthrough };
}

function help() {
  console.log(`Research level generation front door

Usage:
  npm run research:generate-levels -- --method=random --count=40 --master-seed=123
  npm run research:generate-levels -- --suite=transfer-pair --count=40 --master-seed=123 --question-id=<id>
  npm run research:generate-levels -- --methods=targeted,random,topology --count=60 --master-seed=123 --dry-run
  npm run research:generate-levels -- --list
  npm run research:generate-levels -- --hybrids

Common options:
  --method=<targeted|random|topology>
  --methods=<comma-separated>
  --suite=<triangulation|transfer-pair|witness-contrast>
  --count=<requested independent parents per method>
  --targeted-count-per-batch=<n>   exact override; targeted emits 6 batches
  --master-seed=<number>
  --question-id=<stable research question id>
  --evidence-role=<development|confirmation|transfer>
  --out=<file>                     single-method only
  --out-dir=<dir>                  defaults under tmp/research-generation/<question-or-suite>/seed-<seed>
  --manifest=<file>                suite/run manifest; default <out-dir>/generation-manifest.json
  --id-prefix=<letters>            single-method only
  --envelope-caps                  random only
  --verbose
  --overwrite                     allow replacement of existing output/manifest files
  --dry-run
  -- <producer-specific flags>     single-method only

This command dispatches existing generators. It does not merge their algorithms or evidence
identities. Multi-source runs always write separate corpora/blocks.
`);
}

function list() {
  console.log(JSON.stringify({
    methods: Object.values(GENERATION_METHODS).map(({ id, label, sourceFamily, distributionClass, scientificUse, independenceNote }) => ({
      id, label, sourceFamily, distributionClass, scientificUse, independenceNote,
    })),
    suites: Object.values(GENERATION_SUITES),
  }, null, 2));
}

function summarizeOutput(method, output) {
  if (!existsSync(output)) throw new Error(`${method} completed but output is missing: ${output}`);
  const parsed = JSON.parse(readFileSync(output, 'utf8'));
  const levels = Array.isArray(parsed) ? parsed : parsed.levels;
  if (!Array.isArray(levels)) throw new Error(`${output}: expected a level array or {levels}`);
  return {
    method,
    output,
    actualParentCount: levels.length,
    blockId: parsed.researchBlock?.blockId ?? null,
    populationIdentity: parsed.populationIdentity ?? parsed.researchBlock?.populationIdentity ?? null,
    sourceRegime: parsed.researchBlock?.sourceRegime ?? parsed.corpusName ?? null,
    sourceRevision: parsed.researchBlock?.sourceRevision ?? null,
  };
}

function main() {
  const { values, flags, passthrough } = parseArgs(process.argv.slice(2));
  if (flags.has('--help') || flags.has('-h')) { help(); return; }
  if (flags.has('--list')) { list(); return; }
  if (flags.has('--hybrids')) { console.log(JSON.stringify(hybridGuidance(), null, 2)); return; }

  const method = values.get('--method') || null;
  const methods = values.get('--methods')?.split(',').map(x => x.trim()).filter(Boolean) || null;
  const suite = values.get('--suite') || null;
  const selected = normalizeMethodSelection({ method, methods, suite });
  const count = Number(values.get('--count') || 30);
  const masterSeed = Number(values.get('--master-seed') ?? 20260917);
  const questionId = values.get('--question-id') || null;
  const explicitEvidenceRole = values.get('--evidence-role') || null;
  const explicitOut = values.get('--out') || null;
  const explicitPrefix = values.get('--id-prefix') || null;
  const explicitBlockId = values.get('--block-id') || null;
  const targetedCountPerBatch = values.has('--targeted-count-per-batch')
    ? Number(values.get('--targeted-count-per-batch')) : null;
  const verbose = flags.has('--verbose');
  const envelopeCaps = flags.has('--envelope-caps');
  const append = flags.has('--append');
  const dryRun = flags.has('--dry-run');
  const overwrite = flags.has('--overwrite');

  if (!Number.isInteger(count) || count < 1) throw new Error('--count must be a positive integer');
  if (selected.length > 1 && explicitOut) throw new Error('--out is single-method only; use --out-dir for multi-source runs');
  if (selected.length > 1 && explicitPrefix) throw new Error('--id-prefix is single-method only so source namespaces stay obvious');
  if (selected.length > 1 && explicitBlockId) throw new Error('--block-id is single-method only; each source requires its own block identity');
  if (selected.length > 1 && passthrough.length) throw new Error('producer-specific passthrough flags are single-method only');
  if (append) throw new Error('--append is not supported by the research front door; use stress:generate-random directly for legacy mutable corpus top-ups');
  if (selected.length > 1 && envelopeCaps) {
    throw new Error('--envelope-caps is single-method only; run the random source separately when needed');
  }
  if (questionId && overwrite) throw new Error('--overwrite is forbidden for question-bound frozen research generation; choose a new seed or output directory');
  if (explicitEvidenceRole && !['development', 'confirmation', 'transfer'].includes(explicitEvidenceRole)) {
    throw new Error('--evidence-role must be development, confirmation, or transfer');
  }

  const suiteRoles = suite ? (suiteDescriptor(suite).defaultEvidenceRoles || {}) : {};
  const evidenceRolesByMethod = Object.fromEntries(selected.map(id => [
    id,
    explicitEvidenceRole || suiteRoles[id] || (questionId ? 'development' : null),
  ]));
  const outDir = values.get('--out-dir') || path.posix.join('tmp', 'research-generation', sanitizeStem(questionId || suite || selected.join('-')), `seed-${masterSeed}`);
  const invocations = selected.map((id, index) => compileGeneratorInvocation({
    method: id,
    count,
    masterSeed: masterSeed + index,
    questionId,
    evidenceRole: evidenceRolesByMethod[id],
    blockId: explicitBlockId,
    out: explicitOut,
    outDir,
    idPrefix: explicitPrefix,
    verbose,
    envelopeCaps,
    append,
    targetedCountPerBatch,
    passthrough,
  }));

  const pairwiseConstruction = [];
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      pairwiseConstruction.push({ methods: [selected[i], selected[j]], relation: crossConstructionStatus(selected[i], selected[j]) });
    }
  }

  const manifestPath = values.get('--manifest') || path.posix.join(outDir, 'generation-manifest.json');
  const plan = {
    schemaVersion: 1,
    kind: 'research-level-generation-plan',
    questionId,
    evidenceRole: explicitEvidenceRole,
    evidenceRolesByMethod,
    requestedParentsPerMethod: count,
    suite,
    methods: selected,
    pairwiseConstruction,
    invocations: invocations.map(({ command, ...rest }) => ({ ...rest, command })),
    scientificBoundary: 'Each producer remains a separate source block. This manifest coordinates acquisition but never pools independent-unit or evidence-role semantics.',
  };

  if (dryRun) {
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  for (const invocation of invocations) {
    if (existsSync(invocation.output) && !overwrite) {
      throw new Error(`output already exists: ${invocation.output} (use --overwrite or choose a new seed/out-dir)`);
    }
  }
  if (existsSync(manifestPath) && !overwrite) {
    throw new Error(`manifest already exists: ${manifestPath} (use --overwrite or choose a new seed/out-dir)`);
  }

  mkdirSync(path.dirname(path.resolve(manifestPath)), { recursive: true });
  const outputs = [];
  for (const invocation of invocations) {
    console.log(`\n[${invocation.method}] ${invocation.command.join(' ')}`);
    const run = spawnSync(invocation.command[0], invocation.command.slice(1), {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });
    if (run.error) throw run.error;
    if (run.status !== 0) throw new Error(`${invocation.method} generator exited with status ${run.status}`);
    outputs.push(summarizeOutput(invocation.method, invocation.output));
  }

  const manifest = {
    ...plan,
    kind: 'research-level-generation-run',
    completedAt: new Date().toISOString(),
    outputs,
  };
  writeFileSync(path.resolve(manifestPath), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nGeneration manifest -> ${manifestPath}`);
}

try { main(); }
catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
