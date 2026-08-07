# Fragile/robust census: 165 levels processed (of 959 in manifest)

A level is **fragile** if at least one of its 22 structural variants (15 local-mutant + 7
symmetry) solved; **robust** if 0/22 (or 0/N if generation produced fewer than 22 for that
level) solved. See `docs/solver-development-roadmap.md`'s fragile/robust split and
`reports/families/2026-07-29-turn-load-fragile-robust-split.md` for the methodology.

## By turn-load group

| Group | Levels | Fragile | Fragile rate | Variant solve rate |
|---|---|---|---|---|
| hi-turn | 116 | 45 | 38.8% | 194/3696 |
| lo-turn | 49 | 26 | 53.1% | 145/1738 |

## By archetype

| Archetype | Levels | Fragile | Fragile rate | Variant solve rate |
|---|---|---|---|---|
| default | 9 | 3 | 33.3% | 8/303 |
| high-intersection-burden | 131 | 54 | 41.2% | 283/4281 |
| portal-heavy | 13 | 7 | 53.8% | 29/451 |
| must-cross-heavy | 12 | 7 | 58.3% | 19/399 |

## By group x archetype

| Group / Archetype | Levels | Fragile | Fragile rate | Variant solve rate |
|---|---|---|---|---|
| hi-turn / default | 8 | 3 | 37.5% | 8/266 |
| lo-turn / high-intersection-burden | 39 | 21 | 53.8% | 127/1368 |
| lo-turn / portal-heavy | 5 | 2 | 40.0% | 9/185 |
| hi-turn / high-intersection-burden | 92 | 33 | 35.9% | 156/2913 |
| hi-turn / portal-heavy | 8 | 5 | 62.5% | 20/266 |
| hi-turn / must-cross-heavy | 8 | 4 | 50.0% | 10/251 |
| lo-turn / must-cross-heavy | 4 | 3 | 75.0% | 9/148 |
| lo-turn / default | 1 | 0 | 0.0% | 0/37 |

## Fragile levels (>=1 variant solved) — candidates for scoring/attempt-policy work

| id | group | archetype | turnLoad | navDensity | badness | solved/total |
|---|---|---|---|---|---|---|
| R00039 | hi-turn | default | 9 | 0.684 | 20 | 1/22 |
| R00050 | lo-turn | high-intersection-burden | 0 | 0.737 | 12 | 12/37 |
| R00059 | lo-turn | portal-heavy | 6 | 0.683 | 19 | 8/37 |
| R00082 | hi-turn | high-intersection-burden | 8 | 0.759 | 23 | 1/37 |
| R00094 | lo-turn | high-intersection-burden | 5 | 0.822 | 7 | 9/37 |
| R00112 | lo-turn | high-intersection-burden | 5 | 0.962 | 16 | 2/37 |
| R00209 | hi-turn | high-intersection-burden | 13 | 0.8 | 10 | 1/37 |
| R00239 | lo-turn | high-intersection-burden | 5 | 0.616 | 3 | 3/37 |
| R00306 | hi-turn | high-intersection-burden | 8 | 0.779 | 12 | 2/37 |
| R00312 | lo-turn | high-intersection-burden | 3 | 0.721 | 20 | 3/37 |
| R00320 | hi-turn | high-intersection-burden | 8 | 0.685 | 13 | 4/37 |
| R00329 | hi-turn | must-cross-heavy | 8 | 0.724 | 18 | 1/37 |
| R00347 | lo-turn | high-intersection-burden | 0 | 0.719 | 25 | 8/37 |
| R00350 | lo-turn | high-intersection-burden | 5 | 0.825 | 18 | 1/37 |
| R00355 | hi-turn | high-intersection-burden | 11 | 0.712 | 4 | 8/37 |
| R00370 | hi-turn | high-intersection-burden | 8 | 0.775 | 5 | 1/37 |
| R00373 | lo-turn | high-intersection-burden | 7 | 0.655 | 16 | 6/37 |
| R00386 | lo-turn | high-intersection-burden | 1 | 0.615 | 27 | 1/37 |
| R00440 | hi-turn | high-intersection-burden | 9 | 0.738 | 10 | 7/37 |
| R00477 | hi-turn | portal-heavy | 8 | 0.582 | 20 | 4/37 |
| R00479 | hi-turn | high-intersection-burden | 13 | 0.857 | 49 | 1/37 |
| R00488 | lo-turn | must-cross-heavy | 7 | 0.755 | 14 | 4/37 |
| R00507 | hi-turn | high-intersection-burden | 9 | 0.656 | 19 | 2/37 |
| R00528 | hi-turn | high-intersection-burden | 8 | 0.648 | 5 | 2/37 |
| R00536 | lo-turn | high-intersection-burden | 6 | 0.645 | 20 | 1/37 |
| R00546 | lo-turn | portal-heavy | 6 | 0.648 | 24 | 1/37 |
| R00556 | hi-turn | high-intersection-burden | 11 | 0.954 | 15 | 2/37 |
| R00565 | hi-turn | high-intersection-burden | 10 | 0.902 | 6 | 4/37 |
| R00592 | lo-turn | high-intersection-burden | 6 | 0.66 | 16 | 10/37 |
| R00639 | hi-turn | high-intersection-burden | 8 | 0.716 | 10 | 4/37 |
| R00682 | hi-turn | high-intersection-burden | 18 | 0.809 | 12 | 1/37 |
| R00702 | hi-turn | high-intersection-burden | 8 | 0.718 | 11 | 4/37 |
| R00703 | hi-turn | high-intersection-burden | 16 | 0.749 | 43 | 1/37 |
| R00707 | lo-turn | high-intersection-burden | 0 | 0.911 | 33 | 1/37 |
| R00720 | hi-turn | portal-heavy | 13 | 0.769 | 43 | 1/37 |
| R00728 | hi-turn | high-intersection-burden | 10 | 0.849 | 39 | 1/22 |
| R00732 | hi-turn | portal-heavy | 8 | 0.721 | 44 | 1/37 |
| R00756 | lo-turn | high-intersection-burden | 6 | 0.671 | 11 | 2/34 |
| R00762 | hi-turn | high-intersection-burden | 8 | 0.691 | 18 | 18/37 |
| R00787 | hi-turn | high-intersection-burden | 8 | 0.677 | 18 | 1/31 |
| R00860 | hi-turn | portal-heavy | 10 | 0.754 | 24 | 13/37 |
| R00866 | lo-turn | high-intersection-burden | 2 | 0.926 | 18 | 4/37 |
| R00867 | hi-turn | high-intersection-burden | 12 | 0.919 | 21 | 1/37 |
| R00869 | hi-turn | high-intersection-burden | 9 | 0.612 | 7 | 4/37 |
| R00893 | lo-turn | high-intersection-burden | 7 | 0.622 | 11 | 2/37 |
| R00923 | lo-turn | must-cross-heavy | 7 | 0.619 | 9 | 2/37 |
| R01006 | hi-turn | high-intersection-burden | 14 | 0.859 | 9 | 1/37 |
| R01009 | lo-turn | high-intersection-burden | 6 | 0.791 | 37 | 9/37 |
| R01020 | hi-turn | default | 10 | 0.77 | 18 | 6/37 |
| R01022 | hi-turn | must-cross-heavy | 12 | 0.787 | 3 | 3/37 |
| R01023 | hi-turn | high-intersection-burden | 11 | 0.717 | 17 | 1/37 |
| R01052 | hi-turn | high-intersection-burden | 13 | 0.793 | 5 | 3/37 |
| R01080 | lo-turn | must-cross-heavy | 7 | 0.64 | 5 | 3/37 |
| R01129 | hi-turn | default | 10 | 0.739 | 25 | 1/37 |
| R01132 | hi-turn | must-cross-heavy | 17 | 0.747 | 15 | 1/21 |
| R01151 | hi-turn | high-intersection-burden | 16 | 0.835 | 31 | 1/9 |
| R01179 | hi-turn | must-cross-heavy | 8 | 0.89 | 5 | 5/37 |
| R01190 | lo-turn | high-intersection-burden | 7 | 0.866 | 14 | 1/37 |
| R01229 | hi-turn | high-intersection-burden | 8 | 0.725 | 3 | 2/37 |
| R01325 | lo-turn | high-intersection-burden | 4 | 0.816 | 44 | 18/37 |
| R01462 | lo-turn | high-intersection-burden | 7 | 0.934 | 10 | 3/37 |
| R01516 | hi-turn | high-intersection-burden | 10 | 0.728 | 40 | 5/22 |
| R01535 | hi-turn | high-intersection-burden | 11 | 0.813 | 44 | 32/37 |
| R01553 | hi-turn | portal-heavy | 10 | 0.618 | 21 | 1/37 |
| R01613 | hi-turn | high-intersection-burden | 11 | 0.762 | 33 | 5/37 |
| R01691 | hi-turn | high-intersection-burden | 8 | 0.696 | 57 | 32/37 |
| R01706 | lo-turn | high-intersection-burden | 7 | 0.6 | 9 | 30/37 |
| R01860 | hi-turn | high-intersection-burden | 8 | 0.721 | 2 | 2/6 |
| R01872 | hi-turn | high-intersection-burden | 9 | 0.78 | 6 | 1/27 |
| R02051 | hi-turn | high-intersection-burden | 18 | 0.838 | 41 | 1/22 |
| R02086 | lo-turn | high-intersection-burden | 7 | 0.782 | 5 | 1/22 |
