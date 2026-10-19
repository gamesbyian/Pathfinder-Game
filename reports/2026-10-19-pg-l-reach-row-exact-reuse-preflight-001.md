# PG-L source-authentic reached-row equality and storage falsifier (2026-10-19)

> **Status:** concluded-positive
> **Last evidence:** 2026-10-19 — green [source-authentic run 39307715176](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39307715176), immutable artifact 12214676843; [retained machine result](stress/pg-l-reached-row-exact-replay-20261019-001.json)
> **Decision:** Completed native source reproduction: all 3,111 repeated exact full-state/config connectivity calls had precisely equal fresh reached-row bitmaps (3,085 true, 26 false), zero source/observer parity alarms, 313,160 raw row snapshot bytes. This qualifies only a possible tiny complete-scratch replay, NOT a cache or net work saving.
> **Remaining gate:** Implement a default-OFF same-PrepLevel complete flood-scratch restore with exact semantic key and strict independent OFF/ON diagnostics; prove original Boolean, fresh reached relation, work-accounting semantics and matched-total-250k cold result parity before any production promotion.
> **Research question:** `WS2-CROSS-ATTEMPT-BASIN-OVERLAP`
> **Evidence role:** diagnostic
> **Selection:** same previously post-selected actual source-positive R00720 and R01584, source gate, both width5000 scorers; no post-result source additions
> **Population identity:** source-frozen Corpus2 SHA-256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb; R00720/R01584 exact reused source parents
> **Selection history:** Both IDs were chosen after previous overlap and source dispatch results. This is a narrow reproducibility/falsification test, not an independent source-wide prevalence claim.
> **Inference scope:** exact fresh reach bitset equality and storage lower-bound under original flood, not an implemented cache or net 250k solve savings
> **Production effect:** none

<!-- research-closeout {"schema":"pathfinder.research-closeout/v1","status":"concluded-positive","lastEvidenceDate":"2026-10-19","decision":"Completed native source reproduction: all 3,111 repeated exact full-state/config connectivity calls had precisely equal fresh reached-row bitmaps (3,085 true, 26 false), zero source/observer parity alarms, 313,160 raw row snapshot bytes. This qualifies only a possible tiny complete-scratch replay, NOT a cache or net work saving.","remainingGate":"Implement a default-OFF same-PrepLevel complete flood-scratch restore with exact semantic key and strict independent OFF/ON diagnostics; prove original Boolean, fresh reached relation, work-accounting semantics and matched-total-250k cold result parity before any production promotion.","joins":{"researchQuestion":"WS2-CROSS-ATTEMPT-BASIN-OVERLAP","premiseRefs":[],"measurementOpportunity":null},"evidenceRole":"diagnostic","scope":{"populationIdentity":"source-frozen Corpus2 SHA-256 d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb; R00720/R01584 exact reused source parents","selection":"same previously post-selected actual source-positive R00720 and R01584, source gate, both width5000 scorers; no post-result source additions","inferenceScope":"exact fresh reach bitset equality and storage lower-bound under original flood, not an implemented cache or net 250k solve savings"},"claimRefs":[],"sourceArtifacts":["reports/stress/pg-l-source-native-connectivity-chronology-20261019-001.json","scripts/stress/pg-l-reached-rows-shadow.mjs","reports/stress/pg-l-reached-row-exact-replay-20261019-001.json"],"successors":{"questions":["WS2-CROSS-ATTEMPT-BASIN-OVERLAP"],"artifacts":[]},"prospective":{"expectation":"The same complete path/mechanic/config should produce exactly equal reached bit rows on consecutive scorer repeats","surprise":null,"anomaly":null}} -->

## Exact executed result and interpretation

The [source-authentic green GHA run](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/39307715176) executed at commit `b61b27b3f19a3d78ac7aea552baad262677e0324`, and preserved complete artifact **12214676843**. ZIP SHA-256 `b331f00f378e1351ec62408b3ec2cbe7b08804afd22e3f9f198e81c680448fb8`; independently verified extracted `verdict.json` SHA-256 `39a987aff90d2cee4cf76d8e1e9432639a6f38e9f74e23c82e33a24b0b054b39`. Tracked [exact result mirror](stress/pg-l-reached-row-exact-replay-20261019-001.json). Original source work and ALL attempts, final status, solution and nodes matched between observer ON/OFF in both strict-total 250k calls.

| Source puzzle | Actual later same-state connectivity repeats | Successful matched reach rows | Rejected matched reach rows | Fresh bitmap discrepancies | Total raw row-snapshot storage |
| --- | ---: | ---: | ---: | ---: | ---: |
| R00720 | 1,000 | 988 | 12 | **0** | 88,000 bytes |
| R01584 | 2,111 | 2,097 | 14 | **0** | 225,160 bytes |
| **Total** | **3,111** | **3,085** | **26** | **0** | **313,160 bytes** |

The repeated true-returned native connectivity work was **37,020** canonical units, and all 3,085 reached-cell row bitmaps agreed exactly with the previously expanded full-state/config counterpart. The entire matched charged connectivity work remains 37,332 (true+false). No solver call reused or restored a bitmap, so actual saved canonical work **0**, new cold solves **0**. Exactly 2 previously post-selected development puzzles still cannot establish independent generalization.

The positive demonstrates a sufficiently compact **observable state snapshot**, not safe runtime substitution. `_reached` currently reads either the module-global generation-tagged BFS scratch or the bit-parallel row masks. The next consumer must restore the current *full reach relation* before any downstream BC1 or research observer accesses it, preserve source refusal/side-effect behavior, and handle strict budget accounting correctly. Merely caching true/false still violates the fresh-scratch contract. 313 KB is raw row-array storage for 6,330 observations, not an inclusive production memory figure (keys, JavaScript Map allocations, lookup/serialization and CPU omitted).

The one-shot workflow has been deleted after preserving the artifact; the snapshot helper and reproduction script remain research-only default-off. No production policy, routing or pruning changed.

---

## Why this check precedes a cache

The [previous result](stress/pg-l-source-native-connectivity-chronology-20261019-001.json) split charged repeated calls into 26 false (312 gross work) and 3,085 true (37,020 gross work). A negative-only memo cannot plausibly be the primary savings mechanism. But the successful calls cannot be replaced by an already known Boolean unless every downstream consumer that reads a fresh reachability result still sees the correct data.

The solver uses either `_rowReached` bit-parallel scratch or `_reachGenBuf` generation-tagged BFS scratch. Both have a common read abstraction `_reached(packedKey)`. The new **read-only** helper `connectivityReachRowsForResearch` samples that relation immediately after the real scheduled `isConnected()`, over the actual grid, producing one unsigned integer of reached X bits for each Y row. It cannot change either scratch backend, generation, native work meter, ranking or pruning. The callback only runs when `beamResearchObserver.includeScheduledConnectivityReachRows === true`. When absent, source search does not build the row array.

The [one-shot runner](../scripts/stress/pg-l-reached-rows-shadow.mjs) replays exactly the same two source-frozen actual production 250k strict-total calls as the already successful previous canary: one OFF and one ON for each parent, source original gate, real width5000 profiles, generous 600s safety. It retains conservative exact full-path + mechanics + config keys and compares the **actual** fresh returned reached-cell rows for second-scorer same-key repeats. It does not skip or simulate any native flooding, copy a result back into search, change stage attempts, or save canonical budget.

Prespecified result controls: 2/2 identical native status/solution/work/nodes/all attempts; at least the previously seen 3,111 repeated calls unless source selection drift invalidates the control; zero Boolean disagreements and **zero reached-row mismatches**; record true/false repeat counts and stored bitmap bytes. A 15x15 grid needs at most 15×4=**60 raw snapshot bytes** per key in this simple stored representation, or ceil(225/8)=29 packed bytes ignoring metadata. This is *storage estimation*, not lookup/serialization CPU cost. A mismatch is an immediate semantic warning and blocks any memo treatment.

Even if all rows match, **restoring the complete relevant side-effect state is a separate correctness-sensitive action**. The experiment does not provide an implementation, prove an exact transposition theorem, estimate generalization, or claim saved work/new solves. At that point investigate a default-OFF, type- and scratch-correct cache with fresh-node/branch condition and an independent strict-total-work matched comparison, not a blind Boolean memo.

Retire the one-shot workflow after preserving source SHA/hashes and update the queue. Avoid an unbounded larger parent search until this exact scratch-equivalence gate is adjudicated.
