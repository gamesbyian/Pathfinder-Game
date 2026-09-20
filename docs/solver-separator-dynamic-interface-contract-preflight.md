# Solver separator dynamic-interface contract preflight

> **Status:** bounded experiment contract.
> **Authority:** current Lane-A descendant earned by `reports/2026-09-17-a-d3-f3-dynamic-interface-reconciliation-result-001.md`.
> **Runtime effect:** none. This is an offline/exact representation falsifier.
> **Progress:** C0 concluded mixed on 2026-09-19. C1 boundary kinematics concluded **mixed + repetition-supported** on 2026-09-20: 195/546 decisive rows remain in repeated signatures across 58 parents, with one same-parent 2-row LIVE/DEAD collision. The live gate is now a separately precommitted C2 global-accounting signature on the same frozen 581-case population (`reports/2026-09-20-lane-a-c1-boundary-kinematics-result-001.md`).

## Question

On the balanced width<=4 Lane-A separator population, can a compact current-state signature preserve exact completion outcome without recreating effectively the full prefix?

The experiment tests nested contracts. It does not search for the best arbitrary feature set.

## Frozen population

- Start from balanced Lane-A interfaces only.
- Freeze legal prefixes from real production search before exact labels or signature purity are inspected.
- Multiple prefixes per parent/interface are allowed for collision discovery.
- Parent level is the primary independent unit unless a stronger ancestry record proves otherwise.
- Preserve frontier ancestry and solver revision from the production-frontier sampler.
- Record interface identity and geometry before exact labelling.

## Nested contracts

Test in order and keep every earlier result as a negative control.

- **C0 static:** interface/cut identity + side/region.
- **C1 boundary kinematics:** C0 + crossing cell(s) + incoming/outgoing direction/heading continuity + crossing-relevant portal-jump state.
- **C2 global accounting:** C1 + exact length used/remaining + intersections used/remaining + outstanding required obligations in a bounded region-aware form.
- **C3 mutable mechanics:** C2 + canonical current runtime state for history-sensitive filters/flippers/portals that can affect continuation. Local segment-contact flags are not substitutes.
- **C4 bounded path history/topology:** C3 + bounded cut-neighborhood occupancy/accessibility and a sound separator-side/topology token where needed. If the only available cheap F3 descriptor is in its tied/unsound regime, abstain rather than treating it as exact state.

Do not add fields after observing which rows would become pure without recording a new version and restarting selection/confirmation accounting.

## Labels

Primary label: exact whole-prefix completion LIVE/DEAD.

Secondary label, when soundly constructible: exact feasibility of the smaller-side residual obligation set under the same frozen interface state.

Keep the two labels separate. Local infeasibility may be useful even if it is not equivalent to whole-prefix DEAD.

## Analysis

For each C0…C4, use the shared signature-collision analysis primitive and report:

- rows and distinct signatures;
- multi-member groups and rows participating in them;
- mixed exact-outcome groups;
- same-parent vs cross-parent mixed groups;
- independent parent count;
- largest group size;
- signature-size proxy;
- abstentions/unrepresentable rows;
- any correctness/referee alarms.

Near-unique signatures are not success. Compression is part of the claim.

## Stop rules

**Stop negative / contract-explosive** if C4 still mixes exact outcomes on soundly represented rows, or if purity requires near-unique/full-prefix identity, unbounded occupancy, or effectively the full topology observer.

**Stop mixed** if one coherent mechanic/interface subpopulation remains compact and outcome-pure while another becomes explosive. Preserve the narrower subpopulation and do not generalize.

**Advance bounded positive** only if one prespecified Ck:

1. has repeated signatures on a non-trivial number of rows;
2. has no mixed exact outcomes in the sound tested subset;
3. reproduces across multiple independent parent levels;
4. remains materially smaller than full-prefix identity/replay;
5. is computable from cold current-input state.

A bounded positive earns only the smallest consumer, preferably a local interface-feasibility query/prune. It does not authorize region DP, AND/OR search, decomposition routing, or a generic topology subsystem.

## Evidence boundaries

- D3 supports the need to test direction/accounting/history, not a universal flipper explanation.
- F3 supports a topology/history requirement and an abstention boundary, not the soundness of the cheap tied-case descriptor.
- Lane A supplies structural prevalence, not dynamic equivalence.
- Exact labels are offline evidence and may not become historical cold-routing inputs.
