# CI detector implication audit — first pass

> **Status:** active
> **Last evidence:** 2026-09-26 — source-level overlap review plus current/recent CI failure separation; pairwise implication analyzer added to the existing manual historical-value audit.
> **Decision:** no production check is removed or demoted by this pass; use pairwise historical implication only to shortlist source-level/fault-injection candidates.
> **Remaining gate:** run the analyzer against the retained historical audit corpus, inspect the strongest current-detector implication pairs, and fault-inject any candidate before retirement or cadence reduction.

## Question

The recent CI program already asked which checks belong in PR merge-safety CI, which surfaces should invalidate them, and how to execute the selected population cheaply.

This pass asks a narrower question:

> Among checks that still belong at their current cadence, does one check add any marginal signal once another check has already run?

Useful evidence shapes include:

- **exact observed co-failure:** A and B always appear together in recoverable representative episodes;
- **one-way observed implication:** every observed A failure also includes B, while B has additional independent failures;
- **no unique representative episode:** A has never been the sole current detector in a representative repair episode;
- **source-level domination:** A checks only conditions already guaranteed by B, with no independent detector-failure contract;
- **execution ordering domination:** B necessarily catches the defect before A can add a distinct diagnostic.

None of these alone proves safe deletion. Historical logs are incomplete, development periods are non-representative, detector lineages change, and one root cause can trigger many consumers.

## Existing evidence reused

The exhaustive historical-value work recovered 7,905 CI/main-push runs and collapsed 2,978 failed PR-CI runs into 865 repair episodes. The full representative-signature pass recovered parsed detector signatures for 296 episodes, with 421 explicit old-log retrieval gaps concentrated in older history.

That pass already established two important constraints:

1. correlated repository/research checks are common, especially documentation, research-index/inventory/query/integration, workflow-lifecycle, and ownership contracts;
2. the only demonstrated current-era genuine deep-only branch-caused episode remained selected by the current impact router, so deep verification could be scoped but not deleted.

The topology audit independently reached the same structural interpretation: correlated failures frequently indicate several consumers re-deriving one underlying authority rather than a set of literally identical tests.

Recent production evidence also argues against deleting whole execution lanes. Multiple red CI runs on 2026-09-25/26 had only Node-contract shard A fail while Fast Gate, coverage, deep-services, and Node shard B remained green. The current lane boundaries therefore still separate real failure classes.

## Source-level inspection of the strongest apparent overlaps

### CI routing/meta-contract family

The current repo validator family includes:

- `check:ci-impact-inventory`
- `check:ci-validation-plan-parity`
- `check:ci-gate-parity`
- `check:validation-groups`

and the repo Node family includes:

- `test:ci-impact-classifier`
- `test:ci-validation-plan`
- `test:ci-execution-plan`
- `test:validation-groups`

These share authorities but are not currently source-equivalent.

- `check:ci-impact-inventory` proves every *currently tracked path* has an impact classification.
- `test:ci-impact-classifier` proves classifier behavior on synthetic representative changes, renames, package deltas, and fail-safe unknowns.
- `check:ci-validation-plan-parity` proves the declarative validation/execution plans still correspond to registry/package/workflow reality.
- `test:ci-validation-plan` and `test:ci-execution-plan` prove transformation semantics independent of the current YAML text.
- `check:ci-gate-parity` owns the local-vs-GitHub execution contract plus sparse/cache/deep-proof packing assumptions.
- `check:validation-groups` proves exact aggregate/registry membership and dependency metadata; `test:validation-groups` proves selection semantics.

A malformed current authority can make several fail together, but each family still has at least one plausible unique failure mode. No member is source-proven dominated yet.

### Validator plus detector-self-test pairs

Examples include `check:workflow-actions` + `test:workflow-actions` and `check:cli-option-contracts` + `test:cli-option-contracts`.

These are intentionally asymmetric:

- the validator catches a bad *current repository state*;
- the self-test catches a broken or weakened *detector implementation* using controlled fixtures.

A repository defect can fail only the validator. A detector regression can fail only the self-test. They therefore are not logically interchangeable. Their cadence can still be questioned, but current impact routing already confines these repo-owned self-tests away from unrelated semantic surfaces.

## New mechanical evidence surface

`scripts/ci-history-detector-implications.mjs` now consumes the existing `failure-signatures.json` plus the current validation registry and emits `detector-implications.json`.

For every current registered detector it records:

- representative episode count;
- unique representative episode count;
- sampled runtime exposure where available.

For every observed detector pair it records:

- A episodes;
- B episodes;
- co-failure episodes;
- A-only and B-only episodes;
- observed `P(B|A)` and `P(A|B)`;
- minimum-frequency exact-cofailure and one-way implication flags.

Historical detector names no longer present in the current registry are excluded from current redundancy candidates.

The analyzer deliberately labels these as **observed implication**, not semantic implication.

A fixture test covers:

- one-way A ⇒ B with independent B-only evidence;
- rejection of the reverse implication;
- minimum-frequency gating;
- exclusion of retired detector identities;
- runtime/unique-episode accounting.

The existing manual `ci-historical-value-audit.yml` runs the fixture test and analyzer after its failure-signature/group stages. No ordinary PR job or permanent check is added.

## Decision rule for actual removal/demotion

A permanent check should only become a deletion/demotion candidate after all of these are satisfied:

1. the historical analyzer shows strong one-way or exact co-failure evidence over a nontrivial sample;
2. source inspection shows the candidate has no independent current-state or detector-integrity contract;
3. representative fault injection can trigger the candidate's intended failure class and the proposed dominating check catches it;
4. removing/demoting the candidate does not eliminate a materially earlier or clearer diagnosis worth its cost;
5. the change retains an appropriate full-oracle/backstop cadence where uncertainty remains.

For cheap checks, evidence must be especially strong because the upside of deletion is small.

## Current conclusion

There is still plausible fine-grained redundancy, but the evidence does **not** justify deleting a production lane or any inspected CI meta/self-test contract today.

The highest-value next candidates are the historical correlated research/repository cluster, particularly checks that repeatedly rebuild the same research authority/index and checks with no unique representative episodes. The implication artifact should be used to choose a small source-audit/fault-injection shortlist, not to bulk-delete zero-hit or always-correlated tests.

This continues the CI program's established order: challenge claim ownership and marginal detector value before optimizing execution, and do not create a new always-on guard merely to police the previous guards.
