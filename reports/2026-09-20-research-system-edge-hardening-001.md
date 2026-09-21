# Research-system edge hardening 001

> **Status:** active
> **Last evidence:** 2026-09-20 — hostile continuation through `160634195e`: repaired publisher fixture/Node CLI suite were green at `3bb2225633`; the sole CI red was this report's non-canonical status metadata, since repaired. Subsequent edge audit closed legacy decision-authority re-upgrade, publisher include-path overwrite/sampling/partial-metadata leaks, reconciliation source relabelling and lineage compression, mixed modern/legacy execution-revision upgrade, durable-retention stale-binding trust, conflicting append-summary reruns, static-portfolio shard-count path drift, and technique/method-probe outer-shard identity gaps.
> **Decision:** harden concrete boundaries that can silently misidentify, misjoin, downgrade, suppress, or strand otherwise-valid evidence; prefer derived inventories and narrow shared primitives over new broad frameworks.
> **Remaining gate:** inspect one stable-head validation opportunistically after the current hardening cluster; after merge, run the smallest practical `solver-level-blind-targeted-sweep.yml` dispatch with `persist_failure_response=true` and confirm the reusable persistence job commits both compact response and manifest.

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

## F. Prospective proposal provenance

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

## J. Extended closure pass: join integrity across specialist systems

The strongest recurring failure class in this pass is broader than “workflow plumbing.” Several artifacts or stages were individually valid but the **join between them was under-proved**:

- technique-census results could drift from the authored plan;
- CP-SAT shard partitions needed exact partition identity;
- variant-family summaries/tasks needed corpus-scoped identity;
- compact failure rows could refill weaker row-local provenance after a document-level identity intentionally left a field unknown;
- hint/failure joins and failure-dependence strata needed exact population identity;
- cross-run reconciliation needed same solver revision, canonical leaf source membership and strict declared experiment identity;
- paired solver verdicts needed exact paired-population integrity rather than workflow step ordering alone;
- durable evidence persistence needed to recompute decision-bearing eligibility rather than trust a boolean written by an upstream manifest.

This earns a standing operating rule: **prove joins, not only endpoints**. Missing identity stays weak/unknown; a stronger neighboring document must not lend its entitlement implicitly. Mixed modern/legacy joins may remain for explicit weak reanalysis, but must not silently downgrade or upgrade scientific authority.

The paired-verdict work also exposed a separate automation blind spot. The exported classifier function was unit-tested, but the real CLI parser used by workflows stripped `--` and then looked up keys with a different convention, making the workflow-facing path unusable while library tests stayed green. The repo now carries a narrow parser-consistency guard, an actual CLI test for the paired classifier, and CLI smoke coverage for the paired-integrity combiner, reconciliation validator and experiment-contract writer. The operating model now states that decision-bearing automation should test the executable surface it actually invokes when a small fixture can do so.

A scan of the most recent 2,000 Actions runs found no historical broad/residual confirmation dispatches to salvage, so this particular classifier defect appears latent rather than a lost-result incident.

A follow-up executable-surface inventory found three additional high-consequence scripts whose domain functions were tested but whose workflow-facing CLIs were not: population-integrity combination, static-portfolio combination, and the research-outcome writer. Their existing Node tests now invoke the real CLI with file fixtures. The sweep combiner and CP-SAT combiner were already covered through real subprocess/pipeline tests, so no redundant test layer was added.

The shard-family closure pass also found one remaining combine-boundary gap in method-probe. The publisher's later exact-population check prevented a completely missing outer shard artifact from becoming decision-bearing, but the method-probe combiner itself could still classify the intermediate aggregate as a clean negative because it only knew about shard directories that arrived. The workflow now passes the authored outer-shard count into the combiner; a vanished outer artifact is classified as harness failure at the combine boundary itself.

## K. Prospective gates must have collection paths

The proposal-method calibration audit exposed a different systems failure: a closeout can correctly defer until future evidence exists while leaving no process that will ever produce that evidence. `docs/investigation-report-conventions.md` now requires a prospective/data-gated remaining gate to name its producer/detection path when known, or explicitly say detection is opportunistic. This keeps “wait for evidence” from becoming a disguised dead end.

## L. Fresh authority requires explicit decision-validity and execution revision

The closure pass tightened a subtle but important distinction between “readable historical evidence” and “fresh decision-bearing authority.”

Fresh authority now requires an explicit `decisionValidComplete: true`; older structural-completeness shapes remain readable for reanalysis but are not upgraded by inference. This prevents a legacy object from gaining modern scientific authority merely because its old fields happen to imply no visible truncation.

Execution revision is likewise carried and checked through specialist shard families rather than inferred from orchestration context:

- method-probe shards record the executed solver revision, the combiner requires agreement, and outer-shard coverage is checked against the authored shard count;
- technique-census shards/results retain solver revision and the combiner rejects revision disagreement;
- static-portfolio results preserve the same execution-revision join;
- fresh standard publication requires an immutable execution SHA independently present in the primary result. Exact/reference-style `solverRef` is accepted as that independent evidence where that producer owns it; workflow `GITHUB_SHA` is not substituted for executed solver identity.

This closes another backward-compatibility trap: modern authority does not silently fall back to weaker legacy provenance when some newer identity field is absent.

## M. Scientific verdict sidecars are bound to the exact results they classify

A completed positive/negative outcome sidecar is now treated as a claim about exact acquired evidence, not merely a nearby file with the right population label.

For standalone completed verdicts, publication requires exact binding unless the primary result already embeds the identical completed verdict. Supported binding dimensions are checked against the published result set:

- population identity;
- result configuration hashes;
- executed solver revisions;
- exact result-content SHA-256 hashes.

Paired verdict construction records the execution revisions and exact result bytes of the control/treatment inputs. Publication rejects stale revision bindings, stale configuration bindings, stale result-content bindings, and unbound completed sidecars. A fallback classifier is not allowed to overwrite or weaken an already completed authoritative verdict.

This is the strongest formulation produced by the reconsidered audit lens: **scientific joins are claims and must carry proof of what they joined.** Matching filenames, workflow step order, nearby manifests, population counts, or a previously true `decisionBearing` boolean are all weaker than explicit identity.

The final CI failure observed before handoff was a test fixture that violated this new rule: it reused an outcome file whose content hash referred to a different primary fixture. Commit `efd97e762c` repairs the test by generating a verdict bound to the exact `solverRef` result bytes. No product invariant was weakened.

## N. Recovered branch state and non-stranded work

A final recovery pass treated the branch itself as authority rather than the interrupted conversation. PR #1930 contains the full work: there is no known implementation work sitting only in chat or outside the PR branch.

Later commits already rescued several lines that had looked conversationally unfinished:

- historical broad/residual classifier impact was checked; no paid post-introduction confirmation run was found to have lost its verdict;
- the over-broad first CLI static-analysis rule was narrowed and the production scan is green;
- exact plan/result joins, shard partition identity, corpus-scoped variant identity, failure/hint population joins and compact-document identity precedence were implemented and tested;
- high-consequence CLI surfaces were exercised through real subprocess fixtures;
- completed verdict preservation, revision binding and result-byte binding were implemented rather than left as recommendations.

The only deliberately unresolved runtime item is the post-merge reusable targeted-sweep persistence canary described below. The generic publisher-side comparison between a composite experiment configuration hash and a single component result also remains intentionally unimplemented until the contract has an explicit single-result/composite ownership signal.

## O. Validation boundary

Current validation is split intentionally:

- ordinary CI and the solver-evidence integrity guard exercise repository contracts, tests, lint/build, size ratchets, and the new static workflow guards;
- GitHub accepting the targeted workflow after the YAML fix establishes that its workflow definition is parseable;
- only a real targeted dispatch can establish runtime artifact visibility across the new reusable-workflow call.

Do not describe that last runtime boundary as tested until the post-merge canary has actually committed the expected compact response and manifest.


## P. Continuation pass: authority monotonicity, published-path identity and recovery source identity

The post-handoff hostile pass found three additional concrete second-order holes. None required a new framework.

### P1. Combined integrity cannot re-upgrade legacy evidence

`combine-population-integrity.mjs` previously inferred `decisionValidComplete: true` for a component that lacked the explicit modern field when older coverage/outcome fields looked clean. That recreated exactly the backward-compatibility hazard closed elsewhere in this branch: a legacy artifact could regain fresh decision authority at a downstream combine boundary.

Combination now treats decision validity as monotonic authority: every component must explicitly carry `decisionValidComplete: true`. Clean historical components remain readable and may still be coverage-complete, but combining them cannot manufacture modern decision entitlement. The mixed modern/legacy case is pinned in the Node test.

Commits: `c5ce6ca2fb`, `06e5c79f95`.

### P2. Published evidence paths must be one-to-one with source artifacts

The standard publisher staged every non-primary `--include` under `files/<basename>`. Two distinct source artifacts with the same basename therefore mapped to the same destination: the later copy overwrote the earlier bytes while the manifest still recorded both source entries. Each source could be individually valid, yet the published bundle told a false story about which bytes survived.

The publisher now claims each published path once and fails with an integrity error on any collision before a second source can overwrite that path. A real subprocess test supplies two distinct `summary.json` includes and requires the CLI to fail rather than publish an ambiguous bundle.

Commits: `9907ac3e96`, `832325a1b0`.

### P3. Reconciliation source identity comes from the manifest, not the staging directory

Cross-run reconciliation used the directory name under `sources/<run-id>/` as the source run identity without proving that the staged manifest actually belonged to that workflow run. A misplaced or incorrectly downloaded artifact could therefore be relabelled by its directory name, after which the false identity entered `sourceRuns` and `sourceSetHash`.

Fresh reconciliation sources must now declare `experiment.workflowRunId` and `experiment.workflowRunAttempt`. The declared run ID must equal the staging directory identity; top-level and experiment run/attempt fields must agree when both are present. Missing attempt identity is also rejected, because a rerun attempt is part of the acquisition provenance rather than an incidental workflow detail.

This leaves directory layout as transport only. It can locate a source, but it cannot define the scientific source identity.

Commits: `daec86b202`, `415eb81fc4`.

### P4. Negative checks from this continuation

Two nearby seams were inspected and did not earn changes:

- technique-census duplicate cells are only deduplicated when their scientifically comparable payloads agree; conflicting duplicates already fail loudly before plan/result analysis;
- the method-probe flat-versus-nested staging adapter is layout-sensitive by necessity, but exact population validation, duplicate result detection, authored outer-shard count and execution-metadata agreement prevent that layout from becoming scientific identity.

The deliberate non-fixes remain unchanged: no generic composite-configuration-vs-single-result hash equality assertion without an ownership signal, and no claim that the extracted targeted-persistence workflow has passed its required post-merge runtime canary.


### P5. A modern shard cannot lend its immutable revision to legacy siblings

The core `combine-solver-sweep-reports.mjs` revision check previously compared commits only when both inputs supplied non-`local`/non-`unknown` values. A mixed combine containing one real immutable SHA and one legacy/unknown revision therefore passed, after which the combined artifact selected the first available commit and could stamp the known SHA over rows whose execution revision was never proved.

The combiner now rejects partial immutable revision presence: once any source report carries a real immutable execution SHA, every source must carry immutable revision provenance. Legacy/local-only combines remain available as weak analysis, but they cannot be silently promoted by mixing in one modern shard. A subprocess test pins the real-SHA-plus-`unknown` rejection.

Commits: `1309022932`, `32078354c2`.


## Q. Continuation pass: sampling authority, append-order authority and shard transport identity

A further hostile pass found another cluster where convenience mechanisms were accidentally allowed to define scientific authority.

### Q1. Human-summary sampling cannot bound scientific verdict binding

The standard publisher intentionally sampled at most 24 JSON files and skipped files above 128 MB when building human-facing summary statistics. The same sampled `stats` collection was also used by population/result/verdict binding checks. A large published directory could therefore contain additional level-bearing result files that were copied into the bundle but never participated in exact verdict-content, revision/configuration, or population binding.

The publisher now has two distinct views:

- bounded summary statistics remain capped for human-readable reporting;
- scientific binding walks the complete published JSON set and parses all level-bearing result documents.

A subprocess fixture publishes 25 result files and supplies a verdict bound only to the first 24. That verdict now fails exact-content binding instead of being accidentally validated by the presentation sampling limit.

Commits: `ea4ad396ad`, `1d4e0dc4cf`.

### Q2. Append-only family summary reruns cannot use "last row wins"

Variant-family dataset summary files are append-only across reruns. Repeated task rows are therefore expected when a shard is revisited. The merge previously selected the last occurrence for a namespaced `(corpus,id,mode)` task, which meant a conflicting rerun could let line/filesystem order choose the canonical solve count.

Identical repeats are now treated as harmless transport duplication. A repeated task with a different `solved/total` outcome is an integrity collision and fails loudly. The merge no longer lets append order choose scientific outcome identity.

Commits: `a636883834`, `01075aee32`.

### Q3. Static-portfolio publication counts the shards that were actually downloaded

`static-portfolio-confirmation.yml` downloads shard artifacts with `merge-multiple: true` into `artifact-staging/downloaded`. Its standard publisher nevertheless counted `shard-*.json` under `logs/static-portfolio-confirmation`, where those downloaded shard files do not live. A successful experiment could therefore publish `shardsObserved=0` and mark its artifact coverage incomplete despite the combiner having consumed real shard results.

The publisher now counts `artifact-staging/downloaded/shard-*.json`, the actual transport location. No global “download path must equal count path” abstraction was added because several maintained workflows legitimately transform or relocate artifacts before publication.

Commit: `a2f2ba5855`.

### Q4. Technique-census outer shard identity is explicit

Technique-census shard documents already declare both `shard` and `shards`, but the combiner previously trusted directory discovery and selected the first matching shard JSON from each artifact directory. It now requires:

- exactly one shard result JSON per outer artifact;
- artifact directory index, shard filename index and document `shard` to agree;
- one unique outer shard index;
- a consistent authored total shard count;
- explicit synthesis of missing outer shard identities.

The workflow now passes its authored 120-shard count to the combiner. Partial analysis remains possible, but missing transport cannot masquerade as complete shard topology.

Commits: `362e31cc10`, `40bb3fbaf4`, `85bbf10af8`, `df9040d629`.

### Q5. Method-probe outer shard count is now identity-aware, not merely cardinality-aware

Method-probe had already been hardened to know the authored outer-shard count and tolerate the one-artifact flat download layout. The remaining seam was that it counted discovered artifact directories without proving their semantic shard indices. Two differently spelled directories for the same shard index could satisfy a raw count while another shard was absent; worker result filenames could also disagree with the containing artifact identity.

The combiner now canonicalizes outer shard indices, rejects duplicate/out-of-range identities, records the exact missing outer-shard IDs, and requires every worker result/log filename to carry the containing outer shard index. The single-artifact flat layout remains supported as shard 1.

Commits: `715c01f91a`, `5fc20988d3`.


## R. Reconciliation proof must survive durable publication

The reconciliation validator already computed two useful canonical hashes:

- `protocolHash`: the common experiment protocol proved across source runs;
- `sourceSetHash`: the exact canonical source membership, including source workflow run ID, run attempt, resolved execution SHA, configuration hash and source population identity.

The prior contract retained only bare `sourceRuns` plus `sourceProtocolHash`, and the standard publisher rebuilt its experiment envelope without preserving even that protocol hash. Thus a richer source identity was proved at validation time and then compressed before durable publication.

The repair now:

- carries both `sourceProtocolHash` and `sourceSetHash` on the reconciliation experiment contract;
- mirrors them into the typed `reconciliationRun` record;
- preserves both fields when the standard publisher rebuilds the durable manifest;
- includes `logs/solver-combined/source-provenance.json` in the standard published bundle so the canonical source-set preimage remains auditable after upstream Actions artifacts expire.

This is deliberately not a new lineage framework. It preserves data the existing validator already owns and proves.

Commits: `7c246797d4`, `924bfcaa28`, `650c388df3`, `04bef5d788`, `ccc20ac2b5`, `fdf63e3353`.


## S. Durable retention re-proves existing byte and population claims

The durable experiment-evidence harvester already re-ran the shared decision-bearing predicate, but that predicate is intentionally a pure manifest/contract check. It cannot inspect the files behind a manifest. A downloaded artifact could therefore retain a structurally valid `decisionBearing: true` manifest while the exact result bytes it refers to had changed before durable retention.

The harvester now re-proves two existing publisher-owned claims before copying a bundle:

- when `researchOutcome.binding.resultContentHashes` exists, every publisher-domain level-bearing JSON result is rehashed and the exact hash multiset must still match;
- for the unambiguous simple-population shape (`populationIntegrity.expectedIds`, no paired arms/components, file primary with `levels[]`), the retained primary rows must still exactly match the expected population.

Composite and paired population ownership is deliberately not guessed here; those remain with their specialist contracts. The harvester is replaying claims that are already explicit and unambiguous, not inventing new entitlement rules.

The self-test now includes both stale exact-result bytes and a result whose content hash is current but whose row population disagrees with `expectedIds`.

Commits: `1db9cdab36`, `1f8961ff26`, `ac2406238e`, `558c89b1ab`.

## T. Exact verdict metadata bindings are cardinality-sensitive

The publisher's result-content hash check already included every bound result file. Its configuration-hash and resolved-SHA checks instead mapped the same result set and then called `.filter(Boolean)`. In a multi-result verdict, one file could therefore omit modern configuration/revision metadata while the binding listed only the sibling that had it; after filtering, the arrays could still compare equal.

Configuration and revision binding now fail closed when any bound result lacks the corresponding metadata or when binding/result cardinality differs. A fixture with two exact-content-bound results, only one carrying configuration/revision identity, is rejected on both dimensions.

Commits: `91f81384ac`, `f3842ee573`.

## U. Shard transport ambiguity cleanup

Two small follow-ups close ambiguity created by the previous shard-topology hardening:

- with an authored technique-census shard count, missing shards are now synthesized only from canonical numeric shard identity rather than also retaining whichever padded directory spelling happened to be present;
- method-probe staging rejects a mixed flat-and-nested download layout. The Actions transport has two supported shapes: one flat artifact or multiple named artifact directories. Seeing both at once is treated as ambiguous/stale transport evidence rather than silently preferring the named directories and ignoring root shard files.

Commits: `99ba6a284a`, `3aee3ed53a`, `d853a7bd04`.


## V. Final interaction audit: hostile fixtures must not contaminate later whole-tree tests

The final fresh-eyes pass caught a test-only interaction introduced by the durable-retention hardening. The new exact-byte and population-mismatch fixtures were intentionally mutated into stale/invalid states, but they were created under the same parent staging directory later reused by the idempotent whole-tree re-harvest assertion. That meant the later scan could correctly reject those hostile fixtures and thereby fail a test that was supposed to exercise only the original retained artifact.

The fixtures now live in isolated temporary roots. This does not change product behavior; it restores the intended independence of the self-test phases and prevents a deliberate negative fixture from contaminating a later positive whole-tree scan.

Commit: `4d12a730f2`.


## W. Published file entries carry independent byte fingerprints

Embedded completed verdicts have a legitimate self-reference problem: a primary result cannot contain a stable hash of its own complete bytes when the verdict and binding live inside that same file. The standard publisher previously copied primary/include files into the artifact without recording an independent publication-time fingerprint on the manifest entry, so durable retention could revalidate contract/population structure yet still lack a non-circular way to prove that an embedded-verdict primary remained byte-identical to what was published.

Fresh standard publication now records a SHA-256 digest on every copied file entry, including compact failure-response evidence. Directory entries remain unhashed rather than introducing an ad hoc tree-hash contract.

Durable retention rechecks any declared entry digest before copying. This gives embedded-verdict file primaries independent byte identity without requiring a self-referential verdict binding, and also protects ordinary included file evidence from silent mutation between publication and harvest.

A hostile fixture mutates an embedded-verdict primary after its manifest digest is written and verifies that durable retention rejects the artifact.

Commits: `12615826c9`, `053868e93a`, `160634195e`.
