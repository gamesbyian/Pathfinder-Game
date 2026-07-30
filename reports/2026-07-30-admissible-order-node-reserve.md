# The admissible-order tier was node-starved; a 25% node reserve is worth +21 on its own levels (2026-07-30)

Implementation + A/B. Follows `reports/2026-07-31-admissible-order-tier-node-starvation.md`, which
sized the prize but changed no code. Verdict: the diagnosis reproduces, the fix works, and the cost
is neutral-to-slightly-cheaper.

**Headline**: on the 141 corpus-2 levels that carry a validated admissible-order hint and were
unsolved at the typical-budget baseline, reserving 25% of the node ceiling for the tier is worth
**+21 net solves** (22 gained, 1 lost), every gain referee-valid and won by the tier itself. On a
deliberately worst-case control group of 45 already-solved levels, the same change is **+2 net**
(5 gained, 3 lost). The tier went from running on 73/141 levels to **141/141**.

---

## 1. The bug

`ADMISSIBLE_ORDER_BUDGET_FRACTION` provisions the tier in **time** (1.0 per profile, five sequential
sub-passes each with a full `timeBudgetMs`). What actually stops a level in a batch run is
`nodeBudget` — **one cumulative ceiling** every tier tests against the same running
`prep._metrics.nodesExpanded`. The tier is last in line, so the earlier tiers consumed the whole
ceiling and it hit its own `nodesExpanded >= nodeBudget` guard and broke out having run nothing.
More clock could never have fixed this; it was getting no nodes.

Reproduced from the committed 2026-07-30T114427Z baseline before touching any code:

| | |
|---|---|
| unsolved corpus-2 levels with a cold hint | 357 |
| …whose cheapest cold find fits under the 20M cap | 215 |
| …of those, unforced | 185 |
| cheapest-technique split of the 215 | admissible-order **100**, repair 61, dfs 31, beam 23 |
| levels carrying an admissible-order hint | **151** (10 solve, **141** do not) |
| of those 141: terminated at `nodesExpanded >= 20M` | **141 / 141** |
| of those 141: an admissible-order sub-pass recorded | **1 / 141** |
| mean ladder attempts on those 141 | 14.4 |

> **Correction to the prior report.** It states "141 corpus-2 levels carry an admissible-order hint.
> At typical budget, 10 solve, 131 don't." The correct split is **151 carry one — 10 solve, 141 do
> not**. 141 is the unsolved subset, not the total, so it cannot also be the population the 10 are
> drawn from. Every other figure in that report reproduced exactly.

Same shape as the 2026-07-17 repair-probe node starvation: a component sized against its own
internal budget while a different, external, cumulative budget is what really governs it.

## 2. The fix

`ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25` (`modules/solver/orchestration.ts`). A slice of the
external `nodeBudget` is withheld from the probe / main loop / repair fallback / attraction-diversity
pass via a new `earlyTierNodeBudget`; the tier alone still checks the full `nodeBudget`, so what it
can spend is exactly what the earlier tiers were denied.

A **reserve, not a reorder** — the tier keeps its last-resort position. Nothing measured says this
technique should run *earlier*, only that it should run *at all*, and a reserve is the smaller
behavioural change.

Sized from the baseline against both directions of a zero-sum reallocation, before running anything:

| reserve | AO finds that fit | solved levels spending > the retained ceiling |
|---|---|---|
| 0.10 | 60/141 | 3 |
| 0.20 | 75/141 | 5 |
| **0.25** | **78/141** | **5** |
| 0.30 | 79/141 | 7 |
| 0.40 | 87/141 | 12 |

0.25 is the knee. The asymmetry that makes this cheap is measured, not assumed: already-solved
corpus-2 levels spend a **median of 0.33M nodes — 1.6% of the cap** — so a slice withheld from the
tail is drawn almost entirely from levels that are already failing.

Guard rails, both of which are load-bearing rather than defensive:

- The reserve is computed from the tier's **real run condition** (fraction, ablation flag, non-empty
  config list), not the fraction alone. Reserving for a tier that will not run would strand the nodes
  and silently shrink the effective budget of every `disableExtraBudgetPasses` caller — the
  interactive UI paths whose bounded cost the 2026-07-17 probe fix existed to restore.
- `nodeBudgetReached` now also reports true when the ceiling truncated the **early** tiers, even if
  the total lands under `nodeBudget`. Without this the reserve would corrupt the signal batch tooling
  uses to tell "budget-limited" from "searched out", making a truncated level look exhausted.

Strictly a no-op when `nodeBudget` is `Infinity` (every production path) or the tier is suppressed.
Confirmed: `solver:bench --check` is 160/160 with **nodes +0.0%** — bit-identical, which is the
host-independent proof the published corpus is untouched.

## 3. A/B

Both arms at the baseline's exact budget (`--budget-ms=8000 --node-budget=20000000
--work-budget=26800000`), same commit, same host, back to back; the only difference is
`--admissible-order-node-reserve-fraction=0` on the baseline arm.

**Running my own baseline arm was necessary, not ceremonial.** The committed baseline is not a valid
control: at HEAD on this host the tier already ran on 73/141 rather than 1/141, and 21 target levels
already solved. No solver logic changed in between (the only intervening solver commit, `2b0c531`, is
comment-only) — the difference is that `timeBudgetMs` still gates attempt tiers by wall clock, so
which attempts run varies with host and load. Only a same-host, same-commit control isolates the
reserve.

### Target — the 141 AO-carrying unsolved levels

| | reserve off | reserve on |
|---|---|---|
| solved | 21 | **42** |
| tier ran | 73/141 | **141/141** |
| total nodes | 2,746M | 2,658M |
| total wall | 2,676s | 2,394s |

**+21 net: 22 gained, 1 lost.** All 22 gains are `refereeValid: true` and every one was won by an
`ida:*` config — the attribution is direct, not inferred. 21 of the 22 were won by `ida:default`.

### Control — 45 already-solved levels, the highest-risk stratum (>5M nodes)

Raw: 5 gained, 6 lost. But three of the six "losses" **do not reproduce with the reserve off** — a
second identical reserve-off run fails to re-solve them:

| level | reserve-off run 1 | reserve-off run 2 | reserve-on | verdict |
|---|---|---|---|---|
| R00156 | solved 12.8M | unsolved | unsolved | timing noise |
| R01609 | solved 11.2M | unsolved | unsolved | timing noise |
| R01725 | solved 17.9M | unsolved | unsolved | timing noise |
| R01925 | solved 19.6M | solved 19.6M | unsolved | **real loss** |
| R02344 | solved 17.0M | solved 17.0M | unsolved | **real loss** |
| R03299 | solved 18.7M | solved 18.7M | unsolved | **real loss** |

All five control gains reproduce. So the control's true tally is **+5 / −3 = +2**, and all three real
losses solved above 15M — exactly the predicted mechanism, at a rate slightly better than the
prediction of 5.

The other ~389 solved corpus-2 levels spend under 5M nodes and never approach the retained ceiling,
so they are untouched by construction.

**Sample total: +23 net** (+21 target, +2 control).

### Cost

Nodes and wall time both went slightly **down** (target: 2,746M → 2,658M nodes, 2,676s → 2,394s).
The reserve is node-neutral by construction — it redistributes a fixed ceiling rather than raising
it — and solving earlier ends levels sooner. This is the check `solver:bench --check` alone would not
have caught, per CLAUDE.md's cost gotcha.

## 4. The one real regression mode

R03148 is the single target loss, and it is not noise — it is a structural limitation worth naming.
The tier's profiles run sequentially, each taking what remains, so an earlier profile can consume the
whole reserve:

```
R03148 reserve-OFF: SOLVED at 18.8M   AO sub-passes: default=6.87M, none=1.97M (WON)
R03148 reserve-ON:  unsolved at 20.0M AO sub-passes: default=7.33M
```

`ida:none` wins this level, and with the reserve in place `ida:default` ate the slice and `ida:none`
never ran. This is the already-documented "not yet tuned per-profile" caveat on
`ADMISSIBLE_ORDER_BUDGET_FRACTION` showing up in node units. The obvious refinement — sub-slicing the
reserve per profile instead of first-come-first-served — is **not** made here: `ida:default` won 21 of
the 22 gains, so capping it to fund the lower-yield profiles would trade a large measured gain for a
speculative one. That needs its own A/B, not a guess.

## 5. Tooling gap closed

`portfolio-solve-sweep.mjs` exposed `--repair-budget-fraction` and
`--attraction-diversity-budget-fraction` but had **no** flag for the third extension, so no batch tool
could isolate this tier or honor CLAUDE.md's "a batch tool must set all three" rule from that
entrypoint. Added: `--admissible-order-budget-fraction`, `--admissible-order-node-reserve-fraction`,
and `--disable-extra-budget-passes`.

They are documented and warned as **not honored under `--race-pool-size`**: `race.mjs` reimplements
the ladder and has no admissible-order tier and no `nodeBudget` handling at all. Threading the fields
into its call would have looked like support while changing nothing.

## 6. What this does not claim

- **Not** that the remaining 85 of the 185 unforced under-cap levels follow. The repair (61), dfs (31)
  and beam (23) blocks have a different cause and are untouched here.
- **Not** a corpus-wide number. The A/B covers 186 levels chosen because they are the ones the change
  can plausibly affect; the 389 cheap solved levels were excluded as unaffected by construction, which
  is an argument from the mechanism, not a measurement of them.
- **Not** deterministic to the last level. `timeBudgetMs` still gates attempt tiers by wall clock, and
  the reproducibility table above shows that is worth roughly ±3 levels on a 45-level group. The
  target result (+21) is far outside that band; the control result (+2) is inside it and should be
  read as "no material downside," not as a precise gain.
- **Not** a claim about corpus-1 or the published corpus. Published is provably untouched (no
  `nodeBudget`, nodes +0.0%); corpus-1 was not examined.

## Reproducing

```
# baseline arm
node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- \
  --corpus=data/stress/stress-levels-random.json --levels=<the 186> \
  --scheduler-mode=legacy --budget-ms=8000 --node-budget=20000000 --work-budget=26800000 \
  --workers=4 --admissible-order-node-reserve-fraction=0 --out=arm-off.json

# fixed arm: identical, minus the --admissible-order-node-reserve-fraction flag
```

The target set is every id in `data/stress/hints-random/` whose hint provenance contains a cold
`admissible-order` technique entry and which `reports/stress/typical-budget-corpus2.json` records as
unsolved; the control set is every level that report records as solved with `nodesExpanded > 5e6`.
