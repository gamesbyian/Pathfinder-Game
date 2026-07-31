# Typical-budget baseline — 2026-07-31T051833Z

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

Wrote reports/stress/typical-budget-diff-corpus1-2026-07-31T051833Z.json

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
  "improvements": 116,
  "slowdowns": 6,
  "speedups": 53,
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
  R00156: now success in 3482ms via ?
  R00228: now success in 6391ms via ?
  R00296: now success in 6692ms via ?
  R00314: now success in 2917ms via ?
  R00460: now success in 3760ms via ?
  R00518: now success in 427ms via ?
  R00553: now success in 16790ms via ?
  R00630: now success in 7161ms via ?
  R00851: now success in 1163ms via ?
  R00934: now success in 3157ms via ?
  R00977: now success in 11044ms via ?
  R00988: now success in 4675ms via ?
  R01061: now success in 5423ms via ?
  R01157: now success in 887ms via ?
  R01218: now success in 1805ms via ?
  R01465: now success in 3290ms via ?
  R01511: now success in 7522ms via ?
  R01516: now success in 2845ms via ?
  R01535: now success in 10320ms via ?
  R01558: now success in 359ms via ?
  R01678: now success in 3259ms via ?
  R01778: now success in 15599ms via ?
  R01800: now success in 8723ms via ?
  R01856: now success in 5878ms via ?
  R02044: now success in 3809ms via ?
  R02050: now success in 2740ms via ?
  R02052: now success in 3659ms via ?
  R02053: now success in 5538ms via ?
  R02076: now success in 17699ms via ?
  R02096: now success in 9694ms via ?
  R02101: now success in 743ms via ?
  R02111: now success in 9655ms via ?
  R02113: now success in 2413ms via ?
  R02119: now success in 5864ms via ?
  R02122: now success in 6594ms via ?
  R02135: now success in 5667ms via ?
  R02200: now success in 4691ms via ?
  R02209: now success in 3375ms via ?
  R02214: now success in 859ms via ?
  R02216: now success in 9595ms via ?
  R02290: now success in 2208ms via ?
  R02343: now success in 13068ms via ?
  R02361: now success in 7221ms via ?
  R02364: now success in 5728ms via ?
  R02370: now success in 6647ms via ?
  R02371: now success in 10313ms via ?
  R02374: now success in 16046ms via ?
  R02384: now success in 7036ms via ?
  R02414: now success in 736ms via ?
  R02420: now success in 17614ms via ?
  R02423: now success in 4405ms via ?
  R02436: now success in 2163ms via ?
  R02444: now success in 8045ms via ?
  R02450: now success in 6071ms via ?
  R02468: now success in 8078ms via ?
  R02474: now success in 16770ms via ?
  R02480: now success in 4763ms via ?
  R02510: now success in 4330ms via ?
  R02517: now success in 5822ms via ?
  R02524: now success in 4000ms via ?
  R02549: now success in 3871ms via ?
  R02575: now success in 4966ms via ?
  R02582: now success in 4290ms via ?
  R02595: now success in 7966ms via ?
  R02606: now success in 4013ms via ?
  R02622: now success in 1376ms via ?
  R02631: now success in 30291ms via ?
  R02649: now success in 10263ms via ?
  R02652: now success in 3524ms via ?
  R02672: now success in 2366ms via ?
  R02674: now success in 399ms via ?
  R02680: now success in 1851ms via ?
  R02685: now success in 9371ms via ?
  R02698: now success in 1727ms via ?
  R02711: now success in 1467ms via ?
  R02760: now success in 3106ms via ?
  R02783: now success in 3500ms via ?
  R02812: now success in 3926ms via ?
  R02837: now success in 20194ms via ?
  R02846: now success in 6076ms via ?
  R02891: now success in 8217ms via ?
  R02898: now success in 3910ms via ?
  R02900: now success in 36399ms via ?
  R02921: now success in 376ms via ?
  R02922: now success in 1758ms via ?
  R02943: now success in 4615ms via ?
  R02947: now success in 1069ms via ?
  R02971: now success in 3022ms via ?
  R03017: now success in 2515ms via ?
  R03018: now success in 7582ms via ?
  R03023: now success in 4976ms via ?
  R03031: now success in 31528ms via ?
  R03034: now success in 3321ms via ?
  R03058: now success in 2431ms via ?
  R03062: now success in 1016ms via ?
  R03074: now success in 5108ms via ?
  R03081: now success in 6619ms via ?
  R03087: now success in 6773ms via ?
  R03090: now success in 676ms via ?
  R03091: now success in 3150ms via ?
  R03095: now success in 1622ms via ?
  R03149: now success in 5238ms via ?
  R03162: now success in 9604ms via ?
  R03185: now success in 5167ms via ?
  R03188: now success in 2156ms via ?
  R03225: now success in 4831ms via ?
  R03236: now success in 3754ms via ?
  R03250: now success in 4847ms via ?
  R03260: now success in 20045ms via ?
  R03320: now success in 1567ms via ?
  R03326: now success in 7038ms via ?
  R03333: now success in 7480ms via ?
  R03339: now success in 8820ms via ?
  R03345: now success in 7521ms via ?
  R03358: now success in 3464ms via ?
  R03366: now success in 9282ms via ?

SLOWDOWNS (>=3x, timing-trustworthy sources only):
  R00911: 1127ms -> 12894ms (11.44x)
  R00970: 86ms -> 307ms (3.57x)
  R02521: 4406ms -> 15556ms (3.53x)
  R02546: 1894ms -> 15294ms (8.07x)
  R02917: 49ms -> 149ms (3.04x)
  R03349: 4395ms -> 14611ms (3.32x)

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

Wrote reports/stress/typical-budget-diff-corpus2-2026-07-31T051833Z.json

44 hard regression(s) found.
```
