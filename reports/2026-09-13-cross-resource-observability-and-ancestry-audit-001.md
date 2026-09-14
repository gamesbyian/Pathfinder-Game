# Cross-resource observability and ancestry audit 001

> **Status:** active
> **Last evidence:** 2026-09-13 — shared corpus-selection lineage classifier and cross-resource observability runner implemented; manifest-only family evaluation missingness and replay-family identity checks hardened before accepting empirical output.
> **Decision:** investigate the four audited research resources as one evidence system, with special attention to cross-resource coverage, shared ancestry, selection into observability, and apparently independent signals that descend from one historical event.
> **Remaining gate:** ingest the empirical coverage/ancestry run, classify the highest-value clean and contaminated joins, and reconcile any durable compatibility changes.
> **Evidence role:** forensic/discovery; existing data only unless a later bounded question genuinely requires new solver compute.
> **Selection:** all current published/C1/C2 levels for on-main resources, plus existing variant-family manifests from the audited off-main resource; no new variants or solver outcomes.
> **Population identity:** current tracked published/stress corpora at branch base; variant-family manifests are read from `claude/variant-levels-solver-insights-tpk4qg` without materializing the full historical trove.
> **Selection history:** preserve corpus generation/selection ancestry, hint discovery/replay ancestry, profile sample/provenance support, and variant parent/generation ancestry separately.
> **Inference scope:** characterize evidence availability/dependence and nominate bounded mechanism questions; do not infer solver efficacy from resource richness or historical stored successes.

## Questions

1. Which levels/parents have usable evidence from stress/published corpus context, hint provenance, solution profiles, and variant families?
2. Is four-resource coverage concentrated in historically solved, heavily inspected, older, selected, or particular corpus-ancestry strata?
3. Which cross-resource observations are genuinely complementary, and which are repeated representations of one underlying event or family lineage?
4. Where does one resource repair a blind spot in another, and where does joining them compound selection or pseudo-replication?
5. Which existing multi-resource cases are unusually clean candidates for mechanism research aimed at more stress-corpus solves?
6. What small producer/query changes would make useful cross-resource joins easier without creating a second research warehouse?

## Working model

The four resources play different roles but are causally connected:

- **corpus/population:** where a puzzle came from and why it remained in a research population;
- **variant family/intervention:** controlled relatives and transformation/evaluation history;
- **hint provenance/observation lineage:** how a stored accepted path entered the evidence base;
- **solution profile/phenotype:** support-aware summary of the stored known-solution sample.

The dangerous feedback loop is: selected corpus parent -> generated/inspected family -> transferred or newly discovered path -> stored provenance -> changed solution profile -> later population/family selection. Cross-resource agreement is therefore not independent corroboration unless ancestry says it is.

## Method

The audit runner is `scripts/cross-resource-observability-audit.mjs`, with pure aggregation in `scripts/cross-resource-observability-lib.mjs`. It uses:

- `readLevelsWithHints()` for current stored accepted paths;
- the shared provenance origin/dependency-stratum taxonomy for observation ancestry;
- `scripts/corpus-selection-lineage.mjs` for the standing C1/C2 selection strata established by the September 13 reconstruction;
- the existing family-index parser for family manifests;
- support-shape facts from the same known-solution sample consumed by Solution Profiles, without pretending C2 has a tracked profile library or that any sample is the latent complete solution space.

The family side deliberately distinguishes **not mounted** from **mounted with no parent record**. The empirical runner fetches only `*-manifest.json` blobs from the research branch, enough to establish parent/family/variant coverage without buying a 2.5 GB checkout. Because that bounded mount intentionally excludes family evaluation logs, evaluated/solved counts remain `unknown` rather than being reported as zero.

Replay provenance is also cross-checked against the mounted family manifests. For each current parent the analysis records whether replay-referenced family IDs are present under that parent. This turns family -> replay -> profile ancestry from a naming assumption into a checkable join. An absent family mount remains unknown; an actual mounted mismatch is surfaced separately.

The per-level matrix records stored-path count, provenance-event count, within-path dependency strata, replay-touched/replay-only/replay-first paths, chronology support, tracked-versus-derivable profile status, corpus selection stratum, family-parent coverage, and replay-family compatibility. Summary output stratifies those facts by corpus, selection stratum, historical solver-outcome conditioning, family availability, and replay exposure.

## Findings so far

### F1 — selection provenance was authoritative but not composable

The stress-corpus audit established four standing stress strata that materially change inference:

- C1 A-F retained survivors;
- C1 migrated random rows selected for historical solver success;
- C2 original random rows retained from the historical solver-negative complement;
- C2 July-11 replacement rows.

That correction existed in prose/report authority, while `corpus-query` exposed generation ancestry only. A profile/provenance/family analysis therefore had to re-implement or manually remember the most important corpus-selection fact.

Repair on this branch: `scripts/corpus-selection-lineage.mjs` owns the current offline classification, and `corpus-query` exposes `selectionLineage`, summary counts, and `--selection-stratum=` filtering. This is research metadata only and is explicitly not a legal cold-solver feature.

### F2 — family absence needs a three-state interpretation

A normal `main` checkout does not contain the canonical large family resource. Therefore “no indexed family” has two very different meanings: the family resource was not mounted, or it was mounted and the parent truly had no manifest. The cross-resource tool keeps those states separate. This is the same missingness discipline learned from provenance/profile auditing, applied at the resource-availability level.

### F3 — partial resource mounts create their own missingness semantics

The bounded empirical design mounts family manifests but intentionally omits census/evaluation artifacts. The first implementation inherited the family index's `evaluated=false` defaults and would therefore have reported `0 evaluated / 0 solved`, silently converting “not loaded” into negative evidence.

Repair: family-parent coverage now carries `evaluationEvidenceLoaded`; manifest-only runs expose `evaluated:null` and `solved:null`. Numeric counts are produced only when evaluation evidence artifacts were actually indexed. This is a cross-resource form of the same absent-as-false defect found in legacy hint provenance and sparse profile axes.

### F4 — replay ancestry can be verified against family identity rather than inferred from labels

Variant replay provenance already preserves family and parent identity through its dependency-stratum key. The family index independently preserves the families generated under each parent. The audit now intersects those identities and reports matched versus unmatched replay-family lineages.

This matters because a profile may be replay-exposed even when the family trove is not mounted, while a mounted manifest lets us distinguish a real family -> replay -> stored-path lineage from a stale/malformed reference. It also supplies a direct integrity check on the proposed cross-resource ancestry graph without counting the replay as independent evidence.

## Execution note

The first temporary runner attempt failed during Node setup because the branch-only workflow referenced a nonexistent `.nvmrc`. No dependencies, family data, analysis, or evidence run occurred. The runner now uses the repository's normal Node 20 convention. The failed setup attempt is execution plumbing, not an audit result.

## Pending empirical questions

- How concentrated is family-parent coverage across the four standing C1/C2 selection strata?
- How often has variant replay actually touched the stored sample used by profiles, and how often is replay the earliest known discovery of a stored path rather than merely a later rediscovery event?
- Are family-covered levels systematically richer in hints/provenance than non-family levels?
- Do replay family IDs reconcile cleanly against the mounted family manifests?
- How many apparent four-resource cases remain after requiring whole-parent family identity and dependency-aware provenance accounting?
- Which low-replay four-resource cases give the cleanest existing intervention + phenotype + population combinations for mechanism follow-up?
