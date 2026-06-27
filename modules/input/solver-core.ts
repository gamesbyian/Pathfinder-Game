// Pure decision/formatting logic extracted from solver-controller (DOM-free, unit-tested).

/** A diverse-search run report (subset consumed by the summary builder). */
export interface DiverseSearchReport {
    haltedByCancel: boolean;
    haltedByMaxHints: boolean;
    errors: unknown[];
}

/**
 * Build the human-readable completion summary for a diverse-hint search. Explains either
 * what new hints were found, or why nothing new turned up (cancelled / hint-limit / budget
 * exhausted / fully explored), plus extend hints and a skipped-error note.
 */
export function buildDiverseSearchSummary(novel: number[][], report: DiverseSearchReport, isComplete: boolean): string[] {
    const lines: string[] = [];
    if (novel.length > 0) {
        lines.push(`Found ${novel.length} new hint${novel.length === 1 ? '' : 's'} for this level.`);
        lines.push('New hints are saved for this session and contribute to the level’s heat map.');
    } else if (report.haltedByCancel) {
        lines.push('Search stopped before finding anything new.');
    } else if (report.haltedByMaxHints) {
        lines.push('Hint limit reached before finding anything new.');
    } else if (!isComplete) {
        lines.push('No new hints found before the time budget ran out.');
        lines.push('Try a longer search to keep exploring.');
    } else {
        lines.push('No new hints found.');
        lines.push('Every gate, direction, and strategy combination was explored — this level’s existing hints already cover its solution variety.');
    }
    if (!isComplete && !report.haltedByCancel) {
        lines.push('This search hasn’t covered every possibility yet — extend it to look for more.');
    }
    if (report.errors.length > 0) {
        lines.push(`${report.errors.length} search step${report.errors.length === 1 ? '' : 's'} hit an error and were skipped.`);
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

/** A cached diverse-search session is stale once the active level has changed. */
export function isSessionStale(sessionLevelIdx: number, currentLevelIdx: number): boolean {
    return sessionLevelIdx !== currentLevelIdx;
}

/** Offer an "extend search" affordance only when the search neither completed nor was cancelled. */
export function shouldOfferExtend(isComplete: boolean, haltedByCancel: boolean): boolean {
    return !isComplete && !haltedByCancel;
}
