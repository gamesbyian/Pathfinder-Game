#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
const validationGroups = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'validation-groups.json'), 'utf8'));
const workflowPath = path.join(root, '.github', 'workflows', 'ci.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const nodeShardWorkflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci-node-contract-shards.yml'), 'utf8');
const productionWorkflows = workflow + '\n' + nodeShardWorkflow;
const errors = [];

function directRuns(scriptName) {
  const command = scripts[scriptName];
  if (typeof command !== 'string') {
    errors.push(`package.json is missing script ${scriptName}`);
    return [];
  }
  return [...command.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map(match => match[1]);
}

function closure(scriptName, seen = new Set()) {
  if (seen.has(scriptName)) return seen;
  seen.add(scriptName);
  for (const child of directRuns(scriptName)) closure(child, seen);
  return seen;
}

function requireMembers(label, actual, expected) {
  for (const value of expected) {
    if (!actual.has(value)) errors.push(`${label} no longer includes ${value}`);
  }
}

const checkClosure = closure('check');
requireMembers('check', checkClosure, ['check:dead-scripts', 'check:text-source-files', 'check:lint', 'check:validators']);

const nonlintClosure = closure('check:nonlint');
requireMembers('check:nonlint', nonlintClosure, ['check:dead-scripts', 'check:text-source-files', 'check:validators']);
if (nonlintClosure.has('check:lint')) errors.push('check:nonlint unexpectedly includes check:lint');

const fastClosure = closure('ci:fast');
requireMembers('ci:fast', fastClosure, ['check', 'check:lint', 'test:unit:fast', 'test:node']);

const fullClosure = closure('ci');
requireMembers('ci', fullClosure, ['check', 'check:lint', 'test:coverage', 'test:node']);

const workflowRuns = [...workflow.matchAll(/^\s*run:\s*npm run ([A-Za-z0-9:_-]+)\s*$/gm)].map(match => match[1]);
const expectedWorkflowInvocations = [
  'check:dead-scripts',
  'check:text-source-files',
  'check:lint',
  'test:coverage',
  'test:deep-proofs',
  'build',
];
for (const expected of expectedWorkflowInvocations) {
  const escaped = expected.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  if (!new RegExp(`npm run ${escaped}(?=\\s|["']|$)`, 'mu').test(workflow)) {
    errors.push(`ci.yml no longer invokes npm run ${expected}`);
  }
}
// Direct single-command steps remain a separate classification surface. A required invocation may
// also live inside an intentionally concurrent multiline shell step (currently deep services).
for (const actual of workflowRuns) {
  if (!expectedWorkflowInvocations.includes(actual)) {
    errors.push(`ci.yml added direct npm run ${actual}; classify it in the local/GHA parity contract`);
  }
}

if (!workflow.includes('node scripts/validation-groups.mjs validators $groups')) {
  errors.push('ci.yml no longer executes selected validators through validation-groups.mjs');
}
if (!workflow.includes('npm run check:validators')) {
  errors.push('ci.yml no longer fails safe to the full check:validators aggregate when routing fails');
}
if (!nodeShardWorkflow.includes('node scripts/validation-groups.mjs nodeTests $groups --owner-groups="$OWNER_GROUPS"')) {
  errors.push('Node shard workflow no longer executes Node contracts through execution-owner shards');
}
if (!nodeShardWorkflow.includes('groups="repo game persistence solver research data shared"')) {
  errors.push('Node shard workflow no longer fails safe across every semantic group when routing fails');
}
if (!nodeShardWorkflow.includes("if: matrix.shard == 'a'")
    || !nodeShardWorkflow.includes('data/stress/stress-levels-random.json')
    || !nodeShardWorkflow.includes("if: matrix.shard == 'b'")
    || !nodeShardWorkflow.includes('uses: ./.github/actions/runtime-data')) {
  errors.push('Node shard workflow no longer preserves minimal level-data shard A plus full-runtime-data shard B');
}

const shardAOwners = new Set(['research', 'solver', 'game', 'persistence']);
const ownerByNodeContract = new Map();
for (const [group, members] of Object.entries(validationGroups.nodeTests ?? {})) {
  for (const member of members) ownerByNodeContract.set(member, group);
}
const allowedShardADataPaths = new Set([
  'data/levels.json',
  'data/stress/stress-levels.json',
  'data/stress/stress-levels-random.json',
]);
for (const [member, dependency] of Object.entries(validationGroups.contractDependencies?.nodeTests ?? {})) {
  if (!shardAOwners.has(ownerByNodeContract.get(member))) continue;
  for (const repoPath of dependency.repoPaths ?? []) {
    if (repoPath.startsWith('data/') && !allowedShardADataPaths.has(repoPath)) {
      errors.push(`Node shard A contract ${member} declares unsupported runtime-data dependency ${repoPath}`);
    }
  }
}
if (!workflow.includes('Materialize Fast Gate level documents')) {
  errors.push('ci.yml no longer materializes the minimal Fast Gate level-document set');
}
if (!workflow.includes('Restore runtime Hint sources for projection miss')) {
  errors.push('deep-services build path no longer defers full runtime Hint sources until a projection-cache miss');
}
if (!/Restore runtime Hint sources for projection miss[\s\S]*runtime-hint-projection-cache\.outputs\.cache-hit != 'true'/u.test(workflow)) {
  errors.push('deep-services build path runtime Hint sources are no longer gated on a projection-cache miss');
}
if (!workflow.includes('runtime-hint-projection-v2-')) {
  errors.push('deep-services build path no longer uses the rolling runtime-Hint projection cache generation');
}
if (!workflow.includes('restore-keys:') || !workflow.includes('steps.runtime-hint-projection-key.outputs.authority_key')) {
  errors.push('deep-services build path no longer scopes runtime-Hint fallback caches to projection authority');
}
if (!workflow.includes('PATHFINDER_RUNTIME_HINT_PROJECTION_RECONCILE')) {
  errors.push('deep-services build path no longer enables runtime-Hint incremental reconcile on fallback cache hits');
}

if (!workflow.includes('uses: ./.github/workflows/ci-node-contract-shards.yml')) {
  errors.push('ci.yml no longer invokes the reusable Node contract shard workflow');
}
if (!/^  deep-services:\s*$/mu.test(workflow)
    || !/deep-services:[\s\S]*id:\s*deep_services\s*$/mu.test(workflow)
    || !/deep-services:[\s\S]*npm run build/u.test(workflow)) {
  errors.push('ci.yml no longer packs production build into the deep_services execution step');
}
if (!/Materialize build runtime JSON[\s\S]*services-impact\.outputs\.needs_build == 'true'/u.test(workflow)) {
  errors.push('ci.yml deep-services no longer scopes build work through needs_build');
}
if (!/Materialize build runtime JSON[\s\S]*steps\.services-impact\.outcome != 'success'/u.test(workflow)) {
  errors.push('ci.yml deep-services build path no longer fails safe when impact planning fails');
}

if (!productionWorkflows.includes("Set up Node on warm dependency-tree path")
    || !productionWorkflows.includes("if: steps.dependency-tree-cache.outputs.cache-hit == 'true'")) {
  errors.push('ci.yml no longer has a cache-free warm dependency-tree setup-node path');
}
if (!productionWorkflows.includes("Set up Node with npm cache on dependency-tree miss")
    || !productionWorkflows.includes("nodev22.23.2-npm10.9.8")) {
  errors.push('ci.yml no longer confines npm-cache restoration to the dependency-tree miss path');
}

if (!/SOLVER_DEADLOCK_PROOF_SKIP:\s*['"]1['"]/.test(workflow)) {
  errors.push('ci.yml coverage step no longer records SOLVER_DEADLOCK_PROOF_SKIP=1');
}
if (!/SOLVER_R02560_PROOF_SKIP:\s*['"]1['"]/.test(workflow)) {
  errors.push('ci.yml coverage step no longer records SOLVER_R02560_PROOF_SKIP=1');
}

// The local finish lines intentionally add the production build after the package-level
// ci/ci:fast commands. Actions may select semantic validator/Node subsets for a PR, while the
// package-level local commands remain conservative full aggregates. The Actions deep lane
// partitions explicit heavyweight soundness proofs out of coverage and runs them separately.
// Keep these documented equivalences explicit so a new deterministic Actions command cannot
// quietly become a GitHub-only rule.
const preflight = fs.readFileSync(path.join(root, 'docs', 'ci-preflight.md'), 'utf8');
if (!preflight.includes('npm run ci:fast && npm run build')) {
  errors.push('docs/ci-preflight.md must keep the ordinary local finish line at `npm run ci:fast && npm run build`');
}
if (!preflight.includes('npm run ci && npm run build')) {
  errors.push('docs/ci-preflight.md must keep the deep local finish line at `npm run ci && npm run build`');
}

if (errors.length > 0) {
  console.error('Local/GitHub Actions gate parity check failed:');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nUpdate package scripts, ci.yml, and the local finish-line contract together.');
  process.exit(1);
}

console.log('Local finish lines and GitHub Actions deterministic gate commands are in parity.');
