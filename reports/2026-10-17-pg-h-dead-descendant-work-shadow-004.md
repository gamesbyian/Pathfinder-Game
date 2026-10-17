# PG-H selected deep-DEAD descendant-work shadow 004

> **Status:** active
> **Last evidence:** 2026-10-17 — 35/35 deepest-selected child cases CP-SAT DEAD; a weak-current-state audit found 2 already-terminal goal cases, 0 simple overlength/optimistic-distance rejects, 33 nonterminal cases requiring stronger facts.
> **Decision:** measure whether these exact 33 nonterminal branches are actually expanded later by the bounded ordinary beam. An offline DEAD answer has no value if beam truncation already discards the child before spending further work.
> **Remaining gate:** replay the frozen 8 parents/35 child prefixes with a passive research observer at the same width-500, objectiveFirst, 500k-work-per-gate envelope. Require deterministic total work and case identity parity. Count subsequent retained-parent expansions, canonical work and parent coverage per frozen child. Use this cost funnel to decide whether a new sound rejector has a credible economic target.
> **Research question:** `WS2-SEMANTIC-FORCEDNESS`
> **Evidence role:** discovery
> **Selection:** exactly the previous depth-selected 35 child cases; retrospective opportunity calibration, never generalization evidence.
> **Population identity:** GHA 39005597866 immutable artifact `pg-h-deep-exact-complete`, eight parent IDs and Corpus-2 SHA `d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb`.
> **Inference scope:** actual downstream work retained within the specified bounded single beam, not the complete production ladder, alternative searches or population-wide prevalence.
> **Production effect:** none.

## Design

The original `semantic-forcedness-capture.mjs` emits complete typed child prefixes. Rerun **the same frozen** production-observer beam, this time counting each generated frontier parent's path when it begins with a frozen child prefix. Accumulate `parentExpansions[].workSpent` only when descendants of that child are actually expanded. The observer never changes neighbor order, score, prune, width or work cap.

A descendant may be generated but never retained, which must be reported as **zero subsequent parent expansions**. A nonzero count reveals a measurable opportunity; it does not prove a new prune would improve cold solves, because frontier-slot displacement, wall overhead and other attempts remain unmeasured. Prevent double-counting if any frozen child prefix is nested under another: report both per-child totals and unique parent-event union cost.

Stop the simple late-deadness-pruning direction if almost every known-DEAD child receives no further work; seek a different depth/constraint class. If enough descendant work is wasted, attempt the cheapest **sound** semantic discriminator on the expensive cases only, and require witness-soundness plus matched-work cold A/B before production.
