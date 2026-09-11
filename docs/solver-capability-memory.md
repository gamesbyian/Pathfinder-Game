# Solver capability memory

> **Status:** durable offline-research contract and derived-analysis interface.
> **Production boundary:** this document does **not** authorize exact-level historical steering. Runtime legality remains owned by [`solver-level-blindness.md`](solver-level-blindness.md).
> **Promotion/evidence rules:** [`solver-research-operating-model.md`](solver-research-operating-model.md) and [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) remain authoritative.
> **Execution priority:** [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) remains the only live queue.

## Purpose

Pathfinder experiments answer two different questions:

1. **Should this treatment be production policy?**
2. **What capability did this treatment demonstrate, displace, or expose?**

The first question already has strong machinery: matched-work A/Bs, gains/losses, correctness checks, confirmation proportional to selection pressure, opt-in dispositions, and explicit close/reopen rules.

The second question used to survive mostly in prose and git history. That can discard useful information. A treatment can be correctly **CLOSED NEGATIVE** while still solving levels, preserving trajectories, or exposing a search basin that current production misses. Conversely, a promoted treatment can improve the aggregate while displacing a small old capability set. Those facts are research evidence even when they do not justify reverting or promoting anything.

The durable rule is:

> **A promotion verdict and a capability signature are separate facts. A negative promotion verdict does not erase demonstrated complementary capability; preserve the evidence, not necessarily the implementation.**

This extends the existing rule that git/reports are the archive and failed code need not remain live merely for posterity.

## What capability memory is not

Capability memory is **not**:

- a second solver queue;
- a reason to keep every failed flag or experiment implementation;
- a giant production fallback ladder;
- permission to route an exact historical level to its known winner;
- current capability merely because an old solver once succeeded;
- independent confirmation merely because many historical rows agree;
- an excuse to reopen a closed form without a changed premise.

Historical outcomes, exact level IDs, old winners, stored hints, family outcomes, and experiment labels remain offline evidence. Production must still derive any useful policy from legal generic level/current-solve features and validate that policy away from the rows that nominated it.

## Two-axis experiment closeout

When an experiment reaches a decision, preserve two axes where the evidence is material:

### Axis A: disposition

Examples:

- `PROMOTED`
- `CLOSED NEGATIVE`
- `CLOSED NULL`
- `DEFERRED`
- `RETAINED COUNTERFACTUAL`

This axis answers whether the tested form remains live for production/research promotion. Existing workstream, future-work, and opt-in-ledger rules still own it.

### Axis B: capability signature

Record, when known and worth preserving:

- treatment gains and losses against its tested control;
- population and protocol identity;
- whether rows were complete, conclusive, referee-valid, or censored;
- work/nodes/wall cost where meaningful;
- unique or rare gains relative to compared alternatives;
- whether the treatment changed routing, survivor identity, retention, operator reachability, restart behavior, representation, pruning, or another mechanism;
- whether the evidence is current, historical/reconciled, or merely nominative.

A `+5/-12` treatment can therefore remain `CLOSED NEGATIVE` while also carrying a legitimate capability signature such as “five deterministic Corpus-2 rescues under repair turn bias.” The signature is a premise source, not a production recommendation.

## Derived capability-memory view

`scripts/solver-capability-memory.mjs` builds an ephemeral/rebuildable view from a baseline plus candidate evidence. It deliberately does **not** create a new permanent truth store.

Two candidate evidence modes are supported.

### Row report

A candidate points at a report containing per-level rows (`levels`, `rows`, or `results`). The analyzer joins only IDs actually present in both baseline and candidate. A gain/loss requires **both** rows to be conclusive; an error/truncation on either side abstains. The baseline separately reports conclusive rows and unknown/censored rows so an unknown is never silently converted into a current residual miss.

The analyzer reports:

- confirmed gains against the supplied baseline;
- confirmed losses against the supplied baseline;
- observed current-residual denominator;
- aggregate `workSpent`, nodes, and elapsed time where present;
- work per confirmed gain over the observed residual;
- overlap/unique gains versus other candidates.

Absence from a candidate report is **unknown**, never failure.

### Historical signature

When a durable historical report contains explicit gain/loss IDs but no conveniently joinable row artifact, a manifest may supply those lists directly as a `signature` together with provenance/disposition metadata.

Historical signatures produce only:

- demonstrated historical gains/losses;
- intersection of historical gains with the supplied **conclusive** baseline residual, labelled **current-residual nominations**;
- overlap/uniqueness among nominations.

They produce **zero confirmed current-baseline gains** by construction. A historical gain that still sits in today's residual says “reconcile/rerun/explain this capability,” not “production can solve this now with that policy.”

## Manifest shape

Paths are relative to the manifest file.

```json
{
  "schemaVersion": 1,
  "baseline": {
    "id": "current-corpus2-production",
    "path": "../reports/stress/solver-corpus2-latest.json"
  },
  "candidates": [
    {
      "id": "current-row-treatment",
      "path": "../tmp/treatment-combined.json",
      "disposition": "closed-negative",
      "evidenceRole": "development",
      "mechanismFamily": "beam-retention"
    },
    {
      "id": "historical-policy",
      "sourceReport": "../reports/example.md",
      "disposition": "closed-negative",
      "signature": {
        "gainIds": ["R00001", "R00002"],
        "lossIds": ["R00003"]
      }
    }
  ]
}
```

Run:

```bash
node scripts/solver-capability-memory.mjs \
  --manifest=tmp/capability-memory-manifest.json \
  --out=tmp/capability-memory.json \
  --summary-out=tmp/capability-memory.md
```

The output includes pairwise nomination overlap, unique nominations, and a greedy union view. That union is **diagnostic headroom**, not an additive solve claim. Historical nominations and current row-report gains must not be summed as though they were equally fresh or independently validated.

## Capability displacement

Accepted solver changes may have positive net value while losing some old winners. Those losses are not automatically bugs and do not automatically block promotion when the owning acceptance rule permits the tradeoff. They are, however, unusually useful causal evidence.

For a materially changed production boundary:

1. preserve the gained/lost solved-set churn;
2. distinguish correctness regression from search-policy displacement;
3. keep displaced level IDs offline;
4. periodically ask whether losses from unrelated accepted changes recur in the same mechanism/failure phenotype;
5. if recurrence appears, nominate the smallest generic representation/retention/routing/operator premise that explains it.

This is a **counterfactual regression bank** conceptually, not necessarily a new tracked file. The health timeline and capability-memory analyzer provide the cheap raw material; dated reports own decision-bearing interpretation.

## Longitudinal health

`solver-stress-refresh.yml` already materializes per-run `summary.json` and per-level Corpus-1/2 snapshots. `scripts/append-solver-health-record.mjs` now uses those existing artifacts to preserve capability composition at negligible extra compute:

- population-ID hash;
- solved-ID hash;
- per-stage `workSpent` in addition to nodes;
- gain/loss/retained solved-set churn against the most recent protocol-compatible tracked run with the same population;
- gain/loss set hashes plus the comparison run ID, while exact IDs remain recoverable by diffing the existing per-level snapshots for those two run IDs;
- a compact normalized protocol object and SHA-256 protocol hash.

For ordinary `solver-stress-refresh.yml` runs, protocol identity is read directly from the workflow-dispatch event inputs via `GITHUB_EVENT_PATH`, with the workflow's current defaults filled in for omitted inputs. A caller may also provide `summary.protocol` explicitly. Protocol comparison therefore covers the actual dispatch knobs, including budgets, strict-work mode, worker/shard/concurrency inputs, lifecycle telemetry, flags and optional reserve/probe overrides, without changing solver execution.

Churn comparison additionally requires matching level-blind/deterministic mode, enabled/disabled flag sets, corpus totals, and population-ID hashes. Experimental or differently budgeted runs therefore do not silently become the comparison baseline for ordinary production health. Legacy timeline records without protocol identity abstain rather than compare.

A scalar change such as `1029 -> 1041` can now be distinguished from `+12/-0`, `+27/-15`, or another composition change. Net score remains the product objective; churn tells research what was exchanged to get there.

The first refresh after this feature may have no compatible prior churn comparison because older timeline rows lack protocol hashes. That is expected and is an abstention, not zero churn. The next protocol-identical refresh can compare normally.

## Temporal solver diversity

Historical solver regimes may be used as **offline anchor policies** when they are behaviorally distinct and have sufficiently interpretable provenance. The goal is not to keep rerunning every commit or ship an ensemble.

Occasionally, after a material production boundary change, ask:

> Is current production absorbing old capability, or is it repeatedly exchanging one basin for another?

Use existing compatible historical rows first. Re-execute an old anchor only when the question is important enough to justify the compute and the old policy can be reproduced under a meaningful comparison contract. A stable old-only basin is a premise generator for current generic policy/representation work.

## Workstream routing

Capability memory feeds existing owners rather than becoming a new workstream.

- **WS2 / fixed-work allocation:** measure complementary capability, residual coverage, overlap, work economics, and oracle union/headroom under compatible evidence.
- **WS1 / action selection:** seek legal generic features that distinguish where materially different actions/policies win. Historical exact IDs may nominate the contrast but cannot be the selector.
- **WS4 / retention and representation:** repeated known-live loss across materially distinct policies is stronger evidence than one policy's isolated failure.
- **WS6 / repair and handoff:** use complementary producer/consumer capability only after exposure/operator evidence establishes a real handoff opportunity.
- **WS0 / restart/randomization:** reopen only when capability-memory evidence supports a recurring restart/commitment-diversity deficit under the existing reopen rules.
- **WS3 / generalization discipline:** capability-memory mining increases selection pressure; any descendant selected from many historical policies/signatures is development evidence and normally needs proportionate independent confirmation.

A large capability-memory union therefore says “there is demonstrable policy diversity worth explaining,” not “append all policies to production.”

## Research loop

For a current residual question:

1. query existing research assets/status before generating data;
2. use the current production residual as the baseline when the question is current capability;
3. add only materially distinct, provenance-bearing candidate evidence;
4. inspect union, overlap, unique capability, cost, and evidence freshness;
5. cluster candidates by mechanism/operational behavior, not experiment name alone;
6. nominate the smallest generic premise explaining complementary capability;
7. test that premise through the existing observer/shadow/family/trace/exact pipeline;
8. require the normal level-blind matched-work and confirmation gates before production promotion;
9. keep failed implementations only if the opt-in retention rule independently justifies them.

## Freshness and residual reconciliation

Capability-memory analysis makes stale residual labels more consequential, so freshness must be explicit.

After a material capability promotion or a provenance reinterpretation that changes class membership:

- refresh/rejoin the production residual before treating old class counts as current;
- update current-state authorities that quote those counts;
- leave dated reports intact as historical evidence;
- treat old gain/loss signatures as nominations until their level structures and protocol meaning are reconciled;
- never convert missing provenance into a negative.

The owning current workstream remains authoritative for current residual counts. Derived views carry baseline ID plus population/solved/unknown-set hashes so accidental joins to a different or censored production boundary are visible.

## Closeout checklist

When a solver experiment materially changes capability, ask at closeout:

1. What is the disposition?
2. What capability signature is worth preserving?
3. Were gains/losses complete and conclusive, or partly censored?
4. Does a promoted change displace any prior capability worth monitoring?
5. Does a rejected change reveal a distinct basin/mechanism worth a future premise?
6. Is the evidence already queryable through existing reports/assets, or does a reusable interface need extending?
7. Did the production residual/current-state documentation become stale?

Most experiments will still close with no further machinery. Capability memory exists to prevent the scientifically interesting exceptions from becoming tombstones.
