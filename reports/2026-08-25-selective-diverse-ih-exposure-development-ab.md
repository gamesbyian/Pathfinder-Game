# Selective diverse-IH exposure development A/B

> **Status:** concluded-positive in development; superseded by failed independent confirmation
> **Last evidence:** 2026-08-25 — development run `32911007113`; independent confirmation `32912881453`
> **Decision:** development evidence showed a strong +9/-0 effect on the feature-defined Corpus-2 population, but the exact treatment is closed after fresh confirmation produced 0 gains / 0 losses. Do not promote or retune this rule as a general policy.
> **Remaining gate:** none for this exact treatment. Any successor portfolio rule must be newly prespecified and independently confirmed.
> **Evidence role:** development/tuning only
> **Selection:** feature-defined from the post-976 Corpus-2 residual analysis

## Treatment

On all Corpus-2 levels satisfying `detectArchetype(level) === 'high-intersection-burden'`, `reqInt >= 7`, and `mustCross < 2`, append the existing `beam:intersectionHarvest@beam5000(diverse)` action to the two very-high-intersection policy bundles where its plain wide sibling was already considered appropriate.

No beam semantics, width, scoring, retry policy, total work, or other ladder behavior changed. The new action received no bespoke minimum-budget floor. Both arms used solver revision `fc696bac37bffea9ca8b8dbc7616639224fbf4dc`, a strict 67M canonical-work envelope, and a 50M node ceiling.

The population was selected by features across the entire Corpus-2 corpus, including already-solved levels, rather than by known residual IDs. Materialization produced **262/1700** levels.

## Result

Run `32911007113` completed all 16 shards and the frozen reducer successfully.

| metric | control | treatment |
|---|---:|---:|
| solved | 122/262 | **131/262** |
| aggregate work | 11,846,980,349 | **11,795,480,124** |
| gained solves | — | **9** |
| lost solves | — | **0** |
| work reduction | — | **0.43%** |

The nine gained levels were `R00355`, `R02020`, `R02216`, `R02262`, `R02683`, `R02762`, `R02820`, `R02988`, and `R03260`.

The prespecified development rule required zero solve losses plus either at least one gained solve or at least 10% aggregate-work reduction. The treatment therefore earned independent confirmation.

## Confirmation disposition

Fresh `confirm-broad-002` run `32912881453` used the exact frozen treatment on 256 independently generated levels and returned **126/256 → 126/256**, with **0 gains, 0 losses**, and about **0.01% more** treatment work. The frozen confirmation gate failed.

Therefore this development result is retained as evidence that Corpus-2 contains exploitable portfolio-routing structure, but not as evidence for a general solver improvement. The exact treatment is closed and `transfer-envelope-001` was not earned.
