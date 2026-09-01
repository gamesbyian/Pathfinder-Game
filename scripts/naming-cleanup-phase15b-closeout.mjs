#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['scripts', 'docs', '.github'];
const TOP_LEVEL = ['package.json', 'AGENTS.md', 'README.md'];
const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx', '.py', '.md', '.json', '.yml', '.yaml']);

function posix(file) {
    return file.split(path.sep).join('/');
}

function walk(root) {
    const out = [];
    let entries;
    try {
        entries = readdirSync(root, { withFileTypes: true });
    } catch (error) {
        if (error?.code === 'ENOENT') return out;
        throw error;
    }
    for (const entry of entries) {
        const file = path.join(root, entry.name);
        if (entry.isDirectory()) out.push(...walk(file));
        else if (entry.isFile()) out.push(posix(file));
    }
    return out;
}

function isAuthorityOrGuard(file) {
    return file.startsWith('docs/archive/')
        || file.startsWith('docs/history/')
        || file.startsWith('docs/naming-cleanup-phase-records/')
        || file.startsWith('scripts/naming-cleanup-')
        || file === 'docs/naming-cleanup-plan.md'
        || file === 'docs/naming-cleanup-ledger.json'
        || file === 'docs/naming-cleanup-history-and-lessons.md'
        || file === 'docs/naming-cleanup-process-hardening.md'
        || file === 'docs/naming-cleanup-future-phase-preparation.md'
        || file === 'docs/naming-and-vocabulary.md';
}

const files = [
    ...ROOTS.flatMap(walk),
    ...TOP_LEVEL,
].filter((file, index, all) => all.indexOf(file) === index)
    .filter(file => {
        try {
            return statSync(file).isFile() && TEXT_EXTENSIONS.has(path.extname(file));
        } catch {
            return false;
        }
    })
    .filter(file => !isAuthorityOrGuard(file))
    .sort();

const retired = [
    'scripts/stress/lib/atlas-eligibility.mjs',
    './lib/atlas-eligibility.mjs',
    'selectEligibleAtlasLevels',
    'isEligibleForCpsatAtlas',
];
const failures = [];
const canonicalImportFiles = [];

for (const file of files) {
    const source = readFileSync(file, 'utf8');
    for (const token of retired) {
        if (source.includes(token)) failures.push(`${file}: retired NC-P15-006 token ${JSON.stringify(token)}`);
    }
    if (/\bfrom\s+['"][^'"]*cpsat-branch-label-eligibility\.mjs['"]/u.test(source)) canonicalImportFiles.push(file);
}

if (failures.length) {
    console.error('Phase-15B closeout found retired CP-SAT branch-label eligibility residue:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

assert.deepEqual(
    canonicalImportFiles.sort(),
    [
        'scripts/stress/collect-prune-gap-labels.mjs',
        'scripts/stress/cpsat-branch-label-eligibility-node-test.mjs',
        'scripts/stress/cpsat-hint-harvest-sweep.mjs',
    ],
    'canonical branch-label eligibility module should have exactly the two maintained tool consumers plus its parity test',
);

const canonicalSource = readFileSync('scripts/stress/lib/cpsat-branch-label-eligibility.mjs', 'utf8');
assert.match(canonicalSource, /export function isEligibleForCpsatBranchLabeling\(/u);
assert.match(canonicalSource, /export function selectEligibleCpsatBranchLevels\(/u);
assert.doesNotMatch(canonicalSource, /Atlas/u);

const collector = readFileSync('scripts/stress/collect-prune-gap-labels.mjs', 'utf8');
assert.match(collector, /portals remain eligible/u);
assert.doesNotMatch(collector, /no portals\/filters\/flipping filters/u);

console.log(`Phase-15B closeout clean: ${files.length} maintained text surfaces contain no retired NC-P15-006 identity; canonical import ownership is exact.`);
