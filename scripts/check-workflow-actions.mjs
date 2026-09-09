#!/usr/bin/env node
/** Keep official GitHub Actions on maintained majors and reject stale workflow/script consumers. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const expected = new Map([
  ['actions/checkout', 'v7'],
  ['actions/cache', 'v5'],
  ['actions/setup-node', 'v7'],
  ['actions/setup-python', 'v7'],
  ['actions/upload-artifact', 'v7'],
  ['actions/download-artifact', 'v8'],
  ['actions/upload-pages-artifact', 'v5'],
  ['actions/deploy-pages', 'v5'],
]);

const root = process.cwd();
const workflowDir = path.join(root, '.github', 'workflows');
const failures = [];

/** Dead workflow_dispatch input detector (2026-09-09 historical regression-risk audit item #6):
 *  this file already validates STRUCTURAL references (action versions, path filters, local
 *  script entrypoints all exist) but never checked whether a declared `workflow_dispatch.inputs.*`
 *  is actually consumed anywhere in the same workflow -- exactly the "workflow inputs that do not
 *  reach execution" bug shape the same audit's item #2 calls out (a `node_budget_advisory_only`- or
 *  `strict_total_work_budget`-shaped flag accepted by the dispatch form but never read by any step
 *  would previously pass this checker silently). Deliberately narrow and mechanical, same
 *  whole-file-co-occurrence shape as check-solveopts-transport-parity.mjs's own scope (see that
 *  file's header comment for the same "coarse by design, not a completeness prover" rationale): an
 *  input is "referenced" if `inputs.<name>` or `github.event.inputs.<name>` appears anywhere else
 *  in the file, which cannot prove the referencing step is the RIGHT consumer or that the value
 *  survives correctly once read (that is what a dedicated effective-config check would need) -- it
 *  only proves the name is not simply forgotten. Indirect consumption via an intermediate `env:`
 *  alias is a known, accepted false-negative (reduced sensitivity, never a false positive). Parses
 *  the `on.workflow_dispatch.inputs` block by indentation rather than pulling in a YAML library,
 *  matching this file's existing regex-based approach throughout. */
function extractDispatchInputNames(lines) {
  const names = [];
  const dispatchIdx = lines.findIndex(l => /^\s*workflow_dispatch:\s*$/.test(l));
  if (dispatchIdx === -1) return names;
  const dispatchIndent = lines[dispatchIdx].match(/^(\s*)/)[1].length;
  let i = dispatchIdx + 1;
  let inputsIndent = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent <= dispatchIndent) return names; // left the workflow_dispatch block with no inputs:
    if (/^\s*inputs:\s*$/.test(line)) { inputsIndent = indent; i++; break; }
  }
  if (inputsIndent === null) return names;
  let nameIndent = null;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent <= inputsIndent) break; // left the inputs: block
    if (nameIndent === null) nameIndent = indent;
    if (indent === nameIndent) {
      const m = line.match(/^\s*([A-Za-z0-9_]+):/);
      if (m) names.push(m[1]);
    }
  }
  return names;
}

for (const name of readdirSync(workflowDir).filter(name => /\.ya?ml$/i.test(name)).sort()) {
  const source = readFileSync(path.join(workflowDir, name), 'utf8');

  for (const match of source.matchAll(/uses:\s*(actions\/[A-Za-z0-9_-]+)@([^\s#]+)/g)) {
    const action = match[1];
    const required = expected.get(action);
    if (!required) continue;
    const actual = match[2].replace(/['"]/g, '');
    if (actual !== required) failures.push(`${name}: ${action}@${actual}; expected ${action}@${required}`);
  }

  // Literal workflow path filters are live consumers of repository paths. On the Linux runner,
  // stale case or a renamed file can silently stop a workflow from triggering.
  for (const block of source.matchAll(/^\s*paths:\s*\n((?:\s+-\s+[^\n]+\n?)+)/gmu)) {
    for (const item of block[1].matchAll(/^\s*-\s+['"]?([^'"#\n]+?)['"]?\s*$/gmu)) {
      const filterPath = item[1].trim();
      if (!filterPath.includes('/') || /[*?\[\]{}$!]/u.test(filterPath)) continue;
      if (!existsSync(path.join(root, filterPath))) {
        failures.push(`${name}: paths filter references missing or wrong-case repository path ${filterPath}`);
      }
    }
  }

  for (const inputName of extractDispatchInputNames(source.split('\n'))) {
    const consumed = new RegExp(`\\binputs\\.${inputName}\\b|github\\.event\\.inputs\\.${inputName}\\b`).test(source);
    if (!consumed) failures.push(`${name}: workflow_dispatch input "${inputName}" is declared but never referenced as inputs.${inputName} anywhere in this file`);
  }

  // Workflow shell steps are a live consumer surface. A renamed/deleted local script must not
  // survive here merely because package.json and unit tests never execute that workflow.
  for (const match of source.matchAll(/\b(?:node|tsx)\s+((?:\.\/)?scripts\/[A-Za-z0-9_./-]+\.(?:mjs|js|cjs|ts|tsx))/g)) {
    const scriptPath = match[1].replace(/^\.\//, '');
    if (!existsSync(path.join(root, scriptPath))) {
      failures.push(`${name}: references missing local script ${scriptPath}`);
    }
  }
}

if (failures.length) {
  console.error('Workflow/action validation failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('Workflow actions, literal path filters, and local workflow entrypoints are valid.');
