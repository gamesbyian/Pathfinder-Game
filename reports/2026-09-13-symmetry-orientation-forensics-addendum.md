# Symmetry/orientation forensics addendum: refinements after a second hostile pass

> **Status:** refinement of `2026-09-13-symmetry-orientation-forensics.md`
> **Date:** 2026-09-13
> **Decision:** keep exact symmetry as the cleanest causal control, but broaden the research object to **representation/frame sensitivity**. Split the next work into two different experiments: matched-action search equivariance and scheduler/exposure equivariance. Prefer lineage-anchored specimens where a sibling-discovered solution maps back to a referee-valid canonical path.

## What changed after a second pass

The first synthesis remains directionally sound, but four conclusions deserve strengthening or refinement.

1. Several asymmetry sources identified in August are still live on current `main`, not merely historical.
2. Exact rotation/reflection is only one especially clean member of a broader representation-sensitivity family; re-embedding produced some of the strongest historical flips.
3. The recommended next experiment should **not** mix matched-search divergence with scheduler starvation in one causal cohort.
4. Variant-derived canonical hints create a much stronger experimental design than generic trace comparison: follow a known-live lineage and ask exactly where the failing representation loses it.

## 1. The August asymmetry substrate is still live on current main

The August 11 audit should not be read as a description of a retired solver.

Current `modules/solver/encoding.ts` still defines the shared neighbor order as:

- East (`+x`)
- West (`-x`)
- South (`+y`)
- North (`-y`)

This is still an arbitrary coordinate-frame ordering available to stable ties and survivor construction.

Current `modules/solver/repair-search.ts` still derives production repair streams from the packed start-gate coordinate:

- primary stream from `repairPrimarySeed(startKey, seedSalt)`;
- must-turn stream from a different `startKey`-dependent formula;
- a research-only override can replace both with coordinate-independent streams.

Current `modules/solver/policy.ts` still contains literal frame-relative strategy variants:

- `perimeterCW` / `perimeterCCW`;
- `sideXLow` / `sideXHigh`;
- `sideYLow` / `sideYHigh`;
- `sideCommitment`.

Therefore the three major pre-frontier classes from the audit remain architecturally present:

1. arbitrary deterministic coordinate order;
2. coordinate-derived stochastic streams;
3. intentionally frame-relative strategy policy.

The unresolved question is not whether Pathfinder *can* distinguish equivalent frames. It plainly can. The unresolved question is which of those distinctions are useful diversification, which are harmless trace differences, and which repeatedly destroy capability.

## 2. The deeper research object is representation/frame sensitivity, not orientation alone

The July family experiments contain a stronger clue than the first report emphasized.

The re-embedded-cousin experiment kept puzzle content and the known witness unchanged while growing the surrounding grid. On `R02208`, the original embedding failed repair completely while all three larger centered embeddings succeeded, initially by one to two orders of magnitude less work. After the elite-splice repair bug was fixed and the family experiments were rerun, this finding **survived and strengthened**: the parent still failed while all three expanded embeddings solved by repair in roughly 9K-68K nodes.

This is important because re-embedding is not a dihedral symmetry. It changes the coordinate frame and available empty space while preserving the content/witness relation under translation.

The durable abstraction is therefore:

> **representation/frame sensitivity** = finite-budget capability changes under transformations that preserve a known solution relation while perturbing coordinate frame, surrounding space, ordering, thresholds, or scheduler response.

Exact symmetry remains the best *first* causal control because it preserves the entire puzzle semantics exactly. But once a mechanism is suspected, other witness-preserving transforms can discriminate hypotheses:

- if rotation and translation/re-embed both flip the same mechanism, suspect coordinate/frame dependence rather than chirality specifically;
- if only reflection flips it, inspect chirality/axis transformations and directional policy;
- if only grid growth flips it, inspect perimeter/coverage/density thresholds, distance fields, resource allocation, or open-space effects;
- if local-mutant/swap perturbations flip it while exact symmetry does not, suspect basin fragility to relative geometry rather than coordinate frame.

This gives the family library a more principled role: different relation types are **causal probes**, not just extra levels.

## 3. Exact internal symmetry remains a poor canonicalization target

A separate August measurement already answered the question "should we canonicalize symmetric states/problems because symmetry is common?"

The automorphism census found:

- **0 exact whole-level automorphisms across 2,002 procedurally generated research levels**;
- only **20/160 published levels** had any exact dihedral automorphism;
- only **4/160 published levels** produced the concretely exploitable shape of duplicated symmetric gate-root subproblems.

That makes broad symmetry canonicalization unattractive for solve-rate work even before considering implementation complexity. It would mostly optimize already-solved published content while missing the generated stress population entirely.

This strengthens the conceptual split:

- **orbit/canonicalization work** asks whether the search redundantly explores mathematically equivalent states;
- **representation-equivariance work** asks whether equivalent encodings cause materially different finite-budget decisions.

The current opportunity is overwhelmingly the second.

## 4. Variant-derived canonical paths turn the next experiment into lineage forensics

The August family-parent replay work is unusually valuable here.

Across the family trove, solutions discovered on variants were mapped/replayed against canonical parents and referee-validated before persistence. On Corpus 2 alone, **770 canonical levels went from zero hints to at least one hint** through this process. These are levels for which the cold canonical solver had never found a solution, but a related representation exposed a path that is valid on the untouched parent.

This suggests a better specimen filter for orientation/representation research:

> Prefer a current canonical failure for which a transformed sibling produced a path that maps back to a referee-valid canonical solution.

Then the experiment has a known-live lineage in canonical coordinates. Instead of merely comparing two huge traces and asking where they become different, instrument the failing canonical action around that lineage and ask:

1. when is the lineage's next child first ranked differently from its transformed counterpart?
2. when is it first pruned, deduped, culled, starved, or never generated?
3. what competing state/action displaced it?
4. was the displacement caused by score, stable order, dedup identity, width threshold, RNG indexing, or local budget ceiling?

This is much more decision-bearing than generic trace distance. It localizes *capability loss*, not merely behavioral non-equivalence.

R02248's August beam-threshold investigation is the proof of concept: once the recovered winning lineage was known, the decisive event was identifiable as a specific depth-17 dedup collision produced by a depth-16 threshold-timing difference.

## 5. Split the next work into two causal lanes

The first report grouped beam-retention, repair, and allocation-flavored symmetry cliffs into one selection scheme. That is too broad.

### Lane A: matched-action representation equivariance

Use only pairs where:

- the same concrete search action/configuration is run on both representations;
- the local node/work dose is matched and actually available;
- a mapped referee-valid known solution exists when possible;
- neither side is being explained merely by outer scheduler starvation.

This is the right lane for:

- score-component divergence;
- E/W/S/N or stable-tie divergence;
- beam generation/dedup/retention timing;
- known-live lineage loss;
- repair survivor-order and semantic-random coupling.

The primary endpoint is the **first capability-relevant non-equivariant event**, preferably defined relative to the known-live lineage rather than the first cosmetic trace difference.

### Lane B: scheduler/exposure equivariance

Handle `R00156`/`R02960`-shaped cases separately.

If the same eventual winning action is present in the ladder but one representation receives less work before cutoff, the causal question is orchestration economics:

- why did preceding stages consume different work?
- did the target stage receive the same nominal tranche but different real headroom?
- did failure/success of an earlier orientation-sensitive action alter reachability of later tiers?
- does equalizing the target action's dose remove the solve/fail cliff?

The endpoint is not first search-state divergence. It is **first exposure divergence** in stage reach, tranche ceiling, or cumulative work allocation.

Only after Lane B equalizes exposure should a remaining within-action disagreement graduate into Lane A.

This separation avoids repeating an old pathology in the repo: attributing a later solve difference to the wrong search mechanism because the surrounding orchestration contract differed.

## 6. Refined specimen hierarchy

For the next bounded campaign, rank candidates in this order:

1. **Current reproducibility:** parent/variant solve-status or large work cliff reproduces on current `main` under the intended production-like protocol.
2. **Known-live canonical path:** sibling solution maps back and referee-validates on the failing parent.
3. **Matched action identity:** same profile, width, diversity/retention mode, flags, seed semantics, and local work dose.
4. **Mechanism cleanliness:** avoid specimens whose historical identity is already layered with several unrelated regressions unless using them as observer-validation controls.
5. **Parent independence:** parent, not sibling row, is the inferential unit.
6. **Held-out reserve:** keep at least one qualifying parent untouched until a mechanism has been proposed from the discovery cases.

Under this hierarchy, R02248 becomes an excellent **positive-control specimen** because instrumentation should rediscover a known retention discontinuity, but it should not dominate discovery.

## 7. A better stop rule

The first report's "two independent parents plus one held-out" rule is still sensible, but it should be mechanism-specific and capability-relevant.

Advance an intervention only if:

- the same **earliest capability-loss mechanism** occurs on at least two independent parents;
- the proposed mechanism predicts the held-out parent's failure point before inspecting the full trace;
- a narrow intervention changes the predicted event in the intended direction;
- a matched population A/B gains solves or work efficiency without unacceptable collateral loss.

Do **not** advance merely because two traces first differ for the same superficial reason. For example, E/W/S/N tie order may differ on many levels while only sometimes causing a live lineage to die. The target is repeated causal loss, not repeated non-equivariance.

## 8. Refined intervention logic

The second pass changes the preferred responses slightly:

- **Fixed tie/order is recurrent but mostly harmless:** leave it alone. Search equivariance is not a product requirement.
- **Fixed tie/order repeatedly kills known-live lineages:** test bounded intentional order diversity or a group-consistent tie key, but compare against spending the same work on an ordinary alternate action.
- **Coordinate-derived repair seeds are the main source:** do not automatically canonicalize the seed. Compare semantic-keyed/canonical randomization against simply adding independent restart diversity; the latter may buy the same coverage more cheaply.
- **Survivor order converts common draws into different moves:** test semantic event-keyed draws or canonical mapped survivor ordering as research controls first. Production should only change if those controls reveal a recurring harmful bias and the replacement beats ordinary diversity.
- **Beam threshold timing recurs:** prioritize smoothing the discontinuity itself over symmetry-specific retries. A threshold mechanism sensitive to any small candidate-count perturbation is a general robustness target.
- **Re-embed/grid-frame sensitivity recurs without symmetry sensitivity:** inspect open-space/density/perimeter thresholds and distance-field terms rather than tie order.
- **Allocation is the cause:** repair scheduler economics. Do not spend solver-scoring complexity compensating for a stage that simply never received enough dose.

## 9. Updated bottom line

The strongest refined conclusion is:

> Symmetry is not the target. It is the cleanest perturbation instrument for a broader problem: Pathfinder's finite-budget capability can depend sharply on arbitrary representation/frame choices because ordering, stochastic streams, retention thresholds, directional policies, and orchestration are all representation-sensitive in different ways.

The next useful step is therefore not "make the solver symmetric." It is:

1. use exact symmetry to obtain clean paired instances;
2. choose pairs with a mapped known-live canonical path;
3. separate within-action search divergence from outer scheduler exposure divergence;
4. identify the first event that actually destroys or starves capability;
5. use re-embed/other witness-preserving relations as follow-up probes to distinguish coordinate-frame, chirality, space, and relative-geometry hypotheses;
6. only then build a narrow intervention and demand a fixed-work solve gain.

That programme is narrower than another family census, broader than an orientation bug hunt, and much closer to the actual goal: more stress-corpus solves.
