# Nogood Learning and Conflict Analysis in Search

## Core question

Failure learning records **why** a branch failed rather than only that one exact state is dead. SAT/CDCL, CP explanations, Lazy Clause Generation (LCG), nogood recording, and conflict-directed backjumping (CBJ) are different forms of this idea.

The key comparison is conditional:

- **Exact-state memoization/transposition tables** are excellent when many trajectories reach the same logical state.
- **Abstract nogoods** win when different exact states repeatedly fail for the same structural reason.

Useful learning therefore depends less on “how hard is the instance?” than on **whether the chosen failure language exposes recurring structure**.

## What is learned

A nogood is a sound partial condition that cannot occur in any solution, often represented as a forbidden conjunction or clause. It generalizes beyond the exact state where it was discovered.

Examples of learning regimes:

- **Exact dead state:** stores state identity; no explanation.
- **Nogood/clause:** stores a partial conflicting condition.
- **LCG explanation:** CP propagators explain deductions in a Boolean language, enabling SAT-style conflict analysis.
- **Conflict set/CBJ:** records which earlier decisions contributed to a dead end so search can jump over irrelevant decisions; this need not create a persistent database.

No representation dominates automatically. Exact states are cheap and powerful when transpositions are common. Abstract learning pays only when generalization is sound, reusable, and cheaper than rediscovering the failures it prevents.

## Soundness and scope

A learned object must be implied by the original constraints plus any assumptions under which it is retained. Merely observing that several variables were present near a failure does not justify a nogood.

- Standard CDCL learned clauses are globally valid logical consequences, though solvers may later delete them for performance.
- LCG derives clausal consequences from explanations supplied by propagators.
- Some bespoke or CP reasons may be valid only within a subtree, restart, or assumption set.

**Logical scope and retention are different:** a globally valid clause can still be deleted because it is useless; a local reason cannot safely be applied outside its scope.

## Representation is the central problem

Too-specific explanations behave like expensive exact-state caches. Useful learning usually requires a vocabulary that captures the **structural cause** of failure.

Potential explanation languages may refer to:

- variable assignments or decisions;
- remaining resources;
- obligation combinations;
- reachability/connectivity conditions;
- global-constraint state;
- auxiliary variables that summarize higher-level structure.

Richer languages can produce more reusable reasons, but they can also increase derivation, storage, and propagation cost. Explanation minimization may improve reuse, yet smaller is not automatically better: the reason must remain sound and useful for propagation.

LCG illustrates the general principle. High-level CP propagators retain their domain reasoning while supplying Boolean explanations that can be learned and reused. Its success is evidence for **reason-producing propagation**, not evidence that every bespoke solver should become a SAT solver.

## Recurrence and value

Learning is valuable when a learned reason:

1. recurs often enough, or
2. prevents enough downstream work when it does recur,

that these savings exceed explanation, lookup, memory, and propagation overhead.

Hard instances can have either highly repetitive or nearly unique conflicts. Difficulty alone does not predict reuse.

Useful empirical signals include:

- learned reasons firing on later branches;
- earlier pruning/propagation caused by learned reasons;
- fewer repeated failures or consistency checks;
- reduced search-tree size;
- longer nonchronological backjumps where appropriate;
- high work avoided per retained reason;
- compact reasons with repeated activation.

Warning signals include:

- most reasons never fire again;
- reasons are nearly full states;
- learned database grows much faster than reuse;
- propagation/lookup cost rises with little search reduction;
- conflicts implicate almost every prior decision.

## Conflict-directed backjumping

CBJ is primarily **nonchronological backtracking using conflict sets**, not persistent nogood learning.

When a variable has no legal value, search identifies earlier decisions implicated in the dead end and jumps to the deepest relevant one, skipping intervening irrelevant choices. Conflict information is propagated backward as needed.

CBJ helps when failures depend on a small subset of past decisions. It degenerates toward chronological backtracking when conflict sets contain almost every earlier decision. Strong propagation or good variable ordering can also reduce its marginal benefit.

CBJ and persistent nogood recording are separable and can be combined.

## Interaction with propagation and search

CDCL tightly couples:

- learned clauses;
- unit propagation;
- nonchronological backtracking;
- branching/activity heuristics;
- restarts.

A learned clause can therefore affect search before the exact conflict reappears by becoming unit and forcing a deduction.

LCG extends this interaction to CP propagators. This is why measuring only “exact conflict recurrence” understates learning value: a learned reason may be useful through propagation without reproducing the original dead end exactly.

Search ordering matters. Good branching can avoid some conflicts that learning would otherwise exploit; learned reasons can in turn change which branches look attractive.

## Retention and bounded learning

Unlimited learning can hurt. Large databases consume memory and slow propagation, especially when reasons are long, stale, or rarely active.

Common controls include:

- clause/reason size limits;
- activity/usefulness scores;
- age;
- LBD-like quality measures in SAT;
- periodic database reduction;
- relevance-bounded retention tied to current search context.

The important principle is not one universal deletion rule, but **retain reasons according to demonstrated or plausible future value**. A sound reason need not be worth storing.

## Explanation overhead

Reason production is not free. Propagators may need additional bookkeeping, conflict analysis costs work, and every retained reason adds lookup or propagation burden.

Learning tends to pay when it substantially reduces repeated search. It can lose when:

- instances are easy;
- conflicts are rare;
- conflicts are almost unique;
- existing propagation already eliminates most bad branches;
- explanation language produces long weak reasons;
- retention is uncontrolled.

## Exact memoization vs abstract learning

| Search structure | Likely stronger mechanism |
|---|---|
| Many paths reach identical logical states | Exact-state memoization |
| Exact states differ but failures share small causes | Abstract nogoods |
| Failures involve few earlier decisions but seldom recur | CBJ may help without large database |
| Learned reasons often become propagating constraints | CDCL/LCG-style learning has extra value |
| Conflicts are nearly unique or huge | Learning likely low-value |
| State equality is difficult but structural failure summaries are cheap | Abstract learning may have advantage |

The practical question is not “learning or memoization?” but **what repeated equivalence exists in the search: state equivalence, failure equivalence, or neither?**

## Lightweight forms relevant to bespoke combinatorial search

Without adopting full CDCL, the literature supports considering conceptually lighter mechanisms such as:

- conflict sets for backjumping;
- small sound nogoods over existing state variables;
- bounded stores of frequently reused failure summaries;
- explanations emitted only by selected expensive/important pruning rules;
- auxiliary structural variables that make otherwise unique failures recur in a common vocabulary;
- local reasons when global validity would require an overly detailed state description.

These are categories, not implementation prescriptions. Their value depends on whether recurring structural failures actually exist.

## Diagnostic questions

A failure-learning direction is promising when the answers trend toward “yes”:

1. Do materially different exact states fail for the same reason?
2. Can that reason be expressed with much less information than the full state?
3. Is the abstraction provably sound?
4. Does it recur before the solver would cheaply rediscover it anyway?
5. Does matching it prevent substantial downstream work?
6. Can reasons be checked incrementally/cheaply?
7. Can low-value reasons be retired safely?

If not, exact-state caching or ordinary pruning is probably the better abstraction.

## Bottom line

The highest-value lesson from CDCL, CP explanations, and LCG is not “store more failures.” It is **find a sound language in which important failures recur**.

Exact-state memoization remembers *where* search died. Conflict learning tries to remember *why*. The latter wins only when “why” generalizes enough to repay the cost of deriving, storing, and applying it.