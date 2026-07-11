// Variety-search session — the engine behind the Editor/Review "Solve" button's count-based tiers and
// the "Find all possible hints" option. Pure and DOM-free (unit-tested); the UI wraps it with the
// yieldFn/cancel/progress plumbing. Composes the shared enumeration engine (hint-enumeration.ts) with
// the SAME display curation a player sees (selectDisplayHints), and the SAME PLAY referee the game uses.
//
// Two modes:
//   • targeted — search until the display curator can confidently present ~`target` distinct approaches
//     (the tier number), or variety saturates, or the caller stops it;
//   • complete ("Find all") — deterministic complete enumeration of every gate's tree; provably finds
//     all solutions (bounded only by the cap / cancel).
//
// It SAVES every valid, exact-deduped solution it finds (the tier number governs when to stop searching,
// not what to keep); the curated subset is only a preview of the variety achieved.
import { validateCandidatePath } from '../domain/path-validator.js';
import { selectDisplayHints } from '../domain/hint-selection.js';
import { pathSignature } from '../domain/path-features.js';
import { enumerateFromGate, anchoredFromSeed } from './hint-enumeration.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel } from './types.js';

export type VarietyOutcome = 'target' | 'exhaustive' | 'saturated' | 'budget' | 'capped' | 'cancelled';

export interface VarietySearchConfig {
    /** Default hard per-level ceiling on saved hints, used when a run doesn't override it. */
    maxHints?: number;
    /** targeted mode: give up ("saturated") after this many new finds without the curated set growing. */
    stagnation?: number;
    /** targeted mode: randomized-restart laps over the gates. */
    restarts?: number;
    /** per-generator-call node ceiling (targeted mode); complete mode is unbounded. */
    nodeBudget?: number;
    /** targeted mode: how many existing hints to seed System B (prefix-anchor) from. */
    seeds?: number;
    /** required — RNG for randomized restarts (seed it for reproducibility). */
    rng: () => number;
}

export interface VarietyRunOptions {
    mode: 'targeted' | 'complete';
    /** targeted mode: how many distinct approaches the curator should be able to present. */
    target?: number;
    /** overrides the session's default `maxHints` for this run only — lets a caller resume a
     *  capped run at a higher ceiling (e.g. "Find all — no cap"'s 2,500 soft-stop → 5,000 hard cap)
     *  without starting a new session or losing the accumulated pool. */
    maxHints?: number;
    /** cooperative scheduler (UI); omit in tests/Node for a straight-through run. */
    yieldFn?: () => Promise<void>;
    /** deadline OR cancel — polled to stop early. */
    shouldStop?: () => boolean;
    /** cancel only — lets the session report `cancelled` vs `budget`. */
    isCancelled?: () => boolean;
    onProgress?: (e: { savedCount: number; curatedCount: number }) => void;
}

export interface VarietySavedMeta { nodesExpanded: number | null; elapsedMs: number | null; technique: string; }

/** A solution the search independently found again, but whose path already matches an existing
 *  (pre-seeded) hint — see `rediscovered` on VarietyResult. */
export interface VarietyRediscoveredEntry extends VarietySavedMeta { path: number[]; }

export interface VarietyResult {
    /** New validated solutions found this session (to append to the level). */
    newlySaved: number[][];
    /** Metadata aligned 1:1 with newlySaved. */
    newlySavedMeta: VarietySavedMeta[];
    /** Independent (re)discoveries of a path that was ALREADY in `existingHints` — not new paths
     *  (never added to `newlySaved`/the pool), but each is a genuine discovery event carrying its
     *  own technique/cost, worth attributing to the existing hint rather than silently dropping.
     *  See CLAUDE.md's hint-provenance section: "one entry per independent find". */
    rediscovered: VarietyRediscoveredEntry[];
    /** The curator's varied subset over (existing + new), for preview. */
    shown: number[][];
    savedCount: number;
    curatedCount: number;
    outcome: VarietyOutcome;
}

function navDensity(level: NormalizedLevel): number {
    const g = level.grid;
    const occupied = level.blockSet.size + level.gooseSet.size + level.falseGoalKeys.size + level.gateKeys.length;
    return level.reqLen / Math.max(1, g.w * g.h - occupied);
}

/**
 * Create a resumable variety-search over one level. `existingHints` are treated as already-saved (not
 * re-reported) but count toward curation and the cap. Call `run()` for one pass; call it again (targeted
 * mode) to continue — the pool and RNG persist, so "extend" finds more.
 */
export function createVarietySearch(
    level: NormalizedLevel, prep: PrepLevel, existingHints: number[][], config: VarietySearchConfig,
) {
    const defaultMaxHints = config.maxHints ?? 1000;
    const stagnation = config.stagnation ?? 400;
    const restarts = config.restarts ?? 24;
    const nodeBudget = config.nodeBudget ?? 120000;
    const seedCount = config.seeds ?? 12;
    const rng = config.rng;
    const nd = navDensity(level);
    const mcKeys = level.mustCrossKeys;

    const pool: number[][] = [...existingHints];
    const sigs = new Set(pool.map(pathSignature));
    const newlySaved: number[][] = [];
    const newlySavedMeta: VarietySavedMeta[] = [];
    const rediscovered: VarietyRediscoveredEntry[] = [];

    const curatedCount = (cap: number): number =>
        selectDisplayHints(pool.slice(), { cap, navDensity: nd, mustCrossKeys: mcKeys }).indices.length;

    async function run(runOpts: VarietyRunOptions): Promise<VarietyResult> {
        const { mode, target = 15, yieldFn, shouldStop: extStop, isCancelled, onProgress } = runOpts;
        const maxHints = runOpts.maxHints ?? defaultMaxHints;
        let capped = false;
        let done: VarietyOutcome | null = null; // set when a self-driven stop condition is hit
        const shouldStop = () => capped || done !== null || (extStop ? extStop() : false);

        // curator saturation tracking (targeted mode)
        let lastK = 0;
        let sinceGrowth = 0;
        let sinceCheck = 0;
        const PROGRESS_INTERVAL = 20; // complete-mode progress-message cadence — cheap, stays fixed.
        // selectDisplayHints rescans the WHOLE pool each call (measured: ~2ms at pool=50, ~41ms at
        // pool=1950 on a real level — see docs/solve-button-variety.md's profiling note), so a FIXED
        // recheck cadence makes total curation overhead grow with pool size squared: rechecking every
        // 20 finds means ~pool/20 recomputes, each itself O(pool), i.e. O(pool^2/20) total. Scaling the
        // interval with the current pool size instead keeps checks roughly geometrically spaced as the
        // pool grows, bounding total curation time to close to O(pool) — measured to cut curation's
        // share of wall time from ~50-70% to a small fraction on solution-rich levels, with no change
        // to outcome correctness (only how promptly target-reached/saturated is detected).
        const curationCheckInterval = () => Math.max(20, Math.floor(pool.length / 10));

        const techniqueForCurrentPhase = { value: mode === 'complete' ? 'enumerate-complete' : 'enumerate-targeted' };
        const consider = (candidate: number[], nodesExpanded: number | null = null, elapsedMs: number | null = null) => {
            if (sigs.has(pathSignature(candidate))) {
                rediscovered.push({ path: candidate, nodesExpanded, elapsedMs, technique: techniqueForCurrentPhase.value });
                return;
            }
            const v = validateCandidatePath(level, candidate); // PLAY referee — geese/false-goal safe
            if (!v.ok) return;
            const sig = pathSignature(v.path);
            if (sigs.has(sig)) {
                rediscovered.push({ path: v.path, nodesExpanded, elapsedMs, technique: techniqueForCurrentPhase.value });
                return;
            }
            sigs.add(sig);
            pool.push(v.path);
            newlySaved.push(v.path);
            newlySavedMeta.push({ nodesExpanded, elapsedMs, technique: techniqueForCurrentPhase.value });
            if (pool.length >= maxHints) { capped = true; return; }
            if (mode !== 'targeted') {
                // complete mode: emit a lightweight running count for the UI (no curation cost).
                if (onProgress && newlySaved.length % PROGRESS_INTERVAL === 0) onProgress({ savedCount: newlySaved.length, curatedCount: 0 });
                return;
            }
            const interval = curationCheckInterval();
            if (++sinceCheck >= interval) {
                sinceCheck = 0;
                const k = curatedCount(target);
                if (k > lastK) { lastK = k; sinceGrowth = 0; } else { sinceGrowth += interval; }
                onProgress?.({ savedCount: newlySaved.length, curatedCount: k });
                if (k >= target) done = 'target';
                else if (sinceGrowth >= stagnation) done = 'saturated';
            }
        };

        const enumOpts = { onSolution: consider, shouldStop, yieldFn: yieldFn ?? null };

        if (mode === 'complete') {
            let allExhausted = true;
            for (const gate of level.gateKeys) {
                if (shouldStop()) { allExhausted = false; break; }
                techniqueForCurrentPhase.value = 'enumerate-complete';
                const res = await enumerateFromGate(level, prep, gate, { ...enumOpts, rng: null, nodeBudget: Infinity });
                if (!res.exhausted) allExhausted = false;
            }
            const outcome: VarietyOutcome = capped ? 'capped'
                : (isCancelled && isCancelled()) ? 'cancelled'
                : allExhausted ? 'exhaustive'
                : 'cancelled'; // stopped without exhausting and not cap → a stop was requested
            return finish(outcome, target);
        }

        // targeted mode: randomized-restart enumeration (System A), then prefix-anchored seeds (System B)
        for (let r = 0; r < restarts && !shouldStop(); r++) {
            for (const gate of level.gateKeys) {
                if (shouldStop()) break;
                techniqueForCurrentPhase.value = 'enumerate-targeted';
                await enumerateFromGate(level, prep, gate, { ...enumOpts, rng, nodeBudget });
            }
        }
        if (!shouldStop() && existingHints.length) {
            const seeds = shuffle(existingHints.slice(), rng).slice(0, seedCount);
            for (const seed of seeds) {
                if (shouldStop()) break;
                const L = seed.length;
                for (let k = Math.max(1, Math.floor(L * 0.3)); k < L - 2 && !shouldStop(); k += Math.max(1, Math.floor(L * 0.12))) {
                    techniqueForCurrentPhase.value = 'prefix-anchored';
                    await anchoredFromSeed(level, prep, seed, k, { ...enumOpts, rng, nodeBudget });
                }
            }
        }
        let outcome: VarietyOutcome;
        if (done) outcome = done;
        else if (capped) outcome = 'capped';
        else if (isCancelled && isCancelled()) outcome = 'cancelled';
        else if (extStop && extStop()) outcome = 'budget';
        // generators drained without any external stop: classify by whether we met the target.
        else outcome = curatedCount(target) >= target ? 'target' : 'saturated';
        return finish(outcome, target);
    }

    function finish(outcome: VarietyOutcome, target: number): VarietyResult {
        const sel = selectDisplayHints(pool.slice(), { cap: target, navDensity: nd, mustCrossKeys: mcKeys });
        return {
            newlySaved: newlySaved.slice(),
            newlySavedMeta: newlySavedMeta.slice(),
            rediscovered: rediscovered.slice(),
            shown: sel.indices.map(i => pool[i]),
            savedCount: newlySaved.length,
            curatedCount: sel.indices.length,
            outcome,
        };
    }

    return { run };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
}
