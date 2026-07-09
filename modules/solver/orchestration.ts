import { getConfiguredAttemptConfigs } from './attempts.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { repairSearchFromGate } from './repair-search.js';
import { beamSearchFromGate, dfsFromGateLDS } from './search.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig, ForcedPortalExit } from './types.js';

type YieldFn = (() => Promise<void>) | null;
/** One recorded attempt's metadata. */
interface Attempt {
    gateKey: number; profile: string; template: string | null; beamWidth: number | null;
    ok: boolean; elapsedMs: number;
    /** Diagnostic-only passthrough of the originating AttemptConfig's dispatch flags — not read
     *  by any solving logic, purely so external tooling (stress benchmark, audits) can tell a
     *  diverse beam / repair attempt apart from a plain one without re-deriving it from profile
     *  name and beamWidth. */
    diverseBeam?: boolean;
    repair?: boolean;
    repairMustTurnBiased?: boolean;
}
interface AttemptResult { path: number[] | null; attempt: Attempt; }
interface SearchResult { solution: number[] | null; attempts: Attempt[]; }
interface SolveOpts {
    timeBudgetMs?: number | string;
    yieldFn?: (() => Promise<void>);
    ablation?: AblationConfig | null;
    forcedFirstStepKey?: number | null;
    forcedPortalExitKey?: ForcedPortalExit | null;
}
interface SolveResult { ok: boolean; status: string; solution: number[] | null; solutions: number[][]; attempts: Attempt[]; totalMs: number; nodesExpanded: number; }

export function getTrapSpotBudgetMs(level: NormalizedLevel): number {
    const area = (level.grid?.w || 0) * (level.grid?.h || 0);
    const special = (level.mustPassKeys?.length || 0) + (level.mustCrossKeys?.length || 0) +
        (level.portalMap?.size || 0) + (level.filterMap?.size || 0) +
        (level.flippingFilterMap?.size || 0);
    // The search runs a full DFS per gate and splits the budget across them, so the
    // search-dependent cost scales with gate count — otherwise an N-gate level gets
    // the same budget as a 1-gate level of equal size and times out mid-sweep,
    // silently dropping every gate after the first.
    // Coefficients are sized for the off-thread (Web Worker) search: the sweep no
    // longer blocks interaction, so the budget errs toward complete enumeration —
    // the old main-thread values timed out on typical mid-size levels.
    const gates = Math.max(1, level.gateKeys?.length || 1);
    const perGateCost = area * 45 + (level.reqLen || 0) * 120 + special * 360;
    return Math.min(120000, Math.max(10000, 5000 + perGateCost * gates));
}

function getActiveGates(level: NormalizedLevel, gateKeys: number[], cfg: AblationConfig | null): number[] {
    if (level.portalMap.size !== 0 || (cfg && !cfg.STRATEGY_PARITY_GATE_FILTER)) return gateKeys;

    const goalP = keyParity(level.goalKey);
    const feasible = gateKeys.filter(gk => (keyParity(gk) ^ goalP ^ (level.reqLen & 1)) === 0);
    return feasible.length > 0 ? feasible : gateKeys;
}

async function runAttempt(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel,
    attemptConfig: AttemptConfig, attBudget: number, attStart: number, yieldFn: YieldFn,
): Promise<AttemptResult> {
    const { profileName, template, beamWidth, diverseBeam, repair, repairMustTurnBiased } = attemptConfig;
    const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
    let path: number[] | null = null;
    try {
        path = repair
            ? await repairSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, yieldFn, !!repairMustTurnBiased)
            : beamWidth
            ? await beamSearchFromGate(gateKey, level, prep, profile, attBudget, attStart, template, beamWidth, yieldFn, diverseBeam)
            : await dfsFromGateLDS(gateKey, level, prep, profile, attBudget, attStart, template, yieldFn);
    } catch (err) {
        if ((err as { message?: string })?.message === 'Solver:cancelled') throw err;
    }
    const attMs = Date.now() - attStart;
    return {
        path,
        attempt: {
            gateKey,
            profile: profileName,
            template: template?.id ?? null,
            beamWidth: beamWidth ?? null,
            ok: !!path,
            elapsedMs: attMs,
            ...(diverseBeam ? { diverseBeam: true } : {}),
            ...(repair ? { repair: true } : {}),
            ...(repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
        },
    };
}

/** Many-gate levels (≥ this) dilute budget across configs×gates faster than genuinely
 *  infeasible gates get pruned out (16 configs × 4 gates = 64 even slices on a 4-gate
 *  level — stress-corpus finding: S118). Deliberately 4, not 3: nodesExpanded is a noisy
 *  proxy (a structurally bushier dead-end gate can out-expand a constrained correct one),
 *  and a 3-gate A/B (S142) regressed solved→timeout under this weighting — so it's scoped
 *  to the population it was verified on. No published level has more than 3 gates, so this
 *  threshold means the published corpus is provably untouched by this code path. */
const ADAPTIVE_GATE_THRESHOLD = 4;
/** Floor on the per-gate weight multiplier once adaptive weighting kicks in: even a gate
 *  that shows little search activity keeps this fraction of its flat even-split share, so
 *  an efficiently-pruned-but-actually-correct gate is never starved to near zero. */
const ADAPTIVE_GATE_WEIGHT_FLOOR = 0.35;

/** Weight for `gateKey`'s next budget share, based on nodesExpanded accumulated so far
 *  (a proxy for "this gate has live search activity" vs. "attempts here prune out fast").
 *  Returns 1 (no skew) until every gate has contributed at least one data point. */
function adaptiveGateWeight(gateKey: number, gateProgress: Map<number, number>): number {
    const total = [...gateProgress.values()].reduce((a, b) => a + b, 0);
    if (total <= 0) return 1;
    const n = gateProgress.size;
    const share = (gateProgress.get(gateKey) ?? 0) / total;
    return Math.max(ADAPTIVE_GATE_WEIGHT_FLOOR, (share * n) ** 2);
}

async function runInterleavedAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    let pairsLeft = baseConfigs.length * activeGates.length;

    // Adaptive gate weighting only engages on genuinely dilution-prone levels, and only
    // from the second full config round onward — round 0 always runs at the flat even
    // split so every gate contributes at least one real signal before any skew applies.
    const adaptive = activeGates.length >= ADAPTIVE_GATE_THRESHOLD;
    const gateProgress = adaptive ? new Map(activeGates.map(g => [g, 0])) : null;

    for (let ci = 0; ci < baseConfigs.length; ci++) {
        for (let gi = 0; gi < activeGates.length; gi++) {
            const gateKey = activeGates[gi];
            const elapsed = Date.now() - levelStartTime;
            if (elapsed >= timeBudgetMs) return { solution: null, attempts };
            const pairShare = Math.floor((timeBudgetMs - elapsed) / pairsLeft);
            const minFrac = baseConfigs[ci].minBudgetFraction ?? 0;
            const gateShare = (timeBudgetMs - elapsed) / activeGates.length;
            let attBudget = minFrac > 0
                ? Math.max(Math.floor(gateShare * minFrac), pairShare)
                : pairShare;
            if (gateProgress && ci >= 1) {
                attBudget = Math.max(50, Math.floor(attBudget * adaptiveGateWeight(gateKey, gateProgress)));
            }
            if (attBudget < 50) return { solution: null, attempts };

            const nodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], attBudget, Date.now(), yieldFn);
            if (gateProgress) {
                const nodesAfter = prep._metrics ? prep._metrics.nodesExpanded : 0;
                gateProgress.set(gateKey, (gateProgress.get(gateKey) ?? 0) + (nodesAfter - nodesBefore));
            }
            attempts.push(result.attempt);
            pairsLeft--;
            if (result.path) return { solution: result.path, attempts };
        }
    }
    return { solution: null, attempts };
}

async function runGateSerialAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];

    for (let gi = 0; gi < activeGates.length; gi++) {
        const gateKey = activeGates[gi];
        const gateElapsed = Date.now() - levelStartTime;
        if (gateElapsed >= timeBudgetMs) return { solution: null, attempts };

        const gateStart = Date.now();
        const timeLeft = timeBudgetMs - gateElapsed;
        const gatesLeft = activeGates.length - gi;
        const gateBudget = Math.floor(timeLeft / gatesLeft);

        for (let ci = 0; ci < baseConfigs.length; ci++) {
            const elapsed = Date.now() - gateStart;
            if (elapsed >= gateBudget) break;

            const remaining = gateBudget - elapsed;
            const attemptsLeft = baseConfigs.length - ci;
            const minFrac = baseConfigs[ci].minBudgetFraction ?? 0;
            const evenShare = Math.floor(remaining / attemptsLeft);
            const attBudget = minFrac > 0
                ? Math.max(Math.floor(remaining * minFrac), evenShare)
                : evenShare;
            if (attBudget < 50) break;

            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], attBudget, Date.now(), yieldFn);
            attempts.push(result.attempt);
            if (result.path) return { solution: result.path, attempts };
        }
    }
    return { solution: null, attempts };
}

/** Extra wall-clock budget granted to the repair fallback (see attempts.ts's
 *  needsRepairFallback) ON TOP of the level's normal timeBudgetMs — never carved out of the
 *  main DFS/beam loop's share. A first version reserved a fraction of the ORIGINAL budget for
 *  repair up front (shrinking mainBudgetMs before the main loop ran); that quietly regressed a
 *  previously-solid fix elsewhere on this exact feature gate whose fix WAS a tight budget race
 *  (won by getting more of the existing pool, not less) — confirmed via a clean A/B against the
 *  pre-repair code (see stress/README.md). Extending the total budget instead costs the main
 *  loop nothing on any level, ever — repair only ever adds wall time on levels where every
 *  earlier attempt has already failed. 3.0 (not 1.0): the stagnation-burst diversification in
 *  repair-search.ts needs a full anti-stagnation cycle to escape a plateau on some levels —
 *  measured 25-38s of pure repairSearchFromGate compute to solve S030/S033/S039 in isolation,
 *  and running through the full orchestration flow (after the main loop's own ~20s of DFS/beam
 *  work) was measurably slower than that isolated figure at the same nominal budget — so 3.0
 *  (60s) budgets in real margin rather than the bare isolated minimum.
 *
 *  6.0 (not 3.0): S043 (the must-turn/portal-parity double-guidance fix — see
 *  stress/README.md) needs its correct-direction turn AND its parity-mandatory portal to land
 *  in an order-dependent way that only some restarts hit, and reaching one of those restarts
 *  measured ~93s of pure repairSearchFromGate compute even from a cold, uncontended isolated
 *  call — already past the 60s (3.0×20000ms) budget the rest of the cluster needed. Confirmed
 *  via the full solveLevel() orchestration (not just isolated) at a scaled-up budget: S043
 *  solved in ~93s of repair's own time (132.9s total, including the main loop's unchanged
 *  beam attempts) — consistent with, not faster than, the isolated figure, so 3.0's
 *  isolated-vs-orchestration slowdown margin still applies on top. 6.0 (120s at the standard
 *  20s test budget) covers this with room to spare without changing anything about the main
 *  DFS/beam loop's own budget or timing on any level. */
const REPAIR_EXTRA_BUDGET_FRACTION = 6.0;

export async function solveLevel(level: NormalizedLevel, opts: SolveOpts = {}): Promise<SolveResult> {
    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
    const yieldFn = typeof opts.yieldFn === 'function' ? opts.yieldFn : null;
    const levelStartTime = Date.now();
    const prep = prepLevel(level);
    const gateKeys = Array.isArray(level.gateKeys) ? level.gateKeys : [];

    // Ablation config: attach to prep so all inner functions can read it.
    const cfg = opts.ablation ?? null;
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    // Offline tooling hook (hint-diversification audits): when set, the very first
    // move out of a gate is restricted to this single packed cell key. Read by
    // getNeighbors()'s callers in search.js only when pos === the gate it started from.
    // No effect on normal play/solve — opts.forcedFirstStepKey is never set in production.
    prep._forcedFirstStepKey = (opts.forcedFirstStepKey != null) ? opts.forcedFirstStepKey : null;
    // Same offline tooling hook, for the move immediately after a portal jump instead of
    // the gate. { from: portalDestKey, to: forcedNextKey }. Read by getNeighbors() in
    // search-state.js. No effect on normal play/solve — never set in production.
    prep._forcedPortalExitKey = (opts.forcedPortalExitKey != null) ? opts.forcedPortalExitKey : null;

    // Build attempt configs, then apply ablation profile/template filters and ordering overrides.
    const baseConfigs = getConfiguredAttemptConfigs(level, cfg);
    const activeGates = getActiveGates(level, gateKeys, cfg);

    // The repair fallback(s) (attempts.ts's needsRepairFallback / repairMustTurnBiasedAttempt)
    // are pulled out of the normal per-config loop and run afterward, each with its own extra
    // budget (REPAIR_EXTRA_BUDGET_FRACTION) — mainConfigs excludes them so neither competes for
    // a share of timeBudgetMs. Absent on every level outside those feature gates, so mainConfigs
    // === baseConfigs there, unchanged. There can be up to two: the ordinary repair attempt, and
    // (must-turn levels only) a second, exit-guidance-biased attempt that only ever runs if the
    // first one fails on every gate — see AttemptConfig.repairMustTurnBiased.
    const repairConfigs = baseConfigs.filter(c => c.repair);
    const mainConfigs = repairConfigs.length > 0 ? baseConfigs.filter(c => !c.repair) : baseConfigs;

    // Multi-gate levels: interleave configs across gates (config-outer, gate-inner).
    // This prevents Gate 1 exhausting its full budget before Gate 2 ever gets to try
    // Config 1 — crucial when Gate 1 is structurally infeasible but parity-feasible.
    // Ablation: STRATEGY_GATE_INTERLEAVING can force the gate-outer (non-interleaved) loop.
    const useInterleaving = (!cfg || cfg.STRATEGY_GATE_INTERLEAVING);
    const result = useInterleaving && activeGates.length > 1
        ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, levelStartTime, yieldFn)
        : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, levelStartTime, yieldFn);

    for (const repairConfig of repairConfigs) {
        if (result.solution) break;
        const repairTotalBudget = Math.floor(timeBudgetMs * REPAIR_EXTRA_BUDGET_FRACTION);
        const repairStart = Date.now();
        for (let gi = 0; gi < activeGates.length; gi++) {
            const gateKey = activeGates[gi];
            const elapsed = Date.now() - repairStart;
            const gatesLeft = activeGates.length - gi;
            const repairBudget = Math.floor((repairTotalBudget - elapsed) / gatesLeft);
            if (repairBudget < 50) break;
            const r = await runAttempt(gateKey, level, prep, repairConfig, repairBudget, Date.now(), yieldFn);
            result.attempts.push(r.attempt);
            if (r.path) { result.solution = r.path; break; }
        }
    }

    const totalMs = Date.now() - levelStartTime;
    const nodesExpanded = prep._metrics.nodesExpanded;
    if (result.solution) {
        return { ok: true, status: 'success', solution: result.solution, solutions: [result.solution], attempts: result.attempts, totalMs, nodesExpanded };
    }
    return { ok: false, status: totalMs >= timeBudgetMs ? 'timeout' : 'failed', solution: null, solutions: [], attempts: result.attempts, totalMs, nodesExpanded };
}
