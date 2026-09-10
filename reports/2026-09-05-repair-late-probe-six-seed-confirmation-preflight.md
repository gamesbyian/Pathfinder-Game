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

## Preparation completed (2026-09-10)

Implementation, population, and budget envelope are frozen; the population-scale A/B itself has not been dispatched yet.

**Implementation.** `repairLateProbeMultiSeedRetrySeedCountOverride` (SolveOpts, `orchestration.ts`) is a strict no-op when omitted; `computeStageBudgetPlan` (`stage-budget.ts`) resolves it into the actual salt slice once, and both the additive node reserve and the orchestration execution loop read that same resolved array, so a value like 6 always means exactly salts 1-6 with six per-seed reserves in lockstep. Threaded through `level-blind-capability-sweep.mjs` (`--repair-late-probe-multi-seed-retry-seed-count`) and `solver-level-blind-targeted-sweep.yml` (`repair_late_probe_multi_seed_retry_seed_count`), same omitted-means-production-default shape as sibling overrides, and verified end-to-end that the flag reaches `effectiveConfig` provenance. Unit/regression coverage: pure `computeStageBudgetPlan` tests (omitted, 6, 0, out-of-range/non-integer fallback) plus orchestration-level tests proving the exact recorded `seedSalt` sequence for omitted (`[1..7]`) vs. 6 (`[1..6]`) against the real execution loop.

**Population.** The 40-level discovery population is `data/stress/static-portfolio-entrypoint-production-ab-001-population.json` (the same 40 ids `2026-09-04-repair-late-probe-multi-seed-retry-tail-audit-001.md` reused). No development A/B or other candidate-specific population exists for this line beyond that. Rather than an unconditioned random draw, the confirmation population is reach-conditioned on **legal control-side evidence**: `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s per-level `reachedTechniques` (level-blind, production-default seven-seed dispatch, run [33841017634](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33841017634)) — 223/1700 corpus2 levels reach `late-repair-multiseed-retry` under control, 214 remain after excluding the 40-level discovery population (9 of which overlap, consistent with the discovery report's own 9/40 finding). `scripts/stress/materialize-repair-late-probe-six-seed-confirmation-001.mjs` draws 150 of the 214 with frozen seed `repair-late-probe-six-seed-confirmation-001`; output committed as `data/stress/repair-late-probe-six-seed-confirmation-001-{population.json,ids.txt,selection-manifest.json}`. This upgrades the population design in the same direction §"If the population barely reaches the tier..." anticipates as a fallback, applied proactively since the reach evidence was already available — it should make the confirmation informative on the first dispatch rather than needing a redraw.

**Budget envelope — corrects this preflight's own "strict ceiling" framing.** Locally validating the envelope (as this preflight requires) on one population member (`R00088`, corpus2 pos:10) under two candidate configurations found:

- Reusing the admissible-order confirmation-006 envelope (`node_budget_advisory_only=true`, `strict_total_work_budget=true`, `work_budget≈1,005,000,000`, sized from the generic 40-level admissible-order production sample's observed max) **starves the target tier completely**: `late-repair-multiseed-retry` reports `reached: true` but `starvedByWorkBudget: true`, all 7 seeds get `allocatedWorkCeilings: [0,0,0,0,0,0,0]`, `actualWork: 0`. The run stops at `work-budget-reached` (exactly 1,005,006,398) before the dead-last tier ever gets a share — earlier tiers alone consume the entire strict cap on this population's deliberately tail-reaching levels. That envelope was sized for a *different* candidate's concern (isolating a work-budget-*fraction* change from node-budget confounding) and does not transfer: it would have produced a non-participating, non-informative population-scale run, exactly what the frozen decision rule above says not to count as a null.
- Plain production defaults (`node_budget=50,000,000`, `strict_total_work_budget=false` — the workflow's own defaults, and the same condition this population was selected under) give the target tier full, clean participation: all 7 seeds get their complete 5,000,000-node allocation (`actualNodes: 35,000,002`, `actualWork: 136,991,649`, no starvation flags), the run stops cleanly at `node-budget-reached` (a real, enforced, bounded stop — total node consumption across the whole ladder is mathematically capped by the sum of finite per-tier node reserves, unlike the advisory-node-budget case where nodes become unbounded), and wall time is 652,076ms (~10.9 min), consistent with production's own documented per-level scale and comfortably inside shard timeout budgets.

**2026-09-10 correction (per [`envelope audit`](2026-09-10-repair-late-probe-six-seed-envelope-audit-001.md)):** the "plain defaults, no strict ceiling" decision above was itself imprecise about *why* the first strict-ceiling test failed. That test's `node_budget_advisory_only=true` didn't just borrow an oversized cap — it removed the real 50M node stop entirely, letting upstream stages balloon before the strict limit ever bound. The failure was that confound, not strict ceilings per se. Rather than drop the strict ceiling requirement, `solver-level-blind-targeted-sweep.yml` gained an independent `work_budget` input (blank preserves the existing `node_budget * 1.34` derivation exactly; a supplied value sets `--work-budget` without touching whether `--node-budget` is passed) so a genuinely independent strict ceiling can sit on top of the real node cap instead of replacing it.

Validated `node_budget=50,000,000` (real) + explicit `work_budget=500,000,000` (`--strict-total-work-budget`) — comfortably above the 223-level reach-conditioned population's own observed max (373,660,208, computed from `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s per-level `work` field for every level reaching this tier under control) — on three reach-conditioned population members (`R00088`, `R02856`, `R03355`, corpus2 positions 10/1187/1686). All three: `late-repair-multiseed-retry` reached, `starvedByWorkBudget: false`, full 7-seed participation (~35,000,000 actual nodes, 126M-141M actual work, 7/7 attempts each), stop cleanly at `node-budget-reached` — byte-identical to the plain-defaults results on the same levels, because the 500M ceiling never actually binds. It is a real backstop with zero behavioral cost on this population, not a tradeoff.

**Final decision:** dispatch both arms with `node_budget=50000000`, `work_budget=500000000`, `strict_total_work_budget=true` (no `node_budget_advisory_only`). This satisfies the preflight's original "strict total workSpent ceiling sized from representative production behavior" requirement literally, not just in spirit, while keeping the real node cap that production and this population's own selection condition both depend on. Each retained seed keeps the unmodified `REPAIR_LATE_PROBE_NODE_BUDGET` per the experimental contract; only `enable_flags`'s `repair_late_probe_multi_seed_retry_seed_count=6` differs between arms.

**Not yet done:** the population-scale 7-vs-6 dispatch itself. The concurrently running goal-attraction-disabled-retry confirmation-002 GHA arms that originally held this back are now both complete (control `34444934580`, treatment `34444937307`, both promoted — see that confirmation's own preflight).
