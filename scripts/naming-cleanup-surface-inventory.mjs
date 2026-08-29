#!/usr/bin/env node
/**
 * Naming-cleanup live execution-surface inventory.
 *
 * This is deliberately observational. It answers a narrower question than tooling-census.mjs:
 * for maintained package/workflow/script surfaces, what does the repository currently know about
 * CI execution or structural validation, and which planned naming-cleanup rows map to those surfaces?
 *
 * It does not claim that a textual test reference proves behavioral coverage. The output labels
 * direct CI execution, CI test references, workflow-path structural validation, and uncovered
 * surfaced entrypoints separately so future migration work can choose the right proof.
 *
 * Usage:
 *   node scripts/naming-cleanup-surface-inventory.mjs --compact --phase=8
 *   node scripts/naming-cleanup-surface-inventory.mjs --compact --phase=8 --uncovered
 *   node scripts/naming-cleanup-surface-inventory.mjs --json --phase=8
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const args = process.argv.slice(2);
const JSON_MODE = args.includes('--json');
const COMPACT_MODE = args.includes('--compact');
const UNCOVERED_ONLY = args.includes('--uncovered');
const phaseArg = args.find(arg => arg.startsWith('--phase='));
const PHASE = phaseArg ? Number(phaseArg.slice('--phase='.length)) : null;

if (phaseArg && !Number.isInteger(PHASE)) {
  console.error('--phase must be an integer');
  process.exit(2);
}

const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageScripts = packageJson.scripts ?? {};
const ledger = JSON.parse(readFileSync(path.join(root, 'docs', 'naming-cleanup-ledger.json'), 'utf8'));
const ciSource = readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');

function walk(dir, predicate) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, predicate));
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function relative(full) {
  return path.relative(root, full).split(path.sep).join('/');
}

const scriptFiles = walk(path.join(root, 'scripts'), full => /\.(?:mjs|cjs|js|ts|tsx|py)$/u.test(full))
  .map(relative).sort();
const workflowFiles = readdirSync(path.join(root, '.github', 'workflows'))
  .filter(name => /\.ya?ml$/u.test(name))
  .map(name => `.github/workflows/${name}`)
  .sort();
const docFiles = [
  'AGENTS.md',
  'README.md',
  ...walk(path.join(root, 'docs'), full => full.endsWith('.md')).map(relative),
].filter(file => {
  try { return statSync(path.join(root, file)).isFile(); } catch { return false; }
}).sort();

const sourceByFile = new Map();
for (const file of [...scriptFiles, ...workflowFiles, ...docFiles]) {
  try {
    sourceByFile.set(file, readFileSync(path.join(root, file), 'utf8'));
  } catch {
    // Observational inventory: an unreadable file contributes no references.
  }
}

function tokenize(command) {
  return command.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g)?.map(token => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    return token;
  }) ?? [];
}

function packageDependencies(command) {
  const deps = new Set();
  for (const match of command.matchAll(/\bnpm\s+run(?:\s+--silent)?\s+([A-Za-z0-9:._-]+)/gu)) {
    if (packageScripts[match[1]]) deps.add(match[1]);
  }

  const tokens = tokenize(command);
  const runnerIndex = tokens.findIndex(token => token.endsWith('scripts/run-scripts-parallel.mjs'));
  if (runnerIndex >= 0) {
    for (const token of tokens.slice(runnerIndex + 1)) {
      if (['&&', '||', ';', '|'].includes(token)) break;
      if (packageScripts[token]) deps.add(token);
    }
  }
  return [...deps].sort();
}

function localScriptTargets(command) {
  const targets = new Set();
  for (const token of tokenize(command)) {
    const cleaned = token.replace(/^['"]|['"]$/gu, '').replace(/^\.\//u, '');
    if (/^scripts\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|ts|tsx|py)$/u.test(cleaned)) {
      targets.add(cleaned);
    }
  }
  return [...targets].sort();
}

const packageRows = Object.entries(packageScripts).map(([name, command]) => ({
  name,
  command,
  dependencies: packageDependencies(command),
  localTargets: localScriptTargets(command),
})).sort((a, b) => a.name.localeCompare(b.name));

const packageByName = new Map(packageRows.map(row => [row.name, row]));
const ciRoots = [...new Set(
  [...ciSource.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:._-]+)/gu)].map(match => match[1])
    .filter(name => packageByName.has(name))
)].sort();

function reachableAliases(rootAlias) {
  const seen = new Set();
  const queue = [rootAlias];
  while (queue.length) {
    const alias = queue.shift();
    if (!alias || seen.has(alias)) continue;
    seen.add(alias);
    for (const dep of packageByName.get(alias)?.dependencies ?? []) queue.push(dep);
  }
  return seen;
}

const reachableByRoot = new Map(ciRoots.map(rootAlias => [rootAlias, reachableAliases(rootAlias)]));

function rootsReaching(alias) {
  return ciRoots.filter(rootAlias => reachableByRoot.get(rootAlias)?.has(alias));
}

for (const row of packageRows) {
  row.ciRoots = rootsReaching(row.name);
  row.ciCommandReachable = row.ciRoots.length > 0;
}

function transitiveTargets(alias) {
  const targets = new Set();
  const seen = new Set();
  const queue = [alias];
  while (queue.length) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    const row = packageByName.get(current);
    if (!row) continue;
    for (const target of row.localTargets) targets.add(target);
    for (const dep of row.dependencies) queue.push(dep);
  }
  return [...targets].sort();
}

const workflowRows = workflowFiles.map(file => {
  const source = sourceByFile.get(file) ?? '';
  const directTargets = [...new Set(
    [...source.matchAll(/(?:^|[\s"'=])(scripts\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|ts|tsx|py))/gmu)]
      .map(match => match[1])
  )].sort();
  const packageAliases = [...new Set(
    [...source.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:._-]+)/gu)].map(match => match[1])
      .filter(name => packageByName.has(name))
  )].sort();
  const indirectTargets = packageAliases.flatMap(transitiveTargets);
  return {
    file,
    directTargets,
    packageAliases,
    localTargets: [...new Set([...directTargets, ...indirectTargets])].sort(),
  };
});

const workflowStructuralRoots = rootsReaching('check:workflow-actions');
const workflowPathStructuralCheckInCi = workflowStructuralRoots.length > 0;

const ciDirectTargetFiles = new Set();
for (const row of packageRows.filter(row => row.ciCommandReachable)) {
  for (const target of row.localTargets) ciDirectTargetFiles.add(target);
}

const ciTestLikeFiles = [...ciDirectTargetFiles].filter(file => {
  const base = path.basename(file);
  return /(?:node-test|unit-tests?|(?:^|[-_.])test(?:[-_.]|$)|(?:^|[-_.])check(?:[-_.]|$))/iu.test(base);
});

function fileTextReferences(target, candidate) {
  const source = sourceByFile.get(candidate) ?? '';
  const base = path.basename(target);
  return source.includes(target) || source.includes(base);
}

const currentDocFiles = docFiles.filter(file =>
  !file.startsWith('docs/archive/') && !file.startsWith('docs/history/'));

const scriptRows = scriptFiles.map(file => {
  const packageAliases = packageRows.filter(row => row.localTargets.includes(file)).map(row => row.name);
  const workflowRefs = workflowRows.filter(row => row.localTargets.includes(file)).map(row => row.file);
  const currentDocRefs = currentDocFiles.filter(doc => fileTextReferences(file, doc));
  const ciDirectAliases = packageAliases.filter(alias => rootsReaching(alias).length > 0);
  const ciTestReferences = ciTestLikeFiles
    .filter(testFile => testFile !== file && fileTextReferences(file, testFile))
    .sort();

  let coverageStatus = 'uncovered-by-known-ci';
  if (ciDirectAliases.length) coverageStatus = 'direct-ci-execution';
  else if (ciTestReferences.length) coverageStatus = 'ci-test-reference';
  else if (workflowRefs.length && workflowPathStructuralCheckInCi) coverageStatus = 'workflow-path-structural-only';

  return {
    file,
    packageAliases,
    workflowRefs,
    currentDocRefs,
    surfaced: packageAliases.length > 0 || workflowRefs.length > 0 || currentDocRefs.length > 0,
    ciDirectAliases,
    ciTestReferences,
    coverageStatus,
  };
}).sort((a, b) => a.file.localeCompare(b.file));

function normalizedToolCandidates(value) {
  if (typeof value !== 'string') return [];
  const clean = value.trim();
  if (!/\.(?:mjs|cjs|js|ts|tsx|py)$/u.test(clean)) return [];
  if (clean.startsWith('scripts/')) return [clean];
  if (clean.startsWith('stress/')) return [`scripts/${clean}`];
  if (clean.startsWith('.github/')) return [];
  return scriptFiles.filter(file => path.basename(file) === path.basename(clean));
}

function exactSurfaceMatches(entry) {
  const matches = {
    scriptFiles: [],
    packageAliases: [],
    workflowFiles: [],
    docFiles: [],
  };

  if (entry.kind === 'tool' || entry.kind === 'file') {
    matches.scriptFiles = [...new Set([
      ...normalizedToolCandidates(entry.old),
      ...normalizedToolCandidates(entry.new),
    ])].filter(file => scriptFiles.includes(file)).sort();
  }
  if (entry.kind === 'package-alias') {
    matches.packageAliases = [entry.old, entry.new].filter(value => packageByName.has(value)).sort();
  }
  if (entry.kind === 'workflow') {
    matches.workflowFiles = [entry.old, entry.new].filter(value => workflowFiles.includes(value)).sort();
  }
  if (entry.kind === 'doc') {
    matches.docFiles = [entry.old, entry.new]
      .flatMap(value => {
        if (typeof value !== 'string') return [];
        if (docFiles.includes(value)) return [value];
        if (docFiles.includes(`docs/${value}`)) return [`docs/${value}`];
        return docFiles.filter(file => path.basename(file) === path.basename(value));
      })
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort();
  }
  return matches;
}

function referenceMatches(entry) {
  const terms = [entry.old, entry.new]
    .filter(value => typeof value === 'string' && value.length >= 4)
    .flatMap(value => [value, path.basename(value)])
    .filter((value, index, all) => all.indexOf(value) === index);
  const files = [];
  for (const [file, source] of sourceByFile) {
    if (terms.some(term => source.includes(term))) files.push(file);
  }
  if (terms.some(term => JSON.stringify(packageScripts).includes(term))) files.push('package.json');
  return [...new Set(files)].sort();
}

const selectedLedgerEntries = (ledger.entries ?? [])
  .filter(entry => PHASE == null || entry.phase === PHASE)
  .map(entry => ({
    old: entry.old,
    new: entry.new,
    kind: entry.kind,
    risk: entry.risk,
    persistence: entry.persistence,
    phase: entry.phase,
    status: entry.status,
    surfaces: exactSurfaceMatches(entry),
    referenceFiles: referenceMatches(entry),
  }));

const phaseScriptSet = new Set(selectedLedgerEntries.flatMap(entry => entry.surfaces.scriptFiles));
const phaseAliasSet = new Set(selectedLedgerEntries.flatMap(entry => entry.surfaces.packageAliases));
const phaseWorkflowSet = new Set(selectedLedgerEntries.flatMap(entry => entry.surfaces.workflowFiles));

let selectedScripts = PHASE == null ? scriptRows : scriptRows.filter(row => phaseScriptSet.has(row.file));
let selectedPackages = PHASE == null ? packageRows : packageRows.filter(row => phaseAliasSet.has(row.name));
let selectedWorkflows = PHASE == null ? workflowRows : workflowRows.filter(row => phaseWorkflowSet.has(row.file));

if (UNCOVERED_ONLY) {
  selectedScripts = selectedScripts.filter(row => row.coverageStatus !== 'direct-ci-execution' && row.coverageStatus !== 'ci-test-reference');
  selectedPackages = selectedPackages.filter(row => !row.ciCommandReachable);
}

const summary = {
  ciRoots,
  workflowPathStructuralCheckInCi,
  workflowStructuralRoots,
  packageCommands: packageRows.length,
  scriptFiles: scriptRows.length,
  surfacedScripts: scriptRows.filter(row => row.surfaced).length,
  surfacedScriptsDirectlyExecutedByCi: scriptRows.filter(row => row.surfaced && row.coverageStatus === 'direct-ci-execution').length,
  surfacedScriptsWithCiTestReference: scriptRows.filter(row => row.surfaced && row.coverageStatus === 'ci-test-reference').length,
  surfacedScriptsWorkflowStructuralOnly: scriptRows.filter(row => row.surfaced && row.coverageStatus === 'workflow-path-structural-only').length,
  surfacedScriptsUncoveredByKnownCi: scriptRows.filter(row => row.surfaced && row.coverageStatus === 'uncovered-by-known-ci').length,
};

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  phase: PHASE,
  summary,
  ledgerEntries: selectedLedgerEntries,
  packageCommands: selectedPackages,
  scripts: selectedScripts,
  workflows: selectedWorkflows,
};

if (JSON_MODE) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

console.log(`Naming-cleanup surface inventory: ${summary.surfacedScripts} surfaced script files; ${summary.surfacedScriptsDirectlyExecutedByCi} directly executed by CI; ${summary.surfacedScriptsWithCiTestReference} have a CI test reference; ${summary.surfacedScriptsWorkflowStructuralOnly} workflow-path structural only; ${summary.surfacedScriptsUncoveredByKnownCi} uncovered by known CI.`);
console.log(`CI package roots: ${ciRoots.join(', ')}`);
console.log(`Workflow local-path structural validation in CI: ${workflowPathStructuralCheckInCi ? 'yes' : 'no'}${workflowStructuralRoots.length ? ` via ${workflowStructuralRoots.join(', ')}` : ''}`);

if (PHASE != null) {
  console.log(`Phase ${PHASE}: ${selectedLedgerEntries.length} ledger rows; ${selectedScripts.length} exact script surfaces; ${selectedPackages.length} exact package aliases; ${selectedWorkflows.length} exact workflows.`);
}

if (COMPACT_MODE || PHASE != null || UNCOVERED_ONLY) {
  for (const row of selectedScripts) {
    const npm = row.packageAliases.length ? ` npm=${row.packageAliases.join(',')}` : '';
    const wf = row.workflowRefs.length ? ` workflows=${row.workflowRefs.length}` : '';
    const tests = row.ciTestReferences.length ? ` ciTestRefs=${row.ciTestReferences.join(',')}` : '';
    console.log(`  ${row.coverageStatus.padEnd(29)} ${row.file}${npm}${wf}${tests}`);
  }
  for (const row of selectedPackages) {
    console.log(`  package ${row.ciCommandReachable ? 'CI' : 'NO-CI'} ${row.name} -> ${row.localTargets.join(', ') || '(no local script target)'}`);
  }
  for (const row of selectedWorkflows) {
    console.log(`  workflow STRUCTURAL ${row.file} -> ${row.localTargets.join(', ') || '(no local script target)'}`);
  }
}
