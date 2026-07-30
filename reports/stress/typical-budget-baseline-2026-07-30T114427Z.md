# Typical-budget baseline — 2026-07-30T114427Z

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
  "speedups": 28,
  "nodeDrift": 0,
  "strategyChanges": 0,
  "onlyInBaseline": 0,
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

Wrote reports/stress/typical-budget-diff-corpus1-2026-07-30T114427Z.json

8 hard regression(s) found.
```
## corpus2
```
Baseline diff: reports/stress/benchmark-latest-random.json -> reports/stress/typical-budget-corpus2.json
{
  "baseline": "reports/stress/benchmark-latest-random.json",
  "candidate": "reports/stress/typical-budget-corpus2.json",
  "compared": 1700,
  "hardRegressions": 35,
  "improvements": 35,
  "slowdowns": 4,
  "speedups": 47,
  "nodeDrift": 9,
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
  R00156: now success in 2413ms via ?
  R00296: now success in 7151ms via ?
  R00314: now success in 3213ms via ?
  R00460: now success in 3639ms via ?
  R00934: now success in 4768ms via ?
  R00988: now success in 4708ms via ?
  R01778: now success in 13928ms via ?
  R01856: now success in 6008ms via ?
  R02044: now success in 2499ms via ?
  R02050: now success in 10751ms via ?
  R02052: now success in 3803ms via ?
  R02076: now success in 17528ms via ?
  R02214: now success in 1453ms via ?
  R02290: now success in 2206ms via ?
  R02344: now success in 31881ms via ?
  R02374: now success in 16035ms via ?
  R02414: now success in 1516ms via ?
  R02423: now success in 3783ms via ?
  R02436: now success in 2263ms via ?
  R02606: now success in 3766ms via ?
  R02672: now success in 2945ms via ?
  R02783: now success in 3974ms via ?
  R02900: now success in 35158ms via ?
  R02947: now success in 1331ms via ?
  R02971: now success in 2759ms via ?
  R03017: now success in 3002ms via ?
  R03031: now success in 31398ms via ?
  R03034: now success in 3167ms via ?
  R03058: now success in 2893ms via ?
  R03062: now success in 986ms via ?
  R03074: now success in 5157ms via ?
  R03095: now success in 2599ms via ?
  R03188: now success in 1684ms via ?
  R03299: now success in 22563ms via ?
  R03358: now success in 2241ms via ?

SLOWDOWNS (>=3x, timing-trustworthy sources only):
  R00970: 86ms -> 297ms (3.45x)
  R02521: 4406ms -> 18863ms (4.28x)
  R03085: 891ms -> 3535ms (3.97x)
  R03349: 4395ms -> 14145ms (3.22x)

NODE-COUNT DRIFT (>=3x either direction):
  R00701: 8576448 -> 76431 nodes (0.01x)
  R01925: 4421114 -> 19586825 nodes (4.43x)
  R02020: 9270228 -> 770163 nodes (0.08x)
  R02147: 333677 -> 5004980 nodes (15x)
  R02262: 6285751 -> 1785751 nodes (0.28x)
  R02265: 8525904 -> 25872 nodes (0x)
  R02521: 934545 -> 8445370 nodes (9.04x)
  R03349: 2164417 -> 12164431 nodes (5.62x)
  R03350: 9641631 -> 1141601 nodes (0.12x)

Wrote reports/stress/typical-budget-diff-corpus2-2026-07-30T114427Z.json

35 hard regression(s) found.
```
