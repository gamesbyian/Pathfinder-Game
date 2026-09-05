# Narrowing the confirmation population to the 76 ids that actually reach the tested tier, and parallelizing the two arms

> **Status:** active
> **Last evidence:** 2026-09-04 — joined the 150-id confirmation population against the already-existing full-scale production census (`reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus{1,2}.json`, 1700+102 levels), no new dispatch for this join
> **Decision:** 74/150 (49.3%) of the ids in this confirmation's population never have their ladder reach `admissible-order-alternate-tiebreak-retry` at all in the existing full-scale census (`reachedTechniques` excludes it) — meaning no value of the tested fraction could possibly change their outcome, a fact already demonstrated directly by `-002`'s and `-003`'s partial runs coming back byte-identical between arms on exactly this kind of level. Narrowing the population to the 76 ids where the tier *is* reached removes only provably-uninformative levels, not a favorable cherry-pick, and is expected to roughly halve per-arm wall time (fewer, though still individually slow, shards). Also added a `concurrency_suffix` input to `solver-level-blind-targeted-sweep.yml` so the control and treatment arms can be dispatched under distinct concurrency groups and run in parallel, instead of serializing behind each other as `-001` through `-003` did — expected to roughly halve total wall time again on top of the population narrowing.
> **Remaining gate:** dispatch control (fraction=1.0 default) and treatment (fraction=0.18) against the narrowed 76-id population, each with its own `concurrency_suffix`, and confirm both complete with close to the full 76-level population before comparing solved-id sets and `workSpent`.
> **Evidence role:** discovery/forensic — a cost/precision optimization built directly on `-003`'s diagnosis, prompted by a direct cost-benefit question about whether the full 150-id, serialized, multi-hour design was actually necessary
> **Selection:** the full 76-id informative subset (not a further sample of it) — see method below for exactly how it was derived

## Method

For each of the 150 ids in `data/stress/admissible-order-non-default-retry-repricing-confirmation-001-ids.txt`, looked up its record in the existing full-scale production census (the same 1700+102-level run used throughout this session's other local findings) and checked whether `admissible-order-alternate-tiebreak-retry` appears in that level's `reachedTechniques` array — i.e., whether the production ladder's own routing ever actually invokes the tier under test for that level, independent of which fraction is applied to its shared work pool.

| | count |
|---|---:|
| Total population | 150 |
| Tier never reached (ladder resolves before reaching it) | 74 |
| Tier reached | 76 |
| — of those, already solved in the existing census | 14 (2 winning via the tier itself, 12 via a different later/earlier technique) |
| — of those, unsolved in the existing census (hit the old node-budget cap) | 62 |

The 62 unsolved-in-existing-census ids are exactly the ones now taking ~60-70 minutes each in the (cancelled) solo-sharded runs — this population was originally curated from the historically hardest, node-budget-capped tail, which is the right property for finding a real effect but means nearly all of it is expensive by construction. The existing census's own outcome for these 62 cannot be trusted as a ready-made "control" baseline without a fresh run, since it was recorded under the old, confounded raw-node-budget hard stop this session's `-001` report diagnosed — that is precisely why a fresh, `node_budget_advisory_only=true` run is still needed for them, not a reason to skip them.

The 14 already-solved-in-existing-census ids were kept in the narrowed population (not dropped) despite being less likely to flip under a smaller shared-pool fraction, because they are cheap to re-verify (having already solved comfortably, they should resolve quickly in a fresh run too, unlike the 62 hard cases) and complete the informative population at near-zero added cost.

## What this does not establish

- Does not itself confirm or refute the fraction override — that is still `-005`'s job, once this narrowed, parallelized dispatch completes.
- The 74 excluded ids are excluded on structural grounds (provably cannot show the effect), not because they were checked and found boring under the *treatment* fraction specifically — if a future reviewer wants the full 150-id result for completeness, the excluded 74 can be assumed unaffected with very high confidence given the existing byte-identical partial-run evidence, but were not independently re-verified under this narrower dispatch.
- Parallelizing the two arms changes nothing about what is being measured (each arm's shards are still fully independent single-level solos); it only removes an artificial serialization that existed for unrelated-workflow-safety reasons, not for this experiment's validity.
