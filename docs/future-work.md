# Future Work

A compiled index of genuinely open, non-stale work — pulled from active planning documents and recent campaign reports. This file serves as the index; detailed strategy documents are linked below. Updated 2026-07-23.

> **Currently active:** Campaigns 1–3 of the solver-development roadmap, targeting stress-corpus-2 solvability. See [`solver-development-roadmap.md`](solver-development-roadmap.md)'s campaign sections for live status — they update with each major measurement. Also active: the repair-search stagnation investigation ([`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md), Stages 1-3 prototyped with Stage 4 re-scoped based on Stage 1 findings).

---

## Solver development (active campaigns)

**Master reference:** [`solver-development-roadmap.md`](solver-development-roadmap.md) — the campaign-level plan sequencing diagnosis → generalization → verify → refresh. Campaigns 0–3 documented there with concrete status as of 2026-07-18. Each campaign picks a failure cluster, diagnoses mechanism, proposes feature-keyed changes, verifies rigorously, and refreshes the corpus. This is the single source of truth for what's being worked on and what the blockers are.

- **Campaign 0** — close out pending follow-ups from 2026-07-16/17 reports. **Completed 2026-07-17.** Three independent issues fixed: attraction-diversity near-miss testing, budget-fraction evaluation, and repair-probe budget-override bug.
- **Campaign 1** — `repair-close` rescue (139 levels as of latest re-cluster). **Completed 2026-07-18** with the `closeLengthGap` operator and its near-miss extension shipped (2026-07-17), plus infrastructure fixes to the repair probe (node-budget starvation). Net +28 genuine solves via `diff-baseline.mjs`. The deeper issue (repair-search's stagnation plateau converging to a frozen deficit signature and staying frozen) is addressed separately via [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) — this campaign fixed a symptom and identified the core problem; that plan targets the core.
- **Campaign 2** — `dfs-plain` exhaustion (843 levels; the bulk of the problem). **Active investigation** with many negative results documented: 8 scoring flags tested, 3 turn-constraint generalizations (MST bound, deadlock check, exit guidance) all tested to negative conclusions, state-revisit transposition premise invalidated on inspection, articulation-point technique out of scope. Revised conclusion: the harder ~93% majority resists the known fragile-scoring family and existing pruning/scoring machinery — needs a genuinely new technique (admissible bounds, move-ordering strategy, or constraint-propagation approach not yet tried). Level reduction established a new caveat for repair-gated levels. See [`solver-development-roadmap.md`](solver-development-roadmap.md) for the full differential-testing methodology and specific report links per sub-finding.
- **Campaign 3** — `repair-far` (507 levels as of latest re-cluster) + robust hard cores. **Not yet started.** Will be armed with whatever Campaigns 1–2 teach; if nothing generalizes, genuinely-new techniques (transposition with provable sound keys, constraint propagation, or macro moves informed by solution-profile family resemblance) to be prototyped behind ablation flags.

## Repair-search stagnation escape (active investigation)

**Master reference:** [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) — the investigation into why `repair-search.ts`'s iterated-local-search restarts converge fast to a near-miss and plateau for 85-99% of budget.

- **Stage 1** — Instrumentation (capturing signed signatures + structural features). **Complete 2026-07-22.** Shipped as env-gated `PF_REPAIR_SIGNATURE_DEBUG=1` in `repair-search.ts`. Four findings: all plateaus are length-*short* (not long), pending must-turn dominates shape (13/15), exact signatures are diffuse but shape is concentrated (key on sign+mask, not magnitude), conditional overrepresentation analysis reveals specific revisit/tip cells. Shaped Stage 2 design by finding 3 (shape-keyed vs. magnitude-keyed).
- **Stage 2** — Signature-conditioned soft feature memory (plateau-penalty prototype). **Built 2026-07-22**, `enablePlateauPenalty` opt-in in `repair-search.ts`. Verdict: sound and effective at reshaping search, but **no solved-count gain** and a double-edged bestBadness effect with one severe near-solved-level regression. Kept default-off. Two follow-ups tested (arming-time near-solved guard, equal-work A/B) — both confirmed the effect is real misdirection, not a confound.
- **Stage 3 (soft)** — Scatter-search recombination via complementarity-guided guide selection. **Built 2026-07-22**, `enableRecombination` opt-in. **The only prototype to gain a solve** (R02239, 2/16 vs 1/16). Distance-only guide selection lost a solve (complementarity criterion load-bearing). Still net-mixed on near-miss quality with the same near-solved regression. Default-off.
- **Stage 3 (real)** — Reversible-operator relinking via anchor-splice. **Built 2026-07-22**, `enableRelink` + `relinkPaths`. Verified sound (copies guide suffixes through real gauntlet). **Does not help — zero solves, zero cost change — and underperforms soft approximation.** Reason: exact segment copies collapse under append-only legality; soft randomness escapes this trap that rigid copying cannot. Reverted. Exact-copy relinking is a structural dead end.
- **Turn-aware selective biasing** — Bias the one load-bearing move (exit from pending must-turn cell) only during detected must-turn plateau. **The best-performing mechanism** from the investigation. **Solves R02003** (via `TURNBIAS` attempt), drives several others to badness 2. On 40-level sample: +1 solve, net-positive badness (12 better, 8 worse), zero downside. Wired as a production repair attempt (`STRATEGY_REPAIR_TURN_BIAS`-gated, default-off in legacy mode; must-turn attempt first among repair configs). But: 10-strong-candidate production A/B found only 1 turn-bias-*attributable* solve — isolation A/B dramatic reductions (R01397 39→2, R02220 10→2) do **not** convert to production solves once the full fallback has access. Load-bearing lesson: turn bias needs the repair fallback; `disableExtraBudgetPasses` creates a false negative. **Remaining gate:** corpus-2 refresh run twice (baseline vs flag-on, fallback enabled) + full-corpus before/after **timing** comparison (GitHub Actions, now the load-bearing check) before promoting to default-on. See [`reports/2026-07-22-repair-stagnation-turnbias-production-wiring-validation.md`](../reports/2026-07-22-repair-stagnation-turnbias-production-wiring-validation.md).
- **Stage 4** — Strategic oscillation across exact-count boundary. **Re-scoped 2026-07-22** based on Stage 1 findings: all 15 measured plateaus are length-*short*, never long — repair deadends before `reqLen` and never overshoots. So "oscillate back from overshoot" has no overshoot to work with. If pursued: frame as "reach a length the random walk can't extend to" (an extend/detour operator), not oscillation. **Not yet started.** Append-only-construction prerequisite gap applies either way.

**Standing conclusion from all stages (2026-07-22):** Soft mechanisms (randomized recombination, turn-aware biasing) move the needle; hard constant-tuning has failed three times; exact-copy relinking is a dead end; append-only prefix editing hits a wall on global length↔turn coupling. The one avenue not yet shown to hit the wall is **descent-aware probing** (shadow logging of what a mechanism would change on an otherwise-improving restart, per soundness rule 7). Pursue that over more bounded-operator variants before claiming exhaustion.

## Solver improvement research items

**Master reference:** [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) — items 1–5 probed against real data (2026-07-11), each with concrete verdict and priority. This is the research-inspiration ledger; nothing from here has shipped to solver code yet.

### Confirmed real, highest priority for build:
- **Homotopy-class path-signature metrics** (item #4). Real, measured, double-digit-percent effect on real data (16.6% of cross-homotopy-class hint pairs rated "similar" by current curation, using correct computation, not proxy). Strongest evidence-to-effort ratio. Targets must-cross-heavy levels specifically; should check whether it partitions the existing hint corpus into behaviorally-distinct clusters the current `featureDistance` metric (edge-Jaccard + crossing placement + must-cross order) misses.

### Needs re-run once corpus-2 benchmark complete:
- **Learned portfolio selection** (item #3), reframed as binary "will `repair` win" question. Real but moderate signal: `navDensity <= 0.524` catches 6/10 repair-winners at the cost of 8 false positives (F1 0.500); at n=85 with only 10 positives, signal is not yet strong enough to act on. Also found: 79.2% of total solve time on solved corpus-1 levels was spent on attempts *before* the actual winner — a separate, actionable finding regardless of any learning (re-examine `attempts.ts` ordering for `must-cross-heavy` and `high-intersection-burden` archetypes specifically). Re-run this exact binary classifier once corpus-2's benchmark (in progress) roughly quadruples the dataset before deciding to build or drop.

### Needs harder redesign before buildable:
- **Nogood/dead-end learning** (item #2). Direct instrumented search found a real counterexample: a naive `(mpVisitedMask, mustCrossMask, remaining)` signature is provably unsound as a global nogood key in this codebase's actual state space. Any future attempt needs a richer signature (portal state, flipper state, edgeUsage per visited cell) or to restrict scope to what existing MST bounds already prove, which raises the bar from "mid-term, needs care" to "bigger design task." Probe the richer signature offline against corpus data before committing.

### Refuted, redirected:
- **Articulation-point pruning** (item #1). Original distance-vs-discrepancy premise refuted (negative correlation, explained). Redirected form (corridor-capacity bound on `reqInt`, different mechanism) not yet re-probed. Do that before implementing.

### Deprioritized:
- **State-dominance/transposition caching** (item #5). Correctness risk too high relative to current payoff evidence, and now also relative to every other item on this list having actual supporting data.

## Solution-space and level-family research

**Master reference:** [`family-and-scaling-research-possibilities.md`](family-and-scaling-research-possibilities.md) (original research proposal) and [`sibling-cousin-system.md`](sibling-cousin-system.md) (implementation status). The level-family half was picked up and built (most of it); [`req-length-sweep.md`](req-length-sweep.md) now covers the first controlled win-metric experiment, while the broader solver-scaling analysis is not yet implemented as a systematic pass.

### Shipped via sibling-cousin-system (2026-07-15):
- Symmetry siblings (all 7 non-identity rotations/reflections)
- Local-mutant variants (single-object relocation under strict inventory)
- Swap mutations
- Mechanic-group reshuffles
- Full constrained-shuffle families
- Re-embedded-witness cousins (grid growth around unchanged content)
- Density-sweep mode (adds/removes blocks to vary `navDensity` directly)

Produces append-safe sibling IDs, validates witnesses against canonical rules, stamps both level and hint provenance, replaces parallel instrumentation with real codebase systems.

### Still open, scaling analysis (from section 20's roadmap):
Descriptive scaling against existing corpus (Stage 1), symmetry/local children (Stage 2), and constrained-shuffle families (Stage 3) are valuable targets for future analysis but not yet committed as a systematic pass. The shipped required-length sweep is deliberately narrower than those stages: it varies only `reqLen` on an otherwise fixed level. See the doc's sections 5-16 for the full framework (board-size, win-metrics, ratio-based, technique-specific growth, family-driven insights).

### Explicitly deferred:
- **Recipe cousins** — deliberately not implemented. Defer until sibling/cousin findings from tighter-controlled tiers are understood (per section 9 of the original plan).

## Hint tooling & corpus

### Hint-corpus-expansion Phase 5 (optional targeted top-ups)
Generators A (randomized-restart) and B (prefix-anchored completion) are done and in production use (`npm run hints:expand`). Optional further generators (symmetry maps for invariant levels, crossover between compatible known hints, waypoint/order construction for specific missing must-pass/must-cross orders) should be driven by explicit gap reports from A/B, not built speculatively.

## Solve-button variety (Find N Hints)

**Master reference:** [`solve-button-variety.md`](solve-button-variety.md). Phases 1–4 are shipped and in production. Open items:

- **Complete-DFS hard safety ceiling** (node/time) for "Find all" — nothing currently stops an unbounded run on a pathological level if the user never cancels. Safety-relevant; **highest priority of this group**.
- **Phase 5 tuning** — tier → (node budget, restarts, seeds, time ceiling) calibration; current values are first-pass defaults.
- **Tier numbers + ceilings** — exact curator targets (5/25/100?) and per-tier time budgets.
- **Does the 1,000-hint cap lift for "Find all"?** Currently caps and reports `capped` (not truly "all") on solution-rich levels. Recommendation in the doc is to keep the cap; revisit only if a maker explicitly wants an uncapped dump.
- **Complete-enumeration size threshold** — the navigable-area/branching estimate below which exhaustive mode is attempted at all.

## Security & infrastructure

### Admin custom-claim production cutover
`isAdmin()` currently accepts a Firebase custom claim (`admin: true`) *or* a legacy admin-email fallback (a no-lockout transition). Remaining: provision the claim in production, then delete the email fallback from `firestore.rules` and migrate the client-side email check (`review-repository.js`, UX-only) to read the claim. **Ops-blocked** (needs Firebase Console access), not code-blocked. Full procedure: [`firestore-security-model.md`](firestore-security-model.md) "Admin custom-claim migration".

### Emulator-backed Firestore rule tests
The current suite (`scripts/firestore-rules-test.mjs`) is source-level characterization + negative-case guards, not behavioral tests against the Firebase emulator. Deliberately deferred — needs emulator + CI wiring, and the payoff only lands when the rules actually change. Revisit alongside the next `firestore.rules` edit, not proactively. See [`testing.md`](testing.md) "Gaps / roadmap" and [`security.md`](security.md).

## Data layout & persistence

### Persistent level ids (shipped 2026-07-15)
All 3 corpora (published 156 + stress-corpus-1 102 + stress-corpus-2 1700) now carry permanent `id` fields (P00001..P00156 published, S00001..S00102 and R00001..R01700 stress). Local hint storage keyed by id, not array position. This was originally scoped as "key by `getLevelFingerprintSource()` instead," but a finding from that work showed fingerprint doesn't work as a persistent identity (it's a *content* hash — edit one block and it changes, silently orphaning ratings/hints). Real `id` is what the goal actually requires. Runtime hint-fetch path (`modules/data-asset-loaders.ts`, `data.ts`) is id-aware. `id`/`persistentId` passthrough audited across serialization boundaries (`buildWireLevelData`, level-submission-repository, review-repository) — all survive the editor → submission → review → publish pipeline untouched. Firestore's `published_levels` stays keyed by its own doc id + fingerprint (level only gets permanent `id` at import time, not draft time). **Complete.**

---

## What's explicitly out of scope / deprioritized

### Bidirectional / meet-in-the-middle search — ONE open question, not five blockers (2026-07-31)

Proposed as "the lever with the right shape" in
[`reports/2026-07-30-move-ordering-not-the-bottleneck.md`](../reports/2026-07-30-move-ordering-not-the-bottleneck.md)
and again in
[`reports/2026-07-31-mustcross-forced-structure.md`](../reports/2026-07-31-mustcross-forced-structure.md),
on the argument that meeting at `reqLen/2` turns `0.68^99` into `0.68^50` — it changes the exponent
where every other lever changes a constant. **That argument is correct.** It had been rejected in
conversation several times without ever being written down, which is why it kept returning.

**The blocker is the frontier — and the measurement is suggestive, not conclusive.**
`scripts/stress/mitm-frontier-probe.mjs` runs an exhaustive BFS by depth, deduping on what a sound
merge must key on: position + visited multiset + must-pass mask + must-cross mask + `ints`. On
R00044 (`reqLen` 91, meet depth ~45) it reaches depth 20 before timing out:

| depth | 12 | 14 | 16 | 18 | 19 | 20 |
|---|---|---|---|---|---|---|
| distinct states | 3,568 | 10,541 | 28,352 | 71,350 | 116,567 | 172,760 |

The growth ratio **decays steadily** — 2.11, 2.04, 1.86, 1.88, 1.78, 1.79, 1.65, 1.72, 1.57, 1.66,
1.51, 1.63, 1.48 — and was still falling when the probe stopped. Extrapolating across the remaining
~25 levels is therefore sensitive to an assumption the data does not pin down:

| assumed ratio | states at the meet depth |
|---|---|
| 1.48 (freeze at the depth-20 value) | 3x10^9 |
| 1.4 | 8x10^8 |
| 1.3 | 1x10^8 |
| 1.2 | **1.6x10^7 — storable** |

**So this does not settle it.** At the pessimistic end the frontier is unstorable by orders of
magnitude; at the optimistic end it is ~16M states, which is not. An earlier version of this entry
asserted "10^9-10^10, hundreds of GB, decisive" — that froze a visibly-decaying ratio and overstated
what had been measured.

**What would settle it**: run the probe deeper. The current implementation is O(depth) per expansion
(it replays the path from scratch to rebuild each state), which is why it dies at depth 20; an
incremental version carrying `applyMove`/`undoMove` along the BFS should reach depth 30+, where the
extrapolation gap narrows to something decidable. That is a few hours of work and it is the honest
prerequisite to calling this closed.

**An earlier version of this entry claimed four independent blockers and a clean population of
4-14%. Both were wrong, and the correction matters more than the conclusion.** Three of the four are
bounded by the level caps and are ordinary bookkeeping in the meet key:

| supposed blocker | actual size |
|---|---|
| global flipper parity | max 4 flipping filters -> `flipperUsedMask` has **16** values |
| portals | max 3 pairs, single-use -> a small usage mask |
| must-cross first-pass axis | max 4 cells -> ~**256** states, and `lower-bounds.ts` already encodes exactly this as a base-4 digit per cell |

"Global flipper parity cannot be fixed by compression" was the specific error: it does not need
compression, it needs enumeration, and 16 values is nothing.

The fourth — halves sharing cells, so `reqInt` cannot be split independently — looked severe measured
at the exact midpoint (64.6% of solutions coupled). Measured across **all** split points it nearly
vanishes: **99.1% of stored corpus-2 solutions have some vertex-disjoint split, and 65.4% have one in
the middle 40% of the path.** Requiring disjoint halves is an almost-free restriction.

**But disjointness does not rescue it**, which is the subtle part worth keeping: it cleans up the
*merge condition* while leaving the *frontier* untouched. Each stored half still needs its own
visited set — to count that half's internal revisits toward `reqInt`, and to enforce the per-cell
axis rules — so the state cannot shrink to the small tuple above. Frontier size is therefore the
single open question, and it is genuinely open.

**Backward search as an ORACLE rather than a stored frontier — TRIED 2026-07-31, provably
redundant.** The proposal was a bounded backward BFS from the goal answering "can the goal be reached
in exactly `k` steps from here", storing only O(K x cells) layers rather than a meet frontier, so none
of the frontier objection applies. Built as `scripts/stress/backward-exact-probe.mjs` and scored
against the CP-SAT-labelled branches: **it fires on 0 of the 238 dead branches the gauntlet still
enters.**

The zero has a one-line proof, and it should have been found on paper before any code:
**any cell with at least one neighbour can burn two steps by stepping out and back**, so on the
static graph the achievable-length set from a cell is always exactly `{d, d+2, d+4, ...}`. Verified
anyway across 300 portal-free levels and **40,004 reachable cells: zero exceptions.** `PRUNE_DISTANCE_BOUND`
(minimum distance) plus `PRUNE_PARITY` (parity) therefore already decide length-reachability
*completely* on the static graph. There is nothing for an exact backward oracle to add.

Note this is the same structural fact — the out-and-back detour — that makes a degree prune on
required cells unsound (recorded above `isConnected` in `topology.ts`). It has now defeated two
separate ideas from opposite directions: it keeps a dead-end cell *reachable* when you want to prune
it, and it keeps every even step-count *achievable* when you want to prune on exact length.

**Where the teeth actually are, and why it is not cheap.** The probe is trivially redundant because
it over-approximates by ignoring visited cells — which is exactly what makes out-and-back always
available. In a real state that detour costs an intersection, and when the free intersection budget is
zero it is unaffordable. So the version of this test with any power is **state-dependent**, cannot be
precomputed per level, and collapses back into the same per-state connectivity work the reserved wall
and axis-exhaustion rules already do. The cheapness that made the oracle attractive and the strength
that would make it useful are mutually exclusive.

**Prior art: a SOFT version of this existed in the pre-rewrite monolithic `Solver.js` and was lost in
the rewrite, not rejected.** (Recovered 2026-07-31 from a user-supplied copy of the old file; it is
not in the repo, so the design is recorded here rather than referenced.) `runMitmMeetCheckLocal` ran
a backward BFS from the goal at depth 11-14 (cap 18), capped at 8,000-12,000 states, keyed by **cell
only** plus a parity bit — no visited set, no masks, no `ints`. It intersected that reachable set with
the top-24 root move candidates, scored meets as `obligationHits * 2.4 - reverseDepth * 0.22`, and
consumed the result two ways, neither of them a prune:

1. `feasibleMeetSignal` as a **retry adaptation** — enable endgame IDA*, raise the budget fraction,
   force a root-expansion floor.
2. `bridgeRouteHint` as **move-ordering bias** in the scorer: `mitmBridgeFollow` −260,
   `mitmBridgeInfeasible` +70, `mitmBridgeDiverge` +45.

**Its absence today is not evidence about the idea.** The whole subsystem it lived in
(`endgameIDAStar`, `rootMoveScores`, `pushDriver`, `adaptationReason`) is equally absent from
`modules/`, and no report or doc records an evaluation of it. So: the **soft/guidance** form was built and its
effect was never measured, and that remains the only untested variant in this family — the
static-graph **exact-oracle** form is now measured and provably redundant (above).

**Method note, the transferable part.** Two probes here pointed opposite ways. Measuring how strongly
the halves of a *known solution* couple said "viable"; measuring how many candidate halves must be
enumerated said "hopeless". Coupling in a solution you already possess says nothing about the cost of
finding it. Measure the frontier, not the solution — and check whether a supposed blocker is bounded
by a level cap before calling it structural.



- **Portfolio scheduler production deployment** — the `fast-portfolio-scheduler-plan.md` experiment ran to completion; verdict: **not production-ready** ([`reports/portfolio/portfolio-scheduler-decision.md`](../reports/portfolio/portfolio-scheduler-decision.md)). Every measured variant was slower than legacy on the published corpus. `schedulerMode: 'portfolio-experiment'` remains opt-in, offline-only CLI tooling for dev-time batch runs; this is not a future-work item, just a historical record of the decision.
- **Recipe cousins** (family generation) — intentionally deferred until sibling/cousin findings mature.
- **State-dominance/transposition caching** — correctness risk / payoff tradeoff unfavorable vs. other research.
- **Constant-tuning for repair-search mechanisms** — three independent well-motivated fixes for the stagnation plateau (burst length, elite-pool diversification, stagnation threshold) all failed empirically; this avenue is exhausted. Future work here should target the append-only wall or descent-aware probing, not more parameter tweaks.

---

## Standing verification rules

These apply to any future solver work before reporting complete:

1. **Published 160/160 is inviolable.** No change ships without `npm run solver:bench -- --check` AND a full-corpus before/after cost sweep (wall-time + nodes).
2. **Feature-keyed, never level-identity-keyed.** See `check:no-solver-level-numbers` ESLint rule.
3. **Negative results are first-class.** Every disproven idea gets written up in `reports/` like positive ones (see this doc for examples); no work is quietly abandoned.
4. **Memoization soundness is non-negotiable.** Any cache key must capture every state variable the cached value depends on. CLAUDE.md's own MST-scratch-buffer bug is the standing precedent — verify with differential testing (solver finds a solution, cache would have wrongly rejected it).
5. **Temporal clause:** distinguish "solved within X seconds" (uninterrupted attempt runtime) from "total wall time including restarts" in all timing reports.
