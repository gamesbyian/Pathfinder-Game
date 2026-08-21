# Solver Dev-Tooling Plan

> **Status: all components A-G shipped (2026-07-10); the original brainstorm's cheap-tail
> follow-ups also shipped (2026-07-10, see below).** This is a design record for a specific set
> of tooling investments, written up after a design conversation about making solver development
> against the 1700-level stress Corpus 2 faster and more informative. Components A-E (smoke suite,
> tier-selection docs, mechanic filter, level ranking, diff-baseline strategy explanations), F
> (independent reference/oracle solver), and G (automatic level reducer) are all built, verified,
> and in `data/stress/`/`scripts/stress/`/`scripts/solver-oracle/` — see each section below for
> what shipped and what was found along the way. A second pass ("Cheap-tail follow-ups" section,
> below Component G) closed the remaining concrete, cheap ideas from the *original*
> regression-testing brainstorm (isolated retry, deterministic sampling, a failure inbox, budget-edge
> stability classes, empirical worker-count tuning) that hadn't made it into A-G. Indexed from
> [`future-work.md`](future-work.md).
>
> **On archiving this doc (evaluated 2026-07-18, decision: keep in place):** the line above used to
> say to fold this into `solver-architecture.md`/`data/stress/README.md` and move it to `archive/`,
> the way every other completed plan in this repo does. That was checked and declined: ~15 source
> files (`scripts/stress/*.mjs`, `scripts/solver-oracle/*.mjs`, `modules/solver/orchestration.ts`)
> cite this doc by its exact path in code comments, naming specific Component letters (A-G) — a
> move would mean rewriting all of those for a purely organizational gain, when this doc already
> carries a clear shipped-status header. Don't re-attempt the move without also grepping for and
> updating every one of those citations; `grep -rn "solver-dev-tooling-plan" .` finds them all.

## Context

This plan exists because of concrete things found while re-verifying and instrumenting the
stress corpora (see `../data/stress/README.md` and `../logs/README.md` for the full trail):

- A single failing, repair-eligible level can legitimately cost up to ~13x its nominal
  `timeBudgetMs` by design (`REPAIR_EXTRA_BUDGET_FRACTION = 6.0` x up to 2 repair configs, on top
  of the main loop's own share — `modules/solver/orchestration.ts`). Combined with real
  CPU-contention effects on constrained boxes, a naive "just re-run everything" workflow against
  1700-2000 levels is unworkably slow.
- `data/stress/regression-set.json`'s pinned expectations were stale — most of its "known-hard"
  levels have since been solved by earlier work and nobody updated the pin file, because nothing
  forced that bookkeeping to happen.
- The stress corpora already carry rich per-level structural metadata
  (`stressMeta.mechanicCounts`/`navDensity`/`featureTags`) and, since this session, rich per-attempt
  telemetry (`nodesExpanded`/`timedOut`/`bestBadness`/`finalBadness` — `modules/solver/orchestration.ts`)
  that almost none of the existing tooling actually uses for anything beyond display.
- Every stress-corpus level (Corpus 1 and Corpus 2 alike) carries a hidden, withheld witness path
  (`stressMeta.witnessSolution`) that proves solvability by construction — a resource this repo
  has used for deep one-off diagnosis (the batch-B cluster writeup) but never turned into
  reusable tooling before `scripts/stress/witness-divergence.mjs`.

The throughline: most of what's proposed below is cheap specifically *because* the raw material
already exists in this repo. Two items are genuinely new engineering (the reference oracle, the
level reducer); one item is deliberately deferred.

## Definition of done (whole plan)

The plan as a whole is satisfied when all of the following hold simultaneously:

1. A solver-source edit can be sanity-checked in under a minute (smoke suite) before any full
   sweep is run.
2. Every committed pin/baseline file (`regression-set.json`, `stress-corpus1-baseline.json`,
   `stress-corpus2-baseline.json`, and the new smoke-set pin) reflects the *actual* current
   solver behavior, not a stale historical snapshot — verified by the fact that re-running
   `stress:regression`/`stress:compile-baseline` against `HEAD` reports zero unexplained
   improvements or regressions.
3. A developer can answer "which small subset of the corpus is relevant to the file I just
   changed" without guessing, using only already-recorded metadata (no new solver invocation
   required to decide *what* to run).
4. A developer can answer "why did this level's result change" (strategy change / node-count
   shift / timing drift / genuine regression) without manually diffing two JSON files by hand.
5. Any newly-discovered solver bug where production disagrees with an independently-implemented
   oracle on move legality or the win condition is caught before it reaches `main`, not diagnosed
   after the fact from a stress-corpus report.
6. A 15x15 antagonistic level that exposes a bug can be reduced to a minimal reproducing example
   automatically, without a human manually deleting objects and re-running the solver by hand.

## Component A — Curated smoke suite

**Shipped 2026-07-10.** `data/stress/smoke-set.json` + `scripts/stress/smoke.mjs` +
`npm run stress:smoke`. Historically verified at 14/14 in ~30s (10 published, 4 stress-corpus).
**Maintenance reconciliation (2026-08-07):** four legacy stress ids stopped resolving. They were
replaced with current purpose-matched pins and the suite again holds 14/14 under 60 seconds. The old
`S00017` identity could not be provenance-mapped, so `R01189` is honestly labelled as structural
high-intersection/must-cross coverage rather than as the same historical bug canary. See the
completed entry in [`future-work.md`](future-work.md#older-loose-thread-triage-2026-08-07).
One real gotcha found during build: the original 10000ms smoke budget silently changed S118's
winning strategy and made it fail outright — its historical bug (4-gate budget starvation) is
specifically about budget dilution, so a shrunk "smoke" budget defeated the canary's purpose.
Fixed by using the reference 20000ms budget uniformly (cheap for the fast published levels,
necessary for the budget-sensitive stress-corpus canaries).

**Deliverable:** `data/stress/smoke-set.json` (same shape as `regression-set.json`: id, batch,
expected, baselineMs, baselineStrategy) + `npm run stress:smoke` (thin wrapper around
`scripts/stress/regression.mjs --set=data/stress/smoke-set.json`, no new script needed).

**Contents:** 12-20 levels, chosen deliberately, not randomly:

- One level per mechanic family that has ever needed its own scoring/pruning term: must-pass,
  must-cross, portals, flipping filters, must-turn landmark, adjacent-turn landmark, surround
  landmark, geese, false goals, multi-gate.
- 2-3 levels from the repair-fallback feature gate (`needsRepairFallback`), since that's the
  code path most likely to silently blow through its budget on a bad change.
- 2-3 previously-fixed "known bug repro" levels (e.g. one from the batch-B cluster, S118, S017)
  — these are cheap regression tripwires for specific historical fixes.
- 1-2 trivial levels (near-instant solve) as a canary for "did I break something so badly nothing
  solves at all."

**Why:** none of the existing tiers are both *tiny* and *deliberately representative* —
`stress:regression` is 24 levels, unfiltered by mechanic coverage; the published 156 is fast in
aggregate (~38s) but that's still 156 separate solves, not the <20 a smoke check wants.

**Invariants:**

- The smoke set is a fixed, version-controlled list — never regenerated by random sampling. Its
  membership only changes via an explicit, reasoned edit (adding a newly-relevant mechanic or
  bug repro), the same discipline `regression-set.json` already documents for itself.
- Total wall time for `npm run stress:smoke` stays under 60s on a clean run in a typical dev
  environment. If a level's legitimate solve time grows past what keeps the suite under that
  bound, replace it with a faster representative of the same mechanic rather than let the
  suite's runtime drift upward silently.
- Every entry has a pinned `expected` status kept current the same way `regression-set.json`
  requires (Component below covers *how* that staleness gets caught going forward).
- Running the smoke suite is a strict subset of running `stress:regression`, which is a strict
  subset of running `solver:bench` — no level should be in a smaller tier but not a larger one
  that's supposed to contain it (checkable: every smoke-set id also appears, with a compatible
  expectation, in the regression set or the published corpus).

## Component B — Documented tier-selection workflow

**Shipped 2026-07-10.** See `docs/testing.md`'s "Solver stress tiers" section — the tier table and
the minimum-sufficient-tier-by-change-type table below are both there now, not duplicated here.

**Deliverable:** a short section in `docs/testing.md` (not a new file — this is workflow guidance
for an existing doc) naming, for each class of solver change, which tier is the *minimum*
acceptable check before considering the change verified:

| Change touches... | Minimum tier |
|---|---|
| One pruning/scoring function scoped to a single mechanic (e.g. `mustCrossLowerBound`) | Smoke suite + Component C's mechanic-filtered subset |
| `attempts.ts` policy ordering/thresholds | Smoke suite + `stress:regression` + published `solver:bench --check` |
| `orchestration.ts`, `search.ts`, `repair-search.ts`, `scoring.ts`, `prune-gauntlet.ts` (shared across every level) | Full `solver:bench --check` + `stress:regression`, no shortcuts |
| Anything touching `timeBudgetMs` allocation or budget constants | Full `solver:bench --check`, and re-read the repair-budget-stacking math in `orchestration.ts` before assuming a change is safe |

**Why:** the tiers already exist (see Context); what's missing is a place that states, in one
place, which one is *sufficient* for a given change, so "just run everything" isn't the only
known-safe default. This session's own telemetry commits are the counter-example that motivated
writing this down: two purely-additive changes to shared orchestration code correctly got two
full `solver:bench --check` runs, but a hypothetical future single-mechanic change shouldn't
have to justify that same cost from first principles every time.

**Invariants:**

- The table is the single source of truth for "is this check sufficient" — a PR/commit message
  that names which row applied is enough justification without re-deriving the reasoning.
- A change touching any file in the "shared across every level" row is never signed off on the
  smoke suite or mechanic-filtered subset alone, regardless of how small the diff looks — this
  row exists specifically because "purely additive, must be safe" was this session's own
  reasoning for touching `orchestration.ts`/`search.ts`, and CLAUDE.md's own gate
  (`solver:bench --check`) was still run in full both times, correctly.

## Component C — Mechanic-based targeted test selection

**Shipped 2026-07-10.** `--filter-mechanic=<name>[,...]` on both `scripts/stress/benchmark.mjs`
and `scripts/stress/witness-divergence.mjs`, composable with `--levels=`. Verified against
independently-computed counts on both scripts (exact match).

**Deliverable:** `--filter-mechanic=<name>[,<name>...]` on `scripts/stress/benchmark.mjs` (and
`witness-divergence.mjs`, `diff-baseline.mjs`'s input selection), reading each level's own
`stressMeta.mechanicCounts[<name>] > 0` — no new metadata to generate, since both corpora already
carry this field.

**Why:** already covered in Context — the metadata exists, only the filter is missing.

**Invariants:**

- `--filter-mechanic=X` selects exactly `{ level | level.stressMeta.mechanicCounts.X > 0 }` —
  deterministic and derivable from the corpus file alone, with no hidden state.
- Self-check: `count(filter-mechanic=X) + count(filter-mechanic=X, --invert)` equals the corpus
  total, for every mechanic name — guards against a silent typo/mismatch between the filter's
  mechanic-name strings and the corpus's actual `mechanicCounts` keys.
- The tool's own `--help`/header comment states plainly that mechanic filtering is **not**
  sufficient for changes to shared infrastructure (cross-reference Component B's table) — the
  filter must not be usable in a way that silently implies "this is always safe."

## Component D — Telemetry-driven level prioritization

**Shipped 2026-07-10.** `scripts/stress/rank-levels.mjs` + `npm run stress:rank-levels`. Verified
against a fresh benchmark run with real (non-null) badness values. Note: the *existing* compiled
baselines (`stress-corpus1-baseline.json`, `stress-corpus2-baseline.json`) predate the
`nodesExpanded`/`timedOut`/`bestBadness`/`finalBadness` telemetry added to `orchestration.ts`
earlier the same session — ranking them today shows `badness=?` for every level until they're
regenerated with the current solver build.

**Deliverable:** `scripts/stress/rank-levels.mjs` — reads a compiled baseline
(`stress-corpus1-baseline.json` / `stress-corpus2-baseline.json`) and ranks levels by a
simple, documented heuristic (not a learned model): recency of last-known failure, `nodesExpanded`
descending, `bestBadness`/`finalBadness` ascending (closest misses first) as a tiebreaker. Emits
`--top=N` ids, directly consumable by `benchmark.mjs --levels=`.

**Why:** the telemetry this needs (`nodesExpanded`/`timedOut`/`bestBadness`/`finalBadness`) is
already recorded per attempt as of this session's `orchestration.ts` changes — this is a ranking
script over existing data, not a new instrumentation layer. Deliberately not ML-based: at
~2000 levels total, a simple documented heuristic is auditable and sufficient; a learned ranker
would be over-engineering for this corpus size.

**Invariants:**

- Ranking is a pure function of a single input baseline file — computing it never invokes the
  solver.
- Deterministic: the same input file always produces the same ordering (stable sort, documented
  tiebreak order).
- `rank-levels.mjs --top=N` output is always a subset of the full corpus (`N` capped at corpus
  size); the tool never claims to replace a full sweep, only to order one.

## Component E — Richer diff-baseline explanations

**Shipped 2026-07-10.** `diff-baseline.mjs` now reports a `strategyChanges` bucket (non-gating,
additive, existing exit-code semantics unchanged). Verified via a fixture and a self-diff check.

**Deliverable:** extend `scripts/stress/diff-baseline.mjs` (already built this session) to add a
non-gating `strategyChanges` bucket: for any level whose `ok` status is unchanged on both sides,
if `winningStrategy` differs between baseline and candidate, report it (`was X, now Y`) alongside
the existing node/timing drift buckets.

**Why:** `winningStrategy`/`failedStrategies` are already in the schema every source already
emits — this is surfacing a field the tool ignores today, not adding new data collection.

**Invariants:**

- Existing hard-regression/exit-code semantics of `diff-baseline.mjs` are unchanged — the new
  bucket is purely additive to the report, never gates the exit code (matching the existing
  drift/slowdown buckets' own "informational, not gating" convention).
- A level appearing in `strategyChanges` is not, by itself, evidence of anything wrong — the
  report's own text must say so (a different winning strategy is expected and fine whenever the
  old winner's timing was close to a competing strategy's).

## Component F — Independent reference/oracle solver

**Shipped 2026-07-10.** `scripts/solver-oracle/{oracle,generate,fuzz}.mjs` +
`npm run oracle:fuzz`. Scoped to gate/goal/block/mustPass/mustCross/portal/regular-filter/
flipping-filter/geese/falseGoals (landmarks explicitly unsupported — refused with an
`inconclusive` verdict, not silently mishandled). `oracle.mjs` has zero imports (fully
self-contained, satisfying the "zero shared implementation" invariant by construction, not just
by convention); `fuzz.mjs` is the harness and legitimately imports both `modules/Solver.js` (to
cross-check against) and `modules/domain/level-schema.js` (schema validation only, not solver
logic). Verified clean across 600 random levels (3 seeds x 200) — zero move-legality or
win-condition disagreements. Caught two real bugs in the oracle itself during construction
(before ever reaching the fuzzer): (1) treating the gate cell as structurally impassable broke
the admissible distance bound at the start cell itself; (2) the initial BFS distance bound
ignored portals entirely, which can make it an *overestimate* (portals shorten true distance) —
unsound, not just imprecise, since it could wrongly prune a real solution. Fixed by splitting
"structurally impassable" (blocks/geese/falseGoals) from "forbidden as a re-entry target"
(adds gates, used only for move generation, not the distance bound) and making the bound a
portal-aware 0-1 BFS. Both caught by hand-written sanity tests before any fuzzing ran — see
`oracle.mjs`'s inline documentation for the corrected reasoning.

**Deliverable:** `scripts/solver-oracle/` — a from-scratch, independently-written move-generator
and win-condition checker (re-deriving portal/filter/flipper/must-pass/must-cross/landmark
legality from the domain rules directly, **not** importing `modules/solver/search-state.ts` or
`solution.ts`), paired with a small brute-force/plain-BFS search using only the most trivially
sound pruning (a single admissible distance bound, nothing resembling the MST bound). Plus a
differential-fuzzing harness that runs both the oracle and production against many small/medium
random levels (reusing `stress-levels-random.json`'s generator at a smaller size, or a dedicated
small-grid generator) and reports any disagreement.

**Why:** this repo has already shipped one real bug in this exact category — the MST-bound
scratch-buffer bug, where a pruning bound came out tighter than mathematically valid and risked
declaring a genuinely solvable level unsolvable (see CLAUDE.md's memoization gotcha and
`solver-architecture.md`'s history section). An independent implementation is the only kind of
check that can catch a bug *shared* between the thing being tested and the thing checking it —
which is exactly why this must not reuse `modules/solver`'s own primitives, unlike every other
component in this plan.

**Explicitly out of scope:** using the oracle to resolve whether a *hard* Corpus-2 level is
"genuinely impossible." An unpruned/lightly-pruned exhaustive search is exponentially slower than
production specifically on the levels production already struggles with, so the oracle would
time out just as inconclusively there — and for the stress corpora specifically, solvability is
already proven by the withheld witness, so there's nothing for the oracle to establish on those
levels anyway. Its job is catching **false "unsolvable"/false "invalid"** verdicts on tractable
inputs, not adjudicating the frontier.

**Invariants:**

- Zero shared implementation with `modules/solver/search-state.ts`, `solution.ts`, or
  `lower-bounds.ts` — checkable by import graph (the oracle module must not appear as a
  transitive importer of any `modules/solver/*` file it's meant to be independent of).
- Every pruning rule the oracle uses is provably admissible by a one-paragraph argument in its
  own source comments — no rule may be added "because it's probably fine," which is exactly how
  the MST bug got in in the first place.
- A move-legality or win-condition disagreement between oracle and production on ANY fuzzed
  level is treated as a build-breaking finding (fails the fuzz harness's own CI-style check),
  never silently logged and ignored.
- The oracle only ever reports one of three verdicts: `solved (path)`, `proved unsolvable within
  the searched space`, or `inconclusive (budget/node cap reached)` — it never reports plain
  `unsolvable` without the "within the searched space" qualifier, so nobody downstream mistakes
  an inconclusive result for a proof.
- The fuzz corpus is regenerated/re-run on every change to `modules/solver/search-state.ts` or
  `solution.ts` (the two files the oracle exists to cross-check) — this is the actual trigger
  condition for running it, not a scheduled cadence.

## Component G — Automatic level reducer

**Shipped 2026-07-10.** `scripts/stress/reduce-level.mjs` + `npm run stress:reduce-level`. Uses
the `nodeBudget` option added to `Solver.solve`/`orchestration.ts` this session for phase 2's
re-verification solves (see Component F's caveat below on `nodeBudget` precision — a caller-chosen
budget above the repair-probe's fixed ~8,000,000-node internal ceiling is precise to within a few
dozen nodes; below it, the probe still runs its own fixed ceilings before the external check can
fire, so the script's default of 15,000,000 was deliberately picked to sit safely above that).
Verified end-to-end against Corpus 2's `R0024` (a real `timeout`-signature level): phase 1 (schema
+ referee only, no solver calls) stripped 30 off-witness objects for free, shrinking size 328→298;
phase 2 (solver-in-the-loop, capped at 40 candidate solves for the verification run) removed
flipping filters, portal pairs, a grid edge, and repeatedly decremented `reqLen`, reaching size 259
while the reduced level's signature still matched `timeout` under the (smaller, verification-scale)
node/time budget — and correctly reported "stopped at `--max-iterations` WITHOUT reaching a fixed
point" rather than overclaiming minimality. The final candidate was independently re-checked
against `validateRawLevel` (passed) outside the tool itself. Every invariant below was exercised by
this run except full-iteration convergence to a genuine fixed point, which a production run with a
realistic (larger) `--max-iterations` would reach — the capped run demonstrates the cap-vs-fixed-
point reporting distinction working correctly, which is the invariant that actually needed proving.

**Deliverable:** `scripts/stress/reduce-level.mjs` — given a level id (and the specific solver
behavior that made it interesting: timeout, wrong-path, exception, excessive node count), shrinks
it toward a minimal reproducing example via two phases:

1. **Witness-guided free shrink (no solver invocation):** strip any object the witness path never
   touches, shrink the grid to the witness's bounding box plus a margin, drop mechanics with zero
   remaining instances after the above — re-validating only against `validateRawLevel` (schema)
   and `validateCandidatePath` (referee) against the (correspondingly trimmed) witness after each
   step. This phase is the same order-of-magnitude cost as re-validating a level, not re-solving
   one, so it can run many iterations cheaply even in a CPU-throttled environment.
2. **Solver-in-the-loop shrink:** on whatever phase 1 leaves, apply classic delta-debugging
   (ddmin-style) reduction — remove one object / simplify one requirement / shrink the grid by one
   row-or-column at a time, keeping the change only if the production solver still exhibits the
   *same* failure signature (same status: `timeout` stays `timeout`, an exception stays that
   exception, not just "still not `ok`"). Uses a **node budget**, not a wall-clock budget, for each
   re-verification solve, consistent with this session's finding that wall-clock timing is
   unreliable in CPU-throttled environments.

**Why:** established technique (delta debugging / ddmin, the same family as QuickCheck/Hypothesis
shrinking) applied to a domain where it fits unusually well: a hidden witness gives phase 1 a way
to shrink for free, and the game's own schema/referee validators are already exactly the
correctness oracle phase 1 needs.

**Invariants:**

- Every intermediate candidate, at every step of both phases, passes `validateRawLevel` — the
  reducer must never emit or accept a malformed level, even transiently.
- Phase 1 never invokes the production solver — its only re-validation calls are schema +
  referee-against-witness, both cheap and deterministic.
- Phase 2 only accepts a reduction step if the **same** interestingness predicate (the specific
  failure signature that motivated reducing this level) still holds — this is the standard
  delta-debugging soundness requirement; a step that "fixes" the level in some other way (e.g.
  turns a timeout into a different, unrelated timeout at a much smaller node count) is not
  automatically treated as a good reduction unless the signature match is explicitly loosened by
  the caller.
- The reduction is monotonically decreasing in a fixed size measure (grid area + object count +
  reqLen) — guarantees termination without a separate iteration cap, though a cap is still worth
  keeping as a defensive backstop.
- Termination is a genuine fixed point: no further defined shrink operation can be applied without
  either failing schema validation or losing the reproduced failure signature — not just "ran out
  of iteration budget." If the iteration cap is hit before a fixed point, the tool must say so
  explicitly rather than silently reporting its last candidate as "minimal."

**Known limitation found 2026-07-17; fixed 2026-08-08**: preserving the failure *signature* was
provably insufficient for a repair-gated level's target signature — repair-search has no
completeness guarantee, so a reduction step that shrinks a level past genuine solvability can
still pass re-verification cleanly as long as repair's own randomized search keeps burning its
budget without ever concluding "no solution exists." Confirmed on R00440: reducing it (removing
all 5 `mustCross` entries) produced a candidate whose repair-disabled main-loop search collapses
from millions of genuinely-explored nodes (the original level) down to a 38-node **complete
exhaustion** (`status: 'failed'`, this codebase's own signal for "provably no solution in the
searched space") — strong evidence the reduced candidate is actually infeasible, not a minimal
hard-but-solvable reproduction, even though the reducer's own re-verification (which runs with
repair enabled) reported the target `node-budget-reached` signature preserved throughout. See
[`../reports/2026-07-17-r00440-reduction-infeasibility-finding.md`](../reports/2026-07-17-r00440-reduction-infeasibility-finding.md).
The reducer now performs that check itself. When repair participated in the source failure, phase 2
records the post-phase-1 repair-disabled (`repairBudgetFractionOverride: 0`) signature and accepts a
candidate only when both the requested top-level signature and this main-loop control signature are
preserved. The final report records both control and final signatures. This rejects the reproduced
R00440 failure mode (`node-budget-reached` under repair but `failed` under the main-loop control)
instead of publishing it as a minimal hard-search reproduction.

## Cheap-tail follow-ups — closing the rest of the original brainstorm

**Shipped 2026-07-10.** The *first* brainstorm this project started from (regression-testing
strategy under CPU throttling, 28 numbered points) fed directly into Components A/C/D/E/G above,
but left five concrete, cheap ideas unbuilt. None required a design change — each is a small,
self-contained tool — so they're recorded here rather than as their own lettered components.

### Isolated retry on failure (brainstorm point #4 — its own #3 priority pick)

**Deliverable:** `scripts/stress/solve-one.mjs` (solves exactly one corpus level, prints one JSON
line to stdout) + `scripts/stress/retry-isolated.mjs` (`retryLevelIsolated()`, spawns `solve-one.mjs`
as a **fresh child process** via the same `run-bundled.mjs` wrapper every solver-importing CLI uses,
parses its JSON result). Wired into `scripts/stress/regression.mjs` (retries a level that flips
`expected: solved` → unsolved before reporting a regression; default on, `--no-retry` to disable)
and into `scripts/stress/diff-baseline.mjs` (opt-in via `--retry-failures=<corpusFile>`, since that
tool routinely compares two files with no single live corpus behind them).

**Why:** the brainstorm's own highest-priority pick. A fresh process rules out two independent
noise sources at once: CPU-throttled wall-clock-edge outcomes, and any same-process contamination
(module-level cache state, GC pressure) carried over from levels solved earlier in the same run.

**Invariants:**
- A level that fails once and then solves on the isolated retry is reported as
  `FLAKY_PASS_AFTER_RETRY`, never silently upgraded to a plain pass and never counted in the
  regression exit code — the flakiness itself is the finding.
- A level that fails on both the original attempt and the isolated retry is a confirmed
  regression — the retry only ever *removes* false positives, never suppresses a real one.
- `retry-isolated.mjs` is plain JS with no TS import — only the child process it spawns needs
  esbuild bundling, keeping the retry helper itself trivial to reason about and reuse.
- Verified: `retryLevelIsolated()` round-tripped correctly against a real corpus level (S017,
  spawned fresh process, solved 6394ms, `refereeValid: true`); `regression.mjs`'s full 24-level
  pinned run and `diff-baseline.mjs`'s `--retry-failures` path both exercise the same helper.

### Deterministic seeded sampling (points #2, #13)

**Deliverable:** `--sample=N [--seed=<value>]` on `scripts/stress/benchmark.mjs`, composing after
`--levels`/`--filter-mechanic`. A Fisher-Yates shuffle seeded via FNV-1a-hashed `--seed` (default:
the current commit SHA, or `$GITHUB_SHA` under CI) picks N levels deterministically — this is
Tier 3's "100 levels per change, different deterministic shard per commit" from the brainstorm:
repeatable rotating coverage of a huge corpus instead of an undifferentiated random subset every
time.

**Why:** the brainstorm explicitly warns against "using random samples without recording the
seed" — an irreproducible sample can never be replayed to confirm a finding.

**Invariants:**
- Same corpus + same `--seed` (or same commit, since that's the default seed) → byte-identical
  sample, every time — this is what makes a sample "a shard," not just noise.
- Different seeds produce different samples of the same size — the mechanism doesn't secretly
  degenerate to always picking the same N regardless of seed.
- Omitting `--sample` runs every selected level, exactly as before this change — purely additive.
- Verified: two runs with `--seed=test-seed-1` against Corpus 2 picked the identical 3-level
  sample (`R1332,R1119,R1991`); `--seed=test-seed-2` picked a different one.

### Failure inbox / promotion pipeline (point #14)

**Deliverable:** `data/stress/failure-inbox.json` (a queue) + `scripts/stress/failure-inbox.mjs`
with four subcommands: `--add-from=<diff-baseline --out= file> --corpus=<file>` (queues new
`hardRegressions`/`slowdowns` entries, deduped by id), `--list`, `--promote=<id> --to=<pinFile>
--corpus=<file>` (re-solves the level fresh via `retryLevelIsolated`, then appends it to the target
pin file — created fresh if it doesn't exist yet — with a real current baseline, and removes it
from the inbox), `--dismiss=<id>` (drops it without promoting). This closes the loop the brainstorm
described: *solver-blind random corpus → discovers an issue → curated regression set*, without the
1700-level corpus staying an undifferentiated blob.

**Why:** `regression-set.json` only tracks what's already pinned; nothing previously captured
"interesting but not yet triaged" findings from a Corpus 2 run in between discovery and a human
decision to pin it.

**Invariants:**
- Nothing is ever auto-promoted — `--add-from` only queues; only an explicit `--promote` call
  writes to a pin file, and only an explicit `--dismiss` removes an entry without promoting.
- `--promote` always re-solves fresh (never reuses the stale diff-baseline detail as the pinned
  baseline) — the pinned `baselineMs`/`expected` reflect the solver's state *at promotion time*,
  not at discovery time.
- A promoted pin file uses the exact same schema `regression.mjs` already reads — no special
  handling needed to run it (`npm run stress:regression -- --set=<promoted file> --corpus=<file>`).
- Verified end-to-end: `--add-from` queued 2 synthetic entries, `--promote` on one produced a pin
  file that `regression.mjs` read and solved correctly (`✓ 6119ms (baseline 6398ms)`), `--dismiss`
  on the other removed it cleanly, leaving 0 pending.

### Budget-edge stability classification (point #11)

**Deliverable:** `scripts/stress/classify-stability.mjs` — tags each level in a benchmark-shaped
file as `stable-fast`/`stable-medium`/`stable-slow` (by elapsed/budget ratio), `budget-edge`
(solved but ≥90% of budget, or a `timeout`/`node-budget-reached` status), `known-unsolved` (a
non-budget-edge failure), or — only when `--compare=<second run>` is given — `flaky` (ok/status
differs between the two runs, overriding whatever either run's ratio alone would suggest).

**Why:** a single-run PASS doesn't distinguish "comfortably solves" from "solves, but is one
contention spike away from failing" — the brainstorm's point: these deserve different trust levels
even though both read as green today.

**Invariants:**
- `flaky` is only ever assigned by the two-run comparison path — a single run alone cannot
  distinguish real flakiness from an honest one-time slow solve, so it never guesses.
- Classification is a pure read over already-recorded fields (`ok`/`status`/`elapsedMs`) — no new
  solver invocation, so it's as cheap as the input file it's reading.
- Verified against the real 1700-level Corpus 2 baseline (1656 `budget-edge`, 43 `known-unsolved`,
  1 `stable-slow` — consistent with that baseline being "everything here was a timeout/near-timeout
  as of the last full sweep") and against two synthetic runs disagreeing on one level (correctly
  classified `flaky`, both individual per-run classes correctly overridden).

### Empirical worker-count tuning (point #8)

**Deliverable:** `scripts/stress/tune-parallelism.mjs` — sweeps `--parallel=1..N` (default N=4)
over a fixed 16-level subset via real `benchmark.mjs` subprocess invocations (pinned to
`--engine=sequential` for every N, isolating the across-level `--parallel` factor from the raced
engine's own independent worker pool), and reports wall-clock per N.

**Why:** the brainstorm explicitly warns against assuming "more workers is better" under CPU
throttling, and recommends measuring N empirically rather than assuming it.

**Finding (this sandbox, 2026-07-10, 4 cores per `nproc`):** N=1: 23094ms, **N=2: 13765ms, N=3:
9293ms (fastest), N=4: 14904ms (worse than N=3)** — confirms this sandbox's per-run allocation
behaves like a genuinely 4-core box for this workload, and that the existing codebase default
(`Math.max(1, availableParallelism() - 1)`, i.e. 3 here) already lands on the actual empirical
optimum rather than needing to be changed. This is a measurement of the environment at the time it
was taken, not a permanent constant — re-run `npm run stress:tune-parallelism` if the sandbox's CPU
allocation changes materially.

**Invariants:**
- The tool measures real subprocess wall-clock (actual `benchmark.mjs` invocations), not a
  simulated or in-process approximation — it answers the question that actually matters (what will
  `npm run stress:benchmark -- --parallel=N` actually cost).
- `--engine=sequential` is pinned for every N in the sweep, so the reported wall-clock differences
  are attributable to the across-level `--parallel` factor alone, not confounded by the raced
  engine's own default-on worker pool.
- The report explicitly disclaims permanence — a fastest-N finding is a snapshot, not a constant to
  hardcode elsewhere in the codebase.

## Deferred — Production portfolio-based solving

Not scoped further in this document. This is the one idea from the design conversation that is
player-facing rather than dev-tooling, and the numbers available today don't show a need: the
published 156-level corpus solves in aggregate ~38s (~240ms/level average) via
`solver:bench`, and hint generation is already precomputed offline
(`data/hints/<id>.json`), not served on a live-play latency budget. The dev-only raced/portfolio
racing (`scripts/solver-parallel/`) already exists and already captures the technique's value for
development; there is no evidence yet that shipping it to the browser solves a real problem.

**Gate for revisiting:** do not start this until there is a documented, measured case of
production (in-browser) solve latency exceeding an actual player-facing threshold. Until that
gate is met, this stays out of scope.

## Rough sequencing

Not a hard schedule, but a reasonable order given dependencies and payoff:

1. Component A (smoke suite) + B (workflow doc) — cheapest, immediately useful, no dependencies.
2. Component D (ranking) + E (diff explanations) — cheap, and Component D's output feeds directly
   into deciding what Component G should reduce first (rank, then reduce the worst offenders).
3. Component C (mechanic filter) — cheap, independent of the above.
4. Component G (level reducer) — the highest-leverage new build for the actual 1700-level goal;
   start once A/B/D give a stable way to verify a reduction didn't regress anything else.
5. Component F (reference oracle) — valuable but not blocking solver progress on Corpus 2 the way
   G is; do this when a suspicious pruning-soundness question actually comes up, or as dedicated
   time allows.
