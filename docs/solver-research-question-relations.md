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

## State semantics

`active-candidate` and `active-diagnostic` indicate live questions, not priority rank. `deferred-reopen` preserves a question with an explicit trigger/reopen boundary but does not authorize current execution. `closed-tested-form` means the stated form is answered; its evidence may still have outgoing relationships. `reopensOn` records the changed premise/evidence needed to revisit it.

Do not use `closed-tested-form` for a causal question that the nominal experiment failed to observe. If execution or participation made the intended question unanswered, preserve that question as deferred/open as appropriate and close only the actually tested form in dated evidence.

Stable IDs identify questions, not implementation names. If wording evolves while the causal question stays the same, keep the ID. If the causal question changes materially, create a new ID and relate it through `implies`, `triggeredBy`, `supersedes`, or `duplicateOf` as appropriate.
