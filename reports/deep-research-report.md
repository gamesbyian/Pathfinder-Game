# Large-Neighbourhood Search and Repair Metaheuristics for Constrained Path Feasibility

## Core distinction

Large Neighbourhood Search (LNS) repeatedly **destroys part of a candidate and reconstructs it with a stronger search than a small local move**. Adaptive LNS (ALNS) adds multiple destroy/repair operators and changes how often they are used. CP-LNS fixes part of a solution and lets constraint propagation plus bounded search rebuild the relaxed part.

For constrained path feasibility, the key distinction is between ordinary LNS and **repair toward feasibility**:

| Regime | Candidate | Goal | Main difficulty |
|---|---|---|---|
| Feasible-incumbent LNS | Already satisfies hard constraints | Improve objective | Find better feasible neighbour |
| Repair toward feasibility | May violate hard constraints | Reach zero violations | Frozen structure may itself make feasibility impossible |
| Satisfaction/CP-LNS | Partial or softened assignment | Find any completion | Keep useful propagation while permitting temporary violation |

This matters because exact length, exact self-intersection count, repeated-crossing requirements, portals, directional/stateful mechanics, and turn requirements create nonlocal dependencies. A candidate can be numerically “closer” to feasibility while becoming structurally impossible. Results from routing ALNS therefore transfer only partially: improving feasible tours is not the same problem as crossing from an imperfect path into the feasible set.

A particularly important CP result is that **penalty-only feasibility repair can weaken search by removing propagation from softened hard constraints**. Satisfaction-oriented LNS performs better when it keeps safe structural inference while preventing the relaxed constraint from immediately killing the candidate. The general lesson is that violation score and structural feasibility reasoning are complementary.

## Destroy/neighbourhood selection

Destroy choice determines which transitions are reachable. More destruction is not automatically better.

- **Random relaxation:** essential baseline; cheap and often surprisingly competitive. Weak when the critical dependencies are rare or tightly coupled.
- **Related/Shaw-style removal:** relax decisions judged structurally related. Useful only if the relation reflects real dependency, not merely geometric closeness.
- **Worst/cost/impact removal:** target apparently damaging decisions. Can fail when global exact constraints have no reliable local blame assignment.
- **Block/segment/decomposition removal:** relax coherent substructures. Good boundaries expose internally coupled decisions while keeping the interface to frozen structure manageable. For stateful paths, useful blocks need not be spatially or sequentially contiguous.
- **Propagation-guided relaxation:** choose neighbourhoods by their **effective size after propagation**, not nominal number/percentage of relaxed decisions. A nominally large neighbourhood may collapse because frozen assignments force most relaxed variables.
- **Explanation/conflict-guided relaxation:** relax decisions implicated in conflicts or propagation explanations.
- **Relationship/dependency-guided relaxation:** use model or search relationships to define sensible freeze/relax sets.
- **Learned destroy policies:** can outperform hand-designed policies in trained domains, but add training cost and distribution-shift risk.

A strong recurring finding is that **the representation of candidate neighbourhoods can matter more than sophisticated selection among them**. Dependency-curated LNS has shown that simple random selection can become competitive once the candidate dependency structure is improved.

## Reconstruction

Destroy determines reachability; repair determines whether the new region is actually exploited.

- **Greedy reconstruction:** cheap but myopic; early choices can consume scarce options needed later.
- **Regret/foresight reconstruction:** prioritizes items or decisions whose good alternatives may disappear. Strong in routing, but transfer depends on whether the path representation admits meaningful alternative insertions.
- **Random/noisy reconstruction:** prevents repeated return to the same basin.
- **Constraint-assisted reconstruction:** CP, MIP, SAT/ASP, or another exact method solves the relaxed subproblem jointly. This is attractive when many decisions interact through exact global constraints.

Exact repair works only when the relaxed subproblem is materially easier than the original. Too-large neighbourhoods can simply recreate the original exponential search.

## Neighbourhood size

The useful quantity is **effective search-space size**, not percent destroyed.

- Too small: cheap repair, high success, little structural change, repeated local basin.
- Too large: real alternatives, but expensive repair and loss of useful incumbent structure.
- Good size depends on both current search state and reconstruction strength.

Adaptive LNS therefore often treats destruction severity and reconstruction effort as controllable parameters. Empirical work supports adaptation, but also shows that imperfect online selectors can remain below an oracle that already knows which operator/size to use.

## Operator adaptation

Classical ALNS assigns weights to operators and updates them from recent performance. Bandit formulations treat operators/neighbourhoods as arms. More contextual RL controllers can jointly choose operator, severity, and acceptance policy.

Important findings:

- Operator preferences often differ strongly by problem class and search phase.
- Reward is non-stationary: an operator useful early may become useless later.
- Per-call reward can bias selection toward fast operators; progress per unit time/work is often more meaningful.
- Adaptation helps only when the operator portfolio contains genuinely complementary useful choices.
- Online weighting/bandits have a better evidence-to-complexity ratio for a new domain than deep RL; deep learning can help but requires training data and generalization evidence.

## Acceptance, infeasible states, and diversification

ALNS commonly permits non-improving moves through simulated annealing, threshold acceptance, record-to-record travel, or related rules. Across optimization domains, controlled regression helps escape local optima.

Transfer to feasibility search is less direct because “worse” may be multidimensional. Trading a length violation for a topology violation is not necessarily progress. A scalar violation score can be deceptive.

Feasible-infeasible strategic search and feasibility-pump-style methods reinforce the broader point: repair may need to move through states that are not monotonically closer under one scalar objective.

## Diversity and elite pools

Population and elite-pool methods show that **quality and structural diversity can both matter**. Maintaining only the numerically best imperfect candidate can erase structurally different candidates that occupy other basins.

Useful distinction:

- **Randomness**: different random choices were made.
- **Effective diversity**: search actually reaches structurally different regions.

Randomized repair can still collapse repeatedly to the same attractor. Diversity should therefore be assessed from resulting candidate structure, not from the presence of random seeds or stochastic operators.

Elite pools cost memory and require a meaningful distance/descriptor. Excessive diversity can preserve weak states; excessive elitism collapses the pool.

## Restart and stagnation

Hard restart is an extreme destroy operation. It escapes basin-specific structure but also discards useful information and can resemble an over-large neighbourhood.

Stagnation should not be defined only by iterations since improvement when operators have very different costs. Work- or time-normalized progress is more meaningful. Moving to a structurally distant elite is a softer alternative to full restart.

## Diagnosing what is failing

Terminal failure alone cannot distinguish destroy, repair, diversity, adaptation, or budget problems. Literature commonly uses conditional repair success, anytime curves, operator yields, neighbourhood size, structural diversity, and ablations.

| Observation | Most consistent interpretation |
|---|---|
| Repairs are fast/successful but remain very close to incumbent | Neighbourhood too small/conservative |
| Repair cost/exhaustion rises sharply with destruction | Neighbourhood too large |
| Similar-size destroy operators have very different yields | Neighbourhood choice matters |
| Random selection becomes strong only after dependency curation | Neighbourhood representation was poor |
| Same relaxed states improve greatly under stronger reconstruction | Repair was too weak |
| More repair effort does little, but changing destroy set helps | Needed transition lies outside neighbourhood |
| Many seeds converge to similar structures | Effective diversity is low |
| Distant elite changes trajectory immediately after plateau | Basin entrapment/diversity deficit is plausible |
| Measured operator yields differ but adaptive weights do not | Selector is failing to learn signal |
| Fast operators dominate despite worse progress/work | Reward/update bias |
| Operator ranking changes over search | Non-stationary adaptation problem |
| One fixed operator matches adaptive selector | Adaptation overhead/noise may exceed portfolio value |
| New best states continue arriving near cutoff | More budget remains plausible |
| Long plateau plus structural collapse/repetition | More budget alone is unlikely to fix principal problem |

### Critical diagnostic distinctions

**Destroy vs repair:** if the same repair works after some similarly sized destroy operators but not others, neighbourhood choice is implicated. If many apparently useful relaxed states all fail under the same reconstruction, repair/inference is implicated.

**Too small vs wrong:** a large neighbourhood can still omit the decisions that must jointly change. Releasing more variables is not the same as releasing relevant variables.

**Too large vs weak repair:** if reconstruction works at modest size and collapses as size grows, subproblem complexity is implicated. If even small focused neighbourhoods fail, repair or frozen impossibility is more plausible.

**Diversity vs budget:** budget-limited search keeps discovering/improving; diversity-limited search increasingly recycles the same structures.

**Adaptation vs weak portfolio:** selection cannot rescue a set of uniformly bad operators. First establish that useful operator complementarity exists.

**Violation score vs feasibility:** smooth score improvement can occur inside a region with no feasible completion.

## Ranked external ideas by conceptual relevance

1. **Treat feasibility restoration as distinct from feasible-incumbent optimization.** Preserve useful hard-constraint inference; do not rely on scalar penalties alone.
2. **Constraint-assisted reconstruction.** Joint reasoning is well matched to strongly interacting exact constraints, subject to subproblem cost.
3. **Dependency/explanation/propagation-guided neighbourhoods.** Strong evidence that what is relaxed matters as much as how much.
4. **Adaptive effective neighbourhood size.** Size should reflect residual search complexity and reconstruction cost.
5. **Heterogeneous operator portfolios with low-overhead online adaptation.** Useful when complementary operators actually exist.
6. **Structure-aware blocks and foresight in reconstruction.** Strong principle, but standard routing formulations transfer imperfectly to stateful paths.
7. **Explicit structural diversity/elite management.** Strong external evidence, but mostly indirect for path-feasibility LNS.
8. **Controlled acceptance of regressions.** Useful for basin escape; scalar feasibility ordering is a major caveat.
9. **Restart or movement to distant elites.** Plausible after diversity collapse; full restart discards information.
10. **Deep learned controllers.** Can work, but currently weaker as a first-line transfer than simpler adaptive mechanisms.

## Bottom line

Successful repair search balances **reachability, reconstructability, and diversity**:

- destroy must expose decisions whose joint change can escape the current attractor;
- the residual subproblem must remain tractable enough to reconstruct;
- repeated repair must not collapse into the same basin.

The deepest recurring lesson is representation: defining the right dependency structure and neighbourhood candidates may matter more than choosing a sophisticated selector over poorly represented alternatives.