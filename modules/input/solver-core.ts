// Pure decision/formatting logic for the Editor/Review "Solve" variety search (DOM-free, unit-tested).

export type VarietyOutcome = 'target' | 'exhaustive' | 'saturated' | 'budget' | 'capped' | 'cancelled';

/** A count-based Solve tier: aim for `target` distinct approaches, within a `ceilingMs` time budget
 *  (Infinity = "Find all", no ceiling). The number is a curator-confidence target + effort dial, not a
 *  promise — see docs/solve-button-variety.md. `maxHints` is the save ceiling for the tier's first (and,
 *  absent `hardCap`, only) stage; `hardCap`, when set, is a second-stage ceiling the UI may offer to
 *  extend to once `maxHints` is hit (see "Find all — no cap" below). */
export interface VarietyTier { target: number; ceilingMs: number; complete: boolean; maxHints?: number; hardCap?: number; }

export const VARIETY_TIERS: Record<'few' | 'many' | 'lots', VarietyTier> = {
    few:  { target: 5,   ceilingMs: 8000,  complete: false },
    many: { target: 25,  ceilingMs: 20000, complete: false },
    lots: { target: 100, ceilingMs: 45000, complete: false },
};

/** Time ceiling scales ~linearly with the requested count, clamped to a sane band. */
export function customTier(target: number): VarietyTier {
    const t = Math.max(1, Math.floor(target));
    return { target: t, ceilingMs: Math.min(120000, Math.max(6000, t * 500)), complete: false };
}

/** "Find all possible hints" (up to 1,000): complete enumeration, no target, no time ceiling. */
export const FIND_ALL_TIER: VarietyTier = { target: 25, ceilingMs: Infinity, complete: true, maxHints: 1000 };

/** "Find all — no cap": labelled uncapped to the user, but soft-stops at 2,500 to ask whether to keep
 *  going, then hard-stops at 5,000 — no level can run truly unbounded. See docs/solve-button-variety.md
 *  decision 6. */
export const FIND_ALL_NOCAP_TIER: VarietyTier = { target: 25, ceilingMs: Infinity, complete: true, maxHints: 2500, hardCap: 5000 };

export interface VarietyResultLike {
    outcome: VarietyOutcome;
    /** new solutions saved this run */
    savedCount: number;
    /** distinct approaches the curator can present over (existing + new) */
    curatedCount: number;
    errorsCount?: number;
}

/**
 * Human-readable completion summary. Reports BOTH the saved count (data gained) and the curated count
 * (variety the player will see), with honest outcome-specific phrasing — never claims exhaustiveness
 * unless the search actually drained the tree, and states plainly when a "Find all" was cut short.
 */
export function buildVarietySearchSummary(res: VarietyResultLike, opts: { target: number; maxHints: number; mode: 'targeted' | 'complete' }): string[] {
    const { savedCount, curatedCount, outcome } = res;
    const lines: string[] = [];
    const saved = `${savedCount} new solution${savedCount === 1 ? '' : 's'}`;
    const varied = `${curatedCount} varied approach${curatedCount === 1 ? '' : 'es'}`;

    if (savedCount > 0) {
        lines.push(`Saved ${saved} for this level.`);
        lines.push('New solutions feed the level’s heat map; the hint display curates a varied subset from them.');
    }

    switch (outcome) {
        case 'target':
            lines.push(`The hint display can now present ${varied} (your goal was ${opts.target}).`);
            break;
        case 'exhaustive':
            lines.push(savedCount > 0
                ? `Complete: every solution to this level has now been found. The curator can present ${varied}.`
                : 'Complete: every solution to this level was already saved — nothing new to add.');
            break;
        case 'saturated':
            lines.push(savedCount > 0
                ? `That’s all the meaningfully-different approaches — the curator can present ${varied}. More solutions may exist but closely resemble these.`
                : 'No new solutions found — the saved hints already cover this level’s variety.');
            break;
        case 'capped':
            lines.push(`Reached the ${opts.maxHints}-hint maximum for this level — more solutions exist. The curator can present ${varied}.`);
            break;
        case 'budget':
            lines.push(savedCount > 0
                ? `Stopped at the time budget — the curator can present ${varied} so far. Search again to keep looking.`
                : 'No new solutions found before the time budget ran out. Try searching again to keep exploring.');
            break;
        case 'cancelled':
            lines.push(opts.mode === 'complete'
                ? `Full search stopped early — a complete search was not finished, but the ${saved} found so far ${savedCount === 1 ? 'was' : 'were'} saved.`
                : `Search stopped early${savedCount > 0 ? ` — the ${saved} found so far ${savedCount === 1 ? 'was' : 'were'} saved.` : ' before finding anything new.'}`);
            break;
    }
    if (res.errorsCount && res.errorsCount > 0) {
        lines.push(`${res.errorsCount} search step${res.errorsCount === 1 ? '' : 's'} hit an error and ${res.errorsCount === 1 ? 'was' : 'were'} skipped.`);
    }
    return lines;
}

/** Format a millisecond budget as `M:SS` (clamped at zero). */
export function formatMinSec(ms: number): string {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/** A cached search session is stale once the active level has changed. */
export function isSessionStale(sessionLevelIdx: number, currentLevelIdx: number): boolean {
    return sessionLevelIdx !== currentLevelIdx;
}

/** Offer "search again / extend" only when a time budget cut the search short (more may exist). */
export function shouldOfferExtend(outcome: VarietyOutcome): boolean {
    return outcome === 'budget';
}
