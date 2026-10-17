# PG-H counted-length-middle opportunity gate 005

> **Status:** active
> **Last evidence:** 2026-10-17 — deepest-selected PG-H 002 had 35/35 CP-SAT-DEAD children but [work-shadow 004](2026-10-17-pg-h-dead-descendant-work-shadow-004.md) showed 28 never expanded later, 7 only one zero-work event; the extreme-depth pruning form is economically unpersuasive.
> **Decision:** measure **middle remaining counted-path-length** eligibility in the same eight parent beam attempts before buying any more exact CP-SAT calls or hard-prune code.
> **Remaining gate:** outcome-blind mid-residual capture, case coverage/depth/remaining-counted histograms, then cheap passive descendant-work exposure check before exact reference queries. Skip exact if no repeated future expansions.
> **Research question:** `WS2-SEMANTIC-FORCEDNESS`
> **Evidence role:** discovery
> **Selection:** same frozen eight previous parents; intermediate fraction of counted length comes exclusively from current raw puzzle + current beam path, accounting for portal jumps. No historic success/DEAD labels used to select groups.
> **Population identity:** R00242 R02941 R03030 R02405 R01229 R02307 R02561 R02240 from the same Corpus2 SHA d15ed3b626b98c3bb8898f4a49079cc8a920f9e237412966b7eeedd0a27c7ffb; preregistered all-group eligibility `0.25 <= remainingCounted/requiredLength <= 0.75`.
> **Inference scope:** capture opportunity and current-search state informativeness for those eight previously studied parents, not general semantic forcedness prevalence.
> **Production effect:** none.

## Frozen choice

Keep the original width-500 `objectiveFirst` beam, 500,000 canonical work per gate, 600-second wall-safety, 2–4 children per state and **at most two** states per gate. Observe all eligible groups through the same research observer without steering search.

Add `--selection=middle-counted`: correctly count ordinary cardinal steps versus **forced portal jumps** along a recorded current parent prefix (a portal jump contributes zero counted length). Among states with remaining counted steps between 25% and 75% of required length, sort by absolute deviation from 50% and use original generation order for ties. No fallback to `first` or `deepest` when there are too few. Output actual raw depth, counted depth, portal jumps and residual length in each selected group for audit.

The primary measurable result is whether any groups exist, and their distribution and future retained expansion rate. Do **not** infer a cheap pruning consumer from existing CP-SAT DEAD labels. If the middle groups rarely survive beam selection, close that sampling form. If they do consume work, only then buy a small bounded exact reference sample, with all UNKNOWN statuses retained as abstentions.

The temporary branch-only Actions workflow performs the read-only capture and stores the cases. It is removed before integrating any permanent research instrument.
