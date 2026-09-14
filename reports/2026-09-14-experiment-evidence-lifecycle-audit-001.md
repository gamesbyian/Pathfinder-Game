<!-- agent-context-budget: warn=12000 max=16000 -->
# Experiment evidence lifecycle audit 001

> **Status:** concluded-positive-with-repairs
> **Last evidence:** 2026-09-14
> **Decision:** Pathfinder's current inference rules are substantially sound. The hostile forensic sample preserved the right distinctions between participation, conditioning, tested form, disposition, capability and execution validity. The main remaining weakness is reconstructability over time: decision-bearing evidence spans mixed producer eras, and some modern conclusions still depend on expiring GitHub Actions row artifacts.
> **Remaining gate:** prospective producer integration. As decision-bearing workflows are touched, migrate them to declared v3 contracts and durable closeout retention. Do not rerun history merely to fill metadata.
> **Evidence role:** inference/resource audit; no production solver-policy change.
> **Governing plan:** [`solver-research-inference-audit-framework.md`](../docs/solver-research-inference-audit-framework.md), [`solver-research-resource-next-audit-plans.md`](../docs/solver-research-resource-next-audit-plans.md), [`solver-research-resource-audit-implementation-blueprints.md`](../docs/solver-research-resource-audit-implementation-blueprints.md), and the [`resource contract`](../docs/solver-research-resource-contract.md).

## Audit object and frozen sample

The audited object was the whole decision-bearing chain:

`question/premise -> preflight -> population -> execution -> row/shard evidence -> combined result -> report -> disposition -> capability memory -> descendants`

Before interpreting outcomes, the forensic sample was frozen to the blueprint's semantic classes: `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` promotion; global portal coarse-state merge; admissible-order retry non-participation; global goal-attraction failure plus dead-last descendant; reserve-preserving high-int gate stop; residual-conditioned portal coarse-state freshness; a historically important pre-v3 transfer claim; and the 2026-08-27 treatment-flag plumbing failure. A current production-refresh v3 artifact was added only as a schema/control check.

No historical solver experiment was rerun. Existing source, reports, retained rows, current Actions artifacts, question relations, ledgers and capability memory were sufficient.

## Evidence topology found

The modern system is a joined evidence graph rather than one registry:

1. **Design/question state:** dated preflights and reports, `solver-research-question-relations.json`, workstream authority and the opt-in disposition ledger.
2. **Execution identity:** workflow inputs, source run/SHA, per-shard arm/flags, experiment contracts, configuration hashes and population hashes.
3. **Primary evidence:** per-level shard/combined rows in Actions artifacts or tracked benchmark/census files.
4. **Normalization/combination:** population-integrity and paired-arm checks, `solver-experiment-contract.mjs`, workflow-outcome classification and `publish-solver-sweep-result.mjs`.
5. **Opportunity/participation:** attempt telemetry plus opportunity and tier-participation tooling. Real participation means nonzero target-stage work or nodes, not an attempt label alone.
6. **Interpretation:** dated report plus explicit evidence role and population/selection language.
7. **Disposition versus capability:** the opt-in ledger records promotion state; capability memory separately preserves demonstrated gains/losses and residual nominations.
8. **Propagation:** question relations, workstreams, future gates and later preflights.

Three eras coexist:

- **v3 contract era:** `pathfinder-solver-experiment-result` can require immutable SHA, configuration hash, intended population identity, execution semantics, limits, side effects, population integrity and research outcome before `decisionBearing=true`.
- **modern pre-v3 sweep era:** strong row/shard evidence exists, but identity and scope may require joins across workflow, report and artifacts.
- **legacy/report-centric era:** literal outcomes can survive while modern population/configuration/conditioning fields are unknowable. Missing fields must stay unknown; current defaults are not legitimate backfill.

A useful negative control is production refresh run `34683011115`. Its current artifact is schema v3 with complete 60/60 artifact coverage and 100/102 Corpus-1 solves, but correctly records `decisionBearing: false`: there is no declared experiment contract, intended population is unknown to the publisher, and the contract issue is explicit. V3 therefore does not certify an ordinary benchmark just because a modern wrapper exists.

## Forensic reconstruction

| Case | Bottom-up verdict | Propagation |
|---|---|---|
| `PRUNE_MC_PORTAL_FORCED_NEIGHBOR` | **Reproduced from primary rows.** Runs `34557531960`/`34557533731` resolve to SHA `dd28ee07ba6669db5224fb3791a194fd5668dbfb`; same 219 unique IDs; control flag absent, treatment flag resolved. Independent recomputation: 0 versus 21 solves, +21/-0, 198 neither, zero errors/deadlines, 21/21 treatment solves referee-valid. `workSpent`: 51,794,598,716 versus 49,662,705,934. Nodes: 45,024,213,737 versus 41,659,932,525. | **Pass.** The A/B is a structural predicate inside the current control-miss residual, so it proves rescue capability there, not population prevalence. Promotion safety also depended on separate observer/oracle/replay gates. Current prose preserves this scope. |
| Global portal coarse-state merge | **Capability positive, promotion negative.** +158/-12 remains a real observation; `R01273` was root-caused to a coarse-key collision. | **Pass.** Global form is closed while the 158-gain basin remains capability memory and nominates current class-4 work. |
| Admissible-order non-default retry | **Non-participating, not null.** 150-row arms were nominally identical, but target retry attempts expanded/spent zero useful target-stage work after upstream exhaustion. | **Pass.** Current question state says the production path could not answer repricing and requires future nonzero participation. |
| Goal-attraction global swap | **Tested-form negative, premise alive.** Global form gained some rows but lost more; dead-last descendant later produced +3/-0 with real tier engagement. | **Pass.** Global swap closes while the safer descendant survives/promotes. |
| Reserve-preserving high-int IH | **Selected Gate 1 failed +1/-1.** `R02440` demonstrates rescue; `R02965` loses because inserted work leaves the old winner about 134K short. Prespecified disjoint 120-row Gate 2 was never run. | **Pass.** Placement descendant closes; no population-wide negative is invented. |
| Class-4 portal-coarse freshness | **Conditional current capability.** Eight prespecified rows from 113 current nominations, stratified across routing regimes, solve and referee-validate 8/8 under current production-shaped semantics. | **Pass.** Used as freshness evidence only, then routes to dead-last allocation. It does not reopen the closed global form. |
| September-3 whole-C1 static-portfolio transfer | **Literal run stands; transfer interpretation does not.** C1 is mostly random-generator rows historically selected for solver success, so whole-C1 cannot bear the old cross-generator claim. Genuine A-F 23 gives 22/23 for tranche-v2 and full-menu, with tranche-v2 spending more work. | **Previously failed, now repaired.** Re-evaluation preserves the observation while withdrawing entitlement it never earned. |
| 2026-08-27 confirmation-workflow flag bug | **Execution failure, not science.** Arm lived at `matrix.shard.arm` while flag wiring read nonexistent `matrix.arm`; treatment shards in four completed cohorts actually ran control. | **Previously failed badly, now repaired.** Control-vs-control comparisons and derived diagnoses are void. Workflows now persist resolved arm/flags and fail fast on mismatches. |

## Thin claim spine

**“Portal coarse-state merge is closed.”** Backward: +158/-12 global matched-work evidence plus deterministic `R01273` collision. Forward: global promotion and nearby salvage are suppressed, while class-4 dead-last exposure remains open because demonstrated capability survives. **Valid only with the form qualifier.**

**“Admissible-order retry repricing was tried.”** Backward: nominal attempts did zero target-stage work. Forward: question state is deferred and requires enforced nonzero participation. **A causal claim about 1.0 versus 0.18 would be false; current authorities avoid it.**

**“High-int reserve-preserving placement failed.”** Backward: prespecified selected two-row gate was +1/-1. Forward: 120-row Gate 2 is suppressed. **Valid for the placement descendant; no broad-population negative exists.**

**“The remaining class-4 problem is allocation.”** Backward: global form demonstrated a large gain basin but unacceptable collateral; current freshness replay reproduced 8/8 sampled nominations. Forward: workstreams ask for dead-last retry allocation. **Supported as a live premise, not a promotion verdict.**

## Repeated patterns and failures

### 1. Interpretation is stronger than retention

This is the largest live defect. The promoted prune is independently reconstructable today because its primary Actions rows remain downloadable, but GitHub marks those artifacts to expire **2026-12-10**. The current v3 production-refresh artifact expires **2026-12-11**. The harvest workflow persists solved hint/provenance material, not the full experiment rows and manifest needed to recompute an old verdict.

A claim can therefore be reconstructable now and report-only later. For future decision-bearing closeouts, durable retention should include the v3 manifest/contract plus combined primary rows sufficient to recompute population integrity, gains/losses, participation and work. Reuse the existing evidence/report topology; do not create another belief database.

### 2. V3 is conservative but adoption is incomplete

The v3 contract is a material improvement. Decision-bearing validation requires immutable execution identity, configuration/population hashes, execution semantics, limits and side-effect posture; population integrity separates structural coverage from decision-valid coverage; generic comparison refuses to become causal merely because populations match.

But a September 11 promotion still reconstructs from the preceding sweep-manifest era. Decision-bearing workflows should supply declared contracts at production time rather than require report archaeology later.

### 3. Participation is still a join

Correct semantics exist, but participation is commonly reconstructed from `attempts[]` via nonzero `workSpent`/`nodesExpanded`. The publisher computes stage reach, attempts, solves, nodes and work for human output, but the manifest does not expose that participation table as a first-class machine field. A future v3 extension should retain compact arm/stage participation summaries derived from the primary rows, without replacing the rows themselves.

### 4. Execution identity can poison interpretation

The August flag bug is the strongest warning: four plausible cohorts and several mechanism stories existed before configuration identity was checked at the execution boundary. The current hardening is the right repair. Decision-bearing workflows should record resolved treatment identity rather than infer it from dispatch intent.

## Modern versus legacy reconstructability

- **v3 + declared contract + retained rows:** potentially complete and mechanically checkable.
- **v3 without declared contract:** intentionally observational/non-decision-bearing.
- **modern pre-v3 Actions evidence:** often reconstructable while artifacts survive, but requires joins among workflow inputs, manifests, reports and rows.
- **tracked historical rows with frozen cohort definitions:** often reconstructable after normalization; absent modern fields remain bounded unknowns.
- **report-only/expired-artifact history:** literal outcomes may remain useful, but independent row recomputation is impossible; claims become nominative/forensic unless another durable primary source survives.
- **known execution failures:** void as causal evidence even when rows are preserved.

Historical dispositions from this audit are therefore: promoted portal-forced-neighbour remains valid; reserve-preserving selected Gate 1 remains valid at its tested scope; portal-coarse freshness remains conditional; whole-C1 transfer stays narrowed; admissible-order production repricing stays inconclusive; global goal-attraction, global portal merge and high-int reserve placement remain implementation-specific negatives; and the four pre-fix confirmation cohorts remain void execution evidence.

No bounded historical recheck is currently earned. None of the surviving ambiguities changes a live decision enough to justify new compute.

## Capability hidden by negative promotion economics

No current case silently erases useful capability from all downstream memory. Portal coarse-state is the strongest counterexample: +158 gains survive a -12 promotion result and directly nominate class-4 allocation work. High-int retains `R02440` rescue evidence despite closing the placement descendant. Goal-attraction capability survives through the safer dead-last form.

This is a meaningful negative finding: the disposition/capability split is doing scientific work rather than adding vocabulary.

## Live research implications

The audit does not change current priority. It strengthens two existing inferences:

1. Class-4 portal coarse-state capability is fresh enough that the next useful question is safe allocation/exposure, not rediscovery and not reopening global merge.
2. Class-2 must-turn-biased repair has demonstrated capability/placement, but promotion still depends on participant-aware economics and collateral. The admissible-order case is a direct warning not to count nominal attempts as treatment evidence.

No solver mechanism is newly promoted, closed or reprioritized here.

## Prospective repairs

1. **Durable closeout retention:** before decision-bearing Actions evidence expires, retain its v3 manifest/contract and combined primary rows, with source-run/artifact identity, in the existing research-evidence topology.
2. **V3 at production time:** decision-bearing workflows should declare the contract before execution. Benchmark workflows may remain conservative non-decision-bearing v3 producers.
3. **Participation summary:** add compact per-arm/stage reach, attempts, nonzero-work participation, work and nodes when available. Rows remain authority.
4. **Question/preflight links:** add stable ownership links where known instead of relying on experiment-ID archaeology.
5. **Resolved execution identity:** preserve actual treatment identity and workflow outcome so failed/cancelled/miswired executions cannot become science.
6. **Legacy discipline:** never synthesize missing SHA/config/population/conditioning from today's defaults. Preserve observations and narrow interpretations separately.

These are extensions of existing contracts, publisher, registry and report conventions. A universal belief database is not warranted.

## Explicit negative findings

The audit tried to break the current inference system and failed in important places: coverage and decision-valid coverage are distinct in v3; the generic publisher refuses causal inference from matched populations alone; zero target-stage work is treated as non-participation; residual evidence remains conditional; tested-form failure does not kill broader premises; unrun gates remain unrun; capability memory preserves gains from rejected treatments; current question relations generally carry the narrower claim; and execution/plumbing failures are voided rather than averaged into scientific history.

## Methodology corrections

Two initial instincts were discarded. Counting reports was a poor census because the scientific object is a joined decision chain, and one chain can span several runs/reports or branch into descendants. The census therefore followed producers, identities and consumers.

Likewise, “modern” cannot mean “v3”. The September 11 prune promotion is modern science with pre-v3 sweep artifacts; the September 12 production refresh is v3-shaped but deliberately non-decision-bearing. Reconstructability and declared protocol are the useful boundary.

The audit also avoided treating aggregate per-level `totalMs` as arm wall cost for sharded runs. `workSpent` is the cross-technique economic currency; nodes are depth/participation diagnostics; workflow wall time requires execution-level timing and censoring context.

## Bottom line

Pathfinder currently preserves **scientific scope** better than **scientific reconstructability**. The hostile cases mostly land in the right epistemic bucket: non-participation stays inconclusive, tested-form failures stay narrow, conditional evidence stays conditional, collateral does not erase capability, and plumbing failure is not science.

The remaining hazard is that some correct conclusions still depend on Actions artifacts with expiration dates. The next unit of research effort should not rerun history. Future decision-bearing experiments should retain the primary evidence needed to reproduce their verdict after CI artifacts vanish, while continuing to use v3's conservative identity/integrity gates and the existing capability/question machinery.
