export interface FailureProgressRecord {
  family: 'dfs' | 'beam' | 'repair';
  workSpent: number;
  badness: number;
  kind: 'new-best' | 'terminal';
}

export function createFailureProgressCollector({ maxTransitions = 16 } = {}) {
  if (!Number.isSafeInteger(maxTransitions) || maxTransitions < 0) throw new Error('maxTransitions must be a non-negative integer');
  const byFamily = new Map<string, { best: number; final: number; lastImprovementWork: number | null; improvements: number; transitions: FailureProgressRecord[]; observed: number }>();
  return Object.freeze({
    observe(record: FailureProgressRecord) {
      if (!Number.isFinite(record.workSpent) || record.workSpent < 0 || !Number.isFinite(record.badness)) return;
      const state = byFamily.get(record.family) ?? { best: Infinity, final: record.badness, lastImprovementWork: null, improvements: 0, transitions: [], observed: 0 };
      state.observed += 1;
      state.final = record.badness;
      if (record.badness < state.best) {
        state.best = record.badness; state.lastImprovementWork = record.workSpent; state.improvements += 1;
        if (state.transitions.length < maxTransitions) state.transitions.push({ ...record });
      }
      byFamily.set(record.family, state);
    },
    summary(totalWorkSpent: number) {
      return Object.fromEntries([...byFamily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([family, state]) => [family, {
        bestBadness: Number.isFinite(state.best) ? state.best : null,
        finalBadness: state.final,
        lastImprovementWork: state.lastImprovementWork,
        workAfterLastImprovement: state.lastImprovementWork === null || !Number.isFinite(totalWorkSpent) ? null : Math.max(0, totalWorkSpent - state.lastImprovementWork),
        improvementCount: state.improvements,
        observedTransitions: state.observed,
        retainedTransitions: state.transitions.length,
        truncated: state.observed > state.transitions.length,
        transitions: state.transitions,
      }]));
    },
  });
}
