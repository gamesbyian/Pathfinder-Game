<!-- agent-context-budget: warn=5000 max=7000 -->
# Solver parity response-signature preflight

> **Status:** ACTIVE CHEAP OFFLINE ANALYSIS; no production decisions changed.
> **Owner:** `WS2-PARITY-RESPONSE-SIGNATURE`, queued under Lane H in [solver optimization workstreams](solver-optimization-workstreams.md).
> **Parent invariant:** [parity phase/capacity preflight](solver-parity-phase-capacity-preflight.md).

## Question

Do compact **current-input parity features** explain technique-response discordance or successful-path realization beyond existing structural descriptors strongly enough to nominate a transferable solver consumer?

Do not prespecify named parity level classes. Treat parity as a feature basis first; derive categories only if stable response regions emerge.

## Static feature basis

Derive from the level only:

- required twist parity for each gate; summarize all-even / all-odd / mixed gate demand;
- twist-pair and same-parity portal-pair counts;
- minimum required-phase distance and slack;
- scalar-to-required-phase slack loss;
- best/worse-gate required-phase slack spread;
- no-twist initial checkerboard-capacity margin where defined.

These are legal cold current-input facts. Historical solver outcomes, saved hints and provenance may be joined offline but are never feature inputs to production routing.

## Discriminator A: technique census

Reuse the existing census descriptor join before collecting new solver data.

Primary response is **pairwise technique discordance direction** among protocol/comparison-compatible cells: when techniques A and B disagree on the same level, do parity features predict which side wins?

Secondary summaries may include exact technique-response phenotype, failure fingerprint, isolated solve cost and budget curve, but absolute solve rate is not the primary discriminator.

Compare parity features against the census's existing reqLen, reqInt, area, object density and mechanic prevalence. A portal-count association that disappears after those controls is not a parity result.

### Stop / advance

Stop if support is thin, effects are unstable across independent units, or parity adds no useful information beyond existing descriptors.

Advance only on a concrete discriminator with enough support to survive an independent population. Association is nomination evidence, not routing evidence.

## Discriminator B: saved hints and provenance

Hints are success-selected. Use them to study **how successful solutions realize parity**, not success/failure prevalence.

Per stored path, derive where possible:

- chosen gate and its required twist phase;
- realized twist-jump parity and count;
- first twist timing / counted path position;
- phase-correction timing relative to path length;
- required-phase slack context.

Join to provenance technique/source-cell identity and work only where provenance semantics are compatible. Prefer within-level contrasts between independently discovered successful paths, because board geometry and static parity structure are then held fixed.

Useful findings are mechanistic, for example one technique family consistently preserving phase options longer or repairing after later phase correction. They still require prospective confirmation before a solver change.

## Discriminator C: prospective search behavior

Only after A or B nominates a mechanism, reuse the existing phase-distance/capacity observers to test whether the static association appears at actual decision seams. Do not create a separate parity telemetry stack.

Possible descendants include ordering, scoring, retention, repair or WS1 routing. Choose the smallest consumer matching the observed mechanism.

## Promotion boundary

A WS1 selector/routing descendant requires:

1. a legal current-input parity feature;
2. differentiated response on supported evidence;
3. an independent shared-budget transfer with participation and gains/losses;
4. ordinary level-blindness and matched-work rules.

No historical level identity, hint identity, known winner, provenance source or capability-memory membership may enter runtime policy.
