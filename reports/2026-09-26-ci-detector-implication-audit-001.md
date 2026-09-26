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


## First retained-corpus implication results

The retained historical audit artifact from run `35911214948` is still available and was inspected directly. It contains the full representative-signature corpus used by the September audit:

- 865 mechanical repair episodes;
- 296 episodes with parsed detector signatures;
- 421 explicit retrieval gaps, concentrated in older history.

The first pairwise implication pass over those signatures produced several superficially strong candidates. Source inspection changes their disposition as follows.

### `check:types` → `check:types:tests`

Observed history:

- `check:types`: 17 representative episodes;
- `check:types:tests`: 33;
- every observed `check:types` failure co-occurred with `check:types:tests`;
- `check:types:tests` had 16 additional representative failures.

This is a perfect observed one-way implication in the recoverable sample, but **not semantic subsumption**.

`tsconfig.test.json` extends the production config and includes all `modules/**/*.ts`, so ordinary production type defects usually propagate into both checks. However it also adds Node globals and omits `scripts/ablation-config.mjs`, while `tsconfig.json` intentionally validates production modules under the DOM/browser environment with `types: []` and includes that script.

Disposition: **retain both**. The production check can uniquely catch accidental Node-environment dependence or an error in the extra production-typed script even though retained history has not yet exercised that distinction.

### `test:persist-decision-bearing-evidence` ⇔ `test:validate-reconciliation-sources`

Observed history:

- four representative episodes for each;
- all four co-failed;
- no recoverable A-only or B-only episode.

This is exact observed co-failure, but source inspection shows independent contracts.

`test:persist-decision-bearing-evidence` protects durable evidence retention: shared decision-bearing eligibility, byte hashes, exact outcome bindings, simple population bindings, immutable run/attempt identity, idempotent re-harvest, compression/storage behavior, and refusal to overwrite different bytes under the same identity.

`test:validate-reconciliation-sources` protects multi-run scientific reconciliation: declared run/attempt identity, non-relabeling of staged sources, protocol compatibility, preserved solver/configuration identity, canonical source-set hashing, no nested reconciliation ancestry loss, and construction of a recombine-only reconciliation contract.

Disposition: **retain both**. Their historical exact co-failure is explained by shared evidence-system authoring incidents rather than duplicate semantics.

### Research integration validator versus mutation harness

Observed history:

- `check:research-integration`: 33 representative episodes;
- `test:research-integration-audit`: 32;
- every observed Node-harness failure co-occurred with the permanent validator, while the validator had one additional representative failure.

Source inspection again shows asymmetric ownership rather than duplication.

The validator owns the autonomous current-repository integration proof. The Node harness intentionally reuses one immutable relation model and injects malformed queue/question/source/capability/consumption relations to prove the detector remains sensitive to specific bad states.

Disposition: **retain both**. The current-state validator and detector mutation suite protect opposite failure directions.

### Other strong historical implications

The retained corpus also contains many high-confidence-looking implications inside the research/index/inventory/query cluster and between documentation/workflow metadata checks. These remain candidates for **shared-model/refactor consolidation**, not deletion, because the existing topology audit already established that several consumers re-derive overlapping repository authorities.

The right optimization for this cluster is still:

1. one canonical parsed/relation model where practical;
2. consumer-specific assertions over that model;
3. one current-state authority validator;
4. mutation/self-tests only where they prove detector sensitivity;
5. impact-scoped execution by semantic ownership.

Do not infer semantic redundancy merely because a narrower consumer has never failed outside the broader authority check.

## Current answer to the redundancy question

The first real implication pass found **no current permanent check that is yet proven safe to delete solely because another check subsumes it**.

That is itself useful evidence. The historical corpus contains several perfect implication/co-failure patterns, but the strongest inspected examples all dissolve under source-level semantic comparison. The remaining plausible savings are therefore more likely to come from:

- shared repository-model construction;
- narrower impact routing;
- thinner executable-boundary smokes;
- periodic/demand cadence for evidence-reconfirmation checks;
- retiring checks whose underlying claim no longer belongs to merge-safety CI;

rather than deleting pairs of still-live correctness contracts because they historically fail together.

The implication analyzer should remain a periodic audit aid. Future deletion candidates should require both new historical domination evidence and a source/fault-injection demonstration that the candidate has no unique semantic failure class.
