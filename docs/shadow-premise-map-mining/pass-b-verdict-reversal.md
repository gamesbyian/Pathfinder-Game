# Pass B — verdict-reversal audit

## B1 — negative conclusions have better reversal semantics than positive governing assumptions

A clear cluster of rows explicitly models how a negative verdict can be weakened or reopened:

- **P005**: historical negatives become conditional when architecture/population/work contract changes.
- **P137**: a closed tested form does not close its semantic parent.
- **P166**: broad randomization may be closed as a treatment while stochastic diagnosis remains open.
- **P171**: removed tooling can preserve an unresolved premise.

These rows make reversal possible by changing scope, epoch, treatment form, or interpretation.

By contrast, several positive governing premises are recorded with strong status language but no equally explicit observation that would weaken them. **P187** is a “supported governing premise” about non-monotone capability under fixed envelopes; **P198** is a “governing research ladder / newly explicit.” Their evidence summaries provide examples, but the map does not encode a discriminating condition under which those abstractions would cease to be useful or require splitting.

Interpretation: the map is better at preventing over-closure of failed treatments than at specifying falsifiers for successful methodological abstractions.

Alternative: governing abstractions may be intended as organizing definitions rather than empirical hypotheses, so demanding symmetric falsifiers can be category error.

Classification: epistemic/map-record limitation; medium-high confidence.

## B2 — incumbent architecture premises are open but weakly reversible

**P070** calls forward valid-prefix search a “strong incumbent, open premise.” The row gives a reason to question it and names alternative search objects, but no criterion says what evidence would justify retaining the incumbent as adequately dominant for a scoped population.

**P043** (“under-questioned”) and **P011** (“open / naive forms weakened”) show the same pattern: the map says why the incumbent formulation may fail and suggests richer alternatives, but it does not consistently encode what result would rehabilitate a scoped version.

This creates a one-way research ratchet in the representation: incumbents can be problematized more easily than they can be conditionally vindicated.

Alternative: an open-question map need not carry closure criteria for every live architectural question.

Classification: representation/epistemic; medium confidence.

## B3 — “open” often conflates uncertainty with missing decision criteria

Many rows use `open`, `underasked`, or `deferred` status while their evidence summary describes why the question matters, not what observation would discriminate among alternatives. Examples include **P075**, **P179**, **P184**, **P194**, and **P200**.

This is not merely missing experimental detail. It means the status field sometimes records **research attention state** rather than **belief state**. Those are different objects:

- “underasked” means insufficient investigation;
- “open” can mean balanced uncertainty;
- “deferred” can mean known question but low current actionability;
- “major parent” can mean organizing importance without a truth-valued verdict.

The map can therefore support weak inferences if status labels are treated as one epistemic scale.

Alternative: the labels were never intended to form an ordered scale.

Classification: representation limitation; high confidence.

## B4 — some rows carry their own reopening variable and are unusually decision-ready

A smaller subset has unusually clear reversal semantics because the conditioning variable is inside the proposition:

- **P179**: equivalence changes with policy/work envelope.
- **P181**: prevalence changes as the survivor population changes.
- **P182**: technique value changes with predecessor ordering.
- **P188**: observability changes with trace budget/instrumentation.
- **P194**: next-action value changes with failed-work history.

These are structurally stronger research objects because a future observation can often be interpreted by varying a named conditioning variable rather than merely collecting more evidence.

This suggests a useful distinction inside the map between **conditioned propositions** and **attention-state propositions**.

Alternative: named conditioning variables can still be incomplete or wrong.

Classification: conceptual/epistemic; medium-high confidence.

## Negative results

- The audit did not support a claim that the map is generally unfalsifiable. Many negative-result and epoch-sensitive rows explicitly resist permanent closure.
- No reliable ordering of status labels could be inferred. Treating `open`, `underasked`, `deferred`, `supported`, and `governing` as one maturity axis would be representation abuse.
- Reversal criteria were often likely recoverable from source documents, but this pass deliberately tests the fixed map rather than expanding into a source-document archaeology program.

## Pass-B takeaway

The frozen map records **scope-sensitive reopening** substantially better than it records **conditional vindication or falsification of positive governing abstractions**. More importantly, the `status` field mixes belief state, attention state, and research-role labels, so mining it as a single epistemic variable would manufacture structure.
