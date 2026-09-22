# WS1 remaining-length intra-solve bridge preflight 001

> **Status:** active
> **Last evidence:** 2026-09-22 — preflight and inert implementation recovered onto current mainline; no experiment dispatched.
> **Decision:** do not jump directly from the confirmed cross-row remaining-length effect to a production selector. First test the missing transport step inside one solve: reorder the existing elite-prefix completion candidate pool by ascending remaining length under identical candidates, per-candidate caps and total node budget.
> **Remaining gate:** run the frozen 20-level Stage A matched-work bridge with candidate-attribution telemetry; a negative closes this tested intra-solve form without retuning.
> **Date:** 2026-09-22
> **Research question:** `WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE`
> **Triggered by:** `WS1-REMAINING-LENGTH-ALLOCATION`
> **Evidence role:** development discriminator
> **Compute status:** not dispatched.

## Why a bridge is required

The H3/Card-E results are strong:

- original population: ascending remaining length captures 16/17 achievable rescues at 20% shared budget;
- independent transfer: 10/12 at the same 20% checkpoint;
- descending remaining length solves 0 below the full shared budget in the transfer.

But those simulations allocate one shared budget **across rows/levels**.

Production Pathfinder solves one level at a time. The exact H3 completion operator, `searchCompletionFromPartialPath`, is invoked from repair on the **single current dead-end state**. There is no same-call candidate pool to reorder at that seam.

Therefore:

> cross-level allocation value is not yet evidence that remaining length has intra-solve allocation value.

A per-level production consumer needs multiple current-input completion candidates competing for one shared tranche.

## Existing intra-solve seam

The repair subsystem already contains exactly such a research seam:

`elitePrefixDfsRepair`

It applies bounded deterministic completion DFS to several prefixes from the current elite pool.

Current candidate grid:

- top **3 elites**;
- prefix fractions **[0.5, 0.65, 0.8, 0.9]**;
- **12 candidate points** maximum;
- **15,000 nodes per candidate**;
- **90,000 total nodes** per stagnation-triggered call.

Candidate generation is current-input only.

### Current ordering

The implementation loops:

1. elite 0, then elite 1, then elite 2;
2. within each elite: 0.5 → 0.65 → 0.8 → 0.9.

For a fixed elite, later fractions leave shorter residuals. The current loop therefore spends on longer residuals before shorter ones.

At the nominal caps, six full 15k attempts exhaust the 90k total budget, so a trigger may never reach roughly half of the 12 candidate grid.

This makes candidate order decision-bearing by construction.

## Important negative control

The existing elite-prefix mechanism is **not** a hidden positive capability.

`reports/2026-08-07-repair-elite-prefix-dfs.md` found:

- 20-level closest-miss A/B;
- mechanism ON: 4/20 solved;
- OFF: 5/20;
- one confirmed displacement;
- higher total work ON.

A later dead-last additive retry gave the mechanism an uncontested budget and recovered **0/15** failed rows at both 7.5M and 15M retry budgets.

So this preflight does **not** reopen elite-prefix DFS for promotion.

It asks a narrower question created by later evidence:

> does the independently-confirmed remaining-length allocation premise provide the materially different **candidate targeting/order** that the old report explicitly lacked?

A negative bridge leaves the old operator closed.

## Treatment

Keep the operator, candidates and budgets fixed.

### Control

Exact legacy order:

`elite -> [0.5, 0.65, 0.8, 0.9]`

### Treatment

Build the exact same candidate multiset, then globally order candidates by:

1. ascending current-input remaining length;
2. legacy ordinal as deterministic tie-break.

For a candidate prefix ending after `destroyIdx` path steps:

`remainingLength = requiredLength - destroyIdx`

This is the same structural quantity class as H3's remaining-length-at-cull feature: current puzzle requirement minus current prefix depth. It uses no level identity, history, outcome or exact label.

No candidate is added or removed.

## Work contract

Both arms must preserve:

- same elite pool;
- same 3-elite cap;
- same four fractions;
- same candidate multiset;
- same 15,000-node per-candidate ceiling;
- same 90,000-node total ceiling per `elitePrefixDfsRepair` call;
- same outer `repairSearchFromGate` node cap;
- same random seed/config;
- same search primitive and scoring;
- same stagnation trigger.

Only candidate ordering changes.

Any instrumentation overhead must remain outside canonical search work or be measured separately.

## Stage A population

Use the exact **20-level closest-miss population** from the original elite-prefix report:

`R00440, R01397, R01698, R01860, R02003, R02022, R02088, R02123, R02220, R02239, R00342, R00786, R00877, R00886, R00893, R01341, R02106, R02118, R02137, R02275`

Why reuse it:

- it is the population on which the mechanism's negative is already calibrated;
- the legacy arm has a known 4/20 reference at 15M nodes;
- one displacement sentinel, R02239, is already known;
- this stage is a **mechanism bridge**, not confirmation/generalization.

Use the historical **15,000,000-node** repair-attempt cap and non-binding wall deadline.

Do not select a friendlier subset after inspecting treatment outcomes.

## Required telemetry

Per level and arm retain:

- solved/referee-valid;
- total repair nodes/work;
- number of elite-prefix triggers;
- candidate attempts per trigger;
- candidate remaining lengths in attempted order;
- nodes spent per candidate;
- first successful candidate identity/remaining length when applicable;
- best intermediate badness attributable to the operator;
- outer repair bestBadness/final outcome;
- whether R02239 or any other control solve is displaced.

The candidate-plan trace is research telemetry, not a runtime feature.

## Stage A decision rule

### Bridge-positive

Earn a broader matched-work replication only if:

1. treatment has **>=1 treatment-only referee-valid solve**;
2. treatment has **0 control-only losses**;
3. total canonical repair work is <= control +2%;
4. at least one treatment-only solve is attributable to a candidate that legacy ordering would not have reached before exhausting that trigger's shared candidate budget.

The fourth condition is mechanistic: a gain must actually demonstrate ordering value, not incidental trajectory drift elsewhere in randomized repair.

### Directional only

If solved sets are identical but treatment:

- reaches the same successful completion candidate earlier, or
- produces materially lower candidate-pool work with no outer-search regression,

retain as directional economics evidence only. It does not earn production integration.

### Bridge-negative

If treatment produces:

- zero treatment-only gains and no material work improvement, or
- any control-only solve loss without a treatment gain sufficient to motivate a separate forensic,

close this intra-solve bridge on the frozen population.

Do not rescue it by changing prefix fractions, elite count, per-candidate cap or total cap.

### Blocked

Missing attribution telemetry, protocol mismatch or failure to reproduce the legacy control prevents a verdict.

## What a positive Stage A would earn

Not production deployment.

It would earn one independent/current replication of the **same fixed order change** on a broader repair-exercising population under matched work.

Only after that replication could WS1 consider a production-facing treatment.

## Why this is cheaper than a direct production A/B

A direct production consumer would otherwise conflate:

- whether cross-row length value transfers within a solve;
- whether the chosen candidate pool is appropriate;
- whether candidate ordering helps;
- whether the completion operator is powerful enough;
- downstream allocation/displacement economics.

The frozen 20-row bridge isolates the first actionable transport assumption against an already-calibrated negative-control mechanism.

## What this does not authorize

- no production default change;
- no global remaining-length scheduler;
- no cross-level runtime scheduling;
- no new candidate generation;
- no larger elite pool;
- no larger completion budget;
- no reopening of the legacy elite-prefix mechanism if this fixed-order bridge is negative;
- no claim that H3's cross-row transfer itself was wrong.

## Implementation seam

Use a research-only/default-inert ordering switch in `repairSearchFromGate` / `elitePrefixDfsRepair`.

The production call shape must remain byte-identical when the switch is false.

Prefer a direct research harness over a new general-purpose production flag. If the bridge later replicates and earns a production consumer, production configuration can be designed then.

## Next step

Implement:

1. a pure deterministic candidate-plan builder for legacy vs ascending-remaining-length order;
2. a trailing research-only `enableElitePrefixLengthOrder=false` parameter so all existing callers remain unchanged;
3. a focused 20-level A/B harness with attribution telemetry;
4. tests that both orderings contain the exact same candidate multiset and that false/default preserves legacy order.

Then dispatch only the frozen Stage A population.
