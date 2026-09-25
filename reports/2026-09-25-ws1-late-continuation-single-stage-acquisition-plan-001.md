# WS1 late-continuation single-stage acquisition plan 001

> **Status:** active
> **Last evidence:** 2026-09-25 — after the statistical/producer correction merged, recovery of un-PR'd branch `claude/solver-optimization-queue-ybpl88` revealed that seed `2026092501` had already generated a 160-parent corpus before final precommitment. No solver was run on that block, but it is no longer an unseen confirmation seed. This revision quarantines that block and freezes replacement seed `2026092591` before any generation.
> **Decision:** keep one N=160 confirmation block, freeze replacement master seed `2026092591`, require `>=3` independently nominated parents, and preserve the Stage-A `portfolio-solve-sweep.mjs --scheduler-mode=production` producer/row semantics. The previously generated `2026092501` corpus is quarantined from decision-bearing use.
> **Remaining gate:** implement/dispatch this exact single-block protocol and apply the frozen model unchanged.
> **Evidence role:** design
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Production effect:** none. Design only; no acquisition run yet.

## Why the prior Stage A result does not resolve this question

`reports/2026-09-25-ws1-late-continuation-stage-a-opportunity-canary-result-001.md` correctly applied
its own precommitted stop rule (0/5 scoreable validation-split levels nominated a pre-winner boundary,
below the `>=3` floor) and correctly declined to widen the model or draw again under that
precommitment. That report is not being reopened or second-guessed here. But its own text already
flags the ambiguity it could not resolve: "n=1 solved-in-validation-split is far too small to
distinguish 'mechanism absent' from 'mechanism present but this exact sample missed it.'" This report
quantifies that ambiguity and proposes a plan sized to actually resolve it.

### The Stage A floor was under-powered relative to its own sizing basis

The preflight's own sizing basis (`reports/2026-09-22-ws1-independent-continuation-confirmation-
preflight-001.md`) states two planning numbers from the historical retained-evidence run:

- **25.0%** of solved C2 validation-split levels contain a nominated pre-winner boundary (89/356);
- **68.8%** overall C2 solve rate (1,169/1,700);
- the model's development/validation split is a fixed ~70/30 function of level ID.

Chaining these gives the expected count of *scoreable and nominated* parents for a fresh draw of `N`
independent parents:

```
E[nominated] ≈ N × 0.30 (validation split) × 0.688 (solve rate) × 0.250 (capture rate)
             ≈ 0.0516 × N
```

At `N = 24` (the actual Stage A size), `E[nominated] ≈ 1.24` — already below the precommitted `>= 3`
floor **in expectation**, before any sampling variance is even considered. Using a Poisson
approximation with mean 1.24, `P(X >= 3) ≈ 0.19`: even if the mechanism transfers exactly at the
historical rate, Stage A had roughly an **81% chance of failing its own floor by construction**. The
observed 0-nominated outcome is fully consistent with either "the mechanism does not transfer" or
"the mechanism transfers exactly as before, and this specific small draw came up short" — Stage A
cannot distinguish these, and was never sized to.

(The historical Stage B floor, `>= 12` nominated parents at `N = 96`, has the same issue by this same
formula: `E[nominated] ≈ 0.0516 × 96 ≈ 4.95`, well under its own 12-parent bar. Stage B was never
reached, so this was never tested in practice, but the same under-sizing would likely have recurred
there too. This is a genuine sizing gap in the original preflight's own numbers, not a critique of its
methodology otherwise — the qualitative reasoning was sound; the arithmetic connecting "25% capture
rate" to "N parents needed for a >=3/>=12 floor" was not carried through.)

## Sizing this plan

Target: choose `N` so that, if the mechanism transfers at the historical rate, the precommitted
breadth floor has <2% false-stop probability from sampling variance alone.

Using the same per-parent nomination probability `p ≈ 0.0516`, the exact model for a fresh `N=160`
block is `X ~ Binomial(160, 0.0516)`, with `E[X] = 8.256`. Exact lower-tail probabilities are:

- `P(X < 3) ≈ 0.99%`;
- `P(X < 4) ≈ 3.23%`.

Therefore **`>=3` nominated independent parents is the largest integer breadth floor that satisfies
the plan's stated <2% sampling-variance false-stop target**. The earlier `>=8` wording incorrectly
used the expected count itself as a pass threshold; at this `N`, that would pass only about 58.7% of
draws even if the historical rate transferred exactly.

The original expectation calculation still motivates the block size:

```
N ≈ 8 / 0.0516 ≈ 155
```

**Proposed single block: N = 160 independent fresh parents**, from the same `random`
witness-first source used by both prior stages (rounded up from 155 for a clean shard-friendly count
and a small additional safety margin).

This replaces the two-stage Stage A/Stage B structure with one directly-sized draw: the two-stage
design's own purpose (cheaply screen for zero opportunity before paying for a larger confirmation
block) is not needed once the single block is already sized to be confirmation-grade on its own — an
opportunity-screening stage smaller than the confirmation floor requires is not actually cheaper in
expectation once its high false-stop rate is accounted for (a failed under-powered Stage A still
consumes real compute and, per its own stop rule, ends the line of inquiry).

## Prespecified success criteria

Adapted from the original Stage B confirmation rule (`reports/2026-09-22-ws1-independent-continuation-
confirmation-preflight-001.md`), scaled proportionally where the original bound was `N`-dependent and
kept as-is where it was not:

1. **Zero recorded winner endangerment** under the frozen observational rule (unchanged; a hard
   correctness gate, not scaled).
2. Aggregate captured canonical pre-winner work share **>= 5%** among scoreable solved rows (unchanged
   from the original Stage B floor — this is a rate, not a count, and does not need rescaling for a
   different `N`).
3. Frozen-model nominations on **>=3 independent parents**. This is the precommitted lower-tail breadth
   gate implied by the plan's own historical rate: at `N=160`, exact binomial `P(X<3)≈0.99%`, while
   `P(X<4)≈3.23%`. The count gate is deliberately a breadth/sampling guard, not the effect-size gate;
   criterion 2's `>=5%` captured canonical pre-winner work share carries the magnitude requirement.
4. No single parent contributes **>35%** of nominated work (unchanged rate-based bound).
5. Nominated work remains predominantly same-stage late continuation, matching the historical pattern
   (unchanged).
6. Result/referee/integrity evidence complete (unchanged).

Failure of any gate stops this line of inquiry under this exact plan. Do not rescue a negative by
retuning signatures, bins, thresholds, seed, or source — per the same discipline the prior stages
already established.

## Precommitment recovery: quarantined generated block

Before this corrected plan was finalized on main, un-PR'd branch `claude/solver-optimization-queue-ybpl88` generated a 160-parent block with seed `2026092501` at commit `49a8773262f3889350766482920038d7fd49e761`.

Important facts:

- generation used the same unchanged random generator implementation that current main still carries;
- the block has the intended question id, confirmation evidence role, block id and U00001–U00160 namespace;
- **no solver run was executed** on that block;
- nevertheless, the population existed before the final precommitment and could in principle have been inspected.

Therefore that generated block is **not** the decision-bearing confirmation population. It remains quarantined historical/recovery evidence only. Do not merge its corpus/IDs into the confirmation execution path and do not use any of its structural contents to alter thresholds, routing, model membership or protocol.

Replacement seed `2026092591` was selected after this recovery. Default-branch code search and repository commit search found no existing use before this revision. The one-shot workflow must generate the replacement block only after this plan/quality revision is merged.

## Protocol (for dispatch time, not dispatched here)

- Source/generation command, frozen exactly:

  ```sh
  npm run research:generate-levels -- \
    --method=random \
    --count=160 \
    --master-seed=2026092591 \
    --question-id=WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE \
    --evidence-role=confirmation \
    --block-id=ws1-late-continuation-single-001 \
    --id-prefix=U \
    --out=tmp/ws1-late-continuation-single-001/corpus.json \
    --manifest=tmp/ws1-late-continuation-single-001/generation-manifest.json
  ```

  This is the same witness-first random source as both prior stages. Do not add `--overwrite`,
  envelope caps, passthrough generator flags, or substitute another source.
- Count: **160** independent fresh parents.
- Master seed: **`2026092591`**, frozen in this recovery revision after discovery that `2026092501` had already generated an un-PR'd corpus. Default-branch code search and repository commit search found no prior use of `2026092591` before this revision. Do not substitute another seed at dispatch time.
- Evidence role: `confirmation` (this block directly answers the confirmation question; there is no
  separate development/opportunity stage in this design).
- Block id: `ws1-late-continuation-single-001`.
- Suggested ID prefix: `U` (both `W`/Stage A and `V`/Stage B are already reserved in the prior
  preflight).
- Production solve protocol: unchanged from Stage A and **producer-locked** —
  `scripts/portfolio-solve-sweep.mjs --scheduler-mode=production`, node budget 50,000,000, canonical
  work budget 67,000,000, non-binding wall deadline, no baseline/prime-winner/attempt-cache/hints,
  level-blind. The frozen-model scorer consumes this producer's per-attempt production-ladder rows;
  `solver-level-blind-targeted-sweep.yml` is not an interchangeable execution surface unless a separate
  row-semantics parity proof is added before dispatch.
- Analysis: `scripts/apply-action-selection-legal-signal-model.mjs` against the same frozen model
  (`reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`), unmodified, no
  refit — identical to both prior stages.
- Execution topology: use the dedicated one-shot GHA wrapper **`.github/workflows/ws1-late-continuation-single-stage-confirmation.yml`** for this confirmation rather than
  overloading the generic targeted sweep. The wrapper must (1) generate/freeze the exact 160-parent
  corpus from the preregistered command/seed, (2) shard only the real `portfolio-solve-sweep.mjs`
  production solve over that immutable corpus, (3) combine the produced rows, and (4) run the frozen
  model + integrity/reporting deterministically. Reuse existing generation, portfolio-sweep, combiner,
  experiment-contract and publication primitives; do not create a second solver implementation or
  alternate row schema. The one-shot workflow is retired after the result is durably recorded. Its scientific protocol has no dispatch-time parameters; workflow dispatch selects only the repository ref/commit.

## Plan-quality closure

Sibling machine closure contract:
`reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.quality.json`.

Before workflow implementation, require:

```sh
npm run plan:quality -- --plan=reports/2026-09-25-ws1-late-continuation-single-stage-acquisition-plan-001.md
```

The quality contract owns the exact generation/population proof, portfolio-producer identity,
complete 160-row solve contract, frozen-model criteria, splash-zone reconciliation, and one-shot
workflow retirement proof.

## What this plan does not authorize

- No acquisition run — this is a design document only.
- No claim that `N=160` is mathematically unique. It is the frozen size for this plan because, under
  the retained historical rate, it gives `E[X]=8.256` and an exact `P(X<3)≈0.99%`, satisfying the
  precommitted <2% false-stop target for the `>=3` breadth gate. Changing `N` or the floor requires a
  new plan before dispatch, not reviewer preference after seeing results.
- No change to the frozen model, split function, or thresholds.
- No claim about whether the historical 25%/68.8% rates will actually recur on fresh parents under
  current code — that is exactly what this plan is designed to test, not something it assumes.

## Recovery record

- `reports/2026-09-25-ws1-precommitment-overlap-recovery-001.md` records the recovered Claude generation, the false seed-freshness assumption, and the quarantine/replacement decision.

## Artifacts

- `reports/2026-09-25-ws1-late-continuation-stage-a-opportunity-canary-result-001.md` — the closed
  Stage A attempt this plan replaces, and the source of the under-sizing observation above.
- `reports/2026-09-22-ws1-independent-continuation-confirmation-preflight-001.md` — the original
  two-stage precommitment and its sizing-basis numbers (25.0% capture rate, 68.8% solve rate), reused
  here unchanged.
- `reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json` — the frozen model this
  plan would apply unmodified.
