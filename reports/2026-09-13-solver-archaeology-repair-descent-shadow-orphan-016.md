# Solver archaeology: repair descent-shadow orphan

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — archived July repair-stagnation plan reconciled against August-September repair reachability/reconstructability work and current WS6 authority
> **Decision:** preserve the July descent-aware shadow probe as an unresolved diagnostic question, not as a repair operator. Later WS6 work classified reconstruction from already-live prefixes and showed most exact-live repair cases are operator-incapable, but it did not identify which earlier descent commitments make a later near-miss unreconstructable.
> **Remaining gate:** only if current repair/first-loss evidence again indicates an interior/early-commitment deficit, run a bounded read-only descent observer before designing a new operator. A null or heterogeneous result closes the descendant.
> **Evidence role:** archaeology / premise recovery
> **Selection:** explicit "one avenue not yet shown to hit the wall" in the archived repair-stagnation plan, then traced against every later repair-reachability descendant found in history.

## 1. July established an append-only prefix-editing wall three different ways

The archived `repair-search-stagnation-escape-plan.md` records a unusually coherent negative chain.

Three independent mechanisms reached the same structural boundary:

1. **Exact-copy path relinking:** a guide suffix legal under one prefix rapidly became illegal under another prefix's visited/axis/constraint history. Exact transplantation produced zero improvement.
2. **Near-solved arming guards:** protecting states only after they became near-solved failed twice, because the harmful steering occurred during the **descent toward** the near-solved state.
3. **turn-bias × closeLengthGap:** `closeLengthGap` fired 1,659 times on the exact length-plus-must-turn residual for R02077 but exhausted at the splice floor; the completion required changing path material earlier in the retained prefix.

The plan's synthesis therefore stopped recommending more bounded local suffix operators. Its explicit remaining observational question was a **descent-aware shadow-mode probe**: observe earlier decisions on would-be-improving restarts and ask what a selective bias/operator would have changed before the path entered the terminal residual.

Stage 4 strategic oscillation was explicitly deprioritized in favor of that observer.

## 2. Later repair research answered a different question

August-September WS6 work became much more rigorous about exact liveness and reconstructability.

The repair-retreat programme used CP-SAT/live-prefix labels and eventually classified a larger independent population. By the September 2 closeout:

- 28 exact-live retreat cases had been classified;
- **6/28 (21.4%)** were reconstructable by `closeLengthGap` at some measured cost;
- **22/28 (78.6%)** were operator-incapable under that native reconstruction test;
- reconstructable cases had a heavy-tailed cost continuum, roughly 0.22x to 317x the production close-gap budget rather than a clean cheap/expensive pair of regimes.

Later first-loss-frontier work seeded repair directly at exact/proven-live beam-cull-depth states:

- 4/28 were reconstructable;
- 24/28 exhausted the diagnostic ceiling;
- the rate was statistically compatible with the broader repair-reachability population.

These results answer:

> Given a live partial path at this exact point, can the current repair/completion operator reconstruct a solution, and at what cost?

They do **not** answer:

> Which earlier commitment during the repair descent caused this eventually-live-or-dead near-miss to become inaccessible to the operator, and could a small interior revision have prevented it?

That distinction is the archaeology residue.

## 3. Why this is not "try a bigger repair operator"

The historical plan is useful precisely because it proposed **shadow observation before intervention**.

A modern version should not introduce strategic oscillation, generic LNS, deeper rollback, or another prefix DFS. The existing evidence already says raw rollback distance and nominal neighborhood size are poor proxies for causal repairability.

The observer question is narrower:

- when a repair trajectory sets a new best or enters a later exact/operator-incapable residual, retain a bounded trace of the preceding decisions;
- compare those decisions with a compatible successful/known-live continuation where available;
- identify commitment classes rather than cell identity: must-turn arrival/exit, crossing placement/axis, portal/flipper use, obligation order, separator traversal, or other future-relevant state;
- ask whether a **small recurring dependency set** changes before the terminal badness plateau becomes visible;
- remain read-only. Do not steer repair using the answer in the same experiment.

The desired output is a causal candidate such as "this turn+length residual becomes operator-incapable after these two coupled commitments become fixed," not a new scalar badness feature.

## 4. Relation to current WS6

Current workstream authority already gives WS6 the correct reopen boundary:

> reopen when continuation needs interior/early commitment revision.

The descent-shadow orphan is a cheap way to decide whether that boundary has actually been crossed.

It should therefore remain supporting archaeology rather than a new queue item. If current Class-5 or handoff evidence produces a recurring repair-relevant phenotype, this observer can be rejoined before implementing an interior-edit mechanism.

Conversely, if current evidence remains dominated by failures that no native repair operator can reconstruct even from exact-live prefixes, generic interior editing is not earned merely because the July plan once mentioned it.

## 5. Relation to dependency-conditioned repair from the uploaded LNS report

The uploaded LNS research emphasizes that useful neighborhoods are defined by interacting constraints/variables, not raw geometric radius or number of relaxed decisions. Pathfinder's own exact rollback work independently reaches the same conclusion: demonstrated path divergence can overestimate or underestimate true minimum repair distance dramatically.

The descent observer supplies the missing Pathfinder-specific bridge between those ideas:

`terminal near-miss -> preceding commitment trace -> recurring coupled dependency -> only then a candidate neighborhood`

That is materially different from importing CP-LNS wholesale.

## 6. Stop conditions

Close this descendant cheaply if any of the following holds on an independently selected current population:

- approach traces are highly heterogeneous and no commitment class recurs;
- the identified commitment differences occur only after the path is already exact-dead;
- the smallest causal set is essentially the whole prefix/history;
- the same dependency signal does not reproduce across unrelated parents;
- an existing current operator already revises the nominated commitments and still fails under comparable work;
- collecting the observer requires enough search/exact-oracle work that a more direct current microscope answers the causal question more cheaply.

## Bottom line

July did not leave an untested repair **operator** worth resurrecting. It left an untested **observer** after three different operators independently hit the same append-only prefix wall.

Later WS6 work proved that repair reconstructability is heterogeneous and usually absent even from exact-live prefixes, but it did not explain which earlier commitments create those hard residuals. The old descent-aware shadow probe is therefore still a legitimate, bounded diagnostic descendant if current evidence earns an interior/early-commitment question.