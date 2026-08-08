# Future Work

A compiled index of genuinely open, non-stale work — pulled from active planning documents and recent campaign reports. This file is the **live queue and status source of truth**; detailed strategy documents are linked below. Updated 2026-08-08.

> **Current solver frontier:** the old numbered campaign sequence is retained as history in
> [`solver-development-roadmap.md`](solver-development-roadmap.md), not maintained as the live queue.
> The must-cross forced-structure sequence is closed (steps 1–3 shipped, step 4 falsified). The best
> explicitly open rule-recognition leads are portal parity and structural derivation for must-turn,
> adjacent-turn, and surround landmarks below. Repair stagnation remains an investigation record
> with Stages 1–3 measured and Stage 4 re-scoped; descent-aware probing is its next evidence step.

---

## Solver development (active campaigns)

**Historical method reference:** [`solver-development-roadmap.md`](solver-development-roadmap.md) —
the campaign plan sequencing diagnosis → generalization → verify → refresh. Its campaign labels and
population counts are dated snapshots; this file is the current status index.

- **Campaign 0** — close out pending follow-ups from 2026-07-16/17 reports. **Completed 2026-07-17.** Three independent issues fixed: attraction-diversity near-miss testing, budget-fraction evaluation, and repair-probe budget-override bug.
- **Campaign 1** — `repair-close` rescue (139 levels as of latest re-cluster). **Completed 2026-07-18** with the `closeLengthGap` operator and its near-miss extension shipped (2026-07-17), plus infrastructure fixes to the repair probe (node-budget starvation). Net +28 genuine solves via `diff-baseline.mjs`. The deeper issue (repair-search's stagnation plateau converging to a frozen deficit signature and staying frozen) is addressed separately via [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) — this campaign fixed a symptom and identified the core problem; that plan targets the core.
- **Campaign 2** — `dfs-plain` exhaustion. **Historical phase concluded:** the known fragile-scoring family and the tested pruning/scoring generalizations did not explain the harder majority. Later work moved to admissible-order search, reserved-intersection reasoning, rule-recognition, oracle-labelled shadow evaluation, and differential diagnosis; use the open sections below rather than this old population bucket.
- **Campaign 3** — `repair-far` + robust hard cores. **Historical label retired:** subsequent work did attack the robust population through several new techniques, so “not yet started” is no longer accurate. No single replacement technique has closed the population; the concrete surviving leads are tracked below.

## Main-loop attempt-ordering starvation (2026-08-08, open — sized corpus-wide, no fix yet)

A fresh re-run of `2026-07-31-admissible-order-tier-node-starvation.md`'s methodology against
*current* hint provenance (not that report's stale 505/1700 baseline) found the same "earlier
tiers eat the whole ceiling" bug family recurring **inside the ordinary main loop's own profile
ordering**, not just in the isolated admissible-order tier: an attempt config can end up with
`nodesExpanded === 0, elapsedMs === 0` in the committed attempt log because earlier attempts in
the ladder consumed the entire cumulative node budget first — hand-confirmed via temporary
instrumentation on real levels. A corpus-wide, read-only census
(`scripts/stress/main-loop-starvation-census.mjs`, pure JSON cross-reference against the already-
committed baseline attempt logs and stored hint provenance, no new solving) then sized it: **34 of
975 unsolved corpus-2 levels (3.5%) are provably recoverable** — carry a validated, budget-fitting
hint whose exact config is currently zero-allocated — split into **14 with a hard, deterministic
(dfs/beam) match** and 20 with a softer, seed-dependent repair match. The much larger raw number
(87.1% of unsolved levels have *some* zero-node attempt) is mostly not a bug — it's what a fully
budget-exhausted ladder's tail looks like by construction, confirmed by a clean control (only 0.8%
of *solved* levels show any starved attempt, 0% recoverable). See
[`reports/2026-08-08-main-loop-profile-order-starvation.md`](../reports/2026-08-08-main-loop-profile-order-starvation.md)
for the full mechanism, the census, and why the hard/soft/not-recoverable populations must not be
conflated in any future measurement. **Next step, not yet done:** if pursued, scope a fix
candidate to the 14-level hard-match population first (the admissible-order tier's own
reserve-not-reorder template is the natural candidate), and budget for a full-population A/B, not
a spot check — this codebase has measured reordering a budget-limited search to be a coin flip
three separate times, and the admissible-order fix's own 24-level pilot pointed the wrong way
twice before the full 141-level population gave a trustworthy answer.

## Solver rule-recognition gaps (2026-08-05)

Prompted by a direct question — does the solver understand not just the hard move-legality rules
but their *implications and interactions*, the way an experienced human player does — answered by
the actual level designer/player, not guessed. Six questions, three real findings, three closed.
The must-cross forced-structure work above (steps 1–3 shipped, step 4 falsified) is the model for
how to carry any of these to completion: derive on paper, falsify against every stored solution
*before* writing solver code, and record a negative result as rigorously as a positive one.

### Open — portal parity (most promising, not yet properly investigated)

**The claim, confirmed by the designer:** "portal use may or may not be required to achieve
`reqLen`, based on parity — this is a key, but unspoken, aspect of levels which use portals."

**The mechanism, derived and partially checked:** every ordinary move flips a cell's `(x+y) % 2`
parity; a portal jump does too, or doesn't, depending on whether the two portal cells share
parity — for zero length cost either way. `PRUNE_PARITY` (`prune-gauntlet.ts`) already encodes
exactly this reasoning for portal-*free* levels, but is unconditionally disabled the moment a
level has any portal at all (`level.portalMap.size === 0` gates it) rather than adapted. A
level's overall achievable-length parity may therefore hinge on whether the path uses a specific
"parity-flipping" portal pair — a real, currently-unexploited constraint.

**Why this isn't shovel-ready yet:** a first attempt to census this against stored solutions had
a real methodology gap — portal pairs whose two endpoints are *adjacent grid cells* (96 of ~2,750
flip-parity pairs found in the corpus) are indistinguishable from an ordinary move using
coordinates alone, since stored hint files only record path coordinates, not per-step jump
flags. The resulting census (`~93-95%` directional match, not the required 100%) is inconclusive
in the "wrong for a boring reason" direction, not a real falsification. **Next step:** replay
every portal-bearing level's stored solutions through the real solver state
(`search-state.ts`'s `applyMove`/`lastWasPortalJump`, the same way
`mc-prune-soundness-check.mjs` replays must-cross solutions) to get the true per-step jump
determination, then re-run the same census with exact ground truth before proposing a prune.

### Open — surround-landmark "clean orbit" rule change (needs a product decision, not just engineering)

**The claim:** human players and level designers picture a surround landmark as satisfied by one
continuous orbit around it; the *current rules* accept any order/pattern of visits to its 8
neighbors, and the designer is "open to a rule change that enforces a clean orbit."

**What a census against real data found, and why this is not a quick fix:** of 2,027
surround-landmark instances across all three corpora, **1,573 (78%, across 752 of 834 levels)
are satisfied by scattered, non-contiguous visits in *every* currently stored solution** — the
loose reading is the norm, not the exception. Enforcing a clean-orbit win condition would
invalidate the large majority of the existing surround-landmark hint corpus and could make some
currently-solvable levels unsolvable outright (not yet checked — geometry permitting a scattered
solution doesn't guarantee a clean orbit exists at all). This is a genuine win-condition change
with corpus-wide consequences, not a solver optimization — it needs an explicit decision before
any implementation work, and a feasibility/regeneration-cost study either way.

### Open — must-turn / adjacent-turn / surround structural derivation (not started)

Must-cross got the full paper-derivation-then-falsify treatment (this doc's "must-cross" campaign
above) and it paid off. Must-turn, adjacent-turn, and surround landmarks have never gotten the
same treatment — there may be analogous forced-structure facts (e.g. a must-turn or adjacent-turn
landmark whose required chirality admits only one realistic approach cell in a given local
geometry) sitting undiscovered the same way must-cross's forced-neighbor fact was. Worth the same
census-first approach before assuming there's nothing there — must-cross's own "nothing found"
false start (this doc's must-cross step-4 entry, and the freeInt-dilation/axis-aware entries
below) shows the census can just as easily come back negative, which is itself valuable to know
quickly.

### Closed, no gap found

- **Must-turn chirality "only one square to turn into per approach direction"** — already
  exactly how `geometry.ts`'s `turnDirection` + the must-turn validation work; no code change
  indicated.
- **Filters (fixed-axis) adjacent to a must-cross cell** — already statically prevented by
  `domain/level-validation.ts`'s authoring-time check; this configuration can never reach a
  corpus.
- **Gate choice on multi-gate levels** — the designer's own read: "subject to many factors...
  it's unpredictable why someone would choose which gate to try." Not a minable heuristic.
- **Deliberate self-crossing placement ("look for a visually empty space")** — a soft
  scoring/ordering preference, not a provable hard rule; folds into existing scoring intuition
  (`scoring.ts`'s intersection-placement terms) rather than motivating a new mechanism, especially
  given that area's own documented history of being sensitive to retuning (CLAUDE.md's
  `SCORE_INTERSECTION_SETUP` gotcha).

## Repair-search stagnation escape (active investigation)

**Master reference:** [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) — the investigation into why `repair-search.ts`'s iterated-local-search restarts converge fast to a near-miss and plateau for 85-99% of budget.

- **Stage 1** — Instrumentation (capturing signed signatures + structural features). **Complete 2026-07-22.** Shipped as env-gated `PF_REPAIR_SIGNATURE_DEBUG=1` in `repair-search.ts`. Four findings: all plateaus are length-*short* (not long), pending must-turn dominates shape (13/15), exact signatures are diffuse but shape is concentrated (key on sign+mask, not magnitude), conditional overrepresentation analysis reveals specific revisit/tip cells. Shaped Stage 2 design by finding 3 (shape-keyed vs. magnitude-keyed).
- **Stage 2** — Signature-conditioned soft feature memory (plateau-penalty prototype). **Built 2026-07-22**, `enablePlateauPenalty` opt-in in `repair-search.ts`. Verdict: sound and effective at reshaping search, but **no solved-count gain** and a double-edged bestBadness effect with one severe near-solved-level regression. Kept default-off. Two follow-ups tested (arming-time near-solved guard, equal-work A/B) — both confirmed the effect is real misdirection, not a confound.
- **Stage 3 (soft)** — Scatter-search recombination via complementarity-guided guide selection. **Built 2026-07-22**, `enableRecombination` opt-in. **The only prototype to gain a solve** (R02239, 2/16 vs 1/16). Distance-only guide selection lost a solve (complementarity criterion load-bearing). Still net-mixed on near-miss quality with the same near-solved regression. Default-off.
- **Stage 3 (real)** — Reversible-operator relinking via anchor-splice. **Built 2026-07-22**, `enableRelink` + `relinkPaths`. Verified sound (copies guide suffixes through real gauntlet). **Does not help — zero solves, zero cost change — and underperforms soft approximation.** Reason: exact segment copies collapse under append-only legality; soft randomness escapes this trap that rigid copying cannot. Reverted. Exact-copy relinking is a structural dead end.
- **Turn-aware selective biasing** — Bias the one load-bearing move (exit from pending must-turn cell) only during detected must-turn plateau. It solves real isolated levels, including R02003, but the completed corpus-2 A/B and post-budget-fix rerun found an attributable effect of only about +1 solve, within the corpus noise floor; default-on promotion is **not justified**. An exclusive feature selector was also tested and rejected at net −2. The current flag-gated/default-off experiment tries both biased tiers, orders them with the `reqInt <= 3` predictor, and weights the shared probe budget 75/25. Remaining gate: a dedicated corpus-2 A/B of that implemented weighted form plus worst-case three-tier fallback latency. See [`reports/2026-07-23-turnbias-corpus2-ab-validation.md`](../reports/2026-07-23-turnbias-corpus2-ab-validation.md).
- **Stage 4** — Strategic oscillation across exact-count boundary. **Re-scoped 2026-07-22** based on Stage 1 findings: all 15 measured plateaus are length-*short*, never long — repair deadends before `reqLen` and never overshoots. So "oscillate back from overshoot" has no overshoot to work with. If pursued: frame as "reach a length the random walk can't extend to" (an extend/detour operator), not oscillation. **Not yet started.** Append-only-construction prerequisite gap applies either way.

**Standing conclusion from all stages (2026-07-22):** Soft mechanisms (randomized recombination, turn-aware biasing) move the needle; hard constant-tuning has failed three times; exact-copy relinking is a dead end; append-only prefix editing hits a wall on global length↔turn coupling. The one avenue not yet shown to hit the wall is **descent-aware probing** (shadow logging of what a mechanism would change on an otherwise-improving restart, per soundness rule 7). Pursue that over more bounded-operator variants before claiming exhaustion.

## Solver improvement research items

**Master reference:** [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) — items 1–5 probed against real data (2026-07-11), each with concrete verdict and priority. This is the research-inspiration ledger; nothing from here has shipped to solver code yet.

### Confirmed real, highest priority for build:
- **Homotopy-class path-signature metrics** (item #4). Real, measured, double-digit-percent effect on real data (16.6% of cross-homotopy-class hint pairs rated "similar" by current curation, using correct computation, not proxy). Strongest evidence-to-effort ratio. Targets must-cross-heavy levels specifically; should check whether it partitions the existing hint corpus into behaviorally-distinct clusters the current `featureDistance` metric (edge-Jaccard + crossing placement + must-cross order) misses.

### Classifier rerun complete — dropped:
- **Learned portfolio selection** (item #3), reframed as binary “will `repair` win.” **Closed
  2026-08-07:** the 725-level Corpus-2 rerun refutes the historical density rule (F1 0.010). The
  best five-fold single-feature rule, `mustCross >= 2`, reaches only F1 0.471 versus an always-repair
  F1 of 0.412, creates 237 false positives, and echoes the existing repair-eligibility policy.
  Do not build the classifier. The separate attempt-ordering-cost finding remains open only as a
  direct A/B question. See
  [`reports/2026-08-07-repair-winner-classifier-rerun.md`](../reports/2026-08-07-repair-winner-classifier-rerun.md).

### Needs harder redesign before buildable:
- **Nogood/dead-end learning** (item #2). Direct instrumented search found a real counterexample: a naive `(mpVisitedMask, mustCrossMask, remaining)` signature is provably unsound as a global nogood key in this codebase's actual state space. Any future attempt needs a richer signature (portal state, flipper state, edgeUsage per visited cell) or to restrict scope to what existing MST bounds already prove, which raises the bar from "mid-term, needs care" to "bigger design task." Probe the richer signature offline against corpus data before committing.

### Refuted, redirected:
- **Articulation-point pruning** (item #1). Original distance-vs-discrepancy premise refuted (negative correlation, explained). Redirected form (corridor-capacity bound on `reqInt`, different mechanism) not yet re-probed. Do that before implementing.

### Deprioritized:
- **State-dominance/transposition caching** (item #5). Correctness risk too high relative to current payoff evidence, and now also relative to every other item on this list having actual supporting data.

## Solution-space and level-family research

**Master reference:** [`family-and-scaling-research-possibilities.md`](family-and-scaling-research-possibilities.md) (original research proposal) and [`sibling-cousin-system.md`](sibling-cousin-system.md) (implementation status). The level-family half was picked up and built (most of it); [`req-length-sweep.md`](req-length-sweep.md) now covers the first controlled win-metric experiment, while the broader solver-scaling analysis is not yet implemented as a systematic pass.

### Open — ranked symmetry-cliff diagnosis

The selected-family evidence has been reconciled in
[`reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md`](../reports/2026-08-08-symmetry-orientation-sensitivity-synthesis.md).
The old universal variant-1 claim is stale after the elite-splice fix, while five diagnosed fragile
families now implicate different navigation/attraction score terms. **Next action:** run the
implemented read-only boundary tooling on the wide family trove, then apply transform validation,
equal-work attempt traces, first-divergence replay, and ablations to the highest-ranked independent
symmetry solve-status cliffs. Stop after either one intervention mechanism recurs across independent
families or the top five yield distinct signatures; that result decides whether to prototype a
bounded diversity pass. A production eight-orientation retry remains deferred unless diagnosis
shows a residual population dominated by irreducible tie/cutoff effects and a shared-budget race
beats score diversity on canonical solves and total work.

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
## Older loose-thread triage (2026-08-07)

This table makes an explicit `do / defer-until / close` decision for older report follow-ups that
otherwise read like an undifferentiated backlog. “Close” means the proposed follow-up is not worth
buying on current evidence; it can be reopened only with a new argument. “Defer” names the event
that makes reconsideration useful.

| Thread | Disposition | Revisit condition / next action |
|---|---|---|
| AI-assisted manual solving | **Defer** | Use only when automated differential diagnosis has isolated a first-divergence question it cannot answer. Do not schedule blind narrative solving as a campaign; the existing worked example did not validate it on a genuinely unsolved level. |
| Fixed repair-probe node budgets vs. `timeBudgetMs` | **Defer** | Revisit if a real UI/tool call uses a materially sub-30s budget on a repair-gated level and measurement shows the fixed probe dominates latency. Current production-default evidence does not establish harm. |
| Stress smoke-set id drift | **Completed 2026-08-07** | Replaced the four unresolvable ids with current pins: `R01189` (strongest current high-intersection/must-cross structural case), `R00134` and `R00087` (measured repair winners), and `S00103` (four real gates). The old `S00017` bug-specific identity could not be recovered, so its replacement is explicitly structural rather than falsely claiming provenance. `npm run stress:smoke` now holds 14/14 under 60 seconds. |
| Attraction-diversity sequential per-flag passes | **Close** | The powered combined-widening test produced only +1/100 and the sequential form costs up to five extra full passes. Do not buy that cost without a new cheap predictor or isolation mechanism. |
| Hot-path speed-change loss (`R00526`, not `R01403`) | **Closed 2026-08-07** | Root cause confirmed: `insOrd` restores cull order only after a complete phase, while goal and budget checks occur during the faster tree-order walk. A budget can end mid-phase before a high-score node is visited. Restoring score-order walk recovers R00526; the edit was reverted because the owner had explicitly accepted one lost solve for the measured speedup. R00526 remains a known-hard pin. |
| Tier-2/Tier-3 memory-bandwidth work | **Defer** | Tier 2 waits for a measured profile showing allocation pressure is again dominant and requires reentrancy/lifetime audits; Tier 3 waits for Tier 2 results. This is performance backlog, not correctness debt. |
| Pinned stress regression set | **Complete 2026-08-07** | Retained five solved canaries, added three structurally distinct current known-hard pins, and added `--update-baselines`. The writer refreshes only matching solved measurements and refuses improvements/flaky retries; expectations always require an explicit edit. Keep this minutes-long tier manual rather than adding it to CI. |
| Learned “will repair win?” portfolio classifier | **Closed 2026-08-07** | Corpus-2 rerun complete: historical density rule refuted; best replacement is modest, policy-confounded, and too false-positive-heavy. Classifier dropped; direct ordering A/B remains separate. |
| Systematic solver-scaling analysis | **Defer** | Revisit when a concrete solver change needs a scaling curve to choose a cutoff. Recipe cousins remain separately deferred until tighter family tiers yield a decision they could resolve. |
| Standalone hint-candidate CLI | **Keep** | It remains a distinct candidate-discovery entry point while the workbench ports its technique. Retire only after a parity/migration check proves every documented use is covered; coexistence alone is not cleanup debt. |
| `reports/hint-selection.json` | **Quarantine** | Git history traces it only to the 2026-07-30 bulk import; no current generator or consumer uses its schema. Do not treat it as authoritative. Delete or archive it only after comparison with current hint-curation output establishes whether it preserves unique evidence. |
| Firebase custom-claim cutover and emulator rule tests | **Defer** | Custom-claim work waits on production operations; emulator-backed tests wait for the next Firestore-rules change, as already documented in the security section. |

## What's explicitly out of scope / deprioritized

### Bidirectional / meet-in-the-middle search — CLOSED (2026-08-05): the frontier is not storable

**Settled, superseding the "genuinely open, not settled" verdict this section carried below.** The
2026-07-31 measurement's own uncertainty came from two sources, both now closed:

1. **The dedup key it reasoned about was unsound.** `scripts/stress/mitm-frontier-probe.mjs` keyed
   states on a plain visited-cell multiset plus the mustPass/mustCross/ints scalars — no move-order
   information. But `search-state.ts`'s general revisit rule (`edgeUsage[target] & axisBit` rejects
   re-entering a cell along an axis already used to enter it) applies to **every** cell, not just
   must-cross ones — this section's own table already flagged must-cross's first-pass axis as
   needing ~256 extra states of bookkeeping the probe didn't do, but the same gap existed for every
   other revisitable cell too, just unnamed. An under-keyed dedup key can only ever MERGE states
   that a sound one would keep distinct, so the old measurement's counts were a floor, not an
   estimate — biased toward the storable end of the range by construction.
2. **It died at depth ~20 from O(depth) replay cost**, well short of any tested level's actual meet
   depth (29-46), so the growth-ratio trend had to be extrapolated rather than observed directly.

Both fixed in the probe (full rewrite history in its own file header — validated against an
independent from-scratch BFS reference before being trusted, and against a real CI out-of-memory
crash before the memory profile was trusted): the key now covers every `SolverSearchState` field
that can affect future legality (per-cell edge-axis alongside visit count, `flipperUsedMask`,
`mustTurnMask`, `adjTurnMask`, `surroundMask`, `portalJumps`, `lastWasPortalJump`, and the incoming
move's axis at the current position), and the traversal is an explicit BFS holding only two
depth-layers resident at once (compact packed-integer snapshots + SHA-1-hashed keys, hydrated into
one reusable buffer pair per frontier entry) instead of a full DFS needing every depth simultaneously
or the original's per-entry KEY_SPACE reallocation.

**Result, 8 levels, `.github/workflows/mitm-frontier-sweep.yml`, cap 1,500,000 states/depth**
(`reports/stress/mitm-frontier-*.json`): four must-cross-heavy levels for continuity with the old
numbers (R00044, R03196, R03360, R02704) plus four clean flipping-filter-only levels spanning the
real 5-8 flipper-count range (R02211, R02190, R03171, R02575 — CLAUDE.md's documented "max 4
flipping filters" is published-corpus-only, same pattern as the portal cap; stress-corpus-2 reaches
8), to check whether the "fully dynamic" mechanic changes the answer.

| level | reqLen | flippers | meet depth | reached | final count | 2nd-to-last ratio |
|---|---|---|---|---|---|---|
| R00044 | 91 | 0 | 46 | 25 | 1,500,002 (cap) | 1.48 |
| R02704 | 65 | 0 | 33 | 32 | 1,500,002 (cap) | 1.42 |
| R03196 | 59 | 0 | 30 | 22 | 1,500,001 (cap) | 2.05 |
| R03360 | 60 | 0 | 30 | 19 | 1,500,002 (cap) | 2.06 |
| R02190 | 62 | 5 | 31 | 23 | 1,500,002 (cap) | 1.61 |
| R02211 | 58 | 7 | 29 | 23 | 1,500,003 (cap) | 1.77 |
| R03171 | 66 | 6 | 33 | 21 | 1,500,002 (cap) | 1.94 |
| R02575 | 64 | 8 | 32 | 19 | 1,500,002 (cap) | 1.85 |

**Every one of 8 levels hits the cap at 55-80% of its actual meet depth, and none shows the ratio
decaying toward 1** — R00044, the one level that reaches furthest relative to the old 2026-07-31
sample (which stopped it at depth 20 with ratio 1.49), is still at 1.48-1.63 through depth 22-25,
not visibly converging. Extrapolating even the most conservative observed ratio (~1.4) across the
remaining 10-21 depths to reach actual meet depth puts every tested level's true frontier at
hundreds of millions to low billions of states — solidly past the "unstorable by orders of
magnitude" end of the range this section previously left open, nowhere near the ~16M "storable"
end. **Flipping filters do not change the answer**: the four flipper levels' ratios (1.61-1.94,
mean 1.79) track the four flipper-free baselines (1.42-2.06, mean 1.75) closely — the mechanic's
own state contribution (`flipperUsedMask`, ≤256 values even at 8 filters) is negligible against the
per-cell edge-axis combinatorics that dominate growth regardless of mechanics.

**Verdict: meet-in-the-middle / bidirectional search is not a fit for Pathfinder.** Not a judgment
call — a measured one, on a sound key, across a sample spanning must-cross-heaviness, reqLen, and
the full real flipper-count range. This closes the whole thread below: the "one open question" was
the frontier size, the frontier size is not storable, and correcting the two things that left it
open only made the answer more decisively no, not less.

---

*(Original 2026-07-31 entry retained below for the derivation, the corrected-blocker analysis, and
the backward-oracle/soft-guidance findings, which stand independent of the frontier-size
conclusion above.)*

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
`modules/`, and no report or doc records an evaluation of it. **The soft/guidance form has now been measured too, and it is harmful (2026-07-31).** Its
route-following half was ported as a scoring term `SCORE_BACKWARD_BRIDGE` — `prep.goalNextArr`, the
canonical next cell on a shortest route to the goal, derived from the existing goal BFS — rewarding
that specific step rather than the distance gradient. On the published corpus, by how wide a window
it is allowed to fire in:

| endgame window | nodesExpanded | vs baseline |
|---|---|---|
| every move (as first ported) | 406,255,624 | **+620%** |
| `rSteps <= goalDist + 12` | 130,003,872 | **+130%** |
| `rSteps <= goalDist + 4` | 64,340,514 | **+14%** |
| disabled | 56,349,762 | — |

`solver:bench --check` stayed 160/160 throughout, so this is pure cost, not lost solves. **The harm
decreases monotonically as the term fires less, converging on baseline — the signature of a mechanism
whose best configuration is off.** There is no window in which it helps; it only does less damage. It
also independently cost `repair-search.test.ts`'s R02560 `closeLengthGap` rescue when enabled
(confirmed by zeroing the two constants and watching all 32 repair-search tests pass again).

The reason is structural and worth keeping: these puzzles must **wander** — median `reqLen` 99 against
a goal distance of ~10-20 — so a standing "take the shortest route to the goal" bias pulls toward
finishing early, which is exactly wrong. At the tight end it also duplicates `SCORE_FINISH_COMMITMENT`,
which already fires at `rSteps <= 4`. Reverted.

That plausibly IS the origin of the remembered "bidirectional doesn't work" verdict: this is the
variant that actually shipped, and it is genuinely bad. What was never separately tested is the
*retry-adaptation* half (`feasibleMeetSignal` -> endgame IDA*, budget bump, root-expansion floor),
which hung off a per-attempt adaptation subsystem the rewrite removed; porting it is a much larger
change than porting a scoring bias.

**Method note, the transferable part.** Two probes here pointed opposite ways. Measuring how strongly
the halves of a *known solution* couple said "viable"; measuring how many candidate halves must be
enumerated said "hopeless". Coupling in a solution you already possess says nothing about the cost of
finding it. Measure the frontier, not the solution — and check whether a supposed blocker is bounded
by a level cap before calling it structural.



- **Portfolio scheduler production deployment** — the `fast-portfolio-scheduler-plan.md` experiment ran to completion; verdict: **not production-ready** ([`reports/portfolio/portfolio-scheduler-decision.md`](../reports/portfolio/portfolio-scheduler-decision.md)). Every measured variant was slower than legacy on the published corpus. `schedulerMode: 'portfolio-experiment'` remains opt-in, offline-only CLI tooling for dev-time batch runs; this is not a future-work item, just a historical record of the decision.
- **Recipe cousins** (family generation) — intentionally deferred until sibling/cousin findings mature.
- **State-dominance/transposition caching** — correctness risk / payoff tradeoff unfavorable vs. other research.
- **Constant-tuning for repair-search mechanisms** — three independent well-motivated fixes for the stagnation plateau (burst length, elite-pool diversification, stagnation threshold) all failed empirically; this avenue is exhausted. Future work here should target the append-only wall or descent-aware probing, not more parameter tweaks.
- **`freeInt >= 1` bounded-cost reachability dilation** (the general form of the shipped
  `PRUNE_MC_RESERVED_WALL`) — built, sound, reverted: 1.88x faster at matched nodes but −2 solves
  there, net 0 at matched wall cost. The mechanism doesn't generalize past `freeInt == 0` because
  that's the only point where the wall changes the remaining problem's *topology*; at `freeInt >=
  1` a single paid hop reopens the far side almost everywhere. See
  [`reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md#the-follow-up-built-and-reverted-bounded-cost-reachability-at-freeint--1).
  Do not rebuild without a new argument — raising the cap targets a strictly smaller population at
  strictly higher cost, the wrong direction on both axes.
- **Axis-aware connectivity** (a fixpoint over `(cell, entry-axis)` states instead of cells) —
  built and reverted **twice**: −1 on an early 200-level sample, then −2 deterministic
  corpus-wide at matched nodes on the re-test. Sound (0 rejections across 3.7M replayed prefix
  states) and catches real, deep dead branches (18/238 of the labelled prune gap, 7.6%, above the
  ~6% ceiling measured for sound cheap structural tests) — and still doesn't produce solves. See
  [`reports/2026-07-31-reserved-intersection-wall.md`](../reports/2026-07-31-reserved-intersection-wall.md#follow-up-2-axis-aware-connectivity--76-of-the-dead-branch-gap-and-no-solves) and
  [`reports/2026-08-01-budget-vs-algorithm.md`](../reports/2026-08-01-budget-vs-algorithm.md). The transferable lesson: when ~74% of
  sibling branches are also dead, pruning one dead branch mostly redirects the search into
  another dead one — closing the prune gap has to happen in bulk, not one structural rule at a
  time.
- **Fresh-pocket-bridging bound** (bound the number of disconnected never-visited-cell pockets a
  route must pay to bridge into) — sound (0/242 alive branches wrongly rejected) but essentially
  inert: 1/238 of the labelled dead-branch gap (0.4%). On real candidates `freeInt` is almost
  always comfortably larger than the number of pockets needed, so fragmentation on this corpus
  doesn't translate to bridging cost. `scripts/stress/pocket-bridge-probe.mjs` is kept as a
  reusable offline-falsification template (commit `816ac7bb`), same convention as
  `axis-reach-probe.mjs`/`backward-exact-probe.mjs`.
- **Must-cross forced-edge propagation** (`mustcross-forced-structure.md`'s step 4 — "a cell
  adjacent to ≥2 must-cross cells has both axes forced, no other edge at it is usable") —
  **falsified**, not merely unbuilt: 5,206 violations over 225,094 checked edges against real
  stored solutions, plus 63,496 against an even broader version tried first. A qualifying cell has
  multiple structurally distinct, individually legal completion patterns that disagree even on
  its own visit count, so no fact about its "spare" edges survives every valid completion beyond
  what the shipped step-2 check already covers. A genuinely correct version would need real
  constraint propagation (enumerate and check compatible local patterns), not a static edge
  exclusion — see `mustcross-forced-structure.md`'s own step-4 callout for the full derivation.
- **CP-SAT (or any external constraint solver) as a production solving TIER, credited as "our
  solver solved it"** — considered and explicitly rejected 2026-08-05, not merely deprioritized.
  CP-SAT is correct, validated, and demonstrably solves levels the heuristic solver can't (22/45
  levels tried as of `reports/2026-07-31-cpsat-encoding-bug-and-external-hints.md`), and an
  injected-port architecture that would let it participate in `Solver.solve()`'s attempt ladder
  (Node/CLI context only — it needs Python/OR-tools, which the shipped browser bundle can never
  have) was designed and briefly implemented before being reverted. The reason: real players get
  their solves from the browser-side heuristic solver (live or pre-computed hints); a level an
  offline-only technique can solve but a real player's browser cannot is not a solve *by our
  solver* in the sense that matters, regardless of how the code is organized. CP-SAT remains
  exactly what it already was — an offline oracle and hint/insight source, hints tagged
  `EXTERNAL_SOLVER_ID` and excluded from any "what can our solver find" claim. The **live, still-open**
  half of this thread is using CP-SAT to inform a genuine internal (TypeScript, browser-safe)
  solving mechanism. The two former prerequisites are now **complete**: portal support grew the
  eligible pool from 212 to 397 levels, and the sharded atlas sweep grew the labelled set from 623
  branches/16 levels to 5,518 branches/397 levels. The remaining work is to propose and shadow-score
  a new browser-safe deduction against that atlas; the three candidates scored so far were sound but
  too narrow to integrate. See [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md).

---

## Standing verification rules

These apply to any future solver work before reporting complete:

1. **Published 160/160 is inviolable.** No change ships without `npm run solver:bench -- --check` AND a full-corpus before/after cost sweep (wall-time + nodes).
2. **Feature-keyed, never level-identity-keyed.** See `check:no-solver-level-numbers` ESLint rule.
3. **Negative results are first-class.** Every disproven idea gets written up in `reports/` like positive ones (see this doc for examples); no work is quietly abandoned.
4. **Memoization soundness is non-negotiable.** Any cache key must capture every state variable the cached value depends on. CLAUDE.md's own MST-scratch-buffer bug is the standing precedent — verify with differential testing (solver finds a solution, cache would have wrongly rejected it).
5. **Temporal clause:** distinguish "solved within X seconds" (uninterrupted attempt runtime) from "total wall time including restarts" in all timing reports.
