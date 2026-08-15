# Shadow-Mode Evaluation Harness for Middle-Layer Solver Reasoners

**Status:** working infrastructure + four prototype results (Parts 4, 7, 8, 9), all sound. Tier
2's three named candidates (Parts 4, 7, 8) are scored and closed with no solve-rate win. The 4th,
differently-sourced candidate (Part 9, must-cross neighbor-budget propagation) completed its
full-population live A/B: Corpus-2 725/1700 → 739/1700 (+14 net), but with 42 gained / 28 lost under
the fixed budget, so it remains opt-in/default-off pending churn diagnosis rather than soundness work.
**Date:** 2026-08-05, updated 2026-08-06, 2026-08-08, 2026-08-11
**Relationship to other docs:** operationalizes [`solver-next-frontier-2026-08-02.md`](solver-next-frontier-2026-08-02.md)
and [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md)
(the "unvalidated research brainstorm" pair indexed in `docs/README.md`) — specifically that
update's section 18 ("Shared evaluation harness") and section 17's "Residual Interface Discovery"
campaign, Stage 3. This doc is the concrete engineering counterpart: code, data formats, CLI usage,
and the first real (non-hypothetical) numbers. It does not re-litigate the research case for any
technique — read the two docs above for that.

[`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md)
reuses the same shadow-first philosophy for a different question: whether failed DFS, beam,
admissible-order, repair, and future attempts emit typed artifacts that are non-redundant and useful
to another technique. That plan should extend or reuse this harness's evaluation conventions where
they fit rather than creating a parallel "shadow mode" stack. Its artifact contract is broader than
the current reject/pass probe contract, however, so do not force replayable candidates, population
summaries, or soft failure signatures into `verdict: reject|pass` merely to reuse this API. Share the
replay/oracle/reporting infrastructure; keep the semantic contracts distinct where necessary.

The current interpretation of Part 9 and the next dynamic-resource probes is summarized in
[`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md).
That synthesis is the bridge from this harness's measured candidate results to the live queue in
[`future-work.md`](future-work.md).

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

The interoperability plan adds a third reuse case: **score information exchange before enabling
information exchange**. When artifact emission exists, the first cooperative-search experiment
should leave solver behavior unchanged and measure artifact frequency, redundancy, diversity,
winning-prefix proximity where ground truth exists, and hypothetical producer→consumer handoff
coverage at equal canonical work. Only evidence that survives that shadow stage should graduate to
a live handoff or scheduling experiment.

## Part 1: The shared evaluation harness

`scripts/stress/interface-probe-harness.mjs` implements section 18's spec.

### Data source — no new CP-SAT calls

The harness does **not** call CP-SAT itself. It consumes the labelled-branch atlas already
produced by `scripts/stress/prune-gap-probe.mjs` (`reports/stress/prune-gap-*.json`). The atlas
started as a 16-level / 623-branch bootstrap sample and was subsequently expanded by the completed
full sweep to **397 eligible levels / 5,518 CP-SAT-labelled branches**; Parts 4, 7, 8, and 9 below
use that grown atlas for their current verdicts. The upstream probe walks a level's stored solution
and, at sampled decision points, asks CP-SAT whether each sibling move (the moves the solution
*didn't* take) is still completable — giving a `dead`/`alive` ground-truth label per branch, plus
whether the existing gauntlet (`evaluatePrunedMove`) already rejects it (`pruned`).

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

Initial prototype run against the then-current bootstrap atlas (16 levels, 623 branches):

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
set. This was a real, if narrow, positive result, but the sample was intentionally treated as
provisional until the larger sweep below removed the sampling uncertainty.

**Re-run 2026-08-05 against the grown atlas (397 levels, 5,518 branches, Part 5)** — the "much
larger labelled sample" the note above called for:

```
separator-resource-spectrum (sound prune (necessary-condition lower bound over pendant-chamber excursions)):
  dead: 9/21 caught (42.9%), unique beyond gauntlet: 7, overlap: 2
  alive: 4/4 correctly passed, FALSE REJECTS: 0
  abstained: 5493/5518
```

**Soundness held at 9x the branch count and 25x the level count: still zero false rejects.**
Applicability didn't move either — 25/5518 branches (0.45%) have a chamber at all, matching Part
3's census finding almost exactly. The 7 new catches are **0.4% of the atlas's 1,680 total missed
dead branches** — real, sound, and too rare to matter at solver scale. This is not a bigger version
of the earlier finding; it's the same finding with the uncertainty removed. 16 levels *could* have
been a fluke sample that happened to undersell a common pattern; 397 levels closes that possibility.

**Verdict: do not wire this into the production solver.** The soundness-verification and
`solver:bench`/matched-node-A/B rigor this codebase requires for any new prune (see CLAUDE.md's
correctness-bar gotchas) costs real engineering time regardless of a prune's yield — spending it
here would repeat the dead-flipping-filter-connectivity precedent
(`reports/2026-07-31-mustcross-forced-structure.md`'s "Precedent" section: "+0.005% nodes... zero
new solves out of 340 chances... correct and worthless"). A catch rate this low, on a corpus this
size, predicts the same outcome without needing to run the experiment to find out.

**What this does settle, honestly**: the single-articulation pendant-chamber shape — the
narrowest, cheapest, most tractable member of the "separator-state resource DP" family the research
docs proposed — is closed. It is not evidence against the *family* (bounded obligation-compatibility
MDDs and backward compatibility envelopes reason about different terrain and are evaluated
separately in Parts 7 and 8), but it does mean the harness's first real answer to "does this
specific idea pay for itself" is no, on real data, for less cost than building it into the solver
would have taken to find out the same thing the hard way. That is the harness doing its job.

## Part 5: Growing the labelled atlas (the part that needs GitHub Actions)

The original 16-level bootstrap sample was not enough to trust a catch-rate estimate.
`scripts/stress/prune-gap-probe.mjs` already produces the labelled atlas one level at a time via
CP-SAT, and each level's oracle calls can take tens of seconds to minutes — covering a meaningful
slice of the ~2000-level corpus this way is exactly the ">15-20 minutes locally, offload to GitHub
Actions" case.

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

**Done, 2026-08-05** (run `31042910431`, dispatched from `claude/solver-intermediate-representations-jtwu9u`):
a full run at the real `every`/`oracle-limit` defaults across all 397 eligible levels, growing the
atlas to 5,518 branches — see Part 4's "Re-run 2026-08-05" for the resulting numbers (soundness
held, applicability/yield unchanged from the 16-level sample). This paragraph previously said the
run "has not been dispatched yet" — stale the moment Part 4 was updated with its results; corrected
here so the two don't contradict each other in the same document.

## Part 6: The flippers go/no-go check — generalization holds, cost doesn't

Prior guidance in this doc's history (see the conversation, not reproduced here) was: extend to
portals, then re-measure whether the prune-gap phenomenon generalizes beyond the mechanic-light
minority before ever spending effort on flipping filters. That measurement now exists.

`prune-gap-probe.mjs` run at the real `every=6`/`oracle-limit=45` defaults against 4 portal-bearing
levels (one per pair-count 4/5/6/7, all genuinely eligible per `atlas-eligibility.mjs`):

| Level | pairs | dead | gap (missed by gauntlet) | oracle unknown |
|---|---:|---:|---:|---:|
| R00314 | 4 | 5 | 3 (60%) | 3 |
| R00349 | 5 | 10 | 6 (60%) | 7 |
| R00059 | 6 | 10 | 6 (60%) | 4 |
| R00648 | 7 | 7 | 1 (14%) | 16 |
| **total** | | **32** | **16 (50%)** | **30** |

Compare to the mechanic-light sample this doc already recorded (R01063/R01118/R01129: 25 dead, 13
missed = 52%). **The generalization check passes**: the existing gauntlet misses roughly the same
fraction (~50-60%) of provably-dead branches on portal-bearing levels as it does on the
mechanic-light minority — the "missing global inference" phenomenon that motivates the whole
separator-DP/MDD research line is not an artifact of easy levels.

**The cost side does not generalize as well.** `oracle unknown` (CP-SAT failing to decide within
budget) is a much larger fraction of attempted branches here than it was on the mechanic-light
sample — R00648 alone hit 16 unknowns against only 26 classified. Portals were already assessed as
the easier of the two remaining mechanics to encode (static, no history-dependence); flipping
filters are harder on both axes at once — riskier to encode correctly (genuinely state/parity-
dependent, and portals themselves needed two rounds of under-constraint bug-fixing even in the
static case), and, based on this trend, likely to yield a *worse* signal-per-oracle-call ratio once
built, not a better one.

**Verdict: still no on flipping filters**, now for an evidence-backed reason rather than a
difficulty estimate — the oracle's yield is already degrading as mechanic complexity rises, and
flippers would push further in exactly that direction. The generalization result is still valuable
on its own: it justified growing the atlas across the real 397-level eligible pool
(portal-inclusive), which was subsequently completed in Part 5; no further flipper encoding is
needed to establish that the prune-gap phenomenon generalizes beyond mechanic-light levels.

> **2026-08-15: flipping filters ARE now encoded, for a different consumer than this verdict was
> about.** `cpsat-full-probe.py` gained flipping-filter support to unblock the *targeted* explicit-
> prefix/single-solve labeling `docs/future-work.md` item 2 and the repair-retreat work were
> explicitly asking for (few, higher-value calls at a normal 15-60s budget), not this Part's
> `prune-gap-probe.mjs` workload (many cheap branch probes at a short 45s budget). This verdict's own
> cost concern is untested for that different workload and may well still apply — do not treat the
> new support as reopening it without new measurement specific to `prune-gap-probe.mjs`/
> `interface-probe-harness.mjs`. See
> [`reports/2026-08-15-cpsat-flipping-filter-support.md`](../reports/2026-08-15-cpsat-flipping-filter-support.md)
> for the encoding, validation, and this exact distinction spelled out in full.

## Part 7: Bounded obligation-compatibility MDD probe (section 4)

`scripts/stress/probes/obligation-tour-probe.mjs` (`obligation-tour-mutex`) is the deliberately
narrow first cut of section 4's "bounded obligation-compatibility MDD" — not the full event/mode
MDD with mutex propagation the section describes, but the single simplest instance of "two
mandatory events' true joint cost exceeds what either's own bound predicts": a JOINT tour lower
bound over every currently-outstanding must-pass AND must-cross obligation together, computed by
exact branch-and-bound permutation search over the solver's own precomputed per-object distance
arrays (the same admissible data `mustPassLowerBound`/`mustCrossLowerBound` themselves read).

**Why this isn't redundant with production.** `mustPassLowerBound`/`mustCrossLowerBound`
(`modules/solver/lower-bounds.ts`) each already build their own MST-based joint bound — but each
MST is built ONLY over its own mechanic's remaining cells; `search.ts`'s hot loop checks the two
resulting scalars independently against the same `rSteps` (see
`docs/solver-aware-game-architecture.md`'s "What should the solver do with this session's
game-rule-alignment work?" section, which first flagged this as an untested gap). Neither MST has a
single cross-mechanic edge, so neither bound can discover that a must-pass cell and a must-cross
cell are positioned such that visiting both costs strictly more than either bound alone predicts.
This probe only activates when at least one of each is outstanding — the population where a
per-mechanic bound is structurally blind to the interaction by construction, not by chance.

**Soundness argument**: every leg is a plain BFS distance (filters, edge-reuse, and must-cross's own
axis-lock nuance are all ignored — a relaxation, never an overestimate), so the minimum tour cost
over all point orderings is a valid lower bound on the true cost of whichever order the real
solution actually uses, exactly the same "permissive abstraction" pattern this harness's other
probes and `oracle.mjs`'s own `bfsDistances` already rely on. Capped at 8 combined obligations for
tractability (branch-and-bound prunes far below the full `n!` in practice); above the cap, abstain.

**Results** (full grown atlas, 397 levels / 5,518 branches):

```
obligation-tour-mutex (sound prune (necessary-condition lower bound over a joint must-pass/must-cross tour)):
  dead: 15/429 caught (3.5%), unique beyond gauntlet: 1, overlap: 14
  alive: 230/230 correctly passed, FALSE REJECTS: 0
  abstained: 4859/5518
```

**Reading this honestly.** Applicability is real and much higher than the separator probe's —
659/5,518 branches (11.9%) have at least one outstanding must-pass AND must-cross obligation
simultaneously, confirming corpus-2's actual mechanic co-occurrence (514/1700 levels carry both,
per `mechanicCaps` — this is not a rare shape). But the catch itself is small: only **1** dead
branch beyond what the existing gauntlet already catches, out of 429 dead branches at this decision
point (0.23%) and out of the atlas's much larger total of provably-dead branches overall. The
practical implication is the opposite of what the applicability number alone would suggest: when
both mechanics are simultaneously outstanding, the EXISTING separate max-of-two-MSTs bound is
already catching almost everything a true joint tour bound would — the theoretical gap this probe
was built to test turns out to be real (1 confirmed instance) but small in practice on this corpus.
Zero false rejects — sound at scale, same as the other two probes.

**Verdict: not worth wiring into production as scoped.** One unique catch per several hundred dead
branches, on a mechanic-combination population this common, is the same shape of result
`docs/CLAUDE.md`'s dead-flipping-filter-connectivity precedent describes: technically correct,
functionally negligible. The theoretical justification for combining these bounds was sound (see
the "why this isn't redundant" argument above) — it just doesn't cash out in extra pruning power at
the rate the gap's existence might suggest, because the two SEPARATE MST bounds were already doing
most of the useful work independently.

## Part 8: Backward compatibility envelope probe (section 13)

`scripts/stress/probes/goal-approach-envelope-probe.mjs` (`goal-approach-envelope`) is the
narrowest sound instance of section 13's B1/B2 envelope layers: when a level's goal has EXACTLY one
structurally-viable grid-adjacent entry neighbor (not reachable via any other neighbor, and not
also reachable by a portal jump), every real solution's second-to-last cell is forced to be that one
neighbor. If the current partial path has already visited that neighbor (and isn't currently
standing on it, and the neighbor isn't itself a gate, whose revisits are exempt from intersection
counting), the path must return to it once more before finishing — an unconditionally forced future
intersection the production solver's `PRUNE_INTERSECTION_DEFICIT` check (a coarse deficit-vs-steps
comparison) has no way to know is coming from level topology specifically. A remaining intersection
budget of 0 at that point is then a real, sound rejection.

**Results** (same atlas):

```
goal-approach-envelope (sound prune (forced-revisit necessary condition from a single-neighbor goal approach)):
  dead: 2/2 caught (100.0%), unique beyond gauntlet: 0, overlap: 2
  alive: 0/0 correctly passed, FALSE REJECTS: 0
  abstained: 5516/5518
```

**Reading this honestly.** This is the rarest population measured so far in this document — 2 of
5,518 branches (0.036%), rarer even than the separator-resource-spectrum's already-rare 0.45%. Both
applicable instances were already dead-branches the existing gauntlet caught by other means (0
unique catches). Sound (0 false rejects on the 2 instances it actually fired on), but there is
essentially no terrain on this corpus for the single-viable-goal-neighbor shape to matter: goals
this structurally boxed-in, combined with the specific "already visited the one entry cell" history,
almost never coincide with a decision point the CP-SAT oracle also flagged as worth labelling.

**Verdict: closed, same reasoning as the pendant-chamber result.** A real, sound, if vanishingly
rare phenomenon — not evidence against the broader backward-envelope family (the fuller B1/B3
layers reason about joint length/intersection/axis reachability sets, genuinely different terrain
from this single-neighbor special case), but this specific narrow cut isn't worth building further.

## Soundness classes and verification rules followed

Per the multilingual doc's section 20: every probe declares one of the seven soundness classes up
front, and the harness enforces the zero-false-reject bar automatically (non-zero exit code, not
just a console note, if any probe ever produces one) rather than trusting a probe author's
self-report. The three Tier-2 probes (`separator-resource-spectrum`, `obligation-tour-mutex`,
`goal-approach-envelope`) all hold zero false rejects across the full 5,518-branch atlas; Part 9's
separately-sourced `mc-neighbor-budget-propagation` probe does as well and has additional stored-
solution soundness replay evidence described below.

## Part 9: Must-cross neighbor-budget propagation (a 4th, differently-sourced candidate)

`scripts/stress/probes/mc-neighbor-budget-probe.mjs` (`mc-neighbor-budget-propagation`) is not from
the multilingual doc's ~17-candidate list Parts 4/7/8 scored — it prototypes
`docs/solver-heuristic-capability-gap-analysis.md`'s item 3 instead (a separate, later gap-analysis
pass over the shipped must-cross machinery specifically). Extends the shipped
`PRUNE_MC_FORCED_NEIGHBOR` hard-wall check to the soft case: a still-open must-cross axis's
required neighbor that is already visited (not a hard wall) needs an unreserved intersection to
revisit, checked against the free intersection budget `PRUNE_MC_RESERVED_WALL` already computes.

```
mc-neighbor-budget-propagation (sound prune (dynamic forced-neighbor revisit cost vs. remaining free intersection budget)):
  dead: 33/549 caught (6.0%), unique beyond gauntlet: 19, overlap: 14
  alive: 374/374 correctly passed, FALSE REJECTS: 0
  abstained: 4595/5518
```

**19 unique catches is the largest of any of the four candidates measured through this harness** —
more than double the separator-resource-spectrum's 7 and nearly 20x the obligation-tour-mutex's 1.
Unlike the three Tier-2 candidates above, this one did not stop at the shadow-probe stage: it was
also validated against a full-corpus stored-solution replay (97,812 valid paths across all three
real corpora, 0 violations) and shipped opt-in (`PRUNE_MC_NEIGHBOR_BUDGET`, default off), then run
through a first live matched-node A/B showing +11/30 on an unsolved sample (0 regressions, all
referee-valid).

A follow-up **full-corpus deterministic A/B** (`solver-stress-refresh.yml` runs #28/#29,
2026-08-08) replaced that sample with the real population: Corpus-1 unaffected (96/102 both arms),
Corpus-2 net +14 (725/1700 → 739/1700) but **not** a strict superset — 42 gained, 28 lost, all 28
losses on levels confirmed to carry must-cross cells. The losses are a budget-reallocation side
effect under the fixed node budget, not a soundness violation. **Current verdict: keep opt-in, not
default-on**, pending repeat/diagnosis of the 42/28 churn.

See [`../reports/2026-08-08-mc-neighbor-budget-propagation.md`](../reports/2026-08-08-mc-neighbor-budget-propagation.md)
for the full writeup. The broader follow-up analysis in
[`../reports/2026-08-11-dynamic-resource-frontier-synthesis.md`](../reports/2026-08-11-dynamic-resource-frontier-synthesis.md)
adds two important negative findings: root free-intersection budget and simple static must-cross
geometry do not explain the hard population well. That strengthens the case for testing dynamic
resource/interface descendants such as crossing-slack instrumentation, locally-abstaining portal
coverage, and bounded joint-interface compatibility rather than another static edge rule.

## How to add the next probe

1. Write a module in `scripts/stress/probes/` exporting `name`, `soundnessClass`, `evaluate`.
2. Add one line to `scripts/stress/probes/index.mjs`.
3. `node scripts/run-bundled.mjs scripts/stress/interface-probe-harness.mjs -- --probes=<name>,<existing-name>` —
   running it alongside an existing probe gets the overlap/unique-catch comparison for free.

The three candidates Tier 2 of the multilingual doc's revised ranking named — separator-state
resource DP, bounded obligation-compatibility MDD, backward compatibility envelopes — have now all
been scored against the same grown atlas (Parts 4, 7, 8). All three closed the same way: real,
sound, individually-verified-at-scale results with catch rates too low to justify production
integration as scoped. Part 9 is different: it crossed the shadow threshold and showed a real
full-corpus solve-set effect, but finite-budget churn prevents promotion. The harness and atlas
remain reusable for the dynamic-resource follow-ups named above and for other candidates from the
research ledger.

## Honest bottom line

This is reusable evaluation infrastructure plus four sound measured candidates. Three Tier-2
candidates are closed as positive-but-too-narrow results with no solve-rate case for production
integration. The fourth, must-cross neighbor-budget propagation, is materially stronger: it
completed the full live A/B at +14 net Corpus-2 solves, but with a 42-gained/28-lost reshuffle, so
it remains an active opt-in experiment rather than a default prune. The durable value is the shared
harness, the grown 5,518-branch oracle-labelled atlas, and a record that separates bootstrap
measurements, at-scale shadow verdicts, and live finite-budget behavior instead of letting one
stage stand in for another.

## Contrastive winning-prefix atlas update (2026-08-11)

Authoritative prefix reconstruction and sibling enumeration are implemented, with shared-prefix
coalescing, child-state neutral facts, known-continuation labels, and explicit oracle abstention. The
first 3-level smoke produced 19 prefixes / 31 siblings; exact labelling remains pending through this
document's existing CP-SAT workflow. See
[`reports/2026-08-11-contrastive-winning-prefix-atlas-pilot.md`](../reports/2026-08-11-contrastive-winning-prefix-atlas-pilot.md).

> **2026-08-11 review status:** No production policy from this track was changed in the PR #1356 follow-up. Completed lineage/correctness evidence and the explicitly uncompleted oracle/receptor work are recorded in [the review follow-up report](../reports/2026-08-11-pr1356-review-follow-up.md); oracle abstentions remain abstentions.
