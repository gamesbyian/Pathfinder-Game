# WS1 late-continuation single-stage acquisition plan 001

> **Status:** active
> **Last evidence:** 2026-09-25 — power analysis of `reports/2026-09-25-ws1-late-continuation-stage-a-opportunity-canary-result-001.md`'s own numbers found the prior Stage A canary (n=24) was under-sized relative to its own advance-rule floor; this report is a design-only replacement plan, not dispatched here.
> **Decision:** design (not dispatch) a single, properly-sized fresh-acquisition draw, replacing the two-stage Stage A/Stage B structure with one block sized so the historical capture rate would clear a confirmation-grade floor with high probability if the mechanism transfers.
> **Remaining gate:** dispatch this plan's single block, unchanged, and apply the frozen model exactly as before.
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

Target: choose `N` so that, if the mechanism transfers at the historical rate, the expected nominated
count comfortably clears a real confirmation floor even under Poisson variance — not just in
expectation.

Using the same rate (`0.0516 × N`) and requiring `E[nominated] ≈ 8` (chosen so `P(X < 3) ≈ 1.4%` under
a Poisson(8) approximation, i.e. a <2% false-stop risk purely from sampling variance if the mechanism
is real):

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
3. Frozen-model nominations on **>= 8 independent parents** (rescaled from Stage B's `>= 12` at
   `N=96` to preserve the same nominated-rate bar: `12/96 ≈ 12.5%` of `N`; `12.5% × 160 = 20` would be
   the literal rescale, but that assumes Stage B's own floor was itself well-calibrated to the
   historical 25% capture rate, which section above shows it was not — using the historical-rate
   expectation (`E[nominated] ≈ 8`) directly as the floor is the more defensible number: it asks
   "does this draw show at least the expected effect," not "does it show an arbitrarily higher bar
   inherited from an uncalibrated prior number." If reviewers prefer the more conservative literal
   rescale (`>= 20`), that is a stricter, equally defensible alternative — pick one before dispatch,
   not after seeing the result.
4. No single parent contributes **>35%** of nominated work (unchanged rate-based bound).
5. Nominated work remains predominantly same-stage late continuation, matching the historical pattern
   (unchanged).
6. Result/referee/integrity evidence complete (unchanged).

Failure of any gate stops this line of inquiry under this exact plan. Do not rescue a negative by
retuning signatures, bins, thresholds, seed, or source — per the same discipline the prior stages
already established.

## Protocol (for dispatch time, not dispatched here)

- Source: `research:generate-levels -- --method=random`, the same witness-first source as both prior
  stages, for direct comparability.
- Count: **160** independent fresh parents.
- Master seed: a **new** seed distinct from `2026092201`/`2026092202` (both already consumed by the
  closed Stage A attempt and the never-generated Stage B block) — e.g. `2026092501`, chosen fresh at
  dispatch time and frozen before any solve.
- Evidence role: `confirmation` (this block directly answers the confirmation question; there is no
  separate development/opportunity stage in this design).
- Block id: `ws1-late-continuation-single-001`.
- Suggested ID prefix: `U` (both `W`/Stage A and `V`/Stage B are already reserved in the prior
  preflight).
- Production solve protocol: unchanged from both prior stages —
  `scripts/portfolio-solve-sweep.mjs --scheduler-mode=production`, node budget 50,000,000, canonical
  work budget 67,000,000, non-binding wall deadline, no baseline/prime-winner/attempt-cache/hints,
  level-blind.
- Analysis: `scripts/apply-action-selection-legal-signal-model.mjs` against the same frozen model
  (`reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`), unmodified, no
  refit — identical to both prior stages.
- At 160 levels and the same 50M-node/67M-work budget as the 24-parent canary (which took a fully
  local run), this may be sized better for a sharded GHA dispatch (`solver-level-blind-targeted-
  sweep.yml` with an `ids_file`, or `research:generate-levels` + a dedicated workflow) than a local
  run, depending on measured per-level cost at dispatch time — not decided here.

## What this plan does not authorize

- No acquisition run — this is a design document only.
- No claim that `N=160` is the unique correct size; it is the smallest size that gets the historical
  point-estimate expectation comfortably clear of a `>=3`-style floor's sampling-variance failure
  mode, using the retained evidence's own numbers. A reviewer preferring a different confidence
  target (e.g. 99% instead of ~98.6%) would get a similar but not identical `N`.
- No change to the frozen model, split function, or thresholds.
- No claim about whether the historical 25%/68.8% rates will actually recur on fresh parents under
  current code — that is exactly what this plan is designed to test, not something it assumes.

## Artifacts

- `reports/2026-09-25-ws1-late-continuation-stage-a-opportunity-canary-result-001.md` — the closed
  Stage A attempt this plan replaces, and the source of the under-sizing observation above.
- `reports/2026-09-22-ws1-independent-continuation-confirmation-preflight-001.md` — the original
  two-stage precommitment and its sizing-basis numbers (25.0% capture rate, 68.8% solve rate), reused
  here unchanged.
- `reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json` — the frozen model this
  plan would apply unmodified.
