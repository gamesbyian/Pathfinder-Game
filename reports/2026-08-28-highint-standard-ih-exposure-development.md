# Very-high-intersection STANDARD intersection-harvest beam exposure

> **Status:** development in progress.
> **Candidate:** STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE.
> **Evidence role:** selected development replay + broader feature-defined development A/B; independent confirmation separately prespecified and not yet earned.
> **Branch:** codex/missing-exposure-and-budget-audit.

## Premise

The post-promotion current residual still contains levels for which the frozen T1 technique census shows an isolated solver that current production does not offer. Rebuilding that missing-exposure join against the current ladder nominated several beam seams.

The superficially largest diverse-IH seam was not reopened: that exact feature-gated treatment had already produced +9/-0 development evidence and then a genuine 0/0 independent confirmation, so re-running it would be evidence recycling rather than a new premise.

The next clean one-dimensional seam was the existing action beam:intersectionHarvest@beam2000 in the two very-high-intersection routing rules. Production already offers beam:intersectionHarvest@beam5000 there but not the STANDARD-width sibling.

In the current 721-level residual, frozen base-T1 evidence contains four such isolated STANDARD-IH wins: R01124, R02440, R02500, and R02718. Their isolated winning depths are all roughly 126K-170K nodes. These rows selected the candidate and therefore cannot be treated as independent evidence.

## Candidate implementation

The flag is default-OFF and purely additive. When enabled it appends exactly one existing action, beam:intersectionHarvest@beam2000, to each of the two very-high-intersection rules that currently lack it. The action trails the rule-local existing beam/DFS/perimeter actions. No profile weights, beam width implementation, prunes, seed policy, eligibility threshold, stage budget, or existing action order changes.

Focused attempts.test.ts coverage verifies production/default remains unchanged; exactly one STANDARD-IH action is added in each intended rule; the treatment is purely additive; and lower-intersection rules that already expose the STANDARD action are unchanged.

## Selected replay

Run: GitHub Actions 33149891586.

Population: the four census-nominated rows above. This is **selected replay evidence only**.

Envelope, both arms: node base/guard 50,000,000; work budget 67,000,000; strictTotalWorkBudget=true; generous 24h wall safety; attempt-budget telemetry enabled.

| metric | control | treatment |
|---|---:|---:|
| solved | 0/4 | **1/4** |
| aggregate work | 268,010,861 | **249,533,659** |
| treatment-only solves | — | **1** |
| control-only solves | — | **0** |

The rescued row is R02440. Control exhausted at 67,002,295 work. Treatment solved at 48,525,540 work. The winning attempt is the newly exposed main-loop|beam:intersectionHarvest@beam2000 itself, after the existing earlier actions failed. The winning beam consumed about 1.93M work.

This establishes the mechanism directly: the census nomination can survive real sequential-ladder context under a fixed whole-solve envelope, and the newly exposed action itself can be load-bearing. It does **not** estimate prevalence because the four rows selected the candidate.

## Broader development A/B

The next gate was frozen before its outcome.

Selector: scripts/stress/select-attempt-exposure-sample.mjs, using mechanics only. It identifies Corpus-2 levels where production control lacks beam:intersectionHarvest@beam2000 and enabling the candidate adds that exact action. No solver outcome, hint, stress metadata, or historical winner is read by the selector.

Current eligibility: **585** Corpus-2 levels after excluding the four selected-replay IDs.

Sample: deterministic random 120 / 585 eligible levels; seed 20260828; sample SHA-256 dc3a013471f58065fa12425b59b3b6f99fd05780facd9eb9eaa46ec97cb4fbc6; selected-replay IDs excluded before sampling.

Both arms use the same strict 67M whole-solve work envelope as the selected replay.

GitHub Actions run 33150739483 is the first valid execution of this exact broader design. An earlier attempt failed during sample materialization before any solver arm ran because an inline Node script tried to import the TypeScript-backed solver as a literal modules/solver.js file. That failure exposed no treatment outcomes and did not spend the sample. The planner was replaced with the bundled mechanics-only selector; validation and sample materialization then passed.

### Development verdict gate

The broad result is useful if it shows at minimum actual treatment participation, zero control-only losses, and at least one treatment-only solve or a comparably strong fixed-work benefit that gives a clear reason to continue.

A 0/0 result with verified participation closes the current broad form as development-negative. Non-participation is instrumentation/population evidence, not a solver null.

## Confirmation gate

If broader development is positive, the candidate is already frozen and must go unchanged into reports/2026-08-28-highint-standard-ih-confirmation-protocol.md.

That protocol fixes, before this broader result is known: fresh 1,200-level witness-first random pool; master seed 2026082804, prefix M; phase-1 control-only residual freezing; phase-2 paired comparison on the sealed control-failure residual; strict 67M total-work envelope; pass = >=1 treatment-only solve, zero control-only solves, verified participation and complete uncensored/error-free coverage.

No threshold/rule tuning from confirmation rows is permitted.

## Production state

No production behavior has changed. The candidate remains an opt-in experiment until and unless its full evidence gate passes.
