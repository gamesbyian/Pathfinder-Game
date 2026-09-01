#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildFamilyIndex, coverageByParent, queryFamilyIndex, writeFamilyIndex } from './family-index-lib.mjs';
import { variantFamilyDatasetRootArg } from './family-paths.mjs';

const argv = process.argv.slice(2);
const command = argv.find(arg => !arg.startsWith('--')) ?? 'query';
const arg = name => argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const root = variantFamilyDatasetRootArg(argv);
const indexPath = path.resolve(arg('index') ?? path.join(root, '.cache/family-index.json'));
const load = () => {
    if (!existsSync(indexPath)) throw new Error(`index not found: ${indexPath}; run family:index first`);
    return JSON.parse(readFileSync(indexPath, 'utf8'));
};
const filters = Object.fromEntries(['corpus', 'parentCorpus', 'parentId', 'familyId', 'variantId', 'mode', 'relation', 'operator', 'objectType', 'evaluated', 'solved']
    .map(key => [key, arg(key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`))]).filter(([, value]) => value != null));

if (command === 'index') {
    const index = buildFamilyIndex(root);
    const output = path.resolve(arg('out') ?? indexPath);
    await import('node:fs').then(({ mkdirSync }) => mkdirSync(path.dirname(output), { recursive: true }));
    writeFamilyIndex(index, output);
    console.log(JSON.stringify({ output, ...index.counts }, null, 2));
} else if (command === 'show' || command === 'query') {
    const result = queryFamilyIndex(load(), filters);
    console.log(JSON.stringify(command === 'show' && result.variants.length === 1 ? result.variants[0] : result, null, 2));
} else if (command === 'coverage') {
    console.log(JSON.stringify(coverageByParent(load(), filters), null, 2));
} else {
    console.error('usage: family-index.mjs index|show|query|coverage [--variant-family-dataset-root=PATH] [--index=PATH] [filters]');
    process.exitCode = 2;
}
