#!/usr/bin/env node
/**
 * Instrument-validity audit of the WS1 late-continuation single-stage confirmation (run 36220112812).
 * Reports (1) how many retained per-attempt rows carry workSpent and (2) which cumulative-work bands the
 * frozen signatures require, i.e. whether a work-less input can match any of them.
 * Usage: node scripts/stress/ws1-confirmation-instrument-audit.mjs
 */
import { readFileSync } from 'node:fs';

const bundle = 'reports/stress/experiment-evidence/36220112812__run-36220112812__attempt-1/evidence';
const compact = JSON.parse(readFileSync(`${bundle}/compact-failure-response/failure-response/compact.json`, 'utf8'));
const model = JSON.parse(readFileSync('reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json', 'utf8'));

let attempts = 0, withWork = 0;
for (const row of compact.records) for (const a of row.attempts ?? []) { attempts++; if (Number.isFinite(a.workSpent)) withWork++; }
const parentsWithWork = compact.records.filter(r => Number.isFinite(r.workSpent)).length;

// Signature layout (prior-response+work+next-stage): [priorStage, priorOutcome, priorWorkBand, cumulativeWorkBand, nextStage]
const cumulativeBands = {};
for (const s of model.signatures) { const b = s.signature[3]; cumulativeBands[b] = (cumulativeBands[b] ?? 0) + 1; }
const reachableWithoutWork = Object.keys(cumulativeBands).includes('0');

console.log(JSON.stringify({
    parents: compact.records.length, parentsWithTotalWorkSpent: parentsWithWork,
    attempts, attemptsWithWorkSpent: withWork,
    frozenSignatures: model.signatures.length, requiredCumulativeWorkBands: cumulativeBands,
    anySignatureMatchableWhenAttemptWorkMissing: reachableWithoutWork,
}, null, 2));
