#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { classifySemanticForcedness, summarizeSemanticForcedness } from './semantic-forcedness-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const i = x.indexOf('=');
    return [i >= 0 ? x.slice(0, i) : x, i >= 0 ? x.slice(i + 1) : true];
}));
const required = key => {
    const value = args.get(key);
    if (!value || value === true) throw new Error(`missing ${key}`);
    return String(value);
};

const captureFile = required('--capture');
const referenceFile = required('--reference');
const outFile = required('--out');

const capture = JSON.parse(readFileSync(captureFile, 'utf8'));
const reference = JSON.parse(readFileSync(referenceFile, 'utf8'));
const byCase = new Map((reference.rows ?? []).map(row => [String(row.caseId), row]));

const states = [];
let missingCases = 0;
let correctnessAlarms = 0;
for (const parent of capture.parents ?? []) {
    for (const gate of parent.gates ?? []) {
        for (const group of gate.selected ?? []) {
            const labels = [];
            const childRows = [];
            for (const caseId of group.childCaseIds ?? []) {
                const row = byCase.get(String(caseId));
                if (!row) {
                    missingCases++;
                    labels.push('missing');
                    childRows.push({ caseId, referenceLabel: 'missing' });
                    continue;
                }
                if (row.correctnessAlarm || row.inputAlarm) correctnessAlarms++;
                labels.push(row.referenceLabel);
                childRows.push({
                    caseId,
                    referenceLabel: row.referenceLabel,
                    referenceReason: row.referenceReason ?? null,
                    informationCostMs: row.informationCostMs ?? null,
                    correctnessAlarm: !!row.correctnessAlarm,
                    inputAlarm: !!row.inputAlarm,
                });
            }
            const classified = classifySemanticForcedness(labels);
            states.push({
                levelId: parent.levelId,
                gateKey: gate.gateKey,
                stateId: group.stateId,
                depth: group.depth,
                survivingChildCount: group.children?.length ?? group.childCaseIds?.length ?? labels.length,
                parentExpansionWork: group.parentExpansionWork,
                ...classified,
                children: childRows,
            });
        }
    }
}

const summary = {
    ...summarizeSemanticForcedness(states),
    missingCases,
    correctnessAlarms,
    referenceRows: reference.rows?.length ?? 0,
};
const output = {
    schemaVersion: 1,
    kind: 'pathfinder-semantic-forcedness-result',
    evidenceRole: 'development',
    premiseUse: 'oracle-ceiling-opportunity-sizing-only',
    source: { capture: captureFile, reference: referenceFile },
    summary,
    states,
    caution: 'Reference LIVE/DEAD labels are oracle evidence. UNKNOWN/missing/alarm-bearing children make a parent unresolved and cannot establish semantic forcedness.',
};
mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ out: outFile, ...summary }, null, 2));
if (missingCases || correctnessAlarms) process.exitCode = 2;
