# Representation-sensitivity fresh forensics: the live question starts after mapped rank divergence

> **Status:** concluded-positive diagnostic synthesis; no solver-policy change authorized.
> **Last evidence:** 2026-09-13 — clean-room archaeology from March through current `main`, including the 2026-09-03 symmetry first-divergence pilot and current research authorities.
> **Decision:** the broad semantic/rank first-divergence question has already been tested and closed negative in its known-solution replay form. The smallest materially new symmetry experiment is current matched-search **lineage survival** and, separately, scheduler **exposure** on genuine solve/work cliffs.
> **Remaining gate:** reopen only with current-code parent/transform pairs where a referee-valid mapped solution exists and either (A) the same isolated action at matched dose loses that live lineage differently, or (B) the production ladder gives the same useful action materially different exposure. Do not rerun the September replay/rank pilot unchanged.

## Executive conclusion

A fresh pass changes the state of this research in one important way.

The repository did **not** stop before running an orientation first-divergence experiment. On 2026-09-03 it explicitly promoted that gate, ran a six-trace / three-parent mapped-path pilot, and closed the tested form negative. The pilot used families with historical within-family node-cost cliffs of 124x to 722x. Corresponding legal moves, mechanic state, lower bounds, prune verdicts, neutral metrics, and scores remained equivariant throughout every traced known-solution path. The first differences were deterministic ordering among equal-score successors, but the sign of those rank differences did not distinguish cheap from expensive transforms.

That result is real and should not be repeated with more families merely to obtain a larger table.

But it also leaves a sharply bounded unanswered question. `family-pair-divergence.mjs` is a **path replay/rank diagnostic**. It takes a successful stored path, maps it between the variant and parent, replays corresponding prefixes, evaluates legal successors/prunes/scores, and compares the rank of the known continuation. It does not execute the real beam/repair search and observe when that lineage is actually retained, deduplicated, width-culled, diversity-culled, randomly displaced, or starved by the production ladder. The September report itself names exactly this as the only earned reopening premise: current matched-search retention/solve evidence connecting one recurring representation-sensitive choice to harm.

So the live scientific question is no longer:

> Where do two transformed known-solution traces first differ?

It is:

> On current code, when the same valid solution lineage is available to two isomorphic representations, where does the actual finite search first destroy or deny that capability, and does the same causal loss recur across independent parents?

That distinction matters. A trace can rank tied candidates differently without affecting capability. The research target is the first **capability-loss event**, not the first observable difference.

## 1. What is already closed

### Semantic transform correctness as the general explanation

A real reflection bug existed historically: mirrored must-turn / adjacent-turn chirality was once left unchanged. The later `cw` / `ccw` migration fixed that class, and family generation now uses the canonical transform primitives and validates transformed witnesses. Semantic transform correctness remains a metamorphic invariant worth guarding, but current family cliffs should not be presumed to come from a crude rotate/mirror bug.

### One globally bad orientation

The July symmetry campaign briefly suggested a special physical orientation. That conclusion collapsed after repair's elite-splice pool was found silently inactive and the experiment was rerun. The full corrected 38-family picture contained many mixed families but no stable universal bad transform; the earlier variant-1 tilt fell to chance-like behavior.

### One universal scoring defect

Historical fragile cases implicated different score terms. R02248 and R01465 showed broadly similar trajectory fragility but different single-term unlocks; later fragile-group work widened that heterogeneity further. Representation sensitivity can expose scoring fragility, but it does not support one global score-term repair.

### Simple deterministic tie order as the explanation for transform cost cliffs

This is the key September closure. The 2026-09-03 first-divergence pilot examined `P00146`, `R00541`, and `R03341`, comparing cheap and expensive successful transforms with historical max/min node ratios of 124x, 188x, and 722x. All six traces were semantically equivariant. Rank divergence arose only among equal-score successors. Yet the direction of the tie advantage was opposite between cheap/expensive in one family and identical in both sides of the other two. The tie-order difference was therefore real representation diversity but not an explanation of those cost cliffs.

Do not reopen this by merely replaying more stored solution paths through `tracePathRanks`.

### Broad state canonicalization as the obvious response

A separate exact-automorphism census found no exact whole-level dihedral symmetries in 2,002 procedurally generated research levels and only four published levels with genuinely duplicated symmetric gate-root branches. Internal automorphism canonicalization therefore attacks a different and almost absent problem in the stress population. Representation equivariance asks why relabelling an isomorphic *whole input* changes finite search; it is not the same as removing duplicate symmetric states within one input.

## 2. What the September pilot did not test

The implementation matters here.

`family-pair-divergence.mjs` obtains a successful variant path from a stored result, inverse-transforms it to the parent, validates both paths, then calls `tracePathRanks` and constructs semantic snapshots at each corresponding prefix. For every legal child it computes prune verdicts and `scoreMove`; it compares mapped snapshots and score-flag ablations.

That is an excellent test of semantic and local ranking equivariance. It is not a simulation of the actual finite frontier.

It therefore cannot answer, by itself:

- whether the mapped live candidate is present in the generated beam pool;
- which state-dedup key it collides under;
- which competitor survives that collision;
- whether a beam-width threshold causes dedup/cull to happen at a different generation;
- whether mechanic-bucket or diversity retention changes its survival;
- whether an equal-rank ordering difference matters only after thousands of frontier interactions;
- whether repair sees equal survivor sets in different order and later maps the same draw to a different move;
- whether one representation's target action receives less work because earlier stages consumed the envelope differently.

Those are precisely the mechanisms that have produced real capability changes elsewhere in the solver.

## 3. Why actual retention is the right next layer

The strongest non-symmetry evidence in the repository demonstrates that tiny, semantically correct perturbations can turn into solve/fail changes at the retention layer.

The R02248 `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` regression is the canonical positive control. A sound prune reduced one frontier just enough to land below a 5K threshold, deferring dedup/cull by one generation. The resulting larger next frontier created a different collision population and killed the eventual winning lineage. A later attempt to dedup every generation exposed a second fact: even with timing normalized, greedy top-1 dedup could discard the globally useful lineage in favor of a locally higher-scored competitor. Near-tie retention then recovered R02248, but population A/B showed the intervention itself had gains and losses and required a dead-last recovery form.

This is a much stronger model of what representation sensitivity may be doing than "one direction is scored worse." A rotation may preserve every local semantic and score value yet alter generation order, collision membership, threshold timing, survivor order, or work consumption enough to expose the same kind of discontinuity.

The fresh pass therefore treats the September negative as a **filter**: local semantics and raw score are lower-priority suspects unless new current evidence contradicts that result. Retention and exposure are now the earned layers.

## 4. Add a missing control: structural interface cost

The August theoretical work identified another distinction that should be explicit in any new study.

An isomorphic rotation can have a different cost under a fixed geometric processing order if the induced frontier/interface width differs. That is not arbitrary compass bias; it is a structural computational interaction between geometry and the algorithm's decomposition order.

Before attributing a current orientation cliff to arbitrary representation conventions, record a prespecified geometry-only interface proxy when cheaply available, such as row-major versus column-major frontier width/profile or the minimum over a fixed ordering family chosen before observing solve outcome.

Interpret cautiously:

- unequal interface cost can explain some runtime asymmetry without excusing semantic bugs;
- equal interface cost strengthens the case for arbitrary order/retention/randomness;
- neither result proves search equivariance.

This control was absent from the September mapped-path pilot and should be cheap to add to specimen characterization before expensive tracing.

## 5. The two live causal lanes must stay separate

### Lane A: matched-action representation equivariance

This lane asks whether the **same isolated search action** loses useful capability differently under two exact transforms.

Hold fixed:

- current solver commit;
- normalized action/config identity;
- scoring profile and directional policy after correct transform interpretation;
- beam width / retention mode or repair mode;
- feature flags;
- local `workSpent` ceiling;
- research RNG semantics where repair is involved.

Prefer a pair where the successful transform's solution inverse-maps to a referee-valid canonical solution. That mapped path is a known-live lineage label only; it must not guide search.

Run the real search with default-OFF observation. Follow support for the known-live prefix family through boundaries such as generated, hard-pruned, dedup-removed, post-dedup, score-width-culled, mechanic/diversity-culled, repair survivor choice, and final exhaustion/censoring.

The first decision-bearing event is where one side loses the known-live lineage and the other side still preserves corresponding support, not merely where candidate rank numbers differ.

### Lane B: scheduler/exposure equivariance

This lane asks whether isomorphic representations cause the same useful action to receive different opportunity.

Historic R00156/R02960 behavior is the prototype: the eventual sibling-winning technique was also offered on canonical, but canonical was cut off below the work the sibling needed. That is allocation evidence, not automatically an internal search-equivariance defect.

Record:

- target action offer and eligibility;
- stage reach / skip / starvation / exhaustion;
- work consumed before target action;
- remaining headroom at dispatch;
- target action's actual `workSpent` on both sides;
- isolated matched-dose result for that target action.

If equal isolated exposure eliminates the transform difference, the cause belongs to scheduler economics. Do not send it back into score/tie/beam forensics.

## 6. Use current outcomes, not July's famous families by habit

The September pilot selected families using **historical** node-cost cliffs and explicitly noted those outcomes were not current `workSpent` allocation evidence. A fresh experiment should not simply repeat `P00146`, `R00541`, and `R03341`.

Likewise, R02248 should not be the discovery population. Its solver history contains multiple genuine mechanisms across revisions. It is valuable as an instrumentation positive control because a correct observer should be able to reconstruct its known lineage-loss mechanism on the historical/current-compatible fixture. It is a poor sole basis for inferring a new population mechanism.

The discovery cohort should be selected from a **fresh current-main rescreen of existing symmetry families**, with no new family generation unless the existing trove fails to supply enough eligible parents.

### Lane-A eligibility

For a parent to enter the inference set:

1. exact symmetry relation with validated transform metadata;
2. current isolated action/config run under a fixed matched dose differs materially in solve or machine-independent work between parent and transform;
3. the successful side has a path that inverse-maps and referee-validates on the failing/expensive side;
4. the target action actually participates on both sides;
5. the difference is not explained first by unequal scheduler exposure;
6. parent is the independence unit; multiple siblings from one parent are within-family evidence, not extra `n`.

### Lane-B eligibility

1. exact symmetry relation;
2. production-ladder exposure differs materially for the same action identity;
3. successful side demonstrates the dose required;
4. isolated matched-dose comparison is feasible;
5. no claim about internal search is made until exposure is equalized.

This selection rule deliberately excludes the September pilot's "cheapest versus most expensive successful historical transform" design unless those pairs still qualify under current code.

## 7. Known-live lineages are now unusually cheap and abundant

The variant-family programme produced a major resource that the September pilot used only as replay input, not as a real-search survival label.

The parent-hint replay campaign checked hundreds of thousands of variant hints and referee-validated accepted paths on canonical parents. In Corpus 2 alone, 770 canonical levels went from zero hints to at least one because a structural variant discovered a path that could be accepted on the untouched canonical level.

This is exactly the evidence substrate needed for lineage-anchored search diagnostics:

- the canonical solver need not have discovered the path itself;
- the path is independently referee-valid;
- provenance identifies the variant discovery relation;
- the observer can label prefixes without changing candidate generation or ranking.

Do not waste this advantage by comparing only aggregate solve counts.

## 8. The observer substrate already exists; compose it instead of rebuilding it

The August observation work added default-OFF beam/repair research seams specifically to answer where known-valid lineages disappear. The beam observer records boundary stages including incoming frontier, generated candidates, hard-prune removal, dedup removal, post-production dedup, score-width cull and diversity cull, with competitor/removal context for known-supported candidates. Repair has independent research controls for seed normalization and survivor/choice observation.

The same work explicitly validated observer OFF/ON behavior parity and treated known solutions as labels, never guidance.

The September orientation pilot used the lighter replay seam instead. That was appropriate for its prespecified semantic/rank question. The next experiment should now compose:

- family transform mapping / `family-pair-divergence` semantics;
- referee-valid parent-replayed variant paths;
- beam winning-lineage survival observation;
- repair survivor/choice observation when repair is the implicated action;
- canonical lifecycle / `workSpent` telemetry for exposure.

Only add instrumentation if a selected current pair reaches a boundary the existing observers cannot classify.

## 9. Exact experimental sequence

### Stage 0: current rescreen, no mechanism inference

Query the existing family trove for symmetry parents with at least one variant-derived path accepted on the parent. Re-run only the parent and exact symmetry siblings needed to classify **current** outcomes under current `main` and the current work model.

Partition results into:

- matched-action solve/work cliffs;
- production-exposure cliffs;
- no current cliff;
- ambiguous/wall-censored.

Historical outcomes may prioritize candidates but cannot establish current membership.

### Stage 1: positive-control the observer

Use a known lineage-loss fixture such as R02248's documented beam retention regression at a compatible revision/configuration. The tooling should identify the expected loss boundary and competitor context. If it cannot rediscover a known causal chain, stop and fix measurement before interpreting fresh families.

### Stage 2A: Lane-A discovery

Prespecify two independent current parents, one transform pair per parent. Trace the known-live lineage under one exact matched action and dose.

At every boundary retain only the information needed to classify support loss:

- mapped prefix/support identity;
- candidate set and generation order;
- prune verdict/reason;
- score components and exact tie status;
- dedup key and competitor score/support;
- pool size, width and whether a retention trigger fired;
- retained/cut support;
- cumulative and local work;
- for repair, mapped survivor set/order and semantic/shared research draws.

Stop each trace at the first **capability-loss** event unless later context is necessary to prove causality.

### Stage 2B: Lane-B discovery

Prespecify two independent exposure-cliff parents if available. Reconstruct stage lifecycle and work allocation. Then rerun only the target action at the successful side's required matched dose on both representations.

If the cliff disappears, classify scheduler/exposure and stop. If it persists, that pair may graduate into Lane A.

### Stage 3: held-out prediction

A mechanism is not promoted because it appears twice after inspection. Before opening the third parent's detailed trace, state a falsifiable prediction of the capability-loss boundary, for example:

> The mapped live lineage will remain score-equivalent through generation N but disappear during a delayed beam dedup triggered one generation later by a width-threshold crossing.

or:

> The isolated action will solve both orientations at matched dose; production failure will be entirely attributable to earlier-stage work consumption reducing target exposure below X.

Then inspect the held-out parent.

### Stage 4: intervention only after prediction

Intervene on the demonstrated mechanism, not on "symmetry" generally.

Possible mappings:

- recurring greedy dedup loss -> bounded retention alternative or targeted retry;
- threshold-timing discontinuity -> retention-trigger redesign or recovery tier;
- repair survivor-order/RNG coupling -> semantic-keyed/randomized ordering only if it beats ordinary restart diversity at equal work;
- scheduler starvation -> allocation change, not score change;
- structural interface-cost asymmetry -> search-order/decomposition diversity only if fixed-work marginal solves justify it;
- heterogeneous balanced losses -> retain as finite-budget diversity; no canonicalization debt.

Every intervention must compete against the simplest alternative use of the same work.

## 10. Advance and stop rules

Advance only if all are true:

1. the same **capability-loss mechanism**, not just the same rank divergence, appears on at least two independent parents;
2. a held-out third parent behaves as predicted before full post-hoc inspection;
3. the mechanism is live on current code under current work accounting;
4. the proposed intervention has a plausible fixed-work advantage over simpler diversity/retry allocation.

Stop and classify orientation as a diagnostic/diversification signal if:

- current cliffs vanish under the fresh rescreen;
- current cliffs split between unrelated mechanisms;
- the only recurring difference is harmless equal-score ordering;
- transform outcomes become equal under matched action exposure;
- structural interface cost explains runtime differences without a recoverable capability-loss mechanism;
- an intervention merely moves wins/losses around at equal or worse total work.

## 11. Implications for the live research queue

This fresh pass does **not** justify inserting a broad symmetry project ahead of current WS2 work. The current canonical queue is pursuing stronger directly solve-bearing class-2/class-4/class-5 gates. Representation sensitivity remains an independent bounded diagnostic opportunity.

What it does justify is correcting the historical research state:

- "orientation first divergence has never been run" is false;
- "tie order is the likely explanation" is not supported by the September pilot;
- "the whole symmetry question is closed" is also too strong, because the September report itself left current matched-search retention/solve evidence as the explicit reopen condition;
- the next earned rung is lineage survival / exposure, not another mapped-path replay and not another broad family census.

The cleanest use of this work is therefore a **small opportunistic gate** when current family evidence supplies two or three eligible exact-transform cliffs, rather than a standing mandate to generate more data.

## 12. Bottom line

The useful abstraction remains representation/frame sensitivity, but the repository has already done more of the causal ladder than a first archaeology pass suggested.

Exact transforms have successfully ruled out broad semantic and score mismatches in at least one targeted multi-parent pilot. What remains scientifically interesting is the nonlocal part of finite search: retention, collision competition, stochastic survivor mapping, and work allocation.

The next good symmetry experiment should therefore look less like a symmetry study and more like a **known-live lineage extinction study with an exact-transform control**.

That is the point where representation sensitivity can still teach us something new about why Pathfinder loses solves.