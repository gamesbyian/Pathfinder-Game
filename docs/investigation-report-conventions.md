# Investigation report status convention

Use this convention for new human-authored investigation reports and when materially revising an older report. Generated summaries and raw logs are exempt: their generator metadata is their status.

## Required status block

Place this block immediately after the title:

```markdown
> **Status:** active | concluded-positive | concluded-negative | inconclusive | superseded | cancelled
> **Last evidence:** YYYY-MM-DD — report, run, or commit that most recently changed the conclusion
> **Decision:** the conclusion readers should act on now
> **Remaining gate:** one concrete measurement/decision, or `none`
```

Use the status values exactly as written above. Do not replace `Status` with free-form prose such as "built, locally validated"; put that detail in `Decision` or the body so status remains cheaply searchable and comparable across reports.

For top-level dated reports created on or after **2026-08-20**, `npm run check:documentation-links` enforces this block. A generated top-level dated report may opt out only by placing `<!-- report-metadata: generated -->` immediately after its title; generated reports in collection subdirectories remain governed by their generator/run metadata and collection conventions.

Rules:

- **Active** means work is actually underway or queued with an owner/prerequisite. A merely possible future experiment is deferred work and belongs in the relevant current queue/deferral document, not under an indefinite active label.
- **Inconclusive** must say what evidence would resolve it. If no further evidence is worth buying, use `cancelled` and state why.
- **Superseded** must link to the replacement. Preserve the old evidence; do not silently rewrite a historical result to look as though it used the newer method.
- **Cancelled** is a conclusion, not a failure. Name why finishing the original scope is no longer decision-relevant and the condition, if any, that would justify reopening it.
- A **remaining gate** is not a wish list. Name the smallest decision-bearing check, its population, and the acceptance criterion where those are known.
- When a later report closes a gate, update both ends: add a resolution note to the older report and link the older premise from the closing report.
- **An A/B belongs to the exact implementation it tested.** If a later commit materially changes a feature's participation, budget, ordering, applicability, random-candidate set, or interaction with another technique, explicitly state whether the old A/B still answers the current promotion question. Never silently carry a promotion verdict across materially different wiring. The `PRUNE_MC_NEIGHBOR_BUDGET` post-A/B repair-random-selection change is the standing example.
- **Retained opt-in code is not automatically active work.** For solver default-off mechanisms, reconcile the dated report against [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md). `OPT_IN_FEATURES` records production polarity, not whether a promotion decision remains open.

## Where information belongs

| Information | Canonical home |
|---|---|
| Current product or solver behavior | Topic reference under `docs/` |
| Ranked priority for optimizing existing solver techniques | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Solver research method, failure classification, and promotion rules | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| Broader deferred/reopen solver ideas | [`future-work.md`](future-work.md) |
| Current disposition of retained/default-off solver experiments | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Variant/family resource and controlled-family method | [`variant-level-research.md`](variant-level-research.md) |
| One experiment's evidence and decision | Dated file under `reports/` |
| Generated results | The relevant `reports/` collection, indexed by its synthesis/README |
| Raw console/shard output | `logs/` |
| Completed plan or handoff | [`archive/`](archive/README.md) |
| Durable architecture decision | [`adr/`](adr/) |

A document may preserve historical evidence outside its current canonical home, but it must not call itself a competing live queue. Long dated notebooks that have acquired a stable replacement should be frozen under `docs/archive/snapshots/` and left with a compact compatibility pointer or current contract at the old path.

## Closing checklist

Before calling an investigation complete:

1. Update the status block and remove “in progress” language that is no longer historical context.
2. Link the final evidence and distinguish measured facts from inference.
3. Update the current surface that actually owns the decision: `solver-optimization-current-queue.md` for ranked optimization work, `solver-opt-in-experiment-ledger.md` for default-off mechanisms, and `future-work.md` only when the broader deferred/reopen landscape changes.
4. Ensure the corresponding `FEATURES` description does not advertise a stale promotion gate.
5. Update the authoritative topic/tool contract if current behavior or reusable guidance changed.
6. Add reciprocal predecessor/successor links for a follow-up chain.
7. If the implementation changed after the decisive A/B, explicitly decide whether that A/B is still promotion-relevant; if not, record the new gate rather than pretending the old run tested the new wiring.
8. Archive a concluded plan/notebook when keeping it on the active documentation surface would make current-state retrieval harder.
9. Run `npm run check:documentation-links`; it validates file targets, heading anchors, top-level doc indexing, workflow-index coverage, agent-router integrity, opt-in-ledger coverage, and prospective report metadata.

This convention is prospective. Older reports need not be mechanically reformatted unless they are being revised, but stale status discovered in them must still be reconciled with the current topic/queue and, for retained solver opt-ins, with the opt-in experiment ledger.
