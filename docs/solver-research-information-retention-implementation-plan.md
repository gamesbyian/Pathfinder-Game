<!-- agent-context-budget: warn=7000 max=10000 -->
# Solver research information-retention implementation plan

> **Status:** implementation complete; deterministic-retention measurement concluded negative for full compact persistence.
> **Source audit:** [`solver-research-information-retention-audit.md`](solver-research-information-retention-audit.md)
> **Measured retention disposition:** [`../reports/2026-09-21-deterministic-refresh-compact-retention-measurement-001.md`](../reports/2026-09-21-deterministic-refresh-compact-retention-measurement-001.md)
> **Closeout report:** [`../reports/2026-09-20-solver-research-information-retention-audit-001.md`](../reports/2026-09-20-solver-research-information-retention-audit-001.md)
> **Priority boundary:** this plan changes research evidence projection/retention only. Solver capability experiments remain owned by [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md).
> **Non-regression boundary:** production level-blindness, solver decisions, search order, budgets, and default telemetry collection must remain unchanged unless separately authorized by their owning programs.

## 1. Objective

Implement the **smallest** changes earned by the information-retention audit.

The audit explicitly rejected a broad observability/storage campaign. The implementation target is limited to:

1. preserve canonical configuration/action identity correctly in compact failure evidence;
2. measure, then optionally improve, deterministic-refresh long-horizon explanatory retention;
3. propagate the existing reconstructability rule into generic research closeout;
4. clarify that workflow-level harvester participation is not evidence-layer durability;
5. harden guidance for exact/reference and one-shot evidence without creating new stores.

## 2. Principles

1. **No new warehouse.**
2. **No universal raw-artifact retention.**
3. **No new runtime telemetry merely because a counter could be useful.**
4. **No reopening of the 2026-09-19 compact/rich search-loss disposition without a new recurring consumer.**
5. **Unknown remains unknown.** Never fill missing action/config/stage identity with a coarser identity merely to avoid null.
6. **Use existing rails first:** compact failure response, v3 experiment bundles, purpose-specific tracked datasets, Resource Contract, investigation closeout.
7. **Measure bytes before persistence.**
8. **Historical evidence remains readable.** A schema correction must not make old compact documents silently incomparable or unparsable.
9. **Branch-local is a destination class, not canonical durability.**
10. **Implementation should make fewer future bespoke persistence switches necessary, not add more.**

## 3. Work package A — compact configuration/action identity correction

### Problem

Current `compactFailureResponseRow()` collapses distinct canonical identities:

```text
configurationKey <- row.configurationKey ?? row.configKey
actionKey        <- row.winningConfig ?? row.winningConfigKey ?? row.actionKey ?? techniqueKeys
```

But the solver identity contract defines:

- config = attempt policy/configuration identity;
- action = stage + config + repair seed salt;
- gate/budget = separate dimensions.

Production sweep rows already preserve both `winningConfig` and `winningActionKey`.

### Required prospective semantics

For a current producer row:

```text
configurationKey:
  explicit configurationKey
  -> explicit configKey
  -> winningConfig
  -> winningConfigKey
  -> otherwise null

actionKey:
  winningActionKey
  -> explicit actionKey
  -> otherwise null
```

Do **not** use:

- `winningConfig` as `actionKey`;
- `winningConfigKey` as `actionKey`;
- joined `techniqueKeys` as one action identity.

`stageId` remains separate.

### Producer expectations

#### Portfolio / level-blind sweep rows

Expected:

- `configurationKey = winningConfig` on solved rows;
- `actionKey = winningActionKey` when winner has canonical stage/action identity;
- null winner identities on unsolved rows;
- compact attempts continue to preserve each attempt's own stage/action/config/gate.

#### Method probe

`winningConfigKey` is configuration identity.

Unless method-probe produces an actual canonical scheduler action identity, row-level `actionKey` should remain null. Attempt-level identity remains available from retained attempts where present.

#### Technique census

`winningConfigKey` is configuration identity.

`techniqueKeys` is a cell treatment/config set, not one canonical action key, especially for pair/static portfolio cells. Do not coerce it into `actionKey`.

### Historical compatibility

Historical schema-v1 compact documents may contain configuration strings in `actionKey`.

Before changing readers:

1. inspect whether canonical action strings are syntactically distinguishable through `normalizeAttemptActionKey()`;
2. if a historical `actionKey` parses as config but not action, treat it as legacy configuration identity only in an explicit historical-normalization adapter;
3. never manufacture a stage for historical config-only evidence;
4. novelty/longitudinal comparison should avoid falsely treating old config-only rows as equal to new action-qualified rows.

Compatibility **can** be achieved without a schema bump.

Current tracked compact-response evidence on main is very small (three retained instances at audit time) and all inspected historical rows show the same recognizable legacy projection:

- row `actionKey` contains a valid configuration identity;
- row `configurationKey` is null;
- richer targeted evidence may still contain correct attempt-level canonical action identities.

Canonical config and action grammars are mechanically distinguishable with the existing `parseHistoricalAttemptIdentityKey()` / `normalizeAttemptActionKey()` owners.

Therefore prefer:

1. fix producer projection prospectively;
2. add one shared **read-time identity view/normalizer** for historical compact rows;
3. do not rewrite frozen historical evidence;
4. do not bump the persisted schema merely to repair this projection.

The historical adapter should only reinterpret row `actionKey` as legacy configuration identity when it parses as a config identity and does **not** parse as a canonical/historical action identity. It must never synthesize a stage/action that historical evidence did not preserve.

All maintained compact consumers that compare/group/filter row-level config/action identity should consume that shared view rather than each inventing compatibility logic.

### Tests

At minimum:

- portfolio solved row with both winner identities;
- portfolio repair winner with non-zero seed salt;
- portfolio unsolved row;
- method-probe solved row;
- technique-census single-technique solved cell;
- multi-technique cell;
- explicit row-native `configurationKey/actionKey`;
- legacy config-string-in-actionKey decoding;
- malformed action identity remains unknown/fails where appropriate;
- novelty phenotype distinguishes same config under different stages/actions on new evidence;
- historical config-in-`actionKey` rows normalize to configuration-only identity without acquiring a fake stage/action;
- identity-audit/query/purpose-query/hint-failure consumers see the same normalized historical semantics;
- hint/failure-process join preserves action identity without affecting its parent/protocol join key.

### Exit gate

- config/action/stage/gate meanings match canonical attempt-identity owners;
- all current producers project without semantic coercion;
- historical compact evidence remains explicitly readable;
- no solver/search behavior changes;
- failure-response query and novelty tests pass.

## 4. Work package B — deterministic-refresh retention measurement

**Disposition: COMPLETE / full compact persistence closed negative; bounded winner-action snapshot improvement adopted.**

### Problem

`solver-stress-refresh.yml` deterministic mode commits bounded per-run projections but not full combined primary rows.

Current size contrast:

- C1 full primary ≈ 1.3 MB;
- C2 full primary ≈ 61.1 MB;
- historical per-run C2 projections ≈ 2–3 MB;
- lifecycle map ≈ 0.7 MB.

Full-primary-per-run Git retention is therefore not the default proposal.

### Candidate bundle

Measure the incremental cost/value of retaining under the immutable capability-run directory:

- existing per-level projection;
- existing lifecycle failure map;
- source-run provenance;
- **corrected compact failure-response document**;
- optionally the standard manifest if needed to bind protocol/population/solver identity without duplication.

Do not include rich search-loss capture or full `failureInformation` by default.

### Measurement questions

On representative full deterministic C1+C2 refresh artifacts:

1. What is compact-response uncompressed byte size?
2. What is gzip size using the same deterministic compression convention as durable experiment bundles?
3. What fraction of size comes from attempts versus repeated run identity?
4. Does compact + current per-run projection answer:
   - winning action/config attribution;
   - failed action/stage exposure;
   - work/dose distribution;
   - censor/exhaust composition;
   - badness support where semantically valid;
   - solved-parent failed-attempt controls?
5. Which known current analysis still requires full `stageLifecycle` or the 61 MB primary?
6. Can manifest/protocol identity be referenced rather than duplicated?
7. How many deterministic refreshes per month/year would be retained, and what is the annual Git cost?

### Measured result

The gate was executed against the actual current tracked C1+C2 full reports using `scripts/measure-deterministic-retention-payload.mjs`.

Measured C1+C2 totals:

- 1,802 rows;
- 56,906 attempts;
- full primary: 62,447,546 bytes / 4,366,229 gzip bytes;
- compact pretty JSON: 32,719,585 bytes;
- compact minified JSON: 22,291,303 bytes;
- compact gzip: 1,739,700 bytes;
- compact pretty / full: 52.4%;
- compact gzip / full gzip: 39.8%.

Full compact-per-run persistence is therefore **not adopted**. The ordinary tracked JSON is too large for the marginal value relative to existing immutable per-level snapshots, lifecycle maps, equal-work reach, and health-timeline aggregates, and no recurring deterministic-refresh consumer currently requires all historical attempt sequences.

The smaller implementation adopted by this program is to preserve `winningActionKey` beside `winningConfig` in each immutable per-level capability snapshot.

The full measurement and reopen condition are documented in `reports/2026-09-21-deterministic-refresh-compact-retention-measurement-001.md`.

### Reopen gate

Reconsider a purpose-built historical attempt projection only if a recurring consumer demonstrates a need for exact failed action/config sequence plus per-attempt dose/censoring after normal Actions retention. Do not default back to the 32.7 MB compact document without a new measurement.

The original prospective gate was:

- it is materially smaller than full primary;
- at least two recurring longitudinal/research consumers benefit;
- current per-run projections cannot cheaply reconstruct those fields;
- annual retained size is acceptable;
- immutable run/protocol/population binding is preserved;
- action/config correction from package A is complete.

Otherwise keep the current artifact-bound full primary and document the expiration boundary.

## 4A. Pre-implementation reconciliation findings

The final current-main reconciliation before implementation changed the plan in four ways:

1. **Historical compatibility is cheaper than expected.** Only three tracked compact-response instances were found on main at audit time, all exhibiting the same config-in-action projection. Existing parsers can distinguish the grammars, so schema v2 and historical-file rewriting are unnecessary.
2. **Current tests encode the defect.** `solver-failure-response-lib-node-test.mjs` currently expects a technique-census `techniqueKeys` value to become row `actionKey`. Package A must deliberately change the test contract rather than treating existing assertions as authority.
3. **Late promotion has primitives but no supported rail.** `harvest-solver-evidence.yml` can manually re-harvest a prior run, and `publish-solver-sweep-result.mjs` can bind an explicit later research outcome to exact result bytes. However the durable persister only accepts artifacts already published as decision-bearing. There is no named helper/workflow that safely republishes an earlier exploratory artifact with a later exactly-bound outcome.
4. **Do not build that helper preemptively.** The existing closeout/reconstructability rule is sufficient for now. If post-hoc promotion recurs, a small republish-and-persist helper can then be earned; until then, closeout should use existing purpose-specific tracked datasets or a normal decision-bearing publication when available.

These refinements reduce rather than expand the implementation.

## 5. Work package C — generic closeout reconstructability check

### Existing authority

`solver-research-resource-contract.md` already requires decision-bearing closeout to:

- identify primary evidence needed to reconstruct the claim;
- verify durability for the expected reuse horizon;
- preserve the smallest reconstructable bundle or explicitly record the expiration boundary.

Do not invent a second doctrine.

### Proposed documentation change

Add one item to the generic closeout checklist in `investigation-report-conventions.md`:

> If primary/source evidence material to later audit is artifact-bound or branch-bound, verify that it remains reconstructable for the expected reuse horizon. Preserve the smallest existing-compatible bundle when needed, or explicitly state the expiration boundary and what row-level re-analysis will no longer be possible. See the Solver Research Resource Contract reconstructability rule.

The exact wording should remain generic enough for non-solver research where appropriate, or be solver-qualified if the document's broader scope makes that safer.

### Trigger scope

Keep the generic rule narrow. A report mentioning an artifact does **not** create an archival obligation.

Apply the reconstructability check when source evidence is materially required to support or later audit a durable:

- decision/promotion/closure;
- capability or future-work premise;
- exact/reference resource intended for reuse;
- mechanism claim whose row-level distinctions matter.

Pure exploratory context, illustrative examples, and non-material source mentions remain normal artifact-lifetime evidence unless separately promoted.

### Structured closeout capsule

Do not add a new field yet.

Existing `sourceArtifacts` plus report prose is sufficient until a concrete machine consumer needs a durability class.

### Exit gate

- no duplicate retention doctrine;
- one canonical link to Resource Contract;
- one-shot, targeted, and reconciled acquisition are all covered by the same rule;
- documentation/link checks remain green.

## 6. Work package D — durability/discoverability wording

### Problem

`solver-failure-evidence-disposition.json` uses workflow-level durability modes such as:

- `automatic-harvest`;
- `artifact-only`;
- `alternate-rail`.

`automatic-harvest` can be overread as “all research evidence from this workflow is durable,” while the harvester actually preserves selected evidence layers.

Similarly, a resource registry status such as `generated-interface` describes availability of a semantic interface, not the existence of a durable current instance.

### Smallest change

Prefer prose/description clarification before schema expansion:

- clarify in the disposition authority that `automatic-harvest` means the workflow participates in the harvester and only supported evidence classes are retained;
- clarify generated-interface semantics in the resource guide/query docs if current wording invites overreading;
- reuse the audit's destination vocabulary in prose if useful:
  - canonical-main;
  - merged-history;
  - branch-bound;
  - durable-experiment-bundle;
  - artifact-bound;
  - operational-overwrite;
  - recomputable;
  - unknown.

Do not add these as mandatory enums yet.

### Exit gate

A fresh researcher can answer:

> “Does this evidence type exist?” and “will this particular instance still be reconstructable later?”

without assuming those are the same question.

## 7. Work package E — exact/reference and one-shot guidance

### Exact/reference

Keep the current practical pattern:

```text
generic exact/reference acquisition
  -> purpose-specific labelled dataset/report when scientifically reused
```

Document, where most discoverable, that reusable exact/reference labels should preserve:

- case/source identity;
- model/probe identity;
- LIVE/DEAD/UNKNOWN/UNSUPPORTED or equivalent non-collapsed outcome;
- timeout/abstention semantics;
- source population/provenance;
- witness/referee information where emitted.

Do not turn the generic CP-SAT workflow into an archive.

### One-shot retirement

Update one-shot guidance so deletion requires either:

- primary evidence is durably/reproducibly available for the expected need; or
- the dated report explicitly records the reconstruction boundary.

The workflow wrapper itself can still be deleted.

### Exit gate

One-shot cleanup remains easy and aggressive without implying that “answer recorded” always equals “claim reconstructable.”

## 8. Deferred / explicitly not in this implementation

Do not include:

- universal rich search-loss producer;
- default `failureInformation` persistence;
- DFS subtree telemetry;
- lower-bound or nogood-cache counters;
- cross-run compiled-state caches;
- new exact-label warehouse;
- generic partial-negative failed-run archive;
- Hint schema expansion with pre-win attempts;
- analyzer-wide normalized-row output mandate;
- new asset registry durability schema;
- new database/index service.

Each has either an existing owner, explicit negative disposition, or insufficient recurring consumer evidence.

## 9. Suggested implementation order

1. **Package A: identity correction**  
   Smallest, highest-confidence correctness improvement; also makes any later compact retention scientifically cleaner.

2. **Package C: closeout reconstructability wording**  
   Low-cost method hardening that addresses several workflow families at once.

3. **Package D/E: discoverability and guidance**  
   Documentation-only cleanup; fold into C if edits remain small and coherent.

4. **Package B measurement only — complete**  
   The measured gate did not earn full compact persistence.

5. **Bounded Package B outcome — complete**  
   Preserve `winningActionKey` in the existing per-level capability snapshot. No new compact-per-run store was added.

## 10. Commit / PR discipline

Implementation should stay decomposable:

- identity semantics/tests commit;
- closeout/discoverability docs commit;
- deterministic-retention measurement commit/report;
- persistence wiring commit only if measurement passes.

Update the PR description after each package. Do not combine a schema/identity correction with speculative storage expansion.

## 11. Completion definition

This implementation program is complete. Completion criteria were satisfied as follows:

- compact response preserves configuration/action identity correctly for current producers and remains honest for historical evidence;
- ordinary investigation closeout visibly inherits the existing reconstructability rule;
- harvester/resource wording no longer implies broader durability than it provides;
- exact/reference and one-shot retention expectations are explicit;
- deterministic compact retention has a measured disposition: **closed negative for full compact-per-run persistence**, with the smaller winner-action snapshot fix adopted;
- no broad observer/store has been added without a demonstrated consumer.

