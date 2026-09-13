# Symmetry/orientation solver forensics: what equivalent-level disagreement actually teaches us

> **Status:** concluded-positive archaeology; one live experimental gate remains
> **Date:** 2026-09-13
> **Evidence window:** 2026-03 through current `main`
> **Decision:** orientation disagreement is a useful controlled perturbation of search, but there is no single "orientation bug". The highest-value remaining work is a current-code, cross-parent first-non-equivariant-decision experiment using the existing family/divergence/frontier observers. Do not respond by globally rotating production inputs or canonicalizing the state graph.
> **Live gate:** demonstrate one recurring first-divergence mechanism on at least two independent parents under matched work, or show that the best current cliffs remain mechanistically heterogeneous.

## Executive conclusion

Pathfinder has accumulated several genuinely different phenomena under the words *rotation*, *mirror*, *orientation*, and *symmetry*. Treating them as one problem has repeatedly produced attractive but false stories.

The durable lesson is stronger and more useful:

> Exact level transforms are a metamorphic oracle for finite-budget search. They hold puzzle difficulty constant while perturbing representation, ordering, policy frame, stochastic trajectory, frontier timing, and budget consumption. A solve/fail disagreement is therefore a microscope for locating where solver capability is being lost.

The repo already contains most of the machinery needed to use that microscope. What it does **not** yet contain is a completed, current-code, cross-family experiment that walks from semantic equivalence through score/rank/order/retention and identifies the first non-equivariant decision on multiple independent cliffs.

The evidence supports six distinct mechanism classes:

1. **semantic transform bugs** — real correctness failures under reflection have existed and were fixed;
2. **intentional directional policies** — CW/CCW and side-relative strategies are deliberately frame-sensitive;
3. **arbitrary deterministic order** — fixed E/W/S/N generation and stable ties choose different abstract branches after transforms;
4. **stochastic trajectory coupling** — repair historically derives streams from coordinates, and equal draws can select different abstract moves when survivor order changes;
5. **score/trajectory interaction** — position-sensitive scores can push low-slack levels into different basins even when every puzzle rule is transformed correctly;
6. **emergent retention/allocation discontinuities** — tiny, correct perturbations can move a frontier across a beam/dedup threshold or starve the same winning action of the work it needs.

The sixth class is especially important because it converts the vague statement "heuristic search is order-sensitive" into a concrete architectural fact: Pathfinder contains discontinuities where a small upstream difference changes *when* retention happens, which changes who competes with whom, which can erase a viable lineage.

## 1. March already contained deliberate representation asymmetry

PR #306 (`Improve symmetry derivation with confidence-gated structural bias`, merged 2026-03-08) is the earliest directly relevant solver artifact found in this pass.

The solver then computed a structural `symmetryModel` from mirrored/rotated feature agreement and, when confidence was high, used it to bias:

- gate ordering;
- structural move scoring;
- tie-breaking;
- portal-family switching penalties.

Most importantly, it invented a `preferredBreak` half for a symmetric level. When the signed load was effectively balanced, the fallback was deterministic: **left** for a vertical axis and **top** for a horizontal axis. The tie-break then preferred candidates on that half.

That machinery is historically instructive even though current code search finds no `preferredBreak`/old `symmetryModel` residue. It shows that representation-dependent symmetry breaking was once explicit policy, not merely an accidental property of later heuristic search. A mathematically symmetric level could be forced into a preferred coordinate half simply because finite search needed a branch choice.

This is not inherently wrong. It is the prototype of the distinction current research now makes between intentional diversification and accidental encoding bias. The error would be to confuse a useful arbitrary branch choice with evidence that the underlying puzzle prefers one orientation.

## 2. A real semantic reflection bug existed, and was fixed before the family campaign

PR #1152 (2026-07-04) replaced ambiguous `left`/`right` turn vocabulary with `cw`/`ccw` and fixed two reflection bugs. The editor's mirror operation had left stored turn direction unchanged, silently corrupting reflected must-turn/adjacent-turn constraints. Display transformation also failed to flip the rendered chirality cue.

This is the correct first category in every symmetry investigation: before discussing heuristics, prove the transformed problem is actually the same problem.

The later family generator is substantially stronger here. The August 11 symmetry-control audit records that symmetry generation uses the canonical geometry transformations for points, axes, and turn direction, transforms all relevant mechanics, and revalidates the transformed witness before accepting the sibling. Current evidence therefore does **not** support blaming modern family cliffs on a crude transform bug.

The practical lesson is to keep semantic equivariance as a metamorphic test layer, not to assume it forever because one generator audit passed.

## 3. The July 15 repair-orientation headline was mostly an implementation artifact

The first large symmetry-family campaign initially appeared to find a strong repair orientation effect. Four published repair-gated parents showed large orientation-dependent cost and success changes, and a 90-degree rotation briefly looked like a repeatable bad orientation.

That story did not survive better evidence.

The repair search's elite-splice near-miss pool had been silently inactive. Once that bug was fixed and the experiment was rerun:

- 3 of the 4 core repair-gated families lost their orientation-dependent repair failures;
- the apparent variant-1 directional tilt collapsed from 8/9 mixed families to 6/16, essentially chance-like;
- the full 38-family population shifted toward **more** mixed outcomes because repaired search now solved some, but not all, orientations that previously failed uniformly.

This is one of the most useful historical lessons in the whole line of work. The premise "equivalent representations expose search fragility" survived. The proposed explanation "rotation X defeats repair" did not. A broken mechanism changed the apparent orientation effect.

Any new symmetry result should therefore ask, in order: did the treatment truly run, did the relevant search path participate, was its budget actually available, and does the same cause survive a direct ablation or trace?

## 4. R02248 proved a genuine score/trajectory interaction in July, but it later became the wrong current-code flagship

The July 16 R02248 investigation remains a legitimate historical diagnosis for the solver revision it studied.

At that time the eight dihedral orientations split cleanly by rotation component. The hard orientations showed beam exhaustion/repair plateau behavior, and one-at-a-time scoring ablations found that disabling `SCORE_INTERSECTION_SETUP` rescued all four hard orientations. The interpretation was an interaction: position-sensitive early trajectory plus a strong revisit incentive caused an early crossing that a near-Hamiltonian, reqInt=7 level could not recover from. R01465 later reproduced the broad failure shape but implicated `SCORE_SURROUND_URGENCY` instead; Phase D found still other fragile families and score terms.

That already weakened any single-term story. The recurring signal was **fragile trajectory commitment**, not a universally bad coefficient.

More importantly, R02248's later current-code canonical failure had a different cause entirely.

The August 15 `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` investigation discovered that canonical R02248 had repeatedly cold-solved with the same 5K intersection-harvest beam through July 31, then stopped immediately after commit `80a5706`. Disabling only that prune restored the exact historical solve. The prune itself was sound on the recovered winning path.

The actual mechanism was a beam-retention timing discontinuity:

- with the prune ON, depth 16 produced 4,948 candidates, just **below** `beamWidth=5000`, so dedup/cull did not run;
- with the prune OFF, depth 16 produced 5,239 candidates, just **above** the threshold, so dedup/cull ran immediately and collapsed the pool to 144;
- one generation later the ON run's deferred pool had grown to 10,801 and then suffered a much larger collision-heavy collapse;
- at that later dedup, the eventual winning lineage collided with a slightly higher-scoring representative and disappeared.

So a **correct small prune made the solver worse by preventing an earlier cleanup**. This is an architectural discontinuity in the search-control policy, not a semantic defect in the prune.

That finding matters directly to symmetry work. A rotation or reflection can create the same class of small upstream candidate-count/order perturbation. When a solver has threshold-triggered retention, a representation change need not alter heuristic values very much to produce a solve/fail cliff. It only needs to move the frontier across the discontinuity at the wrong depth.

The July R02248 report should therefore be read as a historical score/trajectory case study, not as the current explanation for canonical-vs-sibling behavior. The August 15 report is the later authority for current-code R02248.

## 5. August 11 isolated deterministic-order and stochastic-order mechanisms directly

The symmetry-control audit identified four pre-frontier sources of orientation dependence in then-current code:

- intentional directional policies;
- fixed neighbor order;
- coordinate-derived repair PRNG streams;
- survivor-order interaction with random indexing.

The fixed shared neighbor order was E, W, S, N. Stable sorting preserved that order on equal scores/slack, so a transform could change the abstract tied child visited first without changing any semantic value.

Repair added another layer. Its production PRNG streams were derived from packed gate coordinates. A transformed gate therefore normally received a different deterministic stream. More subtly, even a normalized common stream is not enough if transformed survivor lists contain the same abstract moves in different order.

The bounded R02248 pilot proved that second mechanism:

- two mapped witnesses had zero semantic mismatches across 202 corresponding prefixes;
- the first observed ranking divergences were step 7 (beam/profile) and step 81 (repair/profile);
- under one explicit shared repair research seed, the mapped survivor **sets** were equal but their order differed at choice 0;
- at choice 14 the same random draws selected different mapped abstract moves solely because of that order;
- random-stream consumption diverged at choice 15.

This is high-quality causal evidence for a C→D chain: arbitrary deterministic ordering can induce stochastic trajectory divergence.

It is **not** yet population evidence. Both 100K matched-seed searches failed, and the experiment remained one family. The repo correctly resisted turning it into a production policy.

## 6. The repo now has the right theoretical distinction, but the causal programme stopped early

The August 24 research corrected the conceptual vocabulary:

- heuristic invariance does not imply search equivariance;
- same raw seed does not imply semantic random coupling;
- canonicalization removes redundant symmetric states but does not automatically remove representation-sensitive search;
- useful deliberate asymmetry should be separated from arbitrary harmful bias.

Current `docs/variant-level-research.md` gives an excellent first-divergence ladder:

1. legal successor mismatch -> semantic/correctness;
2. hard-prune or heuristic mismatch -> representation/heuristic;
3. values agree but rank/order differs -> tie/order;
4. ranks agree but retained set differs -> retention/dedup/truncation;
5. deterministic structure agrees but random trajectory diverges -> distinguish semantic random-key mismatch from ordinary PRNG-consumption-order mismatch.

Crucially, that same current document still lists **first-divergence diagnosis for symmetry cliffs** as a research priority. That is accurate. The work was specified more completely than it was executed.

The August 25 `paired-deterministic-trace` tool does not close the gap. It intentionally rejects beam and repair, because it was built for DFS/admissible operational comparisons. That makes sense for its original task, but the most informative symmetry cliffs have repeatedly involved beam retention and repair trajectory behavior.

## 7. Orientation sensitivity is broader than physical level rotation

The refreshed September technique census contains large disagreement populations between literal CW/CCW beam and DFS strategy pairs. Coarse static features explain these disagreements weakly or inconsistently: the beam pair remains weakly separated; the leading DFS feature strengthened but changed identity over time.

This is not the same experiment as rotating a level. It is still relevant because it demonstrates substantial capability ownership by **search frame/direction** that is poorly predicted by coarse counts and densities.

That reinforces a useful distinction:

- transformed-level siblings ask whether an isomorphic problem representation changes search outcome;
- CW/CCW or side-relative policy pairs ask whether intentionally different search frames produce complementary capability.

The first is a diagnostic control. The second may be a portfolio asset. They should meet only after the mechanism is understood and fixed-work marginal value is measured.

## 8. What the historical evidence now says about the main candidate explanations

| Candidate explanation | Current reading | Confidence |
|---|---|---|
| Broken rotation/reflection semantics | Has happened historically; current family generator/geometry path is well tested | High |
| One universally bad physical orientation | Falsified by the 38-family rerun and cross-corpus expansion | High |
| One universally bad scoring term | Falsified; fragile families implicated different terms | High |
| Coordinate-dependent scoring can create orientation cliffs | Demonstrated historically on multiple fragile families | High |
| Fixed direction/tie order can break equivariance | Demonstrated in code; localized in R02248 pilot | High |
| Coordinate-derived RNG alone explains repair cliffs | Insufficient; shared seed still diverges through survivor order | High |
| Beam retention timing can magnify tiny perturbations into solve/fail cliffs | Directly demonstrated by the R02248 prune regression | Very high |
| Canonicalization is the obvious fix | Unsupported; exact internal automorphisms are rare in generated corpora and canonicalization addresses a different problem | High |
| Rotate-and-retry should be a production tier | Not earned; requires its own fixed-work scheduler case | High |
| Symmetry disagreement can identify fragile vs robust failures | Supported; perturbation-fragile and perturbation-robust families separate cleanly | High |
| Current symmetry first-divergence mechanism is fully understood population-wide | No; this is the remaining research gap | High |

## 9. The next experiment should be smaller and sharper than another symmetry census

Do **not** generate another huge family library. Query the existing family dataset and choose a small number of independent, current-code cliffs with clean provenance.

Selection should deliberately cover different observed shapes, for example:

- a beam-retention cliff where the same action has adequate matched work on both siblings;
- an allocation-flavored cliff where the same winning action is offered on both sides but one side is starved before reaching the successful dose;
- a repair-sensitive cliff after excluding cases whose historical signal depended on the dead elite-splice implementation.

Do not hard-code R02248 as the primary specimen merely because it is famous. Its history now contains at least two distinct mechanisms and makes it useful as a regression/observer validation case, but potentially poor as the cleanest new causal specimen.

### Required trace

For each selected parent/variant pair, inverse-map every event to canonical coordinates and stop at the **first non-equivariant decision**. Record enough information to classify that event, not a giant full-tree dump:

- corresponding state identity / semantic masks;
- legal candidate set after inverse mapping;
- hard-prune verdict and reason;
- score components, not just total score;
- pre-sort generation order;
- post-sort rank, including whether the distinction is a true score tie;
- dedup key and competing representative;
- beam-width/retention threshold state and pool size;
- retained/cut status of any known-live lineage when available;
- cumulative `workSpent` and local action/tranche ceiling;
- for repair, semantic random event key or, failing that, explicit common research draws plus mapped survivor order.

The existing `family-pair-divergence`, semantic snapshot comparator, beam research observer, winning-lineage survival tooling, and repair choice observer should be composed rather than replaced.

### Controls

Use the same solver commit, action identity, total work envelope, and parent-level selection rule. Exact transformed siblings are correlated observations; the independent unit is the parent.

Directional strategies must be transformed or explicitly annotated as intentional asymmetry. For randomized repair, same raw seed is only a weak control; if the question reaches pathwise random divergence, use semantic/counter-based event keys or otherwise pair corresponding decisions explicitly.

### Stop/advance rule

Stop the mechanism-localization campaign when either:

1. the same earliest mechanism recurs on **at least two independent parents** and survives one held-out parent/family check, earning a bounded intervention; or
2. the best current cliffs remain mechanistically heterogeneous after a small prespecified sample, in which case symmetry remains a diagnostic selector rather than a direct solver-fix premise.

No intervention should advance merely because it makes transformed traces look prettier. It must recover solves or reduce work at fixed overall budget without unacceptable collateral loss.

## 10. Intervention should follow the mechanism, not the word "symmetry"

If the recurring cause is:

- **semantic mismatch:** fix correctness and add a metamorphic invariant test;
- **equal-score fixed ordering:** test bounded order diversity or a group-consistent tie perturbation at equal work;
- **coordinate-relative score drift:** test a narrowly conditioned invariant/equivariant alternative or controlled score diversity, not a global retune;
- **beam retention discontinuity:** alter retention timing/threshold mechanics or add a targeted retry, then population-A/B it;
- **repair survivor-order/RNG coupling:** compare semantic-keyed randomization or intentional randomized ordering against ordinary restart diversity;
- **budget starvation:** fix allocation/scheduler economics rather than search semantics;
- **balanced complementary directional behavior:** keep it as deliberate portfolio diversity only if marginal solve/work value earns its cost.

This mapping is the main practical payoff of the archaeology. "Try the other orientation" is a symptom-level workaround. The interesting thing is what the successful orientation perturbed inside the solver.

## 11. Documentation corrections surfaced by this pass

Two historical layers should not be read as current authority without their later corrections:

1. the July 15 repair-orientation headline predates the elite-splice repair and was largely invalidated by the rerun;
2. the July 16 / August 8 R02248 score-orientation framing predates the August 15 discovery that its later canonical failure was caused by `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` interacting with threshold-triggered beam dedup timing.

This report does not erase those historical diagnoses. Both are useful because they show how the same outward symptom can acquire a different cause as the solver evolves.

The current authority in `docs/variant-level-research.md` is already methodologically ahead of those old reports: it treats symmetry cliffs as evidence to be localized, not as a ready-made rotate/retry strategy.

## Bottom line

The repo understands **what kinds of things can cause orientation disagreement** much better than it understands **which one is responsible for today's best independent cliffs**.

That is the remaining gap.

The next useful result is not another statement that orientation matters. It is a short table of current parent/variant pairs where each row says:

> first non-equivariant event = X; this event kills/preserves the live lineage via Y; the same mechanism does/does not recur on an independent parent.

If that table produces a repeated mechanism, it gives solver development a new premise. If it produces heterogeneous mechanisms, that is also valuable: symmetry becomes a cheap fragility detector that routes cases toward scoring, retention, repair, or allocation work without pretending they share one fix.
