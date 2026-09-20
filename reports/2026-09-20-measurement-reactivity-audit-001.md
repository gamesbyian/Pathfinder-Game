# Measurement reactivity audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — compared real-search observer families against semantic parity, canonical work/node parity, wall-clock termination, payload/overhead measurement and offline-only instrumentation.
> **Decision:** current major observer families mostly have adequate parity discipline; two older observer-only studies require rate/coverage qualification because their callbacks ran inside wall-clock-bounded search without full OFF/ON reach parity. No generic observer-calibration schema or rerun campaign is earned.
> **Remaining gate:** prospective in-search observers that can affect elapsed time must prove semantic/work reach parity, prove wall time is non-binding for the scientific denominator, or label prevalence/coverage as observer-conditioned.

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"distinguish decision reactivity from timing/coverage reactivity and qualify two historical observer-rate studies without reopening their conservative decisions","remainingGate":"apply the three-way parity/nonbinding/observer-conditioned rule prospectively; no mass rerun","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"search-loss, compact failure, D1, known-prefix survival, joint-obligation, topology aliasing and offline observer analyses","inferenceScope":"instrument reactivity and measurement validity only"},"claimRefs":[],"sourceArtifacts":["reports/2026-09-20-session-change-taxonomy-and-adjacent-opportunities-001.md","scripts/search-loss-real-canary.mjs","scripts/stress/capture-d1-production-decisions.mjs","scripts/stress/collect-known-solution-prefix-survival.mjs","scripts/stress/collect-joint-obligation-observations.mjs","scripts/stress/portal-beam-used-pair-aliasing-observer.mjs","reports/2026-09-09-portal-beam-used-pair-aliasing-measurement-001.md","reports/2026-09-11-joint-obligation-propagation-observer-pilot-001.md"],"prospective":{"expectation":"newer instrument families will already prove semantic parity while older bespoke observers may only prove callback non-mutation","surprise":"the remaining weakness is timing/coverage reactivity under wall-clock limits rather than direct solver-decision perturbation","anomaly":null}} -->

## Two different observer effects

“Observer parity” needs two distinct checks.

### Decision/semantic reactivity

Does enabling the observer change:

- solution/path;
- status;
- attempt sequence;
- nodes;
- canonical work;
- ordering/retention decisions?

This is the strongest failure. If yes, the instrument is not observing the same search process.

### Timing/coverage reactivity

Even a callback that never mutates solver state can consume wall time.

If the scientific run also terminates on elapsed time, enabling a costly observer can change:

- how many nodes/phases are reached;
- how many opportunities are observed;
- how many decisions enter the denominator;
- apparent firing/prevalence rates.

Canonical work may be identical **per reached state** while total observable reach differs because wall time expires sooner.

This distinction is the main new finding.

## Mature current patterns

### Search-loss real canary

`search-loss-real-canary.mjs` is the strongest current template.

It compares OFF / compact / rich modes under identical policy/budgets and hard-fails on drift in solve/status/node/work/solution projection. It also:

- rotates execution order by parent to reduce warmup/order bias;
- measures wall-time overhead;
- measures compact/rich payload bytes;
- persists `observerParityVerified`.

Wall/payload overhead is evidence rather than a brittle hosted-runner threshold.

### D1 production decision capture

The D1 collector explicitly executes observer OFF and ON.

For full production orchestration it compares:

- solution;
- nodes expanded;
- work spent;
- stable attempt sequence including outcomes/config/work.

For isolated beam capture it compares path, nodes and canonical work.

Any drift throws.

### Known-solution prefix survival

The known-prefix survival collector similarly executes observer OFF/ON and rejects path/node/work drift.

### Compact failure response

Compact failure response is a projection over producer-retained attempt/result rows rather than a heavy callback inserted into the search hot path. Its main validity questions are missing-field support/protocol identity, not observer reactivity.

### Offline analyses

Several objects named “observer” are actually post-hoc/offline analyses over already-frozen artifacts, including the H2 structural-stasis analysis and existing-exact-evidence topology joins. They cannot perturb the original solver execution and should not inherit an in-search parity requirement.

## Historical seams found

### Portal used-pair aliasing measurement

The portal aliasing observer replays candidate paths and groups them inside the beam-research callback. The enclosing search has both:

- a 300K-node target;
- a 60s wall-safety limit.

There is no OFF/ON twin showing that the observer reaches the same phases before wall termination.

This does **not** invalidate the existence finding: thousands of actual aliased groups were observed across all 80 sampled levels, and the design conclusion was conservative — preserve used-pair identity rather than deliberately collapsing a demonstrated distinction.

It does qualify the exact reported prevalence/coverage rates. Those are now explicitly described in the historical report as observer-conditioned unless wall non-binding is separately established.

### Joint-obligation real-search pilot

The joint-obligation observer is read-only and later unit tests establish decision-level verdict parity. But its 206-level real-search pilot ran the observer attached under wall/node bounds without full OFF/ON execution twins.

Thus:

- individual observed rejects remain observations;
- sampled soundness checks remain useful;
- exact reject/firing-rate prevalence can be timing-reactive.

The historical report now says so.

Crucially, the actual mechanism was later promoted from a separate matched-work hard-prune A/B. The observer pilot's rate estimate is not the load-bearing efficacy evidence, so no historical rerun is warranted merely for ceremony.

## Prospective rule

For an in-search observer whose callback does non-trivial work, a decision-bearing rate/coverage claim must satisfy at least one of:

1. **OFF/ON parity:** same semantic result plus same canonical work/node/opportunity reach under the intended termination contract;
2. **non-binding wall proof:** scientific denominator is node/work/opportunity capped and evidence shows elapsed-time safety never binds;
3. **observer-conditioned scope:** explicitly state that prevalence/coverage describes the instrumented process and do not transport the rate as if observer-free.

For a semantic/mechanism existence claim, observed positive instances can remain valid even when total coverage is observer-conditioned, provided the callback itself computes the construct correctly.

## What is not earned

No universal observer-calibration object is added.

The previous instrument audit still stands: search-loss parity, exact/reference support, offline oracle validity and hint provenance have different machine semantics. The useful common rule is methodological, not another nullable schema.

No historical observer campaign is queued. Reopen only when an old rate itself becomes decision-bearing for a new choice.
