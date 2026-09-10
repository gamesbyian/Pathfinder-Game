# Post-2A capability refresh and action-selection preflight 001

**Status:** prepared; execution blocked until the bounded 2A closeouts settle production semantics

**Date:** 2026-09-10

## Decision

Do not start broad Workstream 2B repricing or production action-selection changes from the pre-restoration capability/lifecycle picture.

Once the three bounded 2A questions are closed, take one fresh, internally consistent evidence snapshot under the resulting production semantics, then use that snapshot for both:

1. Workstream 2B allocation construction; and
2. Workstream 1 residual-failure/action-selection analysis.

This report does not replace the post-restoration refresh contract in `reports/2026-09-09-portal-restoration-evidence-hardening-001.md`. It operationalizes that contract and defines the minimum downstream classification needed to prevent the two workstreams from rebuilding incompatible pictures of the same solver state.

No solver compute was spent for this preflight.

## Why the refresh is now load-bearing

The September 8 capability map was measured before the material portal restorations now present in production. Its useful historical facts remain:

- production solved `975 / 1700` Corpus-2 levels;
- the capability union solved `1097 / 1700`, leaving 122 capability-only IDs;
- 45 of those 122 were isolated winners and 77 were multi-technique winners;
- 89 of 122 capability-only IDs were in portal-related cohorts;
- all 45 isolated winners were portal-related;
- the old intersection-heavy + must-cross-heavy + multi-portal cohort contained 396 levels, of which production solved 118 and missed 278.

Those counts are no longer safe active targets. Portal must-cross neighbour-budget propagation produced 52 gains / 0 losses, and portal connectivity-volume restoration produced another 2 gains / 0 losses. The portal coarse-state-merge experiment also demonstrated a separate constraint that aggregate net solve gain cannot encode: its +158 / -12 result contained a genuine specialist regression (`R01273`).

The old capability-only residue is therefore especially likely to have changed exactly where scheduler pricing and action selection care most. Reusing it would mix historical mechanism discovery with current allocation truth.

## Trigger

Run the refresh after each bounded 2A item has a final disposition and any justified production-semantic change is merged:

1. goal-attraction-disabled retry fresh-pool confirmation 002;
2. repair late-probe `7 -> 6` seed confirmation;
3. admissible-order retry `1.0 -> 0.18` confirmation with nonzero target-stage work.

A negative or inconclusive closeout with no production change still counts as settled. The important condition is that the refresh begins from the production semantics intended to feed 2B, rather than between repricing mutations.

If a 2A result creates a new production-semantic change after the refresh begins, discard the mixed snapshot and restart from one identity.

## Frozen identity for the refresh

Before dispatch, record one identity tuple and require every production/capability row used in the analysis to match it:

- solver commit SHA;
- effective solver-config identity/hash;
- exact Corpus-2 identity/hash;
- fixed-work envelope and strict-work semantics;
- capability-row definitions and enabled feature/config identities;
- sweep/workflow version and relevant post-hoc tooling version.

Do not combine candidate rows across solver SHAs, work envelopes, or effective configs merely because their stage names match.

## Minimum execution sequence

### 1. Fresh production baseline

Run the current level-blind production solver over all 1,700 Corpus-2 levels under the frozen fixed-work identity.

Retain the complete per-level result surface required for later joins, including at minimum solve status, referee validity where applicable, `workSpent`, attempt/stage lifecycle data, effective config, and run/provenance identifiers.

This baseline becomes the only active definition of `production-solved` and `production-missed` for the subsequent refresh.

### 2. Fresh capability map

Rerun the capability rows needed by the current production ladder under the same solver identity and comparable fixed-work contract. Use explicit run IDs per row and retain complete artifacts rather than reconstructing row identity from workflow names.

For each current production miss, derive:

- capability-positive stages/configurations;
- isolated-winner versus multi-technique-positive status;
- whether the relevant action was mechanically eligible;
- whether it was instantiated/reached;
- whether it received nonzero work;
- whether it participated and failed.

A row that was not run, is missing its artifact, or cannot establish config/work identity is `missing evidence`, not a negative capability result.

### 3. Regenerate lifecycle attribution

Regenerate the Corpus-2 lifecycle/failure map from the fresh production run using the repaired instantiation projection semantics documented in `reports/2026-09-09-stage-lifecycle-instantiation-projection-gap-001.md`.

Do not infer capability failure from nominal stage presence. Preserve the distinction between:

- mechanically ineligible;
- eligible but not reached/instantiated;
- reached with zero work / budget-starved;
- participated with nonzero work and failed;
- participated and solved.

The September 10 admissible-order confirmation-006 artifact recovery is the canonical warning here: a treatment can be configured and instantiated while performing exactly zero target-stage work. Such evidence is non-participating, not negative capability evidence.

### 4. Recompute capability residue and historical deltas

Against the fresh production baseline, recompute:

- production misses;
- capability-only IDs;
- winners by stage/configuration;
- isolated winners;
- multi-technique-positive IDs;
- lifecycle failure/exposure class;
- portal-carveout membership;
- the former 396-level joint-obligation cohort and its current residual;
- any production losses or specialist conflicts introduced by changed semantics.

Then diff these sets against the September 8 snapshot. Explain disappeared residuals through promoted production mechanisms first. Do not treat a historical capability-only ID as still needing allocation merely because it once did.

The historical counts `122 = 45 isolated + 77 multi-technique`, `89 / 122 portal-related`, and `45 / 45 isolated portal-related` are comparison anchors only.

### 5. Join offline evidence after search evidence is classified

For the fresh residual IDs, join the existing offline assets rather than dispatching more solver compute first:

- structural/profile/census features;
- portal and obligation features;
- family/variant relationships;
- hint/provenance basins;
- accepted-path/prefix evidence;
- trace/divergence/rank evidence where already retained.

Use `scripts/research-status-index.mjs`, `scripts/tooling-census.mjs`, `scripts/research-asset-query.mjs`, `scripts/corpus-query.mjs`, and the bundled hint-provenance evidence reporter to discover/reuse existing evidence before inventing new collection machinery.

Offline evidence remains diagnostic. Profile, family, winner, provenance, or stored-path labels from the same level must not become direct production routing inputs.

## Shared residual taxonomy

Workstreams 2 and 1 should consume one residual table rather than independently inventing labels.

For each fresh production-missed level/action pair, record three orthogonal fields.

### Exposure state

- `ineligible`: current action cannot mechanically apply;
- `not-reached`: mechanically eligible but the production ladder never instantiated/reached it;
- `zero-work`: reached/instantiated but received no effective work, including starvation;
- `participated`: received nonzero effective work.

### Capability evidence state

- `unknown`: no comparable capability evidence exists;
- `no-held-out-positive`: comparable evidence exists but no admissible positive capability evidence has been established;
- `positive`: held-out/replicated evidence establishes the action can solve relevant cases under the research contract;
- `conflicting-specialist-risk`: aggregate positive evidence coexists with a credible loss or specialist regression.

`zero-work` or `not-reached` must never be translated into a negative capability label.

### Residual role

Derive an analysis role from the two fields above plus fresh solve evidence:

- `production-solved`: no longer a residual after the refresh;
- `allocation-opportunity`: credible capability exists but production fails to expose it or gives it no work;
- `search-policy-failure`: production participates, known-live/capability evidence survives the representation assumptions, but the search policy fails to recover it;
- `representation-risk`: pruning/state merging/representation is implicated, including specialist-conflict cases;
- `unresolved`: evidence is insufficient or contradictory.

These are research labels, not production routing features.

## Workstream 1 implication: classify exposure before predicting actions

The strongest existing-evidence framing for automatic action selection is hierarchical rather than a one-shot "predict the winning retry" model.

First ask whether production actually exposes a mechanically eligible action with nonzero work. Only after participation is established should analysis interpret failure as evidence about search policy, representation, or action suitability.

This ordering matters because several recent investigations show that apparent treatment or action failures can actually be allocation failures. The admissible-order confirmation-006 arms are the clearest example: both configurations reached the target stage but every target attempt had `allocatedWorkCeiling = 0` and `workSpent = 0`.

Conversely, the portal coarse-state-merge result shows why aggregate gain alone is insufficient for routing. A policy with a large positive net solve delta can still destroy a rare winning mechanism. Automatic action selection therefore needs a specialist-retention/negative-transfer constraint, not merely expected aggregate uplift.

Hint/provenance evidence can strengthen the positive side of this classifier:

- a validated basin proves a live solution region exists;
- multiple structurally diverse basins reduce dependence on one discovered path;
- prefix survival/divergence can locate where known-live basins disappear;
- provenance can distinguish independent cold discovery from replay/derived evidence.

It cannot prove that unexplored alternatives are dead, and replay-only provenance must not be promoted into cold capability.

## Acceptance gate for Workstream 2B

Broad allocation construction is ready only when all of the following are true:

1. the three 2A questions have final dispositions;
2. one production baseline and all capability rows share the frozen identity/work contract;
3. lifecycle attribution uses repaired eligibility/instantiation projection;
4. every capability row has explicit provenance/run identity and complete or explicitly missing artifacts;
5. capability-only, isolated-winner, multi-technique, and joint-obligation residual sets are regenerated from the fresh baseline;
6. `not-reached`, `zero-work`, and `participated-failed` are separable;
7. specialist/conflicting evidence is carried forward explicitly;
8. the September 8 counts are used only as historical diffs, not active pricing targets.

At that point:

- Workstream 2B may price exposure/allocation opportunities using the fresh residue;
- Workstream 1 may mine the same residue for held-out action-selection signals;
- the priced residual lane can distinguish missing exposure from failed exposure without paying twice for the same ambiguity.

## Value-of-information rule after the refresh

Do not immediately dispatch another broad experiment for every unresolved residual.

For each residual cluster, prefer the cheapest discriminator already supported by retained evidence:

1. lifecycle/exposure join;
2. capability-row comparison;
3. validated hint/prefix replay or divergence evidence;
4. family/variant transfer evidence;
5. only then a new matched-work solver experiment with a prespecified question.

This preserves the current queue's bias toward extracting information already purchased before spending another population-scale solve budget.
