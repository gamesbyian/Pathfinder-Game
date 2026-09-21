#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { buildResearchEnrichmentLink, RESEARCH_ENRICHMENT_KINDS } from './research-enrichment-link-lib.mjs';

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

if (!RESEARCH_ENRICHMENT_KINDS.includes(kind)) {
    throw new Error(`--kind must be one of ${RESEARCH_ENRICHMENT_KINDS.join(', ')}`);
}
if (!existsSync(path.resolve(ROOT, blockArtifact))) throw new Error(`missing block artifact: ${blockArtifact}`);
if (!existsSync(path.resolve(ROOT, artifact))) throw new Error(`missing enrichment artifact: ${artifact}`);

const blockDoc = JSON.parse(readFileSync(path.resolve(ROOT, blockArtifact), 'utf8'));
const envelope = extractResearchArtifactEnvelope(blockDoc);
const researchBlock = envelope.researchBlock;
const populationIdentity = envelope.populationIdentity;
const link = buildResearchEnrichmentLink({
    sourceBlockArtifact: blockArtifact,
    sourceArtifact: artifact,
    researchEnrichmentKind: kind,
    populationIdentity,
    researchBlock,
    stateRef,
    runRef,
});

const absoluteOut = path.resolve(ROOT, out);
mkdirSync(path.dirname(absoluteOut), { recursive: true });
assertCanonicalResearchArtifactEnvelope(link);
writeFileSync(absoluteOut, `${JSON.stringify(link, null, 2)}\n`);
console.log(JSON.stringify({
    out,
    blockId: researchBlock.blockId,
    questionId: researchBlock.questionId,
    researchEnrichmentKind: kind,
    sourceArtifact: artifact,
}, null, 2));
