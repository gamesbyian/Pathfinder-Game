# Portal-parity census

Corpus: data/stress/stress-levels.json -- 102 level(s), 38 with >=1 twist portal pair, 38 checked (had a stored solution), 0 skipped (no hint).

Total replayed steps: 2908
Naive portal-free parity MISMATCH (would be rejected by prune-gauntlet.ts's own PRUNE_PARITY logic if it ran on this portal level): 1060 (36.45%)
...of those, >=1 twist portal pair still fully unused (existence-only conjecture says "don't reject"): 1060 (100.00%)
...of those, the nearest such portal's BFS distance from pos looks plausibly reachable within rSteps (loose proxy, not a rigorous bound): 1060 (100.00%)

**VIOLATIONS of the existence-only conjecture (mismatch AND zero unused twist portals, on a REAL solution's own path -- this must be 0 for the design to be sound): 0**
