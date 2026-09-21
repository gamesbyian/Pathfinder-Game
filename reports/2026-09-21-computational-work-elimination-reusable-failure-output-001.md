# Computational work elimination audit: reusable failed-search output disposition 001

> **Status:** SOURCE/AUTHORITY AUDIT COMPLETE; no proof store or database earned.
> **Date:** 2026-09-21.
> **Parent:** [solver computational work elimination audit](../docs/solver-computational-work-elimination-audit-plan.md).
> **Failure-evidence authority:** [failure-evidence integration plan](../docs/solver-failure-evidence-research-integration-plan.md).
> **Search-loss authority:** [search-loss evidence implementation plan](../docs/solver-search-loss-evidence-implementation-plan.md).
> **Deferred architecture authority:** [solver future work](../docs/solver-future-work.md).

## Question

Can failed search leave behind a sound artifact that a later search consumer may legally reuse to avoid combinatorial reasoning?

The answer is:

> **sometimes, but most existing failure evidence is not a proof artifact and must not be promoted into one by vocabulary.**

The repository already distinguishes observation, experience, exact consequence, and proof. Preserve that distinction.

## 1. Current substrate classification

| Existing output | Semantic class | Can justify skipping exact search? | Disposition |
|---|---|---:|---|
| compact failure-response document | observation / execution response | no | keep as nomination/join substrate |
| `PruneId` aggregate counts | typed mechanical reason family | no; no proof identity | use for incidence/consumer nomination only |
| BeamResearch / beam-flow | search-process observation | no | guidance/overlap evidence only |
| failure-progress | search response | no | guidance/diagnosis only |
| search-loss capsule | selected replayable observation | no by itself | may be exact-annotated later |
| exact/reference annotation on capsule | exact label for the annotated query/state | only under its explicit query identity / implication contract | candidate source of a reusable fact, not automatically reusable |
| repair `stateSignature` nogood | prior failed randomized continuation experience | **no** | guidance/experience only |
| connectivity reached/boundary sketch | post-flood structural observation | no by itself | discovery evidence only |
| portal-free connectivity cut certificate from this audit | exact one-way implication | **yes in proved scope**, if later boundary validation succeeds | first live W4 candidate; economics still unmeasured |
| mustPass/mustCross lower-bound memo result | exact necessary bound under compact dependency key | yes | already shipped positive control |
| joint-obligation visited-portal forced-neighbor verdict | exact deadlock | yes | already consumed immediately by production hard prune; no storage case |
| dynamic BC1 conflict | exact projection / necessary condition | yes when sound in supported scope | active under existing WS2 owner; reuse/storage economics not yet shown |

## 2. Repair nogoods are not certified nogoods

`modules/solver/nogood-cache.ts` is intentionally explicit:

- one instance per repair call;
- records one prior randomized continuation that failed;
- a matching `stateSignature` does **not** prove the state globally DEAD;
- equality of that signature is not declared future-state equivalence;
- a hit may steer incomplete repair but cannot manufacture a logical prune.

Therefore:

> do not reuse the repair cache as the seed of a general certified nogood store.

A future proof-producing mechanism may happen to use some of the same dynamic dependencies. That would be a new theorem/contract, not promotion of the existing experience cache.

## 3. Search-loss evidence is a microscope, not a clause database

The search-loss architecture deliberately preserves:

- observed reach/choice/cull/merge/loss events;
- replayable state or prefix identity where selected;
- later exact/reference annotations;
- provenance and denominators.

It deliberately does **not** assign causal DEAD status at capture time.

The current recurring-rich-producer audit is also closed-negative: no ordinary workflow has earned universal rich capture, with representative rich instrumentation costing roughly 10.32% hosted wall versus ~0.46% for compact instrumentation.

Therefore W4 does not justify changing that decision.

A reusable proof may be *derived from* a selected capsule by a later exact/reference or theorem-specific consumer. The capsule remains the observation container; the proof needs its own sound identity/implication contract.

## 4. Exact deadlock with no storage customer: joint obligation

The current joint-obligation portal/must-cross rule is a useful counterexample to the assumption that every proof should be stored.

The rule proves a categorical deadlock when a pending must-cross axis requires a visited portal terminal that can never be re-entered.

Current production already computes and consumes the verdict in the hard-prune pipeline.

There is no demonstrated later consumer that would benefit from persisting the conclusion:

- the derivation is tiny;
- the same node is rejected immediately;
- no expensive downstream computation survives the reject;
- no broader dependency-key recurrence has been shown.

Disposition:

> exact proof, **no proof-store opportunity**.

This is an important negative control for W4.

## 5. Existing positive-control architecture: lower-bound memoization

The mustPass/mustCross lower-bound caches demonstrate the shape required for successful reusable reasoning:

- exact dependency contract;
- solve-local lifetime;
- multiple real consumers/calls;
- derivation materially more expensive than lookup;
- compact key;
- measured speed benefit.

A future proof artifact should clear a comparable bar before architecture is generalized.

## 6. First live reusable-proof candidate: connectivity cut certificate

The source audit in [connectivity certificate source audit 001](2026-09-21-connectivity-certificate-source-audit-001.md) produced the first new W4 artifact that is genuinely proof-bearing.

It does not store "this residual is dead."

It stores a sufficient cut implication:

- earlier portal-free goal-unreachable component `R`;
- complete cardinal exit boundary of `R`;
- later current position remains in `R`;
- every old boundary cell remains blocked under the current connectivity predicate;
- therefore the fixed goal remains unreachable.

This is reusable across different exact states because its semantics are implication, not residual equivalence.

A bounded production-inert shadow now measures whether this proof has a repeated consumer and whether boundary validation is cheaper than recomputing connectivity.

That experiment is the correct first W4 economics test.

## 7. Dynamic BC1 is proof-producing but storage is premature

BC1 can produce an exact dynamic conflict and already has positive frontier incidence.

The current missing question is downstream work removed by a live safe consumer, not persistence.

Do not add a BC1 proof cache/database merely because the theorem is exact.

Only consider reuse if live BC1 economics later shows that:

- materially identical or implication-compatible BC1 conclusions recur;
- proof construction dominates lookup;
- a later consumer exists after the first proof;
- current WS2 ownership cannot consume the proof immediately at the point of derivation.

## 8. Candidate reusable-artifact taxonomy

A failure-derived artifact may advance only under one of these explicit semantics.

### A. Exact query identity

The exact same mathematical query is asked again.

Example shape:
`query dependency key -> exact answer`.

This is the cleanest memoization case.

### B. Exact equivalence

Different representation, proved same relevant future/query.

Burden is high; current generic residual/state signatures do not establish this.

### C. One-way implication certificate

A prior exact proof remains sufficient under a later state after cheap validation.

The connectivity cut certificate is the current example.

### D. Guidance / experience

Prior failure predicts low value but proves nothing.

Repair nogoods and derived basin signatures live here.

This class may change incomplete ordering/allocation under its own matched-work evidence. It cannot authorize exact skipping.

## 9. Required consumer test before durable storage

Before a new proof artifact is persisted beyond its current solve/attempt, show all of:

1. **proof semantics:** identity/equivalence/implication is stated and tested;
2. **repeated consumer:** the result is requested/applies again after first derivation;
3. **derivation economics:** recomputation cost is measurable and non-trivial;
4. **lookup economics:** signature/certificate validation is materially cheaper;
5. **scope/lifetime:** invalidation boundary is explicit;
6. **work removal:** later combinatorial work actually disappears;
7. **existing owner cannot simply consume immediately:** otherwise storage is ceremony.

If any fails, keep the result ephemeral.

## 10. Cross-run persistence has an additional burden

The product solver is level-blind.

Persisted exact-level facts from prior invocations are forbidden runtime steering inputs unless they arise from legal current-input derivation in the current invocation.

Therefore most production-facing reusable proof work should default to **solve-local** lifetime.

Cross-run durable proof artifacts may remain research evidence, operational family provenance, or exact/reference assets, but must not become hidden cold-solver answers.

## 11. Disposition matrix

| Candidate | Current disposition | Reopen / advance condition |
|---|---|---|
| general proof blackboard | **deferred** | one concrete fact family clears recurrence + sound cheap lookup + saved-work pilot |
| repair nogood -> hard exact nogood | **closed as reinterpretation** | a new independent theorem proves DEAD semantics for a declared dependency contract |
| search-loss capsules as proof store | **closed as reinterpretation** | exact annotations produce a repeated sound consumer; keep observation and proof layers distinct |
| joint-obligation proof persistence | **closed no-customer** | expensive repeated derivation or downstream cross-technique consumer appears |
| connectivity cut certificate | **active development candidate** | runtime shadow must show zero false positives, cross-state recurrence on multiple parents, and favorable replacement economics |
| BC1 reusable proof | **owned elsewhere / premature** | current WS2 economics shows recurrent later consumer beyond immediate prune use |
| exact local-query result reuse | **deferred** | real query bundle shows repeated identical dependency-key queries with meaningful derivation cost |

## 12. Result

W4 does **not** earn:

- a residual database;
- a clause database;
- a general proof-store API;
- cross-run solver memory;
- universal rich search-loss capture.

It does establish a sharper rule:

> Failed search becomes reusable exact output only when a selected observation is upgraded by a theorem/exact query into a typed proof whose cheaper later applicability can be demonstrated.

The connectivity cut shadow is currently the only new successor-audit candidate that has reached that stage.

Everything else either already has its correct immediate consumer, remains observation/guidance, or lacks recurrence/economics.
