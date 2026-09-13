# Solver archaeology: uploaded research crosswalk 010

> **Status:** inconclusive
> **Last evidence:** 2026-09-13 — uploaded architecture/LNS/feasibility/portfolio/beam reports were reconciled against current `main` and retained history.
> **Decision:** preserve two changed-premise seams: state-certified forced-chain traversal and dependency-conditioned repair neighbourhoods. Do not reopen generic dominance, beam-diversity, RCSP, or adaptive-portfolio frameworks from literature alone.
> **Remaining gate:** current Pathfinder evidence must first show material forced-chain work or recurring dependency-local repair structure before either seam can affect solver behaviour.

## Scope

This report continues the external-research crosswalk after `2026-09-13-solver-archaeology-uploaded-research-crosswalk-009.md`. It is archaeology evidence only. `docs/solver-optimization-workstreams.md` remains execution authority; `docs/solver-future-work.md` remains deferred/reopen authority.

The remaining uploaded reports were useful mainly as filters. Most broad techniques they recommend have already been tried, absorbed into the current operating model, or explicitly demoted. Two narrower mechanisms survive because retained Pathfinder history supplies direct, nontrivial evidence that the generic idea once mattered while the modern production question remains unanswered.

## 1. Certified forced chains / macro traversal have a positive specialized ancestor

The uploaded solver-aware architecture note proposes certified macro transitions for stretches with no genuine choice: forced portal transitions, one-exit corridors, locally forced turns, or other chains where every underlying state mutation can still be applied exactly while search avoids paying one full stack/frontier decision per step.

This is not merely an external suggestion. Retained SolverV2 history contains a direct ancestor.

Commit `e7d4a4e383ff7b040fa14f7634437203c46f3ff9` (2026-06-04) changed the old trap-spot DFS so that, after taking a move, a state with exactly one valid forward neighbour followed that move inline. Undo records for the whole one-successor chain were bundled until the next real branch. The commit described this as dramatically reducing search-tree/stack overhead on corridor-heavy levels. The same change also altered trap-connectivity frequency, so its end-to-end gain was bundled, but the forced-chain mechanism itself is explicit and mechanically distinct.

Current `main` does not contain that general traversal form. `modules/solver/search.ts` still represents ordinary DFS with one `DfsFrame` per reached state. It has a pre-move `PRUNE_MC_FORCED_FIRST_MOVE` mechanism for a known forced first step, but archaeology found no current arbitrary-depth one-valid-successor chain compression in core DFS/beam traversal.

### What this history proves

- Pathfinder semantics can support a state-certified one-successor chain implementation without replacing per-step state updates.
- The idea once existed in working code and was considered valuable enough to optimize a specialized exhaustive traversal.
- The mechanism disappeared with the old SolverV2/trap-search lineage rather than receiving a modern general-search falsification.

### What it does not prove

- Current residual misses spend meaningful canonical work inside such chains.
- Static geometric corridors are safe macros. Stateful legality can change after every visit, crossing, turn, portal, filter, or other transition.
- Removing stack/frontier bookkeeping would improve solve count rather than merely micro-optimizing already-cheap work.

### Smallest legitimate descendant

Observer first. On a bounded sample of current expensive misses, count maximal chains for which the authoritative post-prune legal successor set has cardinality exactly one. Report chain-length distribution, fraction of candidate/state work lying inside such chains, mechanics encountered, and whether chains occur inside the techniques that actually consume the residual budget.

Only if this share is material should a treatment follow. That treatment should compress **decision bookkeeping**, not semantics: apply every move through the normal state transition/prune machinery, preserve canonical `workSpent`, and stop at the first genuine choice. A static corridor compiler is not earned by the historical result.

## 2. Dependency-conditioned repair neighbourhoods are a changed premise, not another rollback-size tweak

The uploaded LNS/CP-LNS research repeatedly makes a stronger point than “use a bigger neighbourhood.” The effective neighbourhood after propagation matters more than nominal destroy size, and several modern methods choose relaxations from variable/constraint relationships. Dependency-curated LNS even finds that curating the candidate dependency universe can matter more than using a sophisticated selector inside it.

That maps cleanly onto a Pathfinder historical distinction.

### What Pathfinder actually tested

Commit `5f0848994d11a5ba40161d5143ddc9f129223c59` (2026-08-07) added `STRATEGY_REPAIR_ELITE_PREFIX_DFS`. It generalized `closeLengthGap` by launching bounded deterministic DFS from multiple points along elite near-miss prefixes. The operator was sound and demonstrably changed/improved intermediate search state, but its 20-level shared-budget A/B was net-negative: 4/20 solved versus 5/20 control, with at least one solve lost to node-budget displacement.

Later exact repair-retreat work then showed that path-distance locality itself is unstable. In one population the first divergence from every known solution really was the exact minimum feasible rollback boundary. A deliberately broadened population produced the opposite: supported elites could be repaired after only 1–2 steps of rollback even though known-solution prefix distance suggested 27–29 steps.

Therefore a fixed positional story such as “repair the suffix,” “rollback N,” or “probe several elite prefixes” is poorly conditioned on the structure we now know matters.

### Changed premise supplied by the uploaded LNS work

The neighbourhood can instead be defined by **which coupled commitments must become free together**.

For Pathfinder that could mean a small causal interface involving some combination of:

- a must-turn arrival/exit choice;
- one or more crossing sites or traversal axes;
- a portal-use commitment;
- visit topology around a separator;
- ordering among interacting obligations;
- the path segment whose history makes those commitments mutually compatible.

This is not yet an operator proposal. It changes the question from “how far back must repair go?” to “which future-relevant commitments must be allowed to change so an exact completion becomes reachable?”

### Smallest legitimate descendant

Use the already exact-labelled repair-retreat cases. For each supported elite with a known feasible retreat boundary, compare the elite to an exact feasible continuation and derive the changed commitment set between the dead continuation and the rescuing continuation. Ask whether those changes form a compact dependency interface that is substantially smaller/more stable than raw path rollback distance, and whether the same interface type recurs across unrelated levels.

If no compact recurrent interface appears, close this route without building CP-LNS. If one does recur, the next experiment is a bounded observer or exact restricted-reconstruction probe around that interface. Operator portfolios, adaptive destruction severity, and bandits remain several gates downstream.

## 3. Sound dominance is still only a conditional vocabulary, not an open framework programme

The uploaded feasibility report correctly emphasizes exact RCSP-style dominance: one partial label can discard another only when compatible boundary state and resource/visited-set relations prove every completion of the dominated label is reproducible from the dominating label.

No explicit Pathfinder dominance framework descendant was found. That absence alone is not enough to reopen broad label-setting or automatic-dominance machinery. Pathfinder's exact length/intersection requirements and path-history-sensitive legality break the usual monotone “less resource is better” intuition, and retained transposition/coarse-state history repeatedly shows how easy it is to assert future equivalence accidentally.

A dominance premise becomes interesting only if a current exact-labelled microscope produces two recurrent same-boundary states with a **provable** partial order over all future-relevant resources/history. Until then, dominance is a proof language for a discovered relation, not a technique to search for indiscriminately.

## 4. Portfolio literature mostly validates the current complexity ladder

The uploaded sequential-portfolio review orders control methods from static schedules and per-instance selection through bandits, survival/hazard models, and finally value-of-computation control. Its own recommendation is to climb that hierarchy only when simpler methods leave demonstrated headroom.

Pathfinder has already generated unusually strong evidence at the simple end. September static-portfolio work found an 18-technique curated portfolio could preserve roughly 98% of full-menu coverage on independent fresh populations while saving roughly 44–48% of work, but different rare tail techniques owned the remaining singleton losses. Later work correctly treated production scheduling as a separate decision rather than automatically promoting a learned/adaptive controller.

Current authority therefore remains well aligned with the external evidence: do not jump to bandit/hazard/VOC scheduling until legal current-solve observables demonstrate actionable continuation/allocation headroom under canonical work. The uploaded report contributes framing, not a missing experiment.

## 5. Generic beam-diversity literature does not reopen WS4

The uploaded beam report surveys diverse beam search, DPP selection, stochastic retention, Pareto fronts, novelty/width, MAP-Elites, and archive methods. These are useful technique families in the abstract, but Pathfinder has already spent extensive evidence on generic diversity/retention forms, including mechanic-bucket retention, random/reserve controls, coarse-state near-tie retention, family response, width controls, and exact-labelled extinction microscopes.

Current Class-5 evidence specifically says to stop nearby scalar/simple-retention accretion and seek changed represented information. The unfinished historical full-pool categorical projection remains the cleaner unresolved retention gate. Literature breadth does not supersede that evidence.

## 6. Non-failing propagation and exact-neighbourhood repair: useful interpretation, not a missing component

The LNS report's satisfaction-search discussion is still conceptually useful. Penalty quality and structural propagation are complementary; a smooth violation score cannot replace information that determines whether completion remains possible.

Pathfinder repair already preserves much of this separation: construction is randomized, but every move is passed through shared authoritative transition/prune logic. The current repair implementation deliberately omits the expensive connectivity check (`runConnectivity=false`) as a speed/thoroughness choice, catching many dead ends one ply later rather than changing validity. Thus “add propagation to repair” is too coarse a diagnosis.

The live archaeology question is narrower: when an exact-labelled near miss is repairable, what **effective interface** must be reopened, and can authoritative inference make that residual subproblem cheaper than restarting the original search?

## Bottom line

The remaining uploads produce two durable archaeology seams:

1. **State-certified forced-chain traversal:** once implemented positively in a specialized Pathfinder DFS, now absent from general traversal, but only worth reviving if modern misses actually spend material work in post-prune one-successor chains.
2. **Dependency-conditioned repair neighbourhoods:** a materially different descendant from net-negative elite-prefix DFS and crude rollback-size thinking. Exact labels should first test whether repairs are localized in a compact interaction/commitment interface rather than in path distance.

The rest of this batch mostly reinforces existing closures and escalation rules. That is useful evidence too: it prevents an impressive literature menu from laundering already-tested ideas back into the queue under new names.