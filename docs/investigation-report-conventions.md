# Investigation report status convention

Use this for new human-authored investigation reports and material revisions to older ones. Generated summaries/raw logs are exempt; their generator metadata is their status.

## Required status block

Place immediately after the title:

```markdown
> **Status:** active | concluded-positive | concluded-negative | inconclusive | superseded | cancelled
> **Last evidence:** YYYY-MM-DD — report, run, or commit that most recently changed the conclusion
> **Decision:** the conclusion readers should act on now
> **Remaining gate:** one concrete measurement/decision, or `none`
```

Use those status values exactly. Put implementation detail in `Decision` or the body, not free-form status text.

For top-level dated reports created on or after **2026-08-20**, `npm run check:documentation-links` enforces this block. A generated top-level dated report may opt out only with `<!-- report-metadata: generated -->` immediately after its title. Generated collection reports use their collection/generator conventions.

## Rules

- **Active** means actually underway or queued with an owner/prerequisite; mere possibilities belong in the current queue/deferral doc.
- **Inconclusive** names the evidence that would resolve it. If buying more evidence is not worthwhile, use `cancelled` and say why.
- **Superseded** links its replacement; preserve the old evidence.
- **Cancelled** explains why the original scope is no longer decision-relevant and any reopen condition.
- **Remaining gate** is the smallest decision-bearing check, with population/acceptance criterion when known.
- When a later report closes a gate, link both directions.
- An A/B applies to the implementation it tested. If participation, budget, ordering, applicability, candidate set, or interactions materially change, state whether the old verdict still applies.
- Retained default-off solver code is not automatically active work. Reconcile against [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md); code polarity is not promotion status.

## Where information belongs

| Information | Canonical home |
|---|---|
| Current product/solver behavior | Topic reference under `docs/` |
| Ranked solver optimization work | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Solver research method/promotion rules | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| Broader deferred/reopen ideas | [`future-work.md`](future-work.md) |
| Retained/default-off dispositions | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Family/variant method/resource | [`variant-level-research.md`](variant-level-research.md) |
| One experiment's evidence | Dated file under `reports/` |
| Generated results | Relevant `reports/` collection |
| Raw run/shard output | `logs/` |
| Completed plan/handoff | [`archive/`](archive/README.md) |
| Durable architecture decision | [`adr/`](adr/) |

Historical evidence may remain outside its canonical home, but must not present itself as a competing live queue. Long dated notebooks with stable replacements should be frozen under `archive/snapshots/` and left with a compact compatibility pointer/current contract.

## Closing checklist

Before calling an investigation complete:

1. Set the final status and remove stale active wording.
2. Link final evidence and separate measurement from inference.
3. Update the current surface that owns the decision: queue, opt-in ledger, or deferred-work index as appropriate.
4. Ensure feature/flag descriptions do not advertise a stale gate.
5. Update the authoritative topic/tool contract if reusable behavior changed.
6. Add predecessor/successor links for follow-ups.
7. If implementation changed after the decisive A/B, explicitly decide whether the verdict still applies; otherwise record a new gate.
8. Archive concluded plans/notebooks when they make current-state retrieval harder.
9. Run `npm run check:documentation-links`.

This convention is prospective. Older reports need not be reformatted unless revised, but stale status discovered in them must still be reconciled with current authorities.
