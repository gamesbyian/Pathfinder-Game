# Repair late-probe six-seed confirmation: envelope audit

> **Status:** active
> **Last evidence:** 2026-09-10 — PR #1704's strict-work probe also removed the production 50M node cap; a fresh node-capped production-shaped artifact puts current target-stage reachers around 196M-295M whole-solve work.
> **Decision:** keep the merged seed-count implementation and frozen 150-level reach-conditioned population, but **do not dispatch the 7-vs-6 confirmation under the current `strict_total_work_budget=false` addendum**. The original confirmation contract requires matched whole-solve work. The local test that motivated abandoning strict work changed two budget axes at once by also removing the production 50M node cap.
> **Remaining gate:** give `solver-level-blind-targeted-sweep.yml` an independent optional `work_budget` input, preserving the 50M node cap while applying a separately sized strict total work ceiling; validate that envelope on frozen-population reachers before either arm is dispatched.
> **Evidence role:** methodology audit / execution guard. No treatment outcomes have been observed and no solver behavior is changed here.

## What changed

PR #1704 correctly implemented the experiment-only seed-count seam, wired it through the level-blind targeted sweep, kept reserve accounting and the actual salt slice in lockstep, and froze a legal control-side reach-conditioned population. Those parts remain valid.

Its preflight addendum also tested an attempted strict-work envelope on `R00088`. That test used both:

- `strict_total_work_budget=true`; and
- `node_budget_advisory_only=true`.

The second setting means the ordinary 50M `nodeBudget` was **not passed to the solve at all**. Earlier additive stages were therefore allowed to expand far beyond the node-capped production-shaped ladder before the strict work limit bound. On that altered envelope, earlier tiers consumed about 1.005B work and `late-repair-multiseed-retry` reached nominally but received zero work. That result proves the borrowed 1.005B advisory-node envelope is unsuitable. It does **not** prove that a strict work ceiling is incompatible with this confirmation.

The addendum then switched to `node_budget=50,000,000`, `strict_total_work_budget=false`. That restores target-stage participation, but it drops the preflight's prespecified matched-work requirement rather than isolating the reason the first strict test failed.

## Current production-shaped evidence

A fresh completed targeted sweep from 2026-09-10 provides a useful control-side sanity check without new compute: GHA run `34444934580`, head `7ac1a9907bd02783238e137f07fe2254203751c8`, used the ordinary 50M node cap with non-strict additive work semantics.

From its retained `targeted-sweep-combined` artifact (`10141247127`), 19/150 levels reached `late-repair-multiseed-retry` as identified by their recorded action keys. Their actual whole-level `workSpent` distribution was:

| statistic | `workSpent` |
|---|---:|
| minimum | 195,573,887 |
| median | 260,727,487 |
| p75 | 268,390,311 |
| p90 | 271,195,610 |
| p95 | 274,847,095 |
| maximum | 294,654,758 |
| mean | 253,698,694 |

This is the relevant production-shaped scale: with the node cap retained, current target-stage reachers in this independent run finished around 196M-295M total work, not >1B. The older control-side capability run `33841017634` tells the same qualitative story for `R00088` itself: under the 50M node-capped ladder it stopped at 192,500,008 nodes and 274,207,505 work.

The difference is explained by the budget-axis change. Removing the node cap in the failed strict probe gave upstream stages far more room to consume work before the dead-last target tier. The probe therefore tested a materially different scheduler envelope, not merely "production plus a strict work guard."

## Tooling gap

The maintained targeted-sweep workflow currently derives the per-level work budget from the node input (`work = node_budget * 1.34`). It can make the node budget advisory, but it does not expose an independent work-budget value while retaining the node ceiling.

That couples two controls which this experiment needs to set independently:

1. keep `node_budget=50,000,000` so upstream stage/node behavior remains production-shaped and the frozen reach condition remains meaningful;
2. set a larger **strict total work ceiling** high enough not to starve the seven-seed control before or inside the target tier.

Using `node_budget_advisory_only=true` solely to obtain a larger strict work budget is therefore the wrong workaround: it changes the upstream search envelope that the experiment is supposed to hold fixed.

## Required workflow correction

Add an optional `work_budget` workflow input to `solver-level-blind-targeted-sweep.yml` with these semantics:

- blank preserves existing behavior exactly: derive `node_budget * 1.34`;
- a supplied value becomes the explicit per-level `--work-budget` without changing whether `--node-budget` is passed;
- the resolved value is used consistently by the canary, first-pass shards, recovery shards, planner/timeout sizing where work is the relevant bound, validation, and effective-configuration provenance;
- `node_budget_advisory_only=true` continues to require `strict_total_work_budget=true`, but is not required merely because an explicit work budget is supplied.

This is general experiment plumbing, not solver policy. Existing dispatches with blank `work_budget` must remain byte-for-byte equivalent in resolved solver options.

## Envelope validation after the workflow fix

Use the already-frozen 150-level population. Do not redraw it and do not inspect six-seed outcomes while tuning the envelope.

Start the local/control-side validation with:

- `node_budget=50,000,000`;
- `strict_total_work_budget=true`;
- explicit `work_budget=350,000,000` as a **validation candidate, not yet a frozen value**;
- seven seeds / production control configuration.

The 350M candidate is deliberately above the current independent target-reacher maximum of 294.7M while remaining close enough to the observed production scale to be a meaningful guard. Validate at least `R00088`, plus `R02856` and `R03355` from the frozen confirmation population; the latter two independently reached the target stage in run `34444934580` at 260,727,487 and 272,646,243 work respectively.

Accept the candidate only if the seven-seed control reaches the target tier normally, retained seeds receive their full intended per-seed allocation, no work-budget starvation occurs before the target comparison can be expressed, and the stop/result telemetry is complete. If it binds too early, raise the ceiling using **control-side node-capped work only**, then freeze the corrected value before either population-scale arm is run. Do not tune from six-seed treatment outcomes.

Once frozen, dispatch both arms with the same 50M node cap and the same strict total work ceiling. The treatment differs only by `repair_late_probe_multi_seed_retry_seed_count=6` (this is its own workflow input, not an `enable_flags` entry). The original zero-loss / no-seed-7-exclusive-rescue / material-work-saving decision rule remains unchanged.

## Current scheduling state

The separate goal-attraction fresh-work-pool confirmation-002 runs that PR #1704 was waiting on are now both complete successfully (`34444934580` control and `34444937307` treatment). There is therefore no remaining concurrency blocker. The only blocker recorded here is experimental validity of the six-seed work envelope.
