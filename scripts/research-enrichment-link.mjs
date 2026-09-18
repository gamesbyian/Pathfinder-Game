#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { assertResearchBlock } from './solver-research-block-lineage.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const required = name => {
    const found = value(name);
    if (!found) throw new Error(`--${name}=... is required`);
    return found;
};

const ROOT = process.cwd();
const blockArtifact = required('block-artifact');
const artifact = required('artifact');
const kind = required('kind');
const out = required('out');
const stateRef = value('state-ref') || null;
const runRef = value('run-ref') || null;

if (!['observation', 'exact', 'treatment', 'artifact'].includes(kind)) {
    throw new Error('--kind must be observation, exact, treatment, or artifact');
}
if (!existsSync(path.resolve(ROOT, blockArtifact))) throw new Error(`missing block artifact: ${blockArtifact}`);
if (!existsSync(path.resolve(ROOT, artifact))) throw new Error(`missing enrichment artifact: ${artifact}`);

const blockDoc = JSON.parse(readFileSync(path.resolve(ROOT, blockArtifact), 'utf8'));
const researchBlock = blockDoc?.researchBlock ?? blockDoc?.population?.researchBlock ?? null;
const populationIdentity = blockDoc?.populationIdentity ?? blockDoc?.population?.corpusIdentity ?? null;
assertResearchBlock(researchBlock, { populationIdentity });

const link = {
    schemaVersion: 1,
    kind: 'pathfinder-research-enrichment-link',
    researchEnrichmentKind: kind,
    createdAt: new Date().toISOString(),
    sourceBlockArtifact: blockArtifact,
    sourceArtifact: artifact,
    stateRef,
    runRef,
    populationIdentity,
    researchBlock,
};

const absoluteOut = path.resolve(ROOT, out);
mkdirSync(path.dirname(absoluteOut), { recursive: true });
writeFileSync(absoluteOut, `${JSON.stringify(link, null, 2)}\n`);
console.log(JSON.stringify({
    out,
    blockId: researchBlock.blockId,
    questionId: researchBlock.questionId,
    researchEnrichmentKind: kind,
    sourceArtifact: artifact,
}, null, 2));
