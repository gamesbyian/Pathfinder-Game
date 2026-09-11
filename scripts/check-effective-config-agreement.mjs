#!/usr/bin/env node
/**
 * Effective-configuration agreement checker (2026-09-09 historical regression-risk audit item #2).
 *
 * A workflow-dispatch input or CLI flag represents intent, not proof of what reached the solver.
 * scripts/level-blind-capability-sweep.mjs (and any future producer following the same contract)
 * emits `summary.effectiveConfig`/`summary.effectiveConfigDigest`, computed from the literal
 * SolveOpts object handed to the solver at the actual execution boundary. This script consumes
 * that to catch two recurring bug shapes mechanically:
 *
 *   - `agree` mode: every shard/report claimed to belong to ONE arm of a run must have actually
 *     run under the identical effective configuration. Catches a shard that silently received
 *     different flags than its siblings (a matrix/dispatch wiring bug), which population-identity
 *     checks like validate-solver-sweep-integrity.mjs cannot see -- they only check WHICH levels
 *     ran, not WHAT CONFIG they ran under.
 *
 *   - `compare` mode: a control/treatment pair must differ ONLY in the caller's prespecified
 *     dimensions (--allowed-diff=field1,field2,...). Catches both directions of the classic A/B
 *     wiring bug: an unintended field drifting between the two arms (alias/default drift, a
 *     dropped worker option, a scheduler-mode mismatch), AND the "control-vs-control" bug where a
 *     dispatch mistake makes the two arms IDENTICAL when a real difference was intended
 *     (--require-actual-diff enforces that at least one prespecified field really did change).
 *
 * Deliberately narrow (same "coarse mechanical check, not a completeness prover" scope as
 * check-solveopts-transport-parity.mjs and check-workflow-actions.mjs): this proves the CONFIG
 * OBJECT the run recorded is self-consistent, not that the config object itself is complete (that
 * is effectiveConfig's own producer's job) or that any config value is scientifically appropriate.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

function parseArgs(argv) {
    const map = new Map();
    const repeated = new Map();
    for (const arg of argv) {
        if (!arg.startsWith('--')) continue;
        const eq = arg.indexOf('=');
        const key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
        const value = eq === -1 ? 'true' : arg.slice(eq + 1);
        map.set(key, value);
        if (!repeated.has(key)) repeated.set(key, []);
        repeated.get(key).push(value);
    }
    return { map, repeated };
}

function stableStringify(value) {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(v => stableStringify(v) ?? 'null').join(',')}]`;
    const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function loadEffectiveConfig(file) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const summary = parsed?.summary;
    if (!summary || typeof summary !== 'object') throw new Error(`${file}: no top-level "summary" object`);
    if (!summary.effectiveConfig || typeof summary.effectiveConfig !== 'object') {
        throw new Error(`${file}: summary.effectiveConfig is missing -- this report's producer does not emit the effective-configuration contract`);
    }
    if (typeof summary.effectiveConfigDigest !== 'string' || !summary.effectiveConfigDigest) {
        throw new Error(`${file}: summary.effectiveConfigDigest is missing or empty`);
    }
    const recomputed = stableStringify(summary.effectiveConfig);
    if (summary.effectiveConfigDigest !== recomputed) {
        throw new Error(`${file}: summary.effectiveConfigDigest does not match the canonical serialization of summary.effectiveConfig -- report provenance is stale or malformed`);
    }
    return { file, effectiveConfig: summary.effectiveConfig, effectiveConfigDigest: summary.effectiveConfigDigest };
}

/** Field-level diff between two effectiveConfig objects (shallow keys, deep stableStringify per
 *  value so a nested ablation object/array compares by content, not reference). */
function diffFields(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const differing = [];
    for (const key of keys) {
        if (stableStringify(a[key]) !== stableStringify(b[key])) differing.push(key);
    }
    return differing.sort();
}

export function checkAgreement(files) {
    if (files.length < 2) throw new Error('agree mode requires at least 2 --result files');
    const loaded = files.map(loadEffectiveConfig);
    const [reference, ...rest] = loaded;
    const mismatches = [];
    for (const other of rest) {
        const differing = diffFields(reference.effectiveConfig, other.effectiveConfig);
        if (differing.length > 0 || reference.effectiveConfigDigest !== other.effectiveConfigDigest) {
            mismatches.push({ file: other.file, against: reference.file, differing });
        }
    }
    if (mismatches.length > 0) {
        const lines = mismatches.map(m => `  - ${m.file} vs ${m.against}: differs in [${m.differing.join(', ') || '(digest differs but no field diff found -- non-canonical serialization?)'}]`);
        throw new Error(`effective-configuration agreement failed across ${loaded.length} report(s):\n${lines.join('\n')}`);
    }
    return { agree: true, count: loaded.length, effectiveConfigDigest: reference.effectiveConfigDigest };
}

export function checkCompare(controlFile, treatmentFile, allowedDiff, requireActualDiff) {
    const control = loadEffectiveConfig(controlFile);
    const treatment = loadEffectiveConfig(treatmentFile);
    const differing = diffFields(control.effectiveConfig, treatment.effectiveConfig);
    const allowed = new Set(allowedDiff);
    const unexpected = differing.filter(field => !allowed.has(field));
    if (unexpected.length > 0) {
        throw new Error(`control/treatment differ in unprespecified field(s) [${unexpected.join(', ')}] (only [${allowedDiff.join(', ') || '(none)'}] were prespecified as allowed to differ).\n`
            + `  control:   ${controlFile}\n  treatment: ${treatmentFile}`);
    }
    if (requireActualDiff && differing.length === 0) {
        throw new Error(`control and treatment have IDENTICAL effective configuration (digest ${control.effectiveConfigDigest}) -- `
            + 'this looks like a control-vs-control dispatch mistake, not a real A/B comparison. '
            + `Expected at least one of [${allowedDiff.join(', ')}] to actually differ.\n`
            + `  control:   ${controlFile}\n  treatment: ${treatmentFile}`);
    }
    return { differing, unexpected: [], control: control.effectiveConfigDigest, treatment: treatment.effectiveConfigDigest };
}

function main() {
    const { map, repeated } = parseArgs(process.argv.slice(2));
    const mode = map.get('mode');
    if (mode === 'agree') {
        const files = repeated.get('result') || [];
        const result = checkAgreement(files);
        console.log(`Effective-configuration agreement OK: ${result.count} report(s) share digest ${result.effectiveConfigDigest}.`);
        return;
    }
    if (mode === 'compare') {
        const control = map.get('control');
        const treatment = map.get('treatment');
        if (!control || !treatment) throw new Error('compare mode requires --control=<file> and --treatment=<file>');
        const allowedDiff = (map.get('allowed-diff') || '').split(',').map(s => s.trim()).filter(Boolean);
        const requireActualDiff = map.get('require-actual-diff') === 'true';
        const result = checkCompare(control, treatment, allowedDiff, requireActualDiff);
        console.log(`Effective-configuration compare OK: control=${result.control} treatment=${result.treatment}; prespecified-dimension diff(s): [${result.differing.join(', ') || '(none)'}].`);
        return;
    }
    throw new Error('--mode=agree (with repeated --result=<file>) or --mode=compare (with --control/--treatment/--allowed-diff) is required');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { main(); } catch (error) { console.error(`check-effective-config-agreement: ${error.message}`); process.exit(2); }
}
