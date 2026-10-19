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
    if (row.evidenceTransport === 'specialized-artifact-only') {
      // A bounded one-shot experiment may have a deliberately custom evidence schema that
      // cannot truthfully enter the ordinary solver-sweep/Hints pipeline. Keep it classified
      // as evidence-producing (and audited by the Hint/failure disposition registries) rather
      // than falsely marking it operational just to escape the standard publisher gate.
      if (!row.evidenceTransportReason) failures.push(`${row.workflow}: specialized artifact transport requires a reason`);
      if (!source.includes('uses: actions/upload-artifact@')
          || !source.includes('if: always()') && !source.includes('if: ${{ always()')) {
        failures.push(`${row.workflow}: specialized evidence requires partial-failure artifact upload`);
      }
      if (!source.includes('retention-days:')) {
        failures.push(`${row.workflow}: specialized evidence lacks explicit artifact retention`);
      }
    } else {
      if (row.evidenceTransport) failures.push(`${row.workflow}: unrecognized evidence transport ${row.evidenceTransport}`);
      if (!source.includes('publish-solver-sweep-result.mjs') && !source.includes('sweep-publish.mjs')) {
        failures.push(`${row.workflow}: evidence workflow lacks standard publisher`);
      }
      if (!source.includes('name: solver-sweep-result')) failures.push(`${row.workflow}: evidence workflow lacks standard artifact`);
    }
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Workflow lifecycle inventory OK for ${declared.length} workflows (${ledger.workflows.filter(row => row.role === 'evidence-producing').length} evidence-producing).`);
