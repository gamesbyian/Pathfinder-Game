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
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { stableStringify } from '../modules/canonical-json.mjs';
import { solverRequestIdentityAvailability } from './solver-request-identity-compat.mjs';

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

function effectiveConfigDigest(effectiveConfig) {
    return createHash('sha256').update(stableStringify(effectiveConfig)).digest('hex');
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
    const recomputed = effectiveConfigDigest(summary.effectiveConfig);
    if (summary.effectiveConfigDigest !== recomputed) {
        throw new Error(`${file}: summary.effectiveConfigDigest does not match SHA-256 of the canonical summary.effectiveConfig -- report provenance is stale or malformed`);
    }
    // Canonical solver-request identity (docs/hint-evidence-execution-identity-storage-
    // consolidation-plan.md section 3.2) is read only as an ADDITIONAL diagnostic dimension here,
    // never a replacement: legacy effectiveConfig deliberately mixes solver-request semantics with
    // population/protocol markers this checker's "same-arm shards must match" purpose also needs to
    // catch, and not every historical/legacy-only producer emits canonical identity at all. See
    // checkAgreement()/checkCompare()'s own use of `canonical` below.
    const canonical = solverRequestIdentityAvailability(summary);
    return {
        file,
        effectiveConfig: summary.effectiveConfig,
        effectiveConfigDigest: summary.effectiveConfigDigest,
        canonical,
    };
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
            // Diagnostic only, not a gate: legacy effectiveConfig deliberately carries population/
            // protocol dimensions the canonical solver-request identity excludes by design (plan
            // section 3.2), and legacy compares raw solveOpts syntactically where canonical compares
            // normalized effective values (e.g. an omitted nodeBudget vs an explicit Infinity). A
            // legacy mismatch whose canonical identity still agrees is worth flagging as likely
            // confined to non-solver-request dimensions or benign syntactic drift; this checker still
            // fails on ANY legacy mismatch, since population/protocol drift between "same-arm" shards
            // is exactly the kind of wiring bug this tool exists to catch.
            const canonicalAgrees = reference.canonical.status === 'canonical' && other.canonical.status === 'canonical'
                ? reference.canonical.solverRequestIdentity === other.canonical.solverRequestIdentity
                : null;
            mismatches.push({ file: other.file, against: reference.file, differing, canonicalAgrees });
        }
    }
    if (mismatches.length > 0) {
        const lines = mismatches.map(m => {
            const canonicalNote = m.canonicalAgrees === null
                ? ''
                : m.canonicalAgrees
                    ? ' (canonical solver-request identity still agrees -- likely confined to population/protocol/syntactic dimensions)'
                    : ' (canonical solver-request identity also disagrees)';
            return `  - ${m.file} vs ${m.against}: differs in [${m.differing.join(', ') || '(digest differs but no field diff found -- non-canonical serialization?)'}]${canonicalNote}`;
        });
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
    // Diagnostic only (see checkAgreement()'s own comment for why): does the canonical solver-request
    // identity itself differ, when both sides have one? A field-level canonical diff is not attempted
    // here -- canonical's nested shape does not map 1:1 onto legacy's flat --allowed-diff field names,
    // and inventing that mapping is a separate, larger migration than this coarse pass/fail checker.
    const canonicalDiffers = control.canonical.status === 'canonical' && treatment.canonical.status === 'canonical'
        ? control.canonical.solverRequestIdentity !== treatment.canonical.solverRequestIdentity
        : null;
    return {
        differing, unexpected: [], control: control.effectiveConfigDigest, treatment: treatment.effectiveConfigDigest,
        canonicalDiffers,
    };
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
        const canonicalNote = result.canonicalDiffers === null
            ? ' canonical solver-request identity: (not available on both sides).'
            : ` canonical solver-request identity: ${result.canonicalDiffers ? 'differs' : 'identical'}.`;
        console.log(`Effective-configuration compare OK: control=${result.control} treatment=${result.treatment}; prespecified-dimension diff(s): [${result.differing.join(', ') || '(none)'}].${canonicalNote}`);
        return;
    }
    throw new Error('--mode=agree (with repeated --result=<file>) or --mode=compare (with --control/--treatment/--allowed-diff) is required');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { main(); } catch (error) { console.error(`check-effective-config-agreement: ${error.message}`); process.exit(2); }
}
