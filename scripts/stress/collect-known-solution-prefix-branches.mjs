#!/usr/bin/env node
/** Small contrastive known-solution-prefix branch collector using authoritative solver replay/enumeration. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { enumerateKnownPrefixBranches } from './research-analysis-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const levelLimit = Number(args.get('--limit-levels') ?? 3);
const solutionLimit = Number(args.get('--limit-solutions') ?? 3);
const outFile = args.get('--out') ?? 'reports/stress/collect-known-solution-prefix-branches.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const Solver = createSolver();
const selected = readLevelsWithHints(levelsFile).filter(level => level.hints?.length > 0).slice(0, levelLimit);
const levels = [];
for (const raw of selected) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const solutions = raw.hints.slice(0, solutionLimit).map((candidate, i) => {
        const verdict = Solver.validateCandidatePath(level, candidate);
        if (!verdict.ok) throw new Error(`${raw.id}: stored hint ${i} failed canonical referee: ${verdict.reason}`);
        return { id: `${raw.id}:${i}`, path: candidate, provenance: JSON.stringify(raw.hintRecords?.[i]?.provenance ?? []) };
    });
    const depthSet = new Set();
    for (const solution of solutions) for (const fraction of [0.2, 0.5, 0.8]) {
        depthSet.add(Math.min(solution.path.length - 2, Math.max(0, Math.floor((solution.path.length - 1) * fraction))));
    }
    const prep = api.prepLevel(level); prep._cfg = null;
    const branches = enumerateKnownPrefixBranches({ api, level, prep, knownSolutions: solutions, depths: [...depthSet].sort((a, b) => a - b) });
    levels.push({ levelId: raw.id, validSolutions: solutions.length, depths: [...depthSet].sort((a, b) => a - b), branches });
}
const all = levels.flatMap(level => level.branches);
const document = { schemaVersion: 2, generatedAt: new Date().toISOString(), levelsFile,
    selection: 'first solution-bearing levels; first stored solutions; 20/50/80% prefix depths',
    reference: { status: 'not-invoked', unknownSiblingLabel: 'reference-abstain', laterWorkflow: 'feed rows to the existing CP-SAT explicit-prefix reference labeller' },
    summary: { levels: levels.length, prefixes: new Set(all.map(row => row.prefix.join(','))).size, siblings: all.length,
        knownValidContinuations: all.filter(row => row.label === 'known-valid-continuation').length,
        referenceAbstentions: all.filter(row => row.label === 'reference-abstain').length }, levels };
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}: ${document.summary.prefixes} prefixes / ${document.summary.siblings} siblings`);
