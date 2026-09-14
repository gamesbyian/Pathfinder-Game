#!/usr/bin/env node
/**
 * Human/editor-parent controlled-contrast research front door.
 *
 * This is intentionally NOT another mutation engine. It delegates generation to family-generate.mjs,
 * which already owns witness-preserving transformations, schema/referee validation, fingerprints and
 * variant provenance. This wrapper owns the research contract that makes those transformations a
 * third construction regime: human/editor parent -> controlled transformation -> referee-certified
 * descendant.
 *
 * Required:
 *   --question=<stable-question-id-or-short-description>
 *   --evidence-role=<development|confirmation|transfer>
 *   --parent=<id-or-position>
 *   --mode=<family-generate mode>
 *
 * Defaults:
 *   --parent-corpus=data/levels.json
 *   --parent-exposure=unknown
 *   family output under one shared tmp/human-parent-contrasts/families/ ID namespace
 *   research context under tmp/human-parent-contrasts/contexts/<question>/
 *
 * Confirmation/transfer claims require --parent-exposure=locked-untouched. This does not magically
 * prove independence; it forces the caller to make the claim explicit before outcomes exist.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const values = new Map();
for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [key, ...rest] = arg.split('=');
    values.set(key, rest.join('='));
}

const required = key => {
    const value = values.get(key);
    if (!value) {
        console.error(`missing required ${key}=...`);
        process.exit(2);
    }
    return value;
};

const question = required('--question');
const evidenceRole = required('--evidence-role');
const parent = required('--parent');
const mode = required('--mode');
const parentCorpus = values.get('--parent-corpus') || 'data/levels.json';
const parentExposure = values.get('--parent-exposure') || 'unknown';
const dryRun = values.has('--dry-run');

const evidenceRoles = new Set(['development', 'confirmation', 'transfer']);
const exposureStates = new Set(['unknown', 'development', 'locked-untouched']);
if (!evidenceRoles.has(evidenceRole)) {
    console.error(`--evidence-role must be one of ${[...evidenceRoles].join(', ')}`);
    process.exit(2);
}
if (!exposureStates.has(parentExposure)) {
    console.error(`--parent-exposure must be one of ${[...exposureStates].join(', ')}`);
    process.exit(2);
}
if (evidenceRole !== 'development' && parentExposure !== 'locked-untouched') {
    console.error(`${evidenceRole} evidence requires --parent-exposure=locked-untouched; use development when parent independence is unknown or already spent.`);
    process.exit(2);
}

const slug = question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'question';
const safeParent = parent.replace(/[^A-Za-z0-9._-]+/g, '_');
const safeMode = mode.replace(/[^A-Za-z0-9._-]+/g, '_');
const familyDir = path.join('tmp', 'human-parent-contrasts', 'families');
const contextDir = path.join('tmp', 'human-parent-contrasts', 'contexts', slug);
const defaultOut = path.join(familyDir, `family-${safeParent}-${safeMode}-${slug}.json`);
const out = values.get('--out') || defaultOut;
const manifestOut = values.get('--manifest-out') || out.replace(/\.json$/i, '-manifest.json');
const contextOut = values.get('--context-out') || path.join(contextDir, `family-${safeParent}-${safeMode}-research-context.json`);

const wrapperOnly = new Set([
    '--question', '--evidence-role', '--parent-exposure', '--context-out', '--dry-run',
]);
const delegatedArgs = argv.filter(arg => {
    const key = arg.split('=')[0];
    return !wrapperOnly.has(key) && key !== '--out' && key !== '--manifest-out' && key !== '--parent-corpus';
});
delegatedArgs.push(`--parent-corpus=${parentCorpus}`, `--out=${out}`, `--manifest-out=${manifestOut}`);

const context = {
    schemaVersion: 1,
    apparatus: 'human-editor-parent-controlled-contrast',
    question,
    evidenceRole,
    parentExposure,
    independentUnit: 'parent-family',
    parent: { corpus: parentCorpus, selector: parent },
    transformationMode: mode,
    generation: {
        delegatedTool: 'scripts/family-generate.mjs',
        solverOutcomeFiltering: false,
        output: out,
        familyManifest: manifestOut,
        siblingIdNamespace: path.dirname(out),
    },
    witnessInterpretation: 'admissibility-and-solvability-certificate-only',
    interpretationRules: [
        'Sibling descendants are correlated; row count is not independent sample size.',
        'Split discovery, confirmation and transfer by whole parent family.',
        'A preserved witness proves at least one valid solution, not the complete solution-space structure.',
        'Once outcomes influence treatment design, that parent family is development evidence for descendants of the decision.',
        'Persistent families generated in separate worktrees must be reconciled through a collision-safe shared variant-ID namespace before datasets are combined.',
    ],
};

if (dryRun) {
    console.log(JSON.stringify({
        ...context,
        dryRun: true,
        command: [process.execPath, 'scripts/run-bundled.mjs', 'scripts/family-generate.mjs', '--', ...delegatedArgs],
    }, null, 2));
    process.exit(0);
}

const child = spawnSync(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/family-generate.mjs', '--', ...delegatedArgs,
], { stdio: 'inherit', cwd: process.cwd() });
if (child.error) throw child.error;
if (child.status !== 0) process.exit(child.status ?? 1);

if (!existsSync(manifestOut)) {
    console.error(`family generation succeeded but expected manifest was not found: ${manifestOut}`);
    process.exit(1);
}
const familyManifest = JSON.parse(readFileSync(manifestOut, 'utf8'));
const completedContext = {
    ...context,
    createdTimestamp: new Date().toISOString(),
    parent: {
        ...context.parent,
        levelId: familyManifest.parentLevelId ?? null,
        contentHash: familyManifest.parentContentHash ?? null,
    },
    generation: {
        ...context.generation,
        familyId: familyManifest.familyId ?? null,
        generatorVersion: familyManifest.generatorVersion ?? null,
        acceptedVariantCount: familyManifest.acceptedCount ?? null,
        generationRuns: familyManifest.generationRuns ?? [],
    },
};
mkdirSync(path.dirname(contextOut), { recursive: true });
writeFileSync(contextOut, `${JSON.stringify(completedContext, null, 2)}\n`);
console.log(`Wrote human-parent contrast research context to ${contextOut}.`);
