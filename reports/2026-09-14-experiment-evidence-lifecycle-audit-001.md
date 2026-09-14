<!-- agent-context-budget: warn=12000 max=16000 -->
# Experiment evidence lifecycle audit 001

> **Status:** concluded-positive-with-repairs
> **Last evidence:** 2026-09-14
> **Decision:** Pathfinder's current inference rules are substantially sound, and every hostile semantic control in the frozen forensic sample was classified at the right scope. The main remaining weakness is reconstructability over time: decision-bearing evidence still spans mixed producer eras, and some modern conclusions depend on expiring GitHub Actions row artifacts rather than durable retained primary evidence. Treat v3 experiment contracts as the prospective standard, preserve conditional/participation scope, and retain the combined primary rows plus manifest for decision-bearing closeouts before Actions expiry.
> **Remaining gate:** prospective producer integration. New solver compute is not earned by this audit. As decision-bearing workflows are touched, migrate them onto declared v3 contracts and durable closeout retention; do not rerun historical experiments merely to fill metadata.
> **Evidence role:** inference/resource audit. This report changes evidence interpretation and retention requirements, not production solver policy.
> **Governing plan:** [`solver-research-inference-audit-framework.md`](../docs/solver-research-inference-audit-framework.md), [`solver-research-resource-next-audit-plans.md`](../docs/solver-research-resource-next-audit-plans.md), [`solver-research-resource-audit-implementation-blueprints.md`](../docs/solver-research-resource-audit-implementation-blueprints.md), and the [`resource contract`](../docs/solver-research-resource-contract.md).

## Audit question and frozen sample

The audit object was a decision-bearing chain:

`question/premise -> preflight -> population -> execution -> row/shard evidence -> combined result -> report -> disposition -> capability memory -> descendants`

Before interpreting results, the forensic matrix was frozen to the blueprint's semantic classes: `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` promotion; global portal coarse-state merge; admissible-order retry non-participation; goal-attraction global-form failure plus dead-last descendant; reserve-preserving high-int gate stop; residual-conditioned portal coarse-state freshness; pre-v3/C1 transfer evidence; and the 2026-08-27 treatment-flag plumbing failure. A current production-refresh v3 artifact was added only as a schema/control check.

No historical solver experiment was rerun. Existing source, reports, retained rows, current Actions artifacts, question relations, ledgers and capability memory were sufficient.

## Evidence topology actually found

The modern machinery is not one registry. It is a joined system with useful separation of concerns:

1. **Design and question state:** dated preflights/reports, `solver-research-question-relations.json`, workstream authority and the opt-in disposition ledger.
2. **Execution identity:** workflow dispatch inputs, source run/SHA, per-shard arm/flag artifacts in hardened confirmation workflows, experiment contract declarations, configuration hashes and population hashes.
3. **Primary evidence:** shard/combined per-level rows in Actions artifacts or tracked benchmark/census files.
4. **Normalization/combination:** population-integrity and paired-arm checks, `solver-experiment-contract.mjs`, workflow-outcome classification and `publish-solver-sweep-result.mjs`.
5. **Opportunity/participation:** attempt telemetry plus `experiment-opportunity-audit.mjs` and tier-specific participation tooling. Real participation means nonzero target-stage work or nodes, not an attempt label alone.
6. **Interpretation:** dated report plus explicit evidence role/selection language.
7. **Disposition versus capability:** opt-in ledger answers promotion state; capability memory separately preserves gains/losses and current residual nominations.
8. **Propagation:** question relations, workstreams, future gates and later preflights.

Three evidence eras coexist:

- **v3 contract era:** `pathfinder-solver-experiment-result` can require immutable SHA, configuration hash, intended population identity, execution semantics, limits, side effects, population integrity and declared research outcome before `decisionBearing=true`.
- **modern pre-v3 sweep era:** strong row/shard artifacts and manifests exist, but identity/scope may still require the report and workflow to reconstruct what v3 would encode directly.
- **legacy/report-centric era:** literal outcomes may survive while modern population/configuration/conditioning fields are unknowable. Those fields must remain unknown; current defaults are not legitimate backfill.

A useful negative control is production refresh run `34683011115`. Its current `solver-sweep-result` is schema v3, has complete 60/60 artifact coverage, and records 100/102 Corpus-1 solves, but correctly declares `decisionBearing: false`: there is no declared experiment contract, intended population is unknown to the publisher, and the manifest reports `missing declared experiment contract`. V3 therefore does not certify an ordinary benchmark merely because a modern wrapper exists.

## Forensic reconstruction results

| Case | Bottom-up verdict | Propagation verdict |
|---|---|---|
| `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` promotion | **Reproduced.** Live Actions artifacts for runs `34557531960`/`34557533731` resolve to the same SHA `dd28ee07ba6669db5224fb3791a194fd5668dbfb`; control has no flag, treatment resolves `PRUNE_MC_PORTAL_FORCED_NEIGHBOR`; both contain the same 219 unique IDs. Independent row recomputation gives control 0/219, treatment 21/219, 21 gains/0 losses, 198 neither, zero errors/deadlines, and 21/21 treatment solves with `refereeValid=true`. Aggregate `workSpent` independently reproduces 51,794,598,716 versus 49,662,705,934; nodes reproduce 45,024,213,737 versus 41,659,932,525. | **Pass, with conditioning noted.** The A/B population is a structural predicate inside the current control-miss residual, so it is rescue evidence, not population prevalence. The report says this. Promotion safety also depended on the separate observer/oracle/replay gates, not on pretending a 0-solve control could reveal losses among ordinary current solvers. Ledger/workstream language remains scoped correctly. |
| Global portal coarse-state merge | **+158/-12 remains a real capability/collateral observation.** The global form loses current capability, with `R01273` mechanistically root-caused to a coarse-key collision. Failed bounded salvage forms do not erase the 158 valid gains. | **Pass.** Promotion is closed negative while capability memory preserves the gain basin. Current class-4 work uses those gains as nominations, then refreshed a stratified sample on current code. This is exactly the required disposition/capability separation. |
| Admissible-order non-default retry production A/B | **Non-participating, not null.** 150-row arms were nominally identical in outcome, but the target retry recorded attempts while expanding/spending zero useful target-stage work after upstream exhaustion. | **Pass.** Current question relations explicitly say the production path could not answer repricing and require a future canary with nonzero target-stage participation and differentiated work. No downstream “we tried 0.18 and it did nothing” claim survives. |
| Goal-attraction guidance global swap | **Tested-form negative, premise alive.** The global form produced gains but larger losses; the additive dead-last descendant later produced +3/-0 in a reach-conditioned confirmation with real tier engagement. | **Pass.** Ledger closes `SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE` only in the global-swap form while retaining/promoting `STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY`. Failure of one placement/form did not become premise failure. |
| Reserve-preserving high-int IH exposure | **Selected mechanism gate failed +1/-1.** `R02440` still demonstrates the added action's rescue capability; `R02965` still loses because the inserted work leaves the old winner about 134K work short. The prespecified disjoint 120-row Gate 2 was never run. | **Pass.** Ledger/report close the placement descendant, not an imaginary 120-row population result. The unrun gate remains explicitly unrun. |
| Class-4 portal coarse freshness replay | **Conditional current capability, not broad effect size.** Eight prespecified rows were selected from the 113 current class-4 nominations, stratified across three routing regimes; 8/8 solve and referee-validate under current production-shaped work semantics. Node totals above the base 50M reserve are correctly explained by additive tier reserves. | **Pass.** Question relations conclude only that the basin is fresh and route the next question to dead-last allocation. They explicitly forbid reopening the closed global form. |
| September-3 whole-C1 static-portfolio transfer claim | **Literal run stands; transfer interpretation does not.** Corpus-selection audit showed current C1 is mostly random-generator rows historically selected for solver success, so whole-C1 cannot bear the old cross-generator claim. On the genuine A-F 23, tranche-v2 and full-menu both solve 22/23 and tranche-v2 spends more work. | **Previously failed, now repaired.** The historical re-evaluation ledger and current method docs narrow the claim and preserve the exact observation. This is the model for legacy correction: do not rewrite the run; withdraw entitlement it never earned. |
| 2026-08-27 confirmation-workflow flag bug | **Execution failure, not science.** `matrix.arm` was wrong because arm lived at `matrix.shard.arm`; every treatment shard in four completed confirmation cohorts actually ran control configuration. | **Previously failed badly, now repaired.** Several increasingly elaborate scientific diagnoses were built on control-vs-control before the wiring error was found. Those comparisons are void, not negative. The workflows now persist resolved arm/flags per shard and fail fast on mismatches. |

## Thin claim spine

Four strategically dangerous claims were traced backward and forward.

**“Portal coarse-state merge is closed.”** Backward: +158/-12 global matched-work evidence plus a deterministic `R01273` collision. Forward: global promotion and nearby salvage are suppressed, but class-4 dead-last exposure remains open because the 158 gains are preserved as capability. **Valid only with the form qualifier.**

**“Admissible-order retry repricing was tried.”** Backward: the production A/B reached nominal retry attempts but did zero target-stage work. Forward: question state is deferred and requires enforced nonzero participation. **A claim that 1.0 versus 0.18 was causally tested would be false; current authorities avoid it.**

**“High-int reserve-preserving placement failed.”** Backward: a prespecified selected two-row mechanism gate was +1/-1. Forward: the 120-row Gate 2 is suppressed. **Valid for the placement descendant; no population-wide negative exists.**

**“The remaining class-4 problem is allocation.”** Backward: global form demonstrated a large positive basin but unacceptable collateral; current freshness replay reproduced 8/8 sampled nominations. Forward: workstreams ask for a dead-last retry canary then 113-row allocation. **Supported as a live research premise, not yet a promotion verdict.**

## Repeated failure patterns

### 1. Scientific semantics are stronger than evidence retention

The biggest live defect is temporal reconstructability. The promoted prune's primary row artifacts are presently downloadable and made the independent recomputation above possible, but GitHub marks them to expire **2026-12-10**. Current production-refresh v3 artifacts expire **2026-12-11**. The repository's harvest workflow deliberately persists solved hint/provenance material from source runs, but it does not persist the experiment's full primary combined rows or v3 manifest.

Therefore a claim can be fully reconstructable today and become report-reconstructable only after Actions retention expires. A dated report is valuable interpretation, but it is not primary row evidence. For future decision-bearing closeouts, durable retention must include the v3 manifest/contract plus the combined primary row artifact(s) sufficient to recompute population integrity, gains/losses, participation and work. Use an existing reports/evidence location and registry entry; do not invent a parallel belief database.

### 2. V3 is conservative but adoption is incomplete

The v3 contract is a substantial improvement. `decisionContractIssues()` requires immutable execution identity, configuration/population hashes, execution semantics, limits and side-effect posture; `buildPopulationIntegrity()` separates structural coverage from decision-valid coverage; the generic publisher refuses to infer causal A/B status merely from matched populations.

But a September 11 promotion still reconstructs from the preceding sweep-manifest era, and the current production refresh demonstrates that simply wrapping old-shaped output in v3 produces a deliberately non-decision-bearing artifact. Prospective decision-bearing workflows should supply declared contracts at production time rather than rely on report archaeology.

### 3. Participation remains a join, not a single field

The correct semantics exist, but real participation is commonly reconstructed from `attempts[]` using nonzero `workSpent`/`nodesExpanded`. The publisher's human summary computes stage reach, attempts, solves, nodes and work, yet the manifest does not currently expose that stage-participation table as a first-class machine field. This is tolerable while row evidence is durable; it becomes expensive archaeology when rows expire. A future v3 extension should retain compact arm/stage participation summaries derived from the same primary rows, without making the summary a substitute for those rows.

### 4. Historical execution identity can contaminate interpretation for a long time

The August confirmation bug is the strongest warning. Four plausible-looking cohorts and multiple mechanism stories were generated before configuration identity was checked at the execution boundary. The eventual hardening, per-shard resolved flags plus fail-fast mismatch detection, is the right prospective fix. Similar decision-bearing workflows should prefer machine-recorded resolved treatment identity over inference from dispatch intent.

## Modern versus legacy reconstructability

- **Current v3 with declared contract + retained rows:** potentially complete. Exact identity, intended population, coverage/decision validity and protocol can be mechanical.
- **Current v3 without declared contract:** intentionally observational/non-decision-bearing; useful but does not earn a causal verdict.
- **Modern pre-v3 Actions evidence:** often scientifically reconstructable while artifacts survive, but requires joins among workflow inputs, manifests, reports and raw rows.
- **Tracked historical rows with frozen cohort definitions:** often reconstructable after normalization; missing modern fields remain bounded unknowns.
- **Report-only or expired-artifact history:** literal reported outcomes may remain useful, but independent row recomputation is impossible. Such claims become nominative/forensic unless another durable primary source exists.
- **Known execution failures:** void as causal evidence even when their rows are perfectly preserved.

## Historical claim dispositions from this audit

- **Remain valid:** promoted portal-forced-neighbour result; reserve-preserving selected Gate-1 result; current portal-coarse freshness statement; exact row outcomes from straight paired A/Bs with known participation and protocol.
- **Need/retain narrowing:** whole-C1 static-portfolio transfer; any residual/reach-conditioned effect-size language; portal-coarse claims outside the tested global form/current freshness sample.
- **Nominative only:** historical capability signatures not reconciled on current code; legacy rows whose current configuration identity cannot be established.
- **Implementation-specific negatives:** global goal-attraction swap, global portal coarse merge, high-int reserve-preserving placement.
- **Non-participating/inconclusive:** admissible-order production repricing A/B.
- **Void execution evidence:** the four pre-fix broad/residual confirmation comparisons affected by `matrix.arm`.
- **No bounded recheck currently earned:** none of the ambiguities discovered changes a live solver decision enough to justify new compute. Existing live Class-2/Class-4 gates already ask the right next questions.

## Capability hidden by negative promotion economics

The audit found no current case where capability is silently erased from all downstream memory. The important opposite example is portal coarse-state merge: +158 gains survive a -12 promotion result and now directly nominate class-4 allocation work. High-int IH similarly retains the `R02440` rescue as mechanism evidence even though the placement descendant closes. Global goal-attraction's useful capability survives through the safer dead-last descendant.

This is a meaningful negative finding: the recently introduced disposition/capability split is doing real scientific work rather than adding vocabulary.

## Live solver opportunities exposed

The audit does **not** change current priority. It reinforces two live inferences:

1. Class-4 portal coarse-state capability is real enough that the next information-bearing question is safe allocation/exposure, not rediscovery of the mechanism and not reopening global merge.
2. Class-2 must-turn-biased repair has demonstrated placement/capability, but promotion still depends on participant-aware economics/collateral. The non-participating admissible-order history is a direct warning not to accept nominal stage reach as evidence in that gate.

No new solver mechanism was promoted, closed or reprioritized by this audit.

## Prospective producer/consumer repairs

1. **Durable closeout retention:** before a decision-bearing Actions artifact expires, retain its v3 manifest/contract and combined primary rows in the existing research-evidence/report topology, with source-run/artifact digest. The report remains interpretation; retained rows remain primary evidence.
2. **V3 at dispatch/production time:** decision-bearing workflows should declare the contract rather than rely on the publisher to infer fields after execution. Non-decision-bearing benchmark workflows should remain allowed to publish conservative v3 wrappers.
3. **Participation summary in the existing result shape:** expose compact per-arm/stage reach, attempts, nonzero-work participation, work and nodes when available. Preserve rows as authority.
4. **Question/preflight links:** when touching v3, add stable pointers to owning question/preflight where the relationship is known. Do not require archaeology from experiment ID naming.
5. **Accepted-attempt identity:** retain workflow outcome plus resolved treatment identity so failed/cancelled/miswired execution cannot silently enter science.
6. **Legacy discipline:** never synthesize missing SHA/config/population/conditioning from today's defaults. Preserve literal observation and narrow the claim separately.

These are incremental extensions of existing contracts, publisher, registry and report conventions. No universal belief database is warranted.

## Explicit negative findings

The audit tried to break the current inference system and failed in several important places:

- coverage and decision-valid coverage are mechanically distinct in v3;
- generic publisher comparison refuses to become causal merely because populations match;
- zero target-stage work is already treated as non-participation;
- residual evidence is explicitly conditional in current authorities;
- failed tested forms do not automatically kill broader premises/descendants;
- unexecuted later gates remain unexecuted rather than being summarized as negatives;
- capability memory preserves useful gains from rejected treatments;
- current question relations generally carry narrower claims than the tempting shorthand;
- execution/plumbing failures are explicitly voided rather than averaged into treatment history.

## Methodology corrections during the audit

Two initial instincts were wrong and were corrected rather than baked into the conclusion.

First, counting experiment reports would have been a poor census because the independent object is a decision-bearing chain and one chain can span several reports/runs or branch into descendants. The topology census therefore followed producers, identities and consumers instead of filenames.

Second, “modern” could not be equated with “v3”. The September 11 promoted prune is modern science with pre-v3 sweep artifacts; the September 12 production refresh is v3-shaped but deliberately non-decision-bearing. The useful boundary is reconstructability and declared protocol, not schema age alone.

The audit also avoided interpreting aggregate per-level `totalMs` as arm wall cost for sharded runs. `workSpent` is the cross-technique economic currency; nodes are depth/participation diagnostics; workflow wall time requires execution-level timing and censoring context.

## Bottom line

Pathfinder is currently better at preserving **scientific scope** than it is at preserving **scientific reconstructability**. The hostile cases mostly land in the right epistemic bucket: non-participation stays inconclusive, tested-form failures stay narrow, conditional evidence stays conditional, collateral does not erase capability, and plumbing failure is not science.

The remaining hazard is that some of those correct conclusions still depend on Actions artifacts with an expiration date. The next unit of research effort should not be spent rerunning history. It should be spent ensuring that future decision-bearing experiments retain the primary evidence needed to reproduce their verdict after the CI artifact has vanished, while continuing to use v3's conservative identity/integrity gates and the existing capability/question machinery.