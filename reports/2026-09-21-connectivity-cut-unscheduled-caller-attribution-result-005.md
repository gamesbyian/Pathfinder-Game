# Connectivity cut-certificate unscheduled caller attribution result 005

> **Status:** concluded-positive
> **Last evidence:** 2026-09-21 — caller-attributed unscheduled cut shadow on the frozen 24-parent hard-C2 development population assigned 47,389 / 49,270 hits to ordinary DFS.
> **Decision:** advance only ordinary DFS to dominated-subtree/work economics; beam and repair do not justify separate tracing from this population.
> **Remaining gate:** measure non-overlapping canonical work and node expansion performed beneath outermost DFS proof-hit prefixes, then compare that dominated work with certificate-validation cost before any behavioral prune A/B.
> **Evidence role:** development.
> **Parent result:** [unscheduled applicability result 004](2026-09-21-connectivity-cut-certificate-unscheduled-applicability-result-004.md).
> **Preflight:** [unscheduled caller attribution preflight 005](2026-09-21-connectivity-cut-unscheduled-caller-attribution-preflight-005.md).
> **Execution:** GitHub Actions run `35573975621`, fast-gate job `106252699231`.
> **Artifact:** `connectivity-cut-caller-attribution-development-005`, artifact `10627398242`, digest `sha256:f0a35e76328ea16fc9789dfd08a806021f8581a9ab65ce24d92aae85c6cf8247`.

## Question

Result 004 established 49,270 theorem-backed cut hits at candidates where production skipped connectivity, but mixed search families with materially different cadence and semantics.

This pass asked:

> **Which current production caller actually owns the earlier-proof opportunity?**

No search behavior changed.

## Frozen population

Identical to results 002-004:

- Corpus 2 random stress positions 81-104;
- 24 parents;
- strict base work budget 500,000;
- 30 s wall safety;
- 64 retained unique cut certificates per solve;
- exact-signature dedupe and current-position indexing unchanged;
- unscheduled proof validation remains observational only.

## Result

Aggregate unscheduled totals remained exactly:

- 587,149 probes;
- 49,270 hits;
- 8.39% hit rate;
- 49,186 cross-exact-state hits;
- 9 parents with hits.

Caller attribution:

| caller | probes | hits | hit rate | parents with hits | boundary checks | median source-proof age | median remaining steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| ordinary DFS | 420,398 | **47,389** | **11.27%** | **9** | 18,954,759 | 84,913 work | 49 |
| beam | 166,751 | 1,881 | 1.13% | 2 | 2,789,332 | 362,082 work | 92 |

No other caller family contributed an attributed unscheduled hit in this frozen run.

Ordinary DFS therefore owns:

```
47,389 / 49,270 = 96.18%
```

of all observed earlier-applicability hits.

## Interpretation

This resolves the method ambiguity from result 004.

### DFS is the earned next consumer

DFS provides:

- almost all observed hit volume;
- replication across every positive parent;
- a clean exact semantic boundary: a cut proof applying at a prefix proves the entire descendant subtree infeasible;
- an existing stack push/pop structure where downstream nodes/work can be measured without changing search.

The median hit occurs with 49 counted steps still remaining, and the median source proof is ~84.9k canonical work units old. This is not a near-terminal or one-generation-only phenomenon.

### Beam does not advance here

Beam has real signal but it is much smaller and concentrated:

- 1,881 hits;
- 1.13% hit rate;
- only 2 independent parents.

A beam-specific lineage/cull microscope is therefore not justified while DFS offers a much cleaner and larger reservoir.

This does not close cut proofs in beam universally. It closes a separate beam tracing project from the present evidence.

### Repair does not advance here

The current frozen run produced no attributed repair-family unscheduled reservoir that competes with DFS.

Do not build repair-specific proof consumers from the aggregate 004 count.

## Next microscope: non-overlapping DFS dominated work

The next observer must remain production-inert.

When an unscheduled cut proof applies to a DFS candidate that production still accepts:

1. if no ancestor proof-hit subtree is already active, mark this prefix as an **outermost proof-hit subtree**;
2. allow production DFS to continue unchanged;
3. when that stack frame is naturally exhausted/backtracked, record:
   - canonical `workSpent` after the proof hit;
   - nodes expanded after the proof hit;
   - subtree depth / remaining steps;
   - certificate-validation cost for the hit;
4. ignore nested proof hits for dominated-work summation so saved-work estimates do not double count.

Also record runs where the search terminates by budget before the marked subtree closes. Those are censored dominated-work observations and must not be silently treated as complete subtree savings.

The result is an **upper bound on work a perfect behavioral consumer could avoid at the proven prefix**, before charging proof maintenance/lookup overhead.

## Advancement gate

A behavioral DFS cut consumer is earned only if:

- non-overlapping dominated canonical work is material relative to total solve work;
- multiple independent parents contribute;
- dominated work comfortably exceeds certificate-validation and maintenance cost;
- the opportunity is not solely a consequence of one pathological parent;
- a lower-frequency or event-triggered checking cadence can plausibly capture the reservoir without reproducing result 004's 21.7M boundary-check tax.

If dominated work is small, close the proof family despite high hit incidence.

## Disposition

- caller attribution: **decisive**;
- ordinary DFS: **advance to subtree/work economics**;
- beam-specific consumer: **deferred / not earned from this population**;
- repair-specific consumer: **not earned**;
- generic cross-technique tracer: **not earned**;
- behavioral prune: **not yet earned**.

The successor audit now has a single concrete next economic question: **how much DFS work lies below the first exact proof-hit prefix?**
