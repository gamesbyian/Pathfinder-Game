#!/usr/bin/env node
/**
 * Mechanical, narrow-scope check for the exact pattern that let bug #1 of the 2026-08-29
 * naming-cleanup regression pass (docs/naming-cleanup-plan.md's Section 3.6/9 residue guard):
 * scripts/portfolio-solve-sweep-worker.mjs forwarded only the legacy
 * `attractionDiversityBudgetFractionOverride` field into a nested race-pool `solveLevel()` options
 * object, silently dropping a caller's canonical-only `goalAttractionDisabledRetryBudgetFractionOverride`
 * -- race.mjs itself correctly dual-read both names, but that dual-read was dead code from the
 * worker's perspective since the worker never put the canonical field on the object it handed to
 * the pool.
 *
 * check-naming-consumer-residue.mjs cannot catch this class of bug: it only flags a REMOVED old
 * name with no compatibility layer (ledger persistence: "none"), and explicitly excludes
 * "dual-read" entries from its scan, since dual-read code is SUPPOSED to still mention the old
 * name. The bug here is the opposite shape -- a dual-read pair where one live file mentions only
 * the legacy half, never the canonical half, anywhere -- which is exactly the blind spot the
 * residue guard's own doc comment does not cover.
 *
 * SCOPE (deliberately narrow, not a general "every override is paired" prover): scans every
 * `scripts/`/`modules/` `.mjs`/`.ts` source file (comments stripped) for each canonical/legacy
 * SolveOpts override-field pair the ledger records as persistence: "dual-read". If the legacy name
 * appears anywhere in a file, the canonical name must ALSO appear somewhere in that same file --
 * a whole-file co-occurrence check, not a proof that every individual transport object literal
 * pairs them correctly. This is coarse by design: it is cheap, has no observed false positives
 * (every current dual-reading file already mentions both names, often within a few lines of each
 * other -- see orchestration.ts's own SolveOpts interface and stage-budget.ts's resolution sites),
 * and would have failed on the original portfolio-solve-sweep-worker.mjs bug, whose file mentioned
 * the legacy name only, nowhere mentioning the canonical name at all.
 *
 * A failure means: a file forwards/reads a legacy SolveOpts override field without ever mentioning
 * its canonical replacement -- almost certainly a dropped-forwarding bug like the one above. Fix
 * the file to also forward/read the canonical field (see race.mjs's own `??` pattern), or add a
 * one-line ALLOWLIST entry with the same rationale a residue-guard allowlist entry would carry if
 * the file has a genuine reason to reference only the legacy name (e.g. a fixture/comment that is
 * deliberately about the legacy spelling alone).
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SELF = path.join('scripts', 'check-solveopts-transport-parity.mjs');

// Every ledger entry recording a dual-read SolveOpts override-field pair (docs/naming-cleanup-
// ledger.json). Kept here rather than parsed from the ledger's own free-text "old"/"new" strings
// (several entries pair two-plus symbols in one string, e.g. "a / b (SolveOpts) -> c / d") because
// splitting those reliably is itself the kind of mechanical fragility this check should not add;
// this list is short and reviewed by hand whenever a new override-field rename lands.
const OVERRIDE_FIELD_PAIRS = [
    ['goalAttractionDisabledRetryBudgetFractionOverride', 'attractionDiversityBudgetFractionOverride'],
    ['goalAttractionDisabledRetryNodeReserveFractionOverride', 'attractionDiversityNodeReserveFractionOverride'],
    ['mainSearchLateReserveFractionOverride', 'mainLoopLateReserveFractionOverride'],
    ['mainSearchLateReserveConfigCountOverride', 'mainLoopLateReserveConfigCountOverride'],
    ['earlyRepairSearchAdaptiveBiasedBadnessGateOverride', 'repairProbeAdaptiveBiasedBadnessGateOverride'],
    ['earlyRepairSearchAdaptiveBiasedMinScaleOverride', 'repairProbeAdaptiveBiasedMinScaleOverride'],
    ['repairShrinkRecoveryNodeReserveFractionOverride', 'repairProbeShrinkRecoveryNodeReserveFractionOverride'],
];

// file::legacyFieldName pairs with a genuine, reviewed reason to mention only the legacy name.
const ALLOWLIST = new Set([]);

function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
        .replace(/\/\/.*$/gm, '');
}

function walk(dir) {
    const files = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...walk(full));
        else files.push(full);
    }
    return files;
}

const failures = [];
for (const base of ['scripts', 'modules']) {
    for (const full of walk(path.join(root, base))) {
        if (!/\.(?:[cm]?js|mjs|ts|tsx)$/.test(full)) continue;
        const relative = path.relative(root, full).split(path.sep).join('/');
        if (relative === SELF) continue;
        const source = stripComments(readFileSync(full, 'utf8'));
        for (const [canonical, legacy] of OVERRIDE_FIELD_PAIRS) {
            const legacyPattern = new RegExp(`\\b${legacy}\\b`);
            const canonicalPattern = new RegExp(`\\b${canonical}\\b`);
            if (!legacyPattern.test(source)) continue;
            if (canonicalPattern.test(source)) continue;
            if (ALLOWLIST.has(`${relative}::${legacy}`)) continue;
            failures.push(`${relative}: mentions legacy SolveOpts override field \`${legacy}\` but never its canonical replacement \`${canonical}\` anywhere in the same file`);
        }
    }
}

if (failures.length) {
    console.error('SolveOpts override transport-parity check failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error('\nA file that forwards/reads only the legacy half of a dual-read SolveOpts override field');
    console.error('is the exact shape of the 2026-08-29 portfolio-solve-sweep-worker.mjs regression: a');
    console.error('canonical-only caller silently loses the override. Add the canonical field alongside the');
    console.error('legacy one (see race.mjs\'s `??` pattern), or add a reviewed ALLOWLIST entry in this file.');
    process.exit(1);
}
console.log(`check-solveopts-transport-parity: ${OVERRIDE_FIELD_PAIRS.length} dual-read override-field pairs checked, no unpaired legacy references found.`);
