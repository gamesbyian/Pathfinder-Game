# Joint-obligation propagation observer pilot 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — production `evaluatePrunedMove`/`solveLevel` real-search run over every static-opportunity-eligible level in the post-1,029 atlas's class 4 (86/200) and class 5 (120/388), plus a full-corpus known-solution soundness replay and the existing 467-level/5,518-branch oracle-labelled atlas.
> **Decision:** the must-cross/portal-terminal joint-obligation cluster is sound (zero false rejects across every check run), captures material dead work the existing gauntlet misses, and shows a real, depth-normalized differential signal enriched in class 5 over the class-4 near-control. All four of the handoff report's observer promotion gates are met. **Promote to the next gate: a frozen equal-work pruning pilot** (see "Next gate" below). Do not yet flip any production pruning behavior — this pilot stayed observer-only throughout.
> **Remaining gate:** implement the actual hard-prune ablation flag (opt-in, default-off) and run a matched-work A/B on the full current-miss opportunity population, following the same discipline as `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`'s own promotion.
> **Evidence role:** discovery (mechanism nomination and soundness) + observational real-search measurement (class-4/class-5 differential). The reject-rate-given-active metric was chosen after inspecting the data, not prespecified in the 2026-09-09 handoff; treat the differential as nomination-strength evidence, not confirmation.
> **Selection:** the obligation-cluster kind (must-cross forced-neighbor × portal terminal) was chosen after reading `mustCrossNeighborBudgetDeadlocked`'s own code comments, which already named the gap ("charging it only one future intersection UNDERSTATES the real obstruction") without closing it — a single candidate, not a swept/tuned selection among several mechanism ideas.

## Mechanism

`lower-bounds.ts`'s `mustCrossForcedNeighborDeadlocked` / `mustCrossNeighborBudgetDeadlocked` already establish that a pending must-cross cell's still-unused axis requires both of that axis's cardinal neighbors to remain enterable. Both existing checks treat "neighbor already visited" as a soft cost (one more unit against the free-intersection budget) or ignore it entirely once the neighbor is itself a hard wall.

`search-state.ts:361`'s `isMoveDynamicallyValid` enforces a third, **unconditional** rule neither existing check models: `level.portalMap.has(target) && state.visited[target] > 0` immediately rejects the move — a portal terminal can never be re-entered once visited, regardless of its `edgeUsage` bits. `mustCrossNeighborBudgetDeadlocked`'s own comment already flags this exact gap without closing it: *"charging it only one future intersection UNDERSTATES the real obstruction"*.

So when a pending must-cross cell's forced neighbor is a **visited portal terminal**, the must-cross obligation and the portal obligation are each correctly reasoned about in isolation, but their **combination** is a provable hard deadlock — exactly the "individually feasible, jointly incompatible" shape the 2026-09-09 handoff hypothesized, and the `joint-feasibility-unrepresented` role in the newly-landed [`future-feasibility capability map`](2026-09-11-future-feasibility-capability-map-001.md).

Implementation: `modules/solver/joint-obligation-propagation.ts` (`findObligationClusters`/`evaluateObligationClusters`), wired as a new research-only `_jointObligationObserver` on `PrepLevel`, read once inside `hard-prune-pipeline.ts`'s `evaluatePrunedMove` and threaded through `orchestration.ts`'s `SolveOpts`, mirroring `ConnectivityRejectionObserver`'s existing discipline exactly (absent in every production call; observing an already-computed verdict changes no pruning/ordering/budget decision — proven by a byte-identical-verdict unit test).

## Soundness

Three independent checks, all clean:

1. **Oracle-labelled branch atlas** (`offline-replay-harness.mjs`, 467 levels / 5,518 CP-SAT-labelled branches): **0 false rejects** on 235 alive branches; **17/442 dead branches caught (3.8%)**, **15 unique beyond the existing production gauntlet**, 2 overlapping.
2. **Full 3-corpus known-solution replay** (`joint-obligation-mc-portal-soundness-check.mjs`, the actual shipped `evaluateObligationClusters`, not a shadow copy): **0 violations** across 566 portal+must-cross levels with a stored solution, 43,085 valid paths (witness + every saved hint), ~4.0M replayed steps, 1.2M active cluster evaluations.
3. **This real-search pilot** (below): **0 false rejects** across 206 levels and ~135M further active evaluations.

Unlike a typical heuristic prune candidate, every reject here is a **proven** categorical consequence of `search-state.ts`'s own unconditional portal-revisit rule, not a sampled/probabilistic estimate — a stronger soundness class than the "sampled rejections independently confirmed dead" bar the handoff report asked for.

## Real-search pilot: class-4 near-control vs class-5 frontier

### Opportunity sizing (static, no solving — `analyze-joint-obligation-opportunity.mjs`)

| Class | n | opportunity levels (>=1 static cluster) | rate | total clusters |
|---|---:|---:|---:|---:|
| 4 (near-control) | 200 | 86 | 43.0% | 160 |
| 5 (frontier) | 388 | 120 | 30.9% | 232 |

Consistent with the frontier-contrast report: class 4 has the **higher** static opportunity rate, so raw cluster presence cannot be the frontier-specific story (per PR #1716/#1717's explicit caution).

### Real-search firing (`collect-joint-obligation-observations.mjs`; production `solveLevel()`, observer attached, no pruning; fixed `timeBudgetMs=3000`/`nodeBudget=80000` per attempt, identical across both arms)

| Class | opportunity levels | fired (>=1 reject) | pooled reject/(reject+pass) | per-level mean | per-level median | per-level IQR | false rejects |
|---|---:|---:|---:|---:|---:|---:|---:|
| 4 | 86 | 86/86 (100%) | 12.98% | 11.9% | 8.8% | [5.4%, 14.7%] | 0 |
| 5 | 120 | 120/120 (100%) | 20.31% | 16.1% | 14.4% | [8.6%, 20.1%] | 0 |

"Fired at least once" saturates at 100% in both arms at this node budget and is uninformative on its own (as anticipated). The **realized reject rate conditional on the obligation being active** is the material signal: class 5's median is **1.6x** class 4's, and the whole distribution is shifted (IQR barely overlaps at the edges), not driven by one or two outlier levels.

**Confound check.** A long-running attempt naturally accumulates more visited cells, which mechanically raises the chance the forced neighbor is already visited — a depth/attempt-length confound unrelated to any class-5-specific mechanism. Two checks argue this does not explain the between-class gap:

- `nodesExpanded` **medians are nearly identical** between arms (360,147 vs 360,146) despite the mean being pulled up by right-skew in class 5 (431K vs 1.01M) — the typical level in both arms explored a similar amount of search.
- `corr(reject-rate, nodesExpanded)` is small and **equal** in both arms (0.164 vs 0.163), and `corr(reject-rate, static cluster count)` is negligible in both (-0.04 / -0.02). The confound exists but affects both arms symmetrically, so it does not account for the between-class difference.

Both arms solved 0/N levels in this run (uniform, deliberately small fixed budget for a fair firing-rate comparison — this is not a solve-rate claim). Abstain rate was 0% in both arms: the "neighbor is itself a pending must-cross cell" compound case never arose in this population.

## Promotion-gate check (2026-09-09 handoff's own criteria)

| Gate | Result |
|---|---|
| Rejects zero live prefixes | Met — 0 across all three independent checks above. |
| Sampled rejections independently confirmed dead | Exceeded — every reject is a *proven* deadlock (categorical portal-revisit rule), not a sampled estimate; the oracle atlas additionally confirms 17/17 rejects there were on CP-SAT-labelled-dead branches. |
| Material dead-work capture before existing prunes, held-out levels | Met — 15 unique oracle-atlas catches beyond the existing gauntlet; real-search firing on 206 held-out class-4/class-5 levels never previously exercised by this mechanism. |
| Own cost small relative to avoided `workSpent` | Met — a handful of typed-array reads/branches per active node; the observer field is `undefined` in every production call (zero cost when absent). |

All four gates clear. Per PR #1716/#1717's added near-control requirement, the differential (1.6x median reject rate, depth-confound-controlled) is genuine nomination evidence for `joint-feasibility-unrepresented` rather than a pure mechanic-concentration artifact — though it is observational/discovery-role evidence, not a confirmatory claim, and this run did not stratify by operational family (DFS vs beam vs repair) to test the capability map's cross-action-recurrence criterion directly.

## What this does not establish

- Not a solve-count or work-benefit claim — this stayed observer-only throughout; no production pruning behavior changed.
- Not confirmation that `joint-feasibility-unrepresented` is a dominant or frontier-wide mechanism — this is one obligation-cluster kind (must-cross × portal), evaluated on one population slice.
- Does not test cross-action recurrence (capability map criterion 1) directly; the real-search run dispatched the full production attempt ladder without separating technique families.
- Does not itself size or run the pruning A/B — that is the next gate.

## Next gate

Implement the actual hard-prune behind a new opt-in ablation flag (mirroring `PRUNE_MC_NEIGHBOR_BUDGET_PORTAL`'s own promotion path: default-off, frozen matched-work A/B on the full current-miss opportunity population — not just classes 4/5 — zero referee/correctness regressions, then promote on a clean positive or close on null/negative).

## Artifacts

- `modules/solver/joint-obligation-propagation.ts`, `.test.ts` — production mechanism + unit tests.
- `scripts/stress/lib/joint-obligation-mc-portal.mjs`, `scripts/stress/probes/joint-obligation-mc-portal-probe.mjs` — offline-harness shadow twin, registered in the existing oracle-atlas probe harness.
- `scripts/stress/joint-obligation-mc-portal-soundness-check.mjs` — full-corpus known-solution soundness gate.
- `scripts/stress/analyze-joint-obligation-opportunity.mjs` — static opportunity sizing.
- `scripts/stress/collect-joint-obligation-observations.mjs` — real-search collector.
- [`reports/stress/interface-probe-harness-results.json`](stress/interface-probe-harness-results.json) — refreshed oracle-atlas results including this probe.
- [`reports/stress/joint-obligation-observer-pilot-001.json`](stress/joint-obligation-observer-pilot-001.json) — full per-level real-search pilot output (206 rows).
