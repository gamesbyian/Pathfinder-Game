# WS1 late-continuation sample-independent confirmation preflight 001

> **Status:** preflight-complete / no dispatch
> **Date:** 2026-09-22
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Gate class:** `bounded-compute`
> **Decision:** acquire fresh solver-blind random witness-first parents through the existing research-generation front door. Run a 24-parent development/opportunity canary first; only if it exercises the frozen late-continuation seam, acquire a separate untouched 96-parent confirmation block. Apply the exact frozen 15-signature model unchanged. No live scheduling treatment is authorized.
> **Compute status:** not dispatched.

## Why fresh acquisition is now earned

Retained evidence has reached its honest limit.

The exact frozen model is positive across three distinct scoreable C2 attempt regimes:

- **6.93%** captured pre-winner work, 0/310 recorded winner losses;
- **6.99%**, 0/318;
- **9.91%**, 0/356.

Across those regimes, >95% of nominated work is same-stage continuation and >85% follows censored prior work. C1 remains 0%.

Retained archaeology cannot provide the remaining claim:

- nominally different workflow runs can collapse to identical normalized action-boundary evidence;
- older family/variant outputs lack the modern `stageId` + canonical `workSpent` contract;
- family descendants of already-observed parents are not untouched parent support.

The unresolved question is now:

> does the exact late-continuation rule recur on genuinely fresh parents from the same solver-blind random witness-first construction family under the current production ladder?

That is a bounded-compute confirmation question.

## Source choice

Use the existing random research-generation source:

`research:generate-levels -- --method=random`

This is the repository's documented source for:

- fresh confirmation blocks;
- broad solver-blind acquisition;
- independent new parents from the same witness-first construction family.

It is preferable here to historical families because families are descendants of known parents and therefore test a different claim.

No new generator, family campaign, or population freezer is needed.

## Frozen source blocks

Precommit two **separate** random-generation blocks so the opportunity canary never consumes confirmation parents.

### Stage A — development/opportunity canary

- source: `random`;
- count: **24 independent fresh parents**;
- master seed: **2026092201**;
- evidence role: `development`;
- block id: `ws1-late-continuation-opportunity-001`;
- suggested ID prefix: `W`.

Purpose: verify that fresh current-production random parents actually reach the frozen model's late retry/signature vocabulary before buying confirmation scale.

Suggested generation front door:

```bash
npm run research:generate-levels -- \
  --method=random \
  --count=24 \
  --master-seed=2026092201 \
  --question-id=WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE \
  --evidence-role=development \
  --block-id=ws1-late-continuation-opportunity-001 \
  --id-prefix=W \
  --out=data/stress/ws1-late-continuation-opportunity-001.json
```

### Stage B — untouched confirmation

Generate only if Stage A earns it.

- source: `random`;
- count: **96 independent fresh parents**;
- master seed: **2026092202**;
- evidence role: `confirmation`;
- block id: `ws1-late-continuation-confirmation-001`;
- suggested ID prefix: `V`.

No Stage-A outcome may alter the Stage-B seed, generator flags, count, frozen model, work bands, or decision thresholds.

Suggested generation front door:

```bash
npm run research:generate-levels -- \
  --method=random \
  --count=96 \
  --master-seed=2026092202 \
  --question-id=WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE \
  --evidence-role=confirmation \
  --block-id=ws1-late-continuation-confirmation-001 \
  --id-prefix=V \
  --out=data/stress/ws1-late-continuation-confirmation-001.json
```

The research-generation producer already freezes population identity/source revision/research-block lineage. Do not add a WS1-specific population schema.

## Sizing basis

On development run `35066677597`, **89 of 356 solved C2 validation levels** contain at least one frozen-model nominated pre-winner boundary: about **25.0%** of solved levels.

The full C2 solve rate on that run is 1,169/1,700 (~68.8%).

Those are planning numbers only, not assumptions imposed on the fresh blocks.

They imply:

- a 24-parent canary should ordinarily expose only a handful of nominated parents if the mechanism transfers;
- a 96-parent confirmation block is large enough to expect order-of-tens, rather than one-off, parent support without returning to a 1,700-level sweep.

## Stage A advance rule

Stage A is development evidence only.

Run all 24 parents through the ordinary current production ladder, then apply the frozen model unchanged.

Advance to Stage B only if:

1. corpus/research-block/run integrity is complete;
2. canonical per-attempt `stageId` and `workSpent` are retained;
3. at least **3 independent parents** contain a frozen-model nominated pre-winner boundary;
4. nominated canonical work is non-zero;
5. no single parent contributes >60% of nominated work;
6. no malformed/missing-work row makes the frozen model unscoreable.

If Stage A has fewer than 3 nominated parents, stop as **opportunity-starved on this fresh source/current code**. Do not widen the model or change generator parameters to force exposure.

Recorded winner endangerment in Stage A is a strong warning and requires forensic review before any confirmation acquisition.

## Stage B confirmation rule

Stage B remains untouched until Stage A's fixed advance rule passes.

Advance WS1 toward a live matched-work late-continuation treatment only if the 96-parent confirmation block shows all of:

1. **zero recorded winner endangerment** under the frozen observational rule;
2. aggregate captured canonical pre-winner work share **>= 5%** among scoreable solved rows;
3. frozen-model nominations on **>= 12 independent parents**;
4. no single parent contributes **>35%** of nominated work;
5. the nominated work remains predominantly same-stage late continuation rather than a qualitatively different source-specific pattern;
6. result/referee/integrity evidence is complete.

The 5% floor is prespecified below the historical 6.93–9.91% band to allow real sample/current-code shift while still requiring a material effect.

Failure of any gate prevents automatic advancement. Do not rescue a negative by retuning signatures, bins, thresholds, seed, or source.

## Production solve protocol

No bespoke workflow architecture is required.

Use current:

`scripts/portfolio-solve-sweep.mjs --scheduler-mode=production`

on each frozen generated corpus.

Production-shaped bounds should match the current stress refresh protocol:

- node budget: **50,000,000**;
- canonical work budget: **67,000,000**;
- wall deadline non-binding;
- no baseline-derived budget;
- no prime winner;
- no attempt cache populated from history;
- no hints/solutions/outcomes supplied to Solver.solve;
- no outcome-aware routing or source identity as a production feature.

The solver remains level-blind. Research block/source IDs exist only for evidence accounting.

## Frozen analysis

Apply:

`reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`

with:

`scripts/apply-action-selection-legal-signal-model.mjs`

No challenge-side fitting is permitted.

Required report fields:

- source block/population identity;
- solver commit/config identity;
- action-boundary digest;
- independent parent count;
- solved/scoreable parent count;
- parents with nominated boundaries;
- canonical pre-winner work;
- nominated work / captured share;
- recorded winner endangerment;
- parent-level nominated-work concentration;
- same-stage continuation share;
- prior-outcome composition;
- next-stage concentration;
- comparison with the historical 6.93–9.91% capture band.

## Evidence-unit identity

Workflow run ID and commit SHA are provenance, not sufficient evidence-unit identity.

Retain the normalized `actionBoundaryDigest` produced by the frozen-model tooling. If a rerun has the same block/protocol and identical action-boundary digest, do not count it as new independent evidence.

## Population/family integration Phase-6 pilot

This live acquisition naturally satisfies the still-open **broad-population-first** Phase-6 pilot in `docs/solver-research-population-family-integration-plan.md`.

Use the existing lineage:

`question -> random source -> frozen parent block -> current production observation -> confirmation evidence -> consumption`

Required identities:

- stable question ID;
- source regime/revision;
- literal parent/content population;
- evidence role;
- independent unit = parent;
- creation refs;
- consumption lineage;
- authoritative source/run/result artifacts.

Do **not** family-expand before the broad result.

If the broad confirmation later creates a concrete causal ambiguity, families may then be used as microscopes on nominated parents. Descendants must never inflate parent support.

## What this preflight does not authorize

- no live skipping/reordering;
- no dynamic scheduler;
- no learned selector;
- no per-level exception;
- no historical-outcome selection;
- no family generation before the broad confirmation creates a causal reason;
- no alteration of the frozen 15-signature model;
- no Stage B dispatch unless Stage A passes its fixed opportunity gate;
- no expansion beyond the prespecified blocks without a new decision reason.

## Next implementation step

The repo already owns every required primitive.

Before dispatch:

1. run `research:acquisition-preflight` for the stable WS1 question and verify it still routes to bounded fresh acquisition;
2. generate/freeze Stage A through `research:generate-levels`;
3. validate the generated corpus/research block;
4. run the current production sweep on the 24 parents;
5. score the frozen model and apply the Stage-A stop rule;
6. only then generate and dispatch the untouched Stage-B confirmation block if earned.

No new WS1-specific acquisition framework is required.
