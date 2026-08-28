import { canonicalAttemptConfigKey } from './portfolio-solve-sweep-lib.mjs';

export function winnerConfig(attempt) {
    return canonicalAttemptConfigKey(attempt);
}
const pct = (values, percentile) => values.length ? values[Math.max(0, Math.ceil(values.length * percentile) - 1)] : null;
const metric = value => value === null || value === undefined || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
export function familyMetadataOf(level) {
    const detail = level?.provenance?.history?.map(entry => entry?.detail).find(entry => entry?.parentLevelId) || {};
    return {
        parentId: level?.parentId ?? level?.family?.parentId ?? level?.familyMetadata?.parentId ?? level?.provenance?.parentId ?? detail.parentLevelId ?? null,
        mode: level?.mode ?? level?.family?.mode ?? level?.familyMetadata?.mode ?? level?.relation ?? detail.relation ?? null,
    };
}
export function summarizeFamilyWinningAttempts(levels, { groupBy = 'parentId' } = {}) {
    const groups = new Map();
    for (const level of levels) {
        if (!(level?.ok === true || level?.status === 'success')) continue;
        const attempts = level.attempts ?? [];
        const attemptIndex = attempts.findIndex(a => a?.ok === true || a?.status === 'success');
        if (attemptIndex < 0) continue;
        const attempt = attempts[attemptIndex];
        const { parentId, mode } = familyMetadataOf(level);
        const key = groupBy === 'mode' ? mode : groupBy === 'parentId+mode' ? `${parentId ?? 'unknown'}|${mode ?? 'unknown'}` : parentId;
        if (key == null) continue;
        const metrics = { workSpent: metric(attempt.workSpent), nodesExpanded: metric(attempt.nodesExpanded), elapsedMs: metric(attempt.elapsedMs) };
        const row = { config: winnerConfig(attempt), metrics, attemptIndex };
        if (!groups.has(String(key))) groups.set(String(key), []);
        groups.get(String(key)).push(row);
    }
    return [...groups.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([group,wins]) => {
        const counts = {};
        for (const win of wins) counts[win.config] = (counts[win.config] ?? 0) + 1;
        const n = wins.length;
        const preferredUnit = ['workSpent', 'nodesExpanded', 'elapsedMs'].find(unit => wins.some(win => win.metrics[unit] !== null)) ?? null;
        const values = preferredUnit ? wins.map(win => win.metrics[preferredUnit]).filter(Number.isFinite).sort((a, b) => a - b) : [];
        const entropy = -Object.values(counts).reduce((sum, count) => sum + (count / n) * Math.log2(count / n), 0);
        return {
            group,
            solvedVariantCount: n,
            winnerDistribution: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
            uniqueObservedWins: Object.keys(counts).length,
            winnerConcentration: Math.max(...Object.values(counts)) / n,
            winnerEntropyBits: entropy,
            medianWinningWork: pct(values, .5),
            p90WinningWork: pct(values, .9),
            winningWorkUnit: preferredUnit,
            winningWorkSampleCount: values.length,
            workAvailability: Object.fromEntries(['workSpent', 'nodesExpanded', 'elapsedMs'].map(unit => [unit, wins.filter(win => win.metrics[unit] !== null).length])),
            medianAttemptIndex: pct(wins.map(win => win.attemptIndex).sort((a, b) => a - b), .5),
        };
    });
}
