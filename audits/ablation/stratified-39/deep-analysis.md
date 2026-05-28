
════════════════════════════════════════════════════════════════════════
Solver Ablation — Deep Analysis (Archaeological Layer)
════════════════════════════════════════════════════════════════════════
Input:  audits/ablation/stratified-39
Date:   2026-05-28T22:37:07.000Z
Commit: 0a4070447aa0
Budget: 180000ms × globalBudgetMultiplier (solo = ×2)
Levels: 39 (IMPORTANT: small sample — see LIMITATIONS section)

This analysis treats the solver as an evolved organism, not a designed system.
Every technique is assumed to be "historical scar tissue" until proven otherwise.

── GENUINE SOLO COVERAGE (attribution-filtered) ────────────────────
Coverage counts are attribution-filtered: only levels where firstSolvingAttempt
starts with the technique's own prefix are counted. Fallback contamination excluded.

  Technique                            Genuine  Coverage  Levels covered
  ────────────────────────────────────────────────────────────────────────────────
  structural-modern                          0        0%  
  structural-conservative                    0        0%  
  template                                   0        0%  
  portal-optional-modern                     0        0%  
  portal-optional-endurance                  0        0%  
  portal-optional-perimeter                  0        0%  
  must-cross-horizon                         0        0%  
  endurance-longpath                         0        0%  
  archetype                                  0        0%  

── DOMINATED TECHNIQUE PAIRS ───────────────────────────────────────
Technique A is "coverage-dominated" by B if A's genuine coverage ⊆ B's coverage.
Coverage-dominated does NOT mean useless — A may still be faster for its levels.
Full domination (speed + coverage) requires B to also be faster for all shared levels.



── FEATURE-STRATIFIED COVERAGE MATRIX ──────────────────────────────
For each technique, genuine solo coverage rate broken down by level feature.
Simpson's Paradox risk: flagged when subgroup rate differs strongly from aggregate.


── ORCHESTRATION OVERHEAD ANALYSIS ─────────────────────────────────
For each level, the true overhead = total elapsed − winning attempt elapsed.
This measures time wasted running earlier stages/attempts before the winner.
NOTE: attemptSummary only captures the WINNING stage's attempts. Cross-stage
overhead (stage-0 failure → stage-2 winner) is not decomposed in current data.

  Level  Winner                                           Overhead   Fraction   Interpretation
  ────────────────────────────────────────────────────────────────────────────────────────────────────
  L73   template-perimeter-cw                            96s        100      %  ri=2 p=N mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L26   template-perimeter-cw                            80s        95       %  ri=6 p=Y mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L47   template-perimeter-cw                            35s        99       %  ri=5 p=N mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L50   template-perimeter-cw                            33s        98       %  ri=3 p=N mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L7    template-best-focus:corner-harvest               10s        100      %  ri=2 p=N mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L34   template-perimeter-cw                            4s         99       %  ri=2 p=N mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L135  template-corner-harvest                          3s         100      %  ri=? p=Y mc=N
         → stage-0 structural exhausted budget before stage-2-template ran
  L80   structural-modern                                3s         59       %  ri=4 p=Y mc=N
         → intra-stage overhead (prior attempts within stage-0)
  L92   archetype-high-intersection-burden-intersectionHarvest 1s         4        %  ri=8 p=Y mc=Y
         → stage-0 structural exhausted budget before stage-2-archetype ran
  L20   structural-modern                                1s         27       %  ri=2 p=Y mc=N
         → intra-stage overhead (prior attempts within stage-0)

  Total wasted time (stage-0 failures before stage-2 winner): 265s / 330s total (80%)
  If the winning technique had run FIRST for those levels, solve time would drop ~265s.

── BUDGET ARTIFACT HYPOTHESIS ──────────────────────────────────────
A technique is a "budget artifact" if its genuine solo coverage at 2× budget
matches what structural methods cover when present at 1× budget.
i.e., the technique isn't genuinely different — it's structural with more time.

  Techniques compared against structural-conservative as the budget-reference method.
  Structural-modern and structural-conservative are the reference; excluded from this table.


  Note: SC-overlap measures what % of T's genuine solo coverage is ALSO
  covered by structural-conservative alone. High overlap = T adds nothing new.
  "No regressions when disabled" = structural methods cover T's levels at 1× budget.

── TECHNIQUE CLASSIFICATION TAXONOMY ───────────────────────────────
Classifications with supporting evidence. Confidence = Low/Medium/High.
Multiple classifications possible for one technique.

  structural-modern
    [SPEED-CRITICAL              ] High   | +40s total overhead when disabled; no coverage regressions
  structural-conservative
    [UNKNOWN / ZERO-COVERAGE     ] N/A    | No solo data or 0 genuine solo solves on this sample
  template
    [INDISPENSABLE               ] Medium | Causes 2 regression(s) but coverage not provably unique on this sample
    [ORCHESTRATION-ARTIFACT (risk)] Low    | Avg 99% of solve time is pre-winner overhead; runs after stage-0 fails
  portal-optional-modern
    [UNKNOWN / ZERO-COVERAGE     ] N/A    | No solo data or 0 genuine solo solves on this sample
  portal-optional-endurance
    [UNKNOWN / ZERO-COVERAGE     ] N/A    | No solo data or 0 genuine solo solves on this sample
  portal-optional-perimeter
    [UNKNOWN / ZERO-COVERAGE     ] N/A    | No solo data or 0 genuine solo solves on this sample
  must-cross-horizon
    [SPEED-CONTRIBUTING          ] Medium | +12s total overhead when disabled
  endurance-longpath
    [SPEED-CONTRIBUTING          ] Medium | +13s total overhead when disabled
  archetype
    [INDISPENSABLE               ] Medium | Causes 1 regression(s) but coverage not provably unique on this sample

── ORCHESTRATION ARCHITECTURE ANALYSIS ─────────────────────────────
Policy: how a strategy searches. Orchestration: when/why strategies run.
Fallback architecture: what happens after failure.


  ▸ Stage routing correctness
  No levels found where stage-2 routing was provably worse than stage-0.

  ▸ Fallback architecture redundancy

  Techniques with zero unique coverage (all their levels also covered by structural-conservative):
    { none }
  These techniques are purely fallback insurance for when structural methods are too slow.
  Their presence in the plan adds orchestration complexity without adding correctness guarantees.

  ▸ Budget allocation efficiency

── SAMPLE LIMITATIONS — WHAT THIS DATA CANNOT ANSWER ───────────────

This sample contains 39 levels. The full game has 140+. Many conclusions below
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

Based on this 39-level sample (SUBJECT TO REVISION with larger data):

  Load-bearing (unique coverage or causes regressions when disabled):
    none found

  Speed-critical (removing costs >15s; no unique coverage):
    structural-modern (+40s)

  Speed-contributing (removing costs 0.5-15s):
    template (+10s), must-cross-horizon (+12s), endurance-longpath (+13s), archetype (+3s)

  Apparent scar tissue (no unique coverage, no regressions when disabled, minimal timing impact):
    structural-conservative, portal-optional-modern, portal-optional-endurance, portal-optional-perimeter

  IMPORTANT: "Apparent scar tissue" requires verification on 140-level data.
  A technique covering 0 levels in a 10-level sample may cover many in the full game.

── DISABLE-ONE FALLBACK CHAINS ─────────────────────────────────────
For each disable-one variant: which levels changed winner? When technique T is disabled,
which technique steps in? This reveals the fallback dependency graph.

  disable-structural-modern             
    Failures: 0  
    Changed winner: 24  Fallbacks: POM:10 MCH:6 SC:5 TPL:3
    Safety-valve suspects: L9 — technique disabled but still won (plan was single-technique)
    Speed on changed levels: +69s total, +2878ms avg

  disable-structural-conservative       
    Failures: 0  
    Changed winner: 1  Fallbacks: ELP:1
    Speed on changed levels: -6s total, -6048ms avg

  disable-template                      
    Failures: 2  L7 L135
    Changed winner: 5  Fallbacks: SC:4 POM:1
    Speed on changed levels: +11s total, +2102ms avg

  disable-portal-optional-modern        
    Failures: 0  
    Changed winner: 0  Fallbacks: none

  disable-portal-optional-endurance     
    Failures: 0  
    Changed winner: 0  Fallbacks: none

  disable-portal-optional-perimeter     
    Failures: 0  
    Changed winner: 0  Fallbacks: none

  disable-must-cross-horizon            
    Failures: 0  
    Changed winner: 0  Fallbacks: none

  disable-endurance-longpath            
    Failures: 0  
    Changed winner: 0  Fallbacks: none

  disable-archetype                     
    Failures: 1  L26
    Changed winner: 7  Fallbacks: SM:7
    Speed on changed levels: +18s total, +2524ms avg


── TECHNIQUE INTERACTION MATRIX ────────────────────────────────────
When technique ROW is disabled, how many levels fall to technique COL?
Read across: ROW's fallback distribution. Read down: COL's pickup coverage.

  Disabled      SM    SC   TPL   POM   POE   POP   MCH   ELP   ARC  FAIL
  ────────────────────────────────────────────────────────────────────────
  SM             1     5    10    10                 6           7     0
  SC            25           6                             1     7     0
  TPL           25     4           1                             7     2
  POM           25           7                                   7     0
  POE           25           7                                   7     0
  POP           25           7                                   7     0
  MCH           25           7                                   7     0
  ELP           25           7                                   7     0
  ARC           32           6                                         1

