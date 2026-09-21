# Required-length / intersection partial compilation audit 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-20 — source audit found reqLen/reqInt changes invalidate only a narrow subset of preparation products.
> **Decision:** Required-length/intersection sweeps are technically clean partial-compilation cases, but current preparation cost is small.
> **Remaining gate:** Promote only if solve-relative measurements show enough repeated-preparation cost to justify implementation.
## Question

When `scripts/req-length-sweep.mjs` changes only `reqLen` across otherwise identical levels,
which parts of `prepLevel()` actually need to be rebuilt?

The same question applies, more strongly, to a hypothetical `reqInt` sweep.

## Source audit

Current `prepLevel()` was searched for all direct/indirect challenge-metric dependencies.

### Direct reqLen / reqInt dependency inside prep

The only current challenge-metric-dependent prep assignment found is:

```ts
prep.mustMaskForDFS =
    getRequiredPathCoverageRatio(level) >= DENSE_LEVEL_COVERAGE_THRESHOLD
        ? 0
        : prep.initialMustMask;
```

`getRequiredPathCoverageRatio(level)` uses `level.requiredLength`.

No direct `level.requiredIntersections` use occurs in `prep.ts`.

### Apparent parity dependency that is actually static in prep

`prepLevel()` calls:

```ts
const parityStructure = describeStaticParityStructure(level);
```

That helper does compute each gate's required twist parity using `requiredLength`.

But `prepLevel()` consumes only:

```ts
parityStructure.twistPortalPairs
```

for building `parityPortalDistMaps`.

Whether a portal pair is a twist pair depends only on endpoint checkerboard parity, not reqLen.

So the expensive parity distance products built in prep are invariant across reqLen changes.

The reqLen-dependent gate parity decision is made later by solve/orchestration logic.

## Broad prep products that remain invariant

For a level whose only delta is reqLen or reqInt, the following current preparation families are
structurally unchanged:

- grid width / packed address geometry;
- static blocker/passability structures;
- static neighbor table;
- dead-flipper preprocessing;
- gate flags;
- goal distance maps / dense goal arrays;
- objective distance maps / dense arrays;
- must-pass and must-cross indexes;
- pairwise must-pass/must-cross distances;
- must-cross approach maps;
- flipper indexes / axes / approach distances;
- portal-pair geometry and twist-portal distance maps;
- optional parity-phase goal distance arrays;
- landmark neighbor/index/distance structures;
- initial obligation masks;
- false-goal static sets;
- static joint-obligation cluster candidates.

The challenge metric changes how search **uses** much of this information. It does not require the
information to be reconstructed.

## What must remain solve/query-local

A partial compiler cannot merely reuse a complete old `PrepLevel`.

Challenge metrics affect later execution semantics:

- `level.requiredLength` is read throughout exact-length search;
- `level.requiredIntersections` is read throughout resource/prune logic;
- `getActiveGates` uses reqLen parity;
- routing-regime classification uses both required path coverage and required intersections;
- attempt selection/budget policy can therefore change;
- `mustMaskForDFS` must be recomputed when reqLen crosses the dense-coverage threshold.

So the reusable object must represent **static compiled substrate**, while the current challenge
metrics and policy decisions remain in a fresh query/solve context.

This reinforces the earlier `CompiledLevel / SolveContext` boundary for semantic reasons, not only
speed.

## Important implication for the API shape

A future reusable static object should not retain the entire normalized level as its sole authority
for all fields if the intended consumer mutates reqLen/reqInt between queries.

A cleaner conceptual split is:

```
CompiledTopologyMechanics
    immutable geometry/object/derived tables

ProblemQuery
    requiredLength
    requiredIntersections
    current goal/gate policy inputs if query-varying

SolveContext
    budgets
    observers
    mutable search state
    metrics
    attempt-local configuration
```

For ordinary one-level solving, `ProblemQuery` can still simply reference the normal level object.

For controlled metric sweeps, it lets one static compilation answer multiple challenge queries.

## Why this is different from same-level ablation reuse

Ablation reuse:

- exact same normalized level;
- query metrics unchanged;
- only solver configuration differs.

ReqLen/reqInt reuse:

- the mathematical problem changes;
- static board/mechanics compilation remains mostly invariant;
- policy/resource semantics must be refreshed.

So this is **partial invalidation**, not exact compiled-object reuse.

The two experiments should remain separate.

## Economics

Current fixed-cost evidence measured `prepLevel` medians of roughly:

- 0.51 ms published;
- 1.12 ms Corpus 1;
- 1.64 ms Corpus 2.

Therefore even a technically near-perfect invalidation boundary does not automatically justify a
production refactor.

Req-length sweeps can multiply that cost by:

- number of reqLen points;
- number of repeats.

This is a better reuse case than one-off solving, but implementation should still be charged against:

- actual sweep frequency;
- number of points per sweep;
- memory retained;
- code/API complexity.

## Minimal prototype if earned

Do not build an incremental dependency engine.

The first controlled prototype should be simpler:

1. extract the challenge-invariant static prep construction into one internal object;
2. derive a fresh tiny query-specific shell:
   - current level/query metrics;
   - recomputed `mustMaskForDFS`;
   - fresh mutable solve state;
3. run an existing req-length sweep cold vs reuse;
4. require exact solution/work/attempt parity for each query;
5. compare end-to-end sweep wall time and memory.

If that does not materially improve real sweep latency, close the lane.

## Disposition

- **Dependency premise:** strongly supported. Almost all current prep is challenge-metric invariant.
- **Generic incremental compiler:** not earned.
- **Simple static-substrate reuse prototype:** eligible only after solve-relative timing confirms enough batch share.
- **reqInt-only sweep:** conceptually even cleaner, since `prep.ts` has no direct requiredIntersections dependency.
- **Architecture lesson:** challenge/query scalars belong outside the long-lived static compiled substrate.
