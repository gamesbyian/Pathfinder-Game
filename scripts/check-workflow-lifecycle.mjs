#!/usr/bin/env node
import fs from 'node:fs';

const ledger = JSON.parse(fs.readFileSync('docs/solver-workflow-lifecycle.json', 'utf8'));
const disk = fs.readdirSync('.github/workflows').filter(name => /\.ya?ml$/.test(name)).sort();
const declared = ledger.workflows.map(row => row.workflow).sort();
const failures = [];
if (JSON.stringify(disk) !== JSON.stringify(declared)) failures.push(`workflow inventory differs (disk=${disk.join(',')}; ledger=${declared.join(',')})`);
for (const retired of ledger.retiredWorkflows ?? []) {
  if (disk.includes(retired.workflow)) failures.push(`${retired.workflow}: retired workflow reappeared`);
  if (!retired.reason) failures.push(`${retired.workflow}: retired workflow lacks a reason`);
}
for (const row of ledger.workflows) {
  if (!['maintained', 'retiring'].includes(row.status)) failures.push(`${row.workflow}: invalid lifecycle status`);
  if (!row.currentConsumer || !row.retirementTrigger) failures.push(`${row.workflow}: missing consumer or retirement trigger`);
  if (row.role === 'evidence-producing') {
    const source = fs.readFileSync(`.github/workflows/${row.workflow}`, 'utf8');
    if (!source.includes('publish-solver-sweep-result.mjs')) failures.push(`${row.workflow}: evidence workflow lacks standard publisher`);
    if (!source.includes('name: solver-sweep-result')) failures.push(`${row.workflow}: evidence workflow lacks standard artifact`);
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Workflow lifecycle inventory OK for ${declared.length} workflows (${ledger.workflows.filter(row => row.role === 'evidence-producing').length} evidence-producing).`);
