# Solver batch-run speed + hint provenance improvements (2026-07-23)

> **Status:** concluded-positive
> **Last evidence:** 2026-08-07 — remaining-work reconciliation against the later hot-path,
> classifier, and corpus-refresh results
> **Decision:** keep the shipped batch/provenance improvements, but do not use the deprecated
> `--baseline-budget` experiment as a regression gate
> **Remaining gate:** none; deferred solver work is tracked in
> [`docs/future-work.md`](../docs/future-work.md)

Session scope: the user asked for ideas on speeding up backend/batch solver testing (the real
pain point: running the solver across hundreds–thousands of levels at 30+ s/level during
solver-development iteration), which led into a parallel thread on hint provenance — what it can
and can't currently answer about solver technique performance, and closing the gaps found along
the way. This report is the single narrative for both; it exists so the next session (or the next
person) doesn't have to reconstruct the reasoning from commit messages alone.

**Status flag used throughout**: ✅ shipped and validated · 🟡 shipped, not yet fully validated ·
⏳ investigated but not built · 💡 idea only, not investigated · ❌ tried and reverted.

Commits, in order: `d5b9819` → `345866d` → `38616c1` → `2ed0987` → `e35a568` → `5954ea2` →
`2c797d5` → `eadfadc` → `1042274` → `72daecc` → `8cae5ae` → (revert of `eadfadc`, see Part A) →
(wired `--baseline-budget`/`--prime-winner` into `solver-stress-refresh.yml`) → (`--baseline-budget`
reverted from that workflow after a real corpus-scale regression, see Part A), all on
`claude/search-stagnation-escape-plan-9682e4`.

---

## Part A — Batch-run speed

### The data that motivated everything below

Compiled from `logs/stress-corpus2-baseline.json` before any of this work started:

- **94% of corpus-2 batch wall time is failed levels.** 1112 failed levels burn ~264s p50 each
  (~88 hours corpus-wide) vs. **20,688s total** across all 503 solved levels.
- **Winners are cheap.** The winning attempt is p50 **68K nodes**; 85% of solved levels win in
  ≤5M nodes. A flat `--node-budget` exists only to give the *hardest* levels headroom — most
  levels are handed budget they never spend.
- **84% of the work on solved levels is non-winning configs tried before the winner.** 9.1B of
  10.8B total nodes across solved levels.

Every optimization below targets one of these three facts directly.

### ❌ Adaptive per-level node budgets (`--baseline-budget`, `d5b9819`) — reverted 2026-07-23, real corpus-scale regression

`portfolio-solve-sweep.mjs` previously applied one flat `--node-budget` to every level in a run.
`--baseline-budget` scales each level's cap to its own baseline-recorded cost instead:

- Known-solved level → `max(--min-node-budget [2M], --solved-budget-mult [3] × its own baseline
  nodesExpanded)`.
- Known-failed / not-in-baseline → `--unsolved-node-budget` (defaults to the flat `--node-budget`,
  i.e. net-neutral; drop it low for a fast "did I break anything" pass, raise it to keep
  discovering new solves).

**Measured on a 4-level mixed sample** (solved set identical throughout): 87.4M → 44.2M nodes,
63.3s → 37.5s — this looked like a clean win and the feature was marked ✅ shipped on that basis.

**It wasn't.** The first full-corpus-scale exercise of this flag — `solver-stress-refresh.yml`'s
2026-07-23 run, wired up the same day — dropped stress-corpus-2 from 503/1700 to 473/1700 solved
(45 regressions, only 1 new solve to offset them; corpus-1 showed the same pattern in miniature, 1
regressed/1 newly solved). Traced to a real soundness gap, not noise: **`R00001`** was originally
solved via `repair` (`winningConfig: "dfs:repair:repair"`, no recorded seed — this baseline
predates the seed-persistence fix, see below). `--baseline-budget` capped its total node budget at
exactly `3 × 2,073,211 = 6,219,633` — and the after-run's failure hit that exact number
(`nodesExpanded: 6219633`, `status: "node-budget-reached"`), having burned all 3 of its capped
attempts on **three different cold random seeds** (`4011114730`, `1898166619`, `4011114730` again
with `repairMustTurnBiased`), never reproducing the original lucky solve. `--prime-winner` behaved
correctly and did no harm here (its own attempts show no prime was even attempted — it already
self-gates away from exactly this case, no seed to replay), which isolates the defect to
`--baseline-budget` alone: **its core assumption — "a deterministic re-solve hits exactly
baseline-nodes and exits early" — is false for a repair-search winner recorded without a seed**,
since repair tries a fresh random seed cold each time and its node cost genuinely varies run to
run. Capping at 3× one historical lucky sample is frequently too tight for exactly this
subpopulation, which is a large fraction of the corpus (repair is ~35% of winners per the
prime-winner measurement below).

**Reverted from `solver-stress-refresh.yml`** the same day (`--prime-winner` kept, `--baseline`
kept since prime-winner still needs it). The 4-level validation sample that originally cleared
this simply didn't happen to contain a seedless-repair-winner case — a real gap in "small sample,
iterate loose" for a mechanism whose failure mode is specifically about a subpopulation, not the
average case. **A future re-attempt needs the same self-gating `--prime-winner` already has**: skip
the adaptive cap (fall back to the flat `--node-budget`) for any level whose baseline winner is a
repair attempt without a recorded seed, rather than applying one blanket multiplier to every
known-solved level regardless of whether its win is actually replayable.

### ✅ Mid-search node-budget enforcement (`345866d`)

The bug this fixes: the main beam/DFS attempt loop only checked the node budget *between*
attempts — one long attempt could blow tens of millions of nodes past a much smaller cap before
the check ever ran again. Threaded the cumulative-remaining budget into `beamSearchFromGate`,
`dfsFromGateLDS`, and the two main-loop `runAttempt` call sites (mirroring how the repair
probe/fallback already self-limited). **Provably inert for production**: `nodeBudget` is
offline-tooling-only and defaults to `Infinity`, under which every new check reduces to a no-op —
confirmed via `solver:bench --check` (160/160, no regressions) both at the time and in every
subsequent full-CI run this session.

**Measured**, combined with the adaptive budgets above: a level that previously overshot a 3M-node
cap to 40.9M nodes/30s now stops at 3,000,157 nodes/2.4s — **5.8× faster wall time, 14× fewer
nodes** on the same mixed sample, same solved set.

### ✅ Winner-first pre-attempt (`--prime-winner`, `e35a568` + `2c797d5`)

Attacks the "84% of solved-level work is non-winning configs" fact directly: for each level the
baseline recorded as solved, replay exactly the recorded winning `(gateKey, configKey)` as a single
attempt before the normal ladder. A hit skips every non-winning config the ladder would otherwise
try first. `SolveOpts.primeAttempt` is the new mechanism (`orchestration.ts`); gated on the field
being set, so production is untouched.

**The measurement reshaped the feature**, which is the actually interesting part — attempts are
not independent the way "replay the winner" naively assumes:

| Winner kind | Share of solved corpus | Measured hit rate | Why |
|---|---|---|---|
| Normal beam/DFS | 58% | **8/8** | Cold replay reproduces the solve deterministically |
| Repair (no recorded seed) | 35% | 3/6 | Repair is an iterated local search seeded per `(gate, seedSalt)`; a salt-0 replay only sometimes matches, and a miss is expensive |
| Attraction-diversity | 7% | 0/4 | Only solves with `SCORE_GOAL_ATTRACTION` disabled, which a plain replay can't reproduce |

`--prime-winner` therefore defaults to priming **normal-scoring winners** (100% hit, zero miss
tax) plus, after the seed-threading fix below, **repair winners with a known seed whose own
`elapsedMs` fits the run's budget** — a second, non-obvious gate: replaying with the exact correct
seed *still* missed on 2 of 6 samples, traced to the winner's own `elapsedMs` (84.8s, 57.3s)
exceeding the 30s budget the prime replay was given — repair genuinely needs wall-clock/iteration
budget to converge even at the right seed. `--prime-include-all` opts into every winner kind for
experiments, accepting the lower hit rate.

**Two real, silent telemetry bugs were found and fixed while chasing this** (not part of the
original plan — found by grounding a hypothesis in code rather than assuming the needed data
existed):
1. `attemptRecord()` (`portfolio-solve-sweep-lib.mjs`) computed but never persisted
   `randomSeed`/`seedSalt` — no baseline had ever recorded which seed a repair winner used, which
   is exactly the data `--prime-winner`'s seed-aware path needs. Fixed (`5954ea2`); the *current*
   `stress-corpus2-baseline.json` still predates the fix and has zero seed-carrying repair
   records, so the seed-aware repair path is correctly inert against it today (⏳ **needs a fresh
   corpus-2 baseline refresh to start paying off** — see Remaining Work).
2. `attemptConfigKey()`'s sweep-lib copy checked `repairMustTurnBiased` for the `(...)` key suffix
   but silently omitted `repairTurnBiased` entirely — a turn-biased repair winner's persisted
   `winningConfig` lost its `(turnBiased)` marker, which would make any config-key lookup against
   it (this feature or any future one) match the wrong config. Fixed with a regression test.

### 🟡 CPU-profiling the hot loop → `scoreMove` hoist (✅ shipped) + beam connectivity throttle (❌ reverted, see below)

Built a small profiling harness (`node --cpu-prof` against the actual esbuild bundle — `tsx` is
independently known to run the hot path ~5× slower and would misrepresent proportions) and
profiled two representative samples (a beam-heavy 27M-node published+corpus-2 mix, and a
repair-heavy 139M-node corpus-2 sample). Findings:

- **`scoreMove` is the single largest self-time consumer in both samples** (9.2% beam-heavy,
  22.6% repair-heavy). Root cause: it re-resolved all 12 `profile.<field> ?? 1` weight values on
  *every call*, even though `profile` is a fixed reference for the whole search attempt.
  **✅ Fixed and shipped (`1042274`)**: extended the existing `CurUrgencyContext` (already built
  once per candidate-batch and reused across up to 4 siblings, proven at all 3 real call sites —
  DFS, beam, repair) to also carry pre-resolved weights. Pure caching change, bit-identical output
  — confirmed via `scoring.test.ts`'s exact-score-value assertions and the full 233-test solver
  suite, unchanged. **Not yet independently speed-measured post-CI** (its own before/after profile
  run was queued behind the beam-throttle validation and got deprioritized once that turned out to
  need a full redo — see Remaining Work).
- **`_floodFillReachability` (the connectivity/volume prune) is 20% of all solver CPU time in the
  beam-heavy sample**, second only to `beamSearchFromGate` itself — a volume-of-calls cost, not an
  implementation-quality one (the function itself is already tight: typed arrays, generation
  counters, no per-call allocation). Traced to beam's connectivity-check throttle being
  structurally wider than DFS's: `rSteps <= 20 || (realLen & 7) === 0`, evaluated per-candidate
  across a whole multi-node frontier, vs. DFS's `rSteps <= 10 || (nodesExpanded & 63) === 0`,
  gated by a single global counter. No comment anywhere ever justified beam's wider window (indeed
  `repair-search.ts`'s identical check explicitly documents itself as mirroring DFS's `10`, not
  beam's `20`) — so this was tried as `eadfadc`: `rSteps <= 20` → `rSteps <= 10`.
  **❌ Status: invalidated and reverted.** The first corpus-1 A/B was run incorrectly (see the
  cautionary-tale callout below) and had to be redone from scratch: `search.ts` temporarily reverted
  to a genuine pre-change state, a clean uncontended "TRUE-before" run taken (96/102 solved: 6
  timeouts — R00581, R01195, R01407, R01620, R01675, R01875), then restored to the `eadfadc` state
  and a matching clean "TRUE-after" run taken (94/102 solved: the same 6 timeouts **plus two new
  ones**, R01014 and R01271). Total wall time was also *higher* after (1482s vs. 1457s), driven by
  the two extra full-budget timeouts — no offsetting speed win to weigh against the loss. This is a
  real, reproducible regression, not contention noise (R01014's earlier appearance in the botched
  first A/B was a correct signal after all, just for the wrong reason at the time). Reverted back to
  `rSteps <= 20` with the profiling rationale kept as a comment for whoever revisits this — the
  underlying cost (`_floodFillReachability` at ~20% of beam-heavy CPU time) is still real and still
  worth attacking, just not via this particular throttle knob. A next attempt should look at *why*
  beam's wider window matters for these two levels specifically (are they beam-heavy, near-Hamiltonian,
  timing out only in the tightened-connectivity variant?) before trying a blanket narrowing again.

> **Cautionary tale, told against ourselves**: the first corpus-1 "before" run for this change was
> launched *after* the `search.ts` edit was already sitting in the working tree — `run-bundled.mjs`
> bundles from on-disk content at invocation time, not from a git ref, so "before" and "after" both
> silently tested the *same* code. Combined with a concurrent, unrelated background script eating
> CPU on a 4-core box during part of the "after" run, this produced what looked like a real
> regression (one level, R01014, solved in one run but not the other) that was almost certainly
> pure timing noise, not a code effect. Caught only by noticing the timeline didn't add up and
> re-deriving it from the actual command history. The fix in progress: temporarily revert just the
> one changed line, run a genuinely clean "before" with nothing else running, restore, run a
> genuinely clean "after," then compare. This is exactly why the "batch runs should default to fast/
> efficient configuration" and "report progress between levels" principles below exist as *written*
> policy now, not just something everyone is assumed to already do carefully.

---

## Part B — Hint provenance

### The gap that started this half of the session

Investigating whether `repairMustTurnBiasedAttempt`'s risk-gated last-in-ladder placement
(`attempts.ts`) is overly conservative (see Remaining Work below) led to asking "how often does
the biased variant actually win, historically?" — and hint provenance couldn't answer it. Checked
directly against `S00030` (the one documented regression case for that exact attempt): every
stored provenance entry only ever recorded `technique: 'stress-generator-witness'` or
`'prefix-anchored'` — no trace of which *internal solver attempt config* won a cold solve at all.
`deriveSolveAttemptInfo` (`hint-provenance.ts`) collapsed every repair winner — plain,
must-turn-biased, or turn-biased — down to the same flat string `'repair'`.

### ✅ Fixed: which repair variant won (`72daecc`)

`HintSolverForcing` (`domain/hint-types.ts`) gains `repairMustTurnBiased`/`repairTurnBiased`:
`false` (not `null`) when the winner was a repair attempt but not the biased one; `null` only when
the winning technique has no such concept at all (dfs/beam/enumerate-family/witness/
prefix-anchored/human-player). Threaded through the two shared functions every real caller already
goes through (`deriveSolveAttemptInfo`, `provenanceFromSolveResult`), so `review-controller.ts` and
`portfolio-solve-sweep.mjs` both pick it up automatically. `hint-workbench.mjs`'s own discovery
techniques (enumerate-family, prefix-anchored) never route through the repair ladder and correctly
have no such concept to capture.

### ✅ Fixed: the rest of "which internal config actually won" (`8cae5ae`)

Same shape of gap, closed for everything else that was invisible:

- **`beamWidth`/`diverseBeam`/`gateKey`** — new siblings of the existing `profile`/`template` on
  `HintSolverProvenance` ("which config won" facts, not forcing/override concepts).
  `gateKey` here is deliberately distinct from `HintSolverForcing.gateKey`, which means "a
  technique deliberately pinned this gate on purpose" (ablation/diversification phases) — the new
  field means "this is just which gate the solver's free choice happened to land on."
- **`seedSalt`** — new sibling of `randomSeed` on `HintSearchProvenance`. `randomSeed` is the
  *derived* PRNG seed (`repairPrimarySeed(gateKey, seedSalt)`); `seedSalt` is the *practical* input
  value `SolveOpts.primeAttempt` actually consumes for replay. Technically the derivation is
  invertible (the multiplier is odd, so it has a modular inverse mod 2³²) but nobody should need to
  do that by hand just to replay a stored hint. Explicit `0` (not `null`) for a repair winner at
  the default salt, distinct from `null` for "wasn't a repair attempt" — the raw `Attempt` object's
  own `seedSalt` field is only set when nonzero, which would otherwise make this field ambiguous in
  a *permanent* record.
- **`attractionDiversity`** — reuses an *existing* field rather than adding a new one:
  `HintSolverForcing.disabledFeatures` already means "solver feature flags deliberately disabled
  for this search," and the attraction-diversity last-resort pass is exactly that
  (`attempts.ts`'s `ATTRACTION_DIVERSITY_CANDIDATE_FLAGS`, currently `['SCORE_GOAL_ATTRACTION']`).
  Orthogonal to repair/beam/dfs — a repair winner can equally be an AD-pass winner — so it's gated
  independently, not exclusively.

Both provenance commits are **code fixes, not data backfills**: every stored hint predating them
simply lacks the new fields until rediscovered (same pattern as the earlier `randomSeed` fix).
Every new field has direct test coverage at both the `hint-provenance.ts` derivation layer and the
`domain/hint-types.ts` schema layer (`makeProvenanceEntry`'s defaults/population).

---

## Remaining work / follow-up ideas

Ranked roughly by how close each is to actionable, not by importance.

### 🟡 In progress as of this writing

1. **`repairMustTurnBiasedAttempt` promotion question.** A 30-level, ordinary-vs-biased isolated
   comparison across every must-turn-landmark level in stress-corpus-1 is 9/30 done (paused,
   resumable — each level's result is its own JSON file, so resuming just skips what's already
   there). **Early signal is genuinely mixed, not a clean case either way**: of the 9 done, 4
   levels solve via beam anyway (repair's ordering doesn't matter for them), 2 favor ordinary, 2
   favor biased, 1 is biased-only. Notably `S00030` (the historical regression case) currently
   solves via **beam**, not repair at all — meaning the original regression was likely observed
   under a narrower/ablated configuration than "does the current full production ladder ever reach
   repair on this level," a nuance worth keeping in mind when interpreting the eventual full
   30-level result. **Do not conclude either way from 9/30** — finish the sweep first.

   **Resolution (2026-08-07 documentation reconciliation): cancelled as superseded, not silently
   completed.** Later work answered the actual ordering/promotion question with stronger and more
   relevant evidence: a 31-level cross-corpus sample compared historical
   `repairMustTurnBiased`/`repairTurnBiased` winners, an exclusive feature selector was tested on a
   full corpus-2 refresh and lost net 2 attributable solves, and the current flag-gated experiment
   instead orders both techniques by the predictor while giving the predicted tier 75% of the shared
   probe budget. See
   [`2026-07-23-turnbias-corpus2-ab-validation.md`](2026-07-23-turnbias-corpus2-ab-validation.md)
   and the history comments on `predictLikelyBiasedRepairTechnique` in `modules/solver/attempts.ts`.
   Finishing the older stress-corpus-1-only 21 levels would no longer decide the implemented design,
   so the paused sweep should not be resumed.

### ⏳ Investigated, not yet built

2. **Fix `--baseline-budget`'s repair-winner soundness gap before re-attempting it.** Root-caused
   above: the adaptive cap assumes a deterministic re-solve, which is false for a repair-search
   winner recorded without a seed. The fix is to reuse `--prime-winner`'s own existing gate (does
   this level's baseline winner have a replayable seed whose `elapsedMs` fits the run's budget?) to
   decide whether `--baseline-budget` tightens *that level's* cap at all — fall back to the flat
   `--node-budget` otherwise, rather than applying one multiplier to every known-solved level
   regardless of replayability. Needs re-validation at full-corpus scale (not a small sample) before
   going anywhere near a production-committing workflow again, given exactly this class of gap is
   what the small sample missed the first time.
3. **Attraction-diversity level-feature gate.** Current placement (last resort, only after the main
   loop and repair fallback both fail) is justified by cost (~1× extra full-ladder budget) against
   rarity of benefit (~7% of a sample, per the existing `docs/solver-architecture.md` writeup) — but
   the *mechanism* for deciding when to pay that cost is purely positional ("nothing else worked
   yet"), not predictive. A more surgical alternative: identify level features that predict
   membership in the "fragile group" this pass rescues (the existing writeup already characterizes
   some of what makes a level fragile — near-Hamiltonian, high `reqInt`, a specific scoring-term
   interaction) and gate the pass on those features directly, rather than always waiting for two
   full failures first. This could let the pass run *earlier* (cheaper, since it wouldn't need to
   wait through the main loop + repair fallback first) on levels it's actually likely to help,
   while staying off everywhere else — a different lever than reordering. **Not investigated
   further this session** — no feature-correlation analysis has been run to see if such a predictor
   is even findable from existing data (the solution-profile fingerprints in
   `docs/solution-profile.md` might be the right existing instrument to check this against, since
   they already characterize per-level structural properties).
4. **Repair-seed hit-rate coverage.** `--prime-winner`'s repair path only activates once a baseline
   carries real `seedSalt`/`randomSeed` data (the `5954ea2` fix). **Partially resolved by the
   2026-07-23 refresh itself**: the committed `stress-corpus2-baseline.json`/`stress-corpus1-
   baseline.json` now carry real seed fields for repair winners solved that run (confirmed directly
   — `R00001`'s failed attempts show `randomSeed`/`seedSalt`), whereas the prior baseline had zero
   across 176 repair winners. Still needs the seed-aware hit-rate measurement re-run at scale (this
   session's sample was only 6 levels) once a *clean* refresh (post the `--baseline-budget` fix
   above) has run and stabilized the baseline further — this run's baseline is itself the one with
   the 45-level regression, so don't treat it as a clean measurement source yet.
5. **`scoreMove`'s own before/after speed measurement.** The hoist (`1042274`) is confirmed
   behavior-identical (bit-for-bit) via unit tests, but its *actual* wall-time/node-count improvement
   was never independently profiled post-change. Worth a quick before/after CPU profile, if only to
   quantify the win rather than just assert it exists.

### 💡 Ideas only — not investigated at all

6. **`evaluatePrunedMove`/`applyMove` as the next hot-loop targets.** Both showed up as meaningful
   self-time consumers in the profiling (9.1%/7.5% in the repair-heavy sample) but were never dug
   into — unlike `scoreMove`, no specific inefficiency was identified in either, just their raw
   share of total time. Worth a look with the same "is there redundant work being repeated
   per-candidate that could be batched per-node instead" lens that found the `scoreMove` win.
7. **Gate-level performance analysis, now that `gateKey` is in provenance.** With `HintSolverProvenance.
   gateKey` now captured, a corpus-wide query like "does one gate on a multi-gate level systematically
   win more/faster than another" becomes possible for the first time. Not run — no published/
   stress-corpus multi-gate levels were specifically checked yet, and it's unclear from a first
   look whether there's enough multi-gate population to make this statistically meaningful.
8. **Turning the ordinary-vs-biased comparison into a permanent, documented tool.** The script
   built for item 1 above (`scripts/_mustturn-compare.mjs`, since deleted — it was written as a
   throwaway per this session's own convention for one-off analysis scripts, not committed) worked
   well and is a genuinely reusable pattern: isolate one specific attempt-config variant via
   `SolveOpts.primeAttempt` and compare it against another, across a level population filtered by a
   specific mechanic. If this class of "does variant X actually pull its weight" question comes up
   again (attraction-diversity's feature-gate idea above is exactly this shape), it's worth
   promoting the pattern into real, committed tooling (`scripts/`) with documentation, rather than
   re-writing it from scratch each time.

## Remaining-work reconciliation (2026-08-07)

The numbered list above is historical brainstorming, not a current queue:

- **Item 2 (`--baseline-budget`): closed in its proposed form.** The CLI option is now explicitly
  deprecated for general regression use. The repository has since adopted machine-independent
  `workBudget`/`workSpent`; any future adaptive budget must use recorded work, not add repair-specific
  exceptions to a raw-node scheme already shown unsound at corpus scale.
- **Item 3 (attraction-diversity feature gate): defer behind a new causal predictor.** The subsequent
  repair-winner classifier rerun found that simple level-feature signals are weak or policy-confounded
  at n=725. Do not schedule another feature-mining pass without a new variable or mechanism.
- **Item 4 (repair-seed coverage): prerequisite complete.** All 188 current corpus-2 repair winners
  have a winning attempt with `randomSeed`; 178 also fit a 30-second replay gate. Later refresh work
  exposed prime-miss budget starvation separately and fixed the work-allocation bug. No seed backfill
  campaign remains.
- **Items 5–6 (old hot-loop profiling ideas): closed as stale leads.** The later full hot-path survey
  implemented/measured Tier 1 and parts of Tier 2, including negative allocation-pooling results. Use
  a fresh profile before naming another target; do not profile old commit `1042274` for bookkeeping.
- **Item 7 (gate-level prediction): closed.** The designer-level review found gate choice depends on
  many interacting factors and is not a credible standalone heuristic. Provenance remains useful for
  explaining a concrete A/B, not for speculative gate mining.
- **Item 8 (permanent comparison tool): defer until a second real use.** One throwaway script does not
  justify permanent tooling; build it when another decision actually needs the same comparison.

Current work belongs in [`docs/future-work.md`](../docs/future-work.md), not this dated report.

---

## Policy additions this work prompted

Two points made explicit in `docs/solver-architecture.md` as a direct result of mistakes/near-misses
in this session (see that doc for the full text):

- **Any tool that runs the solver across multiple levels must report/persist results between
  levels, not only at the end** — a killed run (a container restart, in this session's case)
  must lose at most the level in flight, never everything. `stress:benchmark.mjs` and
  `portfolio-solve-sweep.mjs` already do this; it's now written down as a requirement for any
  future batch tool, not just an observed convention.
- **A batch run testing a new solver feature/behavior should default to the fastest/most efficient
  configuration that still answers the question it's for**, unless there's a specific, stated reason
  to do otherwise — narrow node/time budgets, a small representative sample before a full corpus,
  the cheapest sufficient tier from `docs/testing.md`'s table. This session's own beam-throttle
  validation mishap (see the cautionary-tale callout above) is the concrete cost of *not* doing
  this by default: contention from an unrelated concurrent run and an accidentally-identical
  "before"/"after" pair together produced a false regression signal that cost real time to
  untangle.
