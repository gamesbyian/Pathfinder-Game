# WS1 late-continuation independent confirmation preflight 001

> **Status:** preflight-complete / no dispatch
> **Date:** 2026-09-22
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Evidence role:** confirmation
> **Decision:** the next decision-bearing WS1 evidence should be a prospectively frozen independent-parent family block, scored by the exact frozen 15-signature model under the ordinary production scheduler. Use a staged 24-parent opportunity canary, then expand to 96 independent parents only if the canary actually exercises the late-continuation seam. Do not run the 9-parent on-main published-family set as confirmation.
> **Compute status:** not dispatched.

## Why a new block is earned

Retained evidence has reached its honest limit:

- the frozen rule is positive across three distinct scoreable C2 attempt regimes;
- one nominally different retained run is mechanically duplicate action-boundary evidence;
- older family/variant result assets lack the current `stageId` + canonical `workSpent` contract;
- current-main published-parent families provide only 9 independent parents and are historically dominated by easy solves;
- C1 already shows 0% capture.

The remaining question is no longer answerable by archaeology:

> does the exact late-continuation rule transfer to genuinely independent parents under the current production ladder?

This is a bounded-compute confirmation question.

## Claim to confirm

Frozen claim form:

> On an independent-parent production population that actually reaches the nominated late-retry contexts, the exact 15-signature model captures a material share of canonical pre-winner work without nominating recorded winning attempts.

The claim is deliberately narrower than “dynamic action selection works.”

It concerns:

- C2-like late continuation value;
- current production action boundaries;
- exact frozen model membership;
- parent-independent transfer;
- observational shadow safety before any live treatment.

## Source choice

### Reject: current-main published-family set as confirmation

Current main has 18 published-parent family manifests but only **9 unique parents**.

Historical family runs show these sets were generally easy under the then-production legacy path, commonly solving every sibling. That makes them useful as descriptive/smoke material but weak for the specific late-continuation opportunity.

Do not spend a decision-bearing confirmation budget on this tiny set.

### Preferred: large off-main variant-family resource

Use the existing read-only family dataset on:

`claude/variant-levels-solver-insights-tpk4qg`

The resource already contains roughly:

- 1,962 parents;
- 72,965 audited variants in one major snapshot;
- ~96,000 variants across campaigns.

No new bulk family generation is earned.

## Independent unit and sampling

**Independent unit: parent family.**

Sibling variants never count as independent support.

For this confirmation, select **one deterministic representative variant per parent**. This avoids paying repeatedly for correlated siblings while preserving broad parent support.

### Eligibility

A parent is eligible only when:

1. its parent source is outside the C2 development population;
2. a durable family manifest + generated variant record exists;
3. generation provenance is valid;
4. the variant is witness-valid / structurally valid under the family contract;
5. the record can be materialized for the current production runner without historical hints/outcomes entering Solver.solve.

Prefer published/human-parent or other source blocks whose parent identities are not C2 `R…` parents.

Do not select parents because the historical solver solved or failed them.

### Representative variant

Within each eligible parent family:

1. order valid variants by canonical variant identity/content hash;
2. take the first deterministic representative;
3. do not choose the historically hardest/easiest/solved/unsolved sibling.

This keeps selection independent of prior solver response.

## Structural stratification

The late-continuation signal is an opportunity-sensitive claim. A completely trivial population can fail to exercise it without falsifying the mechanism.

Therefore freeze parent blocks using **only generation/board structure**, never historical solver outcomes.

Suggested structural strata use already-authored family metadata:

- witness/requested path length;
- required intersection count;
- navigation density / required-path coverage;
- transformation mode/source regime.

The confirmation report must preserve strata, but the frozen model remains identical across all strata.

No threshold may be tuned using challenge outcomes.

## Staged design

### Stage A — opportunity canary: 24 independent parents

Freeze 24 parents prospectively, one representative variant each.

Purpose:

- verify the current production runner reaches the frozen rule's stage/signature vocabulary on this source;
- estimate available pre-winner work;
- detect obvious source/protocol incompatibility before scaling.

Stage A is **not** confirmation by itself.

Advance only if all are true:

1. population/materialization integrity is complete;
2. at least **8 independent parents** contain a frozen-model nominated boundary, OR at least **20 solved levels** provide non-zero pre-winner work with meaningful frozen-model exposure;
3. aggregate nominated canonical work is non-zero and not entirely one-parent dominated;
4. no malformed/missing-work rows compromise scoring;
5. the model is applied unchanged.

If opportunity is absent, stop. Do not enlarge merely to manufacture signal.

### Stage B — confirmation: 96 independent parents total

If Stage A earns expansion, freeze an additional untouched 72 parents from the same precommitted selection procedure.

Stage B reports the full 96-parent block as confirmation.

No development/refit is allowed between A and B.

## Confirmation decision rule

Advance WS1 toward a live matched-work continuation treatment only if the full confirmation block shows all of:

1. **zero recorded winner endangerment** under the frozen observational rule;
2. aggregate captured pre-winner work share **>= 5%** among scoreable solved rows;
3. frozen-model nomination occurs on **>= 12 independent parents**;
4. no single parent contributes **> 35%** of nominated canonical work;
5. the signal remains predominantly late continuation rather than mutating into an unrelated source-specific pattern;
6. result integrity/reference validity is complete.

Why 5%:

- the three historical scoreable C2 regimes lie at 6.93%, 6.99%, and 9.91%;
- 5% allows real distribution shift while requiring a material effect;
- lower values would not justify live scheduler-treatment complexity.

Any recorded winner endangerment prevents an automatic advance. It does not necessarily close the premise; it triggers forensic review of whether the fixed rule is too coarse.

## Runner

No bespoke workflow architecture is required.

Use current:

`scripts/portfolio-solve-sweep.mjs --scheduler-mode=production`

against the frozen materialized corpus.

Production-shaped bounds should match the current stress refresh semantics unless a preflight integrity check shows the arbitrary-family corpus needs a different mechanically equivalent invocation:

- `--node-budget=50000000`;
- `--work-budget=67000000`;
- non-binding wall deadline;
- no historical baseline, prime-winner, hint, attempt cache, or outcome-aware routing input;
- no save-hints requirement for the confirmation question.

The solver remains level-blind. Research-side family identity is for population accounting only.

## Analysis

Apply:

`reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`

using:

`scripts/apply-action-selection-legal-signal-model.mjs`

Required outputs:

- action-boundary digest;
- source/commit/config identity;
- independent parent count;
- solved/scoreable count;
- pre-winner canonical work;
- nominated work / captured share;
- recorded winner endangerment;
- same-stage continuation share;
- censored-prior share;
- next-stage concentration;
- parent-level nominated-work concentration;
- structural-stratum breakdown.

The `actionBoundaryDigest` is evidence-unit identity for replay/deduplication; workflow-run ID or SHA alone is insufficient.

## Population/family integration pilot

This live question naturally satisfies the still-open **Phase-6 broad-population-first pilot** role in `docs/solver-research-population-family-integration-plan.md`.

Use the shared substrate prospectively:

`question -> source -> frozen block -> independent parent -> representative family variant -> current production observation -> confirmation evidence -> consumption`

Requirements:

- stable question ID;
- source regime/revision;
- literal frozen parent/content block;
- evidence role = confirmation;
- independent unit = parent;
- creation refs;
- append-only consumption lineage;
- source artifacts remain authoritative.

Do not create a WS1-specific evidence warehouse or alternative lineage schema.

## Stop conditions

Stop before Stage A if a deterministic source-independent parent block cannot be materialized without outcome-conditioned selection.

Stop after Stage A if opportunity is too sparse.

Stop after Stage B if:

- winner endangerment occurs;
- capture is <5%;
- fewer than 12 parents contribute nominations;
- one parent dominates >35% of nominated work;
- protocol/integrity evidence is incomplete.

A negative/indeterminate confirmation is still useful. Do not rescue it by changing model signatures, work bands, source filters, or representative-variant selection.

## What this preflight does not authorize

- no live skipping/reordering;
- no dynamic scheduler;
- no learned model;
- no per-level exception;
- no new bulk variant generation;
- no result-conditioned family selection;
- no hint/history use by Solver.solve;
- no expansion beyond 96 parents without a new decision reason.

## Next implementation step

Before dispatch:

1. use the existing family index/resource path to enumerate eligible independent parents from the off-main dataset;
2. freeze Stage-A and Stage-B blocks with the shared research-block/consumption lineage;
3. materialize the one-variant-per-parent corpus deterministically;
4. run acquisition preflight/integrity checks;
5. only then dispatch Stage A.
