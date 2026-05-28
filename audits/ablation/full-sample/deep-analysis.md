
════════════════════════════════════════════════════════════════════════
Solver Ablation — Deep Analysis (Archaeological Layer)
════════════════════════════════════════════════════════════════════════
Input:  audits/ablation/full-sample
Date:   2026-05-28T18:16:52.402Z
Commit: 07b79cf0fd42
Budget: 30000ms × globalBudgetMultiplier (solo = ×2)
Levels: 10 (IMPORTANT: small sample — see LIMITATIONS section)

This analysis treats the solver as an evolved organism, not a designed system.
Every technique is assumed to be "historical scar tissue" until proven otherwise.

── GENUINE SOLO COVERAGE (attribution-filtered) ────────────────────
Coverage counts are attribution-filtered: only levels where firstSolvingAttempt
starts with the technique's own prefix are counted. Fallback contamination excluded.

  Technique                            Genuine  Coverage  Levels covered
  ────────────────────────────────────────────────────────────────────────────────
  structural-conservative                    9       90%  L1 L3 L50 L108 L120 L130 L134 L139 L140
  structural-modern                          8       80%  L1 L3 L108 L120 L130 L134 L139 L140
  must-cross-horizon                         6       60%  L1 L120 L130 L134 L139 L140
  archetype                                  4       40%  L92 L108 L134 L139
  portal-optional-modern                     2       20%  L108 L130
  portal-optional-endurance                  2       20%  L108 L130
  portal-optional-perimeter                  2       20%  L108 L130
  template                                   1       10%  L50
  endurance-longpath                         1       10%  L50

── DOMINATED TECHNIQUE PAIRS ───────────────────────────────────────
Technique A is "coverage-dominated" by B if A's genuine coverage ⊆ B's coverage.
Coverage-dominated does NOT mean useless — A may still be faster for its levels.
Full domination (speed + coverage) requires B to also be faster for all shared levels.

  Coverage-dominated pairs (A's levels ⊆ B's levels, B faster on majority):
  portal-optional-modern               ⊆ structural-modern                    B faster: 1/2
  portal-optional-modern               ⊆ structural-conservative              B faster: 1/2
  portal-optional-endurance            ⊆ structural-modern                    B faster: 1/2
  must-cross-horizon                   ⊆ structural-modern                    B faster: 3/6
  must-cross-horizon                   ⊆ structural-conservative              B faster: 3/6

  Exact coverage duplicates (same genuine coverage set — 2 pairs):
    Cluster: { template, endurance-longpath }  →  levels: L50
    Cluster: { portal-optional-modern, portal-optional-endurance, portal-optional-perimeter }  →  levels: L108 L130

── FEATURE-STRATIFIED COVERAGE MATRIX ──────────────────────────────
For each technique, genuine solo coverage rate broken down by level feature.
Simpson's Paradox risk: flagged when subgroup rate differs strongly from aggregate.

  structural-conservative  (9/10 aggregate = 90%)
    hasPortals           hasPortals=Y: 75% (4lv)  hasPortals=N: 100% (6lv)  
    hasFilters           hasFilters=Y: 75% (4lv)  hasFilters=N: 100% (6lv)  
    reqInt=high(7+)       50% (2lv)  notable
  structural-modern  (8/10 aggregate = 80%)
    hasMustPass          hasMustPass=Y: 67% (6lv)  hasMustPass=N: 100% (4lv)  notable
    hasFalseGoals        hasFalseGoals=Y: 100% (2lv)  hasFalseGoals=N: 75% (8lv)  
    multiGate            multiGate=Y: 100% (3lv)  multiGate=N: 71% (7lv)  
    reqInt=high(7+)       50% (2lv)  notable
  must-cross-horizon  (6/10 aggregate = 60%)
    hasMustCross         hasMustCross=Y: 86% (7lv)  hasMustCross=N: 0% (3lv)  SIMPSON-RISK
    hasMustPass          hasMustPass=Y: 50% (6lv)  hasMustPass=N: 75% (4lv)  
    hasFilters           hasFilters=Y: 75% (4lv)  hasFilters=N: 50% (6lv)  
    hasFalseGoals        hasFalseGoals=Y: 100% (2lv)  hasFalseGoals=N: 50% (8lv)  SIMPSON-RISK
    reqInt=medium(4-6)    100% (2lv)  notable
  archetype  (4/10 aggregate = 40%)
    hasPortals           hasPortals=Y: 75% (4lv)  hasPortals=N: 17% (6lv)  SIMPSON-RISK
    hasMustPass          hasMustPass=Y: 50% (6lv)  hasMustPass=N: 25% (4lv)  
    reqInt=high(7+)       100% (2lv)  SIMPSON-RISK
    reqInt=medium(4-6)    0% (2lv)  notable
  portal-optional-modern  (2/10 aggregate = 20%)
    hasPortals           hasPortals=Y: 50% (4lv)  hasPortals=N: 0% (6lv)  SIMPSON-RISK
    hasFilters           hasFilters=Y: 0% (4lv)  hasFilters=N: 33% (6lv)  notable
    hasFalseGoals        hasFalseGoals=Y: 0% (2lv)  hasFalseGoals=N: 25% (8lv)  
    multiGate            multiGate=Y: 0% (3lv)  multiGate=N: 29% (7lv)  
    reqInt=medium(4-6)    50% (2lv)  notable
  portal-optional-endurance  (2/10 aggregate = 20%)
    hasPortals           hasPortals=Y: 50% (4lv)  hasPortals=N: 0% (6lv)  SIMPSON-RISK
    hasFilters           hasFilters=Y: 0% (4lv)  hasFilters=N: 33% (6lv)  notable
    hasFalseGoals        hasFalseGoals=Y: 0% (2lv)  hasFalseGoals=N: 25% (8lv)  
    multiGate            multiGate=Y: 0% (3lv)  multiGate=N: 29% (7lv)  
    reqInt=medium(4-6)    50% (2lv)  notable
  portal-optional-perimeter  (2/10 aggregate = 20%)
    hasPortals           hasPortals=Y: 50% (4lv)  hasPortals=N: 0% (6lv)  SIMPSON-RISK
    hasFilters           hasFilters=Y: 0% (4lv)  hasFilters=N: 33% (6lv)  notable
    hasFalseGoals        hasFalseGoals=Y: 0% (2lv)  hasFalseGoals=N: 25% (8lv)  
    multiGate            multiGate=Y: 0% (3lv)  multiGate=N: 29% (7lv)  
    reqInt=medium(4-6)    50% (2lv)  notable
  template  (1/10 aggregate = 10%)
    hasMustCross         hasMustCross=Y: 0% (7lv)  hasMustCross=N: 33% (3lv)  notable
  endurance-longpath  (1/10 aggregate = 10%)
    hasMustCross         hasMustCross=Y: 0% (7lv)  hasMustCross=N: 33% (3lv)  notable

── ORCHESTRATION OVERHEAD ANALYSIS ─────────────────────────────────
For each level, the true overhead = total elapsed − winning attempt elapsed.
This measures time wasted running earlier stages/attempts before the winner.
NOTE: attemptSummary only captures the WINNING stage's attempts. Cross-stage
overhead (stage-0 failure → stage-2 winner) is not decomposed in current data.

  Level  Winner                                           Overhead   Fraction   Interpretation
  ────────────────────────────────────────────────────────────────────────────────────────────────────
  L139  archetype-high-intersection-burden-intersectionHarvest 39s        90       %  ri=11 p=N mc=Y
         → stage-0 structural exhausted budget before stage-2-archetype ran
  L50   template-perimeter-cw                            22s        97       %  ri=3 p=N mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L92   archetype-high-intersection-burden-intersectionHarvest 11s        91       %  ri=8 p=Y mc=Y
         → stage-0 structural exhausted budget before stage-2-archetype ran

  Total wasted time (stage-0 failures before stage-2 winner): 71s / 82s total (87%)
  If the winning technique had run FIRST for those levels, solve time would drop ~71s.

── BUDGET ARTIFACT HYPOTHESIS ──────────────────────────────────────
A technique is a "budget artifact" if its genuine solo coverage at 2× budget
matches what structural methods cover when present at 1× budget.
i.e., the technique isn't genuinely different — it's structural with more time.

  Techniques compared against structural-conservative as the budget-reference method.
  Structural-modern and structural-conservative are the reference; excluded from this table.

  template                             solo=1lv  SC-overlap=100%  regressions=0  → BUDGET ARTIFACT (high confidence) — structural methods cover all solo levels; no regressions when disabled
  portal-optional-modern               solo=2lv  SC-overlap=100%  regressions=0  → BUDGET ARTIFACT (high confidence) — structural methods cover all solo levels; no regressions when disabled
  portal-optional-endurance            solo=2lv  SC-overlap=100%  regressions=0  → BUDGET ARTIFACT (high confidence) — structural methods cover all solo levels; no regressions when disabled
  portal-optional-perimeter            solo=2lv  SC-overlap=100%  regressions=0  → BUDGET ARTIFACT (high confidence) — structural methods cover all solo levels; no regressions when disabled
  must-cross-horizon                   solo=6lv  SC-overlap=100%  regressions=0  → BUDGET ARTIFACT (high confidence) — structural methods cover all solo levels; no regressions when disabled
  endurance-longpath                   solo=1lv  SC-overlap=100%  regressions=0  → BUDGET ARTIFACT (high confidence) — structural methods cover all solo levels; no regressions when disabled
  archetype                            solo=4lv  SC-overlap=75%  regressions=1  → NOT a pure budget artifact — causes 1 regression(s) when disabled

  Note: SC-overlap measures what % of T's genuine solo coverage is ALSO
  covered by structural-conservative alone. High overlap = T adds nothing new.
  "No regressions when disabled" = structural methods cover T's levels at 1× budget.

── TECHNIQUE CLASSIFICATION TAXONOMY ───────────────────────────────
Classifications with supporting evidence. Confidence = Low/Medium/High.
Multiple classifications possible for one technique.

  structural-modern
    [SPEED-CRITICAL              ] High   | +26s total overhead when disabled; no coverage regressions
  structural-conservative
    [REDUNDANT (on this sample)  ] Low    | 9 genuine solo solves, all covered by structural-conservative, no regressions
  template
    [SPEED-MARGINAL              ] Low    | +1s timing delta — within noise range at this sample size
    [BUDGET-ARTIFACT (hypothesis)] Medium | All 1 solo levels covered by structural-conservative at 2×; 0 regressions when disabled
    [ORCHESTRATION-ARTIFACT (risk)] Low    | Avg 97% of solve time is pre-winner overhead; runs after stage-0 fails
  portal-optional-modern
    [BUDGET-ARTIFACT (hypothesis)] Medium | All 2 solo levels covered by structural-conservative at 2×; 0 regressions when disabled
  portal-optional-endurance
    [SPEED-MARGINAL              ] Low    | +1s timing delta — within noise range at this sample size
    [BUDGET-ARTIFACT (hypothesis)] Medium | All 2 solo levels covered by structural-conservative at 2×; 0 regressions when disabled
  portal-optional-perimeter
    [BUDGET-ARTIFACT (hypothesis)] Medium | All 2 solo levels covered by structural-conservative at 2×; 0 regressions when disabled
  must-cross-horizon
    [SPEED-MARGINAL              ] Low    | +2s timing delta — within noise range at this sample size
    [BUDGET-ARTIFACT (hypothesis)] Medium | All 6 solo levels covered by structural-conservative at 2×; 0 regressions when disabled
    [FEATURE-SPECIFIC            ] Medium | hasMustCross=Y: 86% vs hasMustCross=N: 0% coverage — concentrated in hasMustCross levels
  endurance-longpath
    [SPEED-MARGINAL              ] Low    | +1s timing delta — within noise range at this sample size
    [BUDGET-ARTIFACT (hypothesis)] Medium | All 1 solo levels covered by structural-conservative at 2×; 0 regressions when disabled
  archetype
    [INDISPENSABLE               ] High   | Causes 1 regression(s): L92; unique coverage: L92
    [FEATURE-SPECIFIC            ] Medium | hasPortals=Y: 75% vs hasPortals=N: 17% coverage — concentrated in hasPortals levels

── ORCHESTRATION ARCHITECTURE ANALYSIS ─────────────────────────────
Policy: how a strategy searches. Orchestration: when/why strategies run.
Fallback architecture: what happens after failure.


  ▸ Stage routing correctness
  Levels where routing to stage-2 is SLOWER than staying in stage-0:
    L139: 43153ms (via archetype-high-intersection-burden-inter) vs 5132ms structural (8.4× slower)
  → These levels are "misclassified" — the archetype classifier fires but structural is faster.
  → The classifier is over-broad; tighten it to avoid routing these levels to stage-2.

  ▸ Fallback architecture redundancy

  Techniques with zero unique coverage (all their levels also covered by structural-conservative):
    { structural-modern, template, portal-optional-modern, portal-optional-endurance, portal-optional-perimeter, must-cross-horizon, endurance-longpath }
  These techniques are purely fallback insurance for when structural methods are too slow.
  Their presence in the plan adds orchestration complexity without adding correctness guarantees.

  ▸ Budget allocation efficiency

  Budget sweep results (all techniques, global multiplier):
    ×0.25: 9/10 solved
    ×0.5: 10/10 solved
    ×2: 10/10 solved
    ×4: 10/10 solved
  → Budget is NOT the coverage bottleneck above 0.5×. The failure (L92 at 0.25×) is
    structural: archetype needs enough time to explore the constrained portal+mustCross search.
    Doubling or quadrupling budget does not unlock new levels beyond 0.5×.

── SAMPLE LIMITATIONS — WHAT THIS DATA CANNOT ANSWER ───────────────

This sample contains 10 levels. The full game has 140+. Many conclusions below
carry high Simpson's Paradox risk and MUST be re-evaluated on a larger, stratified sample.

  [HIGH-RISK] Claim: "portal-optional-{modern,endurance,perimeter} are always triplicate-redundant"
  Caveat: Only 2 portal levels in sample both have portals+reqInt≤6. These techniques may cover different portal level sub-types (high-reqInt portals, portal-only-path levels, etc.) in the full 140-level set. The identical {108,130} coverage is likely coincidence.

  [MEDIUM-RISK] Claim: "must-cross-horizon is always a budget artifact"
  Caveat: The 7 mustCross levels in sample include only 1 that archetype-type handles (L92). There may be mustCross levels in 140-level set where MCH is faster than structural by a large margin, or where structural fails at production budget.

  [MEDIUM-RISK] Claim: "template is redundant (covered by SC)"
  Caveat: Only 1 longpath level (L50, reqLen=34, reqInt=3) in sample. Template passes may be uniquely essential for high-reqLen, low-reqInt levels where greedy structural methods get trapped by local optima. Need more longpath levels.

  [HIGH-RISK] Claim: "endurance-longpath is identical to template"
  Caveat: Both cover only L50 in this sample. They may cover completely different level types across the full game. endurance-longpath targets portal-heavy/high-objectives levels.

  [MEDIUM-RISK] Claim: "archetype is essential only for L92-type levels"
  Caveat: L92 is the only portals+mustCross+reqInt≥8 level in sample. In 140-level set, there may be many such levels, making archetype more broadly essential.

  [LOW-RISK] Claim: "structural-conservative dominates all other techniques"
  Caveat: The 9/10 solo coverage is robust: SC is a fundamentally different algorithm (harvestThenFinish vs perimeterSweep). Its advantage may not hold for all level types.


── RECOMMENDED NEXT EXPERIMENTS ────────────────────────────────────

  1. 140-level baseline + full attribution analysis
     Goal: Understand the true distribution of technique usage across the game.
     Action: Run baseline on all 140 levels. Compute: which technique solves each level? Build distribution by (portals, mustCross, reqInt-bucket, gridArea-bucket). Identify natural level clusters for stratified ablation.
     Command: node scripts/solver-ablation.mjs --experiment=baseline --levels=all --output-dir=audits/ablation/baseline-140

  2. Stratified 50-level disable-one ablation
     Goal: Get statistically meaningful regressions per technique, per feature subgroup.
     Action: Sample 5+ levels per feature bucket (portals×Y/N, mustCross×Y/N, reqInt-bucket×3). Run disable-one on this stratified sample. This reveals Simpson's Paradox hiding in the 10-level aggregate.
     Command: node scripts/solver-ablation.mjs --experiment=disable-one --levels=<stratified-50> --output-dir=audits/ablation/stratified-50

  3. Per-technique budget scaling (technique-budget experiment)
     Goal: Determine which techniques are "budget artifacts" — just structural with more time.
     Action: For each technique T, run solo-T at 0.5×, 1×, 2×, 4×, 8× budget. If T's coverage at 2× is identical to structural-conservative at 1×, T is a budget artifact. Focus on: MCH, portal-optional-*, template, endurance-longpath.
     Command: node scripts/solver-ablation.mjs --experiment=technique-budget --output-dir=audits/ablation/tech-budget

  4. Archetype classifier tightening validation
     Goal: Confirm narrowing high-intersection-burden to require portals OR mustCross removes L139 false fires.
     Action: Run baseline with modified classifier. Verify: L92 still solved, L139 faster, no new regressions.

  5. Synthetic "gap level" generation
     Goal: Find levels where each "apparently-redundant" technique is uniquely essential.
     Action: Generate synthetic levels that maximize the expected activation condition for each technique. E.g., portal-optional-perimeter targets: portals + openness≥0.52 + structural-modern failure. If no synthetic level can activate the technique uniquely, it may be truly redundant.


── CONCEPTUAL CORE SUMMARY ─────────────────────────────────────────

Based on this 10-level sample (SUBJECT TO REVISION with larger data):

  Load-bearing (unique coverage or causes regressions when disabled):
    archetype  [4lv total, 1 uniquely covered: L92]

  Speed-critical (removing costs >15s; no unique coverage):
    structural-modern (+26s)

  Speed-contributing (removing costs 0.5-15s):
    template (+1s), portal-optional-endurance (+1s), must-cross-horizon (+2s), endurance-longpath (+1s)

  Apparent scar tissue (no unique coverage, no regressions when disabled, minimal timing impact):
    endurance-longpath

  IMPORTANT: "Apparent scar tissue" requires verification on 140-level data.
  A technique covering 0 levels in a 10-level sample may cover many in the full game.
