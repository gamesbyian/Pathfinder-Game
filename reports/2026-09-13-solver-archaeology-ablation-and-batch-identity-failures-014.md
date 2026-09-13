# Solver archaeology: ablation and batch identity failures

> **Status:** concluded-positive archaeology
> **Last evidence:** 2026-09-13 — historical ablation safety-valve/coverage/default-semantics bugs and the July stale-code Corpus-2 refresh reconciled against later corrections
> **Decision:** treat historical ablation/batch verdicts as valid only when the actual executed configuration/code identity and participation are demonstrable. Several confident historical results were measuring a different treatment than their labels claimed.
> **Remaining gate:** none for these historical corrections. For current experiments, persist resolved configuration, code ancestry, participation, checkpoint freshness, and comparator identity as decision-bearing evidence.
> **Evidence role:** archaeology / research-control-plane calibration
> **Selection:** historical cases where the experiment label and the executed treatment/code materially diverged.

## 1. “Disable X” could silently keep X running

Commit `cad2a211cf24de0b4a2ee0e05b0593cac3f017fb` found that the ablation attempt-filtering safety valve deliberately kept `attempts[0]` when disabling labels would otherwise produce an empty attempt plan.

Before the fix, this was silent. On a level whose only applicable technique was the supposedly disabled one, the experiment could therefore run that technique anyway and report a result under a `disable-X` label.

The fix added:

- an explicit `__safetyValveApplied` marker;
- a warning that the row is invalid for ablation analysis;
- report propagation so analysis can exclude it.

**Classification:** treatment label false for affected rows. This is not a null result for X; X was still executed.

## 2. Some catalogued flags were decorative, while real mechanisms were not ablatable

Commit `601fe8a4bac44ec5d4c31a50379fdd33aecac88b` audited the feature registry against actual solver consumers and found both directions of coverage failure.

Four flags existed in `ablation-config.mjs` but were never read by the solver:

- `SCORE_SURROUND_URGENCY`
- `SCORE_ADJ_TURN_URGENCY`
- `PRUNE_SURROUND_LB`
- `PRUNE_ADJ_TURN_LB`

So historical “disable” rows for those flags changed nothing.

At the same time six real mechanisms had no independent ablation flag at all, including repair fallback/probe/must-turn bias, adaptive gate budgeting, must-turn deadlock pruning, and lower-bound memoization.

The same audit also moved ablation execution onto the bundled solver path because `tsx` made the hot solver roughly 5x slower, rendering wall-time comparisons incomparable to normal benchmark execution.

**Classification:** experiment-manifest/consumer mismatch. A registry entry does not prove a treatment exists, and absence from the registry does not prove a mechanism was held constant.

## 3. A sparse ablation object could silently disable unrelated default-on machinery

Commit `a899e06f1266b32c2c6ab66760888307a610f2bf` found a more dangerous configuration-semantics bug while composing batch/raced tooling.

`--repair-budget-fraction` had originally been represented as a sparse ablation object containing only `REPAIR_BUDGET_FRACTION_OVERRIDE`. But ordinary strategy consumers used the convention:

`(!cfg || cfg.STRATEGY_X)`

Once **any** ablation object existed, every unspecified `STRATEGY_X` read false. Therefore requesting one repair-budget override silently disabled unrelated default-on mechanisms, including gate interleaving, minimum-budget floor, adaptive gate budgeting, the repair probe, stagnation burst, and elite splice.

The original verification did not catch this because it exercised rows that remained unsolved either way. A direct reproduction later showed `S00001`, normally solved in about a second, failed outright with only the repair-budget override supplied.

The fix moved the override entirely out of ablation into dedicated `SolveOpts.repairBudgetFractionOverride`.

**Classification:** multi-treatment confound caused by sparse-config default semantics. Any affected historical comparison is not a clean repair-budget experiment.

## 4. The inverse bug silently enabled unrelated default-off mechanisms

Commit `983fc4e8df79b2d7ae816985fc46b421f66f1e56` exposed the mirror-image failure in `normalizeAblationConfig`.

Its Proxy returned `true` for any unspecified flag. That was correct for normal default-on features but wrong for opt-in mechanisms such as:

- `STRATEGY_REPAIR_TURN_BIAS`
- `STRATEGY_REPAIR_ELITE_PREFIX_DFS`
- `PRUNE_PORTAL_PARITY_ENVELOPE`

As a result, a sparse configuration that explicitly enabled turn bias **also silently enabled elite-prefix DFS**, which had independently measured net-negative.

This manufactured the historical “turn bias is conclusively `-7/1700`” result. The report was formally retracted. A proposed interaction with the repair nogood cache was also falsified: disabling that cache gave `-8`, not a recovery. The actual confound was the unrequested elite-prefix treatment.

The corrected code introduced explicit opt-in-default semantics and regression tests.

**Classification:** dirty negative / wrong treatment. The `-7/1700` result is not evidence against turn bias.

## 5. One bug had already been fixed locally without fixing the shared root

The turn-bias retraction notes that the same “unrequested opt-in flag activates” symptom had previously been found and patched in a local portal-parity experiment script. The central `normalizeAblationConfig` behavior remained unchanged, so every other caller could still reproduce the bug.

This is a recurring project pattern: a harness-local patch can make one experiment trustworthy while leaving the shared experimental substrate broken.

**Control exported:** when an experiment uncovers a configuration semantic bug, audit the shared normalization/dispatch boundary, not just the triggering script.

## 6. A supposedly fresh 286/1700 Corpus-2 refresh ran stale solver code

Commit `607670fbacc3de52261a25c17632b4b732a9ea6c` found that the July 17 Corpus-2 refresh attributed to newly merged repair-probe fixes never executed those fixes at all.

The 20 `stress-corpus2-batch-NN` branches from the prior run still existed. The workflow definition came from current `main`, so the new 20M node-budget input appeared in metadata, but each job's checkout logic resumed from its existing batch branch. Those branches did not contain the two repair-probe fix commits.

The mismatch was demonstrated multiple ways:

- `git merge-base --is-ancestor` showed the fix commit absent from sampled batch branches;
- R01698's supposedly fresh result was byte-identical to the archived old result;
- direct current-code reproduction with identical budget ran the full probe -> main DFS/beam -> repair pipeline rather than the truncated stale-branch flow.

Thus the reported **286/1700** result and its attribution to the repair-probe fixes were invalid.

**Classification:** execution-code identity broken. Workflow-ref freshness did not imply checked-out solver freshness.

## 7. Resetting stale branches still left a second no-op trap

Commit `5bb25242ca5523cf3765d4f49c6c573ddbaf1b9a` found that resetting all batch branches to `main` was still insufficient.

`main` itself contained the previous completed batch checkpoint files. A freshly reset branch therefore inherited a fully populated `batch-NN.checkpoint.jsonl`; `--resume` would treat every level as complete and make the next “refresh” a near-instant no-op.

The eventual cleanup required both:

1. reset each batch branch to current `main`;
2. explicitly remove its live checkpoint/result files.

Both branch ancestry and checkpoint absence were then verified.

**Classification:** treatment never ran because persistence state said work was already complete.

## 8. Why this matters beyond July

These failures cover four distinct identities that a solver experiment must preserve:

| identity | historical failure |
|---|---|
| requested treatment | safety valve kept disabled attempt alive |
| resolved configuration | sparse object disabled or enabled unrelated mechanisms |
| executable mechanism | registry flag existed but no consumer read it |
| code + run state | batch branch ran stale source or inherited completed checkpoint |

A result can have perfect-looking JSON provenance and still be wrong if any one of those identities is false.

## 9. Current experimental rule

For any decision-bearing solver experiment, persist or verify enough evidence to answer all of these before interpreting outcome:

1. **Code identity:** is the treatment commit actually an ancestor of the executable checkout?
2. **Resolved configuration:** after defaults/proxies/normalization, which flags are truly on and off?
3. **Consumer participation:** did the actual mechanism read that configuration and execute nonzero treatment work?
4. **Comparator identity:** is the control running the intended current baseline rather than an impaired/stale variant?
5. **Persistence freshness:** did resume/checkpoint/cache state skip work that the experiment intended to rerun?
6. **Population validity:** were rows produced after the instrumentation/configuration semantics being used to classify them?

Current Pathfinder research practice increasingly records these fields explicitly. This archaeology shows why they are correctness conditions for the research program, not administrative polish.

## Bottom line

Several historical solver verdicts were not merely noisy. Their labels described treatments that did not exist at runtime:

- disabled mechanisms still ran;
- named flags did nothing;
- unrelated mechanisms silently changed state;
- an opt-in negative was actually a different multi-treatment arm;
- an entire fresh corpus refresh ran stale code;
- a reset branch could still skip all solving from inherited checkpoints.

The durable lesson is simple: **experimental identity must be observed after all normalization, checkout, resume, dispatch, and consumer boundaries.**