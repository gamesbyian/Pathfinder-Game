#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const directory = process.argv[2] ?? 'reports/experiments/2026-08-13-technique-tuning';
const output = process.argv[3] ?? path.join(directory, 'aggregate.json');
const technique = attempt => attempt.admissibleOrder ? 'admissible-order'
    : attempt.repairProbe ? 'repair-probe'
        : attempt.repair ? 'repair-fallback'
            : attempt.mainLoopLateReserve ? 'main-loop-late-reserve'
                : attempt.beamWidth ? 'beam'
                    : 'dfs';
const files = readdirSync(directory).filter(name => name.endsWith('.json') &&
    name !== path.basename(output) && name !== 'manifest.json').sort();
const arms = [];
for (const file of files) {
    const document = JSON.parse(readFileSync(path.join(directory, file), 'utf8'));
    if (!Array.isArray(document.levels) || document.summary?.levelBlind !== true) continue;
    const techniques = new Map();
    for (const level of document.levels) {
        for (const attempt of level.attempts ?? []) {
            const name = technique(attempt);
            const row = techniques.get(name) ?? { attempts: 0, levelsReached: new Set(), wins: 0, nodes: 0, elapsedMs: 0 };
            row.attempts++;
            row.levelsReached.add(level.id ?? level.level);
            if (attempt.ok) row.wins++;
            row.nodes += Number(attempt.nodesExpanded ?? 0);
            row.elapsedMs += Number(attempt.elapsedMs ?? 0);
            techniques.set(name, row);
        }
    }
    arms.push({
        file,
        levels: document.levels.length,
        solved: document.levels.filter(level => level.ok).length,
        nodes: document.levels.reduce((sum, level) => sum + Number(level.nodesExpanded ?? 0), 0),
        work: document.levels.reduce((sum, level) => sum + Number(level.workSpent ?? 0), 0),
        attemptCount: document.levels.reduce((sum, level) => sum + (level.attempts?.length ?? 0), 0),
        techniques: Object.fromEntries([...techniques].sort(([a], [b]) => a.localeCompare(b)).map(([name, row]) => [name, {
            ...row, levelsReached: row.levelsReached.size,
            winRateGivenReach: row.levelsReached.size ? row.wins / row.levelsReached.size : null,
        }])),
    });
}
const result = { schemaVersion: 1, generatedFrom: directory, armCount: arms.length, arms };
writeFileSync(output, `${JSON.stringify(result)}\n`);
console.log(`Wrote ${arms.length} arm summaries to ${output}`);
