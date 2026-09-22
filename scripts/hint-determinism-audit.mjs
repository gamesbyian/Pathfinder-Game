#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { auditHintFile } from './hint-determinism-audit-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const roots = (value('roots') ?? 'data/hints,data/stress/hints,data/stress/hints-random')
    .split(',').map(item => item.trim()).filter(Boolean);
const outPath = value('out') ?? null;
const sampleLimit = Number(value('sample-limit') ?? 25);

function filesUnder(root) {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => path.join(root, entry.name))
        .sort();
}

const summary = {
    schemaVersion: 1,
    roots,
    files: 0,
    hints: 0,
    provenanceEvents: 0,
    comparableEvents: 0,
    repeatRunComparableGroups: 0,
    repeatRunStableGroups: 0,
    repeatRunInputDivergenceGroups: 0,
    exactEventCrossPathGroups: 0,
    excludedReasons: {},
    samples: { exactEventCrossPath: [], repeatRunInputDivergence: [] },
};

for (const root of roots) {
    for (const file of filesUnder(root)) {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        const levelId = path.basename(file, '.json');
        const result = auditHintFile(levelId, raw.hints ?? []);
        summary.files += 1;
        summary.hints += result.hints;
        summary.provenanceEvents += result.provenanceEvents;
        summary.comparableEvents += result.comparableEvents;
        summary.exactEventCrossPathGroups += result.exactEventCrossPath.length;
        summary.repeatRunInputDivergenceGroups += result.repeatRunInputDivergence.length;
        summary.repeatRunStableGroups += result.repeatRunStable.length;
        summary.repeatRunComparableGroups += result.repeatRunInputDivergence.length + result.repeatRunStable.length;
        for (const [reason, count] of Object.entries(result.excludedReasons)) {
            summary.excludedReasons[reason] = (summary.excludedReasons[reason] ?? 0) + count;
        }
        for (const row of result.exactEventCrossPath) {
            if (summary.samples.exactEventCrossPath.length < sampleLimit) {
                summary.samples.exactEventCrossPath.push({ file, ...row });
            }
        }
        for (const row of result.repeatRunInputDivergence) {
            if (summary.samples.repeatRunInputDivergence.length < sampleLimit) {
                summary.samples.repeatRunInputDivergence.push({ file, ...row });
            }
        }
    }
}

const json = JSON.stringify(summary, null, 2);
if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json + '\n');
}
console.log(json);
