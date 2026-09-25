# WS1 remaining-length intra-solve bridge Stage A result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-25 — local dispatch, frozen 20-level Stage A population, `scripts/stress/ws1-remaining-length-intrasolve-bridge.mjs`, solver ref `247a73b85b18ef833bff90d0f4a948a9a7f231cd`.
> **Decision:** **BRIDGE-NEGATIVE**, per the preflight's own frozen decision rule. The treatment (reorder the elite-prefix completion candidate pool by ascending index-depth remaining-length proxy) produces zero treatment-only solves, zero control-only losses, and *more* total canonical work than control (ratio 1.0082), not less — failing both the bridge-positive and directional-only bars.
> **Remaining gate:** none for this tested intra-solve form. Close `WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE`. Do not rescue by retuning prefix fraction, elite count, per-candidate cap, or total cap — the preflight explicitly forecloses that.
> **Evidence role:** first falsifier — the preflight's own harness, dispatched for the first time on its frozen population.
> **Research questions:** `WS1-REMAINING-LENGTH-INTRA-SOLVE-BRIDGE`
> **Production effect:** none. Research-only harness; no `--save-hints`, no production code path touched.

## Population and protocol

Reused the preflight's own frozen 20-level Stage A population verbatim (no new acquisition):
`data/stress/stress-levels-random.json`, ids listed in the preflight's Stage A population section,
historical control reference `reports/2026-08-07-repair-elite-prefix-dfs.md`.

- Command: `node scripts/run-bundled.mjs scripts/stress/ws1-remaining-length-intrasolve-bridge.mjs -- --out=reports/stress/ws1-remaining-length-intrasolve-stage-a-001.json`.
- Frozen treatment: ordering key `requiredLength - destroyIdx` (index-depth proxy, not literal counted remaining length), `nodeBudget=15,000,000`, `wallMs=300,000`, `candidatePerAttemptNodeCap=15,000`, `candidateSharedCallNodeCap=90,000` — every value taken from the preflight, none retuned.
- Exact counted residual length and portal-jump count were recorded observationally at every replayed candidate prefix but never used as an ordering input, per the preflight's "post-recovery semantic clarification."

## Results

| Metric | Value |
|---|---:|
| Levels | 20/20 completed |
| Control solved | 1 (`R02239`) |
| Treatment solved | 1 (`R02239`) |
| Treatment-only gains | **0** |
| Control-only losses | **0** |
| Total control work | 886,270,309 |
| Total treatment work | 893,534,031 |
| Treatment/control work ratio | **1.0082** (treatment used *more* work) |
| Levels with >=1 treatment mechanism trigger | 19/20 |
| Total triggers / candidate attempts / candidate nodes | 1,617 / 19,268 / 54,427,627 |

Full per-level breakdown: `reports/stress/ws1-remaining-length-intrasolve-stage-a-001.json`.

The one shared solve (`R02239`) is not itself evidence for or against the treatment: it recorded
**zero** triggers and zero candidate attempts in both arms (`trace.triggerCount: 0`), and control and
treatment are byte-identical on it (238,903 nodes, 448,982 work, same solution) — this level simply
never reached the repair seam the treatment reorders. The treatment mechanism *was* genuinely
exercised elsewhere: 19/20 levels recorded real triggers, 1,617 total across the population,
54.4M candidate nodes spent replaying the reordered pool. This rules out a "blocked" verdict (missing
exercise) — the mechanism ran for real, and produced no benefit.

## Applying the preflight's frozen decision rule

- **Bridge-positive** requires >=1 treatment-only solve. Actual: 0. **Fails.**
- **Directional only** requires identical solved sets (true here) *and* either earlier completion or
  materially lower candidate-pool work with no regression. Actual: work is 0.82% *higher* under
  treatment, not lower, and the one shared solve shows no completion-time difference. **Fails.**
- **Bridge-negative**: "zero treatment-only gains and no material work improvement." Matches exactly.

**Verdict: BRIDGE-NEGATIVE.**

## What this closes and does not close

Closes: the tested intra-solve form of transporting the cross-row remaining-length allocation effect
(H3/Card-E) into a per-level elite-prefix completion candidate reorder, under the frozen ordering key,
prefix fraction, elite count, and node caps. Per the preflight, this is not rescuable by retuning any
of those knobs within this same mechanism.

Does not close: the underlying cross-row remaining-length allocation effect itself (H3/Card-E stand
as-is, unaffected), nor a materially different transport mechanism (e.g., a different seam than the
elite-prefix completion candidate pool, or a different current-input proxy entirely) — those would be
new, separately-justified questions, not a retry of this one.

## Artifacts

- `reports/stress/ws1-remaining-length-intrasolve-stage-a-001.json` — full result (population,
  per-level control/treatment rows, candidate-attribution trace).
- `scripts/stress/ws1-remaining-length-intrasolve-bridge.mjs` — the frozen Stage A harness.
- `reports/2026-09-22-ws1-remaining-length-intrasolve-bridge-preflight-001.md` — originating preflight
  and frozen decision rule.
