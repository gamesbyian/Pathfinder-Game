#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();

export function loadValidationPlan(root = ROOT) {
  const plan = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'ci-validation-plan.json'), 'utf8'));
  if (plan.schemaVersion !== 1) throw new Error(`unsupported ci-validation-plan schemaVersion ${plan.schemaVersion}`);
  return plan;
}

export function planValidation(surfaces, plan = loadValidationPlan()) {
  const selected = new Set(surfaces);
  const validatorGroups = new Set();
  const nodeTestGroups = new Set();
  const packageScripts = new Set(plan.always?.packageScripts ?? []);
  const capabilities = new Set(plan.always?.capabilities ?? []);

  for (const surface of selected) {
    const rule = plan.surfaces?.[surface];
    if (!rule) throw new Error(`unknown validation surface ${surface}`);
    for (const group of rule.validatorGroups ?? []) validatorGroups.add(group);
    for (const group of rule.nodeTestGroups ?? []) nodeTestGroups.add(group);
    for (const command of rule.packageScripts ?? []) packageScripts.add(command);
    for (const capability of rule.capabilities ?? []) capabilities.add(capability);
  }

  return {
    surfaces: [...selected].sort(),
    validatorGroups: [...validatorGroups].sort(),
    nodeTestGroups: [...nodeTestGroups].sort(),
    packageScripts: [...packageScripts].sort(),
    capabilities: [...capabilities].sort(),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const surfaces = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
    if (!surfaces.length) {
      console.error('usage: node scripts/ci-validation-plan.mjs <surface> [surface ...] [--json]');
      process.exit(2);
    }
    const result = planValidation(surfaces);
    if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Validation plan for: ${result.surfaces.join(', ')}`);
      console.log(`  validators: ${result.validatorGroups.join(', ') || '(none)'}`);
      console.log(`  node tests: ${result.nodeTestGroups.join(', ') || '(none)'}`);
      console.log(`  package scripts: ${result.packageScripts.join(', ') || '(none)'}`);
      console.log(`  capabilities: ${result.capabilities.join(', ') || '(none)'}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
