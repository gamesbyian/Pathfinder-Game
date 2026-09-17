# Lane F3 topology cheap side descriptor result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — zero-new-compute re-analysis of the topology fork pilot's already-committed 10-pair/44-puncture-row dataset, current HEAD.
> **Decision:** a cheap, O(1)-after-a-linear-scan "closest-approach" side descriptor (no trig, no per-step accumulation, unlike the full winding-phase integral) reproduces the full observer's original-vs-alternate side classification with **100% precision (8/8) whenever the closest-approach point along the segment is unique**, and only degrades (12/18, 67%) when multiple path steps tie for closest to the puncture. Every one of the 6 observed mismatches (across all 26 decisive-puncture rows, including both of the discordant-pair failures) has a tied closest point; no untied case ever mismatched. This is a real, sound, cheaply-checkable sufficient condition for a fast path, not a universal replacement for the full observer.
> **Remaining gate:** the sound subset (unique closest point) covered only 8/26 (31%) of tested decisive-puncture rows in this small population — most cases here are tied. A larger population is needed to know whether that coverage rate is representative before proposing any production consumer; the tied-case failure mode itself (the path wraps most of the way around the puncture at near-constant distance) is now understood, not merely observed.
> **Evidence role:** Lane F3's topology per-instance microscope, direct continuation of `reports/2026-09-16-class5-controlled-topology-fork-pilot-result-001.md`'s own named next gate ("derive a compact, generic, runtime-legal descriptor of which side of a nearby puncture the current path already committed to").
> **Population identity:** the topology fork pilot's own already-committed, already-audited 10-pair population (`reports/stress/class5-topology-fork-candidates-2026-09-16.json`, `reports/stress/class5-topology-fork-replication-candidates-2026-09-16.json`, `reports/stress/class5-topology-fork-analysis-2026-09-16.json`) — 5 parent families, 4 discordant pairs, 0 abstains, 0 correctness alarms. No new labelling, no new solver compute.

## Why this ran

The topology fork pilot's own "Next gate" section names exactly this question: can "which side of a puncture the path passed" be captured by something cheaper than the full observer's per-step angle integration? This is the next open item in the reconciled queue (Lane F3), and the pilot's own committed data already contains everything needed to test a candidate cheap descriptor with zero new solver compute: both forked segments' full coordinate paths and, for every board puncture, the full phase the existing observer already computed.

## Method

A fork pair's two segments share identical start/end anchors by construction (that is what makes them a fork), so any descriptor built only from the segment's endpoints is structurally blind to the route between them — ruled out analytically before testing. Instead: for each (fork pair, puncture) combination, find the single path step closest to the puncture (a linear Euclidean-distance scan over the segment, no trigonometry), then take the sign of one cross product between the path vertices immediately before and after that closest step. Compare this sign's original-vs-alternate disagreement against the full phase integral's original-vs-alternate sign disagreement, restricted to each pair's decisive puncture (`|phaseDelta| > 0.5` turns — the puncture the pilot's construction actually targeted).

## Result

| | Rows | Mismatches |
|---|---:|---:|
| All decisive-puncture rows | 26 | 6 (23.1%) |
| Discordant-pair rows (the 4 LIVE/DEAD-different pairs) | 4 | 2 (50%) |
| Concordant-pair rows | 22 | 4 (18.2%) |
| **Rows with a unique closest-approach point** | **8** | **0 (0%)** |
| **Rows with a tied closest-approach point** | **18** | **6 (33.3%)** |

Every mismatch has a tied closest point (6/6); no untied row ever mismatched.

## Interpretation

**The failure mode is understood, not just observed.** Inspecting `P00137-w1-A2-B9`'s failing case directly: its alternate route passes the puncture at Euclidean distance exactly 1 cell across four different steps (roughly wrapping around three sides of it), so "the single closest point" is ill-defined — an arbitrary tie-break (first occurrence) happens to land in the segment's shared prefix with the original route, producing an identical local cross-product sign for both routes even though the alternate route's overall path genuinely passes on the topologically opposite side. This is exactly the case a true winding-number integral captures (it sums signed angle across every step, so a near-full wrap contributes correctly) and a single local test structurally cannot: a route that grazes a puncture at roughly constant distance across many steps needs more than one point to characterize.

**The sound subset is real and precise, not coincidental.** 8/8 untied rows agree exactly with the full phase integral, with zero counterexamples in this population, and the tie/mismatch correlation is perfect in the failing direction (every mismatch is tied; not every tie is a mismatch, so tied-ness is necessary but not sufficient for failure — a conservative "distrust when tied" rule never produces a false negative here). This is a genuine, cheaply-checkable **topology-aware soundness condition**: "if the closest-approach point along a segment relative to a puncture is unique, the cheap side descriptor exactly reproduces the full observer's side classification" — verified, not assumed, on every tested case.

## What this earns

Earned:
- A real, sound, zero-counterexample implication linking a cheap local test to the full topological observer's output, conditional on a cheaply-checkable precondition (tie count, already computed during the same distance scan needed to find the closest point at all — no extra cost).
- A precise, mechanistic account of why and exactly when the shortcut fails (near-constant-distance wrap-around), rather than an unexplained residual error rate.

Not earned:
- Universal applicability. The sound subset covers only 31% (8/26) of this small population's decisive-puncture rows; most cases here are tied, where the cheap descriptor is unreliable (67% correct — better than chance but not sound). No production consumer is proposed; this is a discovery/characterization result per the microscope's own remit, not a routing change.
- Confidence in the 31% coverage figure generalizing. The population is the same 10-pair/5-parent set the fork pilot itself flagged as small; a broader population (once available) is needed to know whether ties are this common generally or an artifact of this pilot's single-puncture, opposite-side construction specifically.

## Next gate

If this line is picked up again: (a) test whether a tie-aware refinement (e.g., using the *first and last* tied-distance steps' before/after vertices, or the tie count's parity) recovers soundness in some or all of the 6 failing cases without falling back to the full integral, and (b) reuse the fork-construction operator (`scripts/stress/class5-topology-fork-construct.mjs`) to generate a larger population specifically to measure the untied/tied coverage split more precisely. Neither is required before this result is useful as capability-memory evidence on its own.

## Artifacts

- `scripts/stress/lane-f3-topology-cheap-side-descriptor.mjs`
- `reports/stress/lane-f3-topology-cheap-side-descriptor-2026-09-17.json` — full per-puncture-row detail including tie counts
