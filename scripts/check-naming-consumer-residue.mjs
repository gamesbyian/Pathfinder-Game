#!/usr/bin/env node
/**
 * Guard against removed-API residue: a live `scripts/`/`modules/` source reference to a symbol,
 * field, or file path that the naming-cleanup migration (docs/naming-cleanup-plan.md,
 * docs/naming-cleanup-ledger.json) fully removed with no compatibility layer.
 *
 * HISTORY: an earlier version of this idea lived inside scripts/check-workflow-actions.mjs,
 * caught real regressions (a dead `create-render-model.ts` overlay read, a broken submission-time
 * budget field, several stale doc references), and was then deleted down to a workflow-only scope
 * in the same session (commit ad60c19c) rather than fixed. This is that guard, restored as its own
 * check (workflow YAML validation is a different concern) and broadened from 5 hand-picked patterns
 * to every phase 1-7 ledger entry whose `persistence` is `"none"` — i.e. every rename the ledger
 * itself says should have ZERO live legacy-spelling references anywhere, not just the five originally
 * chosen. Entries marked `"dual-read"` are deliberately excluded: those names are SUPPOSED to still
 * appear in compatibility-read code (`a.new ?? a.old`), so scanning for them here would be work this
 * check cannot do reliably; that correctness is instead covered by the dual-read parity/regression
 * tests added alongside each such rename. `"frozen-history"` entries are historical evidence and are
 * never touched.
 *
 * SCOPE: `scripts/` and `modules/` source files (`.js`/`.mjs`/`.ts`/`.tsx`), with `//` and `/* *\/`
 * comments stripped before matching. This mirrors the original guard's intent (catch a reference
 * that would actually execute or fail to import) rather than doc-comment drift, which
 * `check-documentation-links.mjs` and manual review already cover. A handful of ledger `old` values
 * are descriptive rather than literal source tokens (e.g. "solve (solver facade alias)") and are not
 * mechanically checkable from the ledger string alone; those are covered by DESCRIPTIVE_PATTERNS
 * below with a hand-written regex, same as the five original patterns were.
 *
 * KNOWN SCOPE GAP (found during the 2026-08-29 Phase 1-7 regression audit): this guard only
 * catches a REMOVED old name (persistence: "none") and explicitly does not check "dual-read"
 * entries at all, on the theory that dual-read code is supposed to still mention the old name so
 * there is nothing to flag. That reasoning misses a real, recurring bug shape: a canonical field
 * being read/forwarded correctly on ONE code path (e.g. the sequential solveLevel() call) while a
 * SIBLING path (e.g. a worker/race-pool transport object) forwards only the legacy alias and never
 * mentions the canonical name at all -- so the sibling's own "dual-read" is silently dead code.
 * This exact shape shipped in scripts/portfolio-solve-sweep-worker.mjs (dropped
 * goalAttractionDisabledRetryBudgetFractionOverride), scripts/stress/elite-prefix-dfs-ab.mjs (read
 * a fully-removed AttemptConfig field with no fallback at all, not even a legacy one), and
 * scripts/family-boundary-report.mjs (wrote a canonical VALUE under the legacy field NAME) -- three
 * different failure shapes a "does the old name still appear" scan cannot distinguish from
 * legitimate dual-read code. See scripts/check-solveopts-transport-parity.mjs for a narrow,
 * mechanical check of the first shape (SolveOpts override-field pairs only); the other two shapes
 * are not mechanically checkable in general and are the reason this remains "at minimum leave a
 * comment" rather than a broadened guard -- a green run of this file is not proof that every
 * dual-read pair is honored on every code path.
 *
 * A new failure means: either the rename regressed (fix the code), or this check's pattern/allowlist
 * needs to change because the underlying ledger classification changed (fix the ledger entry's
 * `persistence` first, THEN this file, with a comment explaining why).
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const SELF = path.join('scripts', 'check-naming-consumer-residue.mjs');

const ledger = JSON.parse(readFileSync(path.join(root, 'docs', 'naming-cleanup-ledger.json'), 'utf8'));

// Ledger `old` values that are prose descriptions of a concept, not a literal source token, so a
// mechanical regex can't be derived from the string. Each gets a hand-written pattern below instead
// (DESCRIPTIVE_PATTERNS) -- or, if genuinely not safely greppable (too generic to avoid false
// positives across an unrelated context), is intentionally left unchecked here.
const NOT_MECHANICALLY_DERIVABLE = new Set([
    'archetype (missing-exposure result)', // "archetype" alone is far too generic to grep repo-wide
    'TECHNIQUE (select-attempt-exposure)', // ditto for the bare word "TECHNIQUE"
    'solve (solver facade alias)', // bare "solve" is far too generic; see DESCRIPTIVE_PATTERNS
    '*TrapSpots state actions', // glob description of a state-action family; see DESCRIPTIVE_PATTERNS
    '*TrapParityCandidates state actions', // ditto
    // Phase-6 derived-vocabulary families added during the closeout session: each ledger entry
    // covers several sibling constants as one "old" string (readable in the ledger), which isn't a
    // literal source token -- see the matching hand-written multi-alternative regex below.
    'MAIN_LOOP_LATE_RESERVE_FRACTION / MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT',
    'REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE / REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE / REPAIR_PROBE_ATTEMPT_MS_CAP / REPAIR_PROBE_BIASED_NODE_BUDGET / REPAIR_PROBE_ORDINARY_NODE_BUDGET / REPAIR_PROBE_ORDINARY_SEED_SALTS / REPAIR_PROBE_PREDICTED_TIER_SHARE',
    'ATTRACTION_DIVERSITY_BUDGET_FRACTION / ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION / ATTRACTION_DIVERSITY_CANDIDATE_FLAGS',
]);

// Ledger entries whose stated field-level `persistence` undercounts a real dual-read need found
// during implementation (the entry's own free-text `notes` says dual-read; `persistence` was never
// updated to match). Excluded here rather than mis-flagged; see docs/naming-cleanup-ledger.json's
// own note on this entry for the correction this file's change should carry.
const LEDGER_PERSISTENCE_OVERRIDE_NONE_TO_DUAL_READ = new Set([
    'navDensity', // stressMeta.navDensity is a persisted corpus-JSON field; corpus-query-lib.mjs
    // and siblings dual-read it alongside requiredPathCoverageRatio -- see naming-cleanup-ledger.json.
]);

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Word-boundary regex for a clean identifier/file-path old value. `\b` doesn't fire correctly at a
// `.`/`-`/`/` boundary in a file path, so anchor those with lookaround on non-identifier chars
// instead.
function derivePattern(old) {
    const isBareIdentifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(old);
    const escaped = escapeRegex(old);
    if (isBareIdentifier) return new RegExp(`\\b${escaped}\\b`);
    return new RegExp(`(?<![A-Za-z0-9_./-])${escaped}(?![A-Za-z0-9_])`);
}

const candidates = ledger.entries.filter(e =>
    e.phase <= 7 && e.status === 'done' && e.persistence === 'none' && e.old !== e.new &&
    !LEDGER_PERSISTENCE_OVERRIDE_NONE_TO_DUAL_READ.has(e.old));

const patterns = [];
for (const entry of candidates) {
    if (NOT_MECHANICALLY_DERIVABLE.has(entry.old)) continue;
    patterns.push({ label: `removed ${entry.kind} \`${entry.old}\` (ledger: -> ${entry.new}, phase ${entry.phase})`, pattern: derivePattern(entry.old) });
}

// Hand-written patterns for ledger entries too generic/descriptive to derive mechanically (see
// NOT_MECHANICALLY_DERIVABLE above), plus the substring-collision guards a bare word-boundary
// derivation would get wrong for entries whose OLD name is a literal substring of an unrelated
// CURRENT canonical name (e.g. `PORTFOLIO_EXPERIMENT` inside `LEGACY_LATENCY_PORTFOLIO_EXPERIMENT`).
const DESCRIPTIVE_PATTERNS = [
    { label: 'removed Solver.solve() facade alias (ledger: -> solveLevel, phase 4)', pattern: /\bSolver\.solve\s*\(/ },
    // Scoped to the state-action family specifically (old field validTrapSpots -> its setters were
    // *ValidTrapSpots): plain "TrapSpots" alone also appears in the still-legitimate player-facing
    // UI button naming ("Trap Spots" button, editTrapSpots/editTrapSpotsBtn theme/DOM keys), which
    // the plan explicitly permits to remain (Section 4.7).
    { label: 'removed *ValidTrapSpots state-action family (ledger: -> *TriggerableFalseGoalCells, phase 7)', pattern: /\b\w*ValidTrapSpots\w*\b/ },
    { label: 'removed *TrapParityCandidates state-action family (ledger: -> *FalseGoalTriggerParityCandidates, phase 7)', pattern: /\b\w*TrapParityCandidates\w*\b/ },
    // PORTFOLIO_EXPERIMENT / PortfolioExperimentDefinition / portfolio-experiment.ts: excluded when
    // immediately preceded by the canonical LEGACY_LATENCY_ prefix (case-matched per identifier
    // style) that now legitimately contains the old name as a trailing substring.
    { label: 'removed symbol `PORTFOLIO_EXPERIMENT` (ledger: -> LEGACY_LATENCY_PORTFOLIO_EXPERIMENT, phase 6)', pattern: /(?<!LEGACY_LATENCY_)\bPORTFOLIO_EXPERIMENT\b/ },
    { label: 'removed symbol `PortfolioExperimentDefinition` (ledger: -> LegacyLatencyPortfolioExperimentDefinition, phase 6)', pattern: /(?<!LegacyLatency)\bPortfolioExperimentDefinition\b/ },
    { label: 'removed file `portfolio-experiment.ts` (ledger: -> legacy-latency-portfolio-experiment.ts, phase 6)', pattern: /(?<!legacy-latency-)\bportfolio-experiment\.ts\b/ },
    // classifyFalseGoals: excluded when it's actually the canonical classifyFalseGoalTriggerability.
    { label: 'removed symbol `classifyFalseGoals` (ledger: -> classifyFalseGoalTriggerability, phase 7)', pattern: /\bclassifyFalseGoals\b(?!Triggerability)/ },
    // Phase-6 derived-vocabulary families (multi-symbol ledger entries; see NOT_MECHANICALLY_DERIVABLE).
    { label: 'removed MAIN_LOOP_LATE_RESERVE_* symbol family (ledger: -> MAIN_SEARCH_LATE_RESERVE_*, phase 6)', pattern: /\bMAIN_LOOP_LATE_RESERVE_(?:FRACTION|CONFIG_COUNT)\b/ },
    { label: 'removed REPAIR_PROBE_* symbol family (ledger: -> EARLY_REPAIR_SEARCH_*, phase 6)', pattern: /(?<!STRATEGY_)REPAIR_PROBE_(?:ADAPTIVE_BIASED_BADNESS_GATE|ADAPTIVE_BIASED_MIN_SCALE|ATTEMPT_MS_CAP|BIASED_NODE_BUDGET|ORDINARY_NODE_BUDGET|ORDINARY_SEED_SALTS|PREDICTED_TIER_SHARE)\b/ },
    { label: 'removed ATTRACTION_DIVERSITY_* symbol family (ledger: -> GOAL_ATTRACTION_DISABLED_RETRY_*, phase 6)', pattern: /(?<!STRATEGY_)ATTRACTION_DIVERSITY_(?:BUDGET_FRACTION|NODE_RESERVE_FRACTION|CANDIDATE_FLAGS)\b/ },
];

const allPatterns = [...patterns, ...DESCRIPTIVE_PATTERNS];

// file:pattern-label pairs that are legitimate live references to an otherwise-removed name --
// negative regression tests proving the old name is gone, or a compatibility/alias declaration this
// check would otherwise (correctly, in isolation) flag. Add here only with the same rationale a
// dual-read compatibility comment would carry; never to silence a real regression.
const ALLOWLIST = new Set([
    // Negative regression test: asserts the underscore-prefixed legacy testing alias is gone.
    'modules/solver/testing-api.test.ts::removed symbol `detectArchetype` (ledger: -> classifyRoutingRegime, phase 3)',
    // Descriptive text inside a string literal (a `witnessAccess` provenance note), not a functional
    // call -- naming Solver.solve() by its old name to describe historical equivalence with
    // stress:benchmark.mjs's own row shape, same as the comment two lines above it does.
    'scripts/portfolio-sweep-reports-to-benchmark.mjs::removed Solver.solve() facade alias (ledger: -> solveLevel, phase 4)',
]);

// Blanks out block and line comments (keeping line breaks so failure reporting isn't needed at
// column precision). Deliberately simple: a `//` inside a string literal (e.g. a URL) loses the
// rest of that line to the strip too, which only costs a little scan coverage, never a false
// positive -- an acceptable trade-off for a residue guard.
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
        for (const { label, pattern } of allPatterns) {
            if (ALLOWLIST.has(`${relative}::${label}`)) continue;
            if (pattern.test(source)) failures.push(`${relative}: ${label}`);
        }
    }
}

if (failures.length) {
    console.error(`Naming-consumer residue check failed (${allPatterns.length} phase 1-7 patterns checked):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error('\nA phase 1-7 rename\'s old name is still live in scripts/ or modules/ source with no');
    console.error('recorded compatibility reason. Either the rename regressed (fix the reference), or this');
    console.error('reference is a legitimate exception (fix docs/naming-cleanup-ledger.json\'s persistence');
    console.error('field first, then add it to this check\'s ALLOWLIST with the same rationale).');
    process.exit(1);
}
console.log(`Naming-consumer residue check passed: ${allPatterns.length} phase 1-7 removed-API patterns have zero live scripts/modules references.`);
