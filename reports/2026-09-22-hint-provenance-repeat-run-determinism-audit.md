# Hint provenance repeat-run determinism audit — 2026-09-22

> **Status:** concluded-negative
> **Last evidence:** 2026-09-22 — full committed hint-corpus audit run 35782743823 plus source-run arm reconciliation
> **Decision:** No same-effective-input/different-solution case is demonstrated in the reconstructable repeat population; the observed collisions are provenance-envelope collisions across differing experiment arms.
> **Remaining gate:** Future determinism claims require persisted effective execution identity and occurrence/source-run lineage so equality can be established without expiring artifact archaeology.

## Result

The first-pass provenance-only audit found 15 groups in which the same **recorded attempt-level identity** mapped to two accepted paths across distinct timestamps. That initially looked like repeat-run solver divergence: 14 groups were beam, one was repair, and paired rows also differed in nodesExpanded/workSpent.

Reconciliation against the source evidence-harvest commits resolves all 15. Every apparent collision crosses a different experiment arm whose run-level ablation configuration is not stored in the hint provenance event. No collision remains where the full recoverable run configuration is known to be the same.

Therefore this audit finds **zero demonstrated cases of identical effective solver inputs producing different solutions** in the high-confidence repeat-run set it can reconstruct. It does find a concrete observability limitation: hint provenance is insufficient on its own to establish full input identity for experimental runs because the complete effective ablation/run envelope is not persisted with each discovery event.

## Corpus scan

Run 35782743823 scanned all committed JSON hint artifacts under data/hints, data/stress/hints, and data/stress/hints-random.

| measure | count |
|---|---:|
| files | 1,962 |
| hints | 267,046 |
| provenance events | 775,469 |
| attempt-level events meeting the deterministic-comparison screen | 56,492 |
| repeat-run recorded-input groups | 93 |
| same-path repeat groups | 78 |
| initially divergent-path groups | 15 |

The 44,337 cases where one coarse provenanceEventIdentity() appears on multiple paths are **not** a determinism count. That identity is a persistence/deduplication identity and is deliberately shared by producers that can emit multiple valid paths; variant-family replay is a dominant example.

## The 15 apparent collisions

Four timestamp families explain every group:

| stored foundAt family | harvested source | effective arm |
|---|---|---|
| ~06:37 UTC | targeted sweep 34315398129 | connectivity-volume portal population, enable=none |
| ~07:29 UTC | targeted sweep 34315357361 | MC-neighbor-budget portal, enable=PRUNE_MC_NEIGHBOR_BUDGET_PORTAL |
| ~08:17 UTC | targeted sweep 34320087947 | MC-neighbor-budget portal, enable=none |
| ~08:22 UTC | targeted sweep 34320103478 | MC-neighbor-budget portal, enable=PRUNE_MC_NEIGHBOR_BUDGET_PORTAL |
| ~10:27 UTC | gap-fill 34337871124 | enable=PRUNE_MC_NEIGHBOR_BUDGET_PORTAL |
| ~10:44 UTC | gap-fill 34337880617 | enable=none |

The affected levels were R01523, R01554, R01930, R02076, R02269, R02314, R02349, R02510, R02515, R02557, R02699, R02715, R03001, R03267, and R03304.

For each level, the two differing-path observations fall on opposite sides of one of the arm boundaries above. The attempt-level provenance records solver commit, technique/config, work budget, seed and level revision, but not the full run-level ablation/effective configuration. Consequently a control and treatment attempt can collapse to the same audit identity even though the actual solver inputs differ.

This is especially clear for R03001: both records are the same seeded repair attempt (randomSeed=1194917888), yet they come from different MC-neighbor-budget arms. The different paths/work trajectories are therefore expected evidence that the enabled prune changes reachable search, not evidence that a fixed seeded repair search is nondeterministic.

## Historical context

This does not erase the older, real determinism problem recorded on 2026-07-30. Commit 2f3b3a0 measured widespread repeat-run node-count variance and traced it to wall-clock remainder allocation reshaping the ladder. The subsequent work-budget migration and observable deadline-truncation work were specifically intended to remove that source of research nondeterminism.

Separately, the 2026-08-27 production-runner diagnostic compared --workers=1 and --workers=4 and found byte-identical deterministic fields across 258 attempts. The present audit is consistent with that later evidence: after reconciling experimental-arm configuration, the stored corpus supplies no demonstrated counterexample.

## What the audit can and cannot claim

The result is stronger than “no suspicious hints noticed,” but weaker than a mathematical proof that current solver execution can never diverge.

It establishes: (1) stored provenance contains no **reconciled** repeat-run counterexample among the 93 repeat groups discovered by this screen; (2) all 15 apparent path divergences have a concrete differing-input explanation; and (3) hint provenance alone currently cannot prove full run-input equality for experimental evidence because global effective configuration is missing.

It does not establish byte-identical replayability for every historical hint. Much historical provenance lacks solver version, deterministic work budget, level revision, seed, or other required context, and the repository's replayability classifier already labels those cases accordingly.

## Follow-up

Keep the reusable audit, but describe its divergent-path result as **recorded-input collisions requiring run-envelope reconciliation**, not as solver nondeterminism.

For future evidence, the cleanest fix is to persist a stable effective-configuration identity (ideally the same effective-config digest already emitted by level-blind sweep results) in hint discovery provenance or an unambiguous source-run identity that lets the digest be joined back mechanically. Until then, any cross-run determinism audit using hints must treat run-level feature configuration as a missing dimension.

The temporary PR-only workflow used for this one-time full-corpus execution should be deleted after this result is recorded.
