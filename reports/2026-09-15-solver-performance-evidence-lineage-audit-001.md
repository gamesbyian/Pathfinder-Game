# Solver performance evidence-lineage audit (2026-09-15)

> **Scope:** hostile lineage audit of negative, positive, deferred, and landed solver-performance knowledge.
> **Authority consequence:** `docs/solver-architectural-speed-opportunities.md` owns corrected speed methodology/dispositions; `docs/solver-optimization-workstreams.md` remains the single live queue.
> **Execution consequence:** no new implementation-speed experiment is earned now; active WS2 acquisition work remains first priority.

## Verdict

The repo's performance knowledge is **methodologically strong at the experiment layer and materially weaker at the summary/disposition layer**.

The strongest historical pure-speed campaigns used the right core protocol: deterministic work/node limits, non-binding wall deadlines, search/solve parity, interleaved timing, representative short/hard workloads, and end-to-end measurement. Several landed improvements therefore have trustworthy historical support.

The recurrent failure is later compression. A measured premise or hotspot was sometimes promoted into an exact treatment verdict; a profile-led decision not to implement was called a negative; a behavior-changing search-order win was allowed to sit inside a “pure speed” headline; and a non-reproduced short-level dense-index improvement survived as a positive shorthand. Those are evidence-lineage errors, not evidence that the solver code or research program is generally unreliable.

## Audit method

For each material claim, this audit reconstructed as much as retained evidence permits:

`premise -> implementation/treatment -> eligible population -> execution conditions -> instrumentation -> observed result -> interpretation -> later citation/reuse -> current disposition`

The audit treated source reports and current code shape as higher authority than later summaries. It also distinguished:

- treatment falsification from premise/opportunity sizing;
- non-implementation from a losing implementation;
- node/work reduction from CPU/wall reduction;
- pure implementation speed from changed search order/extent;
- historical support from current marginal value.

## Important claim ledger

| Claim / family | Evidence lineage | Correct status | Audit consequence |
|---|---|---|---|
| July connectivity + urgency-context pooling + flood-fill closure hoist | Implemented; fixed-node/non-binding-wall interleaved A/B; published and hard C2; identical node work/no divergence; combined first-three-change result -27.1% published, -13.2% C2 sample | **SUPPORTED_EXACT_FORM historically / STALE_REPROFILE for current magnitude** | Preserve as real positive knowledge; do not reuse old percentages as current-head hotspot shares. |
| Beam parent-tree frontier walk | Implemented; replay fell sharply; guarded cull ordering; C1 lost `R00526`; follow-up proved mid-phase budget/terminal checks still execute in tree order | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Treat as current search policy with an accepted historical capability trade, not a semantics-preserving kernel speedup. |
| Lazy beam dedup/diversity key construction | Implemented; identical nodes/search; 3-round interleaved published and C2 A/B; material wall win | **SUPPORTED_EXACT_FORM historically** | Strong landed positive. Current marginal size needs fresh profiling if it matters. |
| Loop-invariant portal lookup hoist | Implemented; identical nodes; small consistent published improvement | **SUPPORTED_EXACT_FORM historically** | Preserve, but too small/old to nominate current work. |
| Mixed-radix numeric beam keys vs string keys | Implemented; differential correctness plus identical search; 8/8 timing rounds across published/C2 positive | **SUPPORTED_EXACT_FORM historically / STALE_REPROFILE for current magnitude** | Strong positive mechanism. Later radix-boundary correction means current code is not exactly the originally measured implementation. |
| Dense `staticNeighborKeys` | Implemented; identical work; published short/batch benefit, C2 individual effect near noise; cumulative August stack strongly positive | **SUPPORTED_EXACT_FORM within measured role** | Preserve as short/batch overhead win, not proof that all dense storage is faster. |
| Remove `cellDenseIndex` indirection | Implemented; first run -1.66% published, replication +1.49%; hard sample flat both times; report explicitly says no reliable wall win | **EVIDENCE_INCOMPLETE / no supported speed-positive** | Keep landed architecture simplification; remove positive speed shorthand. |
| Static plain/default scorer branch deletion | Implemented; current-head profile nominated it; three interleaved reps; exact trace parity; +0.91% published / -0.05% hard | **FALSIFIED_EXACT_FORM** | Exact treatment closed. Scoring as a family remains profile-gated. |
| Mechanic-free fused per-candidate apply/evaluate/undo | Implemented; exact decision parity; eligible populations measured; +3.13% published eligible / flat-noisy hard eligible | **FALSIFIED_EXACT_FORM** | Strong exact-form negative; does not close batching or neighbor generation. |
| Fixed `getNeighbors` slots | Cost share measured; **no implementation**; later “strict superset” rationale false because fused pilot left neighbor generation untouched | **DEFERRED_LOW_VALUE** | PR #1808 correction preserved. Reopen only from current cost plus cheap concrete treatment. |
| Batched candidate/object layout | Allocation share measured; **no implementation**; fused per-candidate treatment did not test batching | **DEFERRED_LOW_VALUE** | PR #1808 correction preserved. |
| Six mechanic arrays converted to dense storage with repeated `denseIndex()` | Implemented; parity held; short sample faster but hard C2 ~2.82% slower | **FALSIFIED_EXACT_FORM** | Exact layout closed. Hoisted/shared row treatment remains distinct. |
| Reusable `UndoToken` | Implemented; parity/tests; ~4.6% slower | **FALSIFIED_EXACT_FORM**, runtime-sensitive | Strong exact-form JS/V8 negative; only becomes stale after material environment/shape change plus renewed hotspot. |
| Beam quickselect | Sort profile showed small share; **not implemented** | **DEFERRED_LOW_VALUE** | Do not call falsified. |
| Custom numeric hash arena | Synthetic comparison plus numeric-Map design work showed native numeric `Map` matched/beat tested arena; production path stayed `Map` | **FALSIFIED_EXACT_FORM for tested arena/runtime** | Runtime-sensitive exact form only. |
| Beam checkpoint/snapshot materialization | Replay share measured; no snapshot/checkpoint implementation | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | “Not largest bucket” cannot close it; require current replay share and concrete net-savings design. |
| Exact beam transposition/dedup as speed reservoir | Observer constructed sound signatures; exact duplicate slots ~0.019%; no production exact-dedup treatment A/B | **DEFERRED_LOW_VALUE based on strong opportunity sizing**, not treatment falsification | Corrects #1808's remaining overclassification. A zero-cost ceiling can make engineering irrational without creating a `FALSIFIED_EXACT_FORM` result. |
| Disable coarse beam merge | Actual on/off treatment; initial wall-capped null invalid; corrected non-binding run produced 19/75 divergences, strongly favoring merge | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Merge is width/diversity policy, not exact duplicate elimination. Do not remove for local CPU savings without policy evaluation. |
| DFS transposition | Sound-signature observer found mostly ~1-2% revisit, one 16% outlier; exact signature itself expensive; no cheap production table tested | **DEFERRED_LOW_VALUE / STALE_REPROFILE** | Current family not falsified. A cheap incremental fingerprint is a distinct treatment and needs renewed premise evidence. |
| Broad native/WASM candidate kernel | Static boundary audit only; too much mutable state would cross boundary or force search-core migration | **ARCHITECTURALLY_DEFERRED** | Valid engineering deferment, not runtime negative. |
| Unconditional stronger surround/adjacent-turn MST tightening | Implemented; early unsolved-only selection could not reveal losses; broader solved-population test showed fewer nodes but sharply higher wall cost and net capability loss | **FALSIFIED_EXACT_FORM** | One of the strongest final negatives. Preserve premise/treatment distinction. |
| Connectivity-throttle narrowing | Implemented behavior change; lost solves and reverted | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Reject tested schedule, not all adaptive connectivity economics. |
| Old routing forms | Implemented policy treatments rejected on solve/capability evidence | **BEHAVIOR_CHANGE_NOT_PURE_SPEED** | Does not falsify routing as a future retained-solve work-reduction mechanism. |
| Same-policy beam continuation residual tranche | Continuation primitive proven; 120-row fixed-work A/B had 64 continuation dispatches and 0 gains/losses | **FALSIFIED_EXACT_FORM / CLOSED NULL for that scheduler use** | Resumability mechanism remains valid; same-policy residual salvage does not. Distinct policy-switch/state-selection questions remain conditional. |
| Historical forced-chain traversal | Specialized SolverV2 implementation reported strong corridor compression but also changed connectivity-check frequency; no clean modern A/B | **EVIDENCE_INCOMPLETE for modern solver** | Preserve observer-first forced-chain census under WS7; do not count historical claim as current speed proof. |

## Positive-evidence audit

### July 30 pure-speed stack

The report title/headline compresses four landed changes into “-31.3% wall time,” but the fourth change is not pure speed. The load-bearing positive is the separately reported **changes 1-3 only** A/B:

- published: 13,103 ms -> 9,550 ms, **-27.1%**, 7,224,167 -> 7,224,167 nodes, zero divergence;
- 40-level C2 sample: 71,813 ms -> 62,369 ms, **-13.2%**, 11,535,681 -> 11,535,681 nodes, zero divergence.

That is decision-grade historical evidence. The campaign also demonstrated why parity gates matter: the first bit-parallel flood-fill implementation had a stale-row bug that a 6.6M-call differential probe missed, while fixed-node search parity caught a 39-node divergence. One intermediate diagnosis run was invalid because differential instrumentation remained in the treatment. The report records and corrects both failures rather than hiding them.

The beam tree-order walk must be split out. Its local replay mechanism is real, but the treatment changes which states are visited before mid-phase budget exits. `R00526` moved from a 192,750-node solve to failure even past 40M nodes. This is algorithmic/search-policy evidence, not an implementation-parity positive.

### August 23 beam/representation stack

The lazy-key and numeric-key experiments are unusually clean historical positives: both require exact deterministic work parity before interpreting timing. Numeric keys also had an explicit differential equivalence test and safe fallback. The later 31/32-flipper radix repair means the implementation evolved, so the original speed magnitude should not be quoted as current without reprofiling.

`staticNeighborKeys` dense storage is also supported, but its individual value was concentrated in shorter/batch workloads. The hard sample was close to noise. The cumulative August stack was strongly positive, which is useful historical evidence that V8/source-level implementation work was not exhausted.

### Dense follow-up overclaim

The current speed authority inherited a misleading shorthand for the later `cellDenseIndex` removal. The first run showed a short-level improvement; the replication showed a short-level regression of similar size. The source report explicitly retracts the speed claim and lands the change for architectural simplicity/no hard-tail cost. The audit therefore removes the claim that this treatment was positively established for published short solves.

## Negative-evidence audit

### Exact treatment negatives that deserve to stay closed

The scorer branch-deletion specialization, mechanic-free fused candidate kernel, naive repeated-index six-array densification, `UndoToken` pooling, tested custom numeric arena, and unconditional MST tightening all have enough treatment-level evidence to constrain unchanged retests. Their broader premises remain narrower than their treatment verdicts.

### Observer/opportunity sizing is not treatment falsification

The beam exact-duplicate result is the cleanest remaining taxonomy error after PR #1808. The audit instrumented candidate pools with an exact future-state signature and measured a tiny exact-duplicate ceiling. That is excellent evidence that building an expensive exact table is poor value. It is not an implemented exact-dedup A/B, so the repo is not entitled to call it `FALSIFIED_EXACT_FORM` under the strict vocabulary now adopted.

The same conceptual distinction applies to quickselect, fixed neighbor slots, batching, and DFS transposition. Strong opportunity sizing can rationally terminate work without pretending an implementation lost.

### Binding wall caps can manufacture nulls

The beam coarse-merge audit initially found no divergence with a 2.5s wall cap plus 300k nodes. Raising the wall allowance to 120s while retaining the deterministic cap exposed 19/75 divergences. This is direct evidence that a wall deadline shared by both arms can erase the very treatment difference being studied.

Future pure-speed work therefore requires deterministic work/node envelopes with wall deadlines demonstrably non-binding. `deadlineTruncated` is indeterminate, not an ordinary failure.

### Selected populations can manufacture wins

The MST tightening history initially looked attractive on an unsolved-only population, a design that structurally could not show solved->unsolved regressions. Broader measurement then found the treatment reduced node count while increasing wall cost and losing more solved cases than it gained. This remains the clearest warning against equating “fewer nodes” with “faster/better.”

### Nested timers are reconnaissance, not a clean cost model

The candidate-generation breakdown changed as nested `hrtime` probes were added. It is adequate to rank broad buckets but cannot be treated as a precise ceiling for small sub-buckets without measuring observer overhead. Sampling profiles should be the default discovery instrument for a future implementation campaign.

## Current code-shape check

The current solver still reflects major historical decisions relevant to interpretation:

- beam frontier walking is parent-tree ordered while `insOrd` only restores post-phase generation/cull order, so the historical behavior-change diagnosis remains structurally applicable;
- `staticNeighborKeys` is now row-major `gridW * gridH * 4` and addressed through `denseIndex(key, gridW)`; `cellDenseIndex` no longer exists in the current prep implementation;
- current `prep.ts` therefore contradicts the stale `solver-architecture.md` paragraph that still describes `cellDenseIndex`-based adjacency. That documentation mismatch should be repaired when that large architecture document is next edited; this audit records it so it is not mistaken for current representation evidence.

No current-head CPU profile was run as part of this evidence-lineage audit. Therefore this report intentionally nominates **no current implementation hotspot**. Historical profile shares are archaeology, not a current work order.

## What the future speed campaign should do first

### Phase 0: freeze the objective and baseline

Before optimizing, define the retained solve boundary. Persist both per-level rows and population aggregates:

- retained solve set / boundary;
- total `workSpent`;
- total wall and, where practical, process CPU;
- work and wall/CPU before the winning action;
- winning action/config;
- earlier action families and their work/cost;
- displaced capability from any repricing/removal;
- DFS/beam/repair contribution;
- conditional-action participation/dose;
- replay, forced-chain, and other current major hotspot shares;
- short-level and hard-level latency;
- total compute across the retained solve population.

Do not let a per-level geometric mean let hundreds of trivial levels outvote the hard tail that consumes most compute.

### Program 1: algorithmic efficiency

Preserve the chosen solve boundary while reducing machine-independent work.

1. **Winner-path economics / redundant earlier actions (WS2 + WS1).** Measure work before the winner and identify action families repeatedly paid before a later winner. Repricing/removal must report displaced capability, not merely average work reduction.
2. **Action selection and ladder ordering (WS1).** Use legal current-level/current-solve evidence to avoid predictable dead work. Old selector negatives constrain exact policies, not routing as a speed class.
3. **Cross-attempt basin overlap (WS1/WS2 observer).** Historical telemetry was once mechanically broken. Rebuild only when the future speed objective makes redundant basin exploration a ranked question; prove participation and canonical action identity.
4. **Repair economics/reachability (WS6).** Use dependency-conditioned descent/reachability evidence before funding expensive repair that cannot revise the commitment causing the failure.
5. **Certified forced-chain census/traversal (WS7).** First measure current work spent in post-prune one-successor chains. Historical SolverV2 evidence is insufficient for current promotion because it bundled connectivity-frequency changes.
6. **Resumability/handoff only when earned.** Same-policy residual continuation is already closed null. A policy switch or selected-state handoff needs a new premise and must compare total retained-boundary work.
7. **Pruning economics.** Judge expensive pruning by net work and wall saved, not by node rejection alone. MST history proves stronger bounds can reduce nodes while making the solver slower and less capable.

### Program 2: implementation efficiency

Once the logical-search boundary is stable enough to optimize, collect a **fresh current-HEAD sampling profile on the retained workload**. Only then nominate implementation treatments.

Potential families exist, but none is currently nominated: data representation, scorer/state plumbing, candidate-loop structure, replay/materialization, allocation/layout, indexing, work-meter/secondary plumbing, and a compact native/WASM boundary if one naturally exists. Historical positives/negatives constrain design but do not replace current profiling.

For any pure-speed treatment:

- pin deterministic work/node budgets as appropriate;
- make wall deadlines non-binding;
- require solve/search parity before timing interpretation;
- use interleaved repetitions and enough repetition for the claimed effect size;
- include representative short and hard workloads;
- report end-to-end value and total retained-population compute, not only a microbenchmark;
- inspect allocation/GC for representation changes;
- measure nested instrumentation overhead when hot-loop timers are used.

## Coverage by existing workstreams

| Future speed concern | Existing owner | Coverage |
|---|---|---|
| Action selection / routing / ladder ordering | WS1 | Strong conceptual coverage; future objective changes from solve acquisition to retained-boundary work reduction. |
| Retry/action repricing, winner economics, participation/dose, displaced capability | WS2 | Strong and already instrumented conceptually; future baseline needs explicit before-winner compute aggregation. |
| Repair reachability / dependency-conditioned futile work | WS6 | Good research lineage; treatment queue remains premise-gated. |
| Forced-chain / traversal architecture | WS7 | Preserved as observer-first reopen; not yet current-measured. |
| Resumability / policy handoff | WS2/WS7 supporting | Primitive exists; same-policy residual use closed null; other forms conditional. |
| Current implementation profiling and hot-loop CPU reduction | WS7 architectural speed | Method exists, but the concrete queue is intentionally incomplete until current-head profiling. |
| Retained-solve population compute baseline | Cross-cutting, activated through WS2/WS7 | Method is now specified; no separate competing queue should be created. |

The repo therefore already contains most of the **algorithmic mechanism families** needed for a future speed campaign. What it intentionally does not contain is a pre-filled implementation-speed backlog. That absence is healthy: current-head profiling should create that backlog when the objective changes.

## Documentation changes from this audit

1. `docs/solver-architectural-speed-opportunities.md`
   - added the full seven-state performance evidence vocabulary;
   - added positive historical knowledge, including the July pure-speed stack and August beam/representation stack;
   - reclassified beam tree-order walk as behavior-changing;
   - removed the unsupported positive speed shorthand for `cellDenseIndex` removal;
   - reclassified exact beam duplicate elimination from treatment falsification to strong opportunity sizing / `DEFERRED_LOW_VALUE`;
   - staged the future speed campaign into algorithmic then implementation efficiency;
   - added the retained-boundary baseline contract.
2. `docs/solver-optimization-workstreams.md`
   - kept WS2 first priority unchanged;
   - added dormant speed-campaign activation staging and explicit WS1/WS2/WS6/WS7 ownership;
   - expanded speed research vocabulary and measurement rules without creating a second queue.
3. `reports/2026-09-15-speed-negative-methodology-review-001.md`
   - follow-up correction required for its stale `solver-pure-speed-work.md` citation and exact-beam-dedup classification; the present report is the broader authority for those points.
4. `docs/solver-architecture.md`
   - current text still describes the removed `cellDenseIndex`; this audit records the mismatch. The source-of-truth code and August 26 report agree on row-major `denseIndex()` addressing.

## Remaining unresolved questions

- No current-head sampling profile exists from this audit, so there is intentionally no current implementation candidate.
- Current tooling may not yet aggregate all desired future baseline fields, especially CPU time, work/wall before winner, redundant earlier-action family cost, and current hotspot shares in one durable artifact. Build only the missing pieces when the speed campaign activates rather than creating infrastructure now.
- The exact current marginal benefit of old landed implementation optimizations is unknown and generally not worth re-benchmarking until a current profile or planned refactor makes the answer decision-relevant.
- A future retained solve boundary may differ materially from today's production solved set. Algorithmic speed decisions must freeze that boundary prospectively when the campaign begins.
