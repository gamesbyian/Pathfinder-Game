# Solver presolve opportunity audit 001

> **Status:** active
> **Last evidence:** 2026-09-20 — static reconciliation narrowed presolve to bounded exact/safe candidates and measured zero P1 incidence on published + Corpus 1.
> **Decision:** Treat presolve as a small consumer layer, not a decomposition architecture; P1 is closed for published/Corpus 1 while P3/P2 remain census-gated.
> **Remaining gate:** Complete current-population initial-state incidence/economics for BC1 and, only if cheap, checkerboard capacity.
## 1. Question

How much Pathfinder can be rejected, simplified, or structurally constrained **before ordinary DFS/beam/repair search begins**, using facts already developed elsewhere in the research system?

This is deliberately narrower than "build a new exact solver" or "decompose every board."

Presolve is useful only when:

1. its fact is exact or one-sided safe;
2. it adds information beyond current setup/search prunes;
3. its construction cost is paid once or very few times;
4. downstream work removed exceeds that cost;
5. no predictive/research descriptor is silently upgraded into proof.

## 2. Why presolve is a distinct economics question

Several current facts are already evaluated *during* search.

A fact can be poor economics per node but good economics once per level.

Conversely, a static theorem with beautiful incidence can still be useless if it only repeats a rejection the first search move would discover essentially for free.

Therefore the presolve audit must measure:

```
one-time construction cost
+ one-time evaluation cost
versus
ordinary work avoided before the same conclusion would otherwise occur
```

Do not infer presolve value from theorem novelty or observer incidence alone.

## 3. Candidate P1 — exact all-gates parity infeasibility

The parity preflight already identifies a whole-level exact consequence:

> on no-twist levels, if zero gates are parity-feasible for the required exact length, the whole level is infeasible.

Current behavior instead allows the active-gate helper to fall back to all gates in that situation, with first-step/search machinery later rejecting them.

### Why this is presolve-shaped

- exact;
- level-static;
- extremely cheap;
- no new representation;
- applies before search allocation;
- answer can be one explicit infeasibility result rather than accidental exhaustion.

### Missing evidence

The existing preflight correctly notes that opportunity is not yet economics.

Measure:

- number of current corpus levels with zero feasible gates;
- ordinary work spent before they are rejected/exhausted;
- whether another setup check already returns the same result at equivalent cost;
- any interaction with portals where twist use invalidates ordinary endpoint parity.

### Gate

If support is nonzero and ordinary wasted work is material relative to essentially-free checking, this is the smallest legitimate presolve consumer.

If support is zero or search rejects at negligible cost, close it as a presolve optimization while retaining the exact fact.


## 3A. P1 opportunity census result: published + Corpus 1

The exact all-gates parity test can be evaluated directly from raw current input, so it was censused
without waiting for the execution harness.

Complete populations:

- published: 160 levels;
- Corpus 1: 102 levels;
- total: 262.

Results:

| Population | Rows | No-twist eligible | Zero parity-feasible gates |
|---|---:|---:|---:|
| published | 160 | 136 | **0** |
| Corpus 1 | 102 | 64 | **0** |
| combined | 262 | 200 | **0** |

So on these two complete populations the exact whole-level P1 condition has **zero initial-state
incidence**.

This closes P1 as a meaningful presolve optimization for published + Corpus 1. The theorem remains
correct and may still be useful as an explicit semantic assertion, but there is no speed case there.

Corpus 2 remains unmeasured because its large raw corpus body is not exposed through the current
connector. The committed execution census will complete that check when an execution surface is
available.

This result also illustrates why the audit measures opportunity before implementation: adding an
explicit solve-level infeasibility path for P1 would currently save no searches in these populations.

## 4. Candidate P2 — checkerboard-split capacity

The current H2 checkerboard-capacity premise is a safe relaxed impossibility condition on future-no-twist states:

```
capacity[color] < requiredArrivals[color] => true completion impossible
```

The derivation deliberately over-allocates intersection capacity, so failure is one-sided safe.

### Why initial-state presolve is interesting

At the initial state:

- no path-history reconstruction is needed;
- static/reachable volume is already a natural compile-time product;
- an initial-state failure can prevent every search technique/attempt from starting;
- construction can potentially share the existing connectivity substrate rather than run a second flood fill.

### What is not established

The observer's per-search-node incidence does not establish initial-state incidence.

A dynamic fact may become useful only after the path has consumed capacity.

Therefore first ask a cheaper question:

> across current corpora, how often does H2 reject at the initial gate state beyond ordinary scalar volume/parity?

If negligible, it remains a dynamic-search premise and is not a presolve candidate.

## 5. Candidate P3 — BC1 bridge-excursion impossibility

BC1 has the strongest new exact theorem in the current small-projection program.

For a bridge in the over-permissive future transition multigraph, if the required far-side demand implies more traversals of that bridge than one-use edge capacity allows, completion is impossible.

Stage-B frontier incidence was materially positive:

- 105 / 263 connectivity-passing sampled states conflicted;
- 22 / 24 eligible parents showed recurrence.

This earns the already-planned production-inert safety/economics consumer.

### Presolve inversion

Before considering Tarjan/bridge analysis on every connectivity call, ask whether a **once-per-gate initial-state BC1 pass** catches meaningful cases.

This is a materially cheaper consumer boundary than the hot-path form.

Possible outcomes:

1. **initial-state incidence material**
   - presolve becomes the first economics target;
   - dynamic hot-path BC1 remains separately gated.

2. **initial-state incidence tiny, later-state incidence material**
   - retain BC1 as a dynamic consumer candidate;
   - do not burden level compilation with it.

3. **mostly redundant with existing setup/connectivity**
   - close presolve form even though BC1 remains an exact theorem.

### Required guardrail

The multigraph distinction is load-bearing. Parallel cardinal and portal transitions must remain distinct or bridge inference can become unsound.

## 6. Separator/decomposition is *not* generally promoted by this audit

The static separator census found real structural opportunity:

- 121 / 390 Class-5 residual levels had at least one non-trivial balanced width <= 4 interface.

But the later dynamic-interface contract ladder reached an important negative:

- C2 became exact-outcome pure only on a small repeated-signature subset;
- only 39 / 546 decisive rows remained in repeated signatures;
- support fell below the frozen 20% floor;
- adding more C3/C4 history can only reduce compression.

Therefore the broad idea:

> compile each level into a small exact separator state and solve regions independently

is **not earned** by current evidence.

Do not use the batch-digestion audit to reopen that architecture.

Still-open narrower descendants are different:

- one local exact query on the smaller side;
- one exact/safe interface feasibility test;
- unique board-specific cuts such as BC1 whose usefulness does not require recurring compact cross-level interface signatures.

## 7. Other existing search facts

Several current solver facts already behave like micro-presolve inside search setup:

- forced first move from certain gate/must-cross structures;
- static dead flippers;
- goal/objective distance fields;
- portal parity structure;
- lower-bound tables;
- initial obligation masks.

The architectural lesson is not "add another phase for ceremony."

A future presolve layer should exist only if it has a meaningful contract such as:

```
compile static facts
-> propagate exact/safe consequences to fixed point
-> either return proven infeasible / simplified problem
-> or hand residual problem to ordinary search
```

If only one or two checks survive economics, they may belong directly in compilation/orchestration rather than a named subsystem.

## 8. Propagation-to-fixed-point remains unearned

The conceptual audit nominated iterative propagation:

- forced edges;
- obligation ordering;
- component capacity;
- exact resources;
- contracted chains.

Current evidence does not yet show a collection of mutually feeding propagators large enough to justify a general fixed-point engine.

Do not build one pre-emptively.

Promote only after at least two or three independent cheap consequences repeatedly expose new consequences when chained.

## 9. Relationship to compilation

Presolve and compiled-level reuse are orthogonal but composable.

Possible future sequence:

```
normalize once
-> compile immutable static data
-> run one-time presolve over static/initial state
-> create fresh solve context
-> search residual uncertainty
```

But the economics must be additive:

- compilation reuse saves repeated setup;
- presolve saves downstream search;
- neither is entitled by the other.

A presolve fact that is expensive but reused across many ablation experiments could become economical even if it is too expensive for a one-off solve. This is one place where the two audit lanes may eventually interact.

## 10. Recommended empirical order

1. **P1 all-gates parity**
   - cheapest exact census;
   - measure support and current wasted work.

2. **P3 initial-state BC1**
   - reuse the already-tested theorem helper;
   - census initial-state incidence before adding any hot-path observer.

3. **P2 initial checkerboard capacity**
   - evaluate only if the existing reached-set substrate makes the initial check genuinely cheap.

4. only then consider:
   - local exact separator-side query;
   - forced-chain contraction;
   - multi-propagator fixed point.

## 11. Dispositions

| Candidate | Proof class | Current maturity | Presolve disposition |
|---|---|---|---|
| all-gates parity infeasibility | exact | theorem already known | **measure now** |
| initial BC1 | exact | theorem + frontier incidence positive | **measure now** |
| initial checkerboard capacity | safe relaxation | observer premise active | **measure if shared substrate cheap** |
| generic separator decomposition | exact-interface ambition | C2 representation-explosive | **closed as broad presolve architecture** |
| local separator-side exact query | exact/reference | narrow descendant still open | **defer behind cheaper three** |
| general propagation engine | framework | no multi-propagator evidence | **not earned** |

## 12. Next artifact

The cheapest next implementation is a production-inert **initial-state presolve opportunity census** that reports P1/P3, and P2 only if it can reuse the same prepared/reached substrate without disproportionate instrumentation.

It must not alter search decisions.

If the fixed-cost evidence simultaneously shows preparation itself is expensive, the census should record enough construction timing to distinguish:

- static fact cost;
- presolve evaluation cost;
- downstream work potentially avoidable.
