# Computational work elimination audit: current reasoning seam map 001

> **Status:** initial architecture/source map; no production behavior change.
> **Date:** 2026-09-21.
> **Parent plan:** [solver computational work elimination audit plan](../docs/solver-computational-work-elimination-audit-plan.md).
> **Purpose:** identify existing exact/safe reasoning producers, consumers, discard boundaries, signatures, and recurrence opportunities before adding instrumentation.

## 1. Executive finding

The repository already contains more reusable-reasoning structure than a "build a cache" framing would suggest.

Three distinct categories exist now:

1. **Already reusable and economically proven**: must-pass / must-cross lower-bound memoization.
2. **Already observable but not reusable by contract**: typed hard-prune counts, connectivity rejection records, BeamResearch/beam-flow, failure-progress, joint-obligation shadows, exact/reference/search-loss evidence.
3. **Already reused but only as experience/guidance**: repair-local nogood memory and coarse beam state machinery. These must not be promoted to exact proof stores.

The most promising successor-audit gap is therefore not "invent memory." It is:

> add enough occurrence identity around selected existing exact/safe producers to determine whether expensive conclusions recur across the lifetime boundaries their current owners discard.

A second gap is economic:

> several exact/safe observers can establish incidence, but do not yet bind a proof occurrence to the downstream work that an earlier/stronger consumer would actually eliminate.

Dynamic BC1 is the clearest example and already has a canonical owner.

## 2. Important prior closure

The September 17 Lane-C solve-local rediscovery result remains binding.

It already established:

- connectivity compact-cause reuse did not clear its then-current population gate;
- mustPass/mustCross lower-bound memoization is a shipped positive control, with exact cache semantics and previously measured 2.3-4.8x wall improvement on the scoped objective-bearing workload;
- cheap mechanic facts are appropriately recomputed;
- the exact/interface batches available then did not repeat identical dependency-key queries.

This audit does not reopen those tests unchanged.

What remains unmeasured is direct current-runtime recurrence across the broader typed reasoning system, particularly cross-attempt/cross-technique recurrence and work dominated after a proof is obtained.

## 3. Existing reasoning seam map

| Fact / producer | Proof / semantic class | Current consumer | Current lifetime | Current identity / telemetry | Discard / reuse boundary | Opportunity-sizing disposition |
|---|---|---|---|---|---|---|
| `mustPassLowerBound` | exact necessary lower bound; exact dependency memo | hard-prune / scoring callers | one `solveLevel` prep shared across attempts/gates | packed exact dependency key; `_mpLowerBoundCache` | retained solve-locally already | **positive control; do not rebuild** |
| `mustCrossLowerBound` | exact necessary lower bound; exact dependency memo | hard-prune / scoring callers | one `solveLevel` prep shared across attempts/gates | packed exact dependency key incl. cross state; `_mcLowerBoundCache` | retained solve-locally already | **positive control; do not rebuild** |
| `mustTurnDeadlocked` | exact impossibility | hard prune | per call | only aggregate `PruneId` today | conclusion discarded | cheap negative-control candidate only |
| `mustCrossForcedNeighborDeadlocked` | exact impossibility | hard prune | per call | aggregate `PruneId` | conclusion discarded | likely cheap; observe only if virtually free |
| must-cross neighbor/resource variants | exact necessary impossibility where enabled | hard prune | per call | aggregate `PruneId`; specialist code | conclusion discarded | candidate only if derivation cost proves material |
| scalar distance / parity / portal parity envelope | exact necessary conditions in supported scope | hard prune | per call | aggregate `PruneId`; some shadow observers | conclusion discarded | likely cheap; useful recurrence controls, not first cache targets |
| connectivity / residual volume `isConnected` | exact/safe rejection under declared over-approximation contract | hard prune | scheduled per DFS/beam/repair state | `ConnectivityRejectionObserver`: subtype, exact-state fingerprint, work point; optional reached/boundary sketch | flood-fill conclusion discarded after prune | **strong recurrence candidate, but key-cost trap applies** |
| connectivity boundary sketch | correlated structural signature, not a proof certificate | research only | record/event | exact reached-set fingerprint + blocker sketch | retained only when observer enabled | discovery only; never a hard cache key without certificate proof |
| `PruneId` diagnostics | canonical reason family identity, not proof identity | research aggregate | attempt aggregate | reached/rejected counts | loses per-occurrence identity/order | **best cheap seam to extend selectively, not sufficient alone** |
| joint-obligation propagation | exact/necessary-condition verdicts in supported cluster semantics | prune + research shadow | per node / cached static cluster geometry | clusterId, kind, verdict, reasonFamily, position, depth, work | verdict record discarded unless observer | **candidate where reason signature can be made sound without copying state** |
| parity phase distance / checkerboard capacity shadows | exact relaxation observations | research only | per observed state | state fingerprint + projected result + work | no production consumer yet | separate WS2/H-lane economics; use if live owner asks |
| dynamic BC1 / cut-balance | exact projection / necessary condition | research-only current program | frontier observations | existing WS2 incidence evidence; consumer not yet shipped | proof currently does not prune production | **highest-priority "incidence known, economics unknown" case** |
| repair-local nogood cache | **experience only**, not proof | incomplete repair diversification/speed | one repair call | `stateSignature` string | not shared across repair calls/attempts | do not reinterpret as exact; recurrence may inform guidance-only economics |
| `stateSignature` | exact-state fingerprint for comparison, explicitly **not** future equivalence | repair experience / research observers | call/record dependent | full string | expensive if used broadly | comparison control only; not an automatic cache key |
| BeamResearch / beam-flow | search-flow identity / guidance evidence | research | attempt | stage counters or rich replay-complete records | rich mode bounded/expensive | useful for multi-query overlap and downstream-work accounting |
| failure-progress | response/progress evidence | research | attempt | family, work point, badness | no exact proof semantics | timing/context only |
| search-loss capsules | selected decision evidence, optionally exact/reference annotated later | research | artifact | event identity, work/depth, reconstruction contract | selective by design | possible bridge from repeated loss to exact reusable fact; not itself proof |

## 4. Architectural observations

### 4.1 The hard-prune pipeline is the natural common spine

`evaluatePrunedMove` is shared by DFS and repair and exposes canonical `PruneId` reason ownership. Beam also participates in the broader prune/failure infrastructure.

This gives the successor audit a cheap common vocabulary without inventing a new taxonomy.

However, aggregate `PruneDiagnostics` only answers "how often did a reason family reject?" It cannot answer "was the same proof derived again?"

The first probe therefore should extend identity only for selected expensive reason families, not turn every prune into a rich event.

### 4.2 Connectivity has unusually rich retained structure and an unusually dangerous false shortcut

`ConnectivityRejectionObserver` already records:

- rejection subtype;
- exact-state fingerprint;
- work point;
- pending-obligation masks/resources;
- optional exact reached-set fingerprint and boundary blockers.

This is enough to measure recurrence more directly than Lane C could from old aggregate records.

But the prior connectivity warning still dominates design: if identifying a reusable certificate requires performing the same flood fill, no computational work is saved.

Therefore connectivity opportunity sizing must distinguish:

1. **descriptive recurrence**: same reached set / blocker sketch after paying the BFS;
2. **certificate recurrence**: a cheaper pre-BFS dependency/certificate can select or validate the result;
3. **earliness value**: the certificate can reject before the scheduled connectivity checkpoint.

Only (2) or (3) can earn a consumer.

### 4.3 The repository already demonstrates the correct architecture for exact solve-local reuse

The lower-bound caches are a strong positive control:

- exact dependency keys;
- one-prep lifetime across attempts/gates;
- no cross-level leakage;
- explicit ablationability;
- measured benefit.

Any new exact reuse proposal should be expected to look comparably disciplined. A generic blackboard is unnecessary until at least one new fact family proves it needs a shared abstraction.

### 4.4 Repair's nogood cache is a semantic landmine for this audit

`stateSignature` equality is explicitly not declared future-state equivalence, and the repair nogood cache stores failed randomized-continuation experience rather than proof of death.

It is valid evidence for repeated search basins and guidance reuse. It is not a certified dead-residual store.

Any candidate matrix must keep this in the **GUIDANCE / EXPERIENCE ONLY** class unless a separate proof upgrades it.

### 4.5 Dynamic BC1 has the cleanest next economics question

The exact-projection program already records:

- Stage-0 soundness/novelty passed;
- dynamic incidence screen positive;
- next action is a production-inert consumer/safety/economics test.

This audit should not duplicate BC1 instrumentation. It should supply the work-elimination accounting question to that existing consumer:

- proof construction cost;
- work point where BC1 becomes known;
- later work that would be skipped by an actual safe reject/bound;
- overlap with later ordinary prune causes;
- valid/reference differential.

## 5. Initial candidate matrix

| Reasoning fact | Proof class | Seam | Cost expectation | Recurrence scope | Current telemetry | Sound signature status | Potential dominated work | Safest experiment | Stop / reopen gate |
|---|---|---|---|---|---|---|---|---|---|
| dynamic BC1 conflict | exact implication / necessary condition | WS2 cut-balance frontier observer | non-trivial but unknown vs saved search | within solve, techniques, query variants | positive incidence already | theorem-owned projection signature should be derived by existing owner | all search below proof if safe consumer rejects | extend existing BC1 consumer economics accounting | close if construction+lookup >= saved work or overlap makes incremental reject negligible |
| connectivity rejection | exact/safe rejection; boundary sketch itself correlated | `isConnected` | high enough to matter; known hot loop | attempt / solve / technique | strong specialist observer | exact state available; cheap certificate **not yet shown** | repeated flood fills and possibly earlier checkpoint rejection | bounded recurrence observer using existing record; separately test cheaper selector feasibility | close reuse if only post-BFS reached fingerprint identifies repeats |
| mustPass/mustCross LB | exact dependency memo | lower-bounds | historically hot | solve across attempts/gates | production cache already | **yes** | already avoided | use as instrumentation positive control only | no new project |
| joint-obligation verdict | exact/necessary condition | hard-prune pipeline | medium/unknown | attempt/solve | observer already carries reasonFamily/work | likely compact cluster + dynamic dependency signature possible; must prove | downstream branch expansion | source audit then bounded signature recurrence | stop if signature becomes near-full state or recurrence low |
| cheap deadlocks/parity/distance | exact implication | hard-prune pipeline | cheap | high event recurrence likely | aggregate PruneId | possible | tiny derivation cost | negative-control counters only | do not cache unless profiling contradicts cheapness |
| repair failed continuation | guidance/experience | repair nogood | potentially material search | within repair / maybe attempts | local cache + state signature | **not proof-safe** | repeated incomplete repair work | measure basin recurrence only if it informs allocation/handoff | never hard-prune without proof upgrade |
| exact local/reference query result | exact, query-specific | research exact/reference tools | expensive | query bundle / related variants | artifacts vary | dependency key often explicit | whole duplicate query | multi-query artifact preflight before runtime observer | close if real bundles show little repeated identity |
| irreversible research decision | execution implication from frozen gate | worker pool / batch orchestration | potentially huge | population acquisition | `stopAfter` + operating rule | gate-state identity, not solver proof | remaining required acquisitions | prospective workflow inventory | no generic engine unless repeated consumers |

## 6. First-probe recommendation

Do **not** start with a universal reason-signature collector.

The smallest probe should be a **selective occurrence layer** over existing observer ownership:

1. keep aggregate `PruneDiagnostics` unchanged for all reasons;
2. enable occurrence identity only for one or two expensive families on a small hard-search cohort;
3. prefer connectivity first because:
   - it is a known hot computation;
   - a specialist observer already emits work points and exact-state/boundary structure;
   - no new reason taxonomy is required;
   - the result can directly test the old Lane-C boundary with better current evidence;
4. run dynamic BC1 economics through its existing WS2 consumer rather than this generic probe;
5. use mustPass/mustCross memo caches as the positive-control shape, not an experiment target.

The connectivity probe must answer two different questions separately:

- **recurrence reservoir:** are structurally identical/soundly equivalent conclusions repeated across exact states/attempts/techniques?
- **removable-work reservoir:** is there a cheaper pre-BFS certificate or earlier consumer that would actually avoid enough work?

A positive answer to the first without the second is an interesting pattern but not an optimization.

## 7. Multi-query preflight recommendation

Existing paired beam-width frontier tooling currently compares exact path-prefix identity at one checkpoint. That is useful but narrower than this audit's question.

Before extending it, use real frozen query bundles and join already-owned identities:

- exact lower-bound dependency keys where available;
- exact local query key/constraint identity;
- selected connectivity rejection signatures;
- canonical prune reason occurrence where proof identity is available;
- beam frontier exact prefix identity as a baseline.

Do not use coarse similarity as shared computation. Any relation below exact implication belongs only to guidance analysis.

## 8. Next actions

1. Design the bounded connectivity recurrence/economics probe without changing search behavior.
2. Locate the existing dynamic-BC1 observer/consumer implementation and specify the exact saved-work accounting fields it should expose under `WS2-CUT-BALANCE-PROJECTION`.
3. Inventory 2-3 real multi-query workloads with durable artifacts and decide whether current retained evidence can answer overlap before any new compute.
4. Update canonical authorities only after those opportunity-sizing results exist.
