#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { readLevelHints } from './level-data-io.mjs';
import { queryHintRecords, summarizeHintRecords } from './hint-query-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = name => args.includes(`--${name}`);

const levelsPath = value('levels') ?? 'data/levels.json';
const id = value('id');
const standard = value('standard') ?? 'strict';
const limit = Number(value('limit') ?? 20);
const evidencePurpose = value('purpose') ?? null;
const evidenceApplicability = value('applicability') ?? null;
const comparableSolverVersions = (value('comparable-solver-versions') ?? value('solver-version') ?? '')
    .split(',').map(item => item.trim()).filter(Boolean);

if (!id) {
    console.error('Usage: npx tsx scripts/hint-query.mjs --id=P00001 [--levels=data/levels.json] [--summary] [--purpose=solution-atlas] [--applicability=admissible] [--solver-version=<sha>|--comparable-solver-versions=<sha,...>] [--class=cold-capability] [--source=pathfinder-solver] [--solver=pathfinder-solver] [--technique=repair] [--retry-tier=late-repair-search] [--query=text] [--standard=strict|narrow] [--limit=20] [--full]');
    process.exit(2);
}
if (!['strict', 'narrow'].includes(standard)) {
    console.error('--standard must be strict or narrow');
    process.exit(2);
}
if (!Number.isInteger(limit) || limit < 1) {
    console.error('--limit must be a positive integer');
    process.exit(2);
}

const resolvedLevels = path.resolve(levelsPath);
const hints = readLevelHints(resolvedLevels, id);
const filters = {
    standard,
    className: value('class'),
    source: value('source'),
    solverId: value('solver'),
    technique: value('technique'),
    retryTier: value('retry-tier'),
    query: value('query'),
    evidencePurpose,
    evidenceApplicability,
    comparableSolverVersions,
};
const hasFilter = Object.entries(filters).some(([key, v]) => key !== 'standard' && (Array.isArray(v) ? v.length : v));

if (has('summary') || !hasFilter) {
    const summary = summarizeHintRecords(hints, { standard });
    const evidence = evidencePurpose ? queryHintRecords(hints, {
        evidencePurpose, comparableSolverVersions,
    }).map(({ compact }) => compact.evidence) : null;
    console.log(JSON.stringify({ levelId: id, levels: levelsPath, ...summary, ...(evidence ? { evidence } : {}) }, null, 2));
} else {
    const matches = queryHintRecords(hints, filters);
    const selected = matches.slice(0, limit);
    console.log(JSON.stringify({
        levelId: id,
        levels: levelsPath,
        coldEvidenceStandard: standard,
        totalHints: hints.length,
        matched: matches.length,
        shown: selected.length,
        entries: selected.map(({ compact, hint }) => has('full') ? { ...compact, path: hint.path, provenance: hint.provenance } : compact),
    }, null, 2));
}
