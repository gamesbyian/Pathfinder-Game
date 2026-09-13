# Capability-memory union reconciliation 001

> **Status:** concluded-positive / correction
> **Last evidence:** 2026-09-12 — PR-only existing-data run `34728842684` rebuilt the corrected 1,048-solve residual atlas and capability-memory nomination sets from committed evidence, without running the solver.
> **Decision:** the later September 12 capability-memory prose contains an impossible aggregate: portal coarse-state merge alone nominates 137 current residual rows, so the stated six-source union of 65 cannot be correct. Two independently reconstructable sources already produce a **153-row lower bound** on the union, including **116/123 class-4 rows** and **0/431 class-5 rows**. The class-5 “known capability does not reach this frontier” conclusion survives; the broader “capability memory is low-yield” interpretation does not. Class 4 now owes the cheap freshness/reconciliation gate that the capability-memory contract prescribes.
> **Remaining gate:** replay a tiny, prespecified current class-4 sample of the historical portal coarse-state-merge nominations under the existing default-off flag and current production code/budget semantics. If the old capability is stale, close quickly. If it persists, test the smallest changed-treatment exposure/allocation form without reopening the globally losing treatment.
> **Evidence role:** correction of a cross-evidence aggregate and recovery of a missed WS2 trigger. No solver-policy change.

## Why this was reopened

[`2026-09-12-repair-turn-biased-t1-census-misclassification-001.md`](2026-09-12-repair-turn-biased-t1-census-misclassification-001.md) correctly repaired the residual atlas to `22/39/37/123/431` after removing `variantLabel` from treatment semantics. Its capability-memory section also says portal coarse-state merge has **137 current-residual nominations**. The same section then reports a **65/652 union across all six sources**.

Those statements cannot describe one set union. `|A ∪ B ∪ ...| >= |A|` for every member set.

Because that aggregate helped support the downstream interpretation that bounded known capability had little residual reach, the contradiction is decision-bearing rather than cosmetic.

## Cheap reconstruction

Temporary PR-only workflow `tmp-seven-day-capability-reconcile.yml` was added only to execute repository analysis code against committed data. It ran no solver campaign. Run `34728842684`:

1. rebuilt the current residual atlas from production run `34683011115`, its lifecycle map, frozen T1 census, and hint provenance;
2. fed independently reconstructable historical capability signatures through the repository's own `solver-capability-memory-lib.mjs` set-union semantics;
3. joined resulting nomination IDs back to corrected residual classes.

The boundary and atlas reproduced exactly:

- 1,700/1,700 conclusive;
- 1,048 solved, 652 residual;
- classes **22 / 39 / 37 / 123 / 431**.

### Sources reconstructed without ambiguous action-name recovery

| source | demonstrated historical IDs | current residual nominations | class 1 | class 2 | class 3 | class 4 | class 5 |
|---|---:|---:|---:|---:|---:|---:|---:|
| portal coarse-state merge referee-valid gain set | 158 | **137** | 6 | 9 | 9 | **113** | 0 |
| production-boundary displaced solved-set losses | 16 | **16** | 0 | 1 | 12 | 3 | 0 |
| **union of these two sources** | — | **153** | **6** | **10** | **21** | **116** | **0** |

The analyzer independently reports the same 153-row union. These two nomination sets are disjoint in this reconstruction.

The first reconstruction pass intentionally abstained from treating guessed technique-niche action labels as evidence after exact-name lookup returned zero rows. A second existing-data-only pass is recovering those source identities directly from the artifact. Therefore **153 is a proved lower bound, not yet a claim about the exact full six-source union**. The impossible published value 65 is nevertheless already falsified.

## What changes scientifically

### Class 5 remains an acquisition frontier under the tested evidence

Nothing here creates class-5 reach. Portal coarse-state merge nominates zero class-5 rows, and the displaced-current-capability source also nominates zero. The broader class-5 conclusion is independently supported by the corrected T1 census, freshness work, exact extinction evidence and failed nearby retention/scoring/descriptor routes.

The correction is therefore **not** “class 5 was secretly composition.”

### Class 4 was prematurely flattened into the class-5 conclusion

One recent, mechanistically distinct, referee-valid historical treatment nominates **113/123 current class-4 rows**. That treatment was correctly rejected globally because it also lost 12 control solves and produced a hard capability regression on `R01273`. Its later collision forensic closed bounded second-survivor and predecessor-history subkey salvage forms.

Those facts close the tested global/salvage forms. They do not erase the treatment's large positive basin. Capability-memory policy explicitly says a historical gain still present in today's residual means **reconcile/rerun/explain the capability**, not “ignore it because the treatment was closed.”

This is exactly a case where the promotion verdict and capability signature diverge.

## Smallest due question

Do **not** rerun 113 rows first, and do **not** reopen default-on portal coarse-state merge.

Take a tiny prespecified sample of current class-4 rows nominated by its September 9 referee-valid gain set and replay the existing default-off treatment under current code and production-shaped work semantics. The sample should be enough to answer only the freshness question:

> Does this policy-specific historical basin still contain current cold capability after the subsequent September promotions and provenance correction?

Advance only if current solves reproduce. If they do:

1. quantify how much of the 113-row basin remains fresh using the smallest population that decides the next gate;
2. ask for the least disruptive changed-treatment exposure, such as a post-failure/additive retry or another bounded allocation form that cannot remove baseline-successful survivors merely by being globally enabled;
3. keep the aggregate work envelope explicit and measure displacement/collateral before scale.

The known `R01273` regression is a control constraint, not a reason to discard the positive basin. A descendant must preserve ordinary production capability rather than repeat the globally losing merge form.

## Research-system failure mode

The bad aggregate demonstrates a second-order provenance problem: even when each source has a legitimate provenance record, a summary can still become scientifically unsafe if source-set identity and set algebra are reconstructed in prose rather than mechanically sealed in the durable result.

Future capability-memory closeouts that cite a union should preserve or regenerate the machine-readable candidate manifest/result, or at minimum assert the invariant:

`union.nominationCount >= max(candidate.nominationCount)`.

That is a cheap correctness check and would have caught this immediately.
