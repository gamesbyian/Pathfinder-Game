#!/usr/bin/env node
/**
 * One-off data repair: drops provenance entries that record the SAME discovery event twice.
 *
 * WHAT COUNTS AS REDUNDANT (deliberately narrow)
 *
 *   Only entries identical in EVERY field except `foundAt`. Measured 2026-07-29 across all three
 *   corpora: 24 such entries out of 88,451 (0.03%), every one of them `prefix-anchored`, from a
 *   single 2026-07-11 run at one commit, with `foundAt` timestamps 1-4ms apart. That is one
 *   discovery run appending its result twice — not two independent rediscoveries — so removing them
 *   UPHOLDS the documented "one entry per discovery event" invariant rather than violating the
 *   append-only rule. No recurrence after 2026-07-11.
 *
 * WHAT IS *NOT* REDUNDANT, AND MUST NOT BE REMOVED
 *
 *   Entries that differ only by `solver.version` (311 across the corpora) look redundant under a
 *   looser reading — same technique, same profile, same budget, often the same nodesExpanded — but
 *   the commit is exactly what makes them valuable: they are the same search re-run at a different
 *   code version, which is the entire input to scripts/stress/hint-cost-drift.mjs. Collapsing them
 *   would delete the only retroactive cross-commit cost signal the repo has (800 stable / 149
 *   drifted comparisons). Likewise a same-technique entry at a different attemptIndex, budget, or
 *   node count is a genuinely distinct run.
 *
 *   More broadly: same-technique rediscovery is NOT noise. Of 6,570 same-technique multi-entry
 *   hints, only ~5% involved a different config; the rest are repeat runs whose value is precisely
 *   the comparison between them.
 *
 * Usage:
 *   node scripts/dedupe-hint-provenance.mjs            # dry run — reports, writes nothing
 *   node scripts/dedupe-hint-provenance.mjs --apply    # rewrite the affected hint artifacts
 */
import path from 'node:path';
import process from 'node:process';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';

const ROOT = process.cwd();
const apply = process.argv.includes('--apply');

const CORPORA = [
    ['published', 'data/levels.json'],
    ['corpus1', 'data/stress/stress-levels.json'],
    ['corpus2', 'data/stress/stress-levels-random.json'],
];

/** Identity of a discovery EVENT: everything except when it was written down. */
function eventIdentity(entry) {
    const { foundAt: _foundAt, ...rest } = entry;
    return JSON.stringify(rest);
}

let totalRemoved = 0;
const perCorpus = [];

for (const [name, levelsPath] of CORPORA) {
    const abs = path.resolve(ROOT, levelsPath);
    const levels = readLevelsWithHints(abs);
    let removed = 0;
    const touchedLevels = new Set();
    const samples = [];

    for (const level of levels) {
        let levelChanged = false;
        const nextRecords = level.hintRecords.map((hint) => {
            const prov = hint.provenance || [];
            if (prov.length < 2) return hint;
            const seen = new Set();
            const kept = [];
            for (const entry of prov) {
                const id = eventIdentity(entry);
                if (seen.has(id)) {
                    removed++;
                    levelChanged = true;
                    if (samples.length < 3) {
                        samples.push(`${level.id ?? '?'}: ${entry.solver?.technique} @ ${String(entry.solver?.version).slice(0, 7)} (${entry.foundAt})`);
                    }
                    continue;
                }
                seen.add(id);
                kept.push(entry);
            }
            // Reassign only when something changed: writeLevelsWithHints treats an untouched
            // (reference-identical) hintRecords array as "do not rewrite this file", which is what
            // keeps this from re-serializing all ~2,900 artifacts for a 24-entry fix.
            return kept.length === prov.length ? hint : { ...hint, provenance: kept };
        });
        if (levelChanged) {
            level.hintRecords = nextRecords;
            touchedLevels.add(level.id ?? levels.indexOf(level) + 1);
        }
    }

    perCorpus.push({ name, removed, levels: touchedLevels.size, samples });
    totalRemoved += removed;

    if (apply && removed > 0) {
        const { hintFilesChanged } = writeLevelsWithHints(abs, levels);
        console.log(`${name}: rewrote ${hintFilesChanged} hint artifact(s)`);
    }
}

console.log(`\n${apply ? 'Removed' : 'Would remove'} ${totalRemoved} duplicate provenance entr(ies):`);
for (const c of perCorpus) {
    console.log(`  ${c.name.padEnd(11)} ${String(c.removed).padStart(4)} entr(ies) across ${c.levels} level(s)`);
    c.samples.forEach(s => console.log(`      e.g. ${s}`));
}
if (!apply) console.log('\n(dry run — pass --apply to write)');
