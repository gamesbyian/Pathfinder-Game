# Census cross-evidence research plan

> **Status:** active standing evidence program, not a new numbered workstream
> **Last updated:** 2026-09-04
> **Current expensive evidence:** technique census run `33717910218` and `reports/stress/technique-niches/2026-09-03/level-capability.json`
> **Goal:** explain the solver's technique-response matrix using the other evidence already accumulated about level structure, solution-space structure, production search response, controlled variants, and exact/reference labels. Promote only compact generic explanations that survive appropriate holdout/parent controls.
> **Priority authority:** `docs/solver-optimization-workstreams.md` remains the live queue. This plan supplies the standing technique-capability/niche evidence layer that queue already requires; it does not outrank an active workstream gate.

## Research model

Treat the census as a **response matrix**, not primarily a winner list. For each level, the matrix records which search actions solve, fail, exhaust or censor and how deeply they search. Other repository resources provide different views of the same puzzle:

| Evidence | What it can explain |
|---|---|
| old + refreshed technique censuses | temporal stability, capability ownership, multiplicity, cost/depth and technique affinity |
| niche/capability maps | singleton/doubleton boundaries, production-miss rescuers, static descriptors |
| production lifecycle/work telemetry | what the real ladder tried, reached, exhausted, censored, starved and paid for |
| stored hints + provenance | independently discovered solutions, technique/config origins, forced-axis finds, historical rediscovery cost |
| solution-space fingerprints | solution diversity, edge/cell concentration, portal signatures, MustCross order rigidity, objective-satisfaction depth, turn behavior, prefix diversity |
| construction witnesses / corpus provenance | guaranteed solvability, generator/batch source, solver-aware vs solver-blind construction |
| variant-family trove | controlled rotations/reflections/re-embeddings/shuffles/local mutations and parent-clustered behavior changes |
| required-length sweeps | within-level resource-pressure cliffs and technique transitions |
| known-solution-prefix survival / paired traces | first load-bearing ranking, prune, dedup or retention divergence |
| CP-SAT/reference probes | exact/reference live/dead labels for bounded mechanism questions |
| reducer | minimal mechanism fixtures once a stable technique inversion is identified |

The target is not a universal predictor trained on every available feature. The target is to discover **small recurring mechanisms or legal descriptors** that explain why search methods differ, then test those mechanisms separately.

## Gate 0 — restore analytical parity and exploit the temporal holdout

**Priority: now. No new solving.**

The August-derived analytical ecosystem should be rebuilt against run `33717910218`, but the old census must remain available as a historical comparison rather than simply being discarded.

Required outputs:

1. regenerate `second-order-analysis.{json,md}` against the refreshed run: multiplicity/phenotypes, outcome similarity, conditional value, covers, inversions, cap curves, censored tranche economics and `techniqueBudgetCurves`;
2. regenerate the fixed-pair relative-advantage artifact using the **same prespecified comparison pairs** as September 1;
3. recompute portfolio rare-capability retention against the refreshed map;
4. build an explicit old->new **technique stability table**: per-action solve-set overlap/Jaccard, gains/losses, singleton ownership retained/gained/lost, thin-boundary changes, and successful/failed depth movement where comparable;
5. rebuild the current production-boundary/exposure join and the 35-level production-solved/no-isolated-winner cohort;
6. write a concise conclusion delta: survived / strengthened / weakened / reversed / superseded.

### First result already completed

`2026-09-04-portfolio-18-fresh-census-temporal-holdout.md` uses the refreshed census as a genuine temporal holdout for the already-fixed `portfolio-18-specialists` composition. Rare-capability retention moved only **95.4% -> 94.8%** (144/151 -> 147/155 full-menu singleton exclusives), with the omitted exclusives still spread across seven techniques. The composition's rare-capability rationale therefore survived substantial solver drift even though its production-replacement A/B remains closed negative for separate dose/context reasons.

### Gate-0 success/stop rule

The purpose is calibration, not treatment selection. Stop once every major August/September-1 census-derived conclusion has a current counterpart and old->new stability is explicit. Do not generate another census to smooth noisy rows.

## Gate 1 — solution-space structure versus technique response

**Priority: next cross-evidence analysis if Gate 0 leaves stable niches. Existing data first.**

The repository has spent much more effort relating solver outcomes to input-level counts than to the **shape of the valid solution space**. Test whether known solution-space descriptors explain technique multiplicity, cost and pairwise advantage beyond coarse static features.

Start on the already-profiled published + Corpus-1 population rather than building a new Corpus-2 profile library immediately. Use existing solution profiles and provenance buckets; report coverage/missingness.

Prespecified questions:

1. **Multiplicity / basin-width hypothesis:** do levels solved by many techniques have higher solution distinctiveness, prefix diversity, lower solution rigidity or broader provenance-source diversity than singleton/thin-boundary levels?
2. **Diverse-beam hypothesis:** on the existing objective and intersection-harvest plain-vs-mechanic-bucket disagreement pairs, do mechanic-bucket-only wins have higher solution diversity, portal-use diversity, crossing-location diversity or multiple distinct solution modes?
3. **Profile-semantic alignment:** do solutions found by `objectiveFirst`, `intersectionHarvest`, `portalFirstTransfer`, MustCross-oriented and repair actions actually differ in the corresponding solution-path behavior, or are the names mostly search perturbations leading to the same basins?
4. **Outcome overlap vs basin overlap:** for highly substitutable technique pairs, compare solution-path/profile overlap. Near-identical solve sets with different basins are not mechanically redundant; distinct techniques repeatedly finding the same basin are stronger redundancy candidates.
5. **Rigidity and specialist capability:** test whether repair/admissible-order/singleton specialists disproportionately occur where MustCross order, objective-satisfaction order or normalized solution footprint is rigid.

Use the fixed pair set already developed for relative-advantage work where possible. If several new solution-profile axes are scanned, label the result discovery/tuning and reserve independent parents/levels before promoting a descriptor.

### Gate-1 success rule

Proceed only if one compact, interpretable solution-space descriptor or small descriptor family repeatedly separates a prespecified disagreement/multiplicity cohort beyond the existing coarse static descriptors.

### Stop rule

If effects are weak, provenance-dependent, or collapse after parent/corpus stratification, record the negative and do not create a larger feature model or Corpus-2 fingerprint campaign.

## Gate 2 — production response vector versus isolated rescuer

**Priority: scheduler-facing, after current production reach/work is comparable.**

Static descriptors repeatedly run out of explanatory power on close levels. Production itself emits richer legal information during the solve: which actions were reached, whether they naturally exhausted or censored, work spent, best badness/progress, retry-stage participation and surviving budget.

Build a simple current production-response join against the refreshed isolated capability matrix.

Questions:

1. after a specific production action/stage fails, which isolated actions retain conditional rescue value?
2. does **natural exhaustion versus censoring** materially change the rescuer distribution?
3. do best-badness/progress bands distinguish "same action needs more dose" from "different action/family is needed"?
4. which production-miss rows have an isolated rescuer that production never offers, offers but starves, or gives comparable depth/work yet still fails?
5. what explains the **35 production-solved/no-isolated-winner** rows: retry context, additive flags, sequence effects, action identities absent from T1, or ordinary census drift?
6. can a tiny response-state table predict useful next work better than level-only routing regimes?

Begin with contingency tables / grouped conditional rates and work economics. No classifier is earned merely because many telemetry fields exist.

### Gate-2 success rule

A candidate signal must identify a materially different next-action/tranche value on held-out rows and leave plausible fixed-work headroom. Only then nominate one shadow or matched-work scheduler treatment.

### Stop rule

If production response adds little beyond technique identity + termination mode, keep it diagnostic and do not build dynamic scheduler machinery.

## Gate 3 — controlled variants as causal tests of technique affinity

**Priority: conditional on Gates 0-2 nominating a stable association. Use the existing family trove before generating anything.**

The variant-family resource can turn observational niche associations into controlled questions. Parent family is the independent unit.

High-value tests:

- does technique multiplicity predict robustness to rotation/reflection/re-embedding/local mutation?
- do temporally unstable census levels also show high sibling/variant fragility?
- which controlled structural changes flip plain vs diverse beam, 2K vs 5K, beam vs repair, or admissible-order value?
- does a technique niche persist across siblings, or vanish under tiny perturbations?
- does solution-basin diversity predict family-level solve robustness?
- do controlled density/resource changes move useful budget depth even when the useful technique stays the same?

Historical variant solver outcomes are nomination evidence. Re-run only selected decision-bearing cliffs on current code. Weight/split by whole parent family and report parent counts as well as variant rows.

### Gate-3 success rule

A recurring controlled transformation changes technique value in the same direction across unrelated held-out parents and yields a simple generic current-level/current-state descriptor or mechanism hypothesis.

### Stop rule

If the pattern is one-family-specific, leave it as family forensics. Do not generate more variants to manufacture prevalence.

## Gate 4 — mechanism localization only after a recurring cross-evidence discrepancy

Use the expensive diagnostic machinery only when earlier gates nominate a concrete pair/cohort.

Possible sequence:

1. select a stable A-solves/B-fails inversion or a capability-discordant near twin;
2. use known-solution-prefix survival / paired trace to locate the first load-bearing difference;
3. classify it as successor generation, hard prune/bound, score/rank, dedup/retention, randomness, dose/censoring, or execution context;
4. use exact/reference labels only where they can distinguish live/dead competing material;
5. reduce the level while preserving the inversion when feasible;
6. replicate the same mechanism on unrelated levels/parents before touching production policy.

This is where "technique niche" becomes a search mechanism rather than a correlation.

## Deferred high-value questions

These remain in the reservoir until earlier gates create a concrete need:

- **four-space triangulation:** compare distances in input geometry, solution space, technique-response vector and live search/failure trajectory; mine cases close in three spaces but far in the fourth;
- **capability multiplicity as robustness:** temporal drift, variant robustness and budget-edge stability as independent tests of whether multiplicity is meaningful;
- **stability-aware portfolios:** optimize future portfolios for work + current coverage + temporal retention + parent robustness + basin diversity rather than one frozen matrix;
- **latent response dimensions:** low-rank/bicluster analysis of the technique-response matrix, followed by interpretation against geometry/solution-space features;
- **forcing/backdoor depth:** join hint-workbench forced gate/first-step/portal-exit successes to technique phenotype to find levels made easy by one hard decision;
- **generator-specific niches:** separate published, Corpus-1 A-F, Corpus 2, envelope and suitable topology-composition behavior before calling a niche universal;
- **editor-envelope relevance:** distinguish rare capability on generated combinatorial monsters from capability inside ordinary constructible complexity;
- **minimal niche counterexamples:** reducer + exact/reference validation for stable inversions;
- **historical cost volatility:** join hint rediscovery `workSpent` drift with census technique drift where comparable.

These are questions, not a backlog of implementations.

## Promotion and leakage rules

- Census outcomes, historical winners, saved hints, construction witnesses, variant identity and solution profiles are **offline research labels**, never direct production-routing inputs.
- A profile/fingerprint association must be translated into a simpler legal level/state descriptor before any live treatment.
- Variant siblings stay together for tuning/holdout; do not count sibling rows as independent levels.
- Cross-technique allocation claims use canonical `workSpent`; census nodes remain within-technique depth diagnostics.
- An outcome-selected descriptor/pair is discovery evidence on those rows. Confirm on untouched levels/parents before policy use.
- A stable correlation does not justify a prune. Hard pruning requires a proved one-sided condition or validated exact/safe relaxation.
- Prefer extending current reusable analyzers/join helpers. A new analytical database/framework is earned only if repeated decision-bearing joins remain impossible with the existing substrate.

## Execution order

1. **Gate 0:** refreshed analytical parity + temporal stability. Already started; portfolio temporal holdout complete.
2. **Gate 1:** solution-space/fingerprint pilot on existing profile coverage.
3. **Gate 2:** production-response/rescuer join using current comparable lifecycle/work evidence.
4. **Gate 3:** existing variant trove only for associations that survive 1/2.
5. **Gate 4:** trace/reference/reduction on the few recurring mechanisms that survive.
6. Update the live queue only when one of these analyses earns a concrete solver-action/scheduler/search-quality treatment. Keep the broader questions here / in `solver-future-work.md` rather than manufacturing workstream tasks.
