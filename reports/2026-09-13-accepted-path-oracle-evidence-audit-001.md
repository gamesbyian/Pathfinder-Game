# Accepted-path/oracle evidence across diagnostics audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-14 — bounded Audit 3 synthesis over all-path hard-prune replay, Solution Profile sample-composition evidence, cross-resource ancestry evidence, identity-bound replay contracts, and maintained consumer inspection.
> **Decision:** accepted paths remain sound offline positive oracles, but representative-path and known-path-set diagnostics must preserve their conditioning identity. Broad hard-prune soundness survives alternate-oracle attack; descriptive rank/extinction/phenotype claims are path- or observed-set-conditioned unless independently adjudicated.
> **Remaining gate:** no broad solver rerun is required; before a live mechanism nomination relies on the preregistered seven-level representative-path cohort, add an explicit path/signature substitution input and execute the frozen cohort without changing any other variable.
> **Audit:** inference-first research Audit 3
> **Date:** 2026-09-13
> **Scope:** accepted-path/oracle choice, known-path sample composition, diagnostic ancestry, and observability conditioning. This is not a re-audit of hint provenance, Solution Profiles, family variants, or experiment lifecycle machinery.
> **Production behavior:** unchanged.

## Bottom line

Pathfinder has two very different kinds of accepted-path evidence that had been easy to discuss with the same vocabulary.

The strongest class is **one-sided correctness evidence**. If a referee-valid path traverses a state, that state/prefix is live. The 2026-09-11 hard-prune audit replayed **207,900 distinct referee-valid stored paths and 20,127,497 path steps** across C1/C2 with zero default hard-prune violations. Because that audit already ranges over all stored accepted paths rather than one representative, alternate-oracle substitution and any conservative subset of the same population inherit the same zero-violation observation. That conclusion is genuinely robust across the observed oracle support.

The weaker, still useful class is **diagnostic description of one observed basin or an observed path set**: local child rank, first known-support extinction, must-cross order phenotype, crossing/portal topology, residual description and mechanism nomination. These claims can be excellent discovery evidence, but changing the valid oracle can change the quantity being measured. No amount of referee validity turns arbitrary representative selection into a level property.

The main scientific correction is therefore not “known paths are unreliable.” It is: **preserve whether a claim is identity-bound, representative-conditioned, observed-set-conditioned, or independently adjudicated, and do not count deterministic descendants of the same path/replay lineage as independent corroboration.**

No current live solver mechanism is overturned by this audit. Several historical/descriptive claims are narrowed to path-conditioned or observed-set-conditioned evidence. The audit exposes a concrete producer metadata gap and repairs the maintained representative-path analyzer prospectively.

## Preregistered sensitivity cohort

The cohort was committed at `85c7aa93163049081996b472f408692f133a5a1a` before sensitivity outcomes were inspected.

Frozen IDs:

`R03279, R01553, R02843, R02716, R03188, R02290, R01636`

These were selected from the prior cross-resource ancestry audit because they had complete chronology, at least ten stored accepted paths, and <=25% replay-first support. Selection was based on support properties, not dramatic diagnostic differences. They are development cases, not holdouts.

Frozen inclusion semantics were: referee-valid paths; exact-path deduplication; current structural revision; unknown provenance stays unknown; replay-touched/replay-first/replay-only/non-replay-first distinctions retained; conservative repository dependency strata used instead of raw event counts. Representative selection was frozen to `selectRepresentativeHints(..., evidencePurpose='solution-atlas')`. Identity-bound artifacts were excluded from generic substitution.

The intended set views were all eligible paths, dependency-collapsed support, replay-first exclusion, and one representative per conservative dependency stratum.

### Discarded execution design

The first proposed new-compute attack was to rerun `winning-path-analysis` repeatedly over this cohort while changing whichever hint happened to be first. It was rejected before execution. That would have changed oracle identity through storage mutation/local ordering while the artifact did not retain enough oracle identity to prove what was measured. It would have produced exactly the confounding this audit is meant to detect.

The maintained analyzer now records representative selection rule, exact path signature, structural family, dependency strata, origins and provenance-event count. A future bounded substitution run can therefore name its oracle rather than infer it from sidecar order. No broad solver campaign was justified merely to make this audit prettier.

## Consumer/oracle-binding inventory

| Consumer / evidence surface | Binding mode | Oracle selection | Safe inference / audit finding |
|---|---|---|---|
| `winning-path-analysis.mjs` | representative-path probe | shared `selectRepresentativeHints(limit=1, solution-atlas)` | local heuristic preference along the selected valid path only; output previously lost path identity, repaired prospectively |
| `mc-crossing-slack-analysis.mjs`, `portal-parity-census.mjs`, `residual-separator-census.mjs` and similar path analyzers migrated in the provenance audit | representative-path probes | shared evidence-aware representative selector | useful structural probes; agreement is not automatically independent if they consume the same representative |
| Solution Profile construction | set-valued known-solution observer | all admitted stored paths in the bucket/sample | describes the observed known-solution sample; profile audit already proved sparse sample composition can change apparent order/diversity conclusions |
| known-solution-prefix survival | set-valued known-solution observer | referee-valid labels on one deterministic selected gate | extinction means the supplied observed support is gone, not that all viable paths are gone; oracle-set conditioning must be retained |
| known-solution hard-prune soundness | set-valued positive-oracle correctness check | every distinct referee-valid stored C1/C2 path | zero violations is stable across every subset of the audited stored-path population; absence outside observed states remains unknown |
| prune-gap / offline replay artifacts after PR #1732 | identity-bound witness | exact persisted witness identity | changing path would invalidate step-indexed upstream labels; exact identity contract correctly outranks representative uniformity |
| CP-SAT explicit-prefix reference labels | path-seeded, independently adjudicated | selected prefix/state; CP-SAT/reference supplies live/dead/abstain | oracle chooses the case, not the truth label; independent adjudication can support a representation/ranking claim if witness identity and label source survive |
| exact/reference feasibility machinery not seeded from accepted paths | not actually path-derived | none | control; keep outside generic oracle sensitivity accounting |

No maintained decision-bearing consumer found in this pass was intentionally using raw `hints[0]` as a generic representative after the September provenance hardening. The important residual problem was therefore not a surviving first-stored-path bug. It was **information loss after scientifically reasonable representative selection** and the temptation to count shared-oracle descendants as multiple confirmations.

## Controlled oracle and sample-composition attacks

### 1. Broad hard-prune conclusion: stable across known oracle support

The strongest existing measurement is already a complete observed-oracle substitution test. It deduplicated exact paths per level and replayed all 207,900 referee-valid C1/C2 paths through the shared default hard-prune stack, reaching every enabled/default prune on substantial known-live populations and finding zero violations.

This supports the decision-bearing claim “a broad already-enabled shared hard-prune false-positive bug is not a good explanation for the current frontier” **across the stored-path population**. Alternate valid oracle substitution cannot flip the observed result because every audited oracle produced the same result. Dependency collapse, replay-first exclusion, one-per-stratum selection, solved-control restriction or miss/extinction restriction can only select subsets of the same zero-violation rows.

The rival explanation that one lucky representative hid a prune bug is therefore ruled out for the observed population. The remaining rival is unobserved-state coverage: stored paths do not enumerate every live state. The report already scopes that correctly and should not be strengthened to universal prune soundness.

This conclusion remains valid and is now classified **stable across known oracle support**.

### 2. Solution-order/phenotype claims: qualitatively sample-sensitive

The recent Solution Profile audit supplies an independent empirical sample-composition attack without requiring this audit to repeat it. Among levels whose early accepted-path sample appeared to have one must-cross order, later stored paths broke that apparent single-order phenotype in 73.9% of n=1 cases, 70.1% at n=2, 68.3% at n=3, 67.2% at n=5 and 66.8% even at n=10.

That is directly relevant to any path-derived diagnostic that tries to promote an observed order/obligation phenotype into a level property. The effect is qualitative, not merely a confidence interval widening: an apparent categorical property frequently changes as additional valid basins become observable.

The safe claim is “the observed accepted-path sample currently shares this order,” not “the level requires this order,” absent independent exact proof. This remains useful nominative evidence for representation/search hypotheses.

### 3. Known-prefix extinction: set-conditioned by construction

The observer indexes all valid labels from the selected gate and explicitly reports supported paths/families through frontier boundaries. Its documentation already states that a solved control may lose all known support and later solve through an unknown route. Therefore “known support was extinct by depth d/cause c” is an exact statement about the supplied oracle set, while “all solution support was extinct” is not licensed.

Historical score/width work strengthens this distinction. The extinction-adjacent case program selected same-parent siblings and then used independent CP-SAT/reference labels around the decision point. The important evidence was not merely that one stored path was culled; it was that an independently labelled live alternative existed while a preferred sibling could be dead. Those claims survive as **path-seeded, independently adjudicated** mechanism evidence.

By contrast, aggregate first/final known-support-loss timing remains **observed-set-conditioned** unless repeated under another scientifically justified path-set view.

### 4. Replay/profile/family agreement: lineage-dependent corroboration

The cross-resource ancestry audit established that 206,558 / 266,997 stored paths are replay-touched, 201,339 are replay-first by earliest fully dated discovery and 200,773 are replay-only in recorded origin terms. Every current parent is replay-touched. Thus family evidence, hint evidence, a profile phenotype and a representative path-derived diagnostic can all be deterministic or near-deterministic descendants of one family/replay event.

Agreement among those surfaces is useful coherence evidence. It is not four independent observations. For family-caused hypotheses, profile/path comparisons should filter replay-first ancestry or explicitly model the shared lineage.

## Cross-diagnostic ancestry findings

The recurring ancestry chain is:

`selected parent -> generated variant family -> variant-to-parent replay/discovery -> accepted path/provenance -> representative/path-set diagnostic -> Solution Profile or downstream mechanism nomination`.

Important consequences:

- multiple metrics computed deterministically from one selected path are one observation chain;
- multiple replayed paths from one family lineage are not automatically independent discoveries;
- a profile and a path diagnostic can share the exact accepted-path substrate;
- exact/reference adjudication adds a genuinely different truth source only for the labelled state/prefix, not for every descriptive feature of the path that selected it;
- same-parent sibling labels around one extinction event are excellent local controls but remain one parent family for generalization.

No evidence was found that current authorities systematically count raw provenance event volume as independent confirmation after the recent provenance/resource-contract work. The remaining risk is rhetorical aggregation across separately named diagnostics.

## Observability and provenance

The previous ancestry audit found no naturally replay-free current level cohort. That makes level-level “replay-free versus replay” comparisons misleading. The scientifically useful unit is path lineage.

It also showed that profile/path support volume is observability history rather than latent solution-space size: historically solver-positive migrated C1 rows have a median 331 stored paths versus 39 for surviving original solver-negative C2 rows despite comparable family-campaign breadth. Therefore “few observed solutions” cannot be promoted to “low solution diversity” without an attempted-discovery denominator or exact enumeration.

The seven preregistered IDs deliberately emphasize levels where non-replay-first support predates most replay observation. They are suitable future sensitivity cases, not unbiased prevalence samples.

No clean denominator exists for comparing all accepted-path origin types as discovery rates. In particular, the family replay campaign did not retain attempted/accepted denominators by family mode. This audit therefore makes no claim that replay, production, isolated technique, construction witness or external reference is intrinsically a better source of representative paths.

## Information-loss audit

Safe interpretation of path-derived artifacts may require: exact path identity/signature, structural revision, selection rule, evidence purpose, provenance/dependency stratum, replay ancestry, exact-label source, solver/config revision, conditioning cohort and path-set inclusion rule.

Findings:

1. **Representative-path analyzer gap, repaired.** `winning-path-analysis` used the shared representative selector but persisted only `provenanceEntries`. Historical artifacts therefore cannot prove which representative generated their rank trace. New output now includes the selection rule, exact path signature, structural family, dependency strata and origins. No old identity is fabricated.
2. **Known-prefix output gap.** The collector persists run/config identity, selected gate, label count/family counts and survival summaries, but historical outputs do not contain a compact oracle-set manifest sufficient to reconstruct replay-first/dependency-collapsed sample views. The documentation now makes this conditioning contract explicit. A producer-side compact manifest is the next narrow repair; it should not dump full provenance or create a universal result schema.
3. **Identity-bound replay gap already repaired elsewhere.** PR #1732 correctly made prune-gap/offline replay fail closed when exact witness identity is absent or unsupported, with an explicit legacy escape hatch. This is the correct model for step-indexed reference labels.
4. **Historical missingness remains missing.** Old artifacts lacking path identity/revision/selection metadata are path-conditioned historical observations, not candidates for guessed reconstruction.

## Claim propagation

- **Broad shared hard-prune false-positive hypothesis:** remains validly demoted; stable across known oracle support.
- **Known-prefix extinction class/cause:** remains valid but explicitly observed-set-conditioned. Exact/reference-labelled sibling conclusions remain stronger where independently adjudicated.
- **Local child-rank / heuristic-preference claims:** remain valid but explicitly selected-path-conditioned. New outputs retain exact oracle identity.
- **Observed must-cross/order rigidity:** already corrected by the Solution Profile audit; categorical level-property language is contradicted by alternate accepted paths in many sampled histories.
- **Family + profile + hint + path-diagnostic agreement:** nominative/coherent but ancestry-dependent unless replay/family dependence is filtered or modelled.
- **Low observed path diversity:** insufficient support for low latent solution diversity.

No current optimization-workstream disposition required reversal. The audit therefore does not edit the live workstream queue merely to advertise itself.

## Solver-relevant opportunities

The useful opportunity is better mechanism nomination, not another census.

When a live residual is nominated from a representative path or known-prefix extinction, ask one cheap question before implementing a mechanism: **does the nominated distinction survive another structurally different valid oracle or a conservative path-set view?** If yes, it graduates from basin-local description toward a solver/level mechanism. If no, the heterogeneity itself can be useful: it may identify a viable basin the current policy underserves rather than a universal structural defect.

Path sensitivity is therefore potentially positive evidence. A level where production systematically preserves one known family but loses another can expose search allocation, representation or ordering asymmetry that an aggregate “solved/unsolved” label hides.

## Explicit negative findings

- no surviving maintained generic `first stored solution` consumer was found among the decision-bearing representative-path surfaces reviewed;
- no evidence supports treating replay-derived paths as invalid positive oracles;
- no evidence supports discounting a correct identity-bound exact/reference artifact merely because another valid path exists;
- no broad hard-prune claim was weakened by oracle substitution within the stored-path population;
- no current solver policy change is earned directly by this audit;
- no denominator supports ranking accepted-path origins by intrinsic scientific quality or success rate;
- no basis exists for turning current stored path count into latent solution count.

## Methodological failures and boundaries

The deliberately rejected first substitution design would have manipulated storage order to change a representative while the output failed to retain representative identity. That would have coupled oracle selection to another uncontrolled variable. It was discarded rather than polished.

A second tempting analysis, comparing whole levels labelled “replay” and “non-replay,” was also rejected because the ancestry audit established that every current parent is replay-touched. The relevant contrast is path lineage, not level membership.

The frozen seven-level cohort remains a useful bounded follow-up after the maintained path analyzer can take an explicit representative/path-signature input. This audit does not manufacture per-level flip counts without that controlled execution surface.

## Repairs in this branch

- preregistered the sensitivity cohort before outcome interpretation;
- made `winning-path-analysis` persist exact representative identity and compact evidence/selection metadata;
- strengthened the known-solution-prefix survival authority with an explicit oracle-set identity/conditioning contract and identity-bound exception;
- produced this audit authority without touching experiment lifecycle schemas, the opt-in ledger, Audit 1 machinery or production solver behavior.

## Closeout

Accepted paths remain a high-value research substrate. Pathfinder may safely say “this diagnostic tells us something about the solver or level” when either the claim is a one-sided correctness statement exercised across the relevant known-path population, the result is stable across materially different valid oracles/path-set views, or an independent exact/reference mechanism adjudicates the actual truth claim.

Otherwise the correct wording is path-conditioned: “this is what the solver did along the selected observed basin” or “this is where the currently known support disappeared.” That narrower statement is not weak evidence. It is simply evidence whose conditioning variable is now visible rather than silently promoted into a puzzle property.
