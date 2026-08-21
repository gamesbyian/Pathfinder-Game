#!/usr/bin/env node
// Regenerates the hint-provenance coverage/admissibility figures quoted in CLAUDE.md's Provenance
// section, across all three real corpora.
//
// These figures were previously measured by hand in throwaway scripts, which is how a wrong cold
// share reached CLAUDE.md (see provenance-classes.mjs's header). Anything quoting them should be
// able to re-derive them with one command instead of re-implementing the predicate.
//
// Usage:
//   npx tsx scripts/stress/provenance-coverage-report.mjs [--json=<path>] [--standard=strict|narrow]
//
// Runs under tsx because the canonical predicate imports modules/domain/hint-types.ts.
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { summarizeProvenanceClasses } from './provenance-classes.mjs';

const CORPORA = [
    { name: 'published', levels: 'data/levels.json' },
    { name: 'stress-corpus-1', levels: 'data/stress/stress-levels.json' },
    { name: 'stress-corpus-2', levels: 'data/stress/stress-levels-random.json' },
];

const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const pct = (n, d) => (d === 0 ? '—' : `${((100 * n) / d).toFixed(1)}%`);

export function buildReport({ standard = 'strict' } = {}) {
    const corpora = CORPORA.map(({ name, levels }) => {
        const hints = readLevelsWithHints(levels).flatMap(level => level.hintRecords ?? []);
        return { corpus: name, levelsPath: levels, ...summarizeProvenanceClasses(hints, { standard }) };
    });
    const totals = corpora.reduce((acc, row) => {
        for (const key of ['hints', 'entries', 'noProvenanceHints', 'coldHints', 'hintGuidedHints',
            'inheritedWitnessHints', 'coldEntries']) acc[key] += row[key];
        return acc;
    }, {
        hints: 0, entries: 0, noProvenanceHints: 0, coldHints: 0, hintGuidedHints: 0,
        inheritedWitnessHints: 0, coldEntries: 0,
    });
    return { generatedAt: new Date().toISOString(), coldEvidenceStandard: standard, corpora, totals };
}

function main() {
    const standard = arg('standard') ?? 'strict';
    const report = buildReport({ standard });
    const header = ['corpus', 'hints', 'entries', 'no provenance', 'hint-guided', 'cold-capability'];
    const rows = [...report.corpora, { corpus: 'TOTAL', ...report.totals }].map(r => [
        r.corpus, String(r.hints), String(r.entries),
        `${r.noProvenanceHints} (${pct(r.noProvenanceHints, r.hints)})`,
        `${r.hintGuidedHints} (${pct(r.hintGuidedHints, r.hints)})`,
        `${r.coldHints} (${pct(r.coldHints, r.hints)})`,
    ]);
    const widths = header.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
    const line = cells => cells.map((c, i) => c.padEnd(widths[i])).join('  ');
    console.log(`Cold-evidence standard: ${standard} (see scripts/stress/provenance-classes.mjs)`);
    console.log(line(header));
    console.log(widths.map(w => '-'.repeat(w)).join('  '));
    for (const row of rows) console.log(line(row));
    console.log('\nCold-capability counts hints with >=1 cold discovery event. Hints with no');
    console.log('provenance are a blind spot, not a negative — they are excluded from every class.');

    const jsonPath = arg('json');
    if (jsonPath) {
        writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
        console.log(`\nWrote ${jsonPath}`);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
