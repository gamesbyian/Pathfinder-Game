# WS1 stage 4 solution-space mediation result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-12 — replayed both frozen configs' committed 20M-work stage-3 solved paths through real search state (`createState`/`applyMove`, `level.mustCrossKeys`, `level.portalMap`) for every exclusive-response sibling of both frozen pairs, computing the two prespecified descriptors from [`the stage-4 preflight`](2026-09-11-ws1-stage4-solution-space-mediation-preflight-001.md). No new solver compute; this is a data-join/replay analysis only, per that preflight's compute boundary.
> **Decision:** both prespecified descriptors fail to separate response for `R02094`/intersectionHarvest, and both are structurally inapplicable to `R02687`/objectiveFirst because its entire family has zero must-cross cells. Per the preflight's own advancement gate, this **advances directly to bounded operational first divergence** for both pairs.
> **Remaining gate:** scope and run the bounded operational first-divergence check below (new small per-node instrumentation, one exclusive-response sibling per pair, matched small work budget). Do not add a third pair or generate new variants.
> **Evidence role:** discovery/diagnosis (replay of already-solved paths, zero new solve compute). Not a production routing change.

## Method

Built `scripts/stress/ws1-stage4-mediation-analysis.mjs` (new, reusable), which for each of the two frozen pairs and each of their 5 existing family modes:

1. loads the committed stage-3 20M-work result files for both retention configs from `reports/stress/ws1-stage3-isolated-resolve-001/`;
2. loads the retained raw family variant JSON from the `claude/variant-levels-solver-insights-tpk4qg` worktree;
3. classifies each sibling as `both` / `neither` / `plain-only` / `buckets-only` from the stage-3 `ok` outcomes (unchanged from the stage-3 report's own table);
4. for every exclusive-response sibling, normalizes the raw variant (`normalizeRawLevel`/`prepLevel`) and replays the *winning* config's own stored `solution` path through real search state (`createState`, `applyMove`) — the same portal-jump detection (`portal.dest === next && !state.lastWasPortalJump`) already used and gated by `joint-obligation-mc-portal-soundness-check.mjs`, so portal-traversal events are decoded via production code, not a heuristic reimplementation;
5. computes descriptor 1 (event-order: must-cross-vs-portal relative timing) and descriptor 2 (basin signature: must-cross precedence texture) exactly as prespecified.

```
node scripts/run-bundled.mjs scripts/stress/ws1-stage4-mediation-analysis.mjs -- \
  --families=<variant-worktree>/data/families/corpus2 --out=tmp/ws1-stage4-mediation.json
```

## Result

### `R02687` / objectiveFirst: descriptors structurally inapplicable

Every one of `R02687`'s 47 family variants across all 5 modes has **zero must-cross cells** (`mustCross: []` in the raw JSON, confirmed directly, not a parsing gap). This was not visible in the stage-3 report's static-object-count check because that check only asked whether counts were *identical between flipped and non-flipped siblings within a mode* (they are — both zero) rather than whether must-cross count was nonzero at all. Both prespecified descriptors are must-cross-anchored by construction, so neither can be computed for this pair. This is itself informative: it confirms the extension audit's own attribution that `R02687`'s leading effect is **portals**, not must-cross, at the *object-composition* level, not only as a hypothesis — the retention-response mediator for this pair cannot be a must-cross-relative-timing relation of any kind.

### `R02094` / intersectionHarvest: descriptors computed, non-separating

17 of the 18 exclusive-response siblings across the 4 informative modes (`cs`, `gr`, `lm`, `swap`) have a solved winning path with detectable must-cross and portal events (one `swap` sibling's path replay is included; `sym` is a both-solve ceiling, excluded per the preflight's stratum rule). All are `mc=6`/`portals=6`, matching the stage-3 report's own object-count confound check.

**Descriptor 1** (`fracMcBeforeFirstPortal`, `medianNormDistMcToPortal`):

| class | n | fracMcBeforeFirstPortal mean | medianNormDist mean | range |
|---|---:|---:|---:|---|
| buckets-only | 15 | 0.300 | 0.070 | frac 0.00–0.83; dist 0.033–0.107 |
| plain-only | 2 | 0.500 | 0.085 | frac 0.50, 0.50; dist 0.073, 0.098 |

The `plain-only` arm's two points (both exactly 0.50 for `fracMcBeforeFirstPortal`) sit inside, not outside, the `buckets-only` arm's own wide range on both metrics — no separating threshold exists, and the class sizes are too imbalanced (15 vs 2) within this already-small sample to support a directional claim even before checking overlap. `firstPortalBeforeMedianMc` was true for a mix of both classes (not tabulated separately given the above).

**Descriptor 2** (basin signature / must-cross precedence texture): manually inspecting all 17 `texture` vectors (recorded in `tmp/ws1-stage4-mediation.json` and reproducible from the script), whether a sibling's first must-cross event is the very first mechanic event overall (`prev: "none"`) splits close to the base rate in both classes (6/8 in `cs`, 2/4 in `gr` for `buckets-only`; 2/2 for the tiny `plain-only` sample) — again no separating relation, and the raw signature strings freely interleave `M`/`P`/`X` in both classes with no recurring recognizable sub-pattern unique to one class.

## Interpretation

Neither prespecified relational descriptor recurs as a separating relation across multiple exclusive-response siblings and more than one informative mode, satisfying the preflight's own negative-advancement condition. Combined with `R02687`'s structural inapplicability, this closes the *source-controlled solution-space mediation* stage for both frozen pairs as a clean negative — not an under-provisioned or partially-executed check.

## Advancement

Per [`the preflight`](2026-09-11-ws1-stage4-solution-space-mediation-preflight-001.md) and [`docs/solver-future-work.md`](../docs/solver-future-work.md)'s evidence ladder, the next earned step is **bounded operational first divergence**: for one matched exclusive-response sibling per pair, re-run both retention configs with a small work budget and record the first search state at which their beam-candidate ordering or accept/reject decision actually differs, rather than comparing only each config's own accepted terminal path. This needs a small amount of new, bounded solver instrumentation (a per-node divergence observer keyed on the shared prefix of both configs' expansions) that does not exist yet; it is genuinely the next stage's own scoped work, not completable by replay of already-stored paths. Scope for that instrumentation, when picked up:

- one sibling per pair (already-available exclusive-response cases above are eligible candidates, e.g. `R02094`/`cs`/idx `0`, and — since `R02687` cannot use a must-cross-anchored comparison — any of its `swap`/`sym` exclusive-response siblings using a purely positional/self-intersection first-divergence definition instead);
- matched small work budget for both configs on the same sibling (not the full 20M-work ceiling);
- report the first differing beam-candidate rank/accept-reject decision and its local mechanic context (nearest preceding `M`/`P`/`X` event), not a full trace dump;
- stop and record a clean negative if the two configs' search never observably diverges before one exhausts — that would itself be new evidence about *where* the difference actually originates (final acceptance/pruning rather than exploration order).

Do not add a third pair, generate new variants, or build a routing/selector signal from this or the prior stage's evidence.

## Artifacts

- `scripts/stress/ws1-stage4-mediation-analysis.mjs` — new, reusable replay/descriptor tool (no new solver compute; reuses committed stage-3 result files and retained raw family JSON).
- `tmp/ws1-stage4-mediation.json` — full per-sibling descriptor detail backing the summary tables above (not committed; regenerate via the command above against the `claude/variant-levels-solver-insights-tpk4qg` worktree).
