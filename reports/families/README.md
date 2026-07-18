# Family/cousin research reports — index

This directory holds the raw per-level backing data for the sibling/cousin research system
([`docs/sibling-cousin-system.md`](../../docs/sibling-cousin-system.md)). It has no other index —
this file exists so a reader (human or AI agent) doesn't have to `ls` and pattern-match 260+
filenames to find what they need.

## Start here: the 5 synthesis docs

These are the curated findings — read one of these first, not the raw per-id files below, unless
you specifically need one id's raw numbers:

- [`2026-07-15-symmetry-orientation-bias.md`](2026-07-15-symmetry-orientation-bias.md)
- [`2026-07-15-local-mutant-config-sensitivity.md`](2026-07-15-local-mutant-config-sensitivity.md)
- [`2026-07-15-swap-sibling-sensitivity.md`](2026-07-15-swap-sibling-sensitivity.md)
- [`2026-07-15-re-embedded-cousin-grid-growth.md`](2026-07-15-re-embedded-cousin-grid-growth.md)
- [`2026-07-15-dose-response-mutation-intensity.md`](2026-07-15-dose-response-mutation-intensity.md)

These are cited by exact filename from `docs/sibling-cousin-system.md` — do not rename or move
them without updating that doc.

## Per-id raw files: naming pattern

Every other file follows `2026-07-15-<parentId>-<mode>-<artifactType>[.md|.json]`, where:

- **`<parentId>`** is the published/stress-corpus level this family was generated from (`P#####` =
  published, `R#####`/`S#####` = stress-corpus-2/-1).
- **`<mode>`** is the generation mode (`scripts/family-generate.mjs --mode=`): `symmetry`,
  `localmutant`, `swap`, `groupreshuffle`, `constrainedshuffle`, `reembed`. See
  `docs/sibling-cousin-system.md`'s "Implementation status" for what each mode does.
- **`<artifactType>`** is one of: `analysis` (per-variant data dump), `family-solve` /
  `family-solve-summary` (raw solve-result JSON + its `.md` summary for the generated siblings),
  `parent-solve` / `parent-solve-summary` (the same, for the unmutated parent as a baseline).

No individual per-id file is linked from `docs/` or `CLAUDE.md` — they're pure backing data for
the 5 synthesis docs above. Safe to treat as an append-only archive.

## Per-id coverage

Which modes exist for each parent id (some ids only ever got the cheap `symmetry` sweep; a
handful got the fuller sibling/cousin battery):

| Parent id | Modes generated |
|---|---|
| P00010 | symmetry |
| P00097 | symmetry, reembed |
| P00136 | symmetry, localmutant, swap |
| P00144 | symmetry, localmutant, swap |
| P00145 | symmetry |
| P00146 | symmetry, localmutant, swap, groupreshuffle, constrainedshuffle |
| R00087 | symmetry |
| R00104 | symmetry |
| R00134 | symmetry |
| R00392 | symmetry |
| R00432 | symmetry |
| R00541 | symmetry |
| R00631 | symmetry, localmutant, swap, groupreshuffle, constrainedshuffle |
| R00727 | symmetry |
| R00789 | symmetry |
| R00792 | symmetry, localmutant, swap |
| R00920 | symmetry |
| R01075 | symmetry |
| R01533 | symmetry |
| R01636 | symmetry |
| R01644 | symmetry |
| R02028 | symmetry |
| R02208 | symmetry, reembed |
| R02248 | symmetry |
| R02341 | symmetry |
| R02465 | symmetry |
| R02563 | symmetry |
| R02714 | symmetry, reembed |
| R02825 | symmetry |
| R02841 | symmetry |
| R02909 | symmetry |
| R02962 | symmetry |
| R02976 | symmetry, localmutant, swap |
| R03015 | symmetry (plus a `-retry`/`-retry-summary` pair — a re-run of the family-solve step, not a distinct mode) |
| R03140 | symmetry |
| R03341 | symmetry |
| S00107 | symmetry |
| S00109 | symmetry |
| S00114 | symmetry |
| S00120 | symmetry |

## Naming exceptions

- **`2026-07-15-P00110-density-sweep.md`** + its `-parent-solve-legacy.json`/
  `-parent-solve-portfolio-experiment.json` pair: **not** part of the sibling/cousin taxonomy above
  — this is the `--mode=density-sweep` experiment (varies block count under relaxed inventory to
  test density-keyed solver thresholds), and the `-legacy`/`-portfolio-experiment` suffixes compare
  `schedulerMode` variants, not generation modes. See
  `docs/sibling-cousin-system.md`'s "Implementation status" section for why this mode exists
  outside the strict-inventory taxonomy.
- **`2026-07-15-R03015-symmetry-family-solve-retry.json`** / `-retry-summary.md`: the only id with
  an extra retry pair — a second run of the family-solve step for this id, kept alongside (not
  replacing) the original.
