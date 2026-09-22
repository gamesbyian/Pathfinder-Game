#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';

import { classifyGitDiff, loadImpactRules } from './ci-impact-classifier.mjs';
import { packValidationPlan } from './ci-execution-plan.mjs';
import { planValidation } from './ci-validation-plan.mjs';

function fullImpact() {
  const config = loadImpactRules();
  return {
    full: true,
    surfaces: [...config.surfaces].sort(),
    ordinary: null,
    packageImpact: null,
  };
}

function bool(value) {
  return value ? 'true' : 'false';
}

function parseArgs(argv) {
  let mode = null;
  let json = false;
  let out = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') { json = true; continue; }
    if (arg === '--out') { out = argv[++i]; continue; }
    if (arg.startsWith('--out=')) { out = arg.slice('--out='.length); continue; }
    if (arg === '--full') { mode = { full: true }; continue; }
    if (arg === '--git-diff') {
      const base = argv[i + 1];
      const head = argv[i + 2];
      if (!base || !head) throw new Error('--git-diff requires <base-ref> <head-ref>');
      mode = { base, head };
      i += 2;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }
  if (!mode) throw new Error('use --full or --git-diff <base-ref> <head-ref>');
  return { mode, json, out };
}

function writeGithubOutputs(result, plan, execution) {
  const output = process.env.GITHUB_OUTPUT;
  if (!output) return;
  const capability = name => plan.capabilities.includes(name);
  const lines = [
    `full=${bool(result.full)}`,
    `surfaces=${plan.surfaces.join(',')}`,
    `validator_groups=${plan.validatorGroups.join(',')}`,
    `node_test_groups=${plan.nodeTestGroups.join(',')}`,
    `needs_build=${bool(capability('build'))}`,
    `needs_coverage=${bool(capability('unit-coverage'))}`,
    `needs_deep_proofs=${bool(capability('deep-proofs'))}`,
    `needs_solver_canary=${bool(capability('solver-canary'))}`,
    `needs_firestore=${bool(capability('firestore-boundary'))}`,
    `fast_job_required=${bool(execution.jobs['fast-gate']?.required)}`,
    `deep_job_required=${bool(execution.jobs['deep-verification']?.required)}`,
  ];
  fs.appendFileSync(output, `${lines.join('\n')}\n`);
}

function writeSummary(result, plan, execution) {
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  const ordinaryFiles = result.ordinary?.files ?? result.files ?? [];
  const rows = ordinaryFiles.map(file =>
    `| \`${file.path}\` | ${file.rule ?? 'UNCLASSIFIED'} | ${file.surfaces.join(', ')} |`,
  );
  const packageLine = result.packageImpact
    ? `\n**package.json:** ${result.packageImpact.reason}; ${result.packageImpact.surfaces.join(', ')}\n`
    : '';
  const body = [
    '## CI impact shadow plan',
    '',
    `**Mode:** ${result.full ? 'FULL fallback' : 'scoped candidate'}`,
    `**Surfaces:** ${plan.surfaces.join(', ')}`,
    `**Validator groups:** ${plan.validatorGroups.join(', ') || '(none)'}`,
    `**Node/CLI groups:** ${plan.nodeTestGroups.join(', ') || '(none)'}`,
    `**Always/package scripts:** ${plan.packageScripts.join(', ') || '(none)'}`,
    `**Capabilities:** ${plan.capabilities.join(', ') || '(none)'}`,
    `**Fast lane:** ${execution.jobs['fast-gate']?.required ? 'required' : 'skip candidate'}`,
    `**Deep lane:** ${execution.jobs['deep-verification']?.required ? 'required' : 'skip candidate'}`,
    packageLine,
    'This is shadow-only. The existing full CI gate remains authoritative and no validation is skipped.',
    '',
    ...(rows.length ? ['| Changed path | Ownership rule | Surfaces |', '|---|---|---|', ...rows] : []),
    '',
  ].join('\n');
  fs.appendFileSync(summary, body);
}

try {
  const { mode, json } = parseArgs(process.argv.slice(2));
  const result = mode.full ? fullImpact() : classifyGitDiff(mode.base, mode.head);
  const plan = planValidation(result.surfaces);
  const execution = packValidationPlan(plan);
  const payload = {
    schemaVersion: 1,
    context: {
      eventName: process.env.GITHUB_EVENT_NAME ?? null,
      sha: process.env.GITHUB_SHA ?? null,
      ref: process.env.GITHUB_REF ?? null,
      runId: process.env.GITHUB_RUN_ID ?? null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    },
    impact: result,
    plan,
    execution,
  };
  console.log(
    'CI impact shadow:',
    JSON.stringify({
      full: result.full,
      surfaces: plan.surfaces,
      validatorGroups: plan.validatorGroups,
      nodeTestGroups: plan.nodeTestGroups,
      capabilities: plan.capabilities,
      packageReason: result.packageImpact?.reason ?? null,
      jobs: Object.fromEntries(Object.entries(execution.jobs).map(([name, job]) => [name, { required: job.required, capabilities: job.capabilities }])),
    }),
  );
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
  }
  writeGithubOutputs(result, plan, execution);
  writeSummary(result, plan, execution);
  if (json || !process.env.GITHUB_STEP_SUMMARY) console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  console.error(error.stack ?? error.message);
  process.exit(1);
}
