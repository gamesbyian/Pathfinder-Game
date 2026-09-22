#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { planValidation } from './ci-validation-plan.mjs';

const ROOT = process.cwd();

export function loadExecutionPlan(root = ROOT) {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'ci-execution-plan.json'), 'utf8'));
  if (config.schemaVersion !== 1) throw new Error(`unsupported ci-execution-plan schemaVersion ${config.schemaVersion}`);
  return config;
}

export function packValidationPlan(validationPlan, executionPlan = loadExecutionPlan()) {
  const selectedCapabilities = new Set(validationPlan.capabilities ?? []);
  const jobs = {};
  for (const [jobId, job] of Object.entries(executionPlan.jobs ?? {})) {
    const selectedJobCapabilities = (job.capabilities ?? []).filter(capability => selectedCapabilities.has(capability));
    const hasSelectedGroups =
      job.validatorGroups === 'selected' && (validationPlan.validatorGroups?.length ?? 0) > 0
      || job.nodeTestGroups === 'selected' && (validationPlan.nodeTestGroups?.length ?? 0) > 0;
    const required = Boolean(job.alwaysMaterialized || selectedJobCapabilities.length || hasSelectedGroups);
    jobs[jobId] = {
      required,
      capabilities: selectedJobCapabilities,
      validatorGroups: job.validatorGroups === 'selected' ? [...(validationPlan.validatorGroups ?? [])] : [],
      nodeTestGroups: job.nodeTestGroups === 'selected' ? [...(validationPlan.nodeTestGroups ?? [])] : [],
    };
  }
  return {
    surfaces: [...(validationPlan.surfaces ?? [])],
    packageScripts: [...(validationPlan.packageScripts ?? [])],
    jobs,
    finalStatus: executionPlan.finalStatus,
  };
}

export function packSurfaces(surfaces) {
  return packValidationPlan(planValidation(surfaces));
}

export function finalStatusPasses(results, executionPlan = loadExecutionPlan()) {
  const contract = executionPlan.finalStatus;
  if (!contract) throw new Error('missing finalStatus contract');
  for (const dependency of contract.needs ?? []) {
    const accepted = contract.acceptedResults?.[dependency] ?? [];
    if (!accepted.includes(results?.[dependency])) return false;
  }
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const surfaces = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
    if (!surfaces.length) {
      console.error('usage: node scripts/ci-execution-plan.mjs <surface> [surface ...] [--json]');
      process.exit(2);
    }
    const result = packSurfaces(surfaces);
    if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Execution plan for: ${result.surfaces.join(', ')}`);
      for (const [job, plan] of Object.entries(result.jobs)) {
        console.log(`  ${job}: ${plan.required ? 'required' : 'skipped-candidate'}; capabilities=${plan.capabilities.join(',') || '(none)'}`);
      }
      console.log(`  final status: ${result.finalStatus.jobId}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
