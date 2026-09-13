# Solver archaeology: February origins and deleted external research memos

Status: historical-evidence follow-up. This report preserves chronology corrections, early solver-state lessons, and external-research premises. It does not change solver behavior or current workstream priority.

## 1. Retained repository history begins on 2026-02-25, not April

Direct commit-list queries show no retained commits before 2026-02-25. There are no commits from 2026-02-01 through 2026-02-24, and no January commits in retained history.

This corrects an earlier archaeology mistake caused by searching with later solver-research vocabulary instead of walking the repository timeline. January/pre-February thinking, if any, can only be recovered from artifacts copied into the repository later or from sources outside retained Git history.

## 2. February already contains the core future-equivalence warning

The late-February solver introduced failed-state memoization almost immediately. The first signature keyed a state by current position, path progress, intersections and objective/mechanic masks. Within a day, a follow-up identified a correctness hole: it omitted the dynamic visited-count map and per-cell axis-usage state, so states that looked identical under the coarse signature could have different legal futures.

The repaired signature therefore included the sorted full `(cell, visitCount, axisMask)` state plus the other constraints. The same change added explicit NO-SOLUTION sanity diagnostics: if the goal was statically reachable but DFS found no solution, warn that pruning or memoization might be too aggressive.

### Archaeological disposition

Do not resurrect the February cache. Modern exact-state/transposition measurements already give the relevant cost/value verdicts.

Preserve the deeper lesson: **Pathfinder's future-equivalence relation has been path-history-sensitive from the beginning.** The same failure mode later reappears in naive global nogood keys, coarse-state merge collisions, portal-history omissions, and exact-labelled LIVE/DEAD states. Any compressed state representation should be treated as a hypothesis about future equivalence and falsified against exact/live evidence before it is trusted.

The early NO-SOLUTION sanity diagnostic is also an ancestor of the modern counterexample discipline: when a coarse logical/static model says a continuation exists but native search declares exhaustion, first suspect an unsound or lossy search representation before concluding intrinsic impossibility.

## 3. February's Referee is historically primitive, but its termination taxonomy is conceptually useful

The February Referee staged deterministic backtracking first, then randomized fallback with much larger path/time caps, eventually escalating through very large retry budgets and optional external Gemini fallback.

That implementation is obsolete and should not be revived. Modern restart, portfolio, work-budget and high-budget studies supersede it.

What is worth preserving is that the system already distinguished different termination/failure meanings rather than one undifferentiated `unsolved` result: deterministic exhaustion, timeout, randomized retry, and external fallback were separate states in the control plane.

Modern residual work should retain this distinction in richer form. `Not offered`, `offered but starved`, `adequately searched but failed`, `exact-live culled`, `exact-dead preferred`, and `unknown/reference abstain` are causally different outcomes and should not collapse into a single failure label when allocating follow-up work.

## 4. Deleted external-research artifacts are recoverable as a historical stratum

Immediately before their cleanup, the repository root contained at least three external solver-research artifacts:

- `claude_report.txt` (readable, ~69 KB);
- `Pathfinder solver research memo.pdf` (~120 KB);
- `Gemini Pathfinder Solver Debugging and Research.rtf` (~1.5 MB).

The Gemini RTF was explicitly deleted on 2026-05-26. The Claude report remains recoverable from the parent tree and can be read directly. The PDF and large RTF are preserved as historical blobs, but this archaeology pass did not claim to have read their binary contents through the current connector. Later commits that explicitly cite all three memos can still be used to trace recommendations that were adopted.

## 5. Most of the Claude memo's highest-priority advice was actually absorbed

The Claude report's top recommendations were not lost ideas:

- hint paths as counterexamples / prune-safe replay -> later `hint-path-replay` infrastructure;
- side-channel telemetry rather than mutating canonical result identity -> later process/architecture hardening after repeated serialization/identity failures;
- joint obligation / Held-Karp lower bounds -> later unified-HK experiments;
- staged, feature-flagged pruning and matched paired validation -> now normal research discipline;
- diagnose gate predicates before changing thresholds -> later near-closure telemetry work.

Therefore the report should not be treated as a menu of untried recommendations. Much of it is intellectual ancestry for current practice.

## 6. One unspent external-memo idea: bounded completable-state discrimination in final-mile floods

The Claude memo separated the old L108 phenotype from L92-style 'explorer never gets close' failures. For L108 it described a final-mile population where thousands of states shared the same lower bound and the search lacked a discriminator between states whose remaining obligations were still actually completable and those whose were not.

Its proposed mechanism was not another global scalar score. It suggested a bounded structural **completable predicate** as a secondary criterion in a FOCAL/EES-style near-goal search: among states at comparable admissible cost, prefer states for which the remaining obligations can still be satisfied within the remaining step budget.

Repository commit/code searches find no later `FOCAL`, `EES`, `completable predicate`, or equivalent explicit descendant. The line appears unimplemented.

### Archaeological disposition

Do **not** promote this merely because it is untried. It was motivated by a specific final-mile saturation phenotype that may no longer dominate today's residual corpus.

Reopen only if a current residual microscope finds the same causal shape:

1. many native states at the same/similar final lower bound;
2. materially different exact completion labels inside that population;
3. ordinary scalar progress cannot separate them;
4. a small bounded structural completion query can separate them cheaply enough to act as a secondary consumer.

If those conditions recur, this is a changed-information premise and is not equivalent to the six scalar Class-5 summaries already closed negative.

## 7. Another partially unspent memo idea: gate quality as a misclassification problem

The Claude report argued against simply lowering rescue thresholds when a gate never fires. It proposed recording each predicate's truth state and treating `(gate fired/not fired, later outcome)` as a misclassification dataset, then replacing a bad proxy with one defined on a structurally different feature. One suggested example was obligation-reduction slope over a sliding work window rather than a generic frontier counter.

Later Pathfinder work did instrument individual near-closure predicates and used progress-conditioned lockouts, so part of this idea was absorbed. But repository searches do not show a clean general treatment of **action/gate value as a calibrated false-positive/false-negative problem** across current residual actions.

### Current relevance

This concept aligns with current WS2 better than the old rescue itself: before giving an action more work, ask whether its live progress observables have historically predicted eventual incremental value. The modern version should use canonical `workSpent`, current action identity, basin novelty/progress, and population-safe held-out evaluation rather than the old L92-specific counters.

## 8. External-memo claims that are now superseded or should stay dormant

Several old recommendations have since acquired stronger native evidence and should not be reopened on the memo's authority alone:

- broad backward/MM/BAE* search: modern frontier-size and exact-k evidence closes the simple forms;
- generic Luby/random restarts: current restart/continuation and high-budget evidence is much more relevant;
- browser CP/ASP escape hatch: not needed for the current research goal unless native acquisition is explicitly abandoned;
- learned per-level selector from the tiny 2026 published-level set: modern level-blind/current-run research has superseded that framing;
- unified HK as a general cure: implemented and shown to hit representational limits around interacting obligations;
- static scalar gate/heuristic retuning: current Class-5 evidence says changed information, not nearby weighted deficits.

## 9. Cross-era synthesis

The February state-cache bug and the May external memo unexpectedly point in the same direction from opposite ends:

- February: **too little state identity merges futures that are not equivalent**.
- May: **too little completion information makes many near-goal states look equally promising**.

That is the same representational question at two scales: what is the smallest information about path history and residual obligations that preserves a distinction in future completion value?

The modern answer should be sought empirically in exact-labelled residual states, not by restoring either old implementation.

## Smallest useful follow-ups

1. Keep the February coarse-equivalence failure as a permanent warning when evaluating any new compact Class-5 key.
2. Search current residuals for a true final-mile saturation phenotype before spending work on FOCAL/completable-state machinery.
3. Treat current action/gate observables as predictors of marginal continuation value and measure their false-positive/false-negative behavior before changing allocation.
4. Continue artifact archaeology for the deleted PDF/RTF through readable descendants and explicit citations; do not infer unseen content from filenames.
