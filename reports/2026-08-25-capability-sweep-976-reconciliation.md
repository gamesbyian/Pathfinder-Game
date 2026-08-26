# Capability sweep 976 reconciliation

> **Status:** concluded-positive
> **Last evidence:** 2026-08-25 — capability run `32835403128` (`976/1700`), scheduler confirmation `32908734154`, selective diverse-IH development `32911007113`, diverse-IH confirmation `32912881453`
> **Decision:** the 880→976 gain remains strong evidence for routing, exposure, allocation, and restart research before broad new search machinery. Two fixed-work treatments selected from development evidence did not generalize and are closed.
> **Remaining gate:** equal-work continuation-versus-fresh-seed restart is the next independent execution seam; any further portfolio treatment must be newly prespecified and independently confirmed.
> **Evidence role:** discovery
> **Selection:** observational capability reconciliation; follow-on candidates were selected after inspecting Corpus-2 and census evidence and therefore required independent confirmation

## Result shape

The latest clean level-blind Corpus-2 comparison is:

- run `32526927206`: **880/1700**;
- run `32835403128`: **976/1700**;
- delta: **+96 solves, 0 losses**.

The 96 new winners divide into 45 repair, 41 beam, 10 ordinary DFS, and 0 admissible/IDA. The new solved set strictly contains the prior 880 solved set.

Work growth is concentrated almost entirely in the still-unsolved tail. On the 880 common solves, work fell about 0.26%; on the 96 new solves it rose about 4.53%; on the 724 still-unsolved levels it rose about 67.54%. Roughly 99.3% of added work landed on levels that still failed. That keeps continuation value and tail stopping economically important.

## Beam interpretation

Thirty-five of the 41 new beam wins use four beam identities that earlier census-to-policy work had already identified as missing from applicable production rules: wide objective-first, wide intersection-harvest, and clockwise/counter-clockwise perimeter beams.

This supports **routing/exposure of existing algorithms**, not reopening the negative fixed-width quota/bucketing survivor-selection form.

## Repair interpretation

Repair accounts for 45 new wins, but broad repair expansion remains unsupported. The better upstream questions are allocation/access and equal-work seed continuation. Existing multi-seed gains are additive-budget evidence, not proof that restart beats continuation.

## Fixed-work allocation follow-up

The global two-DFS suppression development A/B `32901181013` produced **40/60 → 41/60**, +1/-0, with aggregate work **2,037,107,633 → 2,018,891,302** (-0.894%). `R02966` solved because work shifted from early ordinary DFS into repair fallback.

Independent sealed-cohort confirmation `32908734154` produced **140/256 → 141/256**, but with **+3/-2**, so it failed the frozen zero-loss rule. The treatment is closed. See [`scheduler static repricing`](2026-08-25-scheduler-static-repricing-join.md).

## Portfolio exposure follow-up

The post-976 rejoin found 139 of the 724 current misses with an observed unablated singleton census solver: 73 with a known winner not offered exactly, 57 offered but starved, and 9 offered adequately but no longer replaying.

A deliberately narrow development treatment then exposed `beam:intersectionHarvest@beam5000(diverse)` only in the two existing very-high-intersection policy bundles where the plain wide sibling was already offered but the diverse sibling was gated away. Development run `32911007113` was strong: **122/262 → 131/262**, **+9/-0**, and aggregate work fell 0.43%.

Fresh `confirm-broad-002` run `32912881453` was exactly null: **126/256 → 126/256**, **0 gains, 0 losses**, with treatment work higher by about 0.01%. The frozen gate therefore failed and the treatment is closed. `transfer-envelope-001` remains untouched.

The lesson is important: Corpus-2 contains real exploitable routing structure, but treatments mined from that repeatedly studied corpus are not automatically general solver improvements. Holdout discipline is now empirically justified, not merely procedural.

## Priority consequences

1. Keep global two-DFS suppression closed.
2. Keep the tested selective diverse-IH exposure closed as a general promotion candidate.
3. Preserve the broader premise that allocation and exposure matter, but require fresh prespecified treatments rather than further tuning on spent confirmation rows.
4. Advance equal-work restart/continuation as the next major execution question.
5. Keep beam quota/bucketing and broad repair expansion closed.
6. Keep exact/reference work bounded to concrete ranked questions.

## Capability-refresh evidence hygiene

Future major refreshes should emit an output-only delta digest covering gain/loss IDs, winning stage/action, per-level work and attempt deltas, aggregate work split across prior solves/new solves/still-unsolved, and the exact revision/budget/determinism contract. This evidence must never feed exact-level history back into a cold level-blind solve.
