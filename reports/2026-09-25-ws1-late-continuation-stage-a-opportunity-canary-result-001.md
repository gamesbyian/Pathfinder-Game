# WS1 late-continuation Stage A opportunity canary result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-25 — local production sweep of the frozen 24-parent Stage A block (`ws1-late-continuation-opportunity-001`, master seed `2026092201`), solver ref `e3f94abd3e864d5eb271712725e19a694407ee5c`.
> **Decision:** **opportunity-starved on this fresh source/current code.** The frozen model finds zero nominated pre-winner boundaries on this canary (0/5 scoreable validation-split levels), well below the Stage A advance rule's `>=3` floor. Per the preflight's own stop rule, do not widen the model or change generator parameters to force exposure.
> **Remaining gate:** none for this exact precommitted plan. Stage B (the 96-parent confirmation block, seed `2026092202`) is **not generated or dispatched** — Stage A did not earn it.
> **Evidence role:** confirmation probe outcome, per `reports/2026-09-22-ws1-independent-continuation-confirmation-preflight-001.md`'s frozen precommitment.
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`

## What ran

Exactly the preflight's own frozen plan, no deviation:

1. `research:generate-levels -- --method=random --count=24 --master-seed=2026092201 --question-id=WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE --evidence-role=development --block-id=ws1-late-continuation-opportunity-001 --id-prefix=W --out=data/stress/ws1-late-continuation-opportunity-001.json` — 24 fresh independent parents, `attempts=32, witnessFails=8, structuralRejects=0, refereeRejects=0, noveltyRejects=0`. Population identity `sha256:487f71...`, source regime `random-uniform-v1`.
2. Production sweep on the exact frozen corpus, matching the preflight's production-solve protocol: `node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- --corpus=data/stress/ws1-late-continuation-opportunity-001.json --scheduler-mode=production --node-budget=50000000 --work-budget=67000000 --budget-ms=86400000 --workers=4`. No `--baseline`, `--prime-winner`, or `--attempt-cache` (confirmed null in the run summary); level-blind with respect to history, current production ladder unmodified.
3. `scripts/apply-action-selection-legal-signal-model.mjs` against the frozen model (`reports/stress/action-selection-legal-signal-frozen-model-2026-09-21.json`), unmodified, no refit.

Run locally rather than via GitHub Actions: 24 levels at 50M-node budget is small enough that a dedicated GHA dispatch would have been pure latency overhead for a canary this size, and canonical `workSpent`/node-budget accounting (what this question is actually about) is unaffected by local host contention.

## Solve outcome

**16/24 solved** (`solvedBeforeFallback=0`, `fallbackOnly=16`, `unsolved=8`), production scheduler, real search (not primed): `nodeBudget=50000000`, `baseWorkBudget=67000000`, `budgetMs=86400000` (non-binding), commit `e3f94abd3e864d5eb271712725e19a694407ee5c`.

## Frozen-model scoring

The model's own action-boundary dataset splits by `sha256(levelId)` into development (70%) / validation (30%) roles — a fixed function of level ID, independent of source or evidence role, applied identically to every input this tooling ever scores. Of the 24 Stage A parents, exactly **5 fell into the validation split**: W00009, W00014, W00017, W00019, W00024. Of those 5, only **W00009 solved**.

| Metric | Value |
|---|---:|
| Validation-split levels observed | 5 |
| Validation-split levels solved | 1 (W00009) |
| Pre-winner rows (validation, solved only) | **0** |
| Nominated pre-winner rows | 0 |
| Nominated canonical pre-winner work | **0** |
| Independent parents with a nominated boundary | **0** |
| Endangered winner levels | 0 |

W00009's winning attempt was its very first attempt (`early-repair-search|repair|score=repair|guidance=standard|seedSalt=0`, `attemptCount=1`) — there is no predecessor attempt at all, so the level structurally cannot contain a pre-winner boundary regardless of the model. This is not a scoring artifact; it is the level having zero opportunity by construction.

## Stage A advance-rule application

Per the preflight's frozen rule (`reports/2026-09-22-ws1-independent-continuation-confirmation-preflight-001.md`), advance to Stage B only if all of:

| # | Criterion | Result |
|---|---|---|
| 1 | Corpus/research-block/run integrity complete | ✅ pass (24/24 observed, population identity recorded) |
| 2 | Canonical per-attempt `stageId`/`workSpent` retained | ✅ pass (confirmed present on every attempt row) |
| 3 | **≥3 independent parents contain a nominated pre-winner boundary** | ❌ **fail — 0** |
| 4 | Nominated canonical work is non-zero | ❌ **fail — 0** |
| 5 | No single parent contributes >60% of nominated work | n/a (no nominated work to distribute) |
| 6 | No malformed/missing-work row makes the model unscoreable | ✅ pass |

Criteria 3 and 4 fail outright. Per the preflight: **"If Stage A has fewer than 3 nominated parents, stop as opportunity-starved on this fresh source/current code. Do not widen the model or change generator parameters to force exposure."**

## Interpretation

This is a genuine negative result, not a null result from insufficient sample: the retained historical evidence's own sizing note anticipated "a 24-parent canary should ordinarily expose only a handful of nominated parents if the mechanism transfers" (based on 89/356 ≈ 25% of solved C2 validation levels historically containing a nominated boundary). Zero out of one scoreable solved level is consistent with pure bad luck from the small canary size (n=1 solved-in-validation-split is far too small to distinguish "mechanism absent" from "mechanism present but this exact sample missed it") — but the preflight's own stop rule does not permit rescuing that ambiguity by widening the model, changing the split, or drawing a second opportunity sample outside the precommitted plan. The frozen plan's own answer to "not enough signal yet" is to stop, not to keep sampling until something appears.

This does **not** overturn the retained-evidence finding (6.93–9.91% capture across three historical C2 regimes, `reports/2026-09-21-action-selection-legal-signal-retained-evidence-result-001.md`) — that evidence stands on its own population. It does mean this specific fresh-acquisition attempt, under this specific precommitted plan, did not clear the bar needed to justify spending a 96-parent Stage B confirmation block.

## What this result does not authorize

- Does not generate or dispatch the Stage B 96-parent confirmation block (seed `2026092202`).
- Does not widen the frozen 15-signature model, change the development/validation split function, or retune thresholds in response to this outcome.
- Does not close `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE` itself — the retained-evidence positive result remains valid; only this fresh-acquisition confirmation attempt is closed.
- Does not license drawing a second random block under new seeds to "try again" outside a new, separately reasoned decision.

## Next action

Per the preflight's own next-implementation-step list, this exhausts the currently authorized WS1 fresh-acquisition attempt. A future session that wants independent-population confirmation for this question would need a new, explicitly reasoned acquisition plan (e.g., a larger single-stage draw with its own prespecified opportunity floor) rather than reopening this exact precommitment.

## Artifacts

- `data/stress/ws1-late-continuation-opportunity-001.json` — the frozen 24-parent Stage A corpus (generation manifest: `tmp/research-generation/WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE/seed-2026092201/generation-manifest.json`, not committed — regenerable deterministically from the recorded seed/method/count).
- `logs/ws1-stage-a/opportunity-001.json`, `logs/ws1-stage-a/opportunity-001-summary.md` — full production sweep result.
- `reports/stress/ws1-stage-a-opportunity-001-model-result.json` — frozen-model scoring output.
