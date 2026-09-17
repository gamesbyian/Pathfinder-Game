# Lane D3 mechanic-conditioned commutativity breakdown result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — zero-new-compute join of Lane D3's already-committed 12,277-candidate result set to each level's static mechanic inventory, current HEAD.
> **Decision:** residual-interface commutativity is **not** mechanic-neutral. Every one of the 2,152 candidates on the 10 levels containing a flipping filter (whether alone or with portals) is illegal — **0% legal, both pooled and length-matched, with no exceptions**. Portal-only levels (no flippers) show a **higher** length-matched legal rate (69.9%, 862/1,234) than mechanic-free levels (44.8%, 591/1,320) — nearly 1.6x. The original report's pooled 46.6% length-matched figure was an average across two very different regimes it did not separate.
> **Remaining gate:** none for this specific breakdown. The flipper-zero finding is clean enough (2,152/2,152, 10 independent levels) to treat as decisive without further testing; the portal-boost figure (69.9% vs. 44.8%, 8 vs. 7 levels) is suggestive but smaller and would benefit from a larger population before being treated as load-bearing on its own.
> **Evidence role:** direct extension of `reports/2026-09-17-lane-d-residual-interface-commutativity-result-001.md`'s own "which mechanics invalidate commutativity" question, using only already-committed data (no new splices, no new solver compute).
> **Population identity:** the same 25-level/12,277-candidate population D3 already produced, joined to each level's own `portals`/`flippingFilters` counts already present in `data/stress/stress-levels-random.json`. No new labelling.

## Why this ran

D3's own result classified failures only by *how* they fail (geometric/adjacency vs. length mismatch), not by *which mechanics were in play* on the level being tested. The report's population (25 levels) already spans mechanic-free, portal-only, flipper-only, and portal-and-flipper levels — splitting the already-computed results by this axis needed no new compute, just a join to already-committed corpus metadata.

## Method

For each of D3's 25 levels, bucket by static mechanic inventory (`portals.length`, `flippingFilters.length`): `mechanic-free` (both zero), `portal-only`, `flipper-only`, `portal-and-flipper`. Every candidate on a level inherits that level's bucket. Report both the pooled and length-matched legal rate per bucket, reusing D3's own `aLength === bLength` definition of "length-matched."

## Result

| Bucket | Levels | All candidates | All legal | All legal rate | Length-matched | LM legal | **LM legal rate** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **flipper-only** | 4 | 950 | 0 | 0% | 149 | 0 | **0%** |
| **portal-and-flipper** | 6 | 1,202 | 0 | 0% | 418 | 0 | **0%** |
| mechanic-free | 7 | 6,238 | 591 | 9.5% | 1,320 | 591 | **44.8%** |
| **portal-only** | 8 | 3,887 | 1,062 | 27.3% | 1,234 | 862 | **69.9%** |
| (pooled, D3's original figure) | 25 | 12,277 | 1,653 | 13.5% | 3,121 | 1,453 | 46.6% |

Spot-checked the flipper-bucket failures directly: reasons are `Invalid move at step N` spread across many different step indices per level (not one degenerate cause), consistent with a genuine state-order-dependence effect rather than a scripting artifact.

## Interpretation

**Flippers, not portals, are what breaks commutativity.** A flipping filter's legal-turn behavior depends on its current flip state, which is a function of the *order* every flipper cell in the path has been visited so far — exactly the kind of history-dependence a segment swap disturbs, even when the swap preserves the same obligation-cell visits and the same length. This is mechanistically the cleanest possible explanation for a 2,152/2,152 zero, and it directly sharpens D3's own failure-category finding: "geometric/adjacency" failures were D3's largest bucket (58.8% of all failures), and this shows a full quarter of that bucket's mass (the flipper-containing levels) is not diffuse geometric noise but one specific, identifiable mechanic.

**Portals appear to help, not hurt.** Portal-only levels' length-matched legal rate (69.9%) is well above mechanic-free levels' (44.8%). A plausible mechanism: a portal pair adds an extra topological connection between two board regions, which can make more alternate routes between two fixed anchors *simultaneously* legal (more slack in the level's connectivity), whereas mechanic-free levels rely purely on open-cell geometry. This is a real, level-scale correlation, not yet a mechanism proven at the per-candidate level.

## What this earns

Earned:
- A materially sharper answer to D3's own question than "geometric/length only": commutativity is governed almost entirely by whether *history-dependent* mechanics (flippers) are present, not by mechanic complexity in general (portals coexist with commutativity fine, even better than the mechanic-free baseline).
- A clean, decisive, zero-exception result on the flipper side (2,152/2,152 across 10 independent levels) that any future commutativity-based production consumer (Lane E's next gate, e.g.) should treat as a hard exclusion rule: never assume a commuting swap is safe across a flipper-touching segment without re-verifying.

Not earned:
- A per-candidate (rather than per-level) mechanistic proof. This bucket is defined by the *level's* static inventory, not by whether the specific spliced segment itself touches a flipper cell — a mechanic-free level's segment obviously cannot touch one, but a flipper-only level's segment might avoid the flipper cells entirely and still be bucketed "flipper-only." A tighter per-segment version (does *this specific* splice cross a flipper cell) would need one more cheap join (already-available `aObligations`/`bObligations`-style tagging, extended to flipper/portal touches) — not run here, left as a natural tightening if this line is picked up again.
- Statistical confidence on the portal-boost figure at population scale (8 levels); real but smaller than the flipper-zero finding.

## Artifacts

- `scripts/stress/lane-d3-mechanic-conditioned-breakdown.mjs`
- `reports/stress/lane-d3-mechanic-conditioned-breakdown-2026-09-17.json`
