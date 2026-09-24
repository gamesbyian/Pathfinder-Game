#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { auditHintFile } from './hint-determinism-audit-lib.mjs';
import { decodeHintArtifact } from '../modules/domain/hint-runtime.mjs';

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

// Modern Phase-3 provenance can carry canonical solver-request/execution identity directly.
 // Historical entries still fall back to the older recorded-input approximation, and those
 // collisions still require source-run/experiment reconciliation before interpretation.
const summary = {
    schemaVersion: 1,
    roots,
    files: 0,
    hints: 0,
    provenanceEvents: 0,
    comparableEvents: 0,
    canonicalComparableEvents: 0,
    legacyComparableEvents: 0,
    repeatRunComparableGroups: 0,
    repeatRunStableGroups: 0,
    repeatRunRecordedInputCollisionGroups: 0,
    exactEventCrossPathGroups: 0,
    excludedReasons: {},
    samples: { exactEventCrossPath: [], repeatRunRecordedInputCollision: [] },
};

for (const root of roots) {
    for (const file of filesUnder(root)) {
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        const levelId = path.basename(file, '.json');
        const result = auditHintFile(levelId, decodeHintArtifact(raw));
        summary.files += 1;
        summary.hints += result.hints;
        summary.provenanceEvents += result.provenanceEvents;
        summary.comparableEvents += result.comparableEvents;
        summary.canonicalComparableEvents += result.canonicalComparableEvents;
        summary.legacyComparableEvents += result.legacyComparableEvents;
        summary.exactEventCrossPathGroups += result.exactEventCrossPath.length;
        summary.repeatRunRecordedInputCollisionGroups += result.repeatRunRecordedInputCollision.length;
        summary.repeatRunStableGroups += result.repeatRunStable.length;
        summary.repeatRunComparableGroups += result.repeatRunRecordedInputCollision.length + result.repeatRunStable.length;
        for (const [reason, count] of Object.entries(result.excludedReasons)) {
            summary.excludedReasons[reason] = (summary.excludedReasons[reason] ?? 0) + count;
        }
        for (const row of result.exactEventCrossPath) {
            if (summary.samples.exactEventCrossPath.length < sampleLimit) {
                summary.samples.exactEventCrossPath.push({ file, ...row });
            }
        }
        for (const row of result.repeatRunRecordedInputCollision) {
            if (summary.samples.repeatRunRecordedInputCollision.length < sampleLimit) {
                summary.samples.repeatRunRecordedInputCollision.push({ file, ...row });
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
