# Portal-parity census

Corpus: data/stress/stress-levels-random.json -- 1700 level(s), 933 with >=1 twist portal pair, 417 checked (had a stored solution), 516 skipped (no hint).

Total replayed steps: 35942
Naive portal-free parity MISMATCH (would be rejected by prune-gauntlet.ts's own PRUNE_PARITY logic if it ran on this portal level): 14401 (40.07%)
...of those, >=1 twist portal pair still fully unused (existence-only conjecture says "don't reject"): 14401 (100.00%)
...of those, the nearest such portal's BFS distance from pos looks plausibly reachable within rSteps (loose proxy, not a rigorous bound): 14401 (100.00%)

**VIOLATIONS of the existence-only conjecture (mismatch AND zero unused twist portals, on a REAL solution's own path -- this must be 0 for the design to be sound): 0**
