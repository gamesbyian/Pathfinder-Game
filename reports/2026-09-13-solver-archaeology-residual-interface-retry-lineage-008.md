# Solver archaeology: residual interfaces and retry-signature lineage 008

> **Status:** inconclusive
> **Last evidence:** 2026-09-13 — archaeology cross-checked residual-interface mining, retry-fingerprint identity, repair stagnation, and sound transposition evidence; PR-review corrections were rejoined before closeout.
> **Decision:** preserve the unresolved commutativity observer question and response-fingerprint measurement lesson; keep generic gadget mining and compact-equivalence steering closed.
> **Remaining gate:** only reopen from current authority when exact-labelled or current fixed-work evidence supplies a specific recurring mechanism that these observers can test.
> **Authority boundary:** this report does not change `docs/solver-optimization-workstreams.md` or `docs/solver-future-work.md`. It preserves archaeology evidence for future premise selection. No production solver behavior changed.

## Why this seam mattered

Two apparently separate historical threads converge on the same research question: when can a compact description safely stand in for richer path/search history?

- the August detour-gadget / commuting-segment proposals asked whether subpaths can be substituted or reordered while preserving the externally relevant completion interface;
- March-April retry adaptation asked whether aggregate attempt outcomes can identify repeated search behavior strongly enough to justify changing the next action;
- July transposition work separately demonstrated how easy it is for coarse signatures to manufacture apparent repetition by collapsing future-distinct states.

The useful archaeology is therefore not “bring back the old mechanisms.” It is to distinguish observed recurrence from asserted equivalence.

## 1. Detour-gadget discovery was substantially attempted under later vocabulary

The August 6 frontier triage treated detour-gadget discovery as one of only two cheap remaining offline ideas. Its proposed first experiment was deliberately conservative: mine stored solutions for **interface-equivalent subpaths** with different length/intersection contributions before building any runtime operator.

Five days later the residual-interface mining/census line implemented essentially that gate under different vocabulary.

The committed August 11 census:

- inspected 20 levels and 288 canonical-valid solutions;
- found 31,351 exact represented-state-preserving occurrences;
- reduced those to 845 unique signatures;
- found 459 signatures spanning multiple solutions;
- found 201 spanning multiple structural solution families;
- found only 14 spanning levels.

The cross-level inspection then found that nearly all 14 generalized to the same elementary geometry: short route versus a four-edge rectangular loop, usually shifting where one intersection was accumulated. Only one motif (`X10`) survived a cautious held-out view across four levels / five solutions / five structural families, and even that remained explainable as generic empty-obligation rectangle geometry rather than a distinctive reusable solver primitive.

No signature demonstrated all of cheap recognition, availability of useful alternatives, and solver-work benefit. No detour operator was earned.

### Disposition

The broad “mine reusable detour gadgets from accepted solutions” premise received a real first gate and came back weak. Do not classify it as an untouched orphan and do not revive a generic detour library.

A materially changed descendant would need mechanic-conditioned or completion-regime evidence that the August exact-interface census did not represent.

## 2. Commuting-segment reduction did **not** receive the experiment originally proposed

The sibling August proposal asked a stronger question: can disjoint local excursions be reordered while preserving the externally relevant state, and what mechanics break that commutativity?

The residual-interface tooling contains a `commutingCandidate` notion, but its test is only:

- the two subpaths have the same sorted obligation multiset; and
- the obligation order differs.

That is a candidate generator, not the proposed experiment. The archaeology found no descendant that takes those candidates and measures the original decision-bearing quantities:

- whether the swapped/reordered path remains legal;
- whether completion feasibility is preserved;
- whether completion count or topology changes;
- whether search work changes;
- which mechanics invalidate the commutativity assumption.

The committed census can report hundreds of such candidates on a level, but that count alone says nothing about true partial-order equivalence.

### Disposition

The broad partial-order reduction runtime idea remains unearned. The **offline equivalence question** is still unresolved.

If current exact-labelled or accepted-path evidence independently points to redundant ordering of disjoint obligations, the cheapest legitimate descendant is an observer that validates candidate swaps against actual future feasibility. Do not infer equivalence from obligation-multiset identity alone.

## 3. Retry-response fingerprints existed before the unmerged April PR

PR #687 (`Add retry-fingerprint deduplication and metrics...`) is useful archaeology but not the origin of the mechanism. It was closed unmerged after conflicts, and review found telemetry defects, including success paths omitting the duplicate counter and an audit projection that conflated “not observed” with zero.

Its central proposal was nevertheless already present in the merged solver lineage: summarize timeout-like attempts by nodes expanded, depth reached, and near-solution deficit dimensions; if recent attempts share a fingerprint, alter the next attempt's ordering/policy/portal bias rather than repeat the same search.

Earlier merged ancestors had already introduced:

- telemetry-delta-gated strategy-family switching when high expansion velocity produced little progress (PR #395, March 23);
- a one-shot broad-stagnation novelty retry with remixed root tie-breaking and avoided recent root choices (PR #553, March 30).

So the historical question was not merely “can retry outcomes be fingerprinted?” It was whether those fingerprints were faithful enough to identify a repeated basin and predictive enough to justify steering.

## 4. The first apparent `retryFingerprintDupes=0` result was partly an identity bug

By April 18, audits of the persistent L92/L108/L134 failures showed `retryFingerprintDupes=0`, which superficially suggested the attempts were not repeating.

That conclusion was not clean. L134 repeatedly produced the same core attempt shape, **5468 nodes / depth 49**, but the fingerprint failed to match because its empty near-dimension serialization differed in whitespace/representation. Commit `1fabf9f7` added a core `nodes:depth` fallback when both near-dimension signatures are empty.

The same commit found other rescue predicates silently excluding the intended populations:

- one inconclusive attempt disqualified the near-closure rescue even though the surrounding attempts were timeout-class failures;
- L92 never reached the hard 60-state must-cross frontier threshold, so the rescue designed for its phenotype never fired; a stalled-bound + non-empty near-must-cross alternative was added.

### Disposition

Historical zero fingerprint recurrence is not evidence of zero behavioral recurrence unless the signature identity and rescue participation are verified. This is another instance of a recurring archaeology failure class: a mechanism exists, but its classifier/transport/predicate prevents the intended treatment from seeing the target population.

## 5. July supplied bounded observer evidence of repeated stagnation at the same best deficit family

The later repair-search stagnation investigation did not rely on the old retry fingerprint to steer behavior. It instrumented the actual `computeBadness` term breakdown on two repair-close levels.

The bounded runs established that each level reached a best state with a specific length-plus-must-turn deficit and then produced **no further best-ever improvement** for the remainder of that run:

- `R02344`: best badness 2 at restart 68,012, `length deficit = 1` plus one pending must-turn; no later best-ever improvement through roughly 2.19M nodes;
- `R02123`: best badness 6 at restart 127,881, `length deficit = 4` plus two pending must-turns; no later best-ever improvement through roughly 2.5M nodes.

PR review correctly narrowed the original writeup. The debug line fired on **new best-ever improvements**, not on every restart or every elite-pool admission. Therefore these runs do **not** prove that every later restart reproduced the identical deficit signature, that the elite pool itself stayed compositionally identical, or that the plateau was permanent beyond the bounded run. The original claim that the best state appeared “well under 1%” of the time budget was also wrong: the cited improvements occurred around 3.95s and 4.44s in 8s runs, roughly 49-56% of wall budget.

What survives is still useful but narrower: on these two specimens, generic restart-constant changes had already failed, and the best observed regime at the plateau combined exact-length pressure with pending directional must-turn obligations. That nominated a mechanism-specific repair question, but it did not establish a repeated-basin equivalence class by itself.

The proposed targeted length-deficit + directional-must-turn operator was not found as a direct descendant under that vocabulary. Later must-turn guidance and current additive must-turn-biased repair work are related, but should not be treated as proof that the specific July hypothesis was completed.

### Disposition

The robust surviving premise is **observer-first response fingerprinting**, with a stricter evidence bar than the original report used:

- repeated or stable response signatures can diagnose stagnation only to the granularity actually observed;
- a coarse response signature is not proof that two search states, restarts, elite pools, or basins are equivalent;
- steering/allocation should be earned only after the signature predicts incremental action value under canonical work accounting;
- if the observer records only best-ever changes, absence of a new best is evidence of plateau, not evidence that every intervening search attempt is structurally identical.

This lines up with the current progress-conditioned allocation question without resurrecting the old adaptive retry design.

## 6. July's transposition correction is the cautionary counterexample

A July transposition probe initially reported approximately 92-99% apparent duplicate node visits under a compact state signature. That looked like an enormous opportunity.

The signature omitted future-relevant history. When the experiment was repeated with full visited-cell identity and edge/axis history, measured reconvergence fell to roughly 0.5-16%, usually about 1-2%; the level with the most dramatic coarse “duplication” had the least true duplication. A later beam measurement found sound duplicate elimination at only about 0.019% of roughly 11.4M candidates.

This is the same representational trap in a cleaner form: compact signatures can create recurrence by assertion.

### Cross-era lesson

Pathfinder has repeatedly benefited from **compact diagnostics** while being harmed by treating compact diagnostics as **future equivalence**:

- failed-state memo keys;
- transposition signatures;
- retry fingerprints;
- obligation-multiset commuting candidates;
- coarse-state beam merge.

The safe experimental pattern is to use compact signatures to nominate cases, then test the claimed equivalence against exact labels, accepted completions, or explicit differential replay before making them merge, prune, or steering keys.

## 7. Nearby unfinished scalar instrumentation should stay historical

The August 11 `mc-crossing-slack-analysis.mjs` is still a useful example of unfinished instrumentation. It was built to compare

`crossingSlack = freeInt - forcedFutureNeighbourRevisits`

across exact/reference-labelled `dead-residual`, `dead-pruned`, and `alive` branches while separately replaying known-valid prefixes. The synthesis recorded only a small safety smoke: 10 Corpus-2 levels, 289 unique valid paths, 7,957 applicable prefixes, zero negative-slack alarms. No committed full exact-label result artifact was found.

Historically, that intended experiment was not completed. Current authority nevertheless blocks simply running it as the next scalar canary: September's six-feature exact-labelled future-feasibility rejoin closed the nearby compact-scalar direction and requires a materially changed premise.

The archaeology value is therefore the incomplete chain, not a recommendation to execute it now.

## Research implications preserved from this pass

1. Treat same-interface / same-fingerprint / same-summary identities as hypotheses, not equivalence relations.
2. The detour-gadget line received more of a real falsification gate than its old name suggests; generic gadget mining should stay closed absent changed evidence.
3. The commuting/partial-order line was only candidate-counted, not validated. Its offline equivalence question remains genuinely unresolved.
4. Retry-response signatures have stronger value as bounded observers of stagnation than as direct steering keys.
5. Any modern use of response fingerprints should join them to incremental outcome and canonical `workSpent`, not raw retries or wall-clock behavior.
6. Old zero-recurrence/null-participation claims require identity/predicate audits before being inherited.
7. Review-corrected wording matters: an observer that records only best-ever changes cannot certify per-restart basin identity.

No item here independently changes current solver priority. The nearest current-authority joins are the WS2 progress/allocation question, categorical completion-regime microscopy, and exact-labelled observer work.