# PG-H deep all-DEAD branches: cheap triviality and bound audit

> **Status:** active
> **Last evidence:** 2026-10-16 — exact [run 39005597866](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39005597866) resolved 35/35 deep children DEAD across 16 groups; all raw prefixes were at depths 53–105.
> **Decision:** do not confuse a CP-SAT DEAD label with an unrecognized or expensive prune opportunity. First check whether a cheap single-state invariant or already-existing next-layer terminal test would reject each case.
> **Remaining gate:** decompose the 35 cases into directly terminal, simple lower-bound impossible, and genuinely unresolved-by-weak-bounds; then correlate with real post-state work/solver trace before proposing any prune.
> **Research question:** `WS2-SEMANTIC-FORCEDNESS`
> **Evidence role:** discovery
> **Selection:** the exact same 35 known-DEAD prefixes from completed PG-H-002, selected for calibration only. No held-out claims or threshold tuning.
> **Population identity:** CP-SAT run 39005597866; source Corpus-2 levels from current main; compare corpus source SHA against the completed source run.
> **Inference scope:** cheap deterministic opportunity/overlap analysis on development examples only; no new cold solves, proof of generic deadness recognition, or measured work saved.
> **Production effect:** none.

## Questions

1. How many of the 35 cases are already at the true goal with insufficient counted length, hence automatically terminal in normal beam search even if the preceding observation called them hard-prune survivors? Their CP-SAT DEAD label is *not* additional search capability.
2. How many have already overrun counted length? This should be zero if ordinary pruning worked, and any nonzero result signals a capture/coordinate/move-count disagreement.
3. How many fail an extremely optimistic static 0–1 goal distance, counting all cardinal steps as cost 1 and *all potential portal jumps as cost 0*, even allowing revisits and ignoring dynamic constraints? Such a bound is admissible but may be too weak to be useful.
4. For cases still unresolved by weak bounds, what are the exact remaining counted steps and the parent-expansion cost? Those are candidate **instrumentation opportunities**, not proof of a profitable prune.

The audit runs against the saved exact `cases.json` and current raw corpus. It is read-only and deterministic. Reconcile overlap with the current beam's `pos === goal` fast terminal check before counting new capability.
