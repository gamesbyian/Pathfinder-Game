# Beam full-pool survivor projection

> **Status:** concluded-negative for the tested fixed-width quota keys
> **Last evidence:** 2026-08-25 — read-only replay of Actions run `32810888215`, artifact `beam-extinction-full-pools-2026-08-24`, captured at solver ref `2cbd3fdef440ca1fb0251b529cdfc56c5f8b158d`
> **Decision:** none of the prespecified low-cardinality bucket keys earns a production survivor-selection intervention. The keys do not fragment excessively, but they fail to retain the available exact-live alternatives at width 100 and show no recurring incremental stored-hint support advantage over the existing `(mustCrossMask, flipperUsedMask)` bucket key.
> **Remaining gate:** stop this quota/bucketing form. Reopen beam-retention intervention only with materially new evidence for a cheap descriptor or a different bounded survivor mechanism; do not tune a composite key on these four selected parents.
> **Evidence role:** discovery / selected extinction-boundary diagnostic
> **Selection:** the four parents were selected before this projection from existing exact A/D extinction evidence; they are not prevalence or effect-size evidence.

## Contract

This completes the projection preregistered in [`2026-08-24-beam-extinction-descriptor-sanity-check.md`](2026-08-24-beam-extinction-descriptor-sanity-check.md) and enabled by [`2026-08-24-beam-full-pool-capture-readiness.md`](2026-08-24-beam-full-pool-capture-readiness.md).

The capture contains 207 complete post-production-dedup, score-sorted ranked pools across `S00001`, `S00030`, `S00048`, and `R00104`. The projection replays only state implicit in each stored candidate path and tests the prespecified keys at the captured beam width 100:

1. baseline `(mustCrossMask, flipperUsedMask)`;
2. baseline + `mpVisitedMask`;
3. baseline + `adjTurnMask`;
4. baseline + MustCross first-pass mask (`crossCount == 1` per MustCross cell).

Selection exactly mirrors the existing quota rule offline: let `b` be the number of buckets, guarantee each bucket up to `max(1, floor(100 / b))` of its highest-scoring candidates, then fill remaining slots from the global score order. No search, scoring, pruning, connectivity, or solver state is changed.

The replay reproduces the previously hand-audited pair distinctions, including the earlier finding that MustCross first-pass phase separates the selected `S00030` dead/live pair but not the other three.

## Exact-boundary result

| parent | pool | dead candidate | old exact-live alternative in captured pool | score-only width 100 | any tested key retains exact-live? |
|---|---:|---:|---:|---|---|
| `S00001` | 146 | rank 1 | absent | n/a | no candidate to retain |
| `S00030` | 256 | rank 1 | rank 109 | culled | **no** |
| `S00048` | 266 | rank 1 | rank 116 | culled | **no** |
| `R00104` | 171 | rank 1 | absent | n/a | no candidate to retain |

The two absent alternatives are not merely outside width 100: their historical exact paths are absent from the current **post-dedup ranked pool** captured at the corresponding boundary. This capture therefore cannot use survivor selection to rescue those exact states.

For the two alternatives that are present:

- `S00030`: +MustPass and +MustCross-first-pass both distinguish the exact-live rank-109 state from the dead rank-1 state, but rank 109 remains too deep within its resulting bucket to receive a guaranteed slot.
- `S00048`: all four tested keys assign the rank-116 exact-live state to the same bucket as the dead rank-1 state; none retains it.

Stored-hint support gives the same practical result at these boundaries. `S00001` has one supported ranked-pool candidate at rank 93 and every treatment already retains it. `S00030` has supported candidates at ranks 82, 109, and 216; every treatment retains only rank 82. `S00048` has support only at rank 116 and no treatment retains it. `R00104` has support only at rank 164 and no treatment retains it.

## Bucket cardinality across all 207 pools

The negative is not caused by pathological singleton fragmentation.

| key | mean buckets | median | max | mean candidate fraction in singleton buckets | max singleton-candidate fraction |
|---|---:|---:|---:|---:|---:|
| baseline | 2.61 | 2 | 15 | 0.14% | 3.82% |
| + MustPass visited mask | 4.22 | 3 | 21 | 0.28% | 4.58% |
| + adjacent-turn mask | 3.70 | 2 | 15 | 0.24% | 3.82% |
| + MustCross first-pass mask | 3.98 | 2 | 25 | 0.27% | 6.87% |

The descriptors mostly create reusable, populated buckets. They simply do not create useful enough **within-bucket priority** for the quota mechanism.

As a secondary non-exact diagnostic, compare stored-hint-supported candidate retention over all 207 pools against the baseline bucket counterfactual:

- +MustPass improves 7 pools, worsens 7, and is net -1 supported candidate;
- +adjacent-turn improves 0, worsens 1, net -1;
- +MustCross-first-pass improves 1, worsens 9, net -10.

This is not an exact liveness label and is not used as proof. It does show no recurring incremental support advantage that would rescue the exact-label negative.

## Controls

### Width-only

A transparent modest-width sensitivity gives the generic-capacity comparator:

- width 110 would retain `S00030`'s available exact-live rank 109 but not `S00048`'s rank 116;
- width 120 would retain both available exact-live alternatives.

Thus at least one of the two available rescues is achieved by only +10% generic width, and both by +20%, while none of the tested fixed-width descriptors rescues either one. This does **not** recommend widening the production beam; it shows that the selected examples do not demonstrate descriptor-specific survivor value.

### Matched random reserve

For each key and boundary, a matched random-reserve control uses the same number `k` of slots that the quota treatment displaces from the score top 100: keep the top `100-k`, then choose `k` uniformly from the remainder.

The tested quota keys have 0% observed retention for both available exact-live alternatives. The matched random control would at least have non-zero inclusion probability:

- `S00030` rank 109: about 4.3% for the 7-slot treatments and 6.0% for the 10-slot MustCross-phase treatment;
- `S00048` rank 116: about 1.8% for 3-slot treatments and 12.6% for the 24-slot +MustPass treatment.

With only two currently available exact-live rows this is a control, not an effect estimate. It is enough to show that the tested descriptors did not beat generic reserve on the selected exact-live outcome.

## Interpretation

The full-pool capture answers the question that pairwise descriptor inspection could not. Some cheap state descriptors really do separate some exact dead/live pairs, but **separation is insufficient**. A quota rule must also place the live state high enough inside a recurring bucket to survive at fixed width.

That condition fails here. The available exact-live alternatives remain culled; the aggregate stored-hint proxy does not improve; and simple extra capacity can explain the selected rescue opportunity at least as well.

Do not respond by adding fields until one works on these four parents. That would convert a prespecified gate into descriptor fitting. The tested bucket family should be treated as closed unless materially new independent evidence changes the premise.
