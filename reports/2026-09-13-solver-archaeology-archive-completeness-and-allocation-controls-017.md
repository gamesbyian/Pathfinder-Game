# Solver archaeology: archive completeness and allocation controls

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — archived capability-gap, interoperability, shadow-eval, late-reserve, opt-in-ledger and winning-lineage snapshots reconciled against current workstreams and retained commit history
> **Decision:** preserve three durable consequences: participation/fairness is not itself an allocation objective; workflow arm identity must be observed rather than inferred; and the old state-conditioned must-cross anchoring question is absorbed as evidence for categorical phase/role-dependent completion, not a standalone scoring-policy backlog item.
> **Remaining gate:** none for this archive pass. Current allocation/acquisition gates remain those in `docs/solver-optimization-workstreams.md`; reopen historical mechanisms only through their current evidence boundary.
> **Evidence role:** archaeology / archive-coverage closeout
> **Selection:** explicit inventory of retained solver-heavy archive snapshots, followed by reconciliation of apparently open questions against later history and current authority.

## 1. Why this pass existed

Earlier archaeology followed mechanisms and vocabulary through commits, reports, reverts and deleted artifacts. That is high-yield but can miss documents whose terminology never survived into current code.

This pass therefore enumerated `docs/archive/snapshots/` first and sampled the solver-heavy documents as a universe rather than starting from a modern keyword. The most relevant additional reads included:

- `solver-heuristic-capability-gap-analysis.md`;
- `solver-interoperability-and-cooperation-plan.md`;
- `solver-shadow-eval-harness-2026-08-20.md`;
- `winning-lineage-survival-analysis-2026-08-20.md`;
- `solver-opt-in-experiment-ledger-2026-08-20.md`;
- `main-loop-late-reserve-experiment.md`;
- previously inspected family/scaling, repair-stagnation and queue snapshots.

Most apparent open items were already answered under later vocabulary. Three findings materially sharpen current interpretation.

## 2. A real starvation defect can be load-bearing

The August retry-tier staircase experiment is unusually useful scheduler evidence.

The motivating defect was real: in additive ladder-rerun tiers, the first config could consume the shared node ceiling before later configs received work. `STRATEGY_RETRY_TIER_NODE_STAIRCASE` fixed that mechanism directly.

On the measured 14-level sample, later-config coverage improved dramatically and sample-wide starvation fell from roughly **21-29% to 0%**. Mechanically, the treatment worked.

Outcome value moved the opposite direction:

- **0 solves gained** on the unsolved gain arm;
- **8 of 9** real first-config rescue levels lost on the risk arm;
- wall time rose roughly **72.7%** despite nodes falling about 1.4%.

The first config's ability to consume the whole reserve was not merely an unfair accident. It was carrying demonstrated capability. Equal redistribution fixed participation while destroying useful depth.

This complements the opt-in ledger's other participation failures:

- `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE` increased fallback participation about **7x** (20/300 -> 146/300) with an unchanged 132/300 solved set and zero fallback-attributable wins;
- `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE` solved its motivating starvation example locally but the population A/B was **828 -> 824, 0 gained / 4 lost**;
- producer->receptor beam seeding delivered non-redundant input and an isolated apparent repair gain, but the full ladder already solved that level and the handoff became 2/13 vs 2/13 with extra work.

**Durable allocation rule:** starvation/participation is a diagnosis, not an objective. Before redistributing fixed work, measure both recipient marginal value and the displaced producer's depth-sensitive capability. A participation floor can be correct plumbing and still be bad solver policy.

This belongs directly beside current WS2's progress-conditioned allocation question. It argues for predicting **incremental action value**, not maximizing action coverage or fairness.

## 3. Four confirmation cohorts were control-vs-control

Commit `8d37103e1db090fd357f3e7178bcab219afad484` found a workflow-level treatment identity bug in `solver-broad-confirmation.yml` and `solver-residual-confirmation.yml`.

The shard-plan matrix nested arm identity under `matrix.shard.arm`, but the workflow checked `matrix.arm`. That expression resolved empty, so the branch that appended treatment `--enable-flags` / `--disable-flags` never executed.

Consequently, four completed confirmation cohorts:

- `confirm-broad-003`;
- `confirm-broad-004`;
- `confirm-residual-001`;
- `confirm-residual-002`;

were **control versus control**, not control versus treatment.

Several apparently sophisticated diagnoses made from those runs were therefore downstream stories about a treatment that had never been enabled. The fix persisted resolved arm/flag artifacts per shard and added fail-fast checks for treatment shards with empty flag sets or control shards with non-empty sets. A fifth reserved cohort was cancelled on discovery rather than consuming another population identity.

**Classification:** treatment never ran, at workflow transport level. Byte-identical arms were not evidence of a null mechanism or even a scheduler interaction.

**Durable experiment-identity rule:** decision-bearing provenance must include the resolved arm and resolved flag/config set at the execution boundary. The experiment label, workflow input and matrix metadata are not enough.

This joins the April-May option-allowlist failures, stale batch branches/checkpoints, ablation default-semantics bugs and report-projection drift as the same general research-control-plane hazard: an upstream description can be true while the runtime treatment is false.

## 4. State-conditioned must-cross anchoring was an open 2026-08 question, but not a missing modern workstream

`solver-heuristic-capability-gap-analysis.md` explicitly preserved an open descendant after the unconditional `must-cross-horizon` treatment was closed:

- choose dynamically among pending must-cross targets, deliberate deferral, or neutral behavior;
- distinguish first-visit attraction from second-visit perpendicular-approach anchoring;
- use only current state such as remaining step/crossing slack, visit/axis state and competing objectives;
- begin as shadow/rank observation, not live policy.

The history behind that question is real and contradictory in the productive sense:

1. April's must-cross-focused treatment initially did not run because its eligibility gate depended on a condition false in hint-purpose audits.
2. After the gate was repaired, simple stronger early must-cross attraction still did not solve the hard cases.
3. May witness-rank work on L92 showed a valid path often moved **away** from obligations while constructing required intersection geometry; `intersectionHarvest` was created specifically to lower obligation attraction during that phase.
4. Later exact-labelled/future-feasibility work closed nearby scalar summaries and current authority now asks for changed represented information, categorical completion regimes and joint/dependency-conditioned commitments.

No later clean experiment was found that directly implements the August choose-target/defer shadow classifier under that exact framing. But the scientific question has been **subsumed**, not lost.

The useful residue is:

> the correct role of a pending obligation can be categorical and phase-dependent: pursue it now, preserve an approach/interface for later, or deliberately defer it while constructing another required geometry.

That supports the current categorical/joint-completion premise. It does **not** earn a standalone `must-cross anchoring` scoring workstream, another urgency weight, or a historical-policy revival.

If a current exact-labelled microscope exposes must-cross-heavy LIVE/DEAD siblings, this history is a reason to inspect role/ordering/interface compatibility rather than scalar urgency.

## 5. Interoperability archive mostly has clean descendants

The August interoperability plan's strongest rule was producer -> receptor specificity: non-redundant information is useful only if a measured receptor can exploit it cheaply enough at matched work.

Later history substantially answered its obvious first descendants:

- beam -> repair seed handoff: isolated apparent benefit, no full-ladder benefit;
- beam snapshots -> same-state IDA consumer: real participation, exhaustion/no rescue;
- repair elite -> deterministic prefix search: intermediate improvements but net-negative under shared budget;
- online allocation: many concrete starvation/reserve experiments, including both gains and the load-bearing-fairness negative above.

Therefore the broad “solver cooperation” plan is not an orphan. Current future-work correctly keeps only a typed producer->consumer reopening boundary requiring a measured consumer limitation, novel timely information, bounded cost, independent control and matched-work benefit.

## 6. Winning-lineage and shadow-eval archives are current Class-5 ancestry, not separate queues

The winning-lineage snapshot already established score/width extinction as the dominant known-support loss mechanism and exact-labelled at least one DEAD rank-1 sibling alongside a viable alternative. That work is directly ancestral to B1/B2 and the current Class-5 microscope.

The shadow-eval harness systematically scored several attractive middle-layer reasoners before production integration:

- separator/resource spectrum: sound but applicable to about 0.45% of atlas branches, too sparse;
- joint must-pass/must-cross tour: common applicability but only one unique extra dead catch, negligible;
- single-neighbor goal backward envelope: vanishingly rare, zero unique catches;
- must-cross neighbour-budget propagation: the notable exception, later promoted through live population evidence.

This is important negative archaeology because it shows the repo did not merely brainstorm separators/MDD/backward envelopes. It built the smallest sound slices, measured their terrain and stopped low-yield forms. Do not revive the broad named frameworks from the old research memo because their narrow probes were archived.

The methodological survivor is the shared offline exact-labelled/shadow scoring pattern already preserved in the archaeology register.

## 7. Archive completeness result

The explicit snapshot inventory did **not** uncover another high-value algorithmic orphan comparable to the descent-shadow observer or the solve-local dead-cause rejoin.

The strongest apparently-open item, adaptive must-cross anchoring, changes abstraction when reconciled with later evidence and is best absorbed into categorical/joint completion. The interoperability and winning-lineage plans have clear descendants. The shadow-eval plan contains measured closures rather than abandoned frameworks. Late-reserve/opt-in documents mainly strengthen allocation and experimental-integrity lessons.

This is a useful stopping result. It means further archaeology should be triggered by a current hard question or a newly discovered historical artifact, not by rereading the same retained archive hoping for another backlog.

## Bottom line

The final archive pass produced two durable controls and one premise refinement:

1. **Do not optimize scheduler fairness/participation. Optimize marginal solve/work value while protecting load-bearing depth.**
2. **Do not trust declared treatment identity. Persist and verify resolved runtime arm/config participation.**
3. **Treat old adaptive must-cross anchoring as evidence for categorical phase-dependent obligation roles, not as an untried scoring feature.**

Those findings sharpen existing current authority without adding a parallel opportunity catalogue or changing production solver behavior.