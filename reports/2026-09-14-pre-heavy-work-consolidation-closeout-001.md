# Pre-heavy-work consolidation closeout 001

> **Status:** complete
> **Date:** 2026-09-14
> **Scope:** bounded research consolidation before substantial solver/runtime implementation or expensive experiment work
> **Decision:** hand the live queue back to implementation with Class 4 first, Class 2 second, Class 5 third. No evidence from this pass changes WS2 priority.

## Executive closeout

This pass reconciled the post-audit tree, merged PR #1801, reduced the remaining live questions to implementation/experiment contracts, and deliberately stopped where retained evidence cannot support stronger claims.

The important net changes are:

1. PR #1801 is merged and its historical-claim ancestry corrections are now the floor for reuse.
2. Class 5 now has a defensible **open-path** representation candidate: endpoint-conditioned fundamental-groupoid / lifted-puncture-phase coordinates accumulated along the actual prefix, with no artificial endpoint closure. The representation is promising but unimplemented and has not earned broad label acquisition.
3. Class 3 historical exact-action dose triage is closed as **not reconstructible** from the retained 37-row atlas because legacy attempt rows do not contain exact per-attempt `workSpent`. No retrofit campaign is justified.
4. Class 4 is implementation-ready as a true-dead-last additive retry. The canary and advancement criteria are frozen below.
5. Class 2 is experiment-design-ready, but the exact 60 row identities are **not yet honestly freezeable** from retained evidence. The deterministic control-side materialization procedure is frozen; the first bounded execution step must materialize and pin those identities before either A/B arm runs.
6. Expiring September 11 portal-forced-neighbour Actions artifacts were recovered and inspected without rerunning the solver. They remain legacy evidence because the old rows cannot satisfy v3 exact-action participation/dose semantics. Their run/artifact identities are recorded below so they remain recoverable while Actions retention permits.

No substantial solver behavior was changed. No broad corpus campaign was launched. No temporary workflow was added.

## 1. Tree and audit residue reconciliation

PR #1801, **Audit historical solver claims through evidence ancestry**, was reviewed on its final head with both Actions gates green and squash-merged into `main` before this branch was cut.

Its correction is reflected by the current historical-evidence reuse posture: replay/family/hint/Solution-Profile/path-derived descendants must not be counted as independent confirmations merely because they are separate files or experiment products. No stale queue ordering or question state discovered during this pass requires a canonical reorder.

PR #1800 had already carried the audit-program reconciliation into the durable front doors. In particular:

- producer maturation remains touch-driven rather than a second evidence system;
- an oracle-set conditioning manifest remains prospective until a real known-prefix experiment needs it;
- the frozen seven-level accepted-path representative-sensitivity cohort remains dormant until a live claim actually depends on one representative path or path-set view.

Those items were not duplicated here.

## 2. Class 5 open-path topology representation gate

### Rejected construction: arbitrary endpoint closure

Do not turn an open prefix into a loop by attaching an arbitrary path from the current endpoint back to the gate and then call the resulting loop winding/H-signature an intrinsic prefix property. The measured class changes with the closure and can therefore report reference-path choice rather than already-incurred search commitment.

That construction fails the gate.

### Surviving construction

Model an open path `gamma` from the fixed gate/start `s` to its actual current endpoint `e` as an element of the **fundamental groupoid** of the traversable domain, rather than forcing it into a fundamental-group loop.

For deterministic punctures/reference obstacles `zeta_k`, maintain a continuously lifted phase coordinate along the actual path only:

`h_k(gamma) = (1 / 2pi) integral_gamma d arg(z - zeta_k)`

The implementation should track the lifted angular change continuously along `gamma`; it must not round it into an integer winding number for an open path.

For fixed endpoints, homotopies that avoid the relevant punctures/forbidden regions preserve the groupoid class and the corresponding lifted-coordinate differences. For varying endpoints, raw phase values carry a gauge/branch dependence, so **endpoint identity/geometry is part of the conditioning key**. Changing a branch/reference convention must induce the predicted gauge transformation rather than change the inferred topology arbitrarily.

This is the required invariance story. It also supplies the endpoint-identity control that the closure construction lacked.

### Why it could matter to completion feasibility

The representation records obstacle-side and topological commitments already incurred by the prefix. Two states with similar endpoint geometry can have different endpoint-fixed path homotopy classes, and moving between those classes can require crossing a forbidden region or undoing commitments that the legal path model does not permit. That gives the representation a plausible route to separating future completion regimes rather than merely summarizing local geometry.

That is only a premise. It is not yet evidence that Pathfinder's current residuals contain useful LIVE/DEAD contrast on this axis.

### Runtime and evidence boundaries

A future runtime observer may use only the current board/path geometry and deterministic board-derived references. It must not use level IDs, historical outcomes, hints, family labels, capability memory, or a historical accepted answer path as routing inputs.

Offline exact LIVE/DEAD labels may be joined for evaluation. Parent/family ancestry remains an evidence-stratification variable, not a runtime feature.

### Smallest observer contract

Implement only after Class 4 / Class 2 work if Class 5 remains live. For each exact-labelled current state emit:

- current endpoint identity/geometry controls;
- deterministic puncture/reference-set identity;
- lifted open-path phase vector or equivalent groupoid-coordinate encoding;
- the same encoding under at least one admissible branch/reference perturbation;
- exact LIVE/DEAD label;
- parent/ancestry stratum for analysis only.

The observer must prove on fixtures that endpoint-fixed homotopies preserve the representation up to the declared gauge, and that allowed branch/reference changes produce the predicted transformation.

The first pilot should ask whether the representation supplies separation **within endpoint/geometry-controlled strata**, not whether it correlates globally with LIVE/DEAD.

If existing exact-labelled material lacks natural controlled contrasts, stop. The smallest earned acquisition is a human/editor-parent paired intervention that tightly preserves endpoint/current-board geometry while changing earlier path topology, followed by exact descendant labelling. Do not select mutations by solver outcome. Whole parent families are the independent unit, with unrelated-parent confirmation before generalization.

**Gate result:** representation promising but unimplemented. No broad label purchase earned.

The accepted-path seven-level substitution cohort is **not activated** by this result because the proposed runtime representation does not depend on one historical accepted path.

## 3. Class 2 economics cohort freeze

The treatment itself remains frozen exactly as preregistered:

- `STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY=true` only in treatment;
- stage `late-repair-must-turn-biased-retry`;
- existing 7,000,000 stage-local node cap;
- existing fresh stage work scope and placement;
- 50M starting node budget and 67M starting work budget under current additive semantics;
- all other production defaults identical.

The development pair `R02768` / `R02180` remains excluded from the primary cohort. `R03049` remains excluded from must-turn-guidance gain accounting because it is a dose/allocation case.

### What can be frozen now

The selection procedure is now the immutable pre-outcome contract:

1. execute the locked **control** only on the eligible current population;
2. retain only rows that contain a must-turn obligation, actually participate in ordinary `late-repair-search`, satisfy the child retry structural gates, and reach the point where the child treatment would be legal;
3. exclude the development pair before sampling;
4. partition by control result into:
   - control-unsolved after the full ladder;
   - control-downstream-solved only after `late-repair-search` via a later production stage;
5. apply one pinned deterministic seed/version to each stratum;
6. freeze 40 unsolved actual participants and 20 downstream-solved actual participants, or all available collateral rows with unused collateral slots transferred to the unsolved stratum;
7. commit/pin the exact ID list and hash, corpus hash, base SHA, selection seed/version, arm flags, envelope, scheduler/workers and stage ordering **before treatment outcomes are inspected**.

That materialization step is population freezing, not capability discovery.

### Why the 60 IDs are not claimed frozen here

The retained development evidence proves placement/capability on the two development rows but does not contain the preregistered 60-row participant population. No committed exact cohort manifest was found, and fabricating identities from outcome knowledge would violate the preflight.

Therefore this pass does not pretend that a 60-row ID file exists. Claude's first Class-2 execution task is the bounded control-side materialization above, followed immediately by pinning the cohort before either matched arm is run.

### Frozen analysis semantics

Use symmetric censoring/error treatment. A treatment row counts as participating only with nonzero target-stage nodes or `workSpent`. Decision-bearing coverage requires at least 75% of gain rows to genuinely reach/participate in treatment and at least 75% of collateral rows to still reach the insertion point.

Primary outputs are paired referee-valid gains/losses, downstream displacement/starvation, incremental whole-solve and target-stage `workSpent`, wall cost, participation, censoring/termination, and winning stage. `workSpent` is the cross-technique economic currency.

The advancement/stop rule remains the existing preflight rule: at least one new referee-valid target-stage solve, zero credible solve losses, no material downstream starvation, valid participation, symmetric censoring and quotable incremental economics. Zero gains after informative participation on at least 30 gain rows closes automatic dose widening.

## 4. Class 3 exact-action dose triage

The 37 historical rows cannot be partitioned retrospectively into zero-work, underdosed, comparable-work-failed and unknown using retained evidence.

The legacy attempt records expose action/stage identity, nodes, elapsed time and termination diagnostics, but not exact per-attempt `workSpent`. Modern comparable-work semantics therefore cannot be reconstructed faithfully.

**Disposition:** stop. Do not launch a broad campaign merely to retrofit observability into historical rows. Any future Class-3 negative must be generated under the current v3 evidence contract with actual target-action participation and dose.

## 5. Class 4 dead-last portal-coarse retry implementation contract

Claude may implement this next without rediscovering the experiment design.

### Placement and state semantics

Add one stable, explicit, default-off retry stage **after every currently promoted normal/additive retry has exhausted or failed for the target state and immediately before final failure**.

The retry starts from the exact predecessor state that existed before the exhausted descendant attempts. Do not continue from a partially mutated failed descendant and do not inherit mutable search state that makes treatment/control histories differ before retry entry.

Give the retry its own fresh additive work scope. It receives a pinned production-sized node/work reserve; it does not steal work from earlier stages and does not inherit spent-credit accounting from them.

### Treatment/control identity

Both arms contain the identical new retry shell, placement, eligibility, predecessor reconstruction, scheduler/worker transport, and fresh work envelope.

Only the treatment retry enables `STRATEGY_PORTAL_COARSE_STATE_MERGE`, via retry-local/proxy configuration. Global portal-coarse enablement is forbidden in this experiment.

The target action/retry has one canonical stable identity. `dispatch` is not participation.

The feature is opt-in and default-off. With the flag off, existing production behavior before retry entry must be byte/semantically unchanged except for inert telemetry needed to identify eligibility.

### Required telemetry

Per row retain:

- eligibility;
- retry entry/dispatch;
- exact target-action participation;
- retry-local nodes and exact `workSpent`;
- whole-attempt/stage `workSpent`;
- wall time;
- solve/winning stage;
- termination/censor/error reason;
- referee validity;
- resolved treatment identity and execution identity.

Earlier-stage work must be equal between matched arms. Any earlier-stage divergence is an implementation defect, not experimental collateral.

### Canary population

Use the prespecified freshness rows:

`R00082, R02173, R02807, R03365, R00466, R03228, R00329, R03303`.

Add `R01273` as the known broad-form regression sentinel and at least two non-portal no-op controls selected without treatment outcome knowledge.

`R01273` is not just another aggregate row: its earlier production solve/path must remain unaffected. Losing or materially perturbing that earlier success is direct evidence that the supposedly isolated retry is leaking into prior behavior.

Non-portal controls must record zero retry participation.

### Canary pass/fail

Advance only if:

- at least one of the eight freshness rows is solved by the new retry;
- every claimed solve is referee-valid;
- retry participation carries fresh nonzero work;
- `R01273`'s earlier production solve/path is unaffected;
- non-portal controls have zero participation;
- earlier stages lose no work and show no treatment/control divergence;
- the wall deadline is nonbinding.

A genuine-participation 0/8 result stops this form before any 113-row population run. Diagnose exposure mismatch rather than globally re-enabling the merge or scaling dose by reflex.

A passing canary earns exactly the frozen 113 current Class-4 portal-coarse nominations as the first population test. Pin their IDs/current-residual identity before dispatch. Measure referee-valid gains, participation, additive `workSpent`, wall cost and any collateral. The form closes if that matched test fails to show materially favorable benefit/economics or introduces credible collateral.

## 6. Durable evidence retention / legacy backfill

The September 11 portal-forced-neighbour promotion still has two important pre-v3 Actions artifacts that expire on the normal Actions clock. They were downloaded and inspected during this pass without rerunning the solver:

- control run `34557531960`, artifact `10184352867`, artifact digest `sha256:b2273d0c85846fc6703531af8013a7b6977bedab7ed3878d6c409a02cfbb9ac7`;
- treatment run `34557533731`, artifact `10186164243`, artifact digest `sha256:6f84f949219687b35d14ba86e8cae0d344c18a342e6438b5e744ded23d735119`.

Each contains the same 219-row primary population and enough top-level row identity/outcome/work information to recompute paired gains/losses and whole-row work. The retained attempt schema, however, predates exact per-attempt `workSpent` and therefore cannot support modern exact-action dose/participation claims.

PR #1799 intentionally makes v3 identity/primary-row retention stricter than these old artifacts. This pass does **not** launder legacy rows into a fake v3 manifest or create a parallel evidence system merely to call them durable.

The artifacts remain historically useful for the promotion claim while available; their exact run/artifact/digest identities are now pinned here. If a future recovery tool explicitly supports a labelled legacy bundle without pretending to satisfy v3 participation semantics, these are worth backfilling before expiry. Rerunning the solver solely to modernize this historical bundle is not justified.

The recurring v3 experiment-manifest + primary-row bundle is useful infrastructure, but this pass does not promote it to audit-grade Resource Contract status. Its contract is still producer-touch-driven and its scientific meaning remains experiment-specific.

## 7. Other requested bounded checks

### Producer maturation

No new producer was touched, so no speculative cross-repo migration was performed. The next touched producer should declare v3 before execution, resolve treatment identity, emit compact arm/stage participation summaries derived from primary rows, link owning question/preflight, and separate execution failure from scientific outcome.

### Known-prefix oracle-set manifest

Not activated. No new known-prefix survival experiment in this pass needs a conditioning-set identity. Add the compact manifest when such an experiment is actually scheduled; do not dump the provenance graph into every run.

### Accepted-path representative sensitivity

Dormant. The Class-5 representation above uses the actual current prefix and deterministic board geometry, not one chosen historical accepted solution, so the Audit-3 seven-level substitution cohort is not earned.

### Representation-sensitivity lineage-survival preflight

If this question is reactivated, use whole-parent independent units, unrelated-parent replication, matched geometry/interface controls, an isolated canonical target action with equalized target-action work, and a held-out prediction declared before intervention. Do not explain an effect as simple tie order unless tie order is directly observed.

### Basin-overlap, arbitrary-target feasibility, repair-descent shadow, forced chains and commuting excursions

No current allocation decision became dependent on these during this pass. No observer was built for ceremony.

- Cross-attempt basin overlap remains a valid archaeology question but is not presently blocking Class 4/2/5 allocation.
- Class 5 has not yet nominated a specific future-event feasibility feature, so the March arbitrary-target/trap machinery was not resurrected.
- Current evidence did not newly isolate append-only repair descent as the next causal bottleneck, so no CP-LNS-like behavior was implemented.
- No evidence here nominates forced-chain traversal as a material work sink, so no optimization was proposed.
- No exact/accepted-path evidence here nominates redundant obligation ordering strongly enough to justify a commuting-excursion replay.

### Human-parent contrast apparatus

No new standing corpus was generated. A controlled human/editor-parent contrast is conditionally earned only if the Class-5 observer is sound and natural exact-labelled cases remain contrast-starved. At that point the dry run must verify parent identity, delegated mutation/validation, preserved witness semantics, absence of solver-outcome filtering, family namespace/manifest completeness, explicit development/confirmation/transfer roles, and parent-family independence.

### Research plumbing cleanup

No temporary workflow was introduced by this pass, so none remains to remove. No evidence was found that justified expanding this bounded closeout into another naming/dead-script cleanup project.

## 8. Residual x evidence-availability planning view

This table is planning-only and is not a capability database.

| Residual | Exact labels / referee | Accepted paths | Family / replay ancestry | Current capability evidence | Participation / dose telemetry | Human-parent contrast need |
| --- | --- | --- | --- | --- | --- | --- |
| Class 4 portal dead-last | Yes for canary claims | Not required for gate | Historical ancestry now explicitly controlled | Yes; broad merge capable but unsafe | Must be generated prospectively in isolated retry | No |
| Class 2 must-turn economics | Yes on development capability rows; referee required prospectively | Not primary | Development rows identified and excluded | Yes | Prospective target-stage participation required; exact 60 IDs not retained | No |
| Class 5 open-path topology | Exact-labelled material exists but current descriptors were contrast-starved | Available, but not global proof | Must stratify dependence; do not count descendants independently | Representation premise only | Not an action-dose question | Conditional if natural controlled contrasts remain absent |
| Class 3 historical dose atlas | Historical outcomes exist | Not relevant | Known | Historical negative is dose-ambiguous | **Insufficient: no exact per-attempt `workSpent`** | No |

This view argues against generating new evidence where current evidence already answers the gate, and identifies Class 5 controlled topology contrast as the only plausible future acquisition need exposed here.

## 9. Final reconciliation and Claude handoff

The live authorities, question relations, opt-in posture, capability memory, Resource Contract/resource inventory, and recent audit conclusions remain compatible with the following WS2 order:

1. **Class 4 portal coarse-state dead-last allocation/economics.** Implement the isolated retry contract above and run only the canary first.
2. **Class 2 must-turn participant-aware economics/collateral.** Materialize/pin the 60-row control-side cohort, then run the locked paired A/B.
3. **Class 5 open-path topology representation/acquisition.** Implement only the small groupoid/lifted-phase observer after the higher-priority gates, then test existing exact-labelled material before buying contrasts.

Class 3 requires no immediate execution. The historical 37-row dose ambiguity is an observability boundary, not an invitation to rerun a broad campaign.

No current historical conclusion needed promotion to stronger confidence after PR #1801. No live queue reorder is earned. The repo is ready to hand back to Claude with implementation and experiment contracts rather than research questions to rediscover.
