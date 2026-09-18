# A / D1 / F3 consumer-contract census

Date: 2026-09-17
Status: concluded read-only census
Base: verified Phase 3 head `a8a3cfd1097439013f881c27dd6b7b9c660520dc`

## Question

Do three technically unrelated positive research findings stall for the same architectural reason: a missing observation-to-decision contract? The census deliberately treats separator/decomposition (A), future-intersection commitment realizability (D1), and topology side descriptors (F3) as separate mechanisms and uses a common descriptive schema only to make the comparison falsifiable.

The common schema is not itself a proposed solver API.

## Shared current decision boundaries

The current solver already has decision-bearing seams without a new global subsystem:

1. **candidate legality / hard pruning** while extending a reached state;
2. **candidate scoring and ordering** before beam selection;
3. **beam retention / bucket retention / coarse-state merge** after generation;
4. **search-attempt scheduling/escalation** outside the local beam loop.

Beam search reconstructs the real prefix/state, generates candidates, applies existing legal/sound rejection tests, scores survivors, then retains a bounded frontier. Its state already carries path/prefix identity, visited/revisit information, intersection count, required length/goal/mechanic state and reachability structures. A new fact therefore does not need a generic blackboard merely to reach a local rank/retain decision. Hard prune remains a stronger authority and needs a proof-grade predicate.

## Lane A — separator / decomposition

### Producer

`class5-separator-decomposition-census.mjs` plus generic articulation/min-cut helpers. It emits structural separator facts over the level's current-input free-space graph: articulation cuts; gate-to-goal/obligation minimum vertex cuts; width/balance; mechanic relevance; portal-mediated comparison.

Observed population: 390/390 current Class-5 residual levels. 121/390 have at least one balanced width<=4 static/mechanic-aware interface; 54/121 have a mechanic-aware balanced interface. Construction cost was 12.2 s total, about 31 ms/level. Portal mediation was effectively negative. Path-history-conditioned family 3 was not computed.

### Identity / generalization unit

Independent unit is the level in the frozen Class-5 residual, not each measured interface. The 4,862 interface rows are repeated measurements within those 390 level units. The producer itself is generic current-input computation and does not depend on known solutions or historical labels.

### Current information authority

**Observe / nominate representation only.** It establishes that a bounded structural interface population exists. It does not establish a sound dynamic feasibility contract, a decomposition transition rule, a rank score, or a prune predicate.

### Lifetime / transfer radius

The initial static separator geometry is level-lifetime information, but the decision-bearing contract is not. Once a path crosses/revisits an interface, length, intersection, revisit, must-cross/must-pass and mechanic history may couple both sides. The relevant dynamic summary would be prefix/residual-state scoped and invalidated when those commitments change.

### Smallest actual current consumer

No current consumer is yet justified. A hypothetical local consumer could sit at candidate ranking/retention or scheduler escalation when a compact boundary contract says one branch leaves a better/worse residual allocation. But the census's producer does **not** emit that contract. Feeding raw separator width/balance to `scoreAndSort` would convert structural correlation into a selector without the missing dynamic semantics.

### State/context required at that decision

Already present or cheaply reconstructable: board graph, current prefix, visited cells, remaining length, current/required intersections, must-pass/must-cross/flipper/filter/portal state, goal and reachability structures.

Genuinely absent: a demonstrated compact boundary-state representation that preserves the cross-interface consequences of those fields. This is missing **consumer state/representation**, not missing puzzle state.

### Counterfactual action

Only after a compact contract exists could the signal change a concrete action, e.g. rank/retain a candidate differently, route a bounded local feasibility query, or abstain when interface state is too large. Current raw separator facts alone have no justified action-changing semantics.

### Invalidation / abstention

Abstain when no balanced narrow interface exists, when the interface is a trivial last-mile pocket, when path/mechanic history cannot be summarized within a bounded contract, or when portal/history interactions invalidate the static partition interpretation.

### Opportunity population / prevalence

Upper structural eligibility is 121/390 residual levels (31%). That is not decision-bearing invocation prevalence. The number of reached prefixes where a compact contract exists and would disagree with current behavior is unknown. P206 therefore blocks translating 31% level coverage into a 31% runtime opportunity claim.

### Cost / displaced work

Producer geometry is cheap at about 31 ms/level. Contract construction/query cost and displaced downstream work are unknown. Because search decisions alter crossings and residual history, an offline static census cannot validly estimate live policy economics.

### Correctness / soundness

Ranking could tolerate an imperfect but independently validated signal. Hard prune/local infeasibility would require a sound boundary abstraction and exact preservation of relevant obligations. The current evidence does not supply that proof.

### Replay validity

Static/offline replay can test representation coverage and contract size. It cannot establish live search value once the consumer changes crossing choices and therefore future residual state. A live matched-work experiment would eventually be required, but no such experiment is earned now because the representation gate precedes it.

### Census disposition

**Fails the clean-consumer gate at representation/state compression.** Lane A is a real bounded structural positive, but its current blocker is the named interface-contract state-size problem. This is healthy research gating / a local representation gap, not evidence for a shared missing runtime interface.

---

## Lane D1 — future-intersection commitment realizability

### Producer

Retained exact/reference query script reconstructs the real solver state for a prefix, enumerates eligible already-visited non-gate/non-goal/non-portal/non-filter cells, and asks CP-SAT once per candidate whether a full completion exists while forcing a revisit to that cell. Claimed-live witnesses are referee validated.

The retained multi-pick result contains 20 matched states, each with 11 candidate cells: 18 exact-DEAD states have zero feasible commitments; 2 exact-LIVE states have at least one (3/11 and 2/11 respectively); 220 total pin-revisit queries; 0 correctness alarms.

### Identity / generalization unit

The apparent n=20 state count is **one-parent evidence**: every matched state is from `R03147`. Rows are not independent parent families. The exact-labelled source population itself contains other parents, but D1's matching rule selected the `R03147` cohort for the reported replication. This preserves P201 and prevents pseudoreplication.

### Current information authority

The research result currently has **observe / validate / nominate-consumer** authority. The exact query can in principle produce a proof-grade feasibility answer for its modeled obligation, but the research result does not automatically grant production prune authority. A ranking-only consumer needs less proof but still needs recurrence/economics; a prune consumer additionally requires proof that the queried commitment set is a necessary and complete representation of the remaining intersection obligation under production semantics.

### Lifetime / transfer radius

Per-prefix/per-state. Any extension, rollback, change in intersection deficit, visited set, target/mechanic state, or available revisit candidates invalidates the answer. Transfer radius is one reached state and its exact current obligations; it is not a level-global label.

### Smallest actual current consumer

**Beam candidate ranking/retention at a reached prefix** is a real current decision boundary and does not require a new subsystem. After a child state is generated and existing sound legality tests pass, a D1-derived `zero feasible future-intersection commitments` / `some feasible commitment remains` fact could, in ranking-only form, alter the child's score/order or retention priority before the bounded next frontier is selected.

A stronger hard-prune consumer exists at the same generation boundary in principle, but is deliberately not the smallest authorized consumer and is not earned by this census.

### State/context required at that decision

Already present or reconstructable from the current beam node: exact prefix/path, current cell, visited/revisit history, current intersection count, required intersection count, remaining length, level mechanics/goal, and real solver transition state. The retained D1 script already reconstructs these through production primitives.

The missing object is not hidden puzzle state. It is the **D1 computation itself** (currently CP-SAT/reference work) plus a production-appropriate cost/authority decision.

### Counterfactual action

Meaningful and concrete: among otherwise legal generated states, a state whose D1 answer is zero could be ranked/retained below one with at least one realizable commitment; if a future soundness proof earned hard authority, zero could reject the state. The ranking counterfactual exists without claiming the prune semantics.

### Invalidation / abstention

Abstain on CP-SAT timeout/unsupported mechanics/indeterminate result, referee-invalid claimed witness, no supported candidate commitment set, or any state not matching the query model. Do not collapse abstention to zero/dead. Recompute after state change.

### Opportunity population / prevalence

Known retained eligibility is only the deliberately selected matched `R03147` depth-11 cohort. The source exact-labelled multi-pick asset has 50 states (2 LIVE, 48 DEAD) drawn from production-search frontier cases, but D1's reported matched criterion does not establish whole-solver eligibility. The actual count of reached production decisions satisfying the D1 query contract is therefore **unknown** from retained evidence.

### Production/storage/query/replay cost

Retained production of the result required 220 separate CP-SAT pin-revisit queries with a 45 s per-query limit, plus state reconstruction and witness referee validation. The JSON does not retain per-query elapsed time, so an observed runtime cost distribution cannot be recovered. Storage/querying the completed JSON is cheap, but those exact labels are offline research data and forbidden as cold runtime inputs.

### Plausible displaced downstream work

The retained artifact does not record the descendant work/subtree cost for each labelled prefix. Therefore a numerical avoided-work estimate cannot be reconstructed without another trace/measurement. Lower bound from retained evidence is only that current search reached the state; upper bound cannot safely be equated to the remaining level budget. Any stronger claim would manufacture economics from labels.

### Correctness / soundness

Ranking-only use could tolerate false ordering subject to matched-work evaluation and independent confirmation. Hard pruning needs proof that zero feasible pin-revisit commitments under the exact model implies no legal completion satisfying the remaining intersection requirement under solver/game semantics. Zero observed alarms on one parent is validation evidence, not a proof.

### Replay validity

Retained replay is valid for **local eligibility and one-step disagreement** if the real state can be reconstructed and the candidate consumer is evaluated inertly. It is not valid for solve-count or full displaced-work economics once changed ranking alters beam composition; that creates policy feedback. Offline replay may nominate the live treatment, but live matched-work is required for downstream value.

### Census disposition

**Passes the local clean-consumer gate, narrowly, for ranking/retention authority only.** D1 maps to an existing decision boundary; the required puzzle state exists; a meaningful counterfactual exists; no new architectural subsystem is required. It therefore earns the smallest retained-evidence consumer/economics falsifier. It does **not** earn a production exact-query mechanism, hard prune, or broad runtime treatment.

---

## Lane F3 — topology side descriptor

### Producer

The topology-fork microscope compares a cheap local side descriptor with the full winding-phase observer around decisive punctures. Combined retained population: 14 fork pairs, 7 independent parent families, 8 discordant pairs across 4 discordant families. Decisive-puncture agreement is 25/31; discordant-row agreement 7/9. The descriptor is 8/8 when the closest point is untied.

### Identity / generalization unit

Independent unit is parent family, not decisive puncture row. The 31 puncture rows are repeated measurements nested inside 14 pairs / 7 parents.

### Current information authority

**Observe / diagnostic representation signal only.** The result explicitly did not earn a production consumer. The cheap descriptor is not a sound topology predicate in the decision-bearing tied cases.

### Lifetime / transfer radius

Per current path segment/fork geometry. Extension or revision can change the closest point, tie structure and winding relation. Transfer is local to the fork/path context, not global to the board.

### Smallest actual current consumer

The natural existing seam would be beam candidate ranking/retention at a topology fork, where opposite-side choices could receive different ordering. However, the subset on which the cheap descriptor is perfectly reliable has **zero decision-relevant discordance**: all 9 discordant decisive-puncture rows are tied. In the actual disagreement-bearing subset, reliability is 7/9, and the attempted tie-aware local-arc refinement does not improve it because the tied region can span 60-80% of the path segment.

Therefore there is no presently justified decision-bearing consumer, despite an obvious syntactic location where code could be inserted.

### State/context required at that decision

Current path geometry and fork/puncture context exist or can be reconstructed. What is missing is a compact reliable descriptor for the tied cases. Recovering the full winding observer would largely recreate the representation the cheap descriptor was meant to avoid.

### Counterfactual action

A ranking counterfactual is easy to state (prefer one side when the descriptor differs), but the validated reliable subset never exercises it on a LIVE/DEAD-relevant discordance. A counterfactual that does not occur in the supported population is not a decision-bearing consumer contract.

### Invalidation / abstention

The principled cheap rule would abstain on ties. That yields 8/8 reliability but **zero discordant coverage**. Refusing to abstain gives 7/9 tied-discordant agreement, insufficient for sound prune and not yet justified as a selector. Path changes invalidate the descriptor.

### Opportunity population / prevalence

14 pairs / 7 parents are retained; 8 pairs are discordant across 4 parents. The reliable untied subset has zero decision-bearing discordant rows. Nominal 8/8 untied success therefore corresponds to zero measured useful opportunities, a direct P206 example.

### Cost / displaced work

The cheap descriptor itself is inexpensive, but its decision-bearing population is absent under the sound abstention rule. The attempted local tie refinement gives no extra information; making it reliable trends toward full-path/global representation. No downstream-work economics are justified because the consumer opportunity gate fails first.

### Correctness / soundness

No hard authority. Ranking remains theoretically possible only after independent evidence shows enough real decision-bearing tied cases and acceptable error/economics. Current 7/9 is a correlation/signal, not a selector license.

### Replay validity

Offline replay can continue to characterize coverage/error on fresh independent parents. It cannot establish a consumer value when the supported reliable subset has no disagreements. A live matched-work treatment is premature.

### Census disposition

**Fails the clean-consumer gate at decision-bearing opportunity + representation reliability.** F3 is a qualified representation signal, not a stalled ready-to-consume runtime fact.

## Census summary

| Lane | Real positive? | Existing decision seam? | Required consumer state ready? | Meaningful supported counterfactual now? | Local gate |
|---|---|---|---|---|---|
| A | yes, structural | syntactically yes | **no**: compact dynamic boundary contract absent | no | representation / contract-state size |
| D1 | yes, exact within one parent | **yes**: generated-child rank/retain | **yes** for state; computation/economics missing | **yes**, ranking-only | eligibility / cost / disagreement / displaced-work economics |
| F3 | yes, qualified | syntactically yes | path state yes; reliable tied descriptor absent | **no on supported reliable subset** | decision-bearing coverage / representation |

The shared vocabulary is real. The shared runtime defect is not yet demonstrated. Only D1 reaches a concrete existing consumer without first inventing another representation.
