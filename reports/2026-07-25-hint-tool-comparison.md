# Hint-discovery tool comparison (2026-07-25)

Investigation prompted by a request to verify all hint-discovery/enumeration/extraction/
diversification tools are current with the solver's latest techniques, then compare their
behavior head-to-head on a small sample of levels before eventually consolidating them into one
configurable tool.

## Tools covered

Five generation tools were in scope (pure-analysis tools — `hint-weight-calibration.mjs`,
`hint-expansion-audit.mjs` — were excluded, since they don't produce new hints):

1. `scripts/hint-corpus-expand.mjs` (`npm run hints:expand`) — randomized-restart enumeration
   (System A) + prefix-anchored completion (System B).
2. `scripts/hint-candidate-search.mjs` (`npm run hints:discover-candidates`) — a gate × direction
   × strategy-ablation-flag combinatorial grid, plus corner-flip mutations of existing hints.
3. `scripts/hint-diversification.mjs` / `modules/solver/diversification.ts`
   (`npm run hints:diversify`) — a 7-phase ablation cascade (baseline, per-flag ablations,
   strategy-group ablations, admissible-order tie-break profiles, …).
4. `scripts/hint-complete-enumeration-sharded.mjs` (`npm run hints:complete-sharded`) — sharded,
   parallel, budget-bounded exhaustive move-tree enumeration per gate.
5. `scripts/hint-workbench.mjs` (`npm run hints:workbench`) — unified preset-based orchestrator
   that composes steps from the other techniques (`enumerate-targeted`, `ablation-full`, …) behind
   one CLI surface, with `--policy=save-all|novelty-gated|audit-only`.

## Staleness audit and fixes (before comparison)

A background-agent audit found the tools were largely current but had drifted from
`admissible-order-search` (the last-resort solver tier added 2026-07-24). Fixes applied and
merged before running the comparison (PR #1299, #1300):

- Registered `STRATEGY_ADMISSIBLE_ORDER` in `scripts/ablation-config.mjs`'s `FEATURES` map (it was
  missing entirely, so it wasn't ablatable and didn't appear in `FEATURE_GROUPS.strategy`).
- `modules/solver/diversification.ts`'s `cascadeSteps`/`strategySteps` generators were missing
  `disableExtraBudgetPasses: true` on their `solverApi.solve(...)` calls — inconsistent with the
  isolation already applied to the sibling CLI tool (`hint-ablation-generator.ts`) the same day
  admissible-order-search was wired in. Fixed to match.
- Baseline-phase provenance in both `diversification.ts` and `hint-ablation-generator.ts` wasn't
  recording `admissibleOrder` on the winning attempt (only `profile`/`template`). Fixed.
- Drive-by: `hint-candidate-search.mjs`'s own default `--levels` value (`'145'`) would throw,
  since it uses `parseLevelPositions`, which always requires an explicit `pos:`/`id:` prefix.
  Fixed to `'pos:145'`.

**Structural gap, not fixed**: tools 1 and 4 use a separate move-tree walker
(`modules/solver/hint-enumeration.ts`'s `enumerateFromGate`/`anchoredFromSeed`/…) that has no
knowledge of `admissible-order-search` at all — not a flag omission, a different search engine
entirely. Extending that engine to use the production solver ladder (or to run
admissible-order-search as an explicit extra phase) is new integration work, out of scope for a
staleness pass, and is the most actionable finding for the eventual consolidated tool.

## Sample

Six levels, one high-hint-count / one low-hint-count pair from each of the three corpora, all
verified to have at least one genuinely cold (non-`hintGuided`) solve in their existing provenance
(i.e. not permanently-stuck stragglers):

| id | corpus | hints before | tier |
|---|---|---|---|
| P00160 | published | 490 | high |
| P00105 | published | 3 | low |
| R01219 | stress-corpus-1 | 350 | high |
| R01271 | stress-corpus-1 | 3 | low |
| R02073 | stress-corpus-2 | 573 | high |
| R00314 | stress-corpus-2 | 2 | low |

## Method

Each tool was run against each level with small, comparable, bounded budgets (100k–300k solver
nodes, 2–4s per-attempt time budgets, 60s wall-clock caps) under a 120s hard `timeout`, first in
read-only/dry-run mode to compare raw behavior, then in write-enabled mode wherever a run reported
finding something novel, to actually persist it. Exact invocations are in the scratchpad driver
script; not reproduced here since flags differ per tool.

## Results — read-only/dry-run comparison pass

| level (tier, hints) | expand | candidate-search | diversify | complete-sharded | workbench (audit) |
|---|---|---|---|---|---|
| P00160 (high, 490) | +1 | **timeout, no output** | +2 | +5 (not exhausted) | totalAccepted=0, wouldAccept=0 |
| P00105 (low, 3) | +0 (exhausted) | 97 attempts / 48 valid / 0 accepted (all already-known) | +0 | +0 (exhausted) | 0 |
| R01219 (high, 350) | +5 | **timeout, no output** | +5 | +0 (not exhausted) | wouldAccept=4 |
| R01271 (low, 3) | +0 (exhausted) | **timeout, no output** | +1 | +0 (not exhausted) | 0 |
| R02073 (high, 573) | +3 | **timeout, no output** | +6 | +0 (not exhausted) | 0 |
| R00314 (low, 2) | +5 | **timeout, no output** | +0 | +0 (not exhausted) | wouldAccept=4 |

No `admissibleOrder: true` provenance was observed anywhere in this sample — an honest null
result, not a bug: these six levels all solved via faster techniques (baseline/strategy DFS/beam),
so admissible-order-search's last-resort tier was never reached. It exists and is wired correctly
(verified separately in code); this sample simply didn't exercise it.

## Behavioral differences observed

- **`hint-candidate-search.mjs` has a real persistence gap.** It timed out with zero output on
  5 of 6 sample levels — including *low*-hint-count levels, which rules out "just a lot of
  duplicates to reject" as the sole explanation; its `gate × direction × strategy-flag` grid can
  apparently just be large relative to a short time budget. It has no incremental
  checkpointing — a run that doesn't finish within its budget produces nothing at all, violating
  the "any batch tool must persist between items, not just at the end" principle already
  established elsewhere in this codebase (see CLAUDE.md's batch-tool section). This is the
  clearest concrete fix candidate short of a full consolidation.
- **`hint-complete-enumeration-sharded.mjs` is the fastest by a wide margin** when it has anything
  to find — the P00160 run above returned 5 novel solutions in ~100ms of actual solve time (shards
  run in parallel, each cut off cleanly at its node budget). It reported `exhausted: false`
  honestly given the deliberately tiny 300k-node comparison budget; a production run would use a
  much larger or unbounded budget.
- **`hint-diversification.mjs`/workbench's `ablation-full` step is the only technique that
  systematically explores strategy-flag space** (per the 7-phase cascade), and it was the only
  tool that wrote real provenance-only merges (166 and 83 provenance entries respectively merged
  into already-known R01219/R00314 hints on the later write-pass) alongside genuinely novel paths
  — i.e. it independently rediscovers already-known solutions via different solver
  configurations, which is exactly the corpus's designed behavior (rediscovery appends a
  provenance entry rather than being silently dropped).
  **Note**: the read-only diversify pass in the table above ran with `--policy` defaults that
  auto-write (this tool has no dry-run flag), so its "dry-run" column above is actually the same
  write it performed live during the comparison batch — already reflected in the corpus.
- **`hint-corpus-expand.mjs`'s stochastic restarts are not reproducible run-to-run** without a
  fixed `--seed`: a second run on P00160 with the same flags found +0 novel where the first found
  +1. Any tool comparison or regression check using this tool should pin a seed.
- **`hint-workbench.mjs`'s audit mode (`--policy=audit-only`) correctly predicts what a write pass
  would find**, but the prediction can go stale between the audit run and the write run if other
  tools already wrote the same candidates in the meantime — this happened live in this exact
  session (see below).

## Write-enabled follow-up passes (saving novel finds)

Per "save any novel hints or provenance you find along the way," every dry-run/audit result that
reported something novel was re-run in write-enabled mode:

| level | expand (write) | complete-sharded (write) | workbench (write, `novelty-gated`) | total net new |
|---|---|---|---|---|
| P00160 | +0 (stochastic non-repro of the +1 dry-run find) | +5 | — | **+7** (490→497) |
| R01219 | +3 | — (already 0 in dry-run) | +0 (the 4 audit-mode candidates were already captured by the diversify/expand passes by the time this ran; 166 provenance entries merged into existing hints instead) | **+8** (350→358) |
| R02073 | +4 | — (already 0 in dry-run) | — | **+10** (573→583) |
| R00314 | +5 | — (already 0 in dry-run) | +4 (83 provenance entries also merged) | **+9** (2→11) |
| R01271 | — (exhausted, 0 in dry-run) | — | — | **+1** (from the diversify pass only; 3→4) |
| P00105 | — (exhausted) | — | — | **+0** (3→3; no tool found anything on this level) |

All new hints validated clean: `check:hint-validity` (12,517 stored hints, all valid under the
PLAY referee) and `test:hint-path-oracle` (160/160 levels passed) both ran green after the writes,
and `levels:generate-heatmaps` was re-run to keep the heatmap companion file in sync.

## Toward a consolidated tool

Observations most relevant to eventually merging these five into one configurable tool.
`hint-workbench.mjs` is already most of the way there — it's explicitly a preset-based
orchestrator that composes steps (`enumerate-targeted`, `ablation-full`, …), and its
`--policy=save-all|novelty-gated|audit-only` split is the right shape for a unified write policy.
The first version of this report proposed 4 concrete integration items; closer reading of the
actual engines (below) found 2 of the 4 were based on an incomplete picture. Corrected findings:

1. **`hint-corpus-expand.mjs`'s System A/B is *already* the exact engine behind workbench's
   `enumerate-targeted`/`enumerate-complete` steps — no bridging needed.** Both
   `modules/solver/variety-search.ts` (which backs those two workbench steps via
   `Solver.createVarietySearch`) and `hint-corpus-expand.mjs`'s hand-rolled loop call the *same*
   primitives (`enumerateFromGate`/`anchoredFromSeed` in `modules/solver/hint-enumeration.ts`)
   with matching defaults (restarts=24, seeds=12, nodeBudget=120000) and an identical
   prefix-anchor depth-sweep formula. The one capability `hint-corpus-expand.mjs` has that
   workbench genuinely lacks is `--parallel` (worker-thread parallelism *across levels*, not
   within one level's search) — but see point 2, the same structural reason blocks porting that
   into workbench too. Net: this integration item was already done before this investigation
   started; nothing to build.
2. **`hint-complete-enumeration-sharded.mjs` is *deliberately* kept as its own script, not an
   oversight.** Its own header comment explains why: sharded dispatch needs `worker_threads`,
   which requires the whole file to be structured as a self-spawning, `isMainThread`-gated worker
   pool (see `scripts/hint-corpus-expand.mjs`'s identical pattern) — retrofitting
   `hint-workbench.mjs`'s flat, single-script step model into that shape was already considered
   and rejected as riskier than keeping a small dedicated script. Forcing a merge here would fight
   a documented architecture decision, not fix a gap. **Recommendation: keep it separate.**
   Workbench's simple sequential `enumerate-complete` step remains the right tool for a quick
   per-level check; `hint-complete-enumeration-sharded.mjs` remains the right tool for genuinely
   exhaustive, resumable, worker-parallel runs. The same reasoning applies to
   `hint-corpus-expand.mjs`'s `--parallel` from point 1: it's real, useful, cross-level
   parallelism, but belongs in a worker-capable script, not folded into workbench's flat model.
3. **`modules/solver/hint-enumeration.ts` (the engine backing points 1 and 2) still has no
   awareness of `admissible-order-search`** — it's a separate randomized/deterministic move-tree
   walker, not a wrapper around the production `solveLevel()` ladder, so this isn't a missing flag
   but a different search paradigm entirely. Left as documented future research, not implemented
   here: extending or reordering that walker is solver-hot-path-adjacent work needing the same
   before/after full-corpus soundness and cost rigor CLAUDE.md requires for solver changes, and no
   level in this session's sample even exercised admissible-order-search, so there's no concrete
   regression case yet to validate against.
4. **Implemented, but its distinguishing value is narrower than first described here.**
   `hint-candidate-search.mjs`'s forced-first-step technique uses the exact same primitive
   (`prepLevel`→`createState`→`getNeighbors`) as `ablation-full`'s Phase A/B `enumerateDirections`
   — **not** a finer-grained "every real neighbor vs. just 4 cardinal directions" distinction as
   an earlier version of this report claimed; both force the identical set of first steps.
   `ablation-full` also already covers forced portal-exit-direction (Phase C/E) and the
   evidence-bounded combined forced-gate-direction × forced-portal-exit-direction cross product
   (Phase F/G), forward and gate/goal-swap-reversed — none of which `candidate-grid` (or the
   script it came from) does at all. What `candidate-grid` actually adds beyond `ablation-full` is
   two narrower things: an *unforced* strategy-flag sweep (no gate-direction forcing at all, which
   `ablation-full`'s strategy phase never runs standalone — it's always nested under a forced
   direction), and corner-flip mutation of existing hints. Both were still genuinely new
   capability, not duplicated by any existing workbench step, so implementing them was worthwhile
   — just on narrower grounds than originally stated. Added as a new `candidate-grid` step/preset
   in `hint-workbench.mjs` (usable via `--preset=candidate-grid` or `--include=candidate-grid,...`),
   reusing the exact same `Solver.solve`/`Solver.validateCandidatePath` primitives and routed
   through the same shared acceptance/provenance pipeline every other step already uses.
   - **Fixes the reliability gap this report's first pass found**: the step is bounded by
     `--wall-ms` (same convention `ablation-ui`/`ablation-full` already use), so it always returns
     within budget — combined with workbench's existing per-level persistence, an interrupted run
     no longer loses all its work like the standalone `hint-candidate-search.mjs` did.
   - **A second, related bound was needed and added during implementation**: corner-flip mutation
     of *every* existing hint doesn't itself cost solve time, but each mutation is still
     downstream-validated by the shared acceptance pipeline at real (non-trivial) cost, *outside*
     the step's own wall-clock deadline — on P00160 (492 hints at the time), generating
     unbounded corner-flip candidates from all of them made a 15s-budgeted run take 30+ seconds
     regardless. Fixed by sampling a bounded subset of existing hints for corner-flip (reusing the
     existing `--seeds` option, the same convention System B's prefix-anchor sampling already
     uses in `variety-search.ts`), rather than mutating every hint unconditionally.
   - Verified: `check:types`/`check:lint` clean, `npm run test:node` (all node validators) and
     `npm run test:hint-workbench` pass, and a live run against P00105 reproduces the exact
     `hint-candidate-search.mjs` finding from earlier in this report (48 valid-but-already-known
     candidates) — confirming the ported logic is faithful to the original.
   - Not yet done: `hint-candidate-search.mjs` itself was left in place (not deleted or marked
     deprecated) — retiring it in favor of the new step is a follow-up decision once the new step
     has some real production usage, not a same-session call.
