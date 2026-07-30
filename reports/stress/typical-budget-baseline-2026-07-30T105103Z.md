# Typical-budget baseline — 2026-07-30T105103Z

Work budgets: corpus-1 67000000, corpus-2 26800000 (deadlines 20000ms / 8000ms, non-binding by design).
Shards: 240 at max-parallel 20. Ablation flags: ``.

## corpus1
```
Baseline diff: reports/stress/benchmark-parallel.json -> reports/stress/typical-budget-corpus1.json
{
  "baseline": "reports/stress/benchmark-parallel.json",
  "candidate": "reports/stress/typical-budget-corpus1.json",
  "compared": 102,
  "hardRegressions": 8,
  "improvements": 0,
  "slowdowns": 0,
  "speedups": 16,
  "nodeDrift": 0,
  "strategyChanges": 0,
  "onlyInBaseline": 16,
  "onlyInCandidate": 0
}

HARD REGRESSIONS (act on these):
  R00522: success(valid=true) -> node-budget-reached(valid=null)
  R00526: success(valid=true) -> node-budget-reached(valid=null)
  R00581: success(valid=true) -> node-budget-reached(valid=null)
  R00600: success(valid=true) -> node-budget-reached(valid=null)
  R01271: success(valid=true) -> node-budget-reached(valid=null)
  R01620: success(valid=true) -> node-budget-reached(valid=null)
  R01689: success(valid=true) -> node-budget-reached(valid=null)
  R01943: success(valid=true) -> node-budget-reached(valid=null)

Missing from candidate (regression-set drift): S00001, S00028, S00030, S00035, S00048, S00055, S00057, S00064, S00065, S00069, S00087, S00095, S00099, S00103, S00107, S00108

Wrote reports/stress/typical-budget-diff-corpus1-2026-07-30T105103Z.json

8 hard regression(s) found.
```
## corpus2
```
Baseline diff: reports/stress/benchmark-latest-random.json -> reports/stress/typical-budget-corpus2.json
{
  "baseline": "reports/stress/benchmark-latest-random.json",
  "candidate": "reports/stress/typical-budget-corpus2.json",
  "compared": 1700,
  "hardRegressions": 29,
  "improvements": 29,
  "slowdowns": 2,
  "speedups": 41,
  "nodeDrift": 8,
  "strategyChanges": 0,
  "onlyInBaseline": 290,
  "onlyInCandidate": 0
}

HARD REGRESSIONS (act on these):
  R01936: success(valid=true) -> node-budget-reached(valid=null)
  R02003: success(valid=true) -> node-budget-reached(valid=null)
  R02124: success(valid=true) -> node-budget-reached(valid=null)
  R02264: success(valid=true) -> node-budget-reached(valid=null)
  R02269: success(valid=true) -> node-budget-reached(valid=null)
  R02294: success(valid=true) -> node-budget-reached(valid=null)
  R02304: success(valid=true) -> node-budget-reached(valid=null)
  R02329: success(valid=true) -> node-budget-reached(valid=null)
  R02400: success(valid=true) -> node-budget-reached(valid=null)
  R02452: success(valid=true) -> node-budget-reached(valid=null)
  R02481: success(valid=true) -> node-budget-reached(valid=null)
  R02491: success(valid=true) -> node-budget-reached(valid=null)
  R02511: success(valid=true) -> node-budget-reached(valid=null)
  R02542: success(valid=true) -> node-budget-reached(valid=null)
  R02604: success(valid=true) -> node-budget-reached(valid=null)
  R02683: success(valid=true) -> node-budget-reached(valid=null)
  R02707: success(valid=true) -> node-budget-reached(valid=null)
  R02741: success(valid=true) -> node-budget-reached(valid=null)
  R02791: success(valid=true) -> node-budget-reached(valid=null)
  R02816: success(valid=true) -> node-budget-reached(valid=null)
  R02831: success(valid=true) -> node-budget-reached(valid=null)
  R02892: success(valid=true) -> node-budget-reached(valid=null)
  R02939: success(valid=true) -> node-budget-reached(valid=null)
  R02984: success(valid=true) -> node-budget-reached(valid=null)
  R02992: success(valid=true) -> node-budget-reached(valid=null)
  R03015: success(valid=true) -> node-budget-reached(valid=null)
  R03205: success(valid=true) -> node-budget-reached(valid=null)
  R03211: success(valid=true) -> node-budget-reached(valid=null)
  R03234: success(valid=true) -> node-budget-reached(valid=null)

IMPROVEMENTS:
  R01778: now success in 15832ms via ?
  R02044: now success in 3567ms via ?
  R02050: now success in 10751ms via ?
  R02052: now success in 3750ms via ?
  R02076: now success in 17104ms via ?
  R02214: now success in 1393ms via ?
  R02290: now success in 2117ms via ?
  R02344: now success in 32125ms via ?
  R02374: now success in 16036ms via ?
  R02414: now success in 1501ms via ?
  R02423: now success in 4073ms via ?
  R02436: now success in 2680ms via ?
  R02606: now success in 2734ms via ?
  R02672: now success in 3116ms via ?
  R02783: now success in 2900ms via ?
  R02900: now success in 35146ms via ?
  R02947: now success in 1609ms via ?
  R02971: now success in 2965ms via ?
  R03017: now success in 3001ms via ?
  R03031: now success in 29191ms via ?
  R03034: now success in 2969ms via ?
  R03058: now success in 3543ms via ?
  R03062: now success in 957ms via ?
  R03074: now success in 4852ms via ?
  R03095: now success in 2239ms via ?
  R03162: now success in 6469ms via ?
  R03188: now success in 2736ms via ?
  R03299: now success in 13408ms via ?
  R03358: now success in 3748ms via ?

SLOWDOWNS (>=3x, timing-trustworthy sources only):
  R02521: 4406ms -> 16990ms (3.86x)
  R03349: 4395ms -> 15725ms (3.58x)

NODE-COUNT DRIFT (>=3x either direction):
  R01925: 4421114 -> 19586825 nodes (4.43x)
  R02020: 9270228 -> 770163 nodes (0.08x)
  R02147: 333677 -> 5004980 nodes (15x)
  R02262: 6285751 -> 1785751 nodes (0.28x)
  R02265: 8525904 -> 25872 nodes (0x)
  R02521: 934545 -> 8445370 nodes (9.04x)
  R03349: 2164417 -> 12164431 nodes (5.62x)
  R03350: 9641631 -> 1141601 nodes (0.12x)

Missing from candidate (regression-set drift): R00001, R00039, R00044, R00046, R00050, R00059, R00073, R00080, R00082, R00088, R00093, R00094, R00108, R00112, R00118, R00137, R00139, R00142, R00143, R00153, R00156, R00169, R00180, R00181, R00193, R00209, R00228, R00234, R00238, R00239, R00242, R00260, R00274, R00278, R00285, R00296, R00303, R00306, R00312, R00314, R00320, R00323, R00329, R00340, R00342, R00347, R00349, R00350, R00355, R00358, R00367, R00370, R00372, R00373, R00386, R00399, R00417, R00433, R00434, R00440, R00449, R00460, R00466, R00468, R00477, R00479, R00481, R00488, R00500, R00506, R00507, R00512, R00513, R00518, R00527, R00528, R00532, R00536, R00537, R00544, R00546, R00548, R00553, R00555, R00556, R00561, R00563, R00565, R00573, R00592, R00593, R00595, R00597, R00602, R00623, R00630, R00632, R00635, R00639, R00646, R00647, R00648, R00656, R00672, R00682, R00690, R00691, R00692, R00701, R00702, R00703, R00707, R00709, R00712, R00720, R00726, R00727, R00728, R00732, R00741, R00756, R00762, R00765, R00786, R00787, R00803, R00813, R00815, R00817, R00850, R00851, R00852, R00860, R00866, R00867, R00869, R00877, R00886, R00893, R00901, R00911, R00912, R00923, R00927, R00930, R00934, R00943, R00960, R00963, R00970, R00975, R00976, R00977, R00986, R00988, R00989, R00990, R01000, R01006, R01009, R01011, R01012, R01016, R01019, R01020, R01022, R01023, R01024, R01044, R01052, R01058, R01061, R01063, R01080, R01085, R01086, R01091, R01092, R01097, R01099, R01105, R01118, R01124, R01129, R01132, R01134, R01142, R01151, R01153, R01154, R01155, R01157, R01158, R01172, R01174, R01179, R01190, R01208, R01210, R01211, R01215, R01218, R01229, R01234, R01251, R01254, R01262, R01269, R01273, R01274, R01280, R01290, R01316, R01318, R01325, R01333, R01341, R01342, R01344, R01397, R01403, R01416, R01417, R01420, R01425, R01426, R01428, R01461, R01462, R01465, R01467, R01477, R01485, R01487, R01489, R01492, R01495, R01500, R01501, R01504, R01511, R01516, R01523, R01531, R01535, R01551, R01553, R01554, R01558, R01568, R01571, R01576, R01577, R01584, R01590, R01600, R01603, R01609, R01613, R01614, R01625, R01632, R01633, R01642, R01644, R01652, R01655, R01672, R01673, R01719, R01723, R01724, R01725, R01730, R01735, R01738, R01744, R01761, R01763, R01764, R01765, R01766, R01767, R01849, R01854, R01856, R01857, R01860, R01865, R01870

Wrote reports/stress/typical-budget-diff-corpus2-2026-07-30T105103Z.json

29 hard regression(s) found.
```
