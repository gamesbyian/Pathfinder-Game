
════════════════════════════════════════════════════════════════════════
Combined Ablation Analysis (3 runs)
════════════════════════════════════════════════════════════════════════
Generated: 2026-05-29T08:25:45.574Z
Runs:
  stratified-39                        39 levels  budget=180000ms  baseline: 39/39 solved
  new-levels-8                         8 levels  budget=180000ms  (no baseline)
  full-140-disable-one                 140 levels  budget=180000ms  baseline: 140/140 solved
Union of all tested levels: 148 levels
  L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12, L13, L14, L15, L16, L17, L18, L19, L20, … (128 more)

── PER-RUN BASELINE SUMMARY ────────────────────────────────────────
  stratified-39: 39/39 solved in 330.0s
    structural-modern                                    ×25
    template-perimeter-cw                                ×5
    archetype-sparse-near-closure-nearClosureRescue      ×3
    archetype-high-intersection-burden-intersectionHarvest ×3
    template-best-focus:corner-harvest                   ×1
  full-140-disable-one: 140/140 solved in 474.4s
    template-corner-harvest                              ×76
    template-perimeter-cw                                ×38
    template-side-commitment                             ×16
    archetype-sparse-near-closure-nearClosureRescue      ×3
    archetype-high-intersection-burden-intersectionHarvest ×3

── COMBINED TECHNIQUE-VERDICT TABLE ────────────────────────────────
Verdict across all 3 run(s) and 148 unique level(s).
REDUNDANT = 0 regressions across all runs.  SITUATIONAL = 1-2.  INDISPENSABLE = 3+.

  Technique                      Combined      Regressions    stratified-39   new-levels-8    full-140-disab 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  template                       INDISPENSABLE L7,L135        SITUATIONAL(2)   REDUNDANT       SITUATIONAL(1)  
  archetype                      SITUATIONAL   L26,L92        SITUATIONAL(1)   REDUNDANT       SITUATIONAL(1)  
  endurance-longpath             REDUNDANT     none           REDUNDANT       REDUNDANT       (not run)      
  must-cross-horizon             REDUNDANT     none           REDUNDANT       REDUNDANT       (not run)      
  portal-optional-endurance      REDUNDANT     none           REDUNDANT       REDUNDANT       (not run)      
  portal-optional-modern         REDUNDANT     none           REDUNDANT       REDUNDANT       (not run)      
  portal-optional-perimeter      REDUNDANT     none           REDUNDANT       REDUNDANT       (not run)      
  structural-conservative        REDUNDANT     none           REDUNDANT       REDUNDANT       (not run)      
  structural-modern              REDUNDANT     none           REDUNDANT       REDUNDANT       REDUNDANT      

── REGRESSION DETAIL ───────────────────────────────────────────────
  template — 3 total regression(s): L7, L135
    run: stratified-39 — L7, L135 (budget=180000ms)
    run: full-140-disable-one — L135 (budget=180000ms)
  archetype — 2 total regression(s): L26, L92
    run: stratified-39 — L26 (budget=180000ms)
    run: full-140-disable-one — L92 (budget=180000ms)

── TIMING IMPACT (aggregate across all runs) ───────────────────────
  Technique                      Δ total    Worst slowdowns
  ────────────────────────────────────────────────────────────────────────
  archetype                      +290s      L138:7.8× (full-140-disable-one)  L135:4.6× (full-140-disable-one)  L34:2.6× (stratified-39)
  structural-modern              +257s      L11:1384.7× (stratified-39)  L79:57.5× (stratified-39)  L80:7.8× (stratified-39)
  template                       +217s      L80:1.6× (full-140-disable-one)  L140:1.6× (full-140-disable-one)  L92:1.5× (full-140-disable-one)
  endurance-longpath             +13s       
  must-cross-horizon             +12s       
  portal-optional-endurance      -2s        
  portal-optional-perimeter      -3s        
  portal-optional-modern         -6s        
  structural-conservative        -10s       

── LEVEL COVERAGE MAP ──────────────────────────────────────────────
Which runs tested each level, and what the baseline result was.

  Level    stratified-3  new-levels-8  full-140-dis 
  ──────────────────────────────────────────────────
  L1      ✓ structural-m (---)          ✓ template-cor
  L2      ✓ structural-m (---)          ✓ template-cor
  L3      ✓ structural-m (---)          ✓ template-per
  L4      ✓ structural-m (---)          ✓ template-cor
  L5      ✓ structural-m (---)          ✓ template-per
  L6      ✓ structural-m (---)          ✓ template-per
  L7      ✓ template-bes (---)          ✓ template-bes
  L8      (---)          (---)          ✓ template-sid
  L9      ✓ structural-m (---)          ✓ template-cor
  L10     ✓ structural-m (---)          ✓ template-cor
  L11     ✓ structural-m (---)          ✓ template-cor
  L12     ✓ structural-m (---)          ✓ template-sid
  L13     ✓ structural-m (---)          ✓ template-per
  L14     ✓ structural-m (---)          ✓ template-cor
  L15     (---)          (---)          ✓ template-sid
  L16     (---)          (---)          ✓ template-sid
  L17     ✓ structural-m (---)          ✓ template-cor
  L18     (---)          (---)          ✓ template-cor
  L19     ✓ structural-m (---)          ✓ template-cor
  L20     ✓ structural-m (---)          ✓ template-cor
  L21     (---)          (---)          ✓ template-cor
  L22     (---)          (---)          ✓ template-cor
  L23     (---)          (---)          ✓ template-cor
  L24     (---)          (---)          ✓ template-cor
  L25     (---)          (---)          ✓ template-cor
  L26     ✓ template-per (---)          ✓ template-per
  L27     (---)          (---)          ✓ template-cor
  L28     (---)          (---)          ✓ template-cor
  L29     (---)          (---)          ✓ template-cor
  L30     ✓ archetype-sp (---)          ✓ archetype-sp
  L31     (---)          (---)          ✓ template-cor
  L32     (---)          (---)          ✓ template-cor
  L33     (---)          (---)          ✓ template-cor
  L34     ✓ template-per (---)          ✓ template-per
  L35     (---)          (---)          ✓ template-per
  L36     (---)          (---)          ✓ template-cor
  L37     (---)          (---)          ✓ template-cor
  L38     (---)          (---)          ✓ template-cor
  L39     (---)          (---)          ✓ template-sid
  L40     (---)          (---)          ✓ template-cor
  L41     (---)          (---)          ✓ template-sid
  L42     (---)          (---)          ✓ template-cor
  L43     (---)          (---)          ✓ template-per
  L44     (---)          (---)          ✓ template-cor
  L45     (---)          (---)          ✓ template-cor
  L46     (---)          (---)          ✓ template-cor
  L47     ✓ template-per (---)          ✓ template-per
  L48     (---)          (---)          ✓ template-cor
  L49     (---)          (---)          ✓ template-sid
  L50     ✓ template-per (---)          ✓ template-per
  L51     (---)          (---)          ✓ template-per
  L52     (---)          (---)          ✓ template-per
  L53     (---)          (---)          ✓ template-per
  L54     (---)          (---)          ✓ template-sid
  L55     (---)          (---)          ✓ template-sid
  L56     ✓ structural-m (---)          ✓ template-per
  L57     (---)          (---)          ✓ template-per
  L58     (---)          (---)          ✓ template-per
  L59     (---)          (---)          ✓ template-cor
  L60     ✓ structural-m (---)          ✓ template-per
  L61     ✓ structural-m (---)          ✓ template-per
  L62     (---)          (---)          ✓ template-cor
  L63     (---)          (---)          ✓ template-cor
  L64     (---)          (---)          ✓ template-sid
  L65     ✓ structural-m (---)          ✓ template-per
  L66     (---)          (---)          ✓ template-per
  L67     (---)          (---)          ✓ template-per
  L68     (---)          (---)          ✓ template-per
  L69     (---)          (---)          ✓ template-cor
  L70     (---)          (---)          ✓ template-cor
  L71     (---)          (---)          ✓ template-per
  L72     (---)          (---)          ✓ template-per
  L73     ✓ template-per (---)          ✓ template-per
  L74     ✓ structural-m (---)          ✓ template-per
  L75     (---)          (---)          ✓ template-per
  L76     (---)          (---)          ✓ template-per
  L77     (---)          (---)          ✓ template-cor
  L78     (---)          (---)          ✓ template-cor
  L79     ✓ structural-m (---)          ✓ template-per
  L80     ✓ structural-m (---)          ✓ template-per
  L81     (---)          (---)          ✓ template-cor
  L82     (---)          (---)          ✓ template-cor
  L83     ✓ archetype-sp (---)          ✓ archetype-sp
  L84     (---)          (---)          ✓ template-cor
  L85     (---)          (---)          ✓ template-cor
  L86     (---)          (---)          ✓ template-cor
  L87     (---)          (---)          ✓ template-sid
  L88     (---)          (---)          ✓ template-sid
  L89     (---)          (---)          ✓ template-cor
  L90     (---)          (---)          ✓ template-cor
  L91     (---)          (---)          ✓ template-cor
  L92     ✓ archetype-hi (---)          ✓ archetype-hi
  L93     (---)          (---)          ✓ template-cor
  L94     (---)          (---)          ✓ template-cor
  L95     (---)          (---)          ✓ template-cor
  L96     (---)          (---)          ✓ template-cor
  L97     (---)          (---)          ✓ template-cor
  L98     (---)          (---)          ✓ template-sid
  L99     (---)          (---)          ✓ template-cor
  L100    (---)          (---)          ✓ template-cor
  L101    (---)          (---)          ✓ template-cor
  L102    (---)          (---)          ✓ template-cor
  L103    (---)          (---)          ✓ template-per
  L104    (---)          (---)          ✓ template-per
  L105    (---)          (---)          ✓ template-per
  L106    (---)          (---)          ✓ template-cor
  L107    (---)          (---)          ✓ template-cor
  L108    ✓ archetype-sp (---)          ✓ archetype-sp
  L109    (---)          (---)          ✓ template-cor
  L110    (---)          (---)          ✓ template-cor
  L111    (---)          (---)          ✓ template-cor
  L112    (---)          (---)          ✓ template-sid
  L113    (---)          (---)          ✓ template-per
  L114    (---)          (---)          ✓ template-cor
  L115    (---)          (---)          ✓ template-cor
  L116    (---)          (---)          ✓ template-cor
  L117    (---)          (---)          ✓ template-cor
  L118    (---)          (---)          ✓ template-cor
  L119    (---)          (---)          ✓ template-per
  L120    (---)          (---)          ✓ template-cor
  L121    (---)          (---)          ✓ template-cor
  L122    (---)          (---)          ✓ template-cor
  L123    (---)          (---)          ✓ template-cor
  L124    (---)          (---)          ✓ template-cor
  L125    (---)          (---)          ✓ template-cor
  L126    (---)          (---)          ✓ template-cor
  L127    (---)          (---)          ✓ template-cor
  L128    (---)          (---)          ✓ template-sid
  L129    (---)          (---)          ✓ template-sid
  L130    ✓ structural-m (---)          ✓ template-per
  L131    (---)          (---)          ✓ template-cor
  L132    (---)          (---)          ✓ template-per
  L133    (---)          (---)          ✓ template-cor
  L134    ✓ archetype-po (---)          ✓ archetype-po
  L135    ✓ template-cor (---)          ✓ template-por
  L136    ✓ structural-m (---)          ✓ template-per
  L137    (---)          (---)          ✓ template-cor
  L138    ✓ archetype-hi (---)          ✓ archetype-hi
  L139    ✓ archetype-hi (---)          ✓ archetype-hi
  L140    ✓ structural-m (---)          ✓ template-per
  L141    (---)          (no-base)      (---)         
  L142    (---)          (no-base)      (---)         
  L143    (---)          (no-base)      (---)         
  L144    (---)          (no-base)      (---)         
  L145    (---)          (no-base)      (---)         
  L146    (---)          (no-base)      (---)         
  L147    (---)          (no-base)      (---)         
  L148    (---)          (no-base)      (---)         

── SUMMARY VERDICT ─────────────────────────────────────────────────
INDISPENSABLE (≥3 regressions):  template
SITUATIONAL   (1–2 regressions): archetype
REDUNDANT     (0 regressions):   endurance-longpath, must-cross-horizon, portal-optional-endurance, portal-optional-modern, portal-optional-perimeter, structural-conservative, structural-modern

Combined sample: 148 unique levels across 3 runs.
Caution: a REDUNDANT verdict is only as strong as sample coverage.
REDUNDANT techniques tested on ≤10 levels should be retested on a larger set.

