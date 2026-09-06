# Beam policy-switch inherited-frontier confirmation preflight

> **Status:** active
> **Last evidence:** 2026-09-05 — The one-handoff development signal remains 2/60 inherited-only solves with no fresh-only losses, while cyclic/staged switching and naive beam→DFS handoff are closed negative.
> **Decision:** keep the single `intersectionHarvest -> objectiveFirst` inherited-frontier handoff alive as a narrow confirmation candidate, not a production recommendation.
> **Remaining gate:** run the frozen larger width-200 confirmation; only a positive replication earns production-width continuation-capture plumbing and a real-width fixed-work test.
> **Candidate:** one `intersectionHarvest -> objectiveFirst` inherited-frontier beam handoff
> **Evidence role:** confirmation of the 2026-09-03 rung-2 development signal
> **Current blocker to production relevance:** `captureContinuationOnBudgetExit` cannot currently capture at production beam widths above 256 because the mid-phase budget check fires first

## Why this remains open

The development pilot found 2/60 resumed-only solves and 0 fresh-only solves across two disjoint Corpus-2 samples under one fixed work envelope. Neither policy alone nor a fresh restart switch reproduced those two rescues. Repeated alternation, three-policy staging, and direct beam-to-DFS inheritance have since been tested and closed negative, so the simple one-handoff form is the only surviving positive resumability policy-switch result.

That signal is not production-ready. The pilot had to use `beamWidth=200` because the current capture mechanism cannot pause a live frontier at the work boundary for production widths 2000/5000: the independent mid-phase check observes the cap first and exits without a continuation. A larger width-200 replication can confirm the causal phenomenon, but cannot by itself justify production scheduler wiring.

## Confirmation contract

Before changing the continuation mechanism, run one larger same-form replication using the existing harness exactly as calibrated:

- profiles: `intersectionHarvest -> objectiveFirst`;
- width: 200;
- `W1=20,000`, total `W=300,000`;
- four arms unchanged: A-only, B-only, fresh A-then-B, resumed A-then-B;
- fresh population, disjoint from both prior 30-level samples;
- at least 120 usable Corpus-2 levels, selected before outcomes are observed.

Primary comparison is resumed-vs-fresh among rows with a genuine `liveHandoff=true`. Report resumed-only wins, fresh-only wins, total solve counts, live-handoff count, natural-exhaustion count, and work spent.

## Frozen decision rule

- **Positive replication:** resumed-only wins exceed fresh-only wins, with at least 2 resumed-only rescues and no evidence of systematic loss. Keep the mechanism alive and move to the production-width feasibility gate below.
- **Null:** zero or one resumed-only rescue with no directional advantage on the larger sample. Demote the one-handoff result to an interesting narrow pilot; do not invest in production-width capture plumbing unless a materially different pair/retention premise appears.
- **Negative:** fresh-only wins exceed resumed-only wins or inherited switching causes credible losses. Close this profile-pair form.
- A population with low `liveHandoff` participation is non-informative; do not count natural exhaustion as a policy-switch null.

## Production-width feasibility gate

Only after positive replication should code be changed to make work-boundary continuation capture possible at widths 2000/5000. That change must preserve ordinary search behavior and same-policy pause/resume equivalence.

The implementation problem is narrow: when the mid-phase budget check observes a work-cap exit and `captureContinuationOnBudgetExit` is requested, it must be able to produce a correct continuation at that boundary instead of returning an uncapturable timeout. Any fix must carry the partially processed phase state needed to avoid replaying or skipping frontier work; simply moving the check or suppressing it is not sufficient without an equivalence proof.

Required tests before production-width experimentation:

1. same-policy uninterrupted `W+Delta` equals pause-at-mid-phase `W` + resume `Delta` in result and cumulative canonical work;
2. no duplicated/repaid candidate work across the boundary;
3. natural exhaustion still produces no continuation;
4. omitted/default continuation options remain a strict behavior no-op;
5. production widths 2000 and 5000 can produce a live capture on a deterministic test fixture.

After that, rerun the same fixed-work handoff comparison at a real production width before any scheduler integration. Do not infer production value from the width-200 result alone.

## What is already closed

Do not spend new work on the old restart-vs-continuation production candidate. Its prespecified production-equivalent `W=150,000,000` pilot tied continuation and restart 9/36 with 0 gains/losses, so that wiring design is closed. Likewise do not repeat cyclic or three-policy beam switching, or direct unselected beam->DFS state handoff, without a materially new premise.
