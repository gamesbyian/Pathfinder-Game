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
    /** Hard per-level ceiling on saved hints. */
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
    /** cooperative scheduler (UI); omit in tests/Node for a straight-through run. */
    yieldFn?: () => Promise<void>;
    /** deadline OR cancel — polled to stop early. */
    shouldStop?: () => boolean;
    /** cancel only — lets the session report `cancelled` vs `budget`. */
    isCancelled?: () => boolean;
    onProgress?: (e: { savedCount: number; curatedCount: number }) => void;
}

export interface VarietyResult {
    /** New validated solutions found this session (to append to the level). */
    newlySaved: number[][];
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
    const maxHints = config.maxHints ?? 1000;
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

    const curatedCount = (cap: number): number =>
        selectDisplayHints(pool.slice(), { cap, navDensity: nd, mustCrossKeys: mcKeys }).indices.length;

    async function run(runOpts: VarietyRunOptions): Promise<VarietyResult> {
        const { mode, target = 15, yieldFn, shouldStop: extStop, isCancelled, onProgress } = runOpts;
        let capped = false;
        let done: VarietyOutcome | null = null; // set when a self-driven stop condition is hit
        const shouldStop = () => capped || done !== null || (extStop ? extStop() : false);

        // curator saturation tracking (targeted mode)
        let lastK = 0;
        let sinceGrowth = 0;
        let sinceCheck = 0;
        const CHECK_INTERVAL = 20;

        const consider = (candidate: number[]) => {
            if (sigs.has(pathSignature(candidate))) return;
            const v = validateCandidatePath(level, candidate); // PLAY referee — geese/false-goal safe
            if (!v.ok) return;
            const sig = pathSignature(v.path);
            if (sigs.has(sig)) return;
            sigs.add(sig);
            pool.push(v.path);
            newlySaved.push(v.path);
            if (pool.length >= maxHints) { capped = true; return; }
            if (mode !== 'targeted') {
                // complete mode: emit a lightweight running count for the UI (no curation cost).
                if (onProgress && newlySaved.length % CHECK_INTERVAL === 0) onProgress({ savedCount: newlySaved.length, curatedCount: 0 });
                return;
            }
            if (++sinceCheck >= CHECK_INTERVAL) {
                sinceCheck = 0;
                const k = curatedCount(target);
                if (k > lastK) { lastK = k; sinceGrowth = 0; } else { sinceGrowth += CHECK_INTERVAL; }
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
                await enumerateFromGate(level, prep, gate, { ...enumOpts, rng, nodeBudget });
            }
        }
        if (!shouldStop() && existingHints.length) {
            const seeds = shuffle(existingHints.slice(), rng).slice(0, seedCount);
            for (const seed of seeds) {
                if (shouldStop()) break;
                const L = seed.length;
                for (let k = Math.max(1, Math.floor(L * 0.3)); k < L - 2 && !shouldStop(); k += Math.max(1, Math.floor(L * 0.12))) {
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
