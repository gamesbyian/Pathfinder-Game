# Investigation report status convention

Use this convention for new human-authored investigation reports and when materially revising an
older report. Generated summaries and raw logs are exempt: their generator metadata is their status.

## Required status block

Place this block immediately after the title:

```markdown
> **Status:** active | concluded-positive | concluded-negative | inconclusive | superseded | cancelled
> **Last evidence:** YYYY-MM-DD — report, run, or commit that most recently changed the conclusion
> **Decision:** the conclusion readers should act on now
> **Remaining gate:** one concrete measurement/decision, or `none`
```

Rules:

- **Active** means work is actually underway or queued with an owner/prerequisite. A merely possible
  future experiment is deferred work and belongs in [`future-work.md`](future-work.md), not under an
  indefinite active label.
- **Inconclusive** must say what evidence would resolve it. If no further evidence is worth buying,
  use `cancelled` and state why.
- **Superseded** must link to the replacement. Preserve the old evidence; do not silently rewrite a
  historical result to look as though it used the newer method.
- **Cancelled** is a conclusion, not a failure. Name why finishing the original scope is no longer
  decision-relevant and the condition, if any, that would justify reopening it.
- A **remaining gate** is not a wish list. Name the smallest decision-bearing check, its population,
  and the acceptance criterion where those are known.
- When a later report closes a gate, update both ends: add a resolution note to the older report and
  link the older premise from the closing report.

## Where information belongs

| Information | Canonical home |
|---|---|
| Current product or solver behavior | Topic reference under `docs/` |
| Current open queue and deferral triggers | [`future-work.md`](future-work.md) |
| One experiment's evidence and decision | Dated file under `reports/` |
| Generated results | The relevant `reports/` collection, indexed by its synthesis/README |
| Raw console/shard output | `logs/` |
| Completed plan or handoff | [`archive/`](archive/README.md) |
| Durable architecture decision | [`adr/`](adr/) |

## Closing checklist

Before calling an investigation complete:

1. Update the status block and remove “in progress” language that is no longer historical context.
2. Link the final evidence and distinguish measured facts from inference.
3. Update `future-work.md` to remove, close, or narrow the old queue item.
4. Update the authoritative topic doc if current behavior or guidance changed.
5. Add reciprocal predecessor/successor links for a follow-up chain.
6. Run `npm run check:documentation-links`; it validates both file targets and heading anchors.

This convention is prospective. Older reports need not be mechanically reformatted unless they are
being revised, but stale status discovered in them must still be reconciled with the live queue.
