# Solver capability-memory integration

> **Status:** implemented on branch `chatgpt/capability-memory-research-loop-2026-09-11`.
> **Evidence role:** research-process/tooling integration; no solver-policy promotion and no solve-count claim.
> **Production impact:** none. The cold solver, attempt ladder, budgets, scoring, pruning, routing, and level-blind runtime information boundary are unchanged.

## Why this exists

A solver experiment has two separable outputs:

1. its **promotion disposition** under the tested product/evidence contract; and
2. the **capability it demonstrated, displaced, or exposed**.

Pathfinder already had strong machinery for the first. The second survived unevenly across dated reports, experiment prose, opt-in code, old benchmarks, and human memory. That created a blind spot: a treatment could be correctly closed as production-negative while still showing a large, distinct search basin that current production did not cover.

The September 11 review made this concrete. `STRATEGY_PORTAL_COARSE_STATE_MERGE` is correctly CLOSED NEGATIVE because its +158/-12 frozen A/B contains a genuine capability regression, yet the 158 gains are still valuable evidence that this alternate survivor policy reaches a large basin. Similar, smaller examples exist in rejected scorer/guidance/repair/restart forms and in capability displaced by accepted changes. The useful scientific question is not “should the rejected policy be resurrected?” It is “what generic property explains the complementary capability, and can current production capture it level-blindly under a fair work contract?”

## Durable rule

Added to [`solver-research-operating-model.md`](../docs/solver-research-operating-model.md) and owned in detail by [`solver-capability-memory.md`](../docs/solver-capability-memory.md):

> A promotion verdict and a capability signature are separate facts. A negative promotion verdict does not erase demonstrated complementary capability; preserve the evidence, not necessarily the implementation.

This does **not** weaken the rule against retaining failed code for posterity and does **not** weaken [`solver-level-blindness.md`](../docs/solver-level-blindness.md). Exact historical winners, gain/loss membership, old solver outcomes, and capability-memory membership remain forbidden production routing inputs.

## Implementation

### 1. Rebuildable capability-memory analyzer

New:

- `scripts/solver-capability-memory-lib.mjs`
- `scripts/solver-capability-memory.mjs`

The CLI takes a manifest naming one baseline plus candidate evidence and emits a rebuildable JSON/Markdown view. It deliberately creates no new standing truth database.

Candidate evidence can be either:

- a **row report**, joined directly to the supplied baseline; or
- a **historical signature** containing explicit historical gain/loss IDs from an owning report.

For row reports the analyzer:

- joins only IDs actually observed in both arms;
- treats missing candidate rows as unknown;
- treats errors/deadline truncation as inconclusive, never ordinary failure;
- computes gains, losses, residual denominator, work/nodes/wall aggregates, and work per gain where fields exist;
- computes unique capability, pairwise overlap/Jaccard, and greedy residual-union coverage.

For historical signatures it:

- preserves demonstrated historical gains/losses;
- intersects historical gains with the named current residual as **nominations**;
- reports **zero current-baseline confirmed gains** by construction;
- carries an explicit warning that old same-level outcomes cannot steer production.

This keeps historical archaeology useful without laundering it into current capability.

### 2. Capability composition in solver health

Updated `scripts/append-solver-health-record.mjs` using data the existing `solver-stress-refresh.yml` workflow already materializes.

New health fields require **zero additional solver compute**:

- population-ID hash per corpus;
- solved-ID hash per corpus;
- per-stage `workSpent` alongside existing reach/attempts/solves/nodes;
- `capabilityChurn` against the most recent protocol-compatible tracked capability run:
  - gained count plus gain-set hash;
  - lost count plus loss-set hash;
  - retained count;
  - comparison run ID.

The timeline deliberately does not duplicate exact churn IDs. The comparison run ID plus the current run ID identify the existing per-level snapshots whose solved sets can be diffed for forensic follow-up.

A prior run is eligible only when the retained summary/per-level snapshot establishes matching:

- level-blind mode;
- deterministic mode;
- enabled flag set;
- disabled flag set;
- corpus presence/totals;
- exact population-ID hash.

Thus an experimental flag run cannot silently become the comparator for ordinary production health. If no compatible retained snapshot exists, churn is `null`, not `0`.

This lets a scalar move such as `1029 -> 1041` be distinguished from `+12/-0`, `+27/-15`, or another capability exchange without launching any extra solve.

### 3. Evidence topology and discovery

Updated:

- [`solver-research-data-assets.md`](../docs/solver-research-data-assets.md)
- [`solver-research-data-assets.json`](../docs/solver-research-data-assets.json)
- [`tooling-catalog.md`](../docs/tooling-catalog.md)

The machine registry now has `solver-capability-memory` as a `generated-interface` asset with joins to:

- production benchmarks;
- raw/historical evidence;
- experiment manifests;
- technique census;
- lifecycle telemetry;
- operational traces;
- variant families;
- static descriptors.

Two explicit relationship families were added:

- capability memory ↔ current residual/provenance;
- capability memory ↔ mechanism/trace/family/descriptor evidence.

The structured caveats preserve freshness, missing-row, selection-pressure, and runtime-leakage boundaries.

### 4. Workstream routing, not a new workstream

Updated [`solver-optimization-workstreams.md`](../docs/solver-optimization-workstreams.md) and [`solver-future-work.md`](../docs/solver-future-work.md).

Capability memory feeds existing owners:

- WS2: overlap, unique capability, residual headroom and work economics;
- WS1: generic selector/mechanism premise nomination;
- WS4: cross-policy recurrence of retention/representation loss;
- WS6: producer/consumer complementarity after exposure/operator evidence;
- WS0: restart premise nomination only under existing reopen rules;
- WS3: selection pressure from mining many historical policies.

It is not a parallel queue and does not lower any reopen gate.

### 5. Residual/freshness reconciliation

The implementation pass found a concrete stale-authority problem: `solver-future-work.md` still described the pre-provenance-audit class split as class 4 = 200 / class 5 = 388 even though the canonical post-1,029 workstream authority had already reconciled it to class 4 = **143** / class 5 = **445**.

The stale counts are corrected. The docs now explicitly require residual-derived views/current-state counts to be reconciled after a material capability promotion or provenance reinterpretation.

The canonical production boundary remains **1,029/1,700 Corpus 2** from run `34531412380`. The later +21 joint-obligation promotion is not silently added to that baseline; a full refreshed production boundary must establish the next headline count.

### 6. Current-state consistency repair

The workstream state table still said repair operator reachability was an open WS2 sub-question although the detailed gate already recorded the 28-level repair exposure/operator study as complete (4/28 reconstructable if seeded, 24/28 operator-incapable). The summary is reconciled to the detailed gate. The four reconstructable cases remain a Card-E handoff nomination, not an implemented or proven mechanism.

## Validation

`append-solver-health-record-node-test.mjs` was expanded to cover the new capability-memory/health contracts. The synthetic test suite checks:

1. per-stage work accounting;
2. solved/population hashes and compact +gain/-loss churn hashes;
3. rejection of protocol/flag-incompatible prior health snapshots;
4. CLI longitudinal append/churn behavior without duplicating exact IDs into the timeline;
5. row-report capability comparison with errors/truncation kept inconclusive;
6. historical-signature nomination versus confirmed-current-gain separation;
7. capability-memory CLI materialization from a manifest.

Local Node execution of the combined test file completed with all tests passing before the branch documentation integration. Repository CI remains the integration authority for the full tree.

## What this deliberately does not do

- No production fallback cascade was added.
- No historical solver ensemble was added to the cold solver.
- No experiment was reopened.
- No failed implementation was retained solely for history.
- No new stress corpus or expensive batch was generated.
- No old gain set is claimed as current gain.
- No current solve count is inferred from the +21 promotion without a full refresh.
- No dynamic/ML scheduler is justified by the capability-memory union.

## Intended use

The next time a research question asks whether production is missing already-demonstrated capability, first build the smallest capability-memory view from existing current rows and historically explicit signatures. If the resulting complementarity is material, use trace/family/static/exact evidence to identify a **generic** cause. Only that generic descendant enters the normal shadow → matched-work → independent-confirmation pipeline.

The resulting loop is:

> experiment verdict → preserve material capability signature → join against named current residual → measure overlap/uniqueness/freshness → explain recurring complementarity generically → test a new level-blind premise

This makes rejected and displaced capability scientifically reusable without turning the production solver into a museum of old policies.
