# Cross-resource observability and ancestry audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-14 — accepted manifest-only census reproduced the authoritative 23 / 79 / 328 / 1,372 stress-selection strata; ordinary CI run `34801046277` passed deep verification, validators, lint, Node/CLI contracts, solver canary, and production build.
> **Decision:** the four audited resources are a useful evidence system, but they are not four independent views. Variant-family replay is a major upstream contributor to the stored known-solution sample summarized by Solution Profiles, so family evidence and current profile phenotype normally share ancestry.
> **Remaining gate:** none.
> **Evidence role:** forensic/discovery; existing data only.
> **Selection:** all current published/C1/C2 levels plus generation manifests from the historical variant-family branch; no new variants, family evaluations, or solver outcomes.
> **Inference scope:** evidence availability, ancestry, missingness and safe join semantics. This audit does not infer current solver efficacy from stored family or hint outcomes.

## Bottom line

The cross-resource join is much more complete than expected and much less independent than a naive join would imply.

Every one of the **1,962** current published/C1/C2 parents has variant-family generation manifests. The bounded mount contains **9,864 families** and **97,154 variants**. Every current level is touched by variant-to-parent replay provenance. Across **7,639** observed parent/family replay lineages, all 7,639 reconcile to a family actually generated under that parent; there are **zero** unmatched family lineages and **zero** replay-parent mismatches.

That integrity result is excellent. The inferential result is the important warning: of **266,997** stored accepted paths, **206,558 (77.36%)** carry replay provenance, **201,339 (75.41%)** have variant replay as their earliest fully dated discovery, and **200,773 (75.20%)** are replay-only in recorded origin terms. At level granularity, all 1,962 are replay-touched, 1,940 contain at least one replay-first path, and 1,930 contain at least one replay-only path.

Therefore current Solution Profiles are often downstream summaries of paths imported through the family pipeline. A family transformation and a current profile feature may still be jointly useful, but their agreement is not independent corroboration unless path ancestry is filtered or explicitly modeled.

## Working model

The resources occupy different points in one causal graph:

- **corpus/population:** where a puzzle came from and why it remained in a research population;
- **variant family/intervention:** controlled relatives and transformation history;
- **hint provenance/observation lineage:** how a referee-valid path entered the stored evidence base;
- **solution profile/phenotype:** support-aware summary of that stored known-solution sample.

The recurring loop is `selected parent -> generated family -> transferred/discovered path -> stored provenance -> profile -> later research selection`. The safe question is not merely whether two resources agree, but whether they are descendants of the same observation or intervention.

## Method and accepted run

`scripts/cross-resource-observability-audit.mjs` joins current published, C1 and C2 levels/hints against family generation manifests. It reuses shared provenance taxonomy, family indexing and corpus-query semantics rather than inventing a parallel evidence store. `scripts/cross-resource-profile-integrity.mjs` separately verifies tracked published/C1 schema-v3 profile rows against current corpus position, hint/path counts and chronology support.

The family mount intentionally contains generation manifests only. Historical family evaluation logs are absent, so evaluated/solved counts remain **unknown**, never `0`.

The accepted run is workflow `34799898992`, analyzer commit `4b71031003f5a32243ea97c1f619e0c0fa20a087`, artifact `10331251606`, digest `sha256:517ff9ad642db339ac68f2c53b51c33747d3083f9456227be905c511ecfd80f6`. The compact durable result is `reports/2026-09-14-cross-resource-observability-summary-001.json`.

Before interpretation, the run had to reproduce the independently established population strata exactly:

| Stratum | Rows |
|---|---:|
| C1 A-F retained survivors | 23 |
| C1 migrated random, historically solver-positive | 79 |
| C2 original random, historically solver-negative survivors | 328 |
| C2 July-11 replacement rows | 1,372 |
| Published, mixed historical selection | 160 |

It did.

## Findings

### F1 — selection provenance was authoritative but not composable

The September stress-corpus reconstruction had established the four standing stress strata, but the decisive selection history lived mainly in prose. `corpus-query` previously exposed generation ancestry without the later solver-outcome migration/retention history.

This branch adds `scripts/corpus-selection-lineage.mjs` and exposes selection lineage through `corpus-query`, including `--selection-stratum=` filtering. This metadata is offline research context only and is explicitly illegal as a cold-solver routing feature.

### F2 — C2 exposed why generation provenance cannot substitute for curation history

The first complete census was rejected because it classified all 1,700 C2 rows as original solver-negative survivors rather than 328 survivors + 1,372 replacements. The bug was scientifically useful: July-11 append generation preserved surviving rows and their old per-row generation provenance, so row timestamps could not recover the later curation boundary.

For the accepted census, the reconstruction used the corpus-level July append count plus current row position: the cleanup retained 328 rows in place and appended exactly 1,372 replacements. That correctly reproduced the standing population and was sufficient to validate the empirical run.

A later durability review found that current-position rule should not be the permanent classifier because a future legitimate append would move a `current total - 1,372` boundary. The July append algorithm supplies a stable historical identity boundary instead: it preserved the survivors, whose highest ID is `R01997`, then continued monotonic ID allocation with the first replacement at **`R01998`**. `scripts/corpus-selection-lineage.mjs` therefore uses `R01998` as the durable C2 replacement boundary, and the ordinary corpus-query test separately guards that the current corpus still resolves to exactly 328 historical solver-negative survivors and 1,372 July replacements. This survives later appends and row reordering.

This is a concrete example of the stress-corpus audit's central distinction: **generation provenance and selection provenance are different dimensions**. It also shows why a reconstructed historical boundary should be encoded in an identity that remains stable under later corpus growth rather than inferred afresh from mutable container shape.

### F3 — family missingness needs three states

A normal `main` checkout does not contain the historical family trove. Therefore these states are distinct:

1. family resource not mounted;
2. resource mounted, no parent record;
3. parent indexed.

The join preserves all three. Missing resource context cannot become a negative family observation.

### F4 — partial mounts create their own missingness semantics

A manifest-only mount knows generation identity but does not know historical evaluation outcomes. An early implementation inherited default false values and would have reported `0 evaluated / 0 solved`.

That is fixed. Family coverage carries `evaluationEvidenceLoaded`; this run reports `evaluated:null` and `solved:null`. The lesson is broader than families: a partial resource projection needs an explicit contract for which absent fields mean unavailable rather than false.

### F5 — replay ancestry reconciles cleanly to actual family identity

The audit matched **7,639 / 7,639** replay parent/family lineages to mounted family manifests, with zero unmatched family lineages and zero replay-parent mismatches.

This turns the proposed `family -> replay -> stored path -> profile` chain from a naming convention into an empirically verified ancestry surface. Replay remains dependent evidence, but the linkage itself is highly coherent.

### F6 — tracked profile materialization is internally consistent

The published and C1 schema-v3 profile libraries both match their current source corpus and hint sidecars exactly under the audit's position/path/chronology checks:

- published: 160 / 160 compatible rows;
- C1: 102 / 102 compatible rows;
- mismatch count: 0 in both libraries.

C2 remains `derivable-not-tracked`; that is an availability distinction, not a missing profile observation.

### F7 — family coverage is universal, so presence is not a discriminator

All 1,962 current parents have family manifests. Median family count is five in every standing selection stratum. Family presence therefore cannot explain why some populations have richer hint/profile evidence than others and should not be used as a pseudo-feature for stratification.

The useful family variables are relation/mode, transformation context, generation/evaluation identity and whole-parent outcomes, not the binary fact that a family exists.

### F8 — current profiles are heavily downstream of replay

Replay is not a small annotation layer. It dominates much of the stored sample.

| Selection stratum | Median stored paths | Median replay-first fraction | Aggregate replay-first fraction |
|---|---:|---:|---:|
| C1 A-F retained | 450 | 53.54% | 50.70% |
| C1 migrated solver-positive | 331 | 53.02% | 56.22% |
| C2 original solver-negative survivors | 39 | 92.31% | 81.90% |
| C2 July replacements | 55 | 91.65% | 78.99% |
| Published | 341.5 | 78.53% | 75.48% |

All C1/C2 levels have complete dated hint chronology under the current sidecars. Published chronology is complete for only 38 / 160 levels, so temporal ancestry claims there require additional caution.

The practical consequence is simple: **do not use a current Solution Profile as an independent response variable to explain the effect of the same variant-family pipeline unless replay-first paths are excluded or the shared ancestry is part of the question.**

### F9 — profile richness is observability history, not latent solution-space size

The cleanest demonstration comes from the original random-generator split. The 79 current C1 random rows were historically selected because the old solver solved them; the 328 surviving C2 rows came from the solver-negative complement.

Their family campaign breadth is similar:

- C1 migrated rows: median 5 families / 47 generated variants;
- C2 original negative survivors: median 5 families / 52 variants.

But their stored known-solution samples differ dramatically:

- C1 migrated rows: median **331** paths;
- C2 original negative survivors: median **39** paths.

That 8.5x difference cannot safely be read as an estimate of latent solution-space size. It reflects solver outcome selection plus subsequent discovery/replay history. Profile support remains valuable, but support volume itself is an observability variable.

### F10 — there is no naturally replay-free four-resource cohort

The audit's original hope for a clean `family + provenance + profile + population` subset untouched by replay fails: **0** levels satisfy that condition. Every current parent is replay-touched.

That does not make joint research impossible. It changes the unit of cleanliness from level membership to **path lineage**. A small nominated set of levels has complete chronology, at least ten stored paths, and <=25% replay-first paths. Examples include `R03279`, `R01553`, `R02843`, `S00115`, `S00030`, `R02716`, `R03188`, `R02290`, and `R01636`. These are development candidates, not independent holdouts.

Several are especially informative because replay touched paths only after non-replay discovery. That distinction must survive future tooling: **replay-touched != replay-first**.

### F11 — replay lineage has a large mode asymmetry, but the denominator needed to explain it was not retained

Joining family IDs to their generation modes produces a striking descriptive pattern. Among mounted family manifests, at least one stored replay lineage is present for:

| Family mode | Families | Families represented by replay lineage | Descriptive coverage |
|---|---:|---:|---:|
| constrained-shuffle | 1,962 | 1,940 | 98.88% |
| group-reshuffle | 1,946 | 1,920 | 98.66% |
| swap | 1,962 | 1,830 | 93.27% |
| symmetry | 1,928 | 985 | 51.09% |
| local-mutant | 1,912 | 964 | 50.42% |

That is **not** a transform success-rate result. PR #1340's parent-hint replay batch attempted every *discovered variant hint* against its canonical parent, but its persisted/reportable counters were only corpus-level totals: manifests processed, variant hints checked/accepted and parents touched. It did not retain the checked/accepted denominator by family mode, and the generated `reports/families/2026-08-08-parent-hint-replay.json` was not committed.

Therefore a family absent from replay provenance may mean its variants had no discovered hints to attempt, attempted paths failed parent replay, or both. The current stored lineage can describe the numerator but cannot separate those mechanisms. Recovering the denominator would require rematerializing the historical variant-hint inputs, which this audit does not justify merely to turn an intriguing pattern into a statistic.

Prospective lesson: any future replay/transfer campaign intended for comparative mechanism inference should persist attempted and accepted counts by parent/family/mode, not only corpus totals. This is a concrete instance where aggregation destroyed the counterfactual needed by a later scientifically legitimate question.

## What the four-resource join can safely answer

High-value uses now include:

- identifying parent/family lineages whose transformed relatives exposed parent-valid paths that production search did not initially find;
- comparing transformation classes against **lineage-filtered** path/profile properties;
- using corpus selection strata to prevent solver-positive/negative historical cohorts from being averaged into one fake population;
- using replay-first versus non-replay-first paths to ask which structural motifs were exposed by family transfer;
- selecting exact current-code rechecks from historical family evidence without treating replay multiplicity as repeated discovery.

Unsafe uses include:

- family outcome correlated against an unfiltered current profile and described as independent mechanism confirmation;
- hint count or profile support volume used as a proxy for number of latent solutions;
- row-weighted variant evidence treated as independent observations;
- absent family evaluation logs interpreted as failures;
- replay-lineage presence by family mode interpreted as a transfer rate without the attempted variant-hint denominator;
- current corpus filename used as sufficient population identity.

## Solve-oriented next use

The best follow-up is not another global family census. For a live solver mechanism question, start with a named current residual and then use the existing family/provenance graph to find whole parents where:

1. a transform exposed a referee-valid parent path or a historical capability cliff;
2. the relevant path ancestry is known;
3. the mechanism can be stated without parent IDs or historical outcomes at runtime;
4. current-code recheck can be bounded to the exact counterfactual needed.

If Solution Profile features are used in that investigation, construct the comparison from non-replay-first paths when the family pipeline is the putative cause. Current full profiles remain appropriate when the question is simply "what does the known sample now look like?"

## Execution history

Several temporary-runner failures occurred before accepted evidence existed: nonexistent `.nvmrc`, artifact-action mismatch, serial partial-clone materialization, and one missing `tmp/` staging directory. Those were execution plumbing only. No failed runner produced accepted scientific output.

The first successful census was also rejected rather than interpreted because its C2 stratum sanity check failed. That rejection directly produced F2. The corrected accepted run used the then-sufficient append-count/current-position reconstruction and passed the external 23 / 79 / 328 / 1,372 population gate before any cross-resource conclusion was accepted. The subsequent durability pass replaced that mutable positional rule with the stable `R01998` first-replacement identity boundary without changing any accepted current-population count or empirical conclusion.

## Closeout

The audit is concluded-positive. Replay/profile join guidance is durable in `docs/solver-research-data-assets.md`; the audited-resource contract declarations carry the new ancestry semantics; the standing stress selection strata have an executable real-corpus guard; the accepted empirical result has a committed machine summary; and the temporary census workflow is gone. CI run `34801046277` passed deep verification, package-script reachability and authority budgets, source invariants, validators, lint, Node/CLI contracts, the solver capability canary, and the production build.