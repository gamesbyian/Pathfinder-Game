#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { provenanceEventIdentity } from '../../modules/domain/hint-runtime.mjs';
import { summarizeProvenanceEvidence } from './provenance-source-taxonomy.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=')];
}));

const corpusAliases = {
    published: 'data/levels.json',
    stress1: 'data/stress/stress-levels.json',
    corpus1: 'data/stress/stress-levels.json',
    stress2: 'data/stress/stress-levels-random.json',
    corpus2: 'data/stress/stress-levels-random.json',
};

const requested = args.get('--corpus') || 'all';
const corpora = requested === 'all'
    ? [
        ['published', corpusAliases.published],
        ['stress1', corpusAliases.stress1],
        ['stress2', corpusAliases.stress2],
    ]
    : [[requested, corpusAliases[requested] || requested]];

function auditSemanticDuplicates(hints) {
    let duplicateEvents = 0;
    let hintsWithDuplicates = 0;
    for (const hint of hints) {
        const seen = new Set();
        let dupOnHint = false;
        for (const event of hint.provenance || []) {
            const key = provenanceEventIdentity(event);
            if (seen.has(key)) {
                duplicateEvents++;
                dupOnHint = true;
            } else {
                seen.add(key);
            }
        }
        if (dupOnHint) hintsWithDuplicates++;
    }
    return { duplicateEvents, hintsWithDuplicates };
}

function flattenHints(levels) {
    return levels.flatMap(level => level?.hintRecords || []);
}

const report = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    corpora: {},
};

for (const [label, corpusPath] of corpora) {
    const levels = readLevelsWithHints(corpusPath);
    const hints = flattenHints(levels);
    const evidence = summarizeProvenanceEvidence(hints);
    const dedupAudit = auditSemanticDuplicates(hints);
    report.corpora[label] = {
        corpusPath,
        levels: levels.length,
        ...evidence,
        semanticDedupAudit: dedupAudit,
    };
}

const totals = Object.values(report.corpora);
report.total = {
    levels: totals.reduce((n, c) => n + c.levels, 0),
    hints: totals.reduce((n, c) => n + c.hints, 0),
    provenanceEntries: totals.reduce((n, c) => n + c.provenanceEntries, 0),
    unattributedHints: totals.reduce((n, c) => n + c.unattributedHints, 0),
    multiSourceHints: totals.reduce((n, c) => n + c.multiSourceHints, 0),
    duplicateEvents: totals.reduce((n, c) => n + c.semanticDedupAudit.duplicateEvents, 0),
    hintsWithDuplicates: totals.reduce((n, c) => n + c.semanticDedupAudit.hintsWithDuplicates, 0),
};

const json = JSON.stringify(report, null, 2);
const out = args.get('--out');
if (out) {
    writeFileSync(out, `${json}\n`);
    console.error(`wrote ${path.resolve(out)}`);
}
console.log(json);

if (argv.includes('--fail-on-duplicates') && report.total.duplicateEvents > 0) process.exitCode = 1;
