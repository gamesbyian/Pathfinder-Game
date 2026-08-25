# Learned-failure reason-language audit

> **Status:** concluded-positive
> **Last evidence:** 2026-08-24 — current queue, prune/lower-bound implementation, historical transposition and shadow-probe evidence
> **Decision:** do not build generic conflict learning or another exact-state cache. Existing evidence closes most obvious reason families or already implements their useful special cases. If queue item #6 advances, the smallest new proof-oriented target is a bounded **joint dynamic residual-interface/resource incompatibility** reason, evaluated offline before any learned store.
> **Remaining gate:** none for this audit; any implementation experiment gets its own prespecified report/gate.
> **Evidence role:** forensic
> **Selection:** observational, after reviewing current code, current queue/synthesis, and historical measured candidates

This report audits what Pathfinder already knows about failure memory and proof-producing pruning, with one narrow question:

> Which failure explanations are actually still worth testing as reusable learned reasons, rather than already-existing memoization, already-cheap propagation, or previously-measured low-yield ideas?

It does not change production solver behavior and does not reopen closed experiments. Current execution priority remains [`../docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md), especially queue item #6; durable representation vocabulary remains [`../docs/solver-residual-state-representation.md`](../docs/solver-residual-state-representation.md).

## Executive result

The apparent design space is much smaller than the literature vocabulary makes it look.

Pathfinder already has all of the following:

- high-recurrence **repair-local experience memory**;
- measured weak exact-state recurrence in systematic DFS;
- measured negligible exact-equivalence opportunity in beam candidate pools;
- pure sound memoization of abstract lower-bound functions on only the state fields those functions mathematically depend on;
- several cheap reason-producing structural/resource prunes;
- a 5,518-branch CP-SAT-labelled shadow harness that already rejected three prominent middle-layer reasoner families as too narrow or redundant;
- one dynamic MustCross resource propagator that crossed the shadow gate and later produced a large level-blind population effect.

Accordingly, “add CDCL/nogood learning” is not a useful next instruction. The remaining question is narrower:

> Can a comparatively expensive sound residual failure be summarized by a small **joint interface/resource contradiction** that (a) applies to multiple genuinely different exact states, (b) becomes knowable earlier than current rejection, and (c) avoids enough work to pay for deriving and checking it?

If no such reason family appears, broad learned-failure architecture should remain closed.

## 1. Repair memory is not logical learning

[`../modules/solver/nogood-cache.ts`](../modules/solver/nogood-cache.ts) deliberately scopes its cache to one `repairSearchFromGate` call and says explicitly that a hit means a repeated randomized-walk dead end, **not proof that the state is unsolvable**.

The state identity itself is deliberately detailed: current position, unique visited cells and `edgeUsage`, portal jumps, exact intersection count, objective masks, per-MustCross counts, surround-neighbour state, flipper use and portal-jump state. The point is to avoid confusing distinct repair states.

Historical Stage-0 evidence in [`2026-08-07-repair-nogood-cache.md`](2026-08-07-repair-nogood-cache.md) found very high recurrence within a repair call: 53.65% to 98.09% repeated dead-end signatures across seven hard repair-close levels. The shipped cache reduced work and produced one extra solve in the initial 20-level fixed-node comparison.

That is strong evidence for **experience memory in randomized repair**. It is not evidence for a hard learned clause. `takePly` is not an exhaustive proof procedure, so a state that dead-ended once under one randomized continuation is not thereby UNSAT.

Some historical comments use shorthand such as “already-known-fruitless subtree” or “already-proven-dead work.” Read those in the scoped repair sense above. The current queue already states the semantics correctly: “this randomized continuation dead-ended before,” not logical UNSAT.

This distinction matters because generalizing a repair signature would otherwise create exactly the unsafe transition the learned-failure literature warns about: approximate experiential similarity silently becoming a categorical prune.

## 2. Exact full-state caching has already had its premise test

The July DFS transposition investigation is a particularly useful guardrail because it measured both the tempting loose answer and the sound one.

[`2026-07-17-dfs-state-revisit-rate-transposition-premise.md`](2026-07-17-dfs-state-revisit-rate-transposition-premise.md) first measured a reduced signature and saw apparent 92–99% duplication. Once the signature was corrected to include the future-relevant visited-cell identity, `edgeUsage`, portal history and objective state, the real recurrence fell to roughly **0.5–16%**, with most runs around 1–2%. The instrumentation cost of constructing that complete identity was itself material.

The same repo history contains a concrete correctness failure from an under-keyed transposition memo: L135 could lose its only viable completion because states with different visited sets were merged. This is not a theoretical warning; Pathfinder has already paid for this bug class once.

Beam makes the ceiling still less attractive. The August beam dedup audit measured only about **0.019%** sound-signature duplication in roughly 11.4 million generated candidates. The shipped heuristic dedup key was empirically much coarser than true equivalence, reinforcing that “looks interchangeable to a heuristic” and “has the same legal future” are different claims.

Disposition: **do not revisit generic full-state DFS/beam transposition caching without materially new evidence.** Queue #6 already reflects this.

## 3. Pathfinder already performs safe abstract reuse where dependency is proved

The most instructive counterexample to “projection is unsafe” is not a nogood at all. It is the lower-bound memoization in [`../modules/solver/lower-bounds.ts`](../modules/solver/lower-bounds.ts).

`mustPassLowerBound` caches on `(pos, mpVisitedMask)` because, for a fixed prepared level, the bound is a pure function of those fields. `mustCrossLowerBound` similarly includes the pending MustCross mask and the per-cell crossing/axis state on which that bound depends. Different full paths may therefore share a cached value safely.

This is exactly the kind of abstraction discipline a learned reason would need:

1. name the queried future property;
2. identify every state field on which the proof actually depends;
3. prove omitted history cannot change that proof;
4. only then reuse across different exact histories.

Pathfinder therefore does not need a generic abstraction framework to demonstrate that sound projected reuse is possible. It already does it successfully for functions whose semantic dependency is tractable enough to prove.

The open question is whether a **categorical infeasibility reason** admits an equally small dependency set often enough to be valuable.

## 4. Most current hard-prune reasons are poor learning targets

The shared admissible gauntlet in [`../modules/solver/prune-gauntlet.ts`](../modules/solver/prune-gauntlet.ts) already rejects from overflow, distance, parity, MustPass/MustCross lower bounds, surround/adjacent-turn bounds, MustTurn deadlock, MustCross forced-neighbour deadlock, MustCross neighbour-budget deadlock, intersection deficit and residual connectivity.

Several are already compact explanations:

- pending MustTurn + both axes spent;
- pending MustCross + permanently blocked required neighbour;
- pending MustCross required-neighbour revisit demand exceeding free intersection budget;
- length/intersection lower-bound contradiction;
- goal/required objective absent from a safe residual reachability over-approximation.

For learning economics, however, “compact and sound” is not enough. The local MustTurn and MustCross deadlock checks are tiny bounded loops and typed-array reads. Replacing them with a reason store would likely make the check more complicated, not less. Distance/parity/deficit are cheaper still. The MP/MC lower-bound functions already memoize their expensive reusable subproblem directly.

These rules are valuable as **positive controls for explanation semantics**, but poor candidates for learned storage.

The one expensive shipped proof family is residual connectivity. That initially looks promising because a failed flood fill may have a smaller cut witness. However, Pathfinder has already tested the obvious narrow form of that idea.

## 5. The obvious separator/cut descendant is already measured and closed

The archived full shadow-harness record [`../docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md`](../docs/archive/snapshots/solver-shadow-eval-harness-2026-08-20.md) records a dedicated residual articulation/pendant-chamber reasoner.

The grown atlas contains 397 eligible levels and 5,518 CP-SAT-labelled sibling branches. The single-articulation resource-spectrum probe remained sound but applied to only **25/5,518 branches (0.45%)** and produced **7 unique dead-branch catches** beyond the existing gauntlet, about 0.4% of the atlas’s missed-dead population. The report explicitly closes that scoped production direction.

This is important for learned failure because “cache a small separator certificate” sounds new at the architecture level while being old at the mechanism level. The cheapest, most obvious separator shape has already failed the prevalence/yield gate.

That does not prove every cut-capacity reason is useless. It does mean a new separator proposal must identify genuinely different terrain, such as multi-interface capacity or resource-coupled cuts, rather than relabel the pendant-chamber experiment.

## 6. Joint-obligation and narrow backward-envelope probes are also mostly spent

The same shadow campaign tested two other middle-layer reasoners at scale.

The joint MustPass/MustCross tour bound applied to 659/5,518 branches, so its underlying mechanic combination is not rare. Yet it found only **one** dead branch beyond existing pruning. The separate existing MP and MC MST-style bounds were already capturing almost all useful information in that relaxed joint-tour model.

The narrow backward goal-approach envelope was rarer still: only 2/5,518 applicable branches, both already caught by the gauntlet.

These results are useful negative evidence for learned reasons. A logically valid explanation language can still have almost no marginal information after the existing gauntlet. Recurrence of a redundant reason does not create value.

## 7. Dynamic MustCross opportunity cost is the strongest positive precedent

The exception is `PRUNE_MC_NEIGHBOR_BUDGET`.

This rule asks a genuinely state-dependent resource question: which neighbours of pending MustCross passes have already been consumed, how many distinct forced revisits does that imply, and can the remaining **free** intersection budget pay for them?

Its evidence chain is unusually strong:

- 19 unique dead catches beyond the existing gauntlet in the oracle-labelled atlas;
- zero applicable-live false rejects there;
- 97,812 valid stored paths / 8.5 million replayed steps with zero violations;
- after caller-policy correction, a level-blind Corpus-2 A/B of **611 → 665**, 59 gains / 5 losses, while using less canonical work.

See [`2026-08-11-dynamic-resource-frontier-synthesis.md`](2026-08-11-dynamic-resource-frontier-synthesis.md).

The important lesson for #6 is not “cache this reason.” The live predicate is already cheap. The lesson is that **dynamic residual opportunity cost can contain major information that root/static descriptors and independent scalar bounds miss**.

That points toward richer joint incompatibility as the most defensible place to search for a reusable certificate.

## 8. What remains genuinely open

After reconciling the current queue, implementation, transposition history and shadow results, I found no comparable measured Pathfinder experiment that closes this combined family:

> a small set of residual obligations/interfaces is individually feasible under current relaxations, but no mutually compatible combination can satisfy the remaining exact resource/topology state.

This includes closely related proof shapes:

- two or a few pending MustCross cells whose individually legal remaining straight-pass modes cannot coexist;
- MustTurn / adjacent-turn / surround obligations whose remaining entry/exit modes conflict after edge-axis history is considered;
- sufficient scalar length/intersection slack but no **attainable** exact resource vector in a bounded residual abstraction;
- a small cut/interface whose remaining traversal capacity and required obligation crossings are jointly incompatible;
- a small assumption core from the exact model that projects onto such an interface/resource contradiction.

This is one seam, not five separate projects: **joint dynamic residual-interface/resource incompatibility**.

It is also where three independent evidence lines meet:

1. static MustCross forced-edge propagation was previously falsified because legal completion patterns were more varied than the static rule assumed; its own conclusion said a correct descendant would need compatible local-pattern enumeration;
2. dynamic MustCross neighbour-budget reasoning was strongly positive;
3. the Aug-24 literature synthesis independently elevates exact-resource nonattainment, bounded interfaces and structural certificates while explicitly rejecting a broad CDCL/LCG build.

## 9. Smallest next experiment if #6 is selected for coding work

Do **not** begin with a learned-reason store. First ask whether a reason worth storing exists.

Use the existing shadow/reference infrastructure and treat the current 5,518-branch atlas as development/forensic evidence, not confirmation. The first candidate should be one narrow bounded reasoner over a small residual interface, preferably MustCross-first because its transition semantics and prior positive/negative evidence are unusually well characterized.

A useful first-cut contract is:

- strict small cluster cap;
- enumerate only legal/permissive local completion **interface modes**, not full paths;
- retain exact or one-sided-safe `(steps, intersections, axis/interface)` resource information;
- reject only when **no compatible mode combination** can meet the remaining target under the relaxation;
- otherwise pass or abstain;
- emit a compact proof descriptor explaining which interface modes/resource target made the set empty.

This is a reason-producing propagator in shadow mode. It becomes a learned-failure experiment only if the emitted reason descriptors recur across genuinely different exact states.

### Measurements that matter

For every supported branch, record:

1. dead/live oracle label and existing-gauntlet verdict;
2. new reasoner verdict and abstention;
3. unique catch beyond current pruning;
4. explanation/reason key;
5. exact-state identity distinctness within each reason key;
6. independent parent/level count for each recurring reason;
7. decision depth and, where a search trace can supply it, how much later the current solver discovers the failure;
8. derivation/checking cost.

Do not count repeated appearances of the same exact state as structural generalization. Do not count sibling variants from one parent as independent transfer evidence.

### Value-of-information gate

Use existing measured probes as calibration rather than inventing a success threshold in a vacuum.

- The pendant-chamber reasoner produced 7 unique catches on the 5,518-branch atlas and was closed as too narrow.
- MC neighbour-budget produced 19 unique catches and was strong enough to justify live evaluation, eventually yielding a major population effect.

A more expensive joint-interface reasoner should therefore either produce clearly more unique/early information than the 7-catch closed comparator, approach or exceed the neighbour-budget signal, **or** demonstrate unusually early/high-cost subtree avoidance that makes a smaller catch count economically compelling.

If it cannot do that, close the scoped reasoner before adding any cache, clause database, explanation minimizer or backjumping machinery.

## 10. When learning would finally be justified

Only after the reasoner passes the detection gate should a second experiment ask whether storing reasons helps.

The learning gate is stricter than the prune gate:

- the same sound reason must recur across multiple **different exact states**;
- recurrence should occur early enough within a solve to amortize derivation/storage;
- lookup must be materially cheaper than recomputing the underlying proof;
- the reason key must have a proved scope, including every state field whose omission could change validity;
- reason retention should be bounded and measured, not assumed useful because SAT solvers retain clauses.

If a reason is strong but does not recur, ship/test it as an ordinary propagator instead. If it recurs but is cheaper to recompute, do not store it. If it is predictive but not proved, it belongs in ranking/retention/repair diagnostics, not the prune path.

Conflict-directed backjumping remains downstream even from this. First demonstrate a recurrent sound reason whose participating commitments are meaningfully shallower than the node where failure is detected. Otherwise chronological backtracking has nothing profitable to jump over.

## 11. Disposition table

| Candidate | Current Pathfinder evidence | #6 disposition |
|---|---|---|
| Repair exact-signature dead-end memory | 53.65–98.09% recurrence on measured hard repair calls; shipped work savings | Keep as scoped experience memory; **not logical UNSAT** |
| Exact DFS transposition | Sound recurrence mostly ~1–2%, 0.5–16% range; expensive identity | Closed absent new evidence |
| Sound beam equivalence | ~0.019% candidate-pool duplicate ceiling | Closed as optimization direction |
| Loose/heuristic state merging | Historical correctness risk; heuristic beam key differs from exact equivalence | Never promote to hard cache without proof |
| MP/MC lower-bound memoization | Existing exact abstract memoization on proved dependency fields | Already implemented; model for safe projection |
| Parity/distance/deficit/local deadlocks | Sound and extremely cheap | Recompute; storage unlikely to pay |
| Single-articulation chamber certificate | 0.45% applicability, 7 unique catches | Scoped form closed |
| Joint MP+MC tour lower bound | Common applicability, only 1 unique catch | Scoped form closed as redundant |
| Single-neighbour goal envelope | 2/5,518 applicable, 0 unique catches | Scoped form closed |
| MC neighbour-budget | Strong shadow + path replay + level-blind population effect | Existing positive dynamic propagator; do not cache merely to call it learning |
| Joint dynamic interface/resource nonattainment | No comparable measured closure found in reviewed current evidence | **Best remaining bounded certificate seam** |
| Generic CDCL/LCG / clause DB / MUS minimization | No prerequisite compact recurring reason demonstrated | Do not build |

## Bottom line

The learned-failure literature does not point Pathfinder toward “more memory” in general. Pathfinder already has examples at all three semantic levels:

- approximate/experiential memory that is useful in randomized repair;
- exact memoization that is safe when the queried function's dependency is proved;
- sound structural propagation that can materially change search when it captures real dynamic opportunity cost.

What is missing is one evidence-bearing bridge between those: a **sound, compact, nontrivial residual contradiction that occurs in multiple different exact states and is expensive enough that remembering it could matter**.

The best current place to look is not another full-state signature, another static geometry feature, or generic clause infrastructure. It is a bounded joint dynamic completion-interface/resource contradiction, shadowed first against the existing exact atlas. If that premise fails, queue #6's learned-failure branch can be demoted cleanly without having built a CDCL-shaped subsystem to discover the answer.
