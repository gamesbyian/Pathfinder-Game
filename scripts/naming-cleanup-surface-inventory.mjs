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
let PHASE_MIN = null;
let PHASE_MAX = null;
if (phaseArg) {
  const rawPhase = phaseArg.slice('--phase='.length);
  const range = rawPhase.match(/^(\d+)(?:-(\d+))?$/u);
  if (!range) {
    console.error('--phase must be an integer or inclusive range such as 8-14');
    process.exit(2);
  }
  PHASE_MIN = Number(range[1]);
  PHASE_MAX = Number(range[2] ?? range[1]);
  if (PHASE_MAX < PHASE_MIN) {
    console.error('--phase range must be ascending');
    process.exit(2);
  }
}
const PHASE = PHASE_MIN === PHASE_MAX ? PHASE_MIN : null;

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
const moduleFiles = walk(path.join(root, 'modules'), full => /\.(?:mjs|cjs|js|ts|tsx)$/u.test(full))
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
for (const file of [...scriptFiles, ...moduleFiles, ...workflowFiles, ...docFiles]) {
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

function exportedSymbols(source) {
  const out = new Set();
  for (const match of source.matchAll(/\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/gu)) {
    out.add(match[1]);
  }
  for (const match of source.matchAll(/\bexport\s*\{([^}]+)\}/gu)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/u)[0]?.trim();
      if (name && /^[A-Za-z_$][\w$]*$/u.test(name)) out.add(name);
    }
  }
  return [...out].sort();
}

function referencingFilesForTerms(terms, ownerFile = null) {
  const cleanTerms = [...new Set(terms.filter(term => typeof term === 'string' && term.length >= 3))];
  if (!cleanTerms.length) return [];
  return [...sourceByFile.entries()]
    .filter(([file, source]) => file !== ownerFile && cleanTerms.some(term => source.includes(term)))
    .map(([file]) => file)
    .sort();
}

const moduleRows = moduleFiles.map(file => {
  const source = sourceByFile.get(file) ?? '';
  const exports = exportedSymbols(source);
  return {
    file,
    exports,
    currentDocRefs: currentDocFiles.filter(doc => fileTextReferences(file, doc)),
    importOrTextRefs: referencingFilesForTerms([file, path.basename(file)], file),
  };
}).sort((a, b) => a.file.localeCompare(b.file));

const reportPathPattern = /\breports\/[A-Za-z0-9_./{}$-]+(?:\.(?:json|jsonl|md|csv|txt))?/gu;
const reportPathRefs = new Map();
function reportRoleForLine(line) {
  if (/\b(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\b/u.test(line)) return 'producer';
  if (/\b(?:readFile|readFileSync|createReadStream)\b/u.test(line)) return 'consumer';
  if (/\b(?:upload-artifact|git\s+add|tee)\b/u.test(line)) return 'producer-or-publisher';
  return 'reference';
}
for (const [file, source] of sourceByFile) {
  if (!file.startsWith('scripts/') && !file.startsWith('modules/') && !file.startsWith('.github/workflows/')) continue;
  const lines = source.split('\n');
  for (const [lineIndex, line] of lines.entries()) {
    for (const match of line.matchAll(reportPathPattern)) {
      const reportPath = match[0];
      if (!reportPathRefs.has(reportPath)) reportPathRefs.set(reportPath, []);
      reportPathRefs.get(reportPath).push({ file, line: lineIndex + 1, role: reportRoleForLine(line) });
    }
  }
}
const reportSurfaces = [...reportPathRefs.entries()]
  .map(([reportPath, references]) => ({
    reportPath,
    references: references.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
    producers: [...new Set(references.filter(ref => ref.role.startsWith('producer')).map(ref => ref.file))].sort(),
    consumers: [...new Set(references.filter(ref => ref.role === 'consumer').map(ref => ref.file))].sort(),
    referencedBy: [...new Set(references.map(ref => ref.file))].sort(),
  }))
  .sort((a, b) => a.reportPath.localeCompare(b.reportPath));

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
    moduleFiles: [],
    symbolOwners: [],
  };

  if (entry.kind === 'tool' || entry.kind === 'file') {
    matches.scriptFiles = [...new Set([
      ...normalizedToolCandidates(entry.old),
      ...normalizedToolCandidates(entry.new),
    ])].filter(file => scriptFiles.includes(file)).sort();
    matches.moduleFiles = [entry.old, entry.new]
      .filter(value => typeof value === 'string')
      .flatMap(value => {
        const clean = value.replace(/^\.\//u, '');
        if (moduleFiles.includes(clean)) return [clean];
        return moduleFiles.filter(file => path.basename(file) === path.basename(clean));
      })
      .filter((value, index, all) => all.indexOf(value) === index)
      .sort();
  }
  if (entry.kind === 'symbol') {
    const names = [entry.old, entry.new].filter(value => typeof value === 'string');
    matches.symbolOwners = moduleRows
      .filter(row => names.some(name => row.exports.includes(name)))
      .map(row => row.file)
      .sort();
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

function referenceTermsForValue(value) {
  if (typeof value !== 'string' || value.length < 3) return [];
  const terms = [value];
  // Only derive a basename from an actual path-like token. Several ledger descriptions use "/"
  // as prose punctuation (for example "fields/parameters"); path.basename() on those labels turns
  // the suffix into an unrelated generic search term and manufactures false legacy references.
  if (!/\s/u.test(value) && value.includes('/')) terms.push(path.basename(value));
  return [...new Set(terms.filter(term => term.length >= 3))];
}

function referenceFilesForValue(value) {
  const uniqueTerms = referenceTermsForValue(value);
  if (!uniqueTerms.length) return [];
  const files = [];
  for (const [file, source] of sourceByFile) {
    if (uniqueTerms.some(term => source.includes(term))) files.push(file);
  }
  if (uniqueTerms.some(term => JSON.stringify(packageScripts).includes(term))) files.push('package.json');
  return [...new Set(files)].sort();
}

function referenceMatches(entry) {
  return [...new Set([
    ...referenceFilesForValue(entry.old),
    ...referenceFilesForValue(entry.new),
    ...(entry.inventoryTerms ?? []).flatMap(referenceFilesForValue),
  ])].sort();
}

const reconciliationAuthorityFiles = new Set([
  'docs/naming-cleanup-plan.md',
  'docs/naming-cleanup-process-hardening.md',
  'docs/naming-and-vocabulary.md',
  'docs/change-recipes.md',
]);

function isReconciliationAuthorityOrGuard(file) {
  return reconciliationAuthorityFiles.has(file)
    || file.startsWith('docs/archive/')
    || file.startsWith('docs/history/')
    || file.startsWith('docs/naming-cleanup-phase-records/')
    || file.startsWith('scripts/naming-cleanup-')
    || file === 'scripts/check-naming-current-authorities.mjs';
}

function reconciliationReferenceFilesForValue(value) {
  return referenceFilesForValue(value).filter(file => !isReconciliationAuthorityOrGuard(file));
}

function reconciliationOldReferenceFiles(entry, value) {
  const oldTerms = referenceTermsForValue(value);
  if (!oldTerms.length) return [];

  const canonicalTerms = [...new Set([
    entry.new,
    ...(entry.newInventoryTerms ?? []),
  ].flatMap(referenceTermsForValue))];

  const files = [];
  for (const [file, source] of sourceByFile) {
    if (isReconciliationAuthorityOrGuard(file)) continue;
    let masked = source;
    for (const canonical of canonicalTerms) masked = masked.split(canonical).join('');
    if (oldTerms.some(term => masked.includes(term))) files.push(file);
  }

  let packageSource = JSON.stringify(packageScripts);
  for (const canonical of canonicalTerms) packageSource = packageSource.split(canonical).join('');
  if (oldTerms.some(term => packageSource.includes(term))) files.push('package.json');

  return [...new Set(files)].sort();
}

function reconciliationReferenceMatches(entry, side) {
  if (side === 'old') {
    const values = [entry.old, ...(entry.oldInventoryTerms ?? [])];
    return [...new Set(values.flatMap(value => reconciliationOldReferenceFiles(entry, value)))].sort();
  }
  const values = [entry.new, ...(entry.newInventoryTerms ?? [])];
  return [...new Set(values.flatMap(reconciliationReferenceFilesForValue))].sort();
}

function reconciliationState(entry, oldRefs, newRefs) {
  const oldLive = oldRefs.length > 0;
  const newLive = newRefs.length > 0;
  if (oldLive && newLive) return 'mixed-old-and-canonical';
  if (oldLive) return 'old-live';
  if (newLive) return 'canonical-live';
  if (entry.persistence === 'frozen-history') return 'no-current-live-reference-frozen-history';
  return 'no-current-live-reference-review';
}
function surfaceCategory(file) {
  if (file === 'package.json') return 'package-command';
  if (file.startsWith('.github/workflows/')) return 'workflow';
  if (file === 'modules/ports.ts') return 'public-port';
  if (/worker/iu.test(file) && (file.startsWith('modules/') || file.startsWith('scripts/'))) return 'worker-transport';
  if (file.startsWith('modules/solver/')) return 'solver-internal';
  if (/^modules\/(?:input|engine|state|runtime|editor|render|ui)\//u.test(file) || /^modules\/(?:state|renderer|level-utils)\./u.test(file)) return 'application';
  if (file.startsWith('scripts/')) return 'tool-or-report-transport';
  if (file.startsWith('docs/') || file === 'AGENTS.md' || file === 'README.md') return 'documentation';
  return 'other';
}

function referenceCategories(files) {
  return [...new Set(files.map(surfaceCategory))].sort();
}


const selectedLedgerEntries = (ledger.entries ?? [])
  .filter(entry => PHASE_MIN == null || (entry.phase >= PHASE_MIN && entry.phase <= PHASE_MAX))
  .map(entry => {
    const oldReferenceFiles = reconciliationReferenceMatches(entry, 'old');
    const newReferenceFiles = reconciliationReferenceMatches(entry, 'new');
    return {
      id: entry.id,
      old: entry.old,
      new: entry.new,
      kind: entry.kind,
      risk: entry.risk,
      persistence: entry.persistence,
      compatibility: entry.compatibility ?? null,
      phase: entry.phase,
      batch: entry.batch ?? null,
      status: entry.status,
      surfaces: exactSurfaceMatches(entry),
      referenceFiles: referenceMatches(entry),
      oldReferenceFiles,
      newReferenceFiles,
      oldReferenceCategories: referenceCategories(oldReferenceFiles),
      newReferenceCategories: referenceCategories(newReferenceFiles),
      reconciliationState: reconciliationState(entry, oldReferenceFiles, newReferenceFiles),
    };
  });

const phaseScriptSet = new Set(selectedLedgerEntries.flatMap(entry => entry.surfaces.scriptFiles));
const phaseAliasSet = new Set(selectedLedgerEntries.flatMap(entry => entry.surfaces.packageAliases));
const phaseWorkflowSet = new Set(selectedLedgerEntries.flatMap(entry => entry.surfaces.workflowFiles));
const phaseModuleSet = new Set(selectedLedgerEntries.flatMap(entry => [
  ...entry.surfaces.moduleFiles,
  ...entry.surfaces.symbolOwners,
]));

let selectedScripts = PHASE_MIN == null ? scriptRows : scriptRows.filter(row => phaseScriptSet.has(row.file));
let selectedPackages = PHASE_MIN == null ? packageRows : packageRows.filter(row => phaseAliasSet.has(row.name));
let selectedWorkflows = PHASE_MIN == null ? workflowRows : workflowRows.filter(row => phaseWorkflowSet.has(row.file));
let selectedModules = PHASE_MIN == null ? moduleRows : moduleRows.filter(row => phaseModuleSet.has(row.file));

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
  moduleFiles: moduleRows.length,
  reportSurfaces: reportSurfaces.length,
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
  phaseRange: PHASE_MIN == null ? null : [PHASE_MIN, PHASE_MAX],
  summary,
  ledgerEntries: selectedLedgerEntries,
  packageCommands: selectedPackages,
  scripts: selectedScripts,
  modules: selectedModules,
  reportSurfaces,
  workflows: selectedWorkflows,
};

if (JSON_MODE) {
  // Large multi-phase inventories can exceed stdout's synchronous write window. Await the pipe
  // callback before exiting or Node can truncate otherwise-valid JSON mid-string.
  await new Promise(resolve => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`, resolve));
  process.exit(0);
}

console.log(`Naming-cleanup surface inventory: ${summary.surfacedScripts} surfaced script files; ${summary.surfacedScriptsDirectlyExecutedByCi} directly executed by CI; ${summary.surfacedScriptsWithCiTestReference} have a CI test reference; ${summary.surfacedScriptsWorkflowStructuralOnly} workflow-path structural only; ${summary.surfacedScriptsUncoveredByKnownCi} uncovered by known CI.`);
console.log(`CI package roots: ${ciRoots.join(', ')}`);
console.log(`Workflow local-path structural validation in CI: ${workflowPathStructuralCheckInCi ? 'yes' : 'no'}${workflowStructuralRoots.length ? ` via ${workflowStructuralRoots.join(', ')}` : ''}`);

if (PHASE_MIN != null) {
  const label = PHASE_MIN === PHASE_MAX ? `Phase ${PHASE_MIN}` : `Phases ${PHASE_MIN}-${PHASE_MAX}`;
  console.log(`${label}: ${selectedLedgerEntries.length} ledger rows; ${selectedScripts.length} exact script surfaces; ${selectedModules.length} module/symbol surfaces; ${selectedPackages.length} exact package aliases; ${selectedWorkflows.length} exact workflows.`);
  const states = new Map();
  for (const row of selectedLedgerEntries) states.set(row.reconciliationState, (states.get(row.reconciliationState) ?? 0) + 1);
  console.log(`  reconciliation: ${[...states.entries()].map(([state, count]) => `${state}=${count}`).join(', ')}`);
}

if (COMPACT_MODE || PHASE != null || UNCOVERED_ONLY) {
  for (const row of selectedScripts) {
    const npm = row.packageAliases.length ? ` npm=${row.packageAliases.join(',')}` : '';
    const wf = row.workflowRefs.length ? ` workflows=${row.workflowRefs.length}` : '';
    const tests = row.ciTestReferences.length ? ` ciTestRefs=${row.ciTestReferences.join(',')}` : '';
    console.log(`  ${row.coverageStatus.padEnd(29)} ${row.file}${npm}${wf}${tests}`);
  }
  for (const row of selectedModules) {
    const refs = row.importOrTextRefs.length ? ` refs=${row.importOrTextRefs.length}` : '';
    console.log(`  module ${row.file} exports=${row.exports.join(',') || '(none)'}${refs}`);
  }
  for (const row of selectedPackages) {
    console.log(`  package ${row.ciCommandReachable ? 'CI' : 'NO-CI'} ${row.name} -> ${row.localTargets.join(', ') || '(no local script target)'}`);
  }
  for (const row of selectedWorkflows) {
    console.log(`  workflow STRUCTURAL ${row.file} -> ${row.localTargets.join(', ') || '(no local script target)'}`);
  }
}
