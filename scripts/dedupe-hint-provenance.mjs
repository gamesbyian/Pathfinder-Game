#!/usr/bin/env node
// One-off repair for duplicate provenance discovery events. Only entries identical in every field
// except foundAt are deduped; version/config/budget/node differences remain distinct evidence.
// Dry-run by default. `provenanceEventIdentity` is the same write-time identity guard used elsewhere.
import path from 'node:path';
import process from 'node:process';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';
import { provenanceEventIdentity } from './hint-provenance-identity.mjs';

const ROOT = process.cwd();
const apply = process.argv.includes('--apply');

const CORPORA = [
    ['published', 'data/levels.json'],
    ['corpus1', 'data/stress/stress-levels.json'],
    ['corpus2', 'data/stress/stress-levels-random.json'],
];

const eventIdentity = provenanceEventIdentity;

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
            // Preserve reference identity when unchanged so writeLevelsWithHints skips that artifact.
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
