# Solver archaeology: invalid populations and treatment-delivery failures

> **Status:** concluded-positive
> **Last evidence:** 2026-09-13 — July beam telemetry, repair-budget, elite-splice, family-rerun, and scheduler-reverification chains traced through retained commits/reports
> **Decision:** preserve these chains as experimental-integrity controls. Several historical solver populations and comparisons were invalid because instrumentation or treatment delivery was broken; do not inherit their apparent mechanism verdicts without using the corrected descendants.
> **Remaining gate:** none for the historical correction itself. Current experiments should apply the extracted controls: prove participation, prove budget semantics, validate diagnostic counters on all exit paths, and refresh any population whose defining telemetry changes.
> **Evidence role:** archaeology / methodology calibration
> **Selection:** revert/bug chains where a later correction materially changed the interpreted population or treatment result.

## 1. Beam-collapse population disappeared after a telemetry-only fix

On 2026-07-16, commit `717dcad2e4089e417c3dc7c84f30e5e9fb08cc56` found that `beamSearchFromGate` credited `nodesExpanded` only when it solved or naturally exhausted the frontier. Its three timeout exits reported no work.

The defect was corpus-wide and deterministic:

- **1,681 / 1,681 timed-out beam attempts** reported `nodesExpanded === 0`;
- **951 / 951 non-timeout beam attempts** reported `nodesExpanded > 0`.

The fix only credited already-performed work on timeout exits; it changed no pruning or scoring behavior.

A failure-clustering analysis had used the broken counter to infer a broad beam-collapse population. After a fresh 655-level solve pass under corrected telemetry, commit `4460f8cdbbdc36efd86e2fa18d7e763db864e22d` reported that the apparent **285-level beam-collapse cluster was empty**. R02248/R01465 remained genuine isolated cases; the large population had been manufactured by instrumentation.

**Classification:** measurement broken -> derived population invalid. This is stronger than “telemetry was noisy”: one broken exit-path counter created an entire mechanism class that disappeared under correct measurement.

**Control exported:** any population defined by a diagnostic counter inherits that counter's validation burden. If the counter changes, the population must be regenerated before its old size or composition is reused.

## 2. Repair-close / repair-far populations were early-probe populations, not full-pipeline populations

The next day, commit `86efc7565f5262df4308ffd6312b620306d3b455` found that `runRepairProbe` ignored the external `SolveOpts.nodeBudget` and could consume its full internal worst case before normal orchestration saw the budget.

Against the corpus-2 batch workflow's 8M node ceiling:

- **621 / 621** members of the then-defined `repair-close` (114) and `repair-far` (507) unsolved clusters hit `node-budget-reached`;
- the median cost was about **10,000,038 nodes**, roughly 25% over the external ceiling;
- only the early probe's three attempts were recorded;
- the main DFS/beam loop, six-pass repair fallback, and attraction-diversity stage **never ran** on those rows.

The cluster's badness and distance labels therefore described the early repair probe's outcome, not production-pipeline failure after all intended stages.

A sibling bug, fixed by `590aadc3ee3d1e1bacfa9577190e300a3f6353e2`, showed that `repairBudgetFractionOverride: 0` also failed to suppress the early probe even though it suppressed later repair fallback. A supposedly repair-disabled experiment could still spend substantial repair work.

**Classification:** treatment delivery/budget semantics broken -> scheduler population misclassified. Nominal configuration did not describe what actually consumed work.

**Control exported:** for decision-bearing rows, record stage participation and canonical `workSpent`; never infer “pipeline failed” from a terminal status when an upstream stage may have exhausted the outer budget.

## 3. A correctness fix silently killed repair's elite-splice mechanism

Commit `e6a9cb9a7871acf7178cce4eaff7d490f94fb165` traced a July 10 regression to an interaction between a correct goal-cell legality fix and repair-search bookkeeping.

Repair's elite-splice pool had only been fed by a `goalInvalid` outcome. The correctness fix moved non-winning goal-cell rejection earlier into the shared prune gauntlet, making that outcome unreachable. The elite pool therefore stayed **permanently empty** and every restart began from the gate.

The later fix generalized near-miss capture to ordinary dead ends as well. Without changing legality, it recovered roughly 20% published-corpus runtime and collapsed individual repair costs dramatically (for example P00144 ~9.2s -> 0.38s and P00146 ~5.7s -> 0.08s in the recorded verification).

This matters because several family and scheduler experiments were run during the dead-splice window.

**Classification:** mechanism silently not participating due upstream semantic change. Experiments that depended on repair behavior during that window do not measure the intended repair system.

## 4. Family conclusions changed sharply after the repair mechanism was restored

The repo did the right thing and reran the affected studies rather than merely documenting the bug.

Commit `1e5cf7dc0e86ecd3b861b70a07cbd9370bde9800` reran the six core symmetry families. Three of four repair-gated families lost their prior orientation-dependent repair failures entirely; only P00145 retained partial sensitivity.

Commit `8419ee162a5ed419d6288016d216aa45fd829f8a` reran Experiments 2-5. Failure rates collapsed across local-mutant, swap, re-embed and dose-response studies; several earlier contrast claims stopped holding.

Commit `451ac24432dcc408a60767e78cf7a99f214c6f3e` completed the full 38-family symmetry rerun:

- uniform repair failure: **25/38 -> 8/38**;
- uniform repair success: **4/38 -> 14/38**;
- mixed orientation response: **9/38 -> 16/38**;
- the earlier 8/9 (89%) variant-1 tilt became **6/16 (37.5%)**, explicitly falsifying that apparent orientation effect.

R02248 remained distinctive and later received its own causal microscope; this is why the current symmetry archaeology focuses on R02248 rather than inheriting the pre-fix family-wide headline.

**Classification:** earlier family evidence was implementation-confounded, not a clean negative or positive about symmetry/perturbation response.

## 5. Portfolio comparison reversed after the same repair correction

Commit `6721c2ee6d4c69da0e4a14b313ba32ffe66f2613` reran a prior portfolio-scheduler comparison after elite-splice restoration.

The same Corpus-1 1-20 configuration had previously reported the portfolio at **0.57x** legacy runtime. On corrected repair behavior the identical comparison became **1.45x**, and two of twenty rows fell through the portfolio's tiers into fallback.

The final disposition, “not production-ready,” remained, but the evidence supporting it changed direction. The earlier apparent speed advantage had partly been a legacy-solver impairment.

**Classification:** control-arm capability regression contaminated the scheduler comparison. A relative treatment can look strong because its comparator is broken.

## 6. Luby restart history is instrumentation ancestry, not a failed restart treatment

April commit `c5079e90663af499deed0ac9d8ad95661d4eb245` / PR #726 is easy to misread from its title. It added a canonical Luby-value helper and exported `restartLubyIndex`, `restartBudgetNodes`, `restartCount`, `restartReason`, and `restartNodesBefore`, but the PR explicitly described the change as **diagnostic/telemetry-only and preparatory**. It did not interrupt search and restart it according to the Luby schedule.

The change was reverted by PR #727 the next day with no behavioral experiment. Searches for the Luby vocabulary found no later measured descendant.

**Classification:** treatment never existed as advertised by shorthand. This cannot be counted as evidence that Luby restarting helped or failed.

Current generic restart conclusions should continue to come from the later actual matched-work restart-versus-continuation programme, not this April telemetry scaffold.

## 7. Adaptive root broadening was a dirty revert, not a measured negative

May commit `dc8404c677308003b4b693d485620bab88f2c82a` / PR #794 added adaptive root expansion when repeated timeout-like outcomes, high intersection burden, and a very narrow recent root frontier co-occurred. The PR explicitly recorded **no automated tests were added or run**. It was merged and reverted roughly eight minutes later by PR #795 with no causal failure recorded.

This does not revive universal root broadening, which later evidence gives no reason to prioritize. It simply means this specific historical revert cannot be cited as a clean negative.

**Classification:** dirty revert / incomplete experiment.

## 8. Cross-era methodological lesson

These cases are different failure modes and should remain different in the evidence language:

| history | actual failure | what not to conclude |
|---|---|---|
| beam `nodesExpanded` | measurement broken | “hundreds of levels exhibit beam collapse” |
| repair external budget | intended stages never ran | “full production pipeline reached repair-close/far outcome” |
| elite-splice | treatment silently disabled | “repair system has the measured family response” |
| pre-fix portfolio | comparator impaired | “portfolio has intrinsic speed advantage” |
| Luby telemetry | treatment never implemented | “Luby restart was tested” |
| adaptive root broadening | merge/revert without test | “broadening failed” |

The recurring rule is stronger than “check CI”: **prove that the semantic treatment participated, under the intended work contract, and that the fields defining the measured population mean what the analysis assumes on every exit path.**

## Current-program implications

No new production mechanism is earned here. These corrections reinforce current research rules already moving in the right direction:

- stage participation is evidence, not an implementation detail;
- `workSpent` is the cross-technique currency;
- historical family/capability evidence must be reconciled through the solver version that produced it;
- a counter or summary field cannot define a causal population until its semantics are validated;
- after a treatment-path or measurement correction, re-run the population-defining analysis rather than patching its prose.

The practical archaeology payoff is avoiding false reopenings and false closures. Several apparently large solver phenomena in July were actually shadows cast by the measurement/control plane.