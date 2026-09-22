# WS1 remaining-length semantics and answerability audit 001

> **Status:** active
> **Last evidence:** 2026-09-22 — static reconciliation of the retained H3 allocation evidence, the frozen late-continuation model, the recovered elite-prefix bridge implementation, and Pathfinder counted-length semantics.
> **Decision:** keep the recovered elite-prefix treatment frozen as its exact tested form, `requiredLength - destroyIdx`. Treat it as an index-depth budget-frontier ordering proxy, not as exact remaining-length feasibility and not as the same question as WS1 late continuation. Add observational counted-length residual telemetry before Stage A; do not reorder by the new telemetry.
> **Remaining gate:** run the already-frozen 20-level Stage A only after the trace records both the frozen ordering key and exact counted-length residual. The Stage A decision rule remains unchanged; a negative closes this tested intra-solve form without retuning.
> **Research question:** `WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE`
> **Evidence role:** static/offline answerability + measurement hardening

## Question decomposition

The repository currently contains several superficially similar uses of “remaining length.” They are not interchangeable.

| Form | Unit / decision boundary | Quantity | Evidence status | What it can support |
| --- | --- | --- | --- | --- |
| WS1 late continuation | between whole production actions | prior response + canonical work + next stage | retained development + temporal robustness; fresh confirmation pending | whether a later same-stage action is worth attempting after censored work |
| H3 allocation | across rows under one simulated shared pool | exact counted length remaining at a retained cull state | independent population transfer confirmed | cross-row prioritization value for a fixed completion operator |
| elite-prefix bridge | candidates inside one `elitePrefixDfsRepair` call | frozen `requiredLength - destroyIdx` index-depth proxy | preflighted/inert; no outcome result yet | whether ordering the existing candidate pool changes who receives the shared 90k node tranche |
| completion distance / near miss | descriptive state quality | various residual/depth/badness measures | mixed historical evidence | nomination/diagnosis only unless a consumer is separately tested |
| exact remaining-length feasibility | current legal state | counted remaining steps plus all other obligations/geometry | not supplied by a scalar length residual | sound feasibility only when proved by an exact/reference predicate |
| winner-lineage hindsight | post-hoc pre-winner trajectory | future winner/outcome identity and spent work | archaeology only | offline diagnosis; never a runtime feature |

## Static result 1: the intra-solve bridge is a budget-frontier ordering test

`elitePrefixDfsRepair` rebuilds the exact selected prefix before every candidate and then runs deterministic bounded DFS. A candidate does not feed its intermediate result into the next candidate inside the same call; the best failed intermediate is returned only after the candidate loop ends.

Therefore, with an identical candidate multiset, candidate caps, search primitive and seed:

- if every candidate receives its full intended search and none solves, reordering cannot create a different set of candidate-search results;
- ordering becomes decision-bearing when the shared **90,000-node** call cap prevents later candidates from running or fully running;
- ordering can also reduce work when a successful candidate is reached earlier and the call returns immediately.

At the nominal **15,000-node** per-candidate cap, six full-cost attempts consume the entire 90k tranche while the grid contains up to twelve candidates. Quick exhaustion can expose more than six. The exact count is therefore observed, not assumed.

This is narrower than a generic “remaining length improves search” claim. The bridge asks whether the frozen ordering key allocates a scarce intra-call budget better.

## Static result 2: H3 and the recovered branch do not use identical length quantities

The retained H3 feature builder replays the cull prefix through native solver state and computes:

`lengthRemaining = requiredLength - (stepsTaken - portalJumps)`

That is Pathfinder's counted-length semantics. `getRealLengthFromState` likewise defines counted length as:

`path.length - 1 - portalJumps`

The recovered elite-prefix branch instead freezes:

`remainingLength = max(0, requiredLength - destroyIdx)`

where `destroyIdx` is a path-array index.

These quantities are equal on prefixes with no free portal jump before the candidate point. They can diverge on portal-bearing prefixes because `destroyIdx` counts the path-array transition while Pathfinder length does not count a portal jump.

This is not a reason to silently “fix” the treatment before Stage A. The recovered branch's exact tested form must stay frozen. It is a reason to stop describing the treatment as exact H3 length transport and to measure the divergence observationally.

## Static result 3: remaining length is allocation signal, not exact feasibility

H3's transfer result only became simulatable because retained evidence contained both:

- a cheap ordering feature, `lengthRemaining`; and
- the actual deterministic completion cost/outcome, `reachNodes` / reconstructable.

On the independent transfer, only **12/175** screened rows were reconstructable within the 2M completion cap. Ascending exact counted length captured **10/12** achievable rescues at 20% shared budget, but short remaining length did not make the other 163 rows feasible.

So the evidence supports **prioritization correlation under scarcity**, not a scalar feasibility theorem. Any exact feasibility claim remains a different question requiring a sound predicate/reference result.

## Static result 4: WS1 late continuation is orthogonal

The frozen WS1 legal-signal model acts at an action boundary. Its retained positive is narrowly dominated by same-stage continuation after censored prior work. It asks whether another whole action should receive work.

The elite-prefix bridge acts *inside one repair action* after a stagnation trigger. It asks which current-input candidate receives a bounded completion-search tranche first.

No retained result currently establishes an interaction between these two effects. A future scheduler could eventually contain both layers, but combining their evidence now would double-count different units and blur causal boundaries.

## What retained evidence can and cannot answer

Retained evidence is sufficient to establish:

1. H3's cross-row allocation effect transferred independently;
2. the old elite-prefix mechanism in legacy order was net-negative at its tested constants and its additive retry did not rescue failures;
3. the recovered treatment changes only candidate order and is production-inert by default;
4. the treatment's effect, if any, must arise at the intra-call budget frontier or an earlier successful return;
5. the recovered ordering key is an index-depth proxy that can differ from exact counted residual on portal-bearing prefixes.

Retained evidence is **not** sufficient to establish:

- which historical elite-prefix candidate attempts were skipped by the old 90k cap;
- whether a treatment-only successful candidate existed in those skipped positions;
- candidate-level historical nodes, portal-jump count, or exact counted residual;
- whether index-depth and exact counted-length ordering differ on the frozen 20-row candidate populations;
- a Stage A solve/work verdict.

The 2026-08 elite-prefix report did not retain the required candidate-attribution trace. Absence of that observation is an earned acquisition gate, not a zero.

## Measurement hardening before Stage A

Keep the treatment ordering key unchanged. Extend the already-research-only trace with, per attempted candidate:

- `indexRemainingLength` / existing `remainingLength` = frozen treatment key;
- exact `countedRemainingLength` after replaying the candidate prefix through current solver state;
- portal jumps present at that candidate prefix.

This telemetry is explanatory only. It must not influence candidate ordering or Stage A's frozen decision rule.

The trace then answers a useful secondary question without another experiment: on the actual Stage A candidate population, how often does the frozen proxy disagree with exact counted residual, and do any decision-bearing cap-frontier candidates sit in that disagreement set?

## Routing

The route remains:

`raw question -> answerability -> cheapest discriminator -> route`

- already-retained evidence separated the action-level, cross-row and intra-solve questions;
- static code analysis identified the exact mechanism by which intra-solve order can matter;
- static semantics identified a measurable proxy-vs-exact distinction;
- the missing candidate attribution was not retained;
- therefore the smallest earned acquisition remains the frozen 20-row Stage A, now with observational counted-length telemetry.

Do not refit fractions, elite count, per-candidate cap, total cap, sort key, seed, or population before that verdict.
