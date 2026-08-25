# Restart versus continuation-value audit

> **Status:** active
> **Last evidence:** 2026-08-24 — July repair-probe seed-diversity work, August 23 late-probe multi-seed promotion, scheduler continuation-value literature, current budget policy, and static audit of the current repair-late-probe execution controls
> **Decision:** repair seed diversity is real and already production-relevant, but existing positive evidence is predominantly additive-budget evidence. Do not infer that restarting is better than continuing. The intended next experiment is equal aggregate `workSpent`; the current exposed late-probe experiment knob controls **nodes**, not per-arm work, so the experiment is not yet faithfully runnable by merely changing `REPAIR_LATE_PROBE_NODE_BUDGET`.
> **Remaining gate:** first provide or reuse a bounded research execution path that can cap each continuation/restart arm in canonical `workSpent` while preserving fixed seeds and charging failed arms. Then, on a prespecified hard residual development population, compare one continued repair action to the primary two-seed split under identical total work. Do not substitute equal node caps or equal wall time.
> **Evidence role:** discovery
> **Selection:** observational — this audit reconciles previously selected/tuned repair-seed experiments and current scheduler questions; it is not independent confirmation.

## What is already established

Pathfinder has direct evidence that repair's PRNG trajectory matters.

The July repair-probe work showed that one deterministic seed can fail while another solves the same level/gate under the same nominal repair mechanism. Rotated siblings were rescued by alternate seeds, and the ordinary probe eventually retained a small multi-seed retry set after a larger seed fan-out proved too expensive on the published corpus.

The August 23 `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` result strengthened the capability case. On its selected 73-level loss population at the production-scale budget, the treatment moved **18/73 -> 23/73**, adding five solves with no losses in that population. A 90-level already-winning population remained 90/90 and the published corpus was unchanged because the tier runs dead-last.

That is strong evidence for **seed complementarity**:

> different deterministic random trajectories can reach solutions that the earlier seed does not.

It is not yet evidence for **restart superiority**:

> after seed A has consumed work without solving, spending the next work quantum on fresh seed B is better than continuing A.

Those are different questions.

## Why the existing positive result is not a fixed-work restart result

The late-probe multi-seed tier was deliberately additive. Each extra seed received its own full `REPAIR_LATE_PROBE_NODE_BUDGET` reserve. The original implementation allowed up to seven additional salts `[1..7]`, so a hard failure could buy a large amount of extra tail work.

Dead-last placement protected levels that had already solved earlier. That is a regression-containment property, not an economic comparison.

The positive A/B therefore establishes:

- alternate seeds have real exclusive capability;
- the extra seeded actions can convert some hard failures into solves;
- seed provenance must remain explicit in the action identity;
- unlimited seed fan-out is not automatically justified because hard unsolved levels pay the added work.

It does **not** establish:

- the optimal number of seeds;
- the optimal per-seed budget;
- whether a second seed beats continuing the first at equal work;
- whether seed order matters after conditioning on previous failure;
- whether a seed's continuation value decays monotonically with work;
- whether the selected gain generalizes outside the mined residual population.

## Historical warning from the July probe

The early ordinary repair probe originally widened its seed retry set after calibration rescues. A full published-corpus speed check then found the wider form made the corpus roughly 14% slower, dominated by a level that burned every extra seed without being rescued.

The seed set was narrowed from five total salts to three, retaining most calibration rescues while removing much of the worst-case failed-seed tax.

That episode is an excellent miniature of the current scheduler problem:

> a seed can have positive marginal capability while still being economically poor when charged across all failures that reach it.

Do not repeat the same mistake at the larger late-probe scale by optimizing only rescued-level count.

## Correct comparison object

For a repair action/config/gate, let total available work be `W`.

The smallest restart comparison is:

### Continuation arm

Run seed 0 continuously to aggregate work `W`.

### Restart arm

Run seed 0 to `W/2`, then seed 1 fresh to `W/2` if the first half has not solved.

This two-seed 50/50 split is the **primary first treatment**. Do not simultaneously optimize seed count and split. A four-seed `W/4` schedule or asymmetric split is a later development treatment only if the primary comparison shows credible headroom.

Both arms spend at most the same aggregate `workSpent`; a restart-arm success before the envelope ends spends only the work actually consumed, just as an early continuation success does.

Do not compare “one 5M run” with “four additional 5M seeds” and call the latter a restart policy. That is a budget expansion.

## Execution-readiness audit: current knob is the wrong currency

The current solver has excellent **measurement** support for this experiment but not yet an exposed **arm-level control** in the required currency.

`orchestration.ts` records, per attempt:

- canonical `workSpent` delta from `prep._workMeter`;
- `allocatedWorkCeiling` when a work cap is present;
- node ceilings;
- seed salt / exact random seed;
- explicit termination outcome.

So the result can be measured correctly once the treatment is executed.

However, the currently exposed late-probe override is `repairLateProbeNodeBudgetOverride`. The source explicitly defines it as a **flat node count** override. The late-probe tier separately installs a generous additive `prep._workCap` derived from the solve's time budget (`timeBudgetMs * DEFAULT_WORK_PER_MS`), while the actual tier shape is bounded by `REPAIR_LATE_PROBE_NODE_BUDGET`. The multi-seed retry repeats the same pattern for each salt: a fresh broad work cap plus that seed's own flat node reserve.

Therefore:

> setting continuation and restart arms to the same number of repair nodes does **not** establish equal `workSpent`.

Canonical work includes more than the raw node counter and is the queue-wide cross-technique currency. Node-equated arms may consume different canonical work because their trajectories can invoke different amounts of scoring, topology, pruning, repair operations, and other metered work.

`strictTotalWorkBudget` is not an automatic solution to this specific comparison. It caps the **whole solve** from its start, including every earlier stage, rather than expressing “give this isolated repair continuation arm W work” versus “split exactly W across these fresh repair seeds.” Using it on the production ladder would confound the restart treatment with whatever work the prefix ladder happened to consume before reaching repair.

### Smallest faithful execution prerequisite

Do **not** redesign scheduling. The required capability is much narrower:

- execute the same fixed repair action/config/gate under a caller-specified canonical work cap;
- choose a fixed seed salt;
- for continuation, preserve the same repair trajectory/state until work `W` or success;
- for restart, terminate seed 0 at `W/2`, create a genuinely fresh repair run at seed 1, and cap its additional work at the remaining `W/2`;
- return ordinary attempt telemetry for both failed and successful arms.

This can be an offline/research harness or a tightly scoped per-action override. It does not need to alter the production scheduler or become a permanent public configuration surface.

The acceptance test for that prerequisite is accounting, not solves: on deliberately failing fixtures, the two arms must terminate within the same canonical-work envelope (up to the work meter's check granularity), and telemetry must sum failed seed work rather than reporting only the final seed.

Until that exists, #6 should be described as an **execution-readiness gate**, not as though the equal-work A/B can be launched with the current node-budget workflow unchanged.

## Outcomes to report

For each arm report:

- solved count / solve probability;
- aggregate `workSpent` on successes and failures;
- distribution of work-to-solve, not only mean;
- per-seed exclusives and overlap;
- number of failures that burn the full envelope;
- any natural exhaustion distinction if the action supports one (ordinary repair currently does not, so repair failure is censored);
- referee/correctness status;
- uncertainty at the independent level/parent unit.

When comparing several restart schedules, report how many schedules/splits were tried. The best development split is selected evidence and needs fresh confirmation.

For the **first** decision-bearing pass, do not compare several schedules: use continuation versus the fixed 50/50 seed-0/seed-1 treatment above. That keeps the multiplicity at one and makes a negative interpretable.

## Population

Use a residual population where repair is actually relevant, but keep claim scope honest.

A reasonable development construction is a frozen baseline-failure-conditioned cohort generated under the confirmation/transfer protocol's **residual** role. That answers:

> on levels still unsolved after the frozen baseline, how should repair work be allocated between continuation and fresh seeds?

It does not by itself establish unconditional improvement on fresh arbitrary puzzles.

Avoid selecting only levels already known to have a seed rescue. That would answer seed reconstruction, not scheduler value.

The managed-population work on 2026-08-24 deliberately did **not** reserve this residual cohort yet. Its membership depends on the exact baseline solver commit and baseline work contract used to define “still unsolved.” Freeze those at the same time the execution treatment is frozen, then derive residual membership without inspecting treatment outcomes.

## Seed semantics

Repair seed is already explicit and reproducible in current provenance:

- `seedSalt` identifies the scheduler action variant;
- `randomSeed` is derived from gate + salt and persisted for reproducibility.

Keep the seed in action identity for randomized repair. Do not treat seed as a meaningless replicate label when it changes the actual search trajectory and can produce exclusive solves.

At the same time, do not proliferate permanent named profiles for each seed. Seed is an action dimension, not a new solver family.

## Continuation-value interpretation

The scheduler literature frames the question conditionally:

`value(next tranche of A | A has already failed through work t)`

versus

`value(fresh B from zero | A has failed through work t)`.

For repair, B may be the same configuration under a different seed.

The existing census shows that repair can retain substantial late yield, so a naive “restart early and often” rule is not justified. Continuing repair can remain valuable well into deep work bands.

The correct policy may therefore be mixed:

- cheap initial diversity across a few seeds;
- then deeper continuation of one or more surviving seeds;
- or no restart at all on some residual regimes.

Do not build that policy before the simplest equal-work comparison establishes headroom.

## Interaction with symmetry evidence

Rotations/reflections can reorder heuristic decisions and therefore alter the semantic meaning of “same seed.” Once search order diverges, identical PRNG seeds do not imply coupled trajectories.

For restart research, compare explicit seeded actions on the original level representation. Symmetry-family work can separately ask whether seed diversity compensates for orientation-induced ordering differences, but it must not assume same-seed transformed runs are paired stochastic replicas.

## Stop gates

Stop or sharply demote restart-specific work if:

- equal-work continuation matches or beats the tested restart schedule;
- alternate-seed gains disappear once failed-seed work is charged;
- positive schedules are unstable across unrelated levels/parents;
- later development requires extensive threshold/seed-set mining with little fresh-confirmation support;
- a simpler static scheduler allocation captures the same gain by moving work to another search family instead.

Proceed only if the prespecified two-seed 50/50 restart schedule produces a reproducible solve/work Pareto improvement over continuation at equal aggregate work.

## Queue implication

The promoted multi-seed tiers remain valid production baselines until scheduler repricing says otherwise, but they receive no permanent budget entitlement from their historical additive wins.

The next #6 restart action is **not yet the A/B run itself**. First make the equal-work comparison executable in the canonical currency without changing production policy. Then run exactly one primary development comparison: seed 0 continued to `W` versus seed 0 to `W/2` + fresh seed 1 to `W/2`, on a baseline-failure-conditioned residual population whose baseline contract was frozen before membership was inspected.
