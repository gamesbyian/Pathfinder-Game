# Solver capability-memory integration

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — capability-memory analyzer, protocol-aware zero-compute health churn, evidence-topology registration, current-authority reconciliation/compaction, censoring hardening, report-header normalization, and full repository CI are complete on `chatgpt/capability-memory-research-loop-2026-09-11`.
> **Decision:** retain this as durable research/evidence infrastructure. It adds no production solver policy and does not authorize historical exact-level steering; future capability-memory descendants remain subject to the ordinary level-blind matched-work and confirmation gates.
> **Remaining gate:** none for this tooling integration. CI run `34655997709` completed successfully on the reconciled implementation tip before this closeout-only documentation update.
> **Evidence role:** research-process/tooling integration; no solver-policy promotion and no solve-count claim.
> **Production impact:** none. The cold solver, attempt ladder, budgets, scoring, pruning, routing, and level-blind runtime information boundary are unchanged.

## Why this exists

A solver experiment has two separable outputs:

1. its **promotion disposition** under the tested product/evidence contract; and
2. the **capability it demonstrated, displaced, or exposed**.

Pathfinder already had strong machinery for the first. The second survived unevenly across reports, experiment prose, opt-in code, old benchmarks, and human memory. That can erase useful information when a treatment is correctly production-negative but still reaches a distinct search basin.

The September 11 review made this concrete. `STRATEGY_PORTAL_COARSE_STATE_MERGE` is correctly CLOSED NEGATIVE because its +158/-12 frozen A/B contains a genuine capability regression, yet the 158 gains remain useful evidence about an alternate survivor policy. Similar smaller examples exist in rejected scorer/guidance/repair/restart forms and capability displaced by accepted changes. The scientific follow-up is to explain complementary capability generically, not resurrect the rejected policy by identity.

## Durable rule

Added to [`solver-research-operating-model.md`](../docs/solver-research-operating-model.md) and owned in detail by [`solver-capability-memory.md`](../docs/solver-capability-memory.md):

> A promotion verdict and a capability signature are separate facts. A negative promotion verdict does not erase demonstrated complementary capability; preserve the evidence, not necessarily the implementation.

Exact historical winners, gain/loss membership, old solver outcomes, and capability-memory membership remain forbidden production-routing inputs.

## Implementation

### 1. Rebuildable capability-memory analyzer

New:

- `scripts/solver-capability-memory-lib.mjs`
- `scripts/solver-capability-memory.mjs`

The CLI takes a manifest naming one baseline plus candidate evidence and emits a rebuildable JSON/Markdown view. It creates no new standing truth database.

Candidate evidence can be either a **row report** or an explicit historical **gain/loss signature**.

For row reports the analyzer:

- joins only IDs actually observed in both baseline and candidate;
- requires both baseline and candidate rows to be conclusive before calling a gain/loss;
- treats missing rows, errors and deadline truncation as unknown/inconclusive, never ordinary failure;
- reports baseline conclusive/residual/unknown counts and hashes in JSON and the human summary;
- computes gains, losses, residual denominator, work/nodes/wall aggregates, work per gain, unique capability, pairwise overlap/Jaccard, and greedy residual-union coverage.

For historical signatures it:

- preserves demonstrated historical gains/losses;
- intersects gains only with the named **conclusive** current residual as nominations;
- reports zero current-baseline confirmed gains by construction;
- carries an explicit warning that old same-level outcomes cannot steer production.

This keeps historical archaeology useful without laundering it into current capability.

### 2. Capability composition in solver health

Updated `scripts/append-solver-health-record.mjs` using artifacts the existing `solver-stress-refresh.yml` workflow already produces. No solver compute is added.

New health fields include:

- population-ID hash and solved-ID hash per corpus;
- per-stage `workSpent` alongside reach/attempts/solves/nodes;
- compact normalized protocol object plus protocol hash;
- `capabilityChurn` against the most recent compatible tracked run: gained/lost/retained counts, gain/loss set hashes, and comparison run ID.

The timeline deliberately does not duplicate exact churn IDs. The current/comparison run IDs point to existing per-level snapshots whose solved sets can be diffed for forensic follow-up.

For ordinary workflow-dispatch runs, protocol identity is derived directly from `GITHUB_EVENT_PATH`: the complete dispatch-input map is normalized with current workflow defaults filled for omitted inputs. Callers may alternatively provide `summary.protocol`. This avoids changing solver execution or adding workflow plumbing merely to reserialize inputs.

A prior run is eligible only when protocol hash, level-blind/deterministic mode, flag sets, corpus presence/totals, and exact population-ID hashes match. Legacy timeline rows without protocol identity abstain instead of comparing. Thus a differently budgeted or experimental run cannot silently become the production-health comparator.

### 3. Evidence topology and discovery

Updated:

- [`solver-research-data-assets.md`](../docs/solver-research-data-assets.md)
- [`solver-research-data-assets.json`](../docs/solver-research-data-assets.json)
- [`tooling-catalog.md`](../docs/tooling-catalog.md)

The machine registry now exposes `solver-capability-memory` as a generated interface joined to production benchmarks, raw/historical evidence, manifests, technique census, lifecycle telemetry, traces, variant families and static descriptors. Structured caveats preserve freshness, missing-row, selection-pressure and runtime-leakage boundaries.

### 4. Workstream routing, not a new workstream

Updated [`solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) and [`solver-future-work.md`](../docs/solver-future-work.md). Capability memory feeds existing WS2/WS1/WS4/WS6/WS0/WS3 responsibilities; it is not a parallel queue and lowers no reopen gate.

During CI recovery those two live authority docs were also compacted back toward their declared **current-state only** role instead of raising agent-context limits. Chronology remains in the linked dated reports.

### 5. Residual/freshness reconciliation

The pass found a concrete stale-authority problem: `solver-future-work.md` still used the pre-provenance-audit class split (class 4 = 200 / class 5 = 388). It now matches the canonical post-1,029 split: class 4 = **143**, class 5 = **445**.

The canonical production boundary remains **1,029/1,700 Corpus 2** from run `34531412380`. The later +21 joint-obligation promotion is not silently added; a full refresh must establish the next headline count.

The workstream summary also no longer calls repair operator reachability open after the detailed 28-level study resolved it (4/28 reconstructable if seeded, 24/28 operator-incapable). The four reconstructable cases remain a Card-E nomination, not an implemented mechanism.

### 6. Report-contract reconciliation

The incremental documentation gate exposed four other September 11 investigation reports with descriptive/free-text `Status` values rather than the repository's canonical status enum. Those report bodies and decisions were already current; only their top-level metadata shape was stale. This branch normalizes the headers to `active` or `concluded-positive` as appropriate, without changing findings.

## Validation

`append-solver-health-record-node-test.mjs` now covers:

1. per-stage work accounting;
2. solved/population hashes and compact +gain/-loss churn hashes;
3. explicit-summary protocol identity;
4. workflow-event protocol derivation with default filling;
5. rejection of protocol/flag-incompatible prior snapshots;
6. abstention on legacy timeline rows without protocol identity;
7. CLI longitudinal append/churn without duplicating exact IDs;
8. baseline-side and candidate-side censoring/unknown semantics;
9. historical-signature nomination versus confirmed-current-gain separation;
10. capability-memory JSON and human-summary materialization, including censored-baseline visibility.

CI recovery exercised the repository's own guardrails rather than weakening them. The first PR run passed deep verification but exposed two touched live authorities already over their agent-context hard caps; those docs were compacted instead of raising limits. The next run explicitly passed the package/tooling/context-budget checker and exposed the stale report-header metadata described above. After normalizing those headers, CI run `34655997709` passed end to end: deep verification, non-lint repository checks, lint, Node/CLI contract tests, solver capability canary, and production bundle build all succeeded.

## What this deliberately does not do

- No production fallback cascade or historical solver ensemble.
- No search/routing/scoring/pruning/budget change.
- No experiment reopened solely because its capability signature is interesting.
- No failed implementation retained solely for history.
- No new stress corpus or expensive batch.
- No old gain set claimed as current gain.
- No inferred headline solve count from the +21 promotion.
- No dynamic/ML scheduler justified by an offline union.

## Intended use

For a question about already-demonstrated capability, first build the smallest capability-memory view from current rows and explicit historical signatures. If complementarity is material, use trace/family/static/exact evidence to identify a **generic** cause. Only that generic descendant enters the normal shadow -> matched-work -> independent-confirmation pipeline.

> experiment verdict -> preserve material capability signature -> join against named current residual -> measure overlap/uniqueness/freshness -> explain recurring complementarity generically -> test a new level-blind premise

This makes rejected and displaced capability scientifically reusable without turning the production solver into a museum of old policies.
