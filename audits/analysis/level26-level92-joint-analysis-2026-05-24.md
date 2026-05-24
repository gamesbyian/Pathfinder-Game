# Level 26 vs Level 92 joint solve analysis (through 2026-05-24)

## Scope
- Dataset: `audits/metrics/*.json` (excluding `latest.json`).
- Run count with both level records present: **185**.
- Goal: characterize conditions where levels **26** and **92** are solved together vs split outcomes.

## Outcome matrix

| Outcome bucket | Count | Share |
|---|---:|---:|
| Both solved (26 ✅, 92 ✅) | 5 | 2.7% |
| Only level 26 solved (26 ✅, 92 ❌) | 150 | 81.1% |
| Only level 92 solved (26 ❌, 92 ✅) | 5 | 2.7% |
| Neither solved (26 ❌, 92 ❌) | 25 | 13.5% |

### Immediate read
- The solver is currently **strongly biased toward solving level 26**.
- Level 92 is usually the blocker in mixed outcomes (`only26` dominates).
- However, the `only92` bucket proves the trade-off is not one-way: tuning that helps 92 can regress 26.

## Group-level contrasts (means)

| Bucket | L26 nodes | L92 nodes | L26 time (ms) | L92 time (ms) | L26 attempts | L92 attempts |
|---|---:|---:|---:|---:|---:|---:|
| Both solved | 100,291.4 | 6,716.8 | 91,197.8 | 92,232.2 | 2.0 | 2.4 |
| Only 26 solved | 50,005.5 | 9,066.3 | 54,277.6 | 187,483.6 | 3.3 | 7.1 |
| Only 92 solved | 16,634.2 | 33,556.4 | 141,930.4 | 69,661.6 | 2.8 | 1.6 |
| Neither solved | 43,944.3 | 10,956.0 | 95,097.1 | 98,560.9 | 5.2 | 3.9 |

## Observed patterns

1. **Level 92 failures are mostly prolonged, multi-attempt timeouts when 26 succeeds.**
   - In `only26`, level 92 has the highest average attempt count (7.1) and very high wall time (~187s).
   - Failure category for level 92 in this bucket is consistently `healthy-expansion-timeout`.

2. **When level 92 is solved without 26, the workload flips.**
   - In `only92`, level 92 gets much deeper search (33.6k nodes avg), while level 26 solve time inflates to ~142s and times out.
   - This suggests a resource allocation / heuristic-priority inversion, not random noise.

3. **Both-solved runs have a distinctive profile.**
   - They keep level 92 node usage relatively low (6.7k) while still allowing heavy expansion on level 26 (100k).
   - This implies successful runs likely find an early useful branch for 92 (or avoid known dead families) while still leaving budget headroom for 26.

4. **Failure modes are structurally symmetric.**
   - In mixed outcomes, the failed side is almost always `healthy-expansion-timeout`, not pre-expansion failures.
   - That points more to search ordering / budget partitioning than correctness bugs.

## Recent run clusters of interest

- **Both solved cluster (May 23, 2026):**
  - `2026-05-23T04-38-05Z-a82caac3966b.json`
  - `2026-05-23T04-53-27Z-4b61a9a452b5.json`
  - `2026-05-23T06-36-31Z-299ef5487409.json`

- **Only 92 solved cluster (May 23, 2026):**
  - `2026-05-23T19-33-47Z-e641f9ea229e.json`
  - `2026-05-23T20-44-52Z-bce88aceec6e.json`
  - `2026-05-23T20-55-36Z-e4b04b4b867f.json`

These two same-day clusters are ideal for a controlled diff of solver settings and level-transition summary fields.

## Actionable strategy for “solve both simultaneously”

1. **Adopt dual-target acceptance gating in tuning loops.**
   - Treat a configuration as “improvement” only if it preserves or improves both levels, not just aggregate solved count.
   - Operationally: add a check that rejects any change that moves from `both`/`only26` to `only92` (or vice versa) unless compensated by net gain in `both` frequency.

2. **Add per-level budget floors before adaptive reallocation.**
   - Current signatures suggest one level can consume retries/branch budget in ways that starve the other.
   - Guarantee minimum attempts/time for both 26 and 92 before global heuristics reclaim budget.

3. **Promote branch-family diversity earlier for level 92 only when timeout risk rises.**
   - In `only26`, 92 shows many retries with no solve; introduce earlier diversification trigger for 92 to prevent repeated near-duplicate families.
   - Keep this conditional so level 26’s successful pattern is not disrupted globally.

4. **Run A/B on the May 23 split windows with identical seeds if available.**
   - Compare `both solved` window vs `only92` window first; then validate on latest runs where `only26` persists (e.g., `2026-05-24T00:41:52Z`).

## Suggested next experiment design

- Primary metric: `% runs where both 26 and 92 solved`.
- Guardrail metrics:
  - `% only26`, `% only92` (must not rise while primary improves),
  - median attempts on 92,
  - median solve time on 26.
- Acceptance rule: require statistically meaningful improvement in `both` with no >2-3pp regression in either single-solve bucket.
