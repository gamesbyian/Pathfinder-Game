# Connectivity cut DFS dominated-work result 006

> **Status:** concluded-negative
> **Last evidence:** 2026-09-21 — non-overlapping outermost DFS proof-hit subtrees accounted for only 49,034 canonical work units across the frozen 24-parent hard-C2 development population.
> **Decision:** close the connectivity cut-certificate behavioral consumer. Do not run a matched-work prune A/B; the maximum observed downstream-work reservoir is already too small relative to lookup/validation work.
> **Remaining gate:** reopen only if the solver's connectivity cadence/cost changes materially, or a fundamentally cheaper certificate applicability test removes the present boundary-validation burden by orders of magnitude.
> **Evidence role:** development.
> **Preflight:** [DFS dominated-work preflight 006](2026-09-21-connectivity-cut-dfs-dominated-work-preflight-006.md).
> **Parent result:** [caller attribution result 005](2026-09-21-connectivity-cut-unscheduled-caller-attribution-result-005.md).
> **Execution:** GitHub Actions run `35647486103`, fast-gate job `106491849187`.

## Question

The earlier chain established a real theorem-backed reusable proof:

- exact cut templates recur;
- they apply across distinct exact states;
- a cheap position selector exists;
- they frequently apply before production's scheduled connectivity fill;
- ordinary DFS owns almost all of that earlier applicability.

The final missing question was economic:

> **How much actual DFS work lies below the first applicable proof in each non-overlapping doomed subtree?**

## Frozen population

Same spent development population as results 002-005:

- Corpus 2 random stress positions 81-104;
- 24 parents;
- strict base work budget 500,000;
- 30 s wall safety;
- 64 retained unique certificates;
- production search/pruning unchanged;
- only outermost proof-hit DFS subtrees counted for dominated-work summation.

## Result

| metric | result |
|---|---:|
| raw unscheduled cut hits | 49,270 |
| ordinary DFS hits | 47,389 |
| **outermost non-overlapping DFS proof-hit subtrees** | **6,196** |
| naturally exhausted subtrees | 6,152 |
| censored subtrees | 44 |
| **observed dominated canonical work** | **49,034** |
| naturally closed dominated work | 45,347 |
| dominated DFS nodes | 91,971 |
| naturally closed dominated nodes | 86,980 |
| proof-root boundary-cell validations | **791,269** |
| parents with dominated-work records | 9 |
| total solve work | 12,218,378 |

The complete observed dominated-work fraction is:

```
49,034 / 12,218,378 = 0.4013%
```

The naturally closed-only fraction is:

```
45,347 / 12,218,378 = 0.3711%
```

Censoring is small by count: 44 / 6,196 = 0.71%. Even treating all censored observations as genuine additional opportunity cannot change the order of magnitude.

## The important collapse

Result 004's 49,270 unscheduled hits looked large.

006 shows why incidence was not economics.

Those hits collapse to only 6,196 non-overlapping first-proof subtrees. Most later hits are descendants or repeated observations inside regions already covered by an earlier exact proof.

That distinction is precisely why the successor audit required dominated-work accounting rather than observer incidence.

## Lookup economics are decisively unfavorable

Root proof validation alone performed 791,269 boundary-cell checks for 49,034 observed dominated canonical work units.

A direct ratio is not a calibrated CPU conversion, because boundary checks are observer operations while `workSpent` is the solver's canonical abstract work model. But the scale is already fatal to the current consumer:

```
791,269 / 49,034 ~= 16.1 root boundary checks
per dominated canonical work unit
```

And that excludes:

- proof construction;
- exact-signature deduplication;
- cell-to-certificate index construction/maintenance;
- failed applicability checks away from marked roots;
- observer/consumer branches;
- memory/cache cost.

The always-check unscheduled observer in result 004 was much worse, with 21.7M boundary checks.

Therefore a behavioral A/B is not the next discriminator. Its plausible upside is already bounded below the cost shape of the applicability machinery.

## Why no behavioral prune A/B is earned

A matched-work A/B is appropriate when a production behavior might plausibly trade implementation overhead for a meaningful reduction in search.

Here the development evidence already establishes:

1. the exact proof is sound in its declared scope;
2. recurrence is real;
3. earlier applicability is real;
4. DFS owns the opportunity;
5. **non-overlapping downstream work is only ~0.4% of total canonical work**;
6. current proof-root validation operations greatly exceed that numerator.

Running a behavioral A/B would therefore be ceremony, not a useful falsifier.

## What remains scientifically useful

This line produced several durable architectural lessons:

- reusable reasoning units can be **implication certificates**, not residual identities;
- raw repeated-proof incidence can dramatically overstate removable search;
- exact proof-template dedupe can matter even when behavioral caching does not;
- caller attribution before generic tracing avoided unnecessary beam/repair machinery;
- outermost dominated-work accounting is the correct economic denominator for repeated exact failures inside a DFS subtree.

These lessons belong in the audit; the runtime consumer does not.

## Runtime disposition

Do not ship:

- a cut-certificate prune;
- check-every-skipped-candidate validation;
- a solve-local general proof blackboard;
- a generic DFS proof cache;
- changed connectivity cadence based on this evidence.

The research shadow may remain only where another active audit needs its proof identity/observation surface. Experimental dominated-work tracing should be removed after evidence recovery.

## Reopen conditions

Reopen this exact consumer only if at least one material premise changes:

- connectivity fills become much more expensive relative to current canonical work;
- production connectivity cadence becomes substantially sparser;
- a new theorem permits O(1) or near-O(1) applicability without boundary revalidation;
- a different proof family demonstrates much larger non-overlapping dominated work;
- independent evidence shows the current 24-parent development population systematically understates the relevant production workload by an order of magnitude.

Absent such a change, the behavioral connectivity cut-certificate line is closed.

## Disposition

- theorem: **survives**;
- recurrence: **positive**;
- cross-state implication reuse: **positive**;
- early applicability: **positive**;
- DFS ownership: **positive**;
- non-overlapping dominated-work economics: **negative**;
- behavioral prune A/B: **not earned**;
- production consumer: **closed**;
- general proof-store architecture: **not earned**.

This is a successful negative result: the audit found a real reusable proof and then demonstrated that exploiting it would not materially improve the solver under current economics.
