# Hint-discovery tool comparison (2026-07-25)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-07 — standalone candidate-search retention reconciliation
> **Decision:** use the workbench as the consolidated default while retaining purpose-built parallel
> tools and the standalone candidate-search CLI until a parity/migration check supports removal
> **Remaining gate:** none; current limitations live in
> [`docs/hint-workbench.md`](../docs/hint-workbench.md#current-limitations)

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
   - **Retention resolved 2026-08-07:** `hint-candidate-search.mjs` remains a supported standalone
     entry point. The workbench port overlaps it but has not been proven equivalent for every
     documented use, so deletion would be cleanup by assumption rather than evidence. The canonical
     retention decision and reopening condition live in
     [`docs/hint-workbench.md`](../docs/hint-workbench.md#current-limitations).

## Follow-up: optimization pass (same day)

After the above landed, a second pass looked at making the consolidated workbench itself faster and
more thorough, without touching solver-hot-path code. Two low-risk items were implemented:

- **`full-practical-plus` preset** (`enumerate-targeted -> ablation-full -> candidate-grid`): since
  the accepted `pool` grows across steps within a level, ordering `candidate-grid` last means its
  corner-flip sampling also covers that run's own new finds, not just hints that existed before the
  run started — previously true only if you composed steps manually via `--include`.
- **`scripts/hint-workbench-parallel.mjs`** (`npm run hints:workbench-parallel`): cross-level
  parallelism via separate child *processes* (round-robin `--levels` partitioning), not in-process
  `worker_threads` — sidesteps the exact structural constraint that keeps `complete-sharded`'s
  within-level sharding a separate script (see point 2 above). Required a small refactor of
  `scripts/run-bundled.mjs` (exporting its `buildBundle()` step, gated behind an
  `import.meta.url` entrypoint check so the existing CLI behavior for its other ~27 callers is
  unchanged) so N children bundle `hint-workbench.mjs` once instead of racing to `esbuild.buildSync`
  the same output file concurrently. `--write-patch` needed explicit per-shard handling (a shared
  patch path would let the last-finishing shard silently overwrite every earlier shard's patch,
  losing their accepted candidates) — each shard gets its own patch path, merged afterward.
  **Verified empirically, not just by re-deriving `writeLevelsWithHints`'s own safety comment**: a
  real 3-shard, 6-level `--write-levels` run against `data/levels.json` was hash-checked before and
  after — exactly the 5 touched levels' hint files changed, `data/levels.json` and 4 untouched
  control levels' hint files were byte-identical, and `check:hint-validity`/`test:hint-path-oracle`
  passed clean afterward.
- A third item from the original 3-item recommendation — a bounded (not evidence-only, not the
  rejected unbounded `--combined=full`) portal-exit-forcing mode — was deliberately **not**
  attempted in this pass: it's the one idea here that's genuinely solver-adjacent cost/correctness
  risk, not pure plumbing, and deserves its own dedicated pass with full-corpus verification.

## Follow-up: portal-grid step (same day)

Reconsidered the deferred item above: the actual solver machinery it needs
(`forcedFirstStepKey`/`forcedPortalExitKey` solve options) already exists and is already exercised
heavily by `ablation-full`'s Phase C/E/F/G — this doesn't touch `solveLevel()`'s internals or its
production default behavior at all, it only calls the same options with a different (wider, still
hard-capped) loop structure. The actual risk is combinatorial cost, not solver correctness, so it
didn't need full-corpus regression rigor — just careful bounding and live verification, the same
bar already applied to `candidate-grid`.

**Implemented**: a new `portal-grid` step/preset — every gate-direction crossed with every
portal-destination x exit-direction combo (one plain solve each, no cascade/strategy sweep, unlike
Phase F/G), hard-capped by **both** `--max-combos` (default 500) and `--wall-ms`, opt-in only (no
other preset includes it). Verified: a `--max-combos=5` run stopped at exactly 5 combos;
a portal-less level short-circuits in single-digit milliseconds; a full run against P00043 (2
portal destinations, 1 gate) exhausted all 48 combos in ~2s with 0 novel finds (already
well-covered by its 105 existing hints — an honest null result, not a bug).

**Found and fixed a real bug while stress-testing at a larger combo scale**: against S00103 (4
gates, 2 portals/4 destinations), the step averaged ~4.1s per combo against an 800ms nominal
`--attempt-budget-ms` — only 10 of a possible large combo space completed before the 40s wall
clock cut it off. Root cause: `solveGridAttempt` (shared by both `candidate-grid` and
`portal-grid`) was calling `Solver.solve()` without `disableExtraBudgetPasses: true`, so each
individual probe could silently balloon to the full `(1 + 6 + 1 + N) x timeBudgetMs` worst case
(repair fallback / attraction-diversity / admissible-order-search's extra-budget tiers — see
CLAUDE.md's solver-architecture gotcha on this) — exactly the failure mode
`hint-ablation-generator.ts`'s `runCascade`/`runStrategyPhase` already guard against for the
identical reason. This was inherited unfixed from `hint-candidate-search.mjs`'s own `solveAttempt`
helper when `candidate-grid` was ported from it earlier the same day — that staleness pass fixed
`diversification.ts`/`hint-ablation-generator.ts`'s missing `disableExtraBudgetPasses` but didn't
touch `hint-candidate-search.mjs`, since at the time nothing in this codebase had yet ported its
technique into a context where the omission mattered at scale. Fixed in both
`solveGridAttempt` (`hint-workbench.mjs`) and `hint-candidate-search.mjs`'s own `solveAttempt`, so
the standalone script gets the same fix. **Verified the fix's effect empirically**: re-running the
identical S00103 case afterward completed 210 combos (fully exhausted) in 15s — about a 20x
combos-per-second improvement — and a `candidate-grid` re-run on P00105 dropped from 26.3s to
12.3s for the identical `produced=75` result (same candidates found, just faster).

## Follow-up: admissible-order-search awareness in hint-enumeration.ts (same day)

The last remaining item from this report's original findings: `modules/solver/hint-enumeration.ts`
(the engine backing `enumerate-targeted`/`enumerate-complete`, `hint-corpus-expand.mjs`, and
`hint-complete-enumeration-sharded.mjs`) is a separate move-tree walker with no knowledge of
`admissible-order-search`, the production solver's last-resort ordering tier. This section is the
full writeup of implementing it — including a real dead end the investigation walked into and
recovered from, which is exactly the kind of thing worth recording rather than silently fixing.

**The naive approach (reuse the ranking alone) is actively counterproductive, not just
ineffective.** `admissible-order-search.ts`'s `rankByAdmissibleSlack` (child ordering by ascending
admissible slack — least room to spare first) was exported and wired into `completeFromState`'s
existing child-ordering hook as a new `orderBy: 'admissible-slack'` option, reusing
`completeFromState`'s existing weak pruning (over-length/over-intersection/goal-distance only)
unchanged. Live-tested against a constructed must-pass level (7×7 grid, gate/goal on one row, a
must-pass cell off-route forcing a real detour): **admissible-slack ordering found ZERO solutions
in 12,800 nodes on a level a fixed-seed random restart solves within 50 nodes**, despite reaching
the identical exhaustive solution set (3675 solutions) as random/default ordering when run
unbounded — so it wasn't broken, just badly counterproductive under any realistic budget.

**Root cause, found by tracing the actual ranked order at the very first move**: `rankByAdmissibleSlack`
correctly computes slack (`remaining steps − tightest admissible bound`) using the *full*
must-pass-aware bound, but at the very first step from the gate it ranked a branch with **negative**
slack (`-2`, i.e. already provably dead per that bound) *ahead of* two branches with slack `0`
(still exactly on budget) — `Array.prototype.sort`'s ascending order puts the most-negative value
first, the opposite of "try the least-doomed branch first." In `rankByAdmissibleSlack`'s actual
production home (`admissibleOrderSearch`), this is harmless: that function pairs the ranking with
`evaluatePrunedMove`'s full gauntlet on *every* move, so a doomed branch gets rejected in O(1)
regardless of where it sits in the explored order — the misordering costs nothing. But
`completeFromState`'s weak pruning has no must-pass-lower-bound check at all, so it doesn't reject
that branch quickly — it commits to and explores deep into a branch the ranking itself already
proved was dead, burning the entire node budget on it before ever trying a live branch. The
ranking and its matching pruning strength are not separable; reusing one without the other silently
defeats the purpose. (No change was made to `rankByAdmissibleSlack`'s own sort behavior — it's
correct in its actual paired context, and touching a function used by the production solver's live
last-resort tier would need full-corpus regression rigor for a change that, by this analysis,
wouldn't even be a fix there.)

**Fix: make `orderBy: 'admissible-slack'` a package deal — ranking AND the full admissible pruning
gauntlet (`evaluatePrunedMove`) together, not ranking alone.** `completeFromState` now branches: the
default path is untouched byte-for-byte; the new opt-in path additionally swaps in
`evaluatePrunedMove` (must-pass/must-cross/surround/adjTurn lower bounds, parity, connectivity —
every check individually admissible, so swapping it in can only prune *more*, never differently,
preserving the exact same complete solution set for an unbounded run — same reasoning
`evaluatePrunedMove`'s own file doc already establishes). Kept strictly opt-in rather than applied
to the default path too, since `completeFromState`'s default pruning is relied on by the in-editor
"Solve" button (a real, player-facing production path via `variety-search.ts`) that this change must
not alter even in a can-only-help direction without the full corpus-timing verification a change
to that path would need — this option's blast radius is contained to callers that explicitly opt in.

**Re-verified after the fix, same test level**: exhaustive node count dropped from 903,146 (default
weak pruning) to 35,154 (admissible-slack + full gauntlet) — **~25.7x fewer nodes for the identical
3,675-solution set** (set-equality asserted, not just count). Under a 100-node budget, the same
fixed-seed random restart that finds 0 solutions now sits alongside admissible-slack finding
10 — the exact scenario the naive version failed at, now working as intended.

**Implemented**: `EnumOptions.orderBy`/`tieBreakProfile` (`hint-enumeration.ts`), threaded through
`VarietySearchConfig` (`variety-search.ts`, which also auto-caps `--restarts` to 1 under this mode
— admissible-slack ordering never reads the RNG, so repeat restarts are provably pure waste), and
exposed via `hint-workbench.mjs`'s `--enum-order=admissible-slack`/`--enum-tie-break=true` on the
`enumerate-targeted`/`enumerate-complete` steps. 6 new unit tests added across
`hint-enumeration.test.ts` (soundness at exhaustion, tie-break-profile soundness, the tight-budget
win with hardcoded verified numbers, default-path byte-for-byte non-regression) and
`variety-search.test.ts` (threading, the restarts-capping doesn't hang/error). All existing tests
continue to pass unmodified — the new path is reached only when a caller explicitly requests it.

**Honest caveat, stated in `docs/hint-workbench.md` too**: this is validated on one constructed
must-pass test level, not a full-corpus A/B — a genuinely useful next step for whoever picks this
up next would be running `enumerate-targeted` with and without `--enum-order=admissible-slack`
across the published/stress corpora's tightest levels, the same way `admissible-order-search`'s own
production validation was done. The mechanism is provably sound (same solution set either way) and
the constructed-level numbers are real and dramatic, but "helps on this specific must-pass
scenario" is not yet the same claim as "helps broadly across the real corpus."

## Follow-up: was any of this applicable to the solver itself? (same day)

Asked directly after the above landed. Short answer: no — both pieces (`rankByAdmissibleSlack`'s
ordering, `evaluatePrunedMove`'s full gauntlet) already exist in the production solver and are
already correctly paired everywhere they run (`dfsFromGate`, beam search, repair search, and
`admissible-order-search.ts` itself all use the full gauntlet unconditionally; there is no "weak
pruning" mode anywhere in `solveLevel()`'s own path to strengthen). The 25.7x number earlier in
this report is `hint-enumeration.ts` catching up to a technique the solver already had, not a
discovery about the solver. But three concrete, narrower follow-ups from that answer were worth
doing and are now done:

1. **`hint-corpus-expand.mjs`** (System A/B's standalone CLI) gained the same
   `--enum-order=admissible-slack`/`--enum-tie-break=true` flags, threaded into both its generators
   and its `restarts` auto-cap (same reasoning as `variety-search.ts`). Verified live in both
   sequential and `--parallel` (worker-thread) modes — the config is passed wholesale via
   `workerData`, so no extra plumbing was needed for workers to pick it up.
2. **`hint-complete-enumeration-sharded.mjs`** gained the same flags, threaded through `runJob`
   (shared by the sequential and worker-message-handler paths) and the worker `postMessage`
   payload. This tool's entire job is exhaustive enumeration, so the pruning half of the package
   deal matters even more here than ordering does — the stronger gauntlet reduces the *total* nodes
   needed to fully exhaust a shard, not just how fast a first solution turns up. **Verified on a
   real published level, not a constructed one**: `P00105` (3 solutions across 2 shards) went from
   353,444 total nodes (default) to 28,294 (admissible-slack) — a **~12.5x reduction**, both runs
   fully `EXHAUSTIVE` and finding the identical 3 solutions. Also verified the tool's own
   determinism/byte-stability guarantee (shard results identical between `--parallel=1` and
   `--parallel=2`) holds unaffected by the new flag — same node counts (1,326 / 26,968) either way.
3. **`rankByAdmissibleSlack`'s sort-order bug** (found during the original investigation, left
   unfixed there since it's production code) — fixed. Negative-finite-slack (already-dead)
   candidates now correctly sort *after* every live candidate instead of before, matching the
   function's own pre-existing doc comment. Provably safe either way for correctness
   (`evaluatePrunedMove` is still the sole source of rejection truth regardless of ranking), and
   provably no-worse for cost (the old order wasted exactly one node-budget unit trying an
   already-doomed candidate before ever reaching a live one, per shard-tree node). Added a
   hand-verified unit test (`admissible-order-search.test.ts`) using real bound math on a must-pass
   level, not a synthetic mock. **Ran `npm run solver:bench -- --check` since this touches the
   production `admissible-order-search` last-resort tier**: no regressions (160/160 solved,
   consistent across every run).
   **Correction from an earlier draft of this entry**: the first `--check` run reported the fix as
   "-5.5% wall time, -26.8% nodes" — that number was compared against `logs/solver-baseline.json`
   as it stood before this work (commit `ae7a6dc`, 2026-07-18), which predates several other rounds
   of solver work landed since then (including `admissible-order-search`'s own original addition on
   2026-07-24) — so that delta was never attributable to this one fix, only to the codebase's
   overall progress since a stale baseline. To isolate the fix's own effect, the same 160-level
   corpus was run twice with the fix and twice without it (via `git stash` on just this file), same
   current codebase otherwise: **38.14M-38.43M nodes without the fix, 38.25M-38.66M nodes with
   it — the two ranges overlap**, meaning this solver's known run-to-run variance (wall-clock-gated
   technique racing — see `docs/solver-determinism/determinism-report.md`) is comparable to or
   larger than any signal from this fix at full-corpus scale. Honest conclusion: the fix is
   *provably* never-worse for node count (the O(1)-reject argument above holds regardless of
   measurement noise), but its own full-corpus magnitude isn't reliably distinguishable from noise
   in this comparison — consistent with `admissible-order-search` being a rarely-decisive
   last-resort tier for most of the published corpus. `logs/solver-baseline.json` was refreshed
   (`--update-baseline`) since it was stale regardless of this fix's own contribution, so future
   `--check` runs compare against current performance rather than the 2026-07-18 snapshot.

All three verified with `check:types`/`check:lint`, the relevant unit test files, `npx vitest run
modules/solver/` (259 tests, all passing), and live CLI runs against real levels.

## Follow-up: is persisted provenance actually complete and specific, including for its own
## configuration? (same day)

Asked directly. The honest answer, before this pass: no — found and fixed two real gaps, both the
same underlying mistake (a config detail captured in an *intermediate* object that nothing
downstream ever reads back out, so it's silently dropped before ever reaching the persisted
`HintProvenanceEntry` in `data/hints/<id>.json`).

**Gap 1 — `orderBy`/`tieBreakProfile` never reached persisted provenance at all.** The
`--enum-order=admissible-slack` work above threaded the option all the way into
`Solver.createVarietySearch`'s config and confirmed it changed *behavior* correctly, but never
wired it into what actually gets written to disk — a hint found via admissible-slack ordering was
byte-identical, in its permanent stored provenance, to one found via plain random order. Root cause
traced precisely: `hint-workbench.mjs`'s `runEnumeration` builds a rich `event.provenance` object
(mode, seed, nodeBudget, restarts, …) for the audit *report*, but the function that actually builds
the persisted `HintProvenanceEntry` (`hintProvenanceEntryForEvent`) never reads that object — it
reads a small set of named top-level fields on the candidate event instead
(`.technique`/`.profile`/`.nodesExpanded`/…), and `orderBy` was never one of them.

**Gap 2 — the earlier `admissibleOrder: winner?.admissibleOrder ?? false` fix (from the same-day
staleness pass, before any of this session's later work) was itself incomplete for the identical
reason.** It added the field to the object passed into `hint-ablation-generator.ts`/
`diversification.ts`'s baseline-phase `consider()` call, but `candidateEventFromDiscovery` (the
function that actually builds the persisted event from that object) only reads `.profile`/
`.template`/`.gateKey`/etc. — never `.admissibleOrder` — so it was silently dropped there too. An
admissible-order-search baseline win has been indistinguishable from an ordinary default-profile
DFS/beam win in every hint discovered by these two generators since that fix "landed," the entire
time it was believed fixed.

**Fix, both cases: follow this codebase's own established convention instead of adding a new
field.** `HintSolverProvenance.technique`'s own doc comment in `hint-types.ts` already documents
the pattern for exactly this situation — `'admissible-order'` pairs with `profile` meaning the
tie-break profile, not a separate boolean, and `'ablation-full:<phase>'`'s colon-suffix already
distinguishes ablation sub-phases the same way. Applied consistently:
- `variety-search.ts`: `technique` gets a `:admissible-slack` suffix (e.g.
  `'enumerate-targeted:admissible-slack'`) and a new `profile: 'flat'` (not a `POLICY_PROFILES`
  name — named distinctly so it can't be confused with `POLICY_PROFILES.default`, a differently-
  tuned profile) when a tie-break was applied. Threaded through `hint-workbench.mjs`,
  `hint-corpus-expand.mjs` (its own separate technique-tracking code path, fixed the same way), and
  `hint-complete-enumeration-sharded.mjs` (a single technique string per level's merged results,
  same suffix approach).
- `hint-ablation-generator.ts`/`diversification.ts`: the baseline-phase `phase` value becomes
  `'baseline-admissible-order'` instead of plain `'baseline'` when `winner?.admissibleOrder` is
  true, producing `'ablation-full:baseline-admissible-order'` / `'ablation-ui:baseline-admissible-
  order'` — the dead `admissibleOrder` field removed from both (nothing ever read it; keeping it
  would misleadingly imply it did something).
- **A real regression this fix could have introduced, caught before it shipped**: two exact-string
  `hintGuided: technique === 'prefix-anchored'` checks (in `hint-workbench.mjs` and
  `hint-corpus-expand.mjs`) would have silently stopped recognizing hint-guided finds the moment
  the suffix was added, since the string is no longer exactly `'prefix-anchored'` under
  admissible-slack mode. Changed to `.startsWith('prefix-anchored')` at both sites.

**Verified past the unit-test level, all the way to the actual bytes on disk**: a live
`hint-workbench.mjs` run (`--enum-order=admissible-slack --enum-tie-break=true`) against a real
published level, written to a `--write-patch` file (not the real corpus) and inspected directly —
the persisted `HintProvenanceEntry.solver.technique` reads `"enumerate-complete:admissible-slack"`
with `profile: "flat"`, not the generic `"enumerate-complete"` a plain-order find would show. New
unit tests in `variety-search.test.ts` (technique suffix/profile under admissible-slack vs. the
byte-for-byte-unaffected default path), `hint-ablation-generator.test.ts`, and
`diversification.test.ts` (both using a mock `solverApi` to force an `admissibleOrder: true`
winner, since the real solver only reaches that tier on levels everything else already fails —
not practical to trigger on demand, and not what these tests are actually verifying) all pass.
`npx vitest run modules/solver/ modules/domain/` (584 tests) and full `npm run ci` both pass clean,
aside from the same pre-existing sandbox-CPU-throttling flake from earlier in this session.
