import { describe, expect, it } from 'vitest';
import { createFailureProgressCollector } from './failure-progress.js';

describe('failure progress collector', () => {
  it('keeps bounded new-best transitions and plateau work by family', () => {
    const collector = createFailureProgressCollector({ maxTransitions: 2 });
    for (const row of [
      { family: 'repair' as const, workSpent: 10, badness: 9, kind: 'new-best' as const },
      { family: 'repair' as const, workSpent: 20, badness: 7, kind: 'new-best' as const },
      { family: 'repair' as const, workSpent: 30, badness: 5, kind: 'new-best' as const },
      { family: 'beam' as const, workSpent: 40, badness: 8, kind: 'terminal' as const },
    ]) collector.observe(row);
    const summary = collector.summary(50);
    expect(summary.repair).toMatchObject({ bestBadness: 5, lastImprovementWork: 30, workAfterLastImprovement: 20, improvementCount: 3, retainedTransitions: 2, truncated: true });
    expect(summary.beam).toMatchObject({ bestBadness: 8, finalBadness: 8, improvementCount: 1 });
  });
});
