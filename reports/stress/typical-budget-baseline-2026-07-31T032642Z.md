# Typical-budget baseline — 2026-07-31T032642Z

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
  "slowdowns": 0,
  "speedups": 29,
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

NODE-COUNT DRIFT (>=3x either direction):
  R00432: 280512 -> 4988176 nodes (17.78x)
  R01271: 36797839 -> 10230188 nodes (0.28x)

Wrote reports/stress/typical-budget-diff-corpus1-2026-07-31T032642Z.json

9 hard regression(s) found.
```
## corpus2
```
Baseline diff: reports/stress/benchmark-latest-random.json -> reports/stress/typical-budget-corpus2.json
{
  "baseline": "reports/stress/benchmark-latest-random.json",
  "candidate": "reports/stress/typical-budget-corpus2.json",
  "compared": 1700,
  "hardRegressions": 43,
  "improvements": 71,
  "slowdowns": 4,
  "speedups": 52,
  "nodeDrift": 14,
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
  R01229: success(valid=true) -> node-budget-reached(valid=null)
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
  R02424: success(valid=true) -> node-budget-reached(valid=null)
  R02452: success(valid=true) -> node-budget-reached(valid=null)
  R02481: success(valid=true) -> node-budget-reached(valid=null)
  R02491: success(valid=true) -> node-budget-reached(valid=null)
  R02511: success(valid=true) -> node-budget-reached(valid=null)
  R02513: success(valid=true) -> node-budget-reached(valid=null)
  R02516: success(valid=true) -> node-budget-reached(valid=null)
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
  R00156: now success in 3558ms via ?
  R00228: now success in 7093ms via ?
  R00296: now success in 6357ms via ?
  R00314: now success in 2963ms via ?
  R00460: now success in 3626ms via ?
  R00518: now success in 367ms via ?
  R00553: now success in 16925ms via ?
  R00630: now success in 7304ms via ?
  R00934: now success in 4636ms via ?
  R00988: now success in 4629ms via ?
  R01157: now success in 474ms via ?
  R01218: now success in 1668ms via ?
  R01511: now success in 6216ms via ?
  R01558: now success in 390ms via ?
  R01678: now success in 2485ms via ?
  R01778: now success in 14919ms via ?
  R01800: now success in 8614ms via ?
  R01856: now success in 6062ms via ?
  R02044: now success in 3338ms via ?
  R02050: now success in 10610ms via ?
  R02052: now success in 4597ms via ?
  R02076: now success in 17124ms via ?
  R02111: now success in 6897ms via ?
  R02119: now success in 5702ms via ?
  R02209: now success in 3512ms via ?
  R02214: now success in 1417ms via ?
  R02290: now success in 1709ms via ?
  R02344: now success in 19940ms via ?
  R02361: now success in 7026ms via ?
  R02364: now success in 6582ms via ?
  R02371: now success in 10236ms via ?
  R02374: now success in 16043ms via ?
  R02414: now success in 745ms via ?
  R02423: now success in 4168ms via ?
  R02436: now success in 2467ms via ?
  R02450: now success in 3899ms via ?
  R02510: now success in 4199ms via ?
  R02549: now success in 3641ms via ?
  R02595: now success in 7783ms via ?
  R02606: now success in 3063ms via ?
  R02652: now success in 8202ms via ?
  R02672: now success in 2918ms via ?
  R02674: now success in 370ms via ?
  R02685: now success in 9155ms via ?
  R02760: now success in 4013ms via ?
  R02783: now success in 3879ms via ?
  R02891: now success in 9455ms via ?
  R02898: now success in 4098ms via ?
  R02900: now success in 36383ms via ?
  R02921: now success in 364ms via ?
  R02947: now success in 1072ms via ?
  R02971: now success in 2863ms via ?
  R03017: now success in 2987ms via ?
  R03023: now success in 4013ms via ?
  R03031: now success in 32184ms via ?
  R03034: now success in 3066ms via ?
  R03058: now success in 2713ms via ?
  R03062: now success in 935ms via ?
  R03074: now success in 3500ms via ?
  R03081: now success in 5842ms via ?
  R03091: now success in 3022ms via ?
  R03095: now success in 2365ms via ?
  R03149: now success in 5505ms via ?
  R03162: now success in 7063ms via ?
  R03188: now success in 2661ms via ?
  R03250: now success in 4766ms via ?
  R03299: now success in 22472ms via ?
  R03320: now success in 1233ms via ?
  R03345: now success in 7119ms via ?
  R03358: now success in 3512ms via ?
  R03366: now success in 8683ms via ?

SLOWDOWNS (>=3x, timing-trustworthy sources only):
  R00970: 86ms -> 296ms (3.44x)
  R02521: 4406ms -> 20323ms (4.61x)
  R02546: 1894ms -> 14975ms (7.91x)
  R03349: 4395ms -> 16410ms (3.73x)

NODE-COUNT DRIFT (>=3x either direction):
  R00278: 1258910 -> 83052 nodes (0.07x)
  R00701: 8576448 -> 76431 nodes (0.01x)
  R01925: 4421114 -> 19552328 nodes (4.42x)
  R02020: 9270228 -> 770163 nodes (0.08x)
  R02147: 333677 -> 5004980 nodes (15x)
  R02262: 6285751 -> 1785751 nodes (0.28x)
  R02265: 8525904 -> 25872 nodes (0x)
  R02521: 934545 -> 8445326 nodes (9.04x)
  R02546: 309539 -> 8063867 nodes (26.05x)
  R02702: 63209 -> 302042 nodes (4.78x)
  R02939: 18102950 -> 4021095 nodes (0.22x)
  R03349: 2164417 -> 12164431 nodes (5.62x)
  R03350: 9641631 -> 1141601 nodes (0.12x)
  R03362: 435038 -> 10521 nodes (0.02x)

Wrote reports/stress/typical-budget-diff-corpus2-2026-07-31T032642Z.json

43 hard regression(s) found.
```
