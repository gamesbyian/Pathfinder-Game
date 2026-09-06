# Repair late-probe multi-seed retry: six-seed confirmation preflight

> **Status:** active
> **Last evidence:** 2026-09-05 — The 40-level discovery audit found no reached-level unique best result from seed 7 beyond seeds 1–6, while seed 6 remained load-bearing; larger hints provenance cannot provide same-level multi-seed confirmation.
> **Decision:** proceed to an independent population-scale fixed-work confirmation of the narrow `7 -> 6` truncation only.
> **Remaining gate:** add the bounded seed-count experiment override, freeze a fresh disjoint population and strict work envelope, then run the paired seven-seed versus six-seed production A/B.
> **Evidence role:** independent confirmation of the exploratory 2026-09-04 tail audit
> **Candidate:** truncate `REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS` from `[1, 2, 3, 4, 5, 6, 7]` to `[1, 2, 3, 4, 5, 6]`
> **Control:** current production seven-seed policy
> **Treatment:** identical production policy except seed 7 is omitted
> **Primary outcome:** paired solve-set gains/losses under a matched whole-solve work envelope
> **Secondary outcome:** aggregate and per-level `workSpent`, stage reach, and seed-7 participation/cost

## Why this is ready for confirmation

The discovery audit in `2026-09-04-repair-late-probe-multi-seed-retry-tail-audit-001.md` found that, on the 9/40 levels reaching `late-repair-multiseed-retry`, seed 7 never produced a best-badness result not already reached by seeds 1-6. Seed 6 remained load-bearing, so the supported candidate is specifically **7 -> 6**, not a broader truncation. The stage accounted for about 6.4% of production `workSpent` on that 40-level sample; seed 7 was roughly one seventh of the stage's spend when reached.

That evidence is exploratory, proxy-based, and too small to change production. This confirmation is the prespecified decision test.

A subsequent local check of the larger hints-random provenance corpus cannot answer the question: non-zero repair seed salts are sparse and do not provide same-level multi-seed comparisons. Fresh execution evidence is therefore genuinely required.

## Experimental contract

Use a fresh, independently drawn Corpus-2 population that is disjoint from the 40-level discovery population and, where practical, from populations previously consumed by this repricing line. Population selection must occur before either arm's outcome is observed.

Run both arms through the same level-blind production entrypoint and the same population. The only behavioral difference is whether the multi-seed retry list contains seven salts or the first six.

Use a **strict total `workSpent` ceiling** sized from representative production behavior, rather than relying on an advisory node budget plus wall timeout. The admissible-order confirmation series established why this matters: additive retry tiers otherwise make the nominal work budget non-binding and can turn an A/B into a timeout experiment. Validate the chosen ceiling locally on at least one hard/reached level before dispatch.

Do not compensate the six-seed arm by enlarging any remaining seed's budget. Each retained seed keeps the production `REPAIR_LATE_PROBE_NODE_BUDGET`; this isolates the value of the seventh independent restart.

## Required instrumentation/result fields

For each arm report:

- solved count and exact solved IDs;
- paired gained/lost IDs;
- aggregate and per-level `workSpent`;
- `late-repair-multiseed-retry` reach count;
- per-seed attempt participation for reached levels;
- whether any solve in control is first obtained specifically by seed 7;
- errors, deadline truncations, node-budget stops, and work-budget stops;
- commit/SHA, corpus hash, sample hash, and resolved treatment configuration.

If feasible with existing lifecycle telemetry, also report the seventh seed's direct work contribution on control reaches so the realized production saving is measured rather than inferred as one seventh of stage cost.

## Frozen decision rule

Promote the six-seed policy if all of the following hold:

1. **zero treatment losses** relative to control on the confirmation population;
2. the treatment actually reaches the multi-seed stage on enough levels to make the test informative (a non-participating population is not a null confirmation);
3. seed 7 produces no unique control solve;
4. treatment reduces aggregate `workSpent` by a real, non-trivial amount on reached levels;
5. no execution confound or asymmetric truncation invalidates the comparison.

A treatment-exclusive gain is welcome but not required. This is a repricing/removal-of-tail-work decision; equal coverage at lower canonical work is a positive result.

If control has even one credible seed-7-exclusive solve, do **not** promote the unconditional six-seed truncation from that result. Preserve the evidence and investigate whether seed 7 has a narrower conditionally earned role rather than repeating nearby global seed-count guesses.

If the population barely reaches the tier, classify the result as non-informative and redraw according to a selection rule based only on legal/current-control reach predictors or an independently frozen residual design, without inspecting treatment outcomes.

## Smallest implementation seam

Do not add a permanent ablation feature merely to test this one numeric tail. Prefer an experiment-only `SolveOpts`/CLI override for the **number of multi-seed retry salts to consume**, defaulting to the current full array length. Thread it through `level-blind-capability-sweep.mjs` and `solver-level-blind-targeted-sweep.yml` in the same omitted-means-production-default style as `admissibleOrderNonDefaultRetryBudgetFractionOverride`.

The override should:

- accept an integer in `[0, REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length]`;
- affect both the stage's additive node reserve calculation and the orchestration loop's actual salt slice, so budget and execution cannot drift apart;
- remain a strict no-op when omitted;
- be emitted in experiment provenance/summary output;
- have a unit/regression test proving omitted/default behavior is unchanged and `6` executes exactly salts 1-6 with six per-seed reserves.

After this confirmation is concluded, retain the generic bounded seed-count override only if it is useful for future fixed-work repricing; otherwise remove experiment-only plumbing after recording the result.

## Disposition after result

On a clean positive confirmation, change the production constant/list to six seeds, update `docs/solver-opt-in-experiment-ledger.md` and `docs/solver-optimization-workstreams.md`, and record the measured work saving and zero-loss population evidence in a dated result report.

On a negative result, leave production at seven seeds and mark the unconditional 7 -> 6 form closed unless materially new evidence identifies a narrower conditional premise.
