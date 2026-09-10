# Post-2A capability refresh and action-selection preflight 001

> **Status:** active
> **Last evidence:** 2026-09-10 — existing portal-restoration, lifecycle, capability-census, selector, hint/provenance, and admissible-order artifact evidence; no new solver dispatch
> **Decision:** after the bounded 2A closeouts settle production semantics, build one fresh production/capability/lifecycle snapshot and use it as the shared evidence base for both Workstream 2B allocation and Workstream 1 action-selection analysis. Classify exposure before capability failure, and carry specialist-risk evidence explicitly.
> **Remaining gate:** close the three bounded 2A questions, then execute the frozen refresh sequence below before broad repricing or production routing changes.

## Scope

This does not replace the post-restoration refresh contract in `reports/2026-09-09-portal-restoration-evidence-hardening-001.md`. It turns that contract into an execution handoff and defines the minimum shared residual taxonomy needed to keep Workstreams 2 and 1 from rebuilding incompatible pictures of the same solver state.

No solver compute was spent for this preflight.

## Why the refresh is load-bearing

The September 8 capability picture predates material portal restoration. Its historical anchors are:

- production solved `975 / 1700` Corpus-2 levels;
- capability union solved `1097 / 1700`, leaving 122 capability-only IDs;
- 45 of those 122 were isolated winners and 77 were multi-technique positives;
- 89 of 122 capability-only IDs were portal-related;
- all 45 isolated winners were portal-related;
- the old intersection-heavy + must-cross-heavy + multi-portal cohort contained 396 levels, with 118 production solves and 278 misses.

Those are no longer safe active pricing targets. Portal must-cross neighbour-budget propagation produced 52 gains / 0 losses, and portal connectivity-volume restoration produced another 2 gains / 0 losses. Portal coarse-state merge also exposed a different constraint: its large aggregate gain (`+158 / -12`) included a genuine specialist regression on `R01273`. Net solve gain alone therefore cannot be the objective for action selection or repricing.

The old capability-only residue is most likely to have changed exactly where scheduler pricing cares most. Treat the old counts as historical comparison anchors only.

## Trigger

Run the refresh only after each bounded 2A item has a final disposition and any justified production-semantic change is merged:

1. goal-attraction-disabled retry fresh-pool confirmation 002;
2. repair late-probe `7 -> 6` seed confirmation;
3. admissible-order retry `1.0 -> 0.18` confirmation with nonzero target-stage work.

A negative or inconclusive closeout with no production change still counts as settled. If production semantics change after refresh execution starts, discard the mixed snapshot and restart from one identity.

## Frozen identity

Before dispatch, record one identity tuple and require every production/capability row used downstream to match it:

- solver commit SHA;
- effective solver-config identity/hash;
- exact Corpus-2 identity/hash;
- fixed-work envelope and strict-work semantics;
- capability-row definitions and enabled feature/config identities;
- sweep/workflow version and relevant post-hoc tooling version.

Do not combine rows across solver SHAs, work envelopes, or effective configs merely because their stage names match.

## Minimum refresh sequence

### 1. Fresh production baseline

Run the current level-blind production solver over all 1,700 Corpus-2 levels under the frozen fixed-work identity.

Retain solve status, referee validity where applicable, `workSpent`, attempt/stage lifecycle data, effective config, and explicit run/provenance identity. This run becomes the only active definition of `production-solved` and `production-missed` for the refresh.

### 2. Fresh capability map

Rerun the capability rows needed by the current production ladder under the same solver identity and comparable fixed-work contract. Use explicit run IDs per row and complete artifacts.

For every current production miss, derive:

- capability-positive stages/configurations;
- isolated-winner versus multi-technique-positive status;
- mechanical eligibility;
- reach/instantiation;
- nonzero work participation;
- participated-and-failed status.

A row that was not run, lacks its artifact, or cannot establish config/work identity is `missing evidence`, not negative capability evidence.

### 3. Regenerate lifecycle attribution

Regenerate the Corpus-2 lifecycle/failure map from the fresh production run using the repaired projection semantics in `reports/2026-09-09-stage-lifecycle-instantiation-projection-gap-001.md`.

Preserve these distinct states:

- mechanically ineligible;
- eligible but not reached/instantiated;
- reached with zero work / budget-starved;
- participated with nonzero work and failed;
- participated and solved.

The September 10 admissible-order confirmation-006 recovery is the canonical warning: both configurations instantiated the target retry, but every target attempt received `allocatedWorkCeiling = 0` and `workSpent = 0`. That experiment was non-participating, not evidence that the repricing treatment lacked capability.

### 4. Recompute the residue

Against the fresh production baseline, recompute:

- production misses;
- capability-only IDs;
- winners by stage/configuration;
- isolated winners;
- multi-technique positives;
- lifecycle exposure class;
- portal-carveout membership;
- the former 396-level joint-obligation cohort and its residual;
- any production losses or specialist conflicts under changed semantics.

Diff these sets against the September 8 snapshot. Explain disappeared residuals through promoted production mechanisms first.

### 5. Join offline evidence after exposure is known

For fresh residual IDs, reuse existing evidence before dispatching new solver work:

- structural/profile/census fields;
- portal and obligation features;
- family/variant relationships;
- hint/provenance basins;
- accepted-path/prefix evidence;
- retained trace/divergence/rank evidence.

Use `scripts/research-status-index.mjs`, `scripts/tooling-census.mjs`, `scripts/research-asset-query.mjs`, `scripts/corpus-query.mjs`, and the bundled hint-provenance evidence reporter before creating new collection machinery.

Offline profile, family, winner, provenance, or stored-path labels remain diagnostic and cannot become same-level production routing inputs.

## Shared residual taxonomy

Workstreams 2 and 1 should consume one residual table with orthogonal fields rather than independently inventing labels.

### Exposure state

- `ineligible`: action cannot mechanically apply;
- `not-reached`: eligible but production never instantiated/reached it;
- `zero-work`: reached/instantiated but received no effective work, including starvation;
- `participated`: received nonzero effective work.

### Capability evidence state

- `unknown`: no comparable capability evidence;
- `no-held-out-positive`: comparable evidence exists but no admissible positive has been established;
- `positive`: held-out/replicated evidence establishes relevant capability;
- `conflicting-specialist-risk`: positive aggregate evidence coexists with a credible loss or specialist regression.

`not-reached` and `zero-work` must never be translated into negative capability labels.

### Residual role

- `production-solved`: no longer residual after refresh;
- `allocation-opportunity`: credible capability exists but production fails to expose it or gives it no work;
- `search-policy-failure`: production participates, known-live/capability evidence survives the representation assumptions, but search does not recover it;
- `representation-risk`: pruning/state merge/representation is implicated, including specialist conflicts;
- `unresolved`: evidence is insufficient or contradictory.

These are research labels, not production routing features.

## Existing-evidence synthesis for Workstream 1

### Exposure should precede action prediction

The strongest current framing is hierarchical, not a one-shot "predict the winning retry" model.

First ask whether production actually exposed a mechanically eligible action with nonzero work. Only after participation is established should a failure be interpreted as evidence about search policy, representation, or action suitability.

This separates allocation failures from action failures and prevents the scheduler from learning from censored outcomes.

### Multiplicity is a useful stratum, not a routing answer

Existing Corpus-2 census evidence found production success rises sharply with isolated capability multiplicity: 6.1% at `solverCount=0`, 58.6% at 1, 72.8% at 2, 90.4% at 3-5, 98.9% at 6-10, and 99.5% at 11+.

That makes refreshed multiplicity useful for difficulty/robustness stratification and specialist-risk weighting. It does not establish which production action should be chosen, and the old counts must be refreshed before use.

Raw multiplicity also overstates independence. In the September 3 census, 55/94 doubletons (58.5%) had both winners from the same broad technique family. Family-diverse support is therefore more meaningful protection against a family-wide regression than `solverCount` alone.

### Family fragility itself drifts

Do not mechanically combine old family-specific singleton loss rates with a newer singleton-family census. The September 1 -> September 3 temporal comparison had 181 old singletons dominated by DFS sole support and measured DFS-only loss at 47.5%, beam-only at 22.7%, admissible-order at 0/16. A September 5 count over the newer census instead found 175 singletons dominated by repair (81) and beam (67), with only 5 DFS singletons.

That sharp population shift is itself a warning that family-risk weights should be recomputed on the refreshed evidence identity rather than treated as stable constants.

### Existing static features do not justify another selector-engineering detour

Routing regime predicts overall difficulty and multiplicity, but prior work found it does not explain specific late-stage reliance. The later 18-feature static topology/placement extension also added no material held-out value over the existing coarse structural baseline for production failure or isolated-capability outcomes.

Therefore do not spend the pre-refresh interval inventing a richer generic static selector. First obtain the fresh residual and ask what unexplained distinction remains. Reopen richer descriptors only for a mechanism-specific gap that survives that refresh.

### Positive evidence and specialist risk are asymmetric

Hint/provenance evidence can strengthen positive capability diagnosis:

- a validated basin proves a live solution region exists;
- multiple structurally diverse basins reduce dependence on one discovered path;
- prefix survival/divergence can locate where known-live basins disappear;
- provenance can distinguish independent cold discovery from replay/derived evidence.

It cannot prove unexplored alternatives are dead, and replay-only provenance is not cold production capability.

Likewise, the portal coarse-state-merge result means action selection needs an explicit specialist-retention / negative-transfer constraint. A policy with large aggregate uplift may still destroy the only winning mechanism for a rare level.

## Acceptance gate for Workstream 2B and production WS1 changes

Broad allocation construction or production routing is ready only when:

1. all three 2A questions have final dispositions;
2. one production baseline and capability map share the frozen identity/work contract;
3. lifecycle attribution uses repaired eligibility/instantiation projection;
4. every capability row has explicit run/config provenance and complete or explicitly missing evidence;
5. capability-only, isolated-winner, multi-technique, and joint-obligation residuals are regenerated;
6. `not-reached`, `zero-work`, and `participated-failed` are separable;
7. specialist/conflicting evidence is carried forward explicitly;
8. multiplicity/family-risk summaries are recomputed rather than copied across census identities;
9. September 8 counts are historical diffs only, not active pricing targets.

At that point Workstream 2B can price actual exposure opportunities, while Workstream 1 can mine the same residue for held-out action-selection signals without paying twice for the same ambiguity.

## Value-of-information rule after refresh

For each unresolved residual cluster, use the cheapest discriminator already purchased:

1. lifecycle/exposure join;
2. capability-row comparison;
3. validated hint/prefix replay or divergence evidence;
4. family/variant transfer evidence;
5. only then a new matched-work solver experiment with a prespecified question.

This keeps new compute downstream of the evidence already available rather than using another population-scale solve as the default diagnostic.