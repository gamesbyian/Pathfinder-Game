#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { compareExperimentArms, levelSelectionHash, validateExperimentManifest } from './experiment-manifest-lib.mjs';
import { defaultConfig } from './ablation-config.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...value] = x.split('='); return [key, value.join('=')];
}));
if (args.has('--compare-control') || args.has('--compare-treatment')) {
    for (const key of ['--compare-control', '--compare-treatment', '--target-flag']) if (!args.get(key)) throw new Error(`missing ${key}`);
    const control = JSON.parse(readFileSync(args.get('--compare-control'), 'utf8'));
    const treatment = JSON.parse(readFileSync(args.get('--compare-treatment'), 'utf8'));
    const result = compareExperimentArms(control, treatment, args.get('--target-flag'));
    console.log(`Matched arms OK: ${result.levels} levels; target=${result.targetFlag}`);
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
const flags = Object.fromEntries((args.get('--flags') ?? '').split(',').filter(Boolean).map(entry => {
    const [key, raw = 'true'] = entry.split('='); return [key, raw === 'true' ? true : raw === 'false' ? false : raw];
}));
const productionFlags = defaultConfig();
const unknownFlags = Object.keys(flags).filter(key => !(key in productionFlags));
if (unknownFlags.length) throw new Error(`unknown solver flags: ${unknownFlags.join(',')}`);
const git = (...gitArgs) => execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain') && !args.has('--allow-dirty')) throw new Error('refusing experiment preflight from a dirty worktree');
const manifest = validateExperimentManifest({
    schemaVersion: 1, experimentId: required('--experiment-id'), runId: required('--run-id'),
    solverRef: git('rev-parse', 'HEAD'), corpus, levelIds: requested, levelSelectionHash: levelSelectionHash(requested),
    arm, solverFlags: { ...productionFlags, ...flags }, seeds: (args.get('--seeds') ?? '').split(',').filter(Boolean).map(Number),
    canonicalWorkBudget: Number(required('--work-budget')), wallDeadlineMs: Number(required('--wall-deadline-ms')),
    profile: required('--profile'), instrumentation: args.get('--instrumentation') ?? 'off', output,
    createdAt: new Date().toISOString(),
});
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Preflight OK: ${arm}, ${requested.length} levels, ${manifest.solverRef}, ${output}`);
