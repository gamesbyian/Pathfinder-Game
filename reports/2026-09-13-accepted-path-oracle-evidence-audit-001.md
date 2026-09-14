# Accepted-path/oracle evidence across diagnostics audit 001

> **Status:** in progress; sensitivity cohort preregistered before outcome inspection
> **Audit:** inference-first research Audit 3
> **Date:** 2026-09-13
> **Evidence role:** diagnostic/resource audit; bounded existing-data probes plus only decision-bearing compute
> **Scope:** accepted-path/oracle choice, known-path sample composition, diagnostic ancestry, and observability conditioning. This is not a re-audit of hint provenance, Solution Profiles, or experiment lifecycle machinery.

## Question

When a referee-valid accepted path or accepted-path set is used to diagnose solver behaviour, which conclusions describe the solver/level robustly and which are conditioned on the solution basin that happened to become observable?

A stored accepted path is exact positive evidence for that path. It is not an exhaustive description of the level's viable solution space. Known-prefix extinction likewise establishes loss of observed known support, not global infeasibility.

## Preregistered sensitivity cohort

This cohort was frozen before oracle-substitution outcomes were inspected. Selection uses support properties already established independently by the cross-resource observability/ancestry audit, not sensitivity results.

Frozen level IDs:

`R03279, R01553, R02843, R02716, R03188, R02290, R01636`

Why these IDs: the prior ancestry audit independently nominated them among levels with complete chronology, at least ten stored accepted paths, and at most 25% replay-first support. They therefore permit same-level multi-path comparison while retaining substantial non-replay-first observation ancestry. They are development cases, not independent holdouts.

Frozen path inclusion rule:

1. referee-valid stored accepted paths only;
2. exact duplicate path signatures collapsed;
3. current structural level revision only;
4. retain provenance rather than treating missing provenance as negative evidence;
5. distinguish replay-touched, replay-first, replay-only, non-replay-first, and unknown/unattributed legacy origin where chronology permits;
6. dependency comparison uses the repository's conservative provenance dependency stratum, not raw provenance-event count.

Frozen representative rule: use `selectRepresentativeHints(..., { evidencePurpose: 'solution-atlas' })`; when a single representative is required, `limit: 1`; sensitivity substitutes additional structurally diverse representatives from the same helper rather than storage order. Identity-bound artifacts are excluded from generic substitution.

Frozen set-valued views where supported: (a) all eligible unique accepted paths; (b) one representative per conservative dependency stratum; (c) exclude replay-first paths; (d) non-replay-first representatives plus one replay-first representative when both exist. Missing chronology remains unknown and is never coerced into non-replay.

Frozen diagnostic shapes:

- representative-path local child-rank / path-geometry analysis (`winning-path-analysis` family), because its output is path-conditioned but has historically informed search-preference hypotheses;
- known-solution-prefix survival as a set-valued observer, interpreting extinction only relative to the supplied known set;
- exact/reference-labelled branch diagnostics as path-seeded but independently adjudicated controls where witness identity is retained;
- hard-prune known-solution replay as a control whose positive label is the selected path itself and whose soundness claim is explicitly path-population-wide rather than a claim of solution completeness.

Frozen sensitivity classification: stable across substantially different valid oracles; quantitatively sensitive but qualitatively stable; qualitatively path-sensitive; provenance/dependency-stratum-sensitive; or uninterpretable because path choice co-varies with another variable.

Frozen control rule: within the seven IDs, classify current-production solved/miss status only from pre-existing authoritative production evidence. Do not choose or discard an ID after observing path sensitivity. If this fixed cohort does not contain both roles, add no hand-picked outcome case; instead use the smallest predeclared current solved/miss control surface already attached to the selected diagnostic and label it as an external control.

## Binding inventory and outcomes

Pending. The inventory, measurements, ancestry analysis, information-loss findings, claim propagation, negative findings, discarded analyses, and justified repairs will be appended after this preregistration commit.
