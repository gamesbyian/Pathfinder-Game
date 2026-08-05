# Shadow-Mode Evaluation Harness for Middle-Layer Solver Reasoners

**Status:** working infrastructure + one prototype result, not a solve-rate win yet
**Date:** 2026-08-05
**Relationship to other docs:** operationalizes [`solver-next-frontier-2026-08-02.md`](solver-next-frontier-2026-08-02.md)
and [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md)
(the "unvalidated research brainstorm" pair indexed in `docs/README.md`) — specifically that
update's section 18 ("Shared evaluation harness") and section 17's "Residual Interface Discovery"
campaign, Stage 3. This doc is the concrete engineering counterpart: code, data formats, CLI usage,
and the first real (non-hypothetical) numbers. It does not re-litigate the research case for any
technique — read the two docs above for that.

## Why this exists

Those two research docs list ~17 candidate "middle-layer" solver reasoners (separator-state
resource DP, bounded obligation-compatibility MDDs, Eulerian relaxations, CEGAR-derived
abstractions, ...) and are explicit that none of them had been checked against Pathfinder's actual
telemetry yet. Testing each one honestly requires two things this repo didn't have before this
work:

1. **A shared way to score any candidate reasoner against the same labelled states**, so results
   are comparable instead of each probe script growing its own bespoke comparison harness (the
   pattern `axis-reach-probe.mjs` / `backward-exact-probe.mjs` / `pocket-bridge-probe.mjs` had each
   independently repeated).
2. **A cheap way to measure whether the corpus even has the terrain a given technique needs**,
   before investing in building the technique itself.

This doc covers both, plus the first prototype reasoner run through them.

## Part 1: The shared evaluation harness

`scripts/stress/interface-probe-harness.mjs` implements section 18's spec.

### Data source — no new CP-SAT calls

The harness does **not** call CP-SAT itself. It consumes the labelled-branch atlas already
produced by `scripts/stress/prune-gap-probe.mjs` (`reports/stress/prune-gap-*.json` — 16 levels,
623 CP-SAT-labelled branches as of this writing). That script walks a level's stored solution and,
at sampled decision points, asks CP-SAT whether each sibling move (the moves the solution *didn't*
take) is still completable — giving a `dead`/`alive` ground-truth label per branch, plus whether
the existing gauntlet (`evaluatePrunedMove`) already rejects it (`pruned`).

The harness replays each labelled branch through the **real** solver-state primitives
(`createState`/`applyMove`/`getNeighbors`/`undoMove` — the same functions `dfsFromGate` itself
uses) to reconstruct the exact `SolverSearchState` at that decision point, in-process, in
milliseconds. This is what makes the harness itself cheap to re-run: the expensive oracle-labelling
step already happened once, upstream, and its answer is reused for every probe the harness is ever
asked to score.

### Probe contract

```js
export const name = '<short id>';
export const soundnessClass = '<one of: sound prune | sound lower/upper bound | forced deduction |
  move ordering only | diversity policy | budget policy | offline oracle or analysis only>';
export function evaluate({ level, prep, state, pos }) {
  return {
    verdict: 'reject' | 'pass',
    abstained: true|false,   // true = "couldn't decide" — NOT the same as a real 'pass'
    // ...any extra explanation fields for the report
  };
}
```

`state` is positioned **at** `pos` (the alt move already applied) — mirrors exactly how
`evaluatePrunedMove` itself is invoked, so a probe reads state the same way the real gauntlet
would. Probes are registered in `scripts/stress/probes/index.mjs` and imported **statically** (not
dynamically loaded by path) because the harness runs under `scripts/run-bundled.mjs`'s esbuild
bundle for speed (see that file's own doc) — a runtime `import()` of an arbitrary path would try to
resolve the probe's own `.ts` imports against plain Node's loader, which doesn't understand bare
`.ts` specifiers outside the bundle, and fails. Adding a probe means adding one line to that
registry.

### Telemetry (section 18)

Per probe, per branch: catch-on-dead, false-reject-on-live (**must be zero** to claim the probe is
sound — the harness exits non-zero if any probe ever produces one), unique catch beyond the
existing gauntlet's own verdict, overlap with the existing gauntlet, abstain rate, and the branch's
depth (`step`) so catches can eventually be weighted by how early they fire. Deliberately **not**
reduced to one leaderboard number, per the doc's "do not compare only raw dead-prefix catch counts"
note — a rare early catch can be worth more than a common late one, and this harness doesn't yet
estimate avoided-subtree size, so it reports the raw counts and leaves that weighting to a human
reading the report.

### Persistence and usage

Writes `--out` after **every** atlas file, not only at the end (CLAUDE.md's batch-tool rule).

```
node scripts/run-bundled.mjs scripts/stress/interface-probe-harness.mjs -- \
  --atlas-dir=reports/stress \
  --probes=separator-resource-spectrum \
  --out=reports/stress/interface-probe-harness-results.json
```

## Part 2: Residual decomposition primitive

`scripts/stress/lib/residual-decomposition.mjs` is the shared building block behind both the
census (Part 3) and the prototype probe (Part 4): it finds **pendant chambers** — maximal sets of
residual cells reachable from the current head position only through one gateway cell — via a
standard rooted articulation-point / block-cut decomposition over the residual reachable graph,
with the classic root special-case handled explicitly (the general articulation condition is
vacuously true at the DFS root, so the root only splits into separate chambers when it has 2+ DFS
children — see the file's own comment).

**Scope**, matching the existing CP-SAT-comparison probes' precedent: no portals, filters, flipping
filters, must-cross, or turn-obligation cells inside a reported chamber; a chamber containing the
goal or a gate is never reported. Chambers are capped at a configurable cell count (default 10-12)
for tractability.

## Part 3: Residual-separator census (Stage 3 of Residual Interface Discovery)

Before building any separator-conditioned DP, Stage 3 of the campaign says to measure whether the
corpus has the terrain that DP needs. `scripts/stress/residual-separator-census.mjs` does this
cheaply (no CP-SAT — pure structural computation, so it's fast enough to run the whole corpus
locally in well under a minute; no GitHub Actions sharding needed for this particular tool, unlike
the atlas-growing sweep in Part 5).

**A real methodological finding, not just a number.** An early version of this tool only sampled
chambers along the level's own **known solution**. Across the full 1700-level corpus-2 (821 levels
with a stored hint), that found chambers at only **12 of 19,903 sampled positions (0.1%)** —
essentially never. That's not a bug: a solved path doesn't typically walk itself right next to a
small dead-end pocket it has no plan to enter. The tool now *also* samples every **sibling branch**
at the same steps (the same population the harness/probe actually operate on, and the same
sampling method `prune-gap-probe.mjs` uses) — that population shows chambers at **81 of 19,831
sibling branches (0.4%)**, across **58 of the 821 levels (7.1%)**. Chamber sizes skew small (size
1-4 cells accounts for 86 of the 93 chamber occurrences observed; see
`logs/residual-separator-census/full-corpus2-summary.md` for the full histogram).

**Reading this honestly**: in-scope single-articulation pendant chambers, as narrowly defined here,
are genuinely rare on corpus-2 — closer to the multilingual doc's own kill criterion ("small
separators are rare on the hard corpus") than to a common phenomenon. That's a real data point
against over-investing in this exact narrow shape, not a reason to hide the number.

```
node scripts/run-bundled.mjs scripts/stress/residual-separator-census.mjs -- \
  --corpus=data/stress/stress-levels-random.json --every=4 \
  --out=logs/residual-separator-census/full-corpus2.json \
  --summary-out=logs/residual-separator-census/full-corpus2-summary.md
```

## Part 4: Prototype probe — separator-state resource spectrum

`scripts/stress/probes/separator-resource-probe.mjs` is the first real reasoner plugged into the
harness: a deliberately narrow slice of section 3's "separator-state resource DP" recommendation,
scoped exactly to what that section's own 3.2/3.5 calls out as the right first cut — opportunistic
single-articulation-point pendant chambers, not a general treewidth solver.

### Algorithm

1. Find in-scope pendant chambers with a pending must-pass obligation (Part 2).
2. For each, exhaustively enumerate every single "gateway out, cover every mandatory cell, gateway
   back in" excursion using the real move-legality primitives, bounded by the level's **true**
   remaining step budget (not an arbitrary cutoff) and a node-count safety cap. An empty,
   non-truncated spectrum is a genuine proof the chamber can never be satisfied — an immediate,
   unconditional reject. A truncated chamber makes the probe **abstain** rather than guess.
3. With 2+ mandatory chambers, combine their spectra additively (bitset convolution) — visiting one
   doesn't change another's cost, since each is a self-contained round trip through its own
   gateway.
4. Check the cheapest combined `(steps, intersections)` pair against the current position's
   already-sound admissible goal-distance bound: any real solution needs at least
   `goalDist(pos) + comboSteps` total steps (the excursion is a pure detour, additive regardless of
   when it happens) and at least `comboIntersections` more intersections. Failing either is a real,
   provable rejection.

### Soundness argument and honest scope limits

This is a **necessary-condition lower bound**, not the full Pareto "hole detection" the research
docs describe as the technique's long-run promise (proving a *specific* length is impossible even
though it's inside the scalar min/max range) — that fuller version needs the trunk's own resource
spectrum too, which this prototype doesn't attempt. What it does prove is sound: it never rejects a
state a real solution can still reach, by construction —
zero false rejects were observed on every branch tested (see Results). The known gap: only a
*single* covering excursion per chamber is modeled. A level whose only solutions dip into the same
chamber twice is out of scope — a missed catch, never a false reject, since the probe only makes a
positive infeasibility claim from the excursions it actually enumerated.

### Results

Run against the full existing atlas (16 levels, 623 branches):

```
separator-resource-spectrum (sound prune (necessary-condition lower bound over pendant-chamber excursions)):
  dead: 3/16 caught (18.8%), unique beyond gauntlet: 2, overlap: 1
  alive: 3/3 correctly passed, FALSE REJECTS: 0
  abstained: 604/623
```

Read together with Part 3's census: only ~0.4% of branches even have an applicable chamber, so a
97% abstain rate is expected, not a defect. Within the branches where a chamber *did* apply, the
probe's catch rate is meaningful — 2 of the atlas's 16 total dead branches (12.5% of *all* labelled
dead branches, not just the applicable subset) were previously invisible to the existing gauntlet
and are now caught by a demonstrably sound rule. Zero false rejects across the whole 623-branch
set. This is a real, if narrow, positive result — and also small enough that no solve-rate claim
should be made from it without a much larger labelled sample (see Next steps).

## Part 5: Growing the labelled atlas (the part that needs GitHub Actions)

16 levels is not enough to trust a catch-rate estimate. `scripts/stress/prune-gap-probe.mjs`
already produces the labelled atlas one level at a time via CP-SAT, and each level's oracle calls
can take tens of seconds to minutes — covering a meaningful slice of the ~2000-level corpus this
way is exactly the ">15-20 minutes locally, offload to GitHub Actions" case.

`scripts/stress/atlas-sweep.mjs` is a thin multi-level driver — deliberately **not** a refactor of
`prune-gap-probe.mjs` (that script stays exactly as-is, independently runnable, no regression
risk) — that spawns it once per level and lets it write its own
`reports/stress/prune-gap-<id>.json`, so a sweep grows the same atlas the harness already reads,
with no new format and no separate merge step for the harness's own purposes.
`.github/workflows/atlas-sweep.yml` shards this the same way `method-probe-sweep.yml` shards
`scripts/method-probe.mjs` (20-shard matrix), but — unlike that purely diagnostic workflow — its
combine job commits new/changed atlas files straight back to the dispatched branch, on GitHub's own
runner network (see "commit mechanics" below for why that distinction mattered in practice).

**Validated 2026-08-05, in stages, each catching a real bug:**

1. A 1-shard/1-level trial (`run_id=30981689448`, `--every=20 --oracle-limit=30`) confirmed the
   CP-SAT half works in CI at all: `pip install ortools` installed `ortools-9.15.6755` cleanly,
   `cpsat-full-probe.py` classified 6/6 sampled branches with zero `unknown`/timeout.
2. A first "fuller" attempt (`total_levels=1700` real corpus size + `shard_count=4`) revealed that
   `shard_count` only controls how many of the 20 (always `total_levels`/20-sized) slices *execute*
   — it doesn't shrink them. That dispatch concentrated 4×85-level slices onto 4 runners instead of
   spreading a smaller target across all 20, wasting the sharding's whole point. Cancelled and
   redispatched correctly (`total_levels=340, shard_count=20` → 17 levels/shard).
3. That corrected 20-shard/340-level sweep (`run_id=30982779834`) finished with a striking
   1-to-23-minute spread across shards. Traced to real data, not noise: `cpsat-full-probe.py`
   doesn't model portals or flipping filters (the same scope carve-out the sibling oracle-comparison
   probes already document) — every level in the sample with `portals.length>0` or
   `flippingFilters.length>0` returned CP-SAT `unknown` on every branch in 1-2 seconds, while every
   mechanic-light level took real time and produced real dead/alive labels (e.g. `R01063`: 6 dead
   branches found, 3 newly exposed beyond the existing gauntlet; `R01118`: 12 dead, 6 new; `R01129`:
   7 dead, 4 new). The slow shards were the *productive* ones.
4. Pulling that run's results into the repo hit a real environment boundary: the dispatching agent
   session's egress proxy denies GitHub's artifact-storage host
   (`productionresultssa5.blob.core.windows.net`) by organization policy — a 403 to report, not
   route around (confirmed via the proxy's own diagnostic endpoint). Fixed at the right layer: the
   combine job now checks out the branch and commits directly, using GitHub's own runner network
   and the checkout's push credentials, which the policy never touched.
5. Backfilling the already-completed run 30982779834 (rather than re-paying for its CP-SAT work)
   needed a way to pull an old run's artifacts and commit them without re-sweeping. A standalone
   `atlas-sweep-commit.yml` for this 404'd on every dispatch attempt — confirmed via GitHub's own
   docs that a brand-new `workflow_dispatch` workflow must be merged to the default branch before
   the REST API will dispatch it (this workflow itself apparently got registered earlier as a side
   effect of its first, syntactically-broken push triggering GitHub's own validation-failure
   notice, not a mechanism worth relying on again). Folded the same logic into a `backfill_run_id`
   input + job inside `atlas-sweep.yml` instead, since that workflow was already proven
   dispatchable from a feature branch — worked immediately.
6. The eligible-vs-wasted split from step 3 was quantified and fixed at the source: only 212 of
   1700 corpus-2 levels were CP-SAT-eligible at the time (hint-bearing, no portals/filters/flipping
   filters — see `scripts/stress/lib/atlas-eligibility.mjs`). `atlas-sweep.mjs` now supports
   `--shard-index=N --shard-count=M`, which filters to that eligible set FIRST and then assigns
   level `i` to shard `(i % M) + 1` (round-robin, not a contiguous position range — insurance
   against any positional clustering of hard/trivial levels in the corpus). The workflow's old
   `total_levels` input and its shard-count-vs-scope confusion (step 2) are gone entirely; every
   shard now gets an even, guaranteed-eligible share regardless of `shard_count`.
7. `cpsat-full-probe.py` gained real portal support (see that file's own "PORTAL SUPPORT"/
   "VALIDATION STATUS" docstring sections): a padded horizon sized from each level's own portal-pair
   count (never a documented/assumed cap — CLAUDE.md's "max 3 pairs" is published-corpus-only; both
   stress corpora reach 7), a goal-absorbing rule, and two under-constrained-model bugs found and
   fixed via the referee step (`validateCandidatePath`), not `check-witness` alone. Validated by two
   genuinely cold, unpinned solves (one 4-pair level, one 6-pair level) accepted by the referee —
   real, but a small sample, not exhaustive. `atlas-eligibility.mjs` now admits portal-bearing
   levels accordingly: the eligible pool grew from 212 to **397** (of which 185 have portals).
   Portal levels use a measurably larger model than portal-free ones, so expect more timeouts at the
   same `oracle_limit` for that subset — worth watching in sweep results, not assumed away.

A full run at the real `every`/`oracle-limit` defaults across all 397 eligible levels has not been
dispatched yet under the fixed scheme — that's still a real CI-minutes decision to make
deliberately, now that every mechanical piece (parallelism, eligibility, portal support, commit) is
known to work.

## Soundness classes and verification rules followed

Per the multilingual doc's section 20: every probe declares one of the seven soundness classes up
front (`separator-resource-spectrum` declares "sound prune (necessary-condition lower bound)"), and
the harness enforces the zero-false-reject bar automatically (non-zero exit code, not just a
console note, if any probe ever produces one) rather than trusting a probe author's self-report.

## How to add the next probe

1. Write a module in `scripts/stress/probes/` exporting `name`, `soundnessClass`, `evaluate`.
2. Add one line to `scripts/stress/probes/index.mjs`.
3. `node scripts/run-bundled.mjs scripts/stress/interface-probe-harness.mjs -- --probes=<name>,<existing-name>` —
   running it alongside an existing probe gets the overlap/unique-catch comparison for free.

Natural next candidates from the research docs, in the order Tier 2 of the multilingual doc's
revised ranking suggests: a depth-limited future-cone MDD (section 4/idea C) and backward
multi-resolution compatibility envelopes (section 13) — both should be scored against the same
grown atlas from Part 5 before any of the three is prioritized for further investment.

## Honest bottom line

This is infrastructure plus one small, sound, positive-but-narrow result — not a solve-rate win.
Per the research docs' own framing ("success without solve gain" is an explicit, accepted outcome
for this stage of the campaign), the value delivered here is: a reusable way to score *any* future
middle-layer reasoner against real oracle-labelled data, a real (not assumed) measurement of how
rare this specific chamber shape is on corpus-2, and a documented, sound, if modest, first catch —
plus the tooling to grow the evidence base past 16 levels without anyone burning a day of local CPU
time to do it.
