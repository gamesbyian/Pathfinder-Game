# Corpus-2 failure-categorization handoff

> **Status: completed and archived.** This handoff produced
> [`reports/stress/corpus2-failure-categorization-2026-07-29.md`](../../reports/stress/corpus2-failure-categorization-2026-07-29.md).
> It is retained to preserve the original scope and success criteria, not as instructions for a
> new session.

## Original handoff

### Corpus-2 Remaining Failures: Categorization & Root-Cause Analysis

**Context**: A 200+ hour high-budget sweep (240 parallel shards, 300M nodes per level) on Corpus-2's 1184 unsolved levels found only 26 new solves, with every remaining unsolved level hitting the node cap. This confirms the binding constraint is **solver algorithm capability, not compute budget**. The next step is to understand *why* the remaining 995 levels are unsolvable.

**Task**: Categorize a representative sample of the remaining 995 unsolved Corpus-2 levels to identify the dominant failure modes. This is a diagnostic pass, not a solve — the output will guide which solver improvements are worth pursuing.

The detailed investigation plan was `reports/2026-07-29-remaining-corpus2-failure-categorization-plan.md`; the completed result is linked above. The requested success criteria were 20 categorized levels, verified witnesses, a blocker-category distribution, and an actionable solver-development recommendation.
