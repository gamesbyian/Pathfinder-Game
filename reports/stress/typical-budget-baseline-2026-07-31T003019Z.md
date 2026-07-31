# Typical-budget baseline — 2026-07-31T003019Z

Work budgets: corpus-1 67000000, corpus-2 26800000 (deadlines 20000ms / 8000ms, non-binding by design).
Shards: 240 at max-parallel 20. Ablation flags: ``.

## corpus1
```
Baseline diff: reports/stress/benchmark-parallel.json -> reports/stress/typical-budget-corpus1.json
{
  "baseline": "reports/stress/benchmark-parallel.json",
  "candidate": "reports/stress/typical-budget-corpus1.json",
  "compared": 102,
  "hardRegressions": 9,
  "improvements": 0,
  "slowdowns": 1,
  "speedups": 31,
  "nodeDrift": 2,
  "strategyChanges": 0,
  "onlyInBaseline": 0,
  "onlyInCandidate": 0
}

HARD REGRESSIONS (act on these):
  R00522: success(valid=true) -> node-budget-reached(valid=null)
  R00526: success(valid=true) -> node-budget-reached(valid=null)
  R00581: success(valid=true) -> node-budget-reached(valid=null)
  R00600: success(valid=true) -> node-budget-reached(valid=null)
  R01478: success(valid=true) -> node-budget-reached(valid=null)
  R01620: success(valid=true) -> node-budget-reached(valid=null)
  R01626: success(valid=true) -> node-budget-reached(valid=null)
  R01689: success(valid=true) -> node-budget-reached(valid=null)
  R01943: success(valid=true) -> node-budget-reached(valid=null)

SLOWDOWNS (>=3x, timing-trustworthy sources only):
  R00432: 2518ms -> 8333ms (3.31x)

NODE-COUNT DRIFT (>=3x either direction):
  R00432: 280512 -> 4988176 nodes (17.78x)
  R01271: 36797839 -> 10230188 nodes (0.28x)

Wrote reports/stress/typical-budget-diff-corpus1-2026-07-31T003019Z.json

9 hard regression(s) found.
```
## corpus2
```
Baseline diff: reports/stress/benchmark-latest-random.json -> reports/stress/typical-budget-corpus2.json
{
  "baseline": "reports/stress/benchmark-latest-random.json",
  "candidate": "reports/stress/typical-budget-corpus2.json",
  "compared": 1700,
  "hardRegressions": 40,
  "improvements": 63,
  "slowdowns": 3,
  "speedups": 45,
  "nodeDrift": 12,
  "strategyChanges": 0,
  "onlyInBaseline": 0,
  "onlyInCandidate": 0
}

HARD REGRESSIONS (act on these):
  R00001: success(valid=true) -> node-budget-reached(valid=null)
  R00548: success(valid=true) -> node-budget-reached(valid=null)
  R00632: success(valid=true) -> node-budget-reached(valid=null)
  R00648: success(valid=true) -> node-budget-reached(valid=null)
  R00877: success(valid=true) -> node-budget-reached(valid=null)
  R00960: success(valid=true) -> node-budget-reached(valid=null)
  R01609: success(valid=true) -> node-budget-reached(valid=null)
  R01936: success(valid=true) -> node-budget-reached(valid=null)
  R02003: success(valid=true) -> node-budget-reached(valid=null)
  R02010: success(valid=true) -> node-budget-reached(valid=null)
  R02124: success(valid=true) -> node-budget-reached(valid=null)
  R02264: success(valid=true) -> node-budget-reached(valid=null)
  R02269: success(valid=true) -> node-budget-reached(valid=null)
  R02294: success(valid=true) -> node-budget-reached(valid=null)
  R02304: success(valid=true) -> node-budget-reached(valid=null)
  R02329: success(valid=true) -> node-budget-reached(valid=null)
  R02400: success(valid=true) -> node-budget-reached(valid=null)
  R02413: success(valid=true) -> node-budget-reached(valid=null)
  R02452: success(valid=true) -> node-budget-reached(valid=null)
  R02481: success(valid=true) -> node-budget-reached(valid=null)
  R02491: success(valid=true) -> node-budget-reached(valid=null)
  R02511: success(valid=true) -> node-budget-reached(valid=null)
  R02513: success(valid=true) -> node-budget-reached(valid=null)
  R02542: success(valid=true) -> node-budget-reached(valid=null)
  R02604: success(valid=true) -> node-budget-reached(valid=null)
  R02683: success(valid=true) -> node-budget-reached(valid=null)
  R02707: success(valid=true) -> node-budget-reached(valid=null)
  R02741: success(valid=true) -> node-budget-reached(valid=null)
  R02791: success(valid=true) -> node-budget-reached(valid=null)
  R02816: success(valid=true) -> node-budget-reached(valid=null)
  R02831: success(valid=true) -> node-budget-reached(valid=null)
  R02885: success(valid=true) -> node-budget-reached(valid=null)
  R02892: success(valid=true) -> node-budget-reached(valid=null)
  R02962: success(valid=true) -> node-budget-reached(valid=null)
  R02984: success(valid=true) -> node-budget-reached(valid=null)
  R02992: success(valid=true) -> node-budget-reached(valid=null)
  R03015: success(valid=true) -> node-budget-reached(valid=null)
  R03205: success(valid=true) -> node-budget-reached(valid=null)
  R03211: success(valid=true) -> node-budget-reached(valid=null)
  R03234: success(valid=true) -> node-budget-reached(valid=null)

IMPROVEMENTS:
  R00156: now success in 3452ms via ?
  R00228: now success in 5381ms via ?
  R00296: now success in 6825ms via ?
  R00314: now success in 3046ms via ?
  R00460: now success in 3574ms via ?
  R00518: now success in 334ms via ?
  R00553: now success in 16912ms via ?
  R00934: now success in 4712ms via ?
  R00988: now success in 4808ms via ?
  R01157: now success in 627ms via ?
  R01218: now success in 1661ms via ?
  R01511: now success in 7963ms via ?
  R01558: now success in 392ms via ?
  R01678: now success in 2590ms via ?
  R01778: now success in 14755ms via ?
  R01800: now success in 8561ms via ?
  R01856: now success in 5652ms via ?
  R02044: now success in 3643ms via ?
  R02050: now success in 10146ms via ?
  R02052: now success in 3724ms via ?
  R02076: now success in 16294ms via ?
  R02111: now success in 9165ms via ?
  R02119: now success in 5960ms via ?
  R02209: now success in 3117ms via ?
  R02214: now success in 1528ms via ?
  R02290: now success in 2138ms via ?
  R02344: now success in 29919ms via ?
  R02364: now success in 3953ms via ?
  R02370: now success in 16248ms via ?
  R02371: now success in 10211ms via ?
  R02374: now success in 16041ms via ?
  R02414: now success in 684ms via ?
  R02423: now success in 2745ms via ?
  R02436: now success in 2218ms via ?
  R02474: now success in 17826ms via ?
  R02606: now success in 3464ms via ?
  R02652: now success in 3197ms via ?
  R02672: now success in 3002ms via ?
  R02674: now success in 384ms via ?
  R02685: now success in 8884ms via ?
  R02783: now success in 3384ms via ?
  R02891: now success in 8509ms via ?
  R02898: now success in 3736ms via ?
  R02900: now success in 37328ms via ?
  R02921: now success in 183ms via ?
  R02947: now success in 1385ms via ?
  R02971: now success in 2953ms via ?
  R03017: now success in 2490ms via ?
  R03023: now success in 5304ms via ?
  R03031: now success in 32123ms via ?
  R03034: now success in 3239ms via ?
  R03058: now success in 2564ms via ?
  R03062: now success in 1017ms via ?
  R03074: now success in 5204ms via ?
  R03091: now success in 2776ms via ?
  R03095: now success in 2434ms via ?
  R03149: now success in 6546ms via ?
  R03162: now success in 7642ms via ?
  R03188: now success in 2748ms via ?
  R03250: now success in 3434ms via ?
  R03299: now success in 21216ms via ?
  R03358: now success in 3009ms via ?
  R03366: now success in 8673ms via ?

SLOWDOWNS (>=3x, timing-trustworthy sources only):
  R00970: 86ms -> 327ms (3.8x)
  R02521: 4406ms -> 15326ms (3.48x)
  R03349: 4395ms -> 17046ms (3.88x)

NODE-COUNT DRIFT (>=3x either direction):
  R00278: 1258910 -> 83052 nodes (0.07x)
  R00701: 8576448 -> 76431 nodes (0.01x)
  R01925: 4421114 -> 19552328 nodes (4.42x)
  R02020: 9270228 -> 770163 nodes (0.08x)
  R02147: 333677 -> 5004980 nodes (15x)
  R02262: 6285751 -> 1785751 nodes (0.28x)
  R02265: 8525904 -> 25872 nodes (0x)
  R02521: 934545 -> 8445326 nodes (9.04x)
  R02702: 63209 -> 302042 nodes (4.78x)
  R02939: 18102950 -> 4021095 nodes (0.22x)
  R03349: 2164417 -> 12164431 nodes (5.62x)
  R03350: 9641631 -> 1141601 nodes (0.12x)

Wrote reports/stress/typical-budget-diff-corpus2-2026-07-31T003019Z.json

40 hard regression(s) found.
```
