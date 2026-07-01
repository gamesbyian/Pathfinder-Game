import { getConfiguredAttemptConfigs } from './attempts.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { beamSearchFromGate, dfsFromGateLDS } from './search.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig, ForcedPortalExit } from './types.js';

type YieldFn = (() => Promise<void>) | null;
/** One recorded attempt's metadata. */
interface Attempt { gateKey: number; profile: string; template: string | null; beamWidth: number | null; ok: boolean; elapsedMs: number; }
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
    const gates = Math.max(1, level.gateKeys?.length || 1);
    const perGateCost = area * 15 + (level.reqLen || 0) * 40 + special * 120;
    return Math.min(120000, Math.max(3000, 2500 + perGateCost * gates));
}

function getActiveGates(level: NormalizedLevel, gateKeys: number[], cfg: AblationConfig | null): number[] {
    if (level.portalMap.size !== 0 || (cfg && !cfg.STRATEGY_PARITY_GATE_FILTER)) return gateKeys;

    const goalP = ((level.goalKey & 0xFFFF) + ((level.goalKey >>> 16) & 0xFFFF)) & 1;
    const feasible = gateKeys.filter(gk => {
        const gP = ((gk & 0xFFFF) + ((gk >>> 16) & 0xFFFF)) & 1;
        return (gP ^ goalP ^ (level.reqLen & 1)) === 0;
    });
    return feasible.length > 0 ? feasible : gateKeys;
}

async function runAttempt(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel,
    attemptConfig: AttemptConfig, attBudget: number, attStart: number, yieldFn: YieldFn,
): Promise<AttemptResult> {
    const { profileName, template, beamWidth, diverseBeam } = attemptConfig;
    const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
    let path: number[] | null = null;
    try {
        path = beamWidth
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
        },
    };
}

async function runInterleavedAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    let pairsLeft = baseConfigs.length * activeGates.length;

    for (let ci = 0; ci < baseConfigs.length; ci++) {
        for (let gi = 0; gi < activeGates.length; gi++) {
            const elapsed = Date.now() - levelStartTime;
            if (elapsed >= timeBudgetMs) return { solution: null, attempts };
            const pairShare = Math.floor((timeBudgetMs - elapsed) / pairsLeft);
            const minFrac = baseConfigs[ci].minBudgetFraction ?? 0;
            const gateShare = (timeBudgetMs - elapsed) / activeGates.length;
            const attBudget = minFrac > 0
                ? Math.max(Math.floor(gateShare * minFrac), pairShare)
                : pairShare;
            if (attBudget < 50) return { solution: null, attempts };

            const result = await runAttempt(activeGates[gi], level, prep, baseConfigs[ci], attBudget, Date.now(), yieldFn);
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

    // Multi-gate levels: interleave configs across gates (config-outer, gate-inner).
    // This prevents Gate 1 exhausting its full budget before Gate 2 ever gets to try
    // Config 1 — crucial when Gate 1 is structurally infeasible but parity-feasible.
    // Ablation: STRATEGY_GATE_INTERLEAVING can force the gate-outer (non-interleaved) loop.
    const useInterleaving = (!cfg || cfg.STRATEGY_GATE_INTERLEAVING);
    const result = useInterleaving && activeGates.length > 1
        ? await runInterleavedAttempts(activeGates, baseConfigs, level, prep, timeBudgetMs, levelStartTime, yieldFn)
        : await runGateSerialAttempts(activeGates, baseConfigs, level, prep, timeBudgetMs, levelStartTime, yieldFn);

    const totalMs = Date.now() - levelStartTime;
    const nodesExpanded = prep._metrics.nodesExpanded;
    if (result.solution) {
        return { ok: true, status: 'success', solution: result.solution, solutions: [result.solution], attempts: result.attempts, totalMs, nodesExpanded };
    }
    return { ok: false, status: totalMs >= timeBudgetMs ? 'timeout' : 'failed', solution: null, solutions: [], attempts: result.attempts, totalMs, nodesExpanded };
}
