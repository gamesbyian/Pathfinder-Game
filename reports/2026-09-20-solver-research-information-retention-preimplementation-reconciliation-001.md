# Solver research information-retention pre-implementation reconciliation 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — current-main compact-evidence, consumer, persistence, and closeout reconciliation
> **Decision:** proceed to bounded implementation with a shared historical identity view, no schema bump, no historical file rewrite, and no new post-hoc promotion workflow unless repeated need later earns one
> **Remaining gate:** implement Package A identity correction; then run the deterministic-retention measurement before any persistence wiring
>
> **Evidence role:** forensic
> **Source audit:** `docs/solver-research-information-retention-audit.md`
> **Implementation plan:** `docs/solver-research-information-retention-implementation-plan.md`

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-09-20","decision":"Proceed with compact identity correction using a shared historical read-time compatibility view; do not bump schema or rewrite frozen evidence; keep late-promotion handling procedural unless repeated use earns a helper.","remainingGate":"Implement Package A identity correction and tests, then measure deterministic compact-retention economics before workflow persistence changes.","joins":{"researchQuestion":null,"premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"forensic","scope":{"populationIdentity":null,"selection":"current-main compact evidence and maintained consumers/persistence/closeout surfaces","inferenceScope":"pre-implementation architecture only"},"claimRefs":[],"sourceArtifacts":["docs/solver-research-information-retention-audit.md","docs/solver-research-information-retention-implementation-plan.md"],"prospective":{"expectation":null,"surprise":"Historical compact evidence is tiny and uniformly affected, making read-time compatibility much simpler than expected.","anomaly":null}} -->

## Purpose

Before implementation, revisit the information-retention audit in light of its own lessons:

> several apparently obvious defects had turned out to be intentional, measured choices.

The reconciliation therefore rechecked only the surfaces about to change:

- compact failure-response projection;
- tracked historical compact documents;
- compact evidence consumers;
- experiment publication/persistence;
- generic closeout/reconstructability guidance.

No broad repository survey was reopened.

## 1. Compact action/config identity defect remains confirmed

Canonical identity already distinguishes:

- configuration identity;
- action identity = stage + configuration + repair seed salt;
- gate and budget as separate dimensions.

Current common sweep rows preserve `winningConfig` and `winningActionKey` separately.

Current compact row projection does not:

```text
configurationKey <- row.configurationKey ?? row.configKey
actionKey        <- row.winningConfig ?? row.winningConfigKey ?? row.actionKey ?? techniqueKeys
```

The result is a semantic collapse, not merely a missing fallback.

The fix remains warranted.

## 2. Historical compatibility is much smaller and cleaner than feared

Current main contains three tracked compact-response instances:

1. experiment evidence run 35467098808;
2. experiment evidence run 35530061224;
3. targeted-sweep persisted failure evidence run 35531721218.

All inspected historical row-level evidence exhibits the same pattern:

- `actionKey` contains a valid configuration identity;
- `configurationKey` is absent/null;
- row `stageId` is generally absent;
- richer targeted evidence still contains correct attempt-level canonical action keys such as:
  - `early-repair-search|repair|score=repair|guidance=standard|seedSalt=0`;
  - `main-search|beam|score=...|width=...|retention=...`;
  - `repair-fallback|repair|...|seedSalt=0`.

This historical debt is therefore small and mechanically recognizable.

## 3. No schema bump is needed

Existing identity owners already make configuration and action grammars distinguishable:

- `parseHistoricalAttemptIdentityKey()` accepts canonical/historical config identity;
- `normalizeAttemptActionKey()` accepts composite stage+config(+seed) action identity.

A config-only string does not successfully normalize as a true action identity.

Therefore historical compatibility should be implemented as a shared **read-time identity view**:

- true action identity stays action identity;
- legacy row `actionKey` that is actually parseable config identity is reinterpreted as historical configuration identity;
- no stage/action is synthesized;
- frozen historical JSON remains byte-for-byte untouched.

Schema v1 can remain readable.

## 4. Producer-only correction would be insufficient

Maintained consumers use row-level action/config identity directly:

- `failure-response-identity-audit-lib.mjs`;
- `failure-response-novelty-lib.mjs`;
- `failure-response-query.mjs`;
- `failure-evidence-purpose-query.mjs`;
- `hint-failure-process-join-lib.mjs`.

Without a shared historical view:

- new documents would carry correct config/action separation;
- old documents would retain config-as-action;
- longitudinal novelty/grouping/filtering could mistake representation change for mechanism change.

Therefore Package A should contain both:

1. prospective projection correction;
2. shared historical ingress/view normalization used by identity-sensitive consumers.

## 5. Current tests encode the old defect

`solver-failure-response-lib-node-test.mjs` currently expects a technique-census row with `techniqueKeys: ['beam']` to project:

```text
actionKey = "beam"
```

That assertion is not an independent contract. It memorializes the existing collapse.

The revised test contract should establish:

- multi/single technique labels are not automatically canonical action identity;
- `winningConfig` / `winningConfigKey` populate configuration identity;
- `winningActionKey` populates action identity;
- historical config-in-action rows normalize only at read time;
- identical config under different stages/actions remains distinguishable on new evidence.

## 6. Post-hoc scientific promotion has reusable primitives but no supported rail

The current system already provides:

- manual re-harvest of an existing Actions run via `harvest-solver-evidence.yml` workflow dispatch;
- explicit `research-workflow-outcome` sidecars;
- exact outcome/result/population/configuration binding in `publish-solver-sweep-result.mjs`;
- immutable decision-bearing persistence in `persist-decision-bearing-experiment-evidence.mjs`.

However:

- the persister only accepts artifacts already published with `decisionBearing=true`;
- exploratory targeted/reconciled artifacts generally lack a completed research outcome;
- there is no named maintained helper that downloads an earlier exploratory standard artifact, binds a later scientific outcome to its exact immutable bytes, republishes it as decision-bearing, and persists it.

So the audit's late-promotion seam is real.

But a new helper is **not yet earned**.

The Resource Contract already gives a sufficient closeout rule:

- if the source becomes material to a durable scientific conclusion, preserve the smallest reconstructable evidence through an existing compatible rail or explicitly record the expiration boundary.

If post-hoc promotion becomes a repeated operation, then a small fail-closed republish-and-persist helper may be justified.

## 7. Closeout trigger should remain narrow

The final reconciliation rejects an overbroad reading of reconstructability.

Merely mentioning an Actions artifact in an exploratory report should not create archival obligations.

The generic closeout check should apply when source rows are materially needed to support or later audit a durable:

- promotion/closure/decision;
- capability or future-work premise;
- exact/reference dataset/resource intended for reuse;
- mechanism claim whose row-level distinctions matter.

Illustrative examples, exploratory context, and non-material citations may remain artifact-lifetime evidence.

## 8. Deterministic refresh remains measurement-first

Nothing in this reconciliation changes the earlier economics:

- full Corpus 2 primary is currently ~61 MB;
- immutable per-run projections are much smaller;
- corrected compact failure response remains the smallest plausible long-horizon supplement.

Do not wire deterministic compact persistence in the same change as Package A.

First measure representative full C1+C2 compact payload size and actual consumer coverage.

## Final disposition

Proceed to implementation with these refinements:

1. **No schema v2.**
2. **No historical evidence rewrite.**
3. **Fix current producer projection.**
4. **Add one shared historical row identity view for maintained consumers.**
5. **Rewrite tests that currently encode config-as-action collapse.**
6. **Keep late scientific promotion procedural for now.**
7. **Keep generic closeout reconstructability narrowly materiality-triggered.**
8. **Measure deterministic compact retention before persistence.**

Nothing discovered in this revisit warrants reopening the broad audit or delaying Package A further.
