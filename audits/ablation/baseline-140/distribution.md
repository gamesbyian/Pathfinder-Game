
════════════════════════════════════════════════════════════════════════
140-Level Baseline: Technique Distribution & Sample Strategy
════════════════════════════════════════════════════════════════════════
Input:    /home/user/Pathfinder-Game/audits/ablation/baseline-140
Date:     2026-05-28T22:35:52.426Z
Commit:   unknown
Budget:   ?ms
Solved:   140/140

── TECHNIQUE DISTRIBUTION ─────────────────────────────────────────────
Who solves what across all 140 solved levels:

  Technique                        Count      %    Avg ms  Coverage
  ──────────────────────────────────────────────────────────────────────
  structural-modern                  126   90.0%      403ms  ██████████████████████░░
  template                             7    5.0%    38208ms  █░░░░░░░░░░░░░░░░░░░░░░░
  archetype                            7    5.0%     5613ms  █░░░░░░░░░░░░░░░░░░░░░░░

── ESCALATION MAP (how many solver stages were needed) ─────────────────

  Stages     Levels      %
  ────────────────────────────
  1             140  100.0%

  NOTE: stagesTried counts cross-stage escalations captured by the ablation runner.
  A level showing 1 stage may still have had multiple in-stage attempts.

── TIMING DISTRIBUTION ─────────────────────────────────────────────────

  Avg: 2554ms  P50: 62ms  P90: 3354ms  P99: 84662ms

  Bucket          Count      %  Levels
  ───────────────────────────────────────────────────────
  <100ms             81   57.9%  81 levels
  100-500ms          31   22.1%  31 levels
  0.5-2s             12    8.6%  12 levels
  2-10s               8    5.7%  L12 L34 L74 L80 L135 L136 L139 L140
  10-30s              4    2.9%  L7 L53 L92 L138
  >30s                4    2.9%  L26 L47 L50 L73

── FEATURE × TECHNIQUE MATRIX ──────────────────────────────────────────
For each boolean feature, how does presence/absence correlate with which
technique wins?

  Feature: hasPortals  (60 with, 80 without)
  Technique                        W/feat  W/o feat   Diff
  ───────────────────────────────────────────────────────
  archetype                            8%         3%      6%
  structural-modern                   88%        91%      3%
  template                             3%         6%      3%

  Feature: hasMustCross  (50 with, 90 without)
  Technique                        W/feat  W/o feat   Diff
  ───────────────────────────────────────────────────────
  template                             0%         8%      8%
  archetype                            8%         3%      5%
  structural-modern                   92%        89%      3%

  Feature: hasMustPass  (54 with, 86 without)
  Technique                        W/feat  W/o feat   Diff
  ───────────────────────────────────────────────────────
  structural-modern                   78%        98%     20%
  archetype                           11%         1%     10%
  template                            11%         1%     10%

  Feature: hasGeese  (62 with, 78 without)
  Technique                        W/feat  W/o feat   Diff
  ───────────────────────────────────────────────────────
  template                            10%         1%      8%
  structural-modern                   85%        94%      8%
  archetype                            5%         5%      0%

  Feature: hasFilters  (50 with, 90 without)
  Technique                        W/feat  W/o feat   Diff
  ───────────────────────────────────────────────────────
  template                             0%         8%      8%
  archetype                            8%         3%      5%
  structural-modern                   92%        89%      3%

  Feature: hasFalseGoals  (12 with, 128 without)
  Technique                        W/feat  W/o feat   Diff
  ───────────────────────────────────────────────────────
  structural-modern                   67%        92%     26%  ← notable
  template                            25%         3%     22%
  archetype                            8%         5%      4%

  Feature: multiGate  (48 with, 92 without)
  Technique                        W/feat  W/o feat   Diff
  ───────────────────────────────────────────────────────
  structural-modern                   92%        89%      3%
  archetype                            4%         5%      1%
  template                             4%         5%      1%

  Feature: reqInt bucket (complexity of required intersections)
  Bucket        Count  Techs used (count)                                
  ─────────────────────────────────────────────────────────────────
  reqInt=0         23  structural-modern:21  archetype:1  template:1
  reqInt 1-3      101  structural-modern:94  template:4  archetype:3
  reqInt 4-6       12  structural-modern:10  template:2
  reqInt 7-9        3  archetype:2  structural-modern:1
  reqInt 10+        1  archetype:1

── FAILURES ────────────────────────────────────────────────────────────
None — all 140 levels solved. Golden baseline intact.

── STRATIFIED SAMPLE FOR DISABLE-ONE ABLATION ──────────────────────────
Recommended 39-level sample for stratified disable-one run.
Selection prioritizes: non-SM winners > SC winners > escalated levels > feature-positive.

  Sample composition by winning technique:
    structural-modern                25
    template                         7
    archetype                        7

  Level list (use with --levels flag):
  1,2,3,4,5,6,7,9,10,11,12,13,14,17,19,20,26,30,34,47,50,56,60,61,65,73,74,79,80,83,92,108,130,134,135,136,138,139,140

  To run stratified disable-one ablation:
  node scripts/solver-ablation.mjs \
    --experiment=disable-one \
    --levels=1,2,3,4,5,6,7,9,10,11,12,13,14,17,19,20,26,30,34,47,50,56,60,61,65,73,74,79,80,83,92,108,130,134,135,136,138,139,140 \
    --output-dir=audits/ablation/stratified-50 \
    --max-level-wall-ms=120000

── FULL TECHNIQUE-LEVEL MAP ────────────────────────────────────────────
Which technique first-solved each level:

  structural-modern                [L1, L2, L3, L4, L5, L6, L8, L9, L10, L11, L12, L13, L14, L15, L16, L17, L18, L19, L20, L21, L22, L23, L24, L25, L27, L28, L29, L31, L32, L33, L35, L36, L37, L38, L39, L40, L41, L42, L43, L44, L45, L46, L48, L49, L51, L52, L53, L54, L55, L56, L57, L58, L59, L60, L61, L62, L63, L64, L65, L66, L67, L68, L69, L70, L71, L72, L74, L75, L76, L77, L78, L79, L80, L81, L82, L84, L85, L86, L87, L88, L89, L90, L91, L93, L94, L95, L96, L97, L98, L99, L100, L101, L102, L103, L104, L105, L106, L107, L109, L110, L111, L112, L113, L114, L115, L116, L117, L118, L119, L120, L121, L122, L123, L124, L125, L126, L127, L128, L129, L130, L131, L132, L133, L136, L137, L140]
  template                         [L7, L26, L34, L47, L50, L73, L135]
  archetype                        [L30, L83, L92, L108, L134, L138, L139]
