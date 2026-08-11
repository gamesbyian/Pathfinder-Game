# Solver heuristic capability and gap analysis

This is a code-and-evidence-level inventory of the production solver as of 2026-08-07. It asks:
when the existing mechanisms are arranged by **what they know** and **which decisions they affect**,
which empty cells imply useful new capabilities?

A visible code asymmetry is not automatically an open opportunity. This review reconciles the
implementation with the repository's experiment and negative-result ledger. Proposals below are
hypotheses, not shipped findings.

## Executive answer

Yes, new heuristic families are implied, but my evidence-adjusted answer is narrower than a
source-only reading:

1. **Mechanic-derived propagation**, especially dynamic must-cross/intersection consequences. This
   family has delivered production wins, although its obvious next forced-edge rule was falsified.
2. **Portal-aware parity feasibility.** Soft scoring notices a likely need for a parity-twisting
   portal, while hard parity inference is disabled on all portal levels. A conservative remaining-
   parity envelope would add information rather than merely another preference.
3. **State-conditioned landmark interfaces.** Model which entry/exit combinations remain capable of
   satisfying turn and surround obligations. This is open only beyond several already-refuted
   adjacent-turn counterparts.
4. **Failure-conditioned repair control.** Use observed plateau shape to select actions or allocate
   effort instead of globally retuning a scorer known to destabilize repair.
5. **Residual-capacity and resource spectra as research instruments.** Rich topology/resource
   signals belong in shadow probes or soft retention experiments first; the existing separator
   spectrum found genuine but too-rare production value.

The solver's broad representational hole is that it understands **local progress** much better than
**future opportunity cost**. However, measured failing levels often already rank winning moves near
the top, so “add a better move score” is not the general answer.

## Separate four meanings of “heuristic”

- **Hard admissible checks** reject states proved unable to win: exact length/intersection limits,
  goal distance and parity, obligation bounds, mechanic deadlocks, and residual connectivity/volume.
- **Soft move scores** rank children by progress signals. A bad score spends budget but cannot make
  an invalid path valid or reject a valid path.
- **Profiles and templates** reweight that vocabulary or add geometric path shapes. They diversify
  preferences but normally add no state information.
- **Search-control heuristics** decide retention and effort: DFS/LDS, beams and diversity, randomized
  repair, gate/config ordering, and feature-keyed attempt policy.

A new profile cannot fill an information gap. A new prune needs a proof plus oracle/fuzz validation.
An incomplete state signature may be safe for diversity but not for rejection.

## Inventory: what each family does and omits

| Family | Does well | Does **not** represent |
|---|---|---|
| Goal attraction / finish commitment | Smooth phase-aware finish gradient | Necessary detours, consumed corridors, useful arrival resource mix |
| Objective attraction | Cheap pull to nearest pending must-pass/must-cross | Objective order, incompatibility, approach side, cost of serving all objectives |
| Must-pass urgency | Keeps every point obligation visible | Bottleneck access and joint order; same-family MST exists only as a hard bound |
| Must-cross urgency / approach guidance | Separates first visit from perpendicular second approach | Future availability of both straight-pass neighbor pairs; competition among crossings |
| Must-turn urgency / exit guidance | Covers “reach it” and “make the satisfying turn now” | Future interface availability; repair deliberately disables these shared terms |
| Surround urgency | Pulls toward an unvisited neighbor | Route/interface feasibility through the whole remaining neighbor set |
| Adjacent-turn urgency | Reaches an eligible region | Whether a candidate cell retains a feasible entry/exit of required chirality |
| Flipper urgency | Tracks global used-count parity and current approach zones early | Downstream order opportunity, late scarcity, competition for approaches |
| Portal parity guidance | Notices an unmet need for an odd parity twist | Hard feasibility after useful twist portals become unavailable; portal sequence/value |
| Intersection setup | Rewards an immediately useful revisit | Scarcity of future crossing sites and opportunity cost of consuming an axis/cell |
| Geometry templates | Cheap perimeter/corner/side path-shape diversity | Obstacles or dynamic residual topology |
| Anti-dither / revisit penalty | Suppresses trivial reversal and gratuitous reuse | Productive versus destructive revisits and longer history motifs |
| Obligation lower bounds | Prove insufficient length; provide scalar slack | Most cross-family conflict, exact interfaces/order, dynamic topology |
| Deadlock / connectivity | Catch irreversible local failure and unreachable/undersized regions | Traversal feasibility through a region, separator allocation, combined interfaces |
| Beam dedup/diversity | Frees beam width via aggressive (formally unsound) merging on `(cell, ints/mp/mc/flipper/surround/mustTurn/adjTurn-mask)`, all mechanics as of 2026-08-06 | Portal-complete identity; must-cross crossCounts/axis-lock sub-state was tried 2026-08-07 and found net-negative — more merge precision competes against, not adds to, the mechanism's actual width-management value (see `reports/2026-08-07-beam-dedup-mc-axis-granularity-net-negative.md`) |
| Repair | Escapes deterministic commitment through restarts and elites | Ordinary interior edits, connectivity pruning, stable use of every shared score |
| Attempt policy | Routes coarse feature regimes to methods | Online response to beam extinction, prune causes, or repair plateau shape |

By information and decision type, the sparsest areas are **dynamic × relational × soft
retention/control** and **dynamic × relational × sound propagation**. Those are real capability
gaps; whether a particular implementation is economical remains empirical.

## Evidence that changes a source-only answer

The repository has already falsified many natural “missing counterpart” proposals:

- **Move ordering is not the measured bottleneck.** Winning-path moves were already near the top
  under real profiles, and controlled comparisons did not expose an ordering deficit.
- **Adjacent-turn symmetry was tested.** Adjacent-turn exit guidance solved 0/6 targeted levels. A
  combined MST improved only 5/183 sampled witness states, by at most two steps. A sound deadlock
  check fired zero times in roughly 88.7 million evaluations. The implication is not “copy the
  must-turn mechanisms,” but “represent adjacent-turn's any-of-several-cells semantics differently.”
- **Joint objective ordering is a measured small gap.** An exact joint must-pass/must-cross tour
  applied to 659/5,518 labelled branches but uniquely caught only one dead branch. Its simplest
  point-tour form is not a production priority.
- **Separator capacity is real but sparse.** A sound separator resource spectrum uniquely caught
  dead branches, but coverage was too low to justify hot-path integration.
- **Naive transposition memory is weak.** A loose signature suggested 92–99% repeats; a sound key
  reduced this to 0.5–16%, usually 1–2%, and was expensive. Approximate novelty may still guide
  retention; incomplete-key dead-state pruning is unsafe.
- **Bidirectional completeness is not an open capacity question.** Sound meet-in-the-middle
  frontiers hit 1.5 million states well before required meet depth on every tested level. CP-SAT
  also times out on the hard population, evidence against “just add global search.”
- **Specific mechanic derivation has paid.** Reserved-intersection topology and must-cross forced-
  neighbor reasoning produced wins. Broader bounded-cost dilation did not, and forced-edge
  propagation was falsified. The lesson is derive–falsify–instrument, not generic “more topology.”

This evidence demotes resource-slack ordering, plain obligation tours, generic transposition tables,
and adjacent-turn scoring counterparts from the previous priority list.

## Gaps that remain after reconciliation

### 1. Portal parity: guidance without inference

The scorer derives whether the gate/goal/required-length relationship needs a parity twist and pulls
toward a suitable unused portal. The sound parity prune, however, runs only on portal-free levels.
The solver therefore recognizes a resource preference but cannot reject a state when all ways of
supplying the required parity have become unavailable.

**Implied research target:** an achievable-parity envelope over remaining single-use portal
crossings. It must replay real portal state—coordinate paths alone are ambiguous when portal
endpoints are adjacent—and incorporate reachability conservatively. Start with stored-solution
census, then a shadow necessary-condition probe; do not begin with a hard prune.

**Built and A/B-tested (2026-08-08)**: an existence-only envelope (reject a naive mismatch only
once every twist portal pair has actually been jumped, not merely visited — ignoring reachability
entirely, so it can only ever under-prune, never mis-prune). Stored-solution census across all
three real corpora: 0 violations across ~15,600 mismatch checkpoints — decisive. A live-search A/B
against 40 twist-portal corpus-2 levels (25 unsolved + 15 solved, node-budget-pinned) confirmed
soundness (0 regressions) but found **zero node-count difference on every single level** — the
prune's own reject condition never actually arose across ~240M searched nodes. Sound but negligible
at this corpus's typical twist-pair density (1-3 per level); shipped opt-in
(`PRUNE_PORTAL_PARITY_ENVELOPE`), not promoted. See
[`reports/2026-08-08-portal-parity-envelope.md`](../reports/2026-08-08-portal-parity-envelope.md).
This demotes the existence-only shape specifically for this corpus's portal density — a
reachability-bounded, tighter version, or a denser/larger sample, remain untested.

### 2. Landmark feasibility: attraction without completion interfaces

Must-turn has point urgency plus exact local exit guidance. Adjacent-turn and surround have
multi-cell satisfaction sets, for which copied point/MST/deadlock mechanisms have been weak.
Scattered surround visits are valid and dominate stored solutions, so a “clean orbit” cannot be
assumed without changing the game rule.

**Implied research target:** enumerate conservative completion interfaces—candidate satisfaction
cell, viable incoming axis, viable outgoing axis/chirality—and ask whether at least one remains.
Before hot-path code, census these interfaces along stored solutions and dead labelled prefixes.
This is genuinely different from the refuted adjacent-turn exit bonus and single-linkage MST.

**A narrower version was tried and found null (2026-08-07)**: not the full entry/exit-axis
interface above, but a plain dynamic reachability completion check — extending `isConnected`'s
existing flood fill (which already asks "is `X` reached?" for goal/must-pass/must-cross) to also
ask it about pending surround-neighbor and adjacent-turn candidate cells. Sound (0 false rejections
across 151,414 replayed steps of 1,493 stored solutions) and far from rare (fired on 83% of a
mixed-difficulty 100-level sample, ~17,800 times), but the aggregate effect on `nodesExpanded` was
0.0008% with zero solved-count change — the states it catches were already about to be rejected by
the rest of the gauntlet within a step or two. See
[`reports/2026-08-07-surround-adjturn-reachability-null-result.md`](../reports/2026-08-07-surround-adjturn-reachability-null-result.md).
This demotes "plain reachability, no interface/axis reasoning" as a productive shape for this gap
without touching the entry/exit-axis interface idea itself, which remains untested.

### 3. Must-cross/intersection propagation: proven family, narrowed frontier

Must-cross combines reserved intersections, two straight passes, axis consumption, and forced
neighbors. Existing scoring and bounds see pieces of this, while shipped reserved-wall and forced-
neighbor work proves that derived consequences can matter. Yet general dilation and forced-edge
propagation failed, preventing an easy extrapolation.

**Implied next capability:** bounded dynamic propagation over forced interfaces and remaining free
intersection budget, only if it derives facts beyond the shipped checks. Prototype as a shadow
propagator and compare unique catches; do not revive the falsified static spare-edge rule.

**Built and tested (2026-08-08)**: a dynamic "neighbor-budget" propagator — a still-open must-cross
axis's required neighbor that is already visited (soft, not a hard wall) needs an unreserved
intersection to revisit; reject once the free budget can't cover every such distinct neighbor cell
(deliberately counting distinct CELLS, not per-obligation requirements, which is exactly what
avoids the double-counting that falsified the static forced-edge rule). Shadow-probe result against
the oracle-labelled atlas: **19 unique catches beyond the existing gauntlet** (0 false rejects),
the largest of any candidate scored through `docs/solver-shadow-eval-harness.md`'s infrastructure
to date. Sound on a full-corpus stored-solution replay (97,812 valid paths, 8.5M steps, 0
violations). Shipped opt-in (`PRUNE_MC_NEIGHBOR_BUDGET`, default OFF; `solver:bench --check`
160/160, no regressions). **Full-corpus deterministic A/B (2026-08-08)**: corpus-1 96/102 → 96/102
(+0), corpus-2 725/1700 → 739/1700 (**+14 net**, but not a strict superset — 42 gained, 28 lost;
every lost level carries must-cross cells, confirming the churn is the flag's own effect, not
noise). The 28 losses are budget-reallocation, not soundness violations (the check never rejects a
real solution per Stage 2's replay) — pruning dead search earlier shifts node-by-node exploration
order under the same fixed budget, so some levels that were solved by chance before the budget ran
out now aren't, offset by others that newly are. **Verdict: keep opt-in, not default-on**, pending
either a repeat run confirming the churn is stable or a look at why the 28 losses go the way they
do. See
[`reports/2026-08-08-mc-neighbor-budget-propagation.md`](../reports/2026-08-08-mc-neighbor-budget-propagation.md).

### 4. Repair has diagnostics but limited conditional policy

Repair tracks badness/elites and has plateau-signature instrumentation. Its shared score balance is
fragile, and its usual append/restart shape cannot freely revise early interior decisions.

**Implied search-control heuristic:** condition the next repair operator, seed family, or effort
slice on plateau shape. This is safer than globally changing shared weights and directly targets a
known failure mode. Preserve ordinary repair as a separate fallback so a specialized policy cannot
silently replace its existing wins.

### 5. Residual resources are richer than scalar length slack

Length bounds, intersection ceiling/deficit, reachable fresh volume, axes, portals, and flippers are
separate resources. Equal length slack can hide different feasibility margins. But because local
ordering is already strong, a Pareto vector is not a leading production hypothesis.

**Implied diagnostic/retention experiment:** compare survivors using approach slack, intersection
slack, volume slack, length slack, then soft score. Keep it ordering/retention-only. Require improved
winning-prefix survival at equal work before interpreting solve-count changes.

### 6. Strategy selection is static while evidence arrives online

Feature-keyed policy selects attempts before search. Beam collapse, recurring prune reasons, and
repair plateaus arrive later but seldom redirect the next allocation.

**Implied scheduler heuristic:** grant a bounded next slice to a complementary method based on
observed failure evidence. Evaluate scheduling separately from scoring at equal deterministic work.
This is plausible, but lower priority than mechanic-derived facts because portfolio reordering has
already underperformed when it lacked a genuinely complementary technique.

The common engineering substrate for gaps 4–6 is now specified in
[`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md).
That plan does **not** promote any of these hypotheses to production policy. It standardizes typed
artifacts, replay-complete candidate witnesses, neutral resource measurements, proof-strength
classes, and shadow-mode exchange so the project can first measure whether repair, beam, DFS, and
admissible-order search actually leave complementary information behind. If they do, the same
contract can support bounded pairwise handoffs or failure-conditioned work allocation without
recreating the failed broad fast-portfolio experiment or collapsing every technique onto one
universal score.

## What is not implied

- Another global weight profile; it cannot see missing state information.
- Unconditional beam widening; it adds capacity but no insight and has failed targeted regimes.
- A monolithic learned score; it blurs soundness and risks corpus/generator identification.
- Hard pruning from a useful correlation; guidance value is not an impossibility proof.
- Adjacent-turn exit guidance, naive adjacent-turn MST, or all-candidates deadlock as “untested.”
- A plain joint must-pass/must-cross point tour; its unique catch rate is already measured.
- Naive/full transposition pruning without a cheap sound key and new evidence.
- Generic bidirectional search; sound frontier measurements already closed it for the tested regime.

## Recommended next sequence

1. Reconcile each idea with the roadmap, future-work ledger, shadow-harness results, and dated
   reports before implementation.
2. Finish the portal-parity replay census and test a conservative remaining-parity envelope in the
   shared shadow harness.
3. Derive and census landmark completion interfaces on paper and stored solutions, explicitly
   excluding the adjacent-turn constructions already measured as null.
4. Evaluate any must-cross propagator by unique catches beyond the current gauntlet before hot-path
   integration.
5. Use existing plateau signatures to test failure-conditioned repair actions/allocation while
   preserving ordinary repair separately. If this work crosses technique boundaries, use the
   artifact/replay contract in `solver-interoperability-and-cooperation-plan.md` rather than adding
   another bespoke telemetry channel.
6. Keep resource vectors and topology novelty in retention/order experiments; demand better known-
   winning-prefix survival at equal work. Shared versions of these measurements should use the
   neutral metric vocabulary defined by the interoperability plan, while technique-specific scores
   remain technique-specific.
7. Promote a signal to pruning only after a written admissibility argument, stored-solution replay,
   oracle/fuzz falsification, and deterministic full-corpus cost/solve A/B.

## Bottom line

The original source-only analysis identified real representational gaps but over-promoted several
obvious fillers that this repository had already tested. After reconciling the evidence, the best
leads are narrower: portal parity feasibility, genuinely interface-aware landmark reasoning,
further *new* must-cross propagation, and failure-conditioned repair control. Residual-capacity and
multi-resource representations remain useful discovery instruments, not yet implied production
heuristics. The range of existing heuristics does imply missing abilities—but experiment history is
essential to distinguish a missing ability from an attractive implementation already shown not to
pay.