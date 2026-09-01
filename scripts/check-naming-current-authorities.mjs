#!/usr/bin/env node
/**
 * Keep the naming-cleanup human front doors aligned with machine execution state.
 *
 * This is semantic rather than a retired-token scanner: a document can use canonical code
 * vocabulary and still send an agent to a completed phase or teach a compatibility contract that
 * the repository no longer supports.
 *
 * Pass --root=<fixture-root> to exercise this guard against a copied/mutated authority set.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const rootArg = process.argv.find(arg => arg.startsWith('--root='));
const ROOT = path.resolve(rootArg ? rootArg.slice('--root='.length) : process.cwd());
const read = relative => readFileSync(path.join(ROOT, relative), 'utf8');

const ledger = JSON.parse(read('docs/naming-cleanup-ledger.json'));
const nextPhase = Number(ledger.lastCompletedPhase) + 1;
const agents = read('AGENTS.md');
const docsIndex = read('docs/README.md');
const naming = read('docs/naming-and-vocabulary.md');
const resumption = read('docs/solver-research-post-naming-resumption.md');
const scriptsReadme = read('scripts/README.md');
const tooling = read('docs/tooling-catalog.md');
const failures = [];

if (!agents.includes('npm run naming:status')) failures.push('AGENTS.md naming route must start from npm run naming:status');
if (!agents.includes('next phase returned by that status')) failures.push('AGENTS.md naming route must explicitly follow the next phase returned by status');
if (/technical Phase-8 gate is ready/iu.test(agents)) failures.push('AGENTS.md still presents the completed Phase-8 gate as current');
if (/active phase\/batch authority[^\n]*phase-08\.md/iu.test(agents)) failures.push('AGENTS.md still hard-codes Phase 8 as the active naming authority');

const docsLines = docsIndex.split(/\r?\n/u);
const phase15ExecutionRows = docsLines.filter(line => line.includes('naming-cleanup-phase-records/phase-15.md'));
const phase15PreparationRows = docsLines.filter(line => line.includes('naming-cleanup-phase-records/phase-15-preparation.md'));
if (docsIndex.includes('\\n|')) failures.push('docs/README.md contains a literal escaped newline inside a Markdown table');
if (phase15ExecutionRows.length !== 1) failures.push('docs/README.md must contain exactly one physical Phase-15 execution row');
if (phase15PreparationRows.length !== 1) failures.push('docs/README.md must contain exactly one physical Phase-15 preparation row');
if (phase15ExecutionRows[0] && phase15ExecutionRows[0] === phase15PreparationRows[0]) failures.push('docs/README.md must keep Phase-15 execution and preparation records on separate table rows');

if (scriptsReadme.includes('--batch=8A')) failures.push('scripts/README.md still hard-codes completed batch 8A as the naming-status example');
if (!scriptsReadme.includes('--batch=<id>')) failures.push('scripts/README.md must teach the generic naming-status batch selector');
if (/future 13B zero-leakage gate/iu.test(scriptsReadme)) failures.push('scripts/README.md still presents completed Phase 13B validation as future');
if (tooling.includes('--batch=8A')) failures.push('docs/tooling-catalog.md still hard-codes completed batch 8A');
if (!tooling.includes('--batch=<id>')) failures.push('docs/tooling-catalog.md must teach the generic naming-status batch selector');

const staleNamingPatterns = [
  [/naked `fingerprint`[\s\S]{0,180}may remain/iu, 'permanent vocabulary still permits generic application fingerprint vocabulary broadly'],
  [/remain live compatibility contracts/iu, 'permanent vocabulary still describes pre-Phase-15 family contracts as generally live'],
  [/`oracle-shards`[\s\S]{0,180}remain result\/workflow compatibility identities/iu, 'permanent vocabulary still describes migrated CP-SAT result/job identities as current compatibility'],
  [/`atlas-eligibility\.mjs`[\s\S]{0,180}remain Batch-8E-discovered compatibility interfaces/iu, 'permanent vocabulary still describes retired atlas eligibility/directory identities as live'],
];
for (const [pattern, message] of staleNamingPatterns) if (pattern.test(naming)) failures.push(message);
for (const canonical of ['--variant-family-dataset-root','variantFamilyDataset','reference-shards','reference-abstain','cpsat-branch-label-eligibility.mjs','--prune-gap-dir','pruneGapDir']) {
  if (!naming.includes(canonical)) failures.push(`docs/naming-and-vocabulary.md missing canonical Phase-15 term ${canonical}`);
}

if (/pre-Phase-15 handoff contract/iu.test(resumption)) failures.push('solver resumption bridge still identifies itself as pre-Phase-15');
if (resumption.includes('historical result values/fields are normalized before analysis/combination')) failures.push('solver resumption bridge still invents an NC-P15-005 historical result normalizer');
if (!resumption.includes('no maintained historical schema-v1 result reader')) failures.push('solver resumption bridge must preserve the NC-P15-005 no-historical-reader decision');
for (const id of ['NC-P15-008','NC-P15-009','NC-P15-010','NC-P15-011','NC-P15-012','NC-P15-013','NC-P15-014']) {
  if (!resumption.includes(id)) failures.push(`solver resumption bridge missing resolved Phase-15 row ${id}`);
}
if (resumption.includes('\\`')) failures.push('solver resumption bridge contains escaped Markdown code delimiters');

if (nextPhase === 15) {
  const preparation = 'naming-cleanup-phase-records/phase-15-preparation.md';
  const execution = ledger.phaseExecutionRecords?.['15'];
  const phase15Active = ledger.activeExecution?.status === 'active' && ledger.activeExecution?.phase === 15;
  if (phase15Active) {
    if (execution !== 'docs/naming-cleanup-phase-records/phase-15.md') failures.push('active Phase 15 must register docs/naming-cleanup-phase-records/phase-15.md as its execution authority');
    const executionIndexPath = typeof execution === 'string' ? execution.replace(/^docs\//u, '') : '';
    if (!agents.includes(execution)) failures.push('AGENTS.md must route active Phase 15 through its execution authority');
    if (!docsIndex.includes(executionIndexPath)) failures.push('docs/README.md must list the active Phase-15 execution authority');
    if (!docsIndex.includes(preparation)) failures.push('docs/README.md must retain the Phase-15 preparation snapshot');

    const executionRecord = typeof execution === 'string' ? read(execution) : '';
    const executionHeader = executionRecord.split(/^##\s+/mu)[0];
    const active = ledger.activeExecution;
    if (!executionHeader.includes(String(active.batch)) || !/Status:[^\n]*active/iu.test(executionHeader)) {
      failures.push('active Phase-15 execution-record header must name the active batch and mark it active');
    }
    if (!executionHeader.includes(String(active.branch))) {
      failures.push('active Phase-15 execution-record header must name activeExecution.branch');
    }
    if (Number.isInteger(active.pr) && !executionHeader.includes(`#${active.pr}`)) {
      failures.push('active Phase-15 execution-record header must name activeExecution.pr');
    }
  } else {
    if (!agents.includes(preparation)) failures.push('AGENTS.md must route pending Phase 15 through its preparation authority');
    if (!docsIndex.includes(preparation)) failures.push('docs/README.md must list the pending Phase-15 preparation authority');
  }
  if (!/phase-08\.md[^\n]*completed Phase-8 implementation evidence/iu.test(docsIndex)) failures.push('docs/README.md must classify phase-08.md as completed evidence while Phase 15 is open');
}

if (failures.length) {
  console.error('Naming current-authority validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Naming current authorities agree with ledger state and resolved Phase-15 semantics: Phase ${ledger.lastCompletedPhase} complete, Phase ${nextPhase} next.`);
