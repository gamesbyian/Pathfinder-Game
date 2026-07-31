# Typical-budget baseline — 2026-07-31T122256Z

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
  "speedups": 33,
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
  R01943: success(valid=true) -> node-budget-reached(valid=null)

NODE-COUNT DRIFT (>=3x either direction):
  R01271: 36797839 -> 10230188 nodes (0.28x)
  R01689: 33804242 -> 4430316 nodes (0.13x)

Wrote reports/stress/typical-budget-diff-corpus1-2026-07-31T122256Z.json

8 hard regression(s) found.
```
## corpus2
```
Baseline diff: reports/stress/benchmark-latest-random.json -> reports/stress/typical-budget-corpus2.json
{
  "baseline": "reports/stress/benchmark-latest-random.json",
  "candidate": "reports/stress/typical-budget-corpus2.json",
  "compared": 1700,
  "hardRegressions": 44,
  "improvements": 115,
  "slowdowns": 5,
  "speedups": 60,
  "nodeDrift": 19,
  "strategyChanges": 0,
  "onlyInBaseline": 0,
  "onlyInCandidate": 0
}

HARD REGRESSIONS (act on these):
  R00001: success(valid=true) -> node-budget-reached(valid=null)
  R00548: success(valid=true) -> node-budget-reached(valid=null)
  R00592: success(valid=true) -> node-budget-reached(valid=null)
  R00632: success(valid=true) -> node-budget-reached(valid=null)
  R00877: success(valid=true) -> node-budget-reached(valid=null)
  R00960: success(valid=true) -> node-budget-reached(valid=null)
  R01229: success(valid=true) -> node-budget-reached(valid=null)
  R01325: success(valid=true) -> node-budget-reached(valid=null)
  R01609: success(valid=true) -> node-budget-reached(valid=null)
  R01925: success(valid=true) -> node-budget-reached(valid=null)
  R01936: success(valid=true) -> node-budget-reached(valid=null)
  R02003: success(valid=true) -> node-budget-reached(valid=null)
  R02010: success(valid=true) -> node-budget-reached(valid=null)
  R02114: success(valid=true) -> node-budget-reached(valid=null)
  R02124: success(valid=true) -> node-budget-reached(valid=null)
  R02193: success(valid=true) -> node-budget-reached(valid=null)
  R02248: success(valid=true) -> node-budget-reached(valid=null)
  R02264: success(valid=true) -> node-budget-reached(valid=null)
  R02269: success(valid=true) -> node-budget-reached(valid=null)
  R02304: success(valid=true) -> node-budget-reached(valid=null)
  R02329: success(valid=true) -> node-budget-reached(valid=null)
  R02413: success(valid=true) -> node-budget-reached(valid=null)
  R02424: success(valid=true) -> node-budget-reached(valid=null)
  R02452: success(valid=true) -> node-budget-reached(valid=null)
  R02491: success(valid=true) -> node-budget-reached(valid=null)
  R02513: success(valid=true) -> node-budget-reached(valid=null)
  R02516: success(valid=true) -> node-budget-reached(valid=null)
  R02604: success(valid=true) -> node-budget-reached(valid=null)
  R02611: success(valid=true) -> node-budget-reached(valid=null)
  R02683: success(valid=true) -> node-budget-reached(valid=null)
  R02707: success(valid=true) -> node-budget-reached(valid=null)
  R02741: success(valid=true) -> node-budget-reached(valid=null)
  R02816: success(valid=true) -> node-budget-reached(valid=null)
  R02885: success(valid=true) -> node-budget-reached(valid=null)
  R02892: success(valid=true) -> node-budget-reached(valid=null)
  R02931: success(valid=true) -> node-budget-reached(valid=null)
  R02962: success(valid=true) -> node-budget-reached(valid=null)
  R02984: success(valid=true) -> node-budget-reached(valid=null)
  R02992: success(valid=true) -> node-budget-reached(valid=null)
  R03015: success(valid=true) -> node-budget-reached(valid=null)
  R03205: success(valid=true) -> node-budget-reached(valid=null)
  R03211: success(valid=true) -> node-budget-reached(valid=null)
  R03234: success(valid=true) -> node-budget-reached(valid=null)
  R03352: success(valid=true) -> node-budget-reached(valid=null)

IMPROVEMENTS:
  R00156: now success in 2457ms via ?
  R00228: now success in 6738ms via ?
  R00296: now success in 6615ms via ?
  R00314: now success in 2894ms via ?
  R00460: now success in 3717ms via ?
  R00518: now success in 354ms via ?
  R00553: now success in 11770ms via ?
  R00630: now success in 7512ms via ?
  R00851: now success in 1127ms via ?
  R00934: now success in 4282ms via ?
  R00977: now success in 11315ms via ?
  R00988: now success in 4459ms via ?
  R01061: now success in 3042ms via ?
  R01157: now success in 619ms via ?
  R01218: now success in 1692ms via ?
  R01465: now success in 4772ms via ?
  R01511: now success in 6594ms via ?
  R01516: now success in 2630ms via ?
  R01558: now success in 539ms via ?
  R01678: now success in 2365ms via ?
  R01778: now success in 15192ms via ?
  R01800: now success in 8883ms via ?
  R01856: now success in 5976ms via ?
  R02044: now success in 3486ms via ?
  R02050: now success in 2935ms via ?
  R02052: now success in 3896ms via ?
  R02053: now success in 5529ms via ?
  R02076: now success in 17313ms via ?
  R02096: now success in 11157ms via ?
  R02101: now success in 751ms via ?
  R02111: now success in 8980ms via ?
  R02113: now success in 2347ms via ?
  R02119: now success in 5055ms via ?
  R02122: now success in 5752ms via ?
  R02135: now success in 5296ms via ?
  R02198: now success in 8098ms via ?
  R02200: now success in 5637ms via ?
  R02209: now success in 3233ms via ?
  R02211: now success in 7742ms via ?
  R02214: now success in 797ms via ?
  R02216: now success in 9724ms via ?
  R02290: now success in 1950ms via ?
  R02343: now success in 6500ms via ?
  R02361: now success in 7315ms via ?
  R02364: now success in 5310ms via ?
  R02370: now success in 6163ms via ?
  R02374: now success in 11662ms via ?
  R02384: now success in 10677ms via ?
  R02414: now success in 767ms via ?
  R02420: now success in 11235ms via ?
  R02423: now success in 4156ms via ?
  R02436: now success in 2666ms via ?
  R02444: now success in 9211ms via ?
  R02450: now success in 5943ms via ?
  R02468: now success in 8791ms via ?
  R02474: now success in 8944ms via ?
  R02480: now success in 3705ms via ?
  R02510: now success in 4811ms via ?
  R02517: now success in 9863ms via ?
  R02524: now success in 4471ms via ?
  R02549: now success in 3968ms via ?
  R02575: now success in 4567ms via ?
  R02582: now success in 7145ms via ?
  R02595: now success in 8081ms via ?
  R02606: now success in 1653ms via ?
  R02622: now success in 1314ms via ?
  R02631: now success in 27296ms via ?
  R02649: now success in 7254ms via ?
  R02652: now success in 2779ms via ?
  R02672: now success in 2435ms via ?
  R02674: now success in 353ms via ?
  R02680: now success in 1782ms via ?
  R02685: now success in 9479ms via ?
  R02698: now success in 1425ms via ?
  R02711: now success in 1760ms via ?
  R02760: now success in 3239ms via ?
  R02783: now success in 4690ms via ?
  R02812: now success in 2740ms via ?
  R02846: now success in 4721ms via ?
  R02891: now success in 6146ms via ?
  R02898: now success in 3843ms via ?
  R02900: now success in 35678ms via ?
  R02921: now success in 359ms via ?
  R02922: now success in 1641ms via ?
  R02943: now success in 3393ms via ?
  R02947: now success in 1067ms via ?
  R02971: now success in 2817ms via ?
  R03017: now success in 2129ms via ?
  R03018: now success in 7183ms via ?
  R03023: now success in 4700ms via ?
  R03031: now success in 32284ms via ?
  R03034: now success in 3215ms via ?
  R03058: now success in 2263ms via ?
  R03062: now success in 968ms via ?
  R03074: now success in 5128ms via ?
  R03081: now success in 6984ms via ?
  R03087: now success in 6856ms via ?
  R03090: now success in 615ms via ?
  R03091: now success in 2815ms via ?
  R03095: now success in 3034ms via ?
  R03149: now success in 7376ms via ?
  R03162: now success in 4546ms via ?
  R03185: now success in 5724ms via ?
  R03188: now success in 2360ms via ?
  R03225: now success in 4963ms via ?
  R03236: now success in 2142ms via ?
  R03250: now success in 4976ms via ?
  R03260: now success in 18808ms via ?
  R03320: now success in 1667ms via ?
  R03326: now success in 7718ms via ?
  R03333: now success in 7488ms via ?
  R03339: now success in 8248ms via ?
  R03345: now success in 7661ms via ?
  R03358: now success in 3196ms via ?
  R03366: now success in 8772ms via ?

SLOWDOWNS (>=3x, timing-trustworthy sources only):
  R00911: 1127ms -> 12718ms (11.28x)
  R00970: 86ms -> 311ms (3.62x)
  R02521: 4406ms -> 17058ms (3.87x)
  R02546: 1894ms -> 15071ms (7.96x)
  R03349: 4395ms -> 14396ms (3.28x)

NODE-COUNT DRIFT (>=3x either direction):
  R00278: 1258910 -> 83052 nodes (0.07x)
  R00701: 8576448 -> 69568 nodes (0.01x)
  R00911: 126743 -> 18811600 nodes (148.42x)
  R02020: 9270228 -> 755280 nodes (0.08x)
  R02067: 188676 -> 724320 nodes (3.84x)
  R02262: 6285751 -> 1785751 nodes (0.28x)
  R02265: 8525904 -> 25724 nodes (0x)
  R02400: 6534317 -> 320309 nodes (0.05x)
  R02402: 242443 -> 69091 nodes (0.28x)
  R02521: 934545 -> 8445326 nodes (9.04x)
  R02546: 309539 -> 8063867 nodes (26.05x)
  R02639: 801681 -> 32473 nodes (0.04x)
  R02702: 63209 -> 302042 nodes (4.78x)
  R02939: 18102950 -> 4021095 nodes (0.22x)
  R02981: 238097 -> 72258 nodes (0.3x)
  R03219: 63598 -> 18089 nodes (0.28x)
  R03349: 2164417 -> 12132168 nodes (5.61x)
  R03350: 9641631 -> 1136325 nodes (0.12x)
  R03362: 435038 -> 10521 nodes (0.02x)

Wrote reports/stress/typical-budget-diff-corpus2-2026-07-31T122256Z.json

44 hard regression(s) found.
```
