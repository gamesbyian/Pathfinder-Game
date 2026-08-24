# Nogood Learning and Conflict Analysis in Search

Effective search algorithms can learn from failure by recording information about *why* a branch failed rather than only recording that one particular state is dead. In SAT this is central to conflict-driven clause learning (CDCL); in constraint programming (CP), related traditions include nogood recording, explanation-based propagation, lazy clause generation (LCG), and conflict-directed backjumping (CBJ). The potential advantage over exact-state memoization is **generalization**: a sound explanation may apply to many states that share the same conflicting conditions.

That advantage is conditional. Exact-state memoization, including transposition tables, can be extremely effective when the same logical state is reached through many trajectories. It is therefore incorrect to say that exact states almost never recur in general. Abstract nogoods become especially valuable when exact transpositions are uncommon but *structurally similar failures* recur across distinct states.

Early work on dynamic CSPs showed that recorded nogoods can allow substantial reuse of search effort when a problem changes and related conflicts would otherwise be rediscovered. The broader SAT and CP literature subsequently established that failure learning can transform difficult search, but also that explanation quality, propagation strength, retention policy, and representation determine whether the extra machinery pays for itself.

- **What is learned.** A nogood is a partial condition that cannot occur in any solution, often represented as a forbidden conjunction of variable assignments or, equivalently, as a clause. SAT solvers learn clauses obtained by conflict analysis. CP solvers may learn clausal nogoods, constraints, or other reason objects. Exact-state memoization records a dead state without necessarily explaining which subset of its conditions caused failure. Neither representation dominates categorically: exact memoization is strongest when transpositions are common and equality is cheap to test; abstract learning is strongest when a reusable conflict can be expressed more compactly than the states in which it appears.

- **Logical validity.** A learned object must be a consequence of the original constraints together with any assumptions under whose scope it is retained. In CDCL, conflict analysis derives a learned clause by resolution from clauses that justify the current implication graph. In LCG, CP propagators provide explanations for deductions; these explanations allow SAT-style conflict analysis to derive clausal nogoods. The crucial requirement is not merely that some variables were present near a failure, but that the recorded reason is sufficient to entail the failure or deduction. An aggressively generalized pattern that lacks such justification is unsound.

- **Scope.** Standard CDCL learned clauses are globally valid consequences of the current formula and can survive backtracking and restarts, although solvers may later delete them for performance reasons. LCG similarly derives globally valid clausal consequences of the modeled constraints. Other search methods may maintain reasons or conflict sets whose usefulness is local to a subtree, a restart, or a particular set of assumptions. Locality must therefore be distinguished from deletion: a globally valid clause may be deleted because it is not useful, whereas a genuinely local reason is not valid outside its scope.

- **Recurrence likelihood.** Abstract learning pays when a reason recurs often enough, or cuts enough search when it does recur, to offset explanation, storage, and propagation costs. Smaller explanations often cover more assignments, but smaller is not automatically better: the learned constraint must remain valid, and its propagation behavior matters. Likewise, difficult instances do not guarantee useful recurrence. Some hard searches generate highly reusable conflicts; others generate a long sequence of nearly unique ones. The empirical question is therefore not simply whether an instance is hard, but whether the chosen explanation language exposes recurring structure.

- **Storage and lookup.** Learned information can become enormous. Modern SAT solvers use watched-literal propagation, clause activity and quality measures such as literal block distance (LBD), and periodic database reduction rather than treating the learned database as a simple hash table. CP and bespoke search systems use different structures depending on the learned object. Exact-state tables can also be large, but they have a different cost profile: hashing or canonicalizing a state can be cheap compared with running an additional propagator over many learned clauses. Any comparison should include both memory and per-node lookup/propagation cost.

- **Interaction with search and propagation.** CDCL tightly couples learning, unit propagation, variable activity, and nonchronological backtracking. A learned clause can immediately become unit, force a deduction, or cause earlier failure in another branch. LCG extends that interaction to high-level CP propagation by requiring deductions to be explainable in the Boolean learning language. Search ordering matters: strong branching or variable ordering can sometimes avoid conflicts that backjumping would otherwise skip, while learned clauses can themselves change which variables become attractive to search.

## Conflict-directed backjumping

CBJ should be distinguished from persistent nogood learning. It is primarily a **nonchronological backtracking method based on conflict sets gathered during search**. When a variable has no legal value, the algorithm identifies earlier variables implicated in the dead end and jumps to the deepest relevant one, propagating conflict information backward as appropriate. Classic formulations maintain conflict or jumpback sets so that irrelevant intervening decisions can be skipped.

CBJ therefore uses information about causes of failure, but it need not create a persistent reusable constraint database. Calling it a lightweight form of learning is defensible only in a broad sense; operationally it is clearer to treat CBJ and nogood recording as separable mechanisms that can be combined.

CBJ is most useful when dead ends depend on a relatively small subset of earlier assignments and chronological backtracking would revisit many irrelevant choices. If conflict sets tend to include nearly every preceding decision, the jump distance collapses toward ordinary chronological backtracking. Strong propagation and good variable ordering can also reduce CBJ's marginal benefit, although empirical studies have found cases where CBJ remains useful even with substantial consistency enforcement.

## Retention and bounded learning

Unrestricted learning can consume prohibitive memory and increase propagation cost, so practical systems delete or bound learned information. SAT solvers typically retain especially useful short/high-quality clauses while periodically removing less active clauses. Clause quality is not reducible to length alone.

Bayardo and Miranker's 1996 analysis is often cited here, but its conclusion should be stated narrowly. They compared size-bounded and relevance-bounded learning for structurally restricted CSPs and showed that, in the settings analyzed, relevance-bounded learning could obtain runtime bounds close to unrestricted learning with much lower space consumption and offered a better space/runtime trade-off than simple size bounds. This is important evidence for relevance-sensitive retention, not a universal theorem that relevance-bounded learning is always preferable in every solver or problem class.

Krüger, Lorenz, and Wörz (2022) provide a complementary SAT result. Their empirical analysis shows that accumulating learned clauses can itself alter runtime distributions and contribute to deterioration, offering an explanation for why forgetting is useful beyond merely reducing the cost of unit propagation. That result supports active database management. It does **not** by itself establish the stronger claim that deterioration occurs specifically because conflicts rarely recur; poor reuse is one plausible mechanism among several reasons a learned database may have low value.

## Representation and explanation language

Representation is central because a solver can learn only distinctions expressible in its explanation language. LCG is important precisely because it combines high-level CP propagation with a Boolean language in which reasons and conflicts can be analyzed. Modern LCG work emphasizes that the choice of literals, auxiliary variables, and explanations can substantially affect what the solver is able to learn.

This should not be simplified into “richer explanations are always better” or “smaller nogoods are always better.” A richer language may permit a compact structural reason that would otherwise require a large low-level clause, but it can also enlarge the model and propagation machinery. Likewise, minimizing a reason can increase generality, yet the best clause for future propagation is not always the absolutely smallest logical explanation. Explanation generation, reason selection, and reason minimization are therefore optimization problems rather than monotone improvements.

A useful distinction is between:

1. **state identity**, which asks whether this exact logical state has already been proved dead;
2. **conflict identity**, which asks whether this state contains a previously proved incompatible combination;
3. **structural explanation**, which asks whether several superficially different low-level conflicts can be represented by the same higher-level reason.

The third category has the greatest generalization potential but also the highest soundness burden. Any higher-level condition must be proved sufficient for failure, not merely correlated with it.

## Explanation overhead

Explanation-producing propagation has real overhead. Propagators must either construct reasons eagerly or retain enough information to reconstruct them lazily during conflict analysis, and learned clauses then participate in propagation and database management. The magnitude is highly implementation- and problem-dependent; a blanket numerical claim such as “explanations slow propagation by 2–10×” is not justified as a general statement.

Modern LCG systems use several architectures. Some explanations are generated eagerly at propagation time, some lazily only when needed during conflict resolution, and some implied clauses are never permanently inserted into the clause database. The 2026 retrospective by Ohrimenko, Stuckey, and Codish stresses that these design choices materially affect performance. Thus “lazy clause generation” should not be read literally as meaning that every propagation event necessarily creates and stores a permanent learned clause.

The payoff condition is straightforward: explanation work must save more subsequent search than it costs. That can happen through earlier propagation, nonchronological backtracking, conflict reuse, or better search guidance. On easy instances, or in regions already solved almost entirely by propagation, explanation and database overhead may have little opportunity to repay itself.

## Empirical evidence and limits

The broad empirical record strongly supports conflict learning in SAT and supports LCG as a highly effective CP architecture. Modern high-performance CP solvers such as Chuffed demonstrate that explanation-based learning can be extremely competitive, particularly on combinatorial optimization and scheduling problems. It is nevertheless too strong to say that LCG “consistently outperforms pure CP” as a universal result. Performance depends on model structure, propagators, search, objective handling, encoding choices, and benchmark family; even the 2026 LCG retrospective discusses cases where pure or hybrid search choices matter.

Negative or weak cases include:

- conflicts whose useful reasons almost never recur;
- explanations so large or weak that they rarely propagate;
- high explanation cost relative to the remaining search;
- large learned databases that slow propagation or distort search behavior;
- very strong native propagation or ordering that already prevents most redundant failure;
- explanation languages that omit the structural concept needed to generalize the failure;
- overgeneralized patterns that are not logically justified and are therefore unsound.

The important contrast with exact-state memoization is consequently empirical rather than doctrinal. If many trajectories converge to identical dead states, exact memoization may already capture most reusable failure. If exact states rarely repeat but the same small conflict conditions repeatedly occur inside different states, abstract nogoods have much more headroom. If neither exact states nor abstract reasons recur, learning is unlikely to repay substantial machinery.

## Empirical signatures of useful learning

Researchers use several observables to understand whether learned information is doing useful work. No single metric is sufficient.

- **Learned-object activation or propagation:** how often a learned clause/nogood later becomes unit, causes a failure, or otherwise prunes search.
- **Conflict reuse across distinct contexts:** whether the same learned reason matters in branches that are not exact-state repeats.
- **Backjump distance:** whether conflict analysis skips meaningful amounts of irrelevant search.
- **Search reduction:** changes in failures, nodes, propagations, or consistency checks at comparable solution/proof strength.
- **Database utility:** the relationship between retained-clause quality/activity and propagation cost.
- **Explanation size and language:** whether reasons remain compact enough to recur and propagate, and whether auxiliary concepts make important structural conflicts expressible.
- **Effect across restarts or related solves:** whether learned information survives changes in trajectory and remains useful rather than merely describing one local branch.

A learned clause that is rarely activated can still be valuable if each activation removes a huge subtree, while a frequently touched clause can be harmful if it performs little useful pruning. Reuse counts therefore need to be interpreted alongside saved search and propagation cost.

## Relevance to bespoke constrained path search

For a stateful constrained path solver, the literature supports a **conditional opportunity**, not a ready-made implementation prescription. The decisive question is whether different branches repeatedly rediscover the same logically expressible failure for reasons that are substantially smaller or more structural than the complete path state.

Potentially relevant reason languages could involve resources, obligations, topology, mechanic state, or combinations of earlier decisions, but those are only conceptual categories. A research report without access to the solver cannot know which such abstractions are sound, available, cheap, or recurrent. In particular, examples such as “remaining resource at a location” should not be treated as valid nogoods unless the full state dependencies needed for the implication have been established.

The literature therefore suggests the following evidence questions rather than a specific design:

- Do exact dead states recur often enough that ordinary memoization already captures most reuse?
- Do failures recur across different exact states for a common reason?
- Can those reasons be expressed compactly and soundly in terms already represented by the solver?
- Do learned reasons trigger early enough to save substantial work?
- Does the saved work exceed explanation, lookup, propagation, and retention cost?
- Are useful reasons global, or do they depend on assumptions that restrict their scope?

If the answers are mostly negative, exact-state caching may be the better engineering trade-off. If exact recurrence is low but compact structural conflicts recur frequently, the case for abstract nogoods becomes much stronger.

## Synthesis

The strongest conclusion from SAT, CP, CBJ, and LCG is not simply “learn failures.” It is that **the language in which failure is represented determines how much reusable structure search can discover**. Exact-state memoization and abstract learning solve different redundancy problems. The former exploits repeated states; the latter exploits repeated reasons.

Three cautions follow. First, abstraction must remain logically sound. Second, learning has recurring operational costs, so retention and explanation strategies matter. Third, persistent nogood learning, conflict-directed backjumping, and explanation-producing propagation are distinct mechanisms even though modern systems often combine them.

For a bespoke path solver, the external literature is therefore most informative when framed as a testable structural question: *are many expensive dead ends different surface manifestations of a small number of recurring, soundly expressible conflicts?* If so, explanation-based learning has a plausible advantage over exact-state memoization. If not, the sophistication of CDCL or LCG does not by itself create reusable information.

## Selected sources

- Bayardo, R. J. Jr. & Miranker, D. P. (1996). **A Complexity Analysis of Space-Bounded Learning Algorithms for the Constraint Satisfaction Problem.** AAAI-96.
- Prosser, P. (1993). **Hybrid Algorithms for the Constraint Satisfaction Problem.** *Computational Intelligence* 9(3), 268–299.
- Ohrimenko, O., Stuckey, P. J. & Codish, M. (2007). **Propagation = Lazy Clause Generation.** CP 2007, LNCS 4741, 544–558.
- Ohrimenko, O., Stuckey, P. J. & Codish, M. (2009). **Propagation via Lazy Clause Generation.** *Constraints* 14(3), 357–391.
- Ohrimenko, O., Stuckey, P. J. & Codish, M. (2026). **Lazy clause generation in retrospect.** *Constraints*. https://doi.org/10.1007/s10601-026-09390-9
- Krüger, T., Lorenz, J.-H. & Wörz, F. (2022). **Too much information: Why CDCL solvers need to forget learned clauses.** *PLOS ONE* 17(8), e0272967. https://doi.org/10.1371/journal.pone.0272967
