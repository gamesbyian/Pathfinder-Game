# Research-system edge hardening 001

> **Status:** active
> **Last evidence:** 2026-09-20 — PR #1930 branch hardening through the shared-v3 contract migration and workflow-boundary scans.
> **Decision:** harden the concrete persistence, workflow-validation, experiment-contract, and recovery-lineage seams exposed by the last 24 hours; do not add broader research abstractions without a demonstrated second consumer.
> **Remaining gate:** green branch CI, then after this workflow version exists on `main`, run one smallest practical `solver-level-blind-targeted-sweep.yml` dispatch with `persist_failure_response=true` and confirm the reusable persistence job commits both compact response and manifest.

## Why this pass exists

The recent consolidation is already a functioning research system. This pass therefore targets ordinary engineering seams capable of silently degrading otherwise-valid evidence rather than reopening the completed consolidation plan.

The motivating failures were concrete:

- a single-artifact download layout made a method-probe combine report zero tested rows even though the worker had solved its canary;
- a hand-written method-probe experiment contract omitted `resolvedSha`, making historical runs non-decision-bearing;
- a targeted-sweep persistence job downloaded evidence before `actions/checkout`, whose default cleaning removed the untracked staging directory;
- the same persistence job's nominal four-attempt push loop could die on its second `git commit` after a failed first push because there was nothing new left to commit;
- adding that persistence job grew the already-grandfathered targeted workflow above its frozen 52,324-byte no-growth ceiling, leaving recent fast validation red;
- while fixing that, a backslash-escaped apostrophe inside a YAML single-quoted scalar produced a zero-job Actions parse failure.

These are all mundane boundary failures. Each is capable of suppressing, misclassifying, or stranding research evidence without changing the underlying solver experiment.

## A. Targeted-sweep persistence boundary

The opt-in persistence job was extracted from `.github/workflows/solver-level-blind-targeted-sweep.yml` into the reusable `.github/workflows/persist-targeted-failure-response.yml`.

Effects:

- the targeted workflow is back below its existing no-growth ceiling;
- checkout happens before artifact download;
- the compact response and manifest remain the only durable outputs from this opt-in path, and an explicit persistence request now fails if the compact payload is unexpectedly absent;
- rerun attempts are append-only: attempt 1 keeps the historical `RUN_ID` directory, later attempts use `RUN_ID-attempt-N` rather than overwriting earlier evidence;
- the evidence commit is made once, while fetch/rebase/push is what retries;
- the existing API-readable work summary now also prints solved and unsolved IDs, removing a redundant inline summary block.

The old monolithic persistence path is known to work after the checkout-order fix: targeted run `35531721218` persisted its compact response and manifest to `main`. The new reusable-workflow handoff still needs one post-merge dispatch because this connector cannot initiate a fresh parameterized workflow run.

## B. Workflow boundary guards

`scripts/check-workflow-actions.mjs` now rejects:

1. a job that downloads an Actions artifact before a later checkout in the same job;
2. a backslash-escaped apostrophe inside a YAML single-quoted scalar, the exact typo that caused the branch's zero-job parse failure;
3. direct workflow-local writes of `experiment-contract.json`;
4. publication of an `experiment-contract.json` without a recognized contract owner in the workflow.

The artifact-before-checkout scan found no second existing offender after the targeted persistence repair.

A separate persistence scan found current durable-writing workflows use `git status --porcelain`, which includes untracked files. The remaining `git diff --exit-code` use checks a known tracked generated integrity index and does not have the historical “new sidecar is invisible” failure shape.

The remaining direct directory-count staging case is technique census, whose execution shape is fixed at 120 shard artifacts. It does not share method-probe's one-artifact versus multi-artifact layout ambiguity, so no speculative common staging abstraction was added.

## C. Shared v3 experiment-contract migration

The method-probe incident motivated a full workflow audit for producers bypassing `scripts/write-solver-experiment-contract.mjs`.

Six maintained workflows still directly constructed `experiment-contract.json`:

- `solver-stress-refresh.yml`;
- `static-portfolio-confirmation.yml`;
- `technique-census.yml`;
- `solver-production-replay-baseline.yml`;
- `solver-highbudget-unsolved-sweep.yml`;
- `solver-combine-sweep-runs.yml`.

The first five now route ordinary acquisition contracts through the shared writer, which owns configuration hashing and immutable execution identity. Production replay explicitly records `reproducibilityExpected: false`. High-budget unsolved records `wallDeadlineBinding: true`: its own `budget_ms` is a real per-tier stopping condition even though the node ceiling is historically the usual backstop.

There are now no maintained ordinary workflow producers writing experiment contracts directly.

## D. Cross-run reconciliation lineage

Cross-run reconciliation is intentionally not treated as a fresh acquisition contract. Its source validator already proves compatible source protocol and source execution identity, so that specialist owner now also constructs the reconciliation envelope.

The old inline object had two current-contract defects:

- `experiment.sourceRuns` held provenance objects rather than run-ID strings;
- `reconciliationRun` lacked the typed recovery fields required by the current contract.

The repaired form declares:

- `kind: recombine-only`;
- `preservesExperimentIdentity: true`;
- `acquisitionRecomputed: false`;
- exact source run IDs in both experiment and reconciliation lineage;
- the source experiment's resolved SHA/configuration identity;
- the reconciliation run's own run/attempt/SHA as provenance, without substituting that SHA for the source experiment identity.

A later hostile pass found two more lineage defects. The source validator required every source to *have* an immutable resolved SHA but did not require those SHAs to agree, so cross-revision sibling/gap-fill runs could falsely claim one preserved experiment identity. It also hashed the source "set" in caller/directory order, making identical source membership produce different provenance on different enumeration orders.

Recombine-only validation now rejects cross-revision sources explicitly, canonicalizes source membership before hashing/lineage emission, rejects duplicate run IDs, and requires both execution identity fields from the declared experiment envelope rather than falling back to top-level workflow metadata. It also rejects a reconciliation artifact as a source: callers must supply leaf acquisition runs instead of nesting recombinations and silently dropping ancestry. Population slices may differ; solver revision may not.

The constructor validates itself with the shared declared-contract rules before writing. Node tests pin these semantics.

## E. Observed execution identity, not dispatch-intent mirrors

The shared v3 writer migration exposed a second-order provenance gap: several workflows hashed a hand-maintained subset of dispatch inputs even though the sweep producer already knew the literal solver configuration that ran. A newly added treatment knob could therefore affect search while remaining absent from `experiment.configurationHash`.

The concrete example is targeted sweep's `repair_late_probe_multi_seed_retry_seed_count`: it reaches `SolveOpts.repairLateProbeMultiSeedRetrySeedCountOverride`, but the old YAML-side configuration object did not include it. Stress refresh similarly omitted several reserve/probe overrides; production replay omitted flags and resolved deadline mode.

This pass now:

- keeps `level-blind-capability-sweep.mjs`'s `effectiveConfig` semantic by excluding telemetry-only switches and retaining all actual solve-affecting overrides;
- adds equivalent observed execution identity to `portfolio-solve-sweep.mjs`, including prime-winner/adaptive-history transforms and baseline input identity while excluding workers/resume/output-only controls;
- makes `combine-solver-sweep-reports.mjs` validate/preserve observed effective config and derive its standard `configurationHash` from it when every source report supplies one; mixed modern/legacy presence now fails instead of silently downgrading the whole combine to weaker legacy reconstruction;
- retains the older execution-field reconstruction only as compatibility fallback for historical/partial inputs;
- lets the shared v3 writer accept an already-validated observed `sha256:` configuration identity;
- binds targeted, stress-refresh, production-replay, high-budget, broad-confirmation, residual-confirmation and routing-regime contracts to their combined observed execution identity;
- corrects deterministic stress/replay envelopes so `reproducibilityExpected` and `wallDeadlineBinding` reflect the resolved deterministic mode.

This closes the class of “the workflow form says X, but a newly added solver option changed what actually ran without changing protocol identity” for the maintained sweep families that expose effective execution configuration. The standard publisher now also fails closed when a declared single-source `resolvedSha` disagrees with an independently recorded immutable commit in the primary result.

A generic publisher-side configuration-hash equality check is intentionally not asserted yet: paired and multi-corpus contracts may legitimately hash a composite experiment while the primary result describes only one arm/component. That check needs an explicit single-result/composite ownership signal rather than workflow-name inference.

## F. Prospective gates must have a collection path

The proposal-method calibration audit correctly deferred a machine `originMethod` field until origin is recorded prospectively, but the report convention did not actually ask future authors to record it. That made the gate self-stalling.

`docs/investigation-report-conventions.md` now defines an optional human-readable `Proposal provenance` line for newly nominated questions/candidates when the source is genuinely known before outcome. Multiple contributing methods are allowed; the field is not machine-enforced and must not be retrospectively story-fitted. The proposal-method audit now points to this collection path. This creates observations without prematurely freezing an enum or registry.

## G. Reconsidered audit lens: joins and executable surfaces

The initial “ordinary plumbing traps” framing was useful but too implementation-shaped. The stronger recurring failure modes are:

1. **Unproved scientific joins.** Two artifacts can each be locally valid while describing different executions, populations, revisions, or stages. A workflow step order, matching filename, shared label, or caller convention is not proof that they belong to the same scientific object.
2. **Untested executable surfaces.** A library function can be correct while the CLI/workflow adapter that supplies its arguments is completely dead. Testing only the function can therefore certify code that no workflow can actually invoke correctly.

These are now durable operating-model rules rather than report-only observations.

The paired-outcome path supplied a concrete example of both. `classify-paired-solver-outcome.mjs` stripped the leading `--` while building its argument map, then looked up `--control`, `--treatment`, `--outcome-out`, and gate names with the prefix still present. The exported classifier had unit coverage, so CI was green even though the workflow-facing CLI could not receive its required arguments.

The repair now:

- tests the real CLI entrypoint with files and `--key=value` arguments;
- requires an explicit paired-integrity artifact before a scientific verdict can be emitted;
- makes paired integrity carry the exact expected IDs, not only a population hash/count;
- verifies both control and treatment result identities exactly equal that paired population before classifying gains/losses;
- requires paired integrity to be coverage-complete and decision-valid;
- adds a repository CLI-option contract guard for the specific same-map “strip `--`, then lookup `--...`” mismatch.

The first broad regex version of that guard intentionally over-reported because many scripts legitimately preserve `--` in their map keys. It was narrowed to tie the lookup to the same map whose constructor strips the prefix, and test fixtures are excluded from the production scan. Do not interpret the original broad hit list as a list of broken scripts.

The same join-proof lens found a separate static-portfolio weakness. Its combiner used to prove only that every authored `cellId` appeared once. It did not prove that the row carrying that ID still described the authored corpus/level/arm/technique/work allocation. The combiner now rejects duplicate plan IDs and validates each result row against its authored plan cell before it contributes to coverage, work or gain/loss comparisons. A correct label with the wrong treatment payload is no longer enough.

That invariant is now shared by the underlying technique-census result domain rather than duplicated in static portfolio. Technique-census analysis validates every observed row against its authored plan while still allowing explicitly partial analytical runs; failed cells retain level identity; and `budgetMs` is now carried as treatment identity because the per-attempt deadline can change outcomes. This distinguishes “planned cell missing” from “cell arrived under the wrong treatment.”

The CP-SAT explicit-prefix combiner received the same treatment at the shard boundary. It now validates declared shard count, filename/index agreement, unique complete shard-index coverage, invariant source metadata, and the exact round-robin row count implied by `selectedCaseCount`. “N files plus N total rows” is no longer accepted as proof of the intended partition.

Historical impact was checked before claiming lost evidence. The classifier file entered the repository on 2026-09-09. There were 96 manual workflow dispatches from 2026-09-09 through 2026-09-20, and none were the broad- or residual-confirmation workflows; the discoverable confirmation dispatches are from 2026-08-26/27, before this CLI existed. No already-paid-for broad/residual experiment lost its verdict because of this bug; it was a latent future failure.

## H. Decision-bearing eligibility and durable evidence are revalidated

The standard publisher used to own the practical definition of “decision-bearing,” while the durable retention layer simply trusted a manifest that said `decisionBearing: true`. That allowed the two stages to drift.

`solver-experiment-contract.mjs` now owns a shared decision-bearing result predicate. It requires the v3 result kind/schema, a published primary result, an empty declared contract-issue set, a currently valid experiment contract, decision-valid non-inferred population integrity, a completed positive/negative research outcome, and agreement among mirrored population identities. The publisher uses that predicate to set the boolean, and the durable evidence persister re-runs the same predicate before retention. A stale or hand-edited true boolean is insufficient.

The persister's existing self-test is now part of ordinary Node CI rather than dormant code.

Durable experiment bundle identity is also append-only. The harvest workflow already defines source artifacts as immutable and re-harvest as deterministic, so the old “delete destination and rewrite it” behavior had no legitimate conflicting-write use case. Re-harvesting the same experiment/run/attempt now succeeds only when the reconstructed bundle is byte-identical; changed bytes under the same durable identity fail as an integrity collision instead of overwriting retained scientific evidence.

## I. What this pass deliberately did not promote

The scans did not earn:

- a universal artifact-staging framework;
- a generic transition engine;
- a new instrument-calibration schema;
- a global evidence-freshness/invalidation engine;
- a retrospective proposal-origin taxonomy.

Those remain consumer/data-gated under the existing research-system rules. The observed bugs were narrower and had narrower repairs.

## Validation boundary

Current validation is split intentionally:

- ordinary CI and the solver-evidence integrity guard exercise repository contracts, tests, lint/build, size ratchets, and the new static workflow guards;
- GitHub accepting the targeted workflow after the YAML fix establishes that its workflow definition is parseable;
- only a real targeted dispatch can establish runtime artifact visibility across the new reusable-workflow call.

Do not describe that last runtime boundary as tested until the post-merge canary has actually committed the expected compact response and manifest.
