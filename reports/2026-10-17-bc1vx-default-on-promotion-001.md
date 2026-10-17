# BC1-VX default-ON promotion: production integration 001

> **Status:** concluded-positive
> **Last evidence:** 2026-10-17 — frozen representative production random-300 A/B +7/−0, disjoint cold-64 +2/−0, previously frozen historical solved-control-150 current 149→150 (+1/−0); all referee-valid, aggregate canonical work lower in each paired population.
> **Decision:** promote theorem BC1-VX cut-vertex/fresh-volume pruning to default-ON in production under the same fresh-connectivity beam seam. Retain the explicit feature-off control for rollback, while the bridge-only smaller experimental form stays OFF.
> **Remaining gate:** ongoing observed production correctness, explicit opt-out regression and future independent cross-construction transfer; no more redundant promotion A/B on the same frozen cohorts. Full solver CI/build passed on source branch #2171 at f3388168; integration branch CI must independently pass before merge.
> **Research question:** `WS2-CUT-BALANCE-PROJECTION`
> **Evidence role:** discovery
> **Selection:** production promotion uses the preexisting BC1-VX 300/64/150 development and regression evidence; no new level selection here.
> **Population identity:** representative 300 GHA 36772815197 / 37052447194; disjoint 64 GHA 38976765549; solved-control 150 GHA 39007506080; witness soundness 821,270 C2 plus 39,870 C1 states.
> **Inference scope:** production decision under tested Corpus-2 and historical regression samples. Independent cross-construction transfer untested; independent published regression beyond ordinary CI remains a separate monitoring question.
> **Production effect:** default-ON of `STRATEGY_BC1_VERTEX_VOLUME_PRUNE`, preserving an explicit OFF rollback; bridge-only experiment stays OFF.

## Decision case

The theorem uses a goal-free cut-vertex subtree, once all free intersections have been consumed, to bound fresh usable volume. Witness replay: **0 false prunes in 861,140 referee-valid states**. The established BC1 fresh connectivity gate ensures the flood is current and reused; the same typed DFS serves both BC1 and volume, without newly charging canonical work. Vertex mandatory-conflict rejection remains disabled because its separate consumer lost net solves during diagnostics.

Three independent *sample sets* (not an untouched distribution) at the ordinary level-blind 50M-node / 67M-base-work additive-retry production envelope have compatible results:

| Population | Default-OFF control | Flag-ON treatment | Treatment-only gains | Losses | Total canonical work |
|---|---:|---:|---:|---:|---:|
| Representative random-300 | 225 | 232 | 7 | 0 | −4.2% |
| Disjoint cold-64 | 49 | 51 | 2 | 0 | −1.19% |
| Previously frozen historical solved-controls 150 | 149 | 150 | 1 (R02401) | 0 | −3.748% |

The solved-control denominator is **149 current successes**, not 150. The R02401 gain is rediscovery on a historically solved level, not untouched cold novel content. The 300/64 are disjoint from each other but share previously explored Corpus 2, so evidence is strong within this development regime but not cross-construction transfer.

## Implementation boundary and rollback

1. Remove the vertex flag only from `OPT_IN_FEATURES`, keeping bridge-only `STRATEGY_BC1_VOLUME_PRUNE` OFF. Do not remove either feature key.
2. Fix the beam dispatch in `search.ts`: an omitted normalized config must select the combined BC1/volume DFS under the newly default-ON vertex flag, not accidentally the old BC1-only fallback.
3. Fix **both** `bc1-beam-shadow.ts` vertex checks so omission means the same promoted default while explicit `false` disables vertex cuts. The bridge-only flag never activates by omission.
4. Add direct config-polarity and sparse-normalizer/explicit-disable tests. Verify that user/operator `--disable-flags=STRATEGY_BC1_VERTEX_VOLUME_PRUNE` still makes the historical control available for regressions.
5. After tests, update canonical workstream/ledger and question result and mark this promotion as completed. No automatically added retry or additive work budget. The more aggressive unadopted mandatory form is untouched.

Any solver result regression at published/regression checks or violation of the pruning witness invariant blocks merging, not something to hand-wave as expected randomness. Old branch #2171 CI was green at f3388168 after its portal fixture isolated unrelated pruning. Current-main integration CI is required before merge. This report records a bounded production integration decision, not a universal solved-set guarantee.
