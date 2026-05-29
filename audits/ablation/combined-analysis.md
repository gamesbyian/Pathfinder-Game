
════════════════════════════════════════════════════════════════════════
Combined Ablation Analysis (2 runs)
════════════════════════════════════════════════════════════════════════
Generated: 2026-05-29T05:49:43.232Z
Runs:
  stratified-39                        39 levels  budget=180000ms  baseline: 39/39 solved
  new-levels-8                         8 levels  budget=180000ms  (no baseline)
Union of all tested levels: 47 levels
  L1, L2, L3, L4, L5, L6, L7, L9, L10, L11, L12, L13, L14, L17, L19, L20, L26, L30, L34, L47, … (27 more)

── PER-RUN BASELINE SUMMARY ────────────────────────────────────────
  stratified-39: 39/39 solved in 330.0s
    structural-modern                                    ×25
    template-perimeter-cw                                ×5
    archetype-sparse-near-closure-nearClosureRescue      ×3
    archetype-high-intersection-burden-intersectionHarvest ×3
    template-best-focus:corner-harvest                   ×1

── COMBINED TECHNIQUE-VERDICT TABLE ────────────────────────────────
Verdict across all 2 run(s) and 47 unique level(s).
REDUNDANT = 0 regressions across all runs.  SITUATIONAL = 1-2.  INDISPENSABLE = 3+.

  Technique                      Combined      Regressions    stratified-39   new-levels-8   
  ─────────────────────────────────────────────────────────────────────────────────────────────
  template                       SITUATIONAL   L7,L135        SITUATIONAL(2)   REDUNDANT      
  archetype                      SITUATIONAL   L26            SITUATIONAL(1)   REDUNDANT      
  endurance-longpath             REDUNDANT     none           REDUNDANT       REDUNDANT      
  must-cross-horizon             REDUNDANT     none           REDUNDANT       REDUNDANT      
  portal-optional-endurance      REDUNDANT     none           REDUNDANT       REDUNDANT      
  portal-optional-modern         REDUNDANT     none           REDUNDANT       REDUNDANT      
  portal-optional-perimeter      REDUNDANT     none           REDUNDANT       REDUNDANT      
  structural-conservative        REDUNDANT     none           REDUNDANT       REDUNDANT      
  structural-modern              REDUNDANT     none           REDUNDANT       REDUNDANT      

── REGRESSION DETAIL ───────────────────────────────────────────────
  template — 2 total regression(s): L7, L135
    run: stratified-39 — L7, L135 (budget=180000ms)
  archetype — 1 total regression(s): L26
    run: stratified-39 — L26 (budget=180000ms)

── TIMING IMPACT (aggregate across all runs) ───────────────────────
  Technique                      Δ total    Worst slowdowns
  ────────────────────────────────────────────────────────────────────────
  structural-modern              +40s       L11:1384.7× (stratified-39)  L79:57.5× (stratified-39)  L80:7.8× (stratified-39)
  endurance-longpath             +13s       
  must-cross-horizon             +12s       
  template                       +10s       
  archetype                      +3s        L34:2.6× (stratified-39)  L74:2.0× (stratified-39)  L92:1.8× (stratified-39)
  portal-optional-endurance      -2s        
  portal-optional-perimeter      -3s        
  portal-optional-modern         -6s        
  structural-conservative        -10s       

── LEVEL COVERAGE MAP ──────────────────────────────────────────────
Which runs tested each level, and what the baseline result was.

  Level    stratified-3  new-levels-8 
  ────────────────────────────────────
  L1      ✓ structural-m (---)         
  L2      ✓ structural-m (---)         
  L3      ✓ structural-m (---)         
  L4      ✓ structural-m (---)         
  L5      ✓ structural-m (---)         
  L6      ✓ structural-m (---)         
  L7      ✓ template-bes (---)         
  L9      ✓ structural-m (---)         
  L10     ✓ structural-m (---)         
  L11     ✓ structural-m (---)         
  L12     ✓ structural-m (---)         
  L13     ✓ structural-m (---)         
  L14     ✓ structural-m (---)         
  L17     ✓ structural-m (---)         
  L19     ✓ structural-m (---)         
  L20     ✓ structural-m (---)         
  L26     ✓ template-per (---)         
  L30     ✓ archetype-sp (---)         
  L34     ✓ template-per (---)         
  L47     ✓ template-per (---)         
  L50     ✓ template-per (---)         
  L56     ✓ structural-m (---)         
  L60     ✓ structural-m (---)         
  L61     ✓ structural-m (---)         
  L65     ✓ structural-m (---)         
  L73     ✓ template-per (---)         
  L74     ✓ structural-m (---)         
  L79     ✓ structural-m (---)         
  L80     ✓ structural-m (---)         
  L83     ✓ archetype-sp (---)         
  L92     ✓ archetype-hi (---)         
  L108    ✓ archetype-sp (---)         
  L130    ✓ structural-m (---)         
  L134    ✓ archetype-po (---)         
  L135    ✓ template-cor (---)         
  L136    ✓ structural-m (---)         
  L138    ✓ archetype-hi (---)         
  L139    ✓ archetype-hi (---)         
  L140    ✓ structural-m (---)         
  L141    (---)          (no-base)     
  L142    (---)          (no-base)     
  L143    (---)          (no-base)     
  L144    (---)          (no-base)     
  L145    (---)          (no-base)     
  L146    (---)          (no-base)     
  L147    (---)          (no-base)     
  L148    (---)          (no-base)     

── SUMMARY VERDICT ─────────────────────────────────────────────────
SITUATIONAL   (1–2 regressions): template, archetype
REDUNDANT     (0 regressions):   endurance-longpath, must-cross-horizon, portal-optional-endurance, portal-optional-modern, portal-optional-perimeter, structural-conservative, structural-modern

Combined sample: 47 unique levels across 2 runs.
Caution: a REDUNDANT verdict is only as strong as sample coverage.
REDUNDANT techniques tested on ≤10 levels should be retested on a larger set.

