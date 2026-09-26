# Solver research question relations

`solver-research-question-relations.json` is a deliberately small complement to the live queue and report index. It records stable research questions whose relationships are easy to lose when reports are compacted or treatments close.

It is **not** a second execution queue. `solver-optimization-workstreams.md` still owns priority. Dated reports own evidence and verdicts; capability memory owns demonstrated solver capability. This registry owns only the cross-question relationships needed to avoid rediscovery: what answered a question, what a result implies or triggers, what it constrains, what it calibrates or provides a negative control for, and what would reopen the tested form.

## Use

Before opening a materially new solver question, run:

```bash
node scripts/research-status-index.mjs --compact --query=<term>
```

Question records now appear beside matching reports/experiments. `--kind=question` restricts the output to this registry. Question lookup treats hyphens/underscores and ordinary spaces as equivalent, so researcher vocabulary such as `must turn`, `full pool`, or `admissible order` can discover canonical hyphenated identities. Optional `aliases` on a sparse question record are appropriate only when ordinary vocabulary is genuinely different rather than merely differently punctuated, for example `topology` versus `topological`.

Keep the registry sparse. Add or update a question when at least one of these is true:

- the question owns a live gate;
- a result closes a form but exports useful evidence to another question;
- a result triggers or materially constrains another live/deferred question;
- two apparently separate questions are duplicates/supersessions;
- compaction would otherwise make a still-valid premise look unconsidered.

Do not encode every report, level, observation, or speculative idea.

## Bidirectional closeout rule

A result closeout asks both directions:

1. **Inbound:** what existing evidence already answers, constrains, calibrates, or falsifies this question?
2. **Outbound:** which other live/deferred questions did this result answer, trigger, constrain, calibrate, supersede, or provide a negative control for?

Update the relation registry only for material edges. A negative treatment can therefore remain closed while its calibration/control value stays discoverable. This is the missing distinction that capability memory alone cannot represent.

Question-ID relation fields are mechanically checked for dangling targets where their values are question identities (`implies`, `triggeredBy`, `negativeControlFor`, `calibratedBy`, `calibrates`, `supersedes`, `duplicateOf`). `constrainedBy` remains intentionally mixed because some constraints are stable questions while others are dated reports or authority documents.

## Lifecycle reconciliation rule

Question lifecycle is an owning authority, not descriptive fallout from the queue. Whenever evidence changes a workstream from active compute/design into implementation, closure, promotion, defer/reopen, or another materially different gate, reconsider the matching question record in the same change.

Check `state`, `result`, `answeredBy`, `constrainedBy`, `constrains`, `decisionSupport` when present, and `reopensOn`. A closed/reopen-only queue row must not silently retain an `active-candidate` question, and an active/supporting execution row must not silently point at a terminal question unless the row is explicitly satisfying a documented reopen trigger. The existing research-question authority audit is the mechanical backstop; prose and machine state should agree before closeout.

## State semantics

The machine-owned state vocabulary is:

- `active-candidate` — live scientific question; this says nothing about priority rank;
- `closed-negative` — the tracked question is closed negative at its stated scope;
- `closed-tested-form` — one explicitly tested form is closed while broader descendants/reformulations may remain live;
- `concluded-negative` — a completed question with a negative conclusion;
- `concluded-positive` — a completed question with a positive conclusion;
- `deferred-reopen` — not currently live; preserves an explicit trigger/reopen boundary;
- `mixed` — materially mixed evidence/disposition that should not be flattened into positive or negative.

`reopensOn` records the changed premise/evidence needed to revisit a deferred or scoped-closed question.

Do not use `closed-tested-form` for a causal question that the nominal experiment failed to observe. If execution or participation made the intended question unanswered, preserve that question as deferred/open as appropriate and close only the actually tested form in dated evidence.

Stable IDs identify questions, not implementation names. If wording evolves while the causal question stays the same, keep the ID. If the causal question changes materially, create a new ID and relate it through `implies`, `triggeredBy`, `supersedes`, or `duplicateOf` as appropriate.
