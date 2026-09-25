#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const plan = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'ci-validation-plan.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'validation-groups.json'), 'utf8'));
const executionPlan = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'ci-execution-plan.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci.yml'), 'utf8');
const activationWorkflowPath = executionPlan.activationWorkflow;
const activationWorkflow = typeof activationWorkflowPath === 'string'
  ? fs.readFileSync(path.join(root, activationWorkflowPath), 'utf8')
  : '';
const failures = [];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const validatorGroups = new Set(Object.keys(registry.validators ?? {}));
const nodeTestGroups = new Set(Object.keys(registry.nodeTests ?? {}));
const capabilities = new Set(Object.keys(plan.capabilities ?? {}));

for (const [surface, rule] of Object.entries(plan.surfaces ?? {})) {
  for (const group of rule.validatorGroups ?? []) {
    if (!validatorGroups.has(group)) failures.push(`${surface}: unknown validator group ${group}`);
  }
  for (const group of rule.nodeTestGroups ?? []) {
    if (!nodeTestGroups.has(group)) failures.push(`${surface}: unknown Node-test group ${group}`);
  }
  for (const capability of rule.capabilities ?? []) {
    if (!capabilities.has(capability)) failures.push(`${surface}: unknown capability ${capability}`);
  }
}

for (const capability of plan.always?.capabilities ?? []) {
  if (!capabilities.has(capability)) failures.push(`always: unknown capability ${capability}`);
}

for (const scriptName of plan.always?.packageScripts ?? []) {
  if (typeof packageJson.scripts?.[scriptName] !== 'string') {
    failures.push(`always: missing package script ${scriptName}`);
  }
}

for (const [name, capability] of Object.entries(plan.capabilities ?? {})) {
  if (capability.packageScript) {
    if (typeof packageJson.scripts?.[capability.packageScript] !== 'string') {
      failures.push(`${name}: missing package script ${capability.packageScript}`);
    }
    const escaped = escapeRegex(capability.packageScript);
    if (!new RegExp(`npm run ${escaped}(?=\\s|["']|$)`, 'mu').test(workflow)) {
      failures.push(`${name}: ci.yml no longer runs npm run ${capability.packageScript}`);
    }
  }
  if (capability.workflowStepId) {
    const escapedId = escapeRegex(capability.workflowStepId);
    if (!new RegExp(`^\\s*id:\\s*${escapedId}\\s*$`, 'mu').test(workflow)) {
      failures.push(`${name}: ci.yml no longer exposes step id ${capability.workflowStepId}`);
    }
  } else {
    failures.push(`${name}: missing workflowStepId`);
  }
}

const fullValidatorGroups = new Set();
const fullNodeGroups = new Set();
const fullCapabilities = new Set(plan.always?.capabilities ?? []);
for (const surface of Object.keys(plan.surfaces ?? {})) {
  const rule = plan.surfaces[surface];
  for (const group of rule.validatorGroups ?? []) fullValidatorGroups.add(group);
  for (const group of rule.nodeTestGroups ?? []) fullNodeGroups.add(group);
  for (const capability of rule.capabilities ?? []) fullCapabilities.add(capability);
}
for (const group of validatorGroups) {
  if (!fullValidatorGroups.has(group)) failures.push(`full plan omits validator group ${group}`);
}
for (const group of nodeTestGroups) {
  if (!fullNodeGroups.has(group)) failures.push(`full plan omits Node-test group ${group}`);
}
for (const capability of capabilities) {
  if (!fullCapabilities.has(capability)) failures.push(`full plan omits capability ${capability}`);
}

const packedCapabilityOwners = new Map();
for (const [jobId, job] of Object.entries(executionPlan.jobs ?? {})) {
  if (!new RegExp(`^  ${escapeRegex(jobId)}:\\s*$`, 'mu').test(workflow)) {
    failures.push(`execution plan references missing ci.yml job ${jobId}`);
  }
  for (const capability of job.capabilities ?? []) {
    if (!capabilities.has(capability)) {
      failures.push(`${jobId}: execution plan references unknown capability ${capability}`);
      continue;
    }
    if (packedCapabilityOwners.has(capability)) {
      failures.push(`${capability}: assigned to both ${packedCapabilityOwners.get(capability)} and ${jobId}`);
    } else {
      packedCapabilityOwners.set(capability, jobId);
    }
  }
}
for (const capability of capabilities) {
  if (!packedCapabilityOwners.has(capability)) {
    failures.push(`execution plan does not assign capability ${capability} to a lane`);
  }
}

const finalStatus = executionPlan.finalStatus;
if (!finalStatus?.jobId) failures.push('execution plan is missing finalStatus.jobId');
if (finalStatus?.if !== 'always()') {
  failures.push('final status must use if=always() so skipped optional lanes can be evaluated');
}
for (const dependency of finalStatus?.needs ?? []) {
  if (dependency === finalStatus.jobId) failures.push('final status cannot depend on itself');
  if (dependency !== 'impact-shadow' && !executionPlan.jobs?.[dependency]) {
    failures.push(`final status references unknown dependency ${dependency}`);
  }
  if (!Array.isArray(finalStatus.acceptedResults?.[dependency])
      || finalStatus.acceptedResults[dependency].length === 0) {
    failures.push(`final status has no accepted result contract for ${dependency}`);
  }
}
if (!(finalStatus?.acceptedResults?.['production-build'] ?? []).includes('skipped')) {
  failures.push('final status must explicitly allow production-build=skipped for scoped PRs');
}
if (!(finalStatus?.acceptedResults?.['deep-verification'] ?? []).includes('skipped')) {
  failures.push('final status must explicitly allow deep-verification=skipped for scoped PRs');
}
if (!(finalStatus?.acceptedResults?.['deep-services'] ?? []).includes('skipped')) {
  failures.push('final status must explicitly allow deep-services=skipped for scoped PRs');
}
if ((finalStatus?.acceptedResults?.['impact-shadow'] ?? []).includes('skipped')) {
  failures.push('final status must not accept a skipped impact-shadow router');
}

if (!activationWorkflowPath) {
  failures.push('execution plan is missing activationWorkflow');
} else {
  for (const jobId of [...Object.keys(executionPlan.jobs ?? {}), finalStatus?.jobId].filter(Boolean)) {
    if (!new RegExp(`^  ${escapeRegex(jobId)}:\\s*$`, 'mu').test(activationWorkflow)) {
      failures.push(`${activationWorkflowPath}: missing execution-contract job ${jobId}`);
    }
  }
  for (const scriptName of plan.always?.packageScripts ?? []) {
    const escaped = escapeRegex(scriptName);
    if (!new RegExp(`npm run ${escaped}(?=\\s|["']|$)`, 'mu').test(activationWorkflow)) {
      failures.push(`${activationWorkflowPath}: does not explicitly run always-on package script ${scriptName}`);
    }
  }
  for (const [name, capability] of Object.entries(plan.capabilities ?? {})) {
    const stepId = capability.workflowStepId;
    if (!stepId) continue;
    const escapedId = escapeRegex(stepId);
    if (!new RegExp(`^\\s*id:\\s*${escapedId}\\s*$`, 'mu').test(activationWorkflow)) {
      failures.push(`${activationWorkflowPath}: capability ${name} is missing step id ${stepId}`);
    }
  }
  if (!/validation-groups\.mjs\s+validators\b/u.test(activationWorkflow)) {
    failures.push(`${activationWorkflowPath}: missing selected validator-group execution`);
  }
  if (!/validation-groups\.mjs\s+nodeTests\b/u.test(activationWorkflow)) {
    failures.push(`${activationWorkflowPath}: missing selected Node-test-group execution`);
  }
  const activationRouterStart = activationWorkflow.search(/^  impact-shadow:\s*$/mu);
  const activationFastStart = activationWorkflow.search(/^  fast-gate:\s*$/mu);
  const activationRouterBlock = activationRouterStart >= 0 && activationFastStart > activationRouterStart
    ? activationWorkflow.slice(activationRouterStart, activationFastStart)
    : '';
  if (/continue-on-error:\s*true/u.test(activationRouterBlock)) {
    failures.push(`${activationWorkflowPath}: activation router must fail closed; continue-on-error is forbidden`);
  }
  if (!new RegExp(`^  ${escapeRegex(finalStatus?.jobId ?? '')}:\\s*$[\\s\\S]*?^    if:\\s*always\\(\\)\\s*$`, 'mu').test(activationWorkflow)) {
    failures.push(`${activationWorkflowPath}: final status job must use if: always()`);
  }
  for (const dependency of finalStatus?.needs ?? []) {
    const dependencyPattern = new RegExp(`^      - ${escapeRegex(dependency)}\\s*$`, 'mu');
    if (!dependencyPattern.test(activationWorkflow)) {
      failures.push(`${activationWorkflowPath}: final status needs list omits ${dependency}`);
    }
  }
}

if (failures.length) {
  console.error('CI validation-plan parity failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `CI validation plan matches ${validatorGroups.size} validator groups, `
  + `${nodeTestGroups.size} Node-test groups, ${capabilities.size} workflow capabilities, `
  + `and ${Object.keys(executionPlan.jobs ?? {}).length} execution lanes.`,
);
