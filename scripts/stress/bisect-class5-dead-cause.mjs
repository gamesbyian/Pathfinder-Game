#!/usr/bin/env node
/** Extract a compact, verified-sufficient "cause" for every DEAD verdict in a
 * cpsat-explicit-prefix-reference.mjs result file, for the WS2-COMPACT-DEAD-CAUSE-RECURRENCE
 * diagnostic (docs/solver-optimization-workstreams.md).
 *
 * WHY A BISECTION/RELAXATION PROXY, NOT OR-Tools' NATIVE SufficientAssumptionsForInfeasibility.
 * That native API needs every candidate-cause constraint expressed as a boolean ASSUMPTION literal
 * ANDed onto the model (`model.AddAssumption([...])`, then `solver.SufficientAssumptionsForInfeasibility()`
 * after an INFEASIBLE solve). cpsat-reference-probe.py's mechanic constraints (must-cross, flipper
 * ordering/parity, landmark turn requirements) are built directly into the model with
 * `OnlyEnforceIf` on internal derived booleans, not gated behind a single assumption literal per
 * mechanic family -- wiring that up would mean rewriting most of that file's constraint banks
 * (each carefully validated against real solver/referee bugs, see its own docstring history) to
 * add an assumption-literal guard to every block, a substantial change to a load-bearing exact
 * oracle for a diagnostic-only task. The existing --core-only/--no-mustcross/--no-flippers/
 * --no-landmarks flags already give a mechanic-FAMILY-level cause partition for free, with zero
 * changes to the oracle, and prefix-length bisection (binary search over how much of the same
 * fixed prefix is retained) adds a length-level axis on top. Together they identify a coarser but
 * still genuinely SOUND cause: every claim below is verified by an actual second CP-SAT call
 * showing the verdict flips to LIVE once the claimed cause is removed (never asserted from the
 * DEAD call alone), so this never UNDER-claims a cause -- it can only be less minimal than a true
 * unsat core, which is disclosed, not hidden.
 *
 * For every DEAD row this produces:
 *   - mechanicCause: which mechanic family, if any, is (alone) sufficient to explain the DEAD
 *     verdict when relaxed -- 'core-topology' (relaxing every optional mechanic is STILL dead, so
 *     the cause is base reachability/parity/edge-reuse, not a modeled optional mechanic),
 *     one of 'mustCross'/'flippingFilters'/'landmarks' (that single relaxation alone flips it),
 *     'joint(<names>)' (only relaxing several together flips it; no single one alone does), or
 *     'abstain' (a probe call timed out/was unsupported during classification; excluded from the
 *     recurrence tally, not counted as any cause).
 *   - minimalPrefixLength: the smallest k (via bisection over the SAME fixed prefix, monotone
 *     because pinning a longer exact continuation can only shrink the feasible completion set)
 *     such that the first k cells of this exact prefix are already DEAD under full mechanics --
 *     i.e. how early along this one path the fate was already sealed. An abstain encountered
 *     during bisection halts the search and reports the tightest verified bracket instead of
 *     guessing a false-precise value.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/bisect-class5-dead-cause.mjs -- \
 *     --reference=tmp/class5-dead-cause-reference.json --time-limit=60 \
 *     --out=tmp/class5-dead-cause-bisection.json
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { classifyProbeProcess } from './cpsat-explicit-prefix-reference-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const required = key => { const value = args.get(key); if (!value) throw new Error(`missing ${key}`); return value; };
const referenceFile = required('--reference');
const timeLimit = Number(args.get('--time-limit') ?? 60);
const outFile = args.get('--out') ?? 'tmp/class5-dead-cause-bisection.json';
if (!(timeLimit > 0)) throw new Error('--time-limit must be positive');

const probePath = 'scripts/stress/cpsat-reference-probe.py';
const referenceDoc = JSON.parse(readFileSync(referenceFile, 'utf8'));
const deadRows = (referenceDoc.rows ?? []).filter(row => row.referenceLabel === 'dead');
console.log(`${deadRows.length}/${(referenceDoc.rows ?? []).length} rows are DEAD; extracting causes for those.`);

let probeCallCount = 0;
function runProbe(levelId, corpus, prefix, extraFlags) {
    probeCallCount++;
    const result = spawnSync('python3', [
        probePath, levelId, String(timeLimit), `--corpus=${corpus}`, `--prefix=${JSON.stringify(prefix)}`, ...extraFlags,
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const exitCode = result.status ?? (result.error ? -1 : 0);
    return classifyProbeProcess({ stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode });
}

const MECHANIC_FLAGS = [
    { name: 'mustCross', flag: '--no-mustcross' },
    { name: 'flippingFilters', flag: '--no-flippers' },
    { name: 'landmarks', flag: '--no-landmarks' },
];

function extractMechanicCause(levelId, corpus, prefix) {
    const core = runProbe(levelId, corpus, prefix, ['--core-only']);
    if (core.label === 'timeout/abstain') return { mechanicCause: 'abstain', detail: 'core-only probe abstained', probesUsed: 1 };
    if (core.label === 'dead') return { mechanicCause: 'core-topology', detail: 'relaxing every optional mechanic (must-cross/flippers/landmarks) at once is still DEAD', probesUsed: 1 };
    // core-only is LIVE: the cause lives in at least one optional mechanic family. Find which single
    // one alone is sufficient to flip it (each tested with the OTHER two mechanics still fully active).
    const flips = [];
    let abstained = false;
    for (const mech of MECHANIC_FLAGS) {
        const single = runProbe(levelId, corpus, prefix, [mech.flag]);
        if (single.label === 'timeout/abstain') { abstained = true; continue; }
        if (single.label === 'live') flips.push(mech.name);
    }
    const probesUsed = 1 + MECHANIC_FLAGS.length;
    if (flips.length === 1) return { mechanicCause: flips[0], detail: `relaxing only ${flips[0]} alone flips this to LIVE`, probesUsed };
    if (flips.length > 1) return { mechanicCause: `joint(${flips.join('+')})`, detail: `each of [${flips.join(', ')}] individually flips this to LIVE (overlapping/redundant sufficient causes)`, probesUsed };
    if (abstained) return { mechanicCause: 'abstain', detail: 'core-only was LIVE but every individual-mechanic probe abstained', probesUsed };
    return { mechanicCause: 'joint(mustCross+flippingFilters+landmarks)', detail: 'core-only is LIVE but no single mechanic relaxed alone flips it; only their combination (already shown by core-only) does', probesUsed };
}

/** Binary search for the minimal k such that the first k cells of `prefix` are DEAD under full
 * mechanics. Assumes (verified by the caller's own DEAD row) that k=prefix.length is DEAD.
 * Monotone: pinning MORE of the exact same fixed path can only shrink the feasible-completion set,
 * so DEAD-ness at k implies DEAD-ness at every k' > k. An abstain during the search halts it rather
 * than assuming a direction, and the tightest verified [lastLive, firstDead] bracket is reported. */
function bisectMinimalPrefixLength(levelId, corpus, prefix) {
    const n = prefix.length;
    let lo = 1, hi = n; // invariant: label(hi) is verified DEAD; label(lo-1), if evaluated, was LIVE
    let probesUsed = 0;
    let abstainedAt = null;
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const verdict = runProbe(levelId, corpus, prefix.slice(0, mid), []);
        probesUsed++;
        if (verdict.label === 'timeout/abstain') { abstainedAt = mid; break; }
        if (verdict.label === 'dead') hi = mid; else lo = mid + 1;
    }
    if (abstainedAt != null) {
        return { minimalPrefixLength: null, bracket: [lo, hi], abstainedAt, probesUsed, note: 'bisection halted on an abstain; reporting the last verified bracket instead of guessing' };
    }
    return { minimalPrefixLength: hi, bracket: [hi, hi], abstainedAt: null, probesUsed };
}

const causes = [];
for (const row of deadRows) {
    const mechanic = extractMechanicCause(row.levelId, row.corpus, row.prefix);
    const bisection = bisectMinimalPrefixLength(row.levelId, row.corpus, row.prefix);
    causes.push({
        caseId: row.caseId, levelId: row.levelId, depth: row.depth, fullPrefixLength: row.prefix.length,
        mechanicCause: mechanic.mechanicCause, mechanicCauseDetail: mechanic.detail,
        minimalPrefixLength: bisection.minimalPrefixLength, prefixLengthBracket: bisection.bracket,
        bisectionAbstainedAt: bisection.abstainedAt,
        probesUsed: mechanic.probesUsed + bisection.probesUsed,
    });
    console.log(`${row.caseId}: mechanicCause=${mechanic.mechanicCause} minimalPrefixLength=${bisection.minimalPrefixLength ?? `bracket${JSON.stringify(bisection.bracket)}`} (probes=${mechanic.probesUsed + bisection.probesUsed})`);
}

const byMechanic = new Map();
for (const cause of causes) {
    if (cause.mechanicCause === 'abstain') continue;
    byMechanic.set(cause.mechanicCause, (byMechanic.get(cause.mechanicCause) ?? 0) + 1);
}
const mechanicDistribution = [...byMechanic.entries()].sort((a, b) => b[1] - a[1]).map(([mechanicCause, count]) => ({ mechanicCause, count }));

const document = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), sourceReference: referenceFile,
    method: 'mechanic-family relaxation (--core-only/--no-mustcross/--no-flippers/--no-landmarks) + prefix-length bisection over cpsat-reference-probe.py; every claimed cause verified by a second CP-SAT call showing the DEAD verdict flips to LIVE once the cause is removed',
    timeLimitSecPerProbe: timeLimit, totalDeadRows: deadRows.length, totalProbeCalls: probeCallCount,
    causes, mechanicDistribution,
    abstainedCauseCount: causes.filter(c => c.mechanicCause === 'abstain').length,
};
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}. Mechanic-cause distribution: ${JSON.stringify(mechanicDistribution)}`);
console.log(`Total auxiliary CP-SAT probe calls used: ${probeCallCount}`);
