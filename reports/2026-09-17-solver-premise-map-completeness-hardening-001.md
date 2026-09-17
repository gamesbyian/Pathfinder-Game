# Solver premise-map completeness hardening — 2026-09-17

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — ten reciprocal source batches completed; the final heterogeneous saturation batch produced no new parent, scope split, specialization, or ontology escape, and the dedicated premise-map validation passed.
> **Decision:** the frozen v1 map is sufficiently hardened and semantically saturated to begin the preregistered first mining round. Do not claim absolute completeness. Keep post-v1 candidates outside that first round, then reconcile them afterward into a separately versioned map.
> **Remaining gate:** none before first-round mining; preserve residual uncertainty and reconcile PV1-001 through PV1-008 only after the frozen-v1 mining round.
> **Object:** frozen `solver-premise-map-v1-2026-09-17`

## Why another hardening pass was necessary

The first hardening phase did a strong job on the map as a dataset: structural validation, proposition lineage, typed relations, contradiction/tension candidates, semantic sibling families, implicit defaults, ontology stress tests, mining preregistration, and a frozen snapshot.

Its main remaining asymmetry was directional. It could show:

`mapped proposition -> source / discovery lineage`

but it could not yet show:

`premise-bearing repository surface -> mapped proposition or explicit disposition`.

Perfect proposition provenance therefore could coexist with a missed source stratum. A second risk followed from that: repeated rediscovery inside documents descended from the same experiment or ontology could look like independent confirmation.

This pass attacked those two weaknesses directly.

## Method

### Reciprocal source coverage

A reverse-source protocol was added in `docs/solver-premise-map-source-coverage.md`. Source batches were selected by repository stratum rather than by premise ID, graph centrality, thin cells, or existing gap labels.

Ten batches covered:

1. research epistemology and evidence governance;
2. runtime continuation and budget semantics;
3. human/editor parent-family evidence;
4. generator/corpus/variant-family semantics;
5. historical and removed-tooling archaeology;
6. representative runtime code defaults/lifetimes;
7. workflow execution and evidence lifecycle;
8. dated-report spot checks against synthesis authorities;
9. current research-method/resource authorities outside the obvious premise-map core;
10. a final heterogeneous saturation batch spanning mutable runtime storage, offline oracle replay, and default-off mechanism disposition.

Each source received a disposition rather than being treated as covered merely because its path appeared in one premise's provenance.

### Saturation instead of completeness theatre

Absolute completeness is not empirically demonstrable for a conceptual map. The replacement target was observable semantic saturation:

- independently selected source strata should increasingly rediscover existing premises;
- new discoveries should become scope splits/specializations rather than repeatedly opening new semantic parents;
- ontology escapees should be recorded rather than forcibly normalized;
- the final two heterogeneous batches should produce no high-impact new parent premise.

The final two heterogeneous batches produced no new parent. The final saturation batch produced no parent, scope split, specialization, or ontology escape at all.

## What the reverse audit actually found

The pass was not a rubber stamp. Its first batch found a real concentration of missing or under-isolated concepts in the **epistemic/research-process layer**.

### Strong post-v1 candidates

The candidate register now records eight propositions without mutating frozen v1.

#### PV1-001 — causal ancestry / pseudoreplication

Raw document, report, row, or artifact count is not independent evidential support when those objects descend from the same primary observation or parent family. Confidence should be based on the appropriate causal/clustered independent unit.

This matters directly to premise-map confidence: several rediscoveries can be descendants of one experiment and must not be counted as independent convergence.

#### PV1-002 — independence is multidimensional

Runtime level-blindness, sample independence, distributional independence, and parent/cluster independence answer different questions. Passing one does not establish another.

#### PV1-003 — evidence roles are consumable and path-dependent

A fresh confirmation population can cease to be confirmation evidence for descendants once its outcomes influence redesign. Evidence status is therefore partly a property of the treatment lineage and research history, not only the dataset.

#### PV1-004 — claim-propagation drift

A narrow primary result can become broader, stronger, or differently authoritative while moving through reports, capability memory, question state, future-work prose, and queue decisions. Downstream consumers need to preserve scope, conditioning, authority, and ancestry.

#### PV1-005 — discriminability from rival explanations

An observation supports a causal conclusion only insofar as the observation could have separated that conclusion from materially different rivals. Specific instances already existed throughout v1; this pass found the general parent principle underrepresented.

#### PV1-006 — reciprocal completeness methodology

Proposition provenance and internal graph completeness cannot establish source-space completeness. Reciprocal source coverage plus independent-pass saturation is needed for a stronger map-confidence claim.

This is deliberately meta-level and must not be inserted into the frozen v1 being mined.

### Bounded specializations, not new parents

#### PV1-007 — finite-budget search equivariance

A heuristic can be invariant under an isomorphic puzzle transformation while the actual finite-budget search is not equivariant because successor order, tie-breaking, retention, deduplication, truncation, or randomness consumption differs. This sharpened existing symmetry/fragility premises rather than opening a new parent family.

#### PV1-008 — opportunity population / causal denominator

Raw experiment row count can wildly overstate decision-bearing sample size. For a rescue treatment, the informative denominator may be `eligible ∩ control-fails ∩ treatment-can-execute`, not nominal `N`. This sharpens participation/population premises and protects zero-gain conclusions from low-opportunity experiments.

## What did *not* turn into new premise families

This negative result is important because it supplies the saturation evidence.

Runtime resumability, deterministic work accounting, mutable storage lifetime, code-level stage eligibility, diversification state, workflow timeout/outcome semantics, corpus-generation history, historical archaeology, offline oracle replay, opt-in mechanism disposition, and two deliberately detailed historical reports all mapped back onto the existing v1 families once the epistemic additions above were recognized.

Representative runtime-code sampling also largely rediscovered v1 assumptions about state sufficiency, search-process knowledge, stage/interface contracts, routing, continuation, budget displacement, authority, maturity, and information lifetime.

Historical archaeology similarly rediscovered vocabulary drift, incomplete experiment chains, silent treatment non-participation, dead tooling, architecture epochs, and scoped reopen conditions rather than exposing another hidden mechanism family.

That asymmetry in discovery yield is itself informative: **the map was substantially stronger on solver mechanism/architecture than on the epistemology of research evidence.** The weakness identified before mining was real, but concentrated rather than diffuse.

## Confidence after hardening

Confidence should remain multidimensional rather than collapsed into a score.

### Mechanism-space coverage: high confidence for the current architecture epoch

Multiple archaeology, code-first, runtime-contract, historical-report, and independent-reconstruction passes converge strongly. Later source batches mostly rediscovered v1.

This does not mean every algorithmic idea exists in the map. It means the major *premise families already latent in the repository* appear well covered.

### Architecture-premise coverage: high, with future-architecture caveat

The map captures forward-prefix dominance, state/equivalence assumptions, stage/routing/handoff semantics, merge/retention, information lifetime, alternative search objects, revision, decomposition, and dynamic control. Representative implementation archaeology did not expose another parent.

A future architecture can create new categories with no ancestor in the present repository. No archaeology can pre-map those.

### Epistemic/research-process coverage: medium-high after this pass

This was the weak region. The reverse-source audit found several real missing parents or scope distinctions, especially causal ancestry, evidence consumption, claim propagation, and rival-explanation discriminability.

Those are now explicitly captured as post-v1 candidates, and later independent source strata converged on them rather than continuing to open new parents.

### Distribution/evaluation coverage: high for known repository resources

Human parent families, variant families, standing stress corpora, generator history, population validity, selection conditioning, and corpus identity were sampled. The audit reinforced rather than overturned v1's population/evidence premises, with opportunity population as the main useful specialization.

### Historical reach: high for documented history, unknowable for lost history

Current archaeology authorities and dated report spot checks converge with v1. Git history and surviving reports can never establish that an undocumented speculation did not once exist.

### Ontology robustness: good, not proven universal

Across ten reciprocal batches there were zero cases that could not be represented by the map plus the candidate-extension vocabulary. That is encouraging.

It is also bounded evidence. Ontology success against questions generated by this repository cannot prove adequacy for an alien solver paradigm.

## Residual uncertainty that should remain visible during mining

Four things should **not** be converted into false certainty:

1. undocumented or never-articulated premises are not discoverable by repository archaeology;
2. representative runtime-code sampling is not line-by-line proof that no implicit default remains;
3. all current source material is historically conditioned by the solver/research apparatus that produced it;
4. future search architectures may create semantic dimensions absent from v1.

The right conclusion is therefore not “the map is complete.” It is:

> **The map has reached strong repository-relative semantic saturation, with the largest discovered completeness defect isolated to the epistemic layer and now recorded outside frozen v1.**

## Mining decision

Proceed with the preregistered twelve-lens mining round on **frozen v1 exactly as frozen**.

Do not first fold PV1-001 through PV1-008 into v1. Doing that would let the completeness audit change the dataset immediately before mining it, weakening the clean separation between map construction and pattern discovery.

After the first mining round:

1. compare mined insights against PV1-001..PV1-008 without treating overlap as independent evidence automatically;
2. check whether mining independently rediscovers the epistemic gaps;
3. classify any mined ontology escapees separately;
4. admit/reject/split post-v1 candidates using the existing addition template;
5. publish v2 only after that reconciliation.

This preserves both experimental cleanliness and the new completeness information.

## Durable mitigations added

The hardening process now permanently includes reciprocal source coverage (H16), not just proposition provenance. The branch also adds:

- reverse-source completeness protocol;
- machine-readable source-coverage ledger plus closeout addendum;
- eight post-v1 candidate propositions with admission gates;
- executable reciprocal source auditor;
- CI coverage for the reciprocal auditor and its source strata;
- an explicit saturation stop condition;
- a rule that support volume is evaluated through causal ancestry rather than document count;
- a rule that post-v1 findings cannot contaminate the frozen first mining round.

## Bottom line

The premise map was already good enough to be useful. This pass found that it was **not yet good enough to justify confidence in its own completeness methodology**.

That deficiency is now materially reduced. The strongest evidence is not the extra metadata. It is the discovery-yield curve: the first reverse-source batch found several genuine epistemic gaps; subsequent independent strata increasingly converged on existing territory; the final heterogeneous batches stopped producing new parent premises.

That is the point at which further pre-mining archaeology starts to have diminishing expected value relative to actually mining the frozen map.
