# Post-naming semantic regression audit — 2026-09-20

## Scope

Baseline: completed repository-wide naming cleanup through the Phase-15 completion seal, PR #1648.

This pass inspected durable vocabulary introduced after that baseline, with emphasis on current executable/file/schema identities; recurring solver-research concepts that crossed from prose into current authorities; reuse of terms deliberately narrowed or retired during naming cleanup; metaphorical/conversational labels that may have hardened into architecture; and active integration work (#1938/#1939) where a bad durable name is still cheap to fix before settlement.

Frozen historical reports/PR titles are not rename targets merely because their language is informal.

## Classification

Use four dispositions:
- **misleading durable name** — current name makes a false or materially confusing semantic claim;
- **ambiguous but qualified** — imperfect term, but qualification/current role keeps it understandable;
- **prose shorthand only** — metaphor/nickname is useful explanatory language and has not become a machine boundary;
- **historical/frozen** — preserve for provenance.

## Findings

### N1 — `paired-beam-width-frontier-oracle` is not an oracle

**Disposition:** misleading durable name; implementation prepared in PR #1945.

Current surfaced identities include `scripts/stress/paired-beam-width-frontier-oracle.mjs`, its node test, and package/current-doc references.

The tool compares isolated 2K/5K beam-frontier support at matched checkpoints. It is a diagnostic/comparison over solver-produced frontier states. It is not an independent reference implementation or authority.

This directly conflicts with the permanent naming contract: **oracle** is reserved for an independent reference implementation or authority. Phase 15 also deliberately moved CP-SAT result vocabulary from generic oracle language to reference terminology.

Recommended canonical shape: an operation-first name such as `compare-paired-beam-width-frontier-support.mjs` or `analyze-paired-beam-width-frontier-support.mjs`. The first is preferable if the primary contract is symmetric comparison.

Also inspect nearby prose such as “consumer oracle” and use **reference upper bound**, **offline upper bound**, or another literal role when no independent authority exists.

### N2 — `solver-capability-memory` conflates offline evidence with solver memory

**Disposition:** misleading durable name after consumer census; bounded current-surface rename prepared in PR #1945.

The concept is durable across `docs/solver-capability-memory.md`, `scripts/solver-capability-memory.mjs` and library/test surfaces, plus level-blindness, reasoning-capability, workstream, research-system and experiment-closeout documentation.

Its own authority opens by explaining that it is a **durable offline-research contract and derived-analysis interface**, then needs a full “What capability memory is not” section. Other current docs repeatedly distinguish it from runtime/solve-local memory.

The actual role is preservation and recomposition of historical demonstrated capability evidence. “Memory” implies persistence available to an acting system and collides with genuine solver-memory vocabulary: branch/frontier state, repair-local experience caches, solve-local proof/conflict stores, continuation, etc. The repeated disclaimers are evidence that the name charges comprehension cost.

Candidate literal names: **solver capability evidence** / `solver-capability-evidence`, or **demonstrated capability index** / `solver-demonstrated-capability-index`.

Prefer “capability evidence” if the durable contract is primarily evidence preservation/reconciliation; prefer “index” only if the current interface is structurally an index rather than a broader analytical contract.

Do not rename casually: this concept has broad current consumers and historical references. Perform an explicit current-consumer/persisted-identity census first, preserve frozen reports, and migrate only current surfaces.

A smaller independent defect exists today: the executable `scripts/solver-capability-memory.mjs` is noun-named despite the permanent rule that surfaced research tools should lead with an operation. Any eventual migration should correct both the concept and executable verb.

### N3 — `atlas` reappeared after atlas cleanup, but current qualified uses are not equivalent defects

**Disposition:** ambiguous but qualified; retain for now, watch for machine-surface spread.

Examples include `docs/solver-reasoning-capability-atlas.md` and “residual atlas” research language.

The naming cleanup correctly retired generic `atlas` identities where the implementation actually meant CP-SAT branch-label eligibility, prune-gap labels/directories, or specific reference artifacts. The current **reasoning-capability atlas** genuinely is a human-readable map.

That makes the qualified document defensible. However, new unqualified `atlas*` executable fields/commands/paths should remain suspect because they can falsely imply continuity with the retired CP-SAT/prune-gap surfaces.

“Residual atlas” is less precise than **residual-level classification/map** and should not be promoted into a new schema or executable identity without semantic justification.

### N4 — `microscope`, `nursery`, and similar metaphors are useful prose but should stay prose

**Disposition:** prose shorthand only; no current rename campaign.

Current examples include “single-level microscope” / “topology microscope”, “families as causal microscopes”, and “architecture/research nursery”.

These communicate research posture efficiently, but they do not state a technical operation or data contract. In particular, **family microscope** is exactly the sort of phrase that can originate as convenient conversation language and then acquire accidental architectural authority.

Keep these words in explanatory prose, dated reports, and informal section labels where helpful. At durable boundaries use literal terms such as controlled family contrast, matched family expansion, bounded single-level diagnosis, or deferred architecture candidates.

No bulk prose rewrite is warranted.

### N5 — `shadow mining` is historical method identity, not current architecture

**Disposition:** historical/frozen.

The blind/independent premise-map replication sequence used “shadow mining” as the name of a bounded alternate interrogation method. Its reports and PR lineage are historical evidence and should retain that language.

Do not reuse **shadow** as a generic current relation or data-owner term unless the relation is made explicit (replica, independent reconstruction, alternate analysis, etc.).

### N6 — `freeze-response-guided-contrasts` is semantically acceptable

**Disposition:** retain.

Although commit prose called this a “freezer,” the actual surfaced executable is operation-first: `freeze-response-guided-contrasts`. It creates an immutable contrast manifest before downstream analysis. “Freeze” describes the operation/immutability transition rather than a metaphorical component, so it passes the current naming contract.

### N7 — `response-guided capability invention` is unusual but currently accurate

**Disposition:** retain as a research-program name.

The phrase describes an explicit loop where observed solver-response contrasts nominate the next representation/premise investigation. It does not currently mean runtime response-based routing and the owning docs state the offline/development boundary.

If executable runtime policy ever adopts “response-guided,” qualify the research-program usage or runtime usage so the two cannot be confused.

## Reusable conclusions

1. Naming cleanup needs a **temporal regression lens**: inspect names introduced since the cleanup, not only residue from before it.
2. The strongest signal is semantic overclaim, not ugliness. Names deserve scrutiny when they imply authority, proof, equivalence, persistence, causality, ancestry, or runtime use.
3. Repeated “this is not X” documentation is evidence against the name itself.
4. Conversational metaphors are allowed in prose but should cross into durable interfaces only after semantic normalization.
5. Reintroduction of a retired word is not forbidden, but the new use must be qualified enough to avoid false continuity.
6. Active PRs are part of hygiene when a naming defect can be fixed before merge at dramatically lower cost.

## Immediate actions

- Added a recurring semantic naming-regression subsection to `docs/periodic-repository-hygiene.md`.
- Hardened `docs/naming-and-vocabulary.md` so metaphors/conversational labels are provisional, repeated disclaimers are a naming signal, and reuse of retired vocabulary must not imply false relationships.
- N1 is implemented in PR #1945 as an operation-first frontier comparison with no legacy executable alias.
- N2 is implemented in PR #1945 as **solver capability evidence** across current docs/tooling/registry identities; the old doc path remains only as a historical-link pointer and frozen report names remain unchanged.
