# Fragile/robust census: 911 levels processed (of 959 in manifest)

A level is **fragile** if at least one of its 22 structural variants (15 local-mutant + 7
symmetry) solved; **robust** if 0/22 (or 0/N if generation produced fewer than 22 for that
level) solved. See `docs/solver-development-roadmap.md`'s fragile/robust split and
`reports/families/2026-07-29-turn-load-fragile-robust-split.md` for the methodology.

## By turn-load group

| Group | Levels | Fragile | Fragile rate | Variant solve rate |
|---|---|---|---|---|
| lo-turn | 300 | 150 | 50.0% | 685/6585 |
| hi-turn | 611 | 164 | 26.8% | 589/13427 |

## By archetype

| Archetype | Levels | Fragile | Fragile rate | Variant solve rate |
|---|---|---|---|---|
| high-intersection-burden | 695 | 231 | 33.2% | 983/15260 |
| portal-heavy | 100 | 23 | 23.0% | 79/2200 |
| default | 27 | 6 | 22.2% | 21/594 |
| must-cross-heavy | 89 | 54 | 60.7% | 191/1958 |

## By group x archetype

| Group / Archetype | Levels | Fragile | Fragile rate | Variant solve rate |
|---|---|---|---|---|
| lo-turn / high-intersection-burden | 221 | 112 | 50.7% | 529/4847 |
| lo-turn / portal-heavy | 39 | 11 | 28.2% | 42/858 |
| hi-turn / high-intersection-burden | 474 | 119 | 25.1% | 454/10413 |
| hi-turn / default | 21 | 4 | 19.0% | 17/462 |
| hi-turn / must-cross-heavy | 55 | 29 | 52.7% | 81/1210 |
| hi-turn / portal-heavy | 61 | 12 | 19.7% | 37/1342 |
| lo-turn / must-cross-heavy | 34 | 25 | 73.5% | 110/748 |
| lo-turn / default | 6 | 2 | 33.3% | 4/132 |

## Fragile levels (>=1 variant solved) — candidates for scoring/attempt-policy work

| id | group | archetype | turnLoad | navDensity | badness | solved/total |
|---|---|---|---|---|---|---|
| R00050 | lo-turn | high-intersection-burden | 0 | 0.737 | 12 | 9/22 |
| R00059 | lo-turn | portal-heavy | 6 | 0.683 | 19 | 5/22 |
| R00082 | hi-turn | high-intersection-burden | 8 | 0.759 | 23 | 1/22 |
| R00094 | lo-turn | high-intersection-burden | 5 | 0.822 | 7 | 5/22 |
| R00112 | lo-turn | high-intersection-burden | 5 | 0.962 | 16 | 1/22 |
| R00209 | hi-turn | high-intersection-burden | 13 | 0.8 | 10 | 1/22 |
| R00239 | lo-turn | high-intersection-burden | 5 | 0.616 | 3 | 2/22 |
| R00306 | hi-turn | high-intersection-burden | 8 | 0.779 | 12 | 1/22 |
| R00312 | lo-turn | high-intersection-burden | 3 | 0.721 | 20 | 2/22 |
| R00320 | hi-turn | high-intersection-burden | 8 | 0.685 | 13 | 3/22 |
| R00329 | hi-turn | must-cross-heavy | 8 | 0.724 | 18 | 1/22 |
| R00347 | lo-turn | high-intersection-burden | 0 | 0.719 | 25 | 7/22 |
| R00355 | hi-turn | high-intersection-burden | 11 | 0.712 | 4 | 5/22 |
| R00370 | hi-turn | high-intersection-burden | 8 | 0.775 | 5 | 1/22 |
| R00373 | lo-turn | high-intersection-burden | 7 | 0.655 | 16 | 3/22 |
| R00386 | lo-turn | high-intersection-burden | 1 | 0.615 | 27 | 2/22 |
| R00440 | hi-turn | high-intersection-burden | 9 | 0.738 | 10 | 6/22 |
| R00477 | hi-turn | portal-heavy | 8 | 0.582 | 20 | 3/22 |
| R00479 | hi-turn | high-intersection-burden | 13 | 0.857 | 49 | 1/22 |
| R00488 | lo-turn | must-cross-heavy | 7 | 0.755 | 14 | 5/22 |
| R00528 | hi-turn | high-intersection-burden | 8 | 0.648 | 5 | 2/22 |
| R00536 | lo-turn | high-intersection-burden | 6 | 0.645 | 20 | 1/22 |
| R00546 | lo-turn | portal-heavy | 6 | 0.648 | 24 | 1/22 |
| R00556 | hi-turn | high-intersection-burden | 11 | 0.954 | 15 | 2/22 |
| R00565 | hi-turn | high-intersection-burden | 10 | 0.902 | 6 | 3/22 |
| R00592 | lo-turn | high-intersection-burden | 6 | 0.66 | 16 | 8/22 |
| R00639 | hi-turn | high-intersection-burden | 8 | 0.716 | 10 | 2/22 |
| R00682 | hi-turn | high-intersection-burden | 18 | 0.809 | 12 | 1/22 |
| R00702 | hi-turn | high-intersection-burden | 8 | 0.718 | 11 | 3/22 |
| R00703 | hi-turn | high-intersection-burden | 16 | 0.749 | 43 | 1/22 |
| R00707 | lo-turn | high-intersection-burden | 0 | 0.911 | 33 | 1/22 |
| R00756 | lo-turn | high-intersection-burden | 6 | 0.671 | 11 | 1/22 |
| R00762 | hi-turn | high-intersection-burden | 8 | 0.691 | 18 | 11/22 |
| R00860 | hi-turn | portal-heavy | 10 | 0.754 | 24 | 10/22 |
| R00866 | lo-turn | high-intersection-burden | 2 | 0.926 | 18 | 1/22 |
| R00867 | hi-turn | high-intersection-burden | 12 | 0.919 | 21 | 1/22 |
| R00869 | hi-turn | high-intersection-burden | 9 | 0.612 | 7 | 3/22 |
| R00893 | lo-turn | high-intersection-burden | 7 | 0.622 | 11 | 1/22 |
| R00923 | lo-turn | must-cross-heavy | 7 | 0.619 | 9 | 1/22 |
| R01006 | hi-turn | high-intersection-burden | 14 | 0.859 | 9 | 1/22 |
| R01009 | lo-turn | high-intersection-burden | 6 | 0.791 | 37 | 6/22 |
| R01020 | hi-turn | default | 10 | 0.77 | 18 | 3/22 |
| R01022 | hi-turn | must-cross-heavy | 12 | 0.787 | 3 | 3/22 |
| R01052 | hi-turn | high-intersection-burden | 13 | 0.793 | 5 | 3/22 |
| R01080 | lo-turn | must-cross-heavy | 7 | 0.64 | 5 | 2/22 |
| R01132 | hi-turn | must-cross-heavy | 17 | 0.747 | 15 | 1/22 |
| R01151 | hi-turn | high-intersection-burden | 16 | 0.835 | 31 | 2/22 |
| R01179 | hi-turn | must-cross-heavy | 8 | 0.89 | 5 | 2/22 |
| R01325 | lo-turn | high-intersection-burden | 4 | 0.816 | 44 | 3/22 |
| R01333 | hi-turn | portal-heavy | 16 | 0.791 | 29 | 3/22 |
| R01420 | lo-turn | high-intersection-burden | 1 | 0.883 | 10 | 8/22 |
| R01462 | lo-turn | high-intersection-burden | 7 | 0.934 | 10 | 2/22 |
| R01467 | hi-turn | high-intersection-burden | 14 | 0.671 | 17 | 1/22 |
| R01485 | lo-turn | high-intersection-burden | 7 | 0.779 | 2 | 2/22 |
| R01504 | lo-turn | portal-heavy | 0 | 0.773 | 25 | 2/22 |
| R01535 | hi-turn | high-intersection-burden | 11 | 0.813 | 44 | 14/22 |
| R01553 | hi-turn | portal-heavy | 10 | 0.618 | 21 | 3/22 |
| R01576 | lo-turn | high-intersection-burden | 7 | 0.637 | 14 | 2/22 |
| R01590 | lo-turn | high-intersection-burden | 2 | 0.702 | 17 | 1/22 |
| R01603 | lo-turn | must-cross-heavy | 5 | 0.729 | 10 | 6/22 |
| R01613 | hi-turn | high-intersection-burden | 11 | 0.762 | 33 | 3/22 |
| R01614 | lo-turn | must-cross-heavy | 2 | 0.833 | 26 | 2/22 |
| R01632 | hi-turn | must-cross-heavy | 13 | 0.611 | 6 | 2/22 |
| R01673 | hi-turn | high-intersection-burden | 13 | 0.731 | 26 | 1/22 |
| R01691 | hi-turn | high-intersection-burden | 8 | 0.696 | 57 | 18/22 |
| R01698 | hi-turn | must-cross-heavy | 8 | 0.553 | 12 | 3/22 |
| R01706 | lo-turn | high-intersection-burden | 7 | 0.6 | 9 | 18/22 |
| R01723 | lo-turn | high-intersection-burden | 7 | 0.741 | 40 | 12/22 |
| R01738 | lo-turn | high-intersection-burden | 6 | 0.786 | 10 | 2/22 |
| R01761 | hi-turn | portal-heavy | 18 | 0.778 | 25 | 1/22 |
| R01769 | hi-turn | high-intersection-burden | 11 | 0.771 | 6 | 1/22 |
| R01778 | hi-turn | high-intersection-burden | 12 | 0.678 | 4 | 7/22 |
| R01800 | lo-turn | high-intersection-burden | 0 | 0.699 | 20 | 11/22 |
| R01860 | hi-turn | high-intersection-burden | 8 | 0.721 | 2 | 13/22 |
| R01870 | lo-turn | must-cross-heavy | 6 | 0.653 | 15 | 9/22 |
| R01872 | hi-turn | high-intersection-burden | 9 | 0.78 | 6 | 2/22 |
| R01905 | lo-turn | high-intersection-burden | 6 | 0.726 | 40 | 1/22 |
| R02002 | hi-turn | high-intersection-burden | 12 | 0.694 | 29 | 15/22 |
| R02007 | hi-turn | high-intersection-burden | 15 | 0.886 | 15 | 2/22 |
| R02025 | hi-turn | high-intersection-burden | 8 | 0.854 | 10 | 1/22 |
| R02032 | lo-turn | must-cross-heavy | 3 | 0.79 | 13 | 2/22 |
| R02034 | hi-turn | high-intersection-burden | 13 | 0.772 | 8 | 1/22 |
| R02036 | lo-turn | high-intersection-burden | 7 | 0.699 | 9 | 4/22 |
| R02039 | hi-turn | high-intersection-burden | 8 | 0.734 | 27 | 1/22 |
| R02050 | hi-turn | high-intersection-burden | 9 | 0.707 | 31 | 20/22 |
| R02060 | hi-turn | high-intersection-burden | 14 | 0.653 | 18 | 4/22 |
| R02063 | lo-turn | must-cross-heavy | 0 | 0.703 | 16 | 4/22 |
| R02064 | lo-turn | portal-heavy | 7 | 0.689 | 35 | 1/22 |
| R02075 | hi-turn | high-intersection-burden | 13 | 0.583 | 10 | 1/22 |
| R02077 | hi-turn | high-intersection-burden | 15 | 0.881 | 5 | 1/22 |
| R02085 | lo-turn | high-intersection-burden | 0 | 0.656 | 5 | 2/22 |
| R02088 | hi-turn | high-intersection-burden | 9 | 0.902 | 4 | 1/22 |
| R02092 | hi-turn | high-intersection-burden | 14 | 0.884 | 12 | 5/22 |
| R02099 | lo-turn | high-intersection-burden | 5 | 0.855 | 26 | 1/22 |
| R02100 | lo-turn | high-intersection-burden | 0 | 0.75 | 8 | 1/22 |
| R02106 | lo-turn | high-intersection-burden | 0 | 0.744 | 10 | 12/22 |
| R02114 | hi-turn | high-intersection-burden | 11 | 0.585 | 15 | 12/22 |
| R02118 | hi-turn | must-cross-heavy | 19 | 0.64 | 12 | 1/22 |
| R02126 | hi-turn | high-intersection-burden | 13 | 0.761 | 38 | 14/22 |
| R02131 | lo-turn | must-cross-heavy | 2 | 0.739 | 24 | 4/22 |
| R02134 | hi-turn | portal-heavy | 8 | 0.503 | 27 | 1/22 |
| R02137 | hi-turn | must-cross-heavy | 13 | 0.882 | 11 | 2/22 |
| R02138 | lo-turn | high-intersection-burden | 2 | 0.624 | 17 | 6/22 |
| R02142 | hi-turn | high-intersection-burden | 14 | 0.571 | 32 | 3/22 |
| R02145 | lo-turn | high-intersection-burden | 0 | 0.823 | 18 | 5/22 |
| R02149 | lo-turn | high-intersection-burden | 3 | 0.622 | 11 | 5/22 |
| R02151 | hi-turn | must-cross-heavy | 15 | 0.663 | 14 | 1/22 |
| R02160 | lo-turn | high-intersection-burden | 7 | 0.623 | 14 | 3/22 |
| R02162 | lo-turn | must-cross-heavy | 6 | 0.869 | 5 | 3/22 |
| R02170 | hi-turn | high-intersection-burden | 8 | 0.71 | 3 | 1/22 |
| R02176 | hi-turn | high-intersection-burden | 8 | 0.673 | 7 | 5/22 |
| R02179 | lo-turn | high-intersection-burden | 1 | 0.639 | 17 | 9/22 |
| R02181 | hi-turn | high-intersection-burden | 15 | 0.85 | 12 | 1/22 |
| R02182 | lo-turn | high-intersection-burden | 5 | 0.665 | 15 | 1/22 |
| R02189 | lo-turn | portal-heavy | 7 | 0.664 | 33 | 17/22 |
| R02195 | hi-turn | portal-heavy | 14 | 0.66 | 18 | 1/22 |
| R02202 | lo-turn | high-intersection-burden | 3 | 0.742 | 17 | 2/22 |
| R02213 | lo-turn | high-intersection-burden | 5 | 0.685 | 3 | 3/22 |
| R02221 | lo-turn | default | 7 | 0.806 | 27 | 1/22 |
| R02224 | hi-turn | high-intersection-burden | 8 | 0.821 | 23 | 1/22 |
| R02233 | hi-turn | must-cross-heavy | 11 | 0.65 | 15 | 1/22 |
| R02242 | hi-turn | high-intersection-burden | 8 | 0.719 | 19 | 2/22 |
| R02248 | lo-turn | high-intersection-burden | 3 | 0.886 | 11 | 20/22 |
| R02249 | lo-turn | high-intersection-burden | 6 | 0.826 | 11 | 2/22 |
| R02252 | lo-turn | high-intersection-burden | 6 | 0.757 | 2 | 9/22 |
| R02255 | hi-turn | must-cross-heavy | 9 | 0.629 | 30 | 1/22 |
| R02266 | lo-turn | high-intersection-burden | 6 | 0.697 | 15 | 8/22 |
| R02271 | lo-turn | high-intersection-burden | 0 | 0.741 | 15 | 7/22 |
| R02291 | hi-turn | must-cross-heavy | 17 | 0.867 | 2 | 3/22 |
| R02298 | hi-turn | high-intersection-burden | 20 | 0.789 | 50 | 5/22 |
| R02299 | hi-turn | must-cross-heavy | 8 | 0.777 | 9 | 1/22 |
| R02303 | lo-turn | high-intersection-burden | 0 | 0.789 | 19 | 1/22 |
| R02304 | hi-turn | default | 8 | 0.56 | 12 | 11/22 |
| R02310 | lo-turn | must-cross-heavy | 6 | 0.725 | 16 | 3/22 |
| R02318 | lo-turn | high-intersection-burden | 7 | 0.908 | 19 | 1/22 |
| R02333 | hi-turn | high-intersection-burden | 9 | 0.719 | 9 | 1/22 |
| R02335 | hi-turn | high-intersection-burden | 14 | 0.798 | 3 | 7/22 |
| R02339 | lo-turn | high-intersection-burden | 7 | 0.696 | 13 | 1/22 |
| R02340 | lo-turn | high-intersection-burden | 5 | 0.911 | 8 | 1/22 |
| R02348 | lo-turn | must-cross-heavy | 7 | 0.728 | 31 | 2/22 |
| R02351 | hi-turn | high-intersection-burden | 16 | 0.864 | 6 | 2/22 |
| R02362 | lo-turn | high-intersection-burden | 0 | 0.951 | 32 | 1/22 |
| R02365 | lo-turn | high-intersection-burden | 0 | 0.691 | 7 | 2/22 |
| R02366 | hi-turn | high-intersection-burden | 8 | 0.875 | 7 | 3/22 |
| R02371 | hi-turn | high-intersection-burden | 9 | 0.813 | 24 | 16/22 |
| R02375 | lo-turn | high-intersection-burden | 2 | 0.744 | 38 | 1/22 |
| R02383 | hi-turn | high-intersection-burden | 16 | 0.569 | 37 | 2/22 |
| R02385 | hi-turn | high-intersection-burden | 16 | 0.702 | 14 | 1/22 |
| R02392 | hi-turn | high-intersection-burden | 14 | 0.806 | 8 | 1/22 |
| R02406 | hi-turn | high-intersection-burden | 14 | 0.724 | 46 | 3/22 |
| R02424 | lo-turn | high-intersection-burden | 0 | 0.659 | 22 | 3/22 |
| R02431 | hi-turn | high-intersection-burden | 10 | 0.692 | 6 | 1/22 |
| R02440 | hi-turn | high-intersection-burden | 15 | 0.908 | 29 | 1/22 |
| R02442 | lo-turn | high-intersection-burden | 0 | 0.834 | 13 | 2/22 |
| R02448 | hi-turn | high-intersection-burden | 14 | 0.844 | 9 | 1/22 |
| R02449 | lo-turn | must-cross-heavy | 0 | 0.644 | 17 | 7/22 |
| R02456 | hi-turn | must-cross-heavy | 12 | 0.669 | 3 | 6/22 |
| R02458 | hi-turn | must-cross-heavy | 17 | 0.837 | 8 | 1/22 |
| R02479 | lo-turn | must-cross-heavy | 6 | 0.762 | 7 | 1/22 |
| R02483 | hi-turn | must-cross-heavy | 14 | 0.778 | 5 | 3/22 |
| R02488 | hi-turn | portal-heavy | 8 | 0.777 | 22 | 1/22 |
| R02490 | lo-turn | high-intersection-burden | 7 | 0.842 | 9 | 1/22 |
| R02497 | hi-turn | high-intersection-burden | 13 | 0.571 | 4 | 2/22 |
| R02505 | lo-turn | high-intersection-burden | 2 | 0.746 | 25 | 4/22 |
| R02507 | lo-turn | high-intersection-burden | 6 | 0.755 | 19 | 6/22 |
| R02512 | hi-turn | high-intersection-burden | 12 | 0.8 | 29 | 1/22 |
| R02515 | hi-turn | must-cross-heavy | 15 | 0.685 | 4 | 4/22 |
| R02525 | hi-turn | high-intersection-burden | 11 | 0.741 | 18 | 4/22 |
| R02533 | lo-turn | high-intersection-burden | 5 | 0.659 | 3 | 7/22 |
| R02535 | lo-turn | high-intersection-burden | 6 | 0.695 | 4 | 6/22 |
| R02545 | lo-turn | high-intersection-burden | 5 | 0.909 | 8 | 1/22 |
| R02547 | lo-turn | portal-heavy | 7 | 0.687 | 22 | 1/22 |
| R02552 | hi-turn | must-cross-heavy | 12 | 1 | 3 | 5/22 |
| R02553 | hi-turn | high-intersection-burden | 15 | 0.875 | 42 | 1/22 |
| R02555 | lo-turn | must-cross-heavy | 0 | 0.617 | 9 | 1/22 |
| R02569 | lo-turn | high-intersection-burden | 1 | 0.605 | 13 | 15/22 |
| R02571 | hi-turn | high-intersection-burden | 16 | 0.731 | 28 | 1/22 |
| R02573 | lo-turn | high-intersection-burden | 5 | 0.813 | 41 | 15/22 |
| R02576 | lo-turn | high-intersection-burden | 5 | 0.809 | 29 | 5/22 |
| R02586 | lo-turn | must-cross-heavy | 6 | 0.75 | 3 | 4/22 |
| R02597 | hi-turn | must-cross-heavy | 15 | 0.694 | 7 | 5/22 |
| R02598 | lo-turn | high-intersection-burden | 5 | 0.806 | 33 | 1/22 |
| R02600 | lo-turn | high-intersection-burden | 5 | 0.726 | 33 | 3/22 |
| R02602 | hi-turn | high-intersection-burden | 8 | 0.767 | 32 | 1/22 |
| R02612 | lo-turn | high-intersection-burden | 5 | 0.678 | 6 | 1/22 |
| R02613 | lo-turn | high-intersection-burden | 4 | 0.808 | 17 | 1/22 |
| R02615 | lo-turn | high-intersection-burden | 7 | 0.847 | 15 | 1/22 |
| R02623 | lo-turn | default | 3 | 0.695 | 16 | 3/22 |
| R02638 | hi-turn | high-intersection-burden | 11 | 0.804 | 19 | 1/22 |
| R02644 | lo-turn | portal-heavy | 7 | 0.723 | 27 | 3/22 |
| R02647 | hi-turn | high-intersection-burden | 12 | 0.671 | 13 | 2/22 |
| R02654 | hi-turn | high-intersection-burden | 8 | 0.748 | 3 | 3/22 |
| R02670 | hi-turn | high-intersection-burden | 8 | 0.659 | 44 | 12/22 |
| R02682 | hi-turn | high-intersection-burden | 11 | 0.754 | 12 | 6/22 |
| R02695 | lo-turn | high-intersection-burden | 2 | 0.69 | 7 | 3/22 |
| R02709 | lo-turn | high-intersection-burden | 0 | 0.722 | 23 | 4/22 |
| R02719 | lo-turn | high-intersection-burden | 7 | 0.815 | 25 | 1/22 |
| R02724 | lo-turn | high-intersection-burden | 6 | 0.876 | 4 | 8/22 |
| R02730 | lo-turn | high-intersection-burden | 6 | 0.636 | 5 | 3/22 |
| R02733 | hi-turn | portal-heavy | 9 | 0.802 | 37 | 2/22 |
| R02739 | lo-turn | high-intersection-burden | 3 | 0.795 | 22 | 1/22 |
| R02751 | lo-turn | high-intersection-burden | 7 | 0.646 | 15 | 3/22 |
| R02758 | lo-turn | must-cross-heavy | 7 | 0.74 | 4 | 1/22 |
| R02759 | hi-turn | high-intersection-burden | 8 | 0.742 | 38 | 11/22 |
| R02760 | lo-turn | high-intersection-burden | 0 | 0.614 | 17 | 22/22 |
| R02767 | hi-turn | high-intersection-burden | 16 | 0.656 | 20 | 1/22 |
| R02768 | hi-turn | high-intersection-burden | 12 | 0.802 | 35 | 3/22 |
| R02770 | lo-turn | high-intersection-burden | 6 | 1.045 | 5 | 1/22 |
| R02782 | lo-turn | high-intersection-burden | 5 | 0.914 | 6 | 2/22 |
| R02786 | lo-turn | high-intersection-burden | 6 | 0.772 | 19 | 5/22 |
| R02787 | lo-turn | must-cross-heavy | 5 | 0.845 | 30 | 1/22 |
| R02788 | lo-turn | must-cross-heavy | 3 | 0.811 | 13 | 4/22 |
| R02790 | lo-turn | high-intersection-burden | 1 | 0.823 | 18 | 3/22 |
| R02793 | hi-turn | high-intersection-burden | 8 | 0.653 | 16 | 1/22 |
| R02796 | lo-turn | high-intersection-burden | 7 | 0.804 | 14 | 10/22 |
| R02807 | hi-turn | high-intersection-burden | 14 | 0.724 | 4 | 4/22 |
| R02814 | hi-turn | high-intersection-burden | 11 | 0.737 | 4 | 3/22 |
| R02815 | lo-turn | high-intersection-burden | 0 | 0.738 | 8 | 13/22 |
| R02819 | lo-turn | high-intersection-burden | 5 | 0.688 | 35 | 5/22 |
| R02833 | lo-turn | high-intersection-burden | 7 | 0.634 | 19 | 1/22 |
| R02843 | lo-turn | high-intersection-burden | 0 | 0.803 | 9 | 11/22 |
| R02844 | hi-turn | must-cross-heavy | 8 | 0.6 | 2 | 2/22 |
| R02852 | hi-turn | high-intersection-burden | 8 | 0.718 | 6 | 6/22 |
| R02854 | lo-turn | high-intersection-burden | 3 | 0.772 | 10 | 1/22 |
| R02859 | hi-turn | must-cross-heavy | 12 | 0.79 | 5 | 5/22 |
| R02860 | hi-turn | high-intersection-burden | 8 | 0.766 | 7 | 3/22 |
| R02863 | hi-turn | high-intersection-burden | 14 | 0.659 | 25 | 1/22 |
| R02864 | lo-turn | high-intersection-burden | 2 | 0.722 | 8 | 2/22 |
| R02866 | lo-turn | high-intersection-burden | 6 | 0.589 | 8 | 2/22 |
| R02876 | hi-turn | high-intersection-burden | 12 | 0.664 | 10 | 12/22 |
| R02884 | lo-turn | must-cross-heavy | 5 | 0.549 | 26 | 1/22 |
| R02896 | hi-turn | high-intersection-burden | 13 | 0.799 | 42 | 1/22 |
| R02900 | hi-turn | high-intersection-burden | 15 | 0.796 | 10 | 6/22 |
| R02910 | hi-turn | high-intersection-burden | 8 | 0.728 | 23 | 1/22 |
| R02911 | hi-turn | high-intersection-burden | 11 | 0.833 | 17 | 3/22 |
| R02923 | hi-turn | must-cross-heavy | 8 | 0.923 | 23 | 6/22 |
| R02931 | lo-turn | high-intersection-burden | 0 | 0.848 | 15 | 5/22 |
| R02932 | lo-turn | high-intersection-burden | 7 | 0.779 | 12 | 1/22 |
| R02940 | hi-turn | portal-heavy | 14 | 0.591 | 33 | 1/22 |
| R02951 | hi-turn | high-intersection-burden | 9 | 0.652 | 8 | 1/22 |
| R02953 | lo-turn | high-intersection-burden | 7 | 0.805 | 6 | 2/22 |
| R02960 | lo-turn | must-cross-heavy | 6 | 0.798 | 4 | 12/22 |
| R02961 | lo-turn | high-intersection-burden | 6 | 0.888 | 18 | 2/22 |
| R02966 | lo-turn | high-intersection-burden | 6 | 0.959 | 6 | 5/22 |
| R02980 | hi-turn | high-intersection-burden | 13 | 0.667 | 20 | 1/22 |
| R02992 | hi-turn | high-intersection-burden | 13 | 0.778 | 12 | 1/22 |
| R02995 | hi-turn | high-intersection-burden | 15 | 0.601 | 4 | 2/22 |
| R03002 | hi-turn | high-intersection-burden | 11 | 0.654 | 14 | 1/22 |
| R03005 | hi-turn | high-intersection-burden | 13 | 0.62 | 12 | 5/22 |
| R03006 | hi-turn | must-cross-heavy | 8 | 0.692 | 19 | 1/22 |
| R03019 | hi-turn | high-intersection-burden | 13 | 0.934 | 14 | 2/22 |
| R03020 | hi-turn | portal-heavy | 10 | 0.7 | 15 | 4/22 |
| R03028 | hi-turn | high-intersection-burden | 12 | 0.867 | 8 | 1/22 |
| R03042 | hi-turn | high-intersection-burden | 8 | 0.638 | 2 | 6/22 |
| R03045 | hi-turn | portal-heavy | 8 | 0.627 | 26 | 7/22 |
| R03052 | lo-turn | high-intersection-burden | 1 | 0.776 | 11 | 9/22 |
| R03054 | lo-turn | high-intersection-burden | 0 | 0.788 | 12 | 14/22 |
| R03057 | hi-turn | default | 13 | 0.737 | 28 | 2/22 |
| R03059 | lo-turn | high-intersection-burden | 5 | 0.736 | 6 | 7/22 |
| R03066 | hi-turn | high-intersection-burden | 11 | 0.648 | 37 | 4/22 |
| R03068 | lo-turn | high-intersection-burden | 6 | 0.769 | 15 | 2/22 |
| R03071 | lo-turn | high-intersection-burden | 6 | 0.75 | 3 | 3/22 |
| R03073 | lo-turn | high-intersection-burden | 6 | 0.704 | 37 | 10/22 |
| R03076 | lo-turn | portal-heavy | 6 | 0.663 | 18 | 2/22 |
| R03077 | hi-turn | high-intersection-burden | 8 | 0.811 | 12 | 5/22 |
| R03079 | lo-turn | high-intersection-burden | 5 | 0.576 | 19 | 7/22 |
| R03084 | lo-turn | must-cross-heavy | 0 | 0.684 | 10 | 8/22 |
| R03089 | hi-turn | must-cross-heavy | 8 | 0.791 | 8 | 2/22 |
| R03106 | hi-turn | high-intersection-burden | 10 | 0.852 | 18 | 1/22 |
| R03108 | lo-turn | high-intersection-burden | 6 | 0.76 | 24 | 3/22 |
| R03116 | hi-turn | must-cross-heavy | 13 | 0.617 | 3 | 5/22 |
| R03118 | lo-turn | high-intersection-burden | 0 | 0.919 | 19 | 14/22 |
| R03120 | hi-turn | high-intersection-burden | 14 | 0.838 | 8 | 2/22 |
| R03124 | lo-turn | high-intersection-burden | 7 | 0.91 | 16 | 9/22 |
| R03132 | lo-turn | portal-heavy | 7 | 0.685 | 32 | 2/22 |
| R03134 | lo-turn | high-intersection-burden | 7 | 0.691 | 37 | 5/22 |
| R03136 | hi-turn | high-intersection-burden | 17 | 0.72 | 3 | 1/22 |
| R03141 | lo-turn | portal-heavy | 0 | 0.706 | 43 | 2/22 |
| R03145 | hi-turn | high-intersection-burden | 15 | 0.776 | 29 | 21/22 |
| R03148 | lo-turn | high-intersection-burden | 7 | 0.582 | 27 | 18/22 |
| R03158 | hi-turn | high-intersection-burden | 13 | 0.87 | 18 | 1/22 |
| R03165 | hi-turn | high-intersection-burden | 15 | 0.813 | 17 | 6/22 |
| R03186 | hi-turn | high-intersection-burden | 16 | 0.696 | 11 | 3/22 |
| R03190 | hi-turn | high-intersection-burden | 16 | 0.664 | 21 | 1/22 |
| R03192 | lo-turn | portal-heavy | 7 | 0.524 | 17 | 6/22 |
| R03201 | hi-turn | high-intersection-burden | 11 | 0.661 | 9 | 8/22 |
| R03205 | lo-turn | must-cross-heavy | 4 | 0.586 | 10 | 16/22 |
| R03236 | lo-turn | high-intersection-burden | 2 | 0.96 | 13 | 2/22 |
| R03241 | lo-turn | high-intersection-burden | 1 | 0.608 | 9 | 1/22 |
| R03242 | lo-turn | high-intersection-burden | 1 | 0.696 | 12 | 4/22 |
| R03254 | hi-turn | high-intersection-burden | 11 | 0.663 | 3 | 1/22 |
| R03261 | hi-turn | default | 9 | 0.574 | 33 | 1/22 |
| R03264 | lo-turn | high-intersection-burden | 7 | 0.662 | 14 | 1/22 |
| R03270 | hi-turn | high-intersection-burden | 13 | 1.012 | 5 | 1/22 |
| R03280 | lo-turn | high-intersection-burden | 7 | 0.662 | 4 | 1/22 |
| R03287 | hi-turn | high-intersection-burden | 10 | 0.729 | 25 | 1/22 |
| R03289 | hi-turn | high-intersection-burden | 10 | 0.782 | 30 | 1/22 |
| R03293 | hi-turn | high-intersection-burden | 9 | 0.777 | 4 | 3/22 |
| R03298 | hi-turn | high-intersection-burden | 8 | 0.818 | 7 | 1/22 |
| R03302 | hi-turn | must-cross-heavy | 9 | 0.869 | 36 | 6/22 |
| R03306 | lo-turn | high-intersection-burden | 5 | 0.825 | 29 | 7/22 |
| R03307 | hi-turn | must-cross-heavy | 17 | 0.848 | 22 | 4/22 |
| R03308 | hi-turn | must-cross-heavy | 18 | 0.708 | 12 | 1/22 |
| R03309 | hi-turn | high-intersection-burden | 8 | 0.694 | 26 | 2/22 |
| R03317 | lo-turn | must-cross-heavy | 7 | 0.726 | 26 | 2/22 |
| R03323 | lo-turn | must-cross-heavy | 1 | 0.692 | 11 | 9/22 |
| R03324 | hi-turn | must-cross-heavy | 9 | 0.66 | 12 | 3/22 |
| R03325 | hi-turn | high-intersection-burden | 8 | 0.684 | 9 | 6/22 |
| R03329 | hi-turn | high-intersection-burden | 10 | 0.802 | 7 | 9/22 |
| R03331 | hi-turn | high-intersection-burden | 16 | 0.672 | 19 | 2/22 |
| R03342 | lo-turn | high-intersection-burden | 6 | 0.866 | 14 | 2/22 |
| R03347 | hi-turn | high-intersection-burden | 16 | 0.604 | 3 | 4/22 |
| R03356 | lo-turn | high-intersection-burden | 0 | 0.687 | 15 | 2/22 |
| R03368 | hi-turn | high-intersection-burden | 11 | 0.67 | 11 | 11/22 |
