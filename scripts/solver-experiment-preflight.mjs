#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compareExperimentArms, levelSelectionHash, validateExperimentManifest } from './experiment-manifest-lib.mjs';
import { defaultConfig } from '../modules/solver/ablation-config.js';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...value] = x.split('='); return [key, value.join('=')];
}));
const parseAssignments = (raw, { coerceBooleans = false } = {}) => Object.fromEntries((raw ?? '').split(',').filter(Boolean).map(entry => {
    const [key, ...rest] = entry.split('=');
    if (!key || rest.length === 0) throw new Error(`invalid assignment ${entry}`);
    const rawValue = rest.join('=');
    const value = coerceBooleans ? (rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue) : rawValue;
    return [key, value];
}));
const parseWorkflowInputs = () => {
    if (args.has('--workflow-inputs-json')) {
        const value = JSON.parse(args.get('--workflow-inputs-json'));
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('--workflow-inputs-json must decode to an object');
        return value;
    }
    return parseAssignments(args.get('--workflow-inputs'));
};

if (args.has('--compare-control') || args.has('--compare-treatment')) {
    for (const key of ['--compare-control', '--compare-treatment', '--target-flag']) if (!args.get(key)) throw new Error(`missing ${key}`);
    const control = JSON.parse(readFileSync(args.get('--compare-control'), 'utf8'));
    const treatment = JSON.parse(readFileSync(args.get('--compare-treatment'), 'utf8'));
    const allowedWorkflowInputDifferences = (args.get('--allow-workflow-input-differences') ?? '').split(',').filter(Boolean);
    const result = compareExperimentArms(control, treatment, args.get('--target-flag'), { allowedWorkflowInputDifferences });
    console.log(`Matched arms OK: ${result.levels} levels; target=${result.targetFlag}; workflow treatment dimensions=${result.allowedWorkflowInputDifferences.join(',') || '(none)'}`);
    process.exit(0);
}
const required = key => { const value = args.get(key); if (!value) throw new Error(`missing ${key}`); return value; };
const corpus = required('--corpus'), arm = required('--arm'), output = required('--output');
const document = JSON.parse(readFileSync(corpus, 'utf8'));
const levels = Array.isArray(document) ? document : document.levels;
const requested = args.get('--level-ids')?.split(',').filter(Boolean) ?? levels.map(x => String(x.id));
const available = new Set(levels.map(x => String(x.id)));
const missing = requested.filter(id => !available.has(id));
if (missing.length) throw new Error(`selected levels absent from corpus: ${missing.slice(0, 5).join(',')}`);
const flags = parseAssignments(args.get('--flags'), { coerceBooleans: true });
const productionFlags = defaultConfig();
const unknownFlags = Object.keys(flags).filter(key => !(key in productionFlags));
if (unknownFlags.length) throw new Error(`unknown solver flags: ${unknownFlags.join(',')}`);
const workflow = args.get('--workflow') ?? 'direct';
const workflowInputs = parseWorkflowInputs();
const solverFlags = { ...productionFlags, ...flags };

if (workflow === 'solver-stress-refresh') {
    const enabled = (workflowInputs.enable_flags ?? '').split(',').filter(Boolean);
    const disabled = (workflowInputs.disable_flags ?? '').split(',').filter(Boolean);
    const unknownDispatchFlags = [...enabled, ...disabled].filter(flag => !(flag in productionFlags));
    if (unknownDispatchFlags.length) throw new Error(`unknown solver flags in workflow inputs: ${[...new Set(unknownDispatchFlags)].join(',')}`);
    const overlap = enabled.filter(flag => disabled.includes(flag));
    if (overlap.length) throw new Error(`workflow enables and disables the same solver flag: ${[...new Set(overlap)].join(',')}`);
    const workflowConfig = { ...productionFlags };
    for (const flag of enabled) workflowConfig[flag] = true;
    for (const flag of disabled) workflowConfig[flag] = false;
    const drift = Object.keys(productionFlags).filter(flag => workflowConfig[flag] !== solverFlags[flag]);
    if (drift.length) throw new Error(`solverFlags disagree with solver-stress-refresh enable/disable inputs: ${drift.join(',')}`);
}

const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain') && !args.has('--allow-dirty')) throw new Error('refusing experiment preflight from a dirty worktree');
const manifest = validateExperimentManifest({
    schemaVersion: 2, experimentId: required('--experiment-id'), runId: required('--run-id'),
    solverRef: git('rev-parse', 'HEAD'), corpus, levelIds: requested, levelSelectionHash: levelSelectionHash(requested),
    arm, solverFlags, workflow, workflowInputs,
    seeds: (args.get('--seeds') ?? '').split(',').filter(Boolean).map(Number),
    canonicalWorkBudget: Number(required('--work-budget')), wallDeadlineMs: Number(required('--wall-deadline-ms')),
    profile: required('--profile'), instrumentation: args.get('--instrumentation') ?? 'off', output,
    createdAt: new Date().toISOString(),
});
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Preflight OK: ${arm}, ${requested.length} levels, ${manifest.solverRef}, workflow=${workflow}, ${output}`);
