# Hint evidence Phase 8 six-store migration repair — 001

> **Status:** active
> **Last evidence:** 2026-09-24 — the six-store migration transaction completed losslessly and idempotently; later exact-head closeout exposed and corrected a family-level validator-domain mismatch, but the corrected whole-store referee proof still requires a green exact-head run.
> **Decision:** Preserve the six-store migration as valid physical/semantic migration evidence; do not treat Phase 8 or the whole program as finally closed until the permanent whole-store referee validator succeeds on the exact closing head.
> **Remaining gate:** corrected six-store census + whole-store PLAY-referee validation must pass in the hostile audit / closeout canary on the same exact head as the remaining program gates.
>
> **Source commit:** `ee22ef8c5c760e46a51573f401124c1ffc181030`
>
> **Migration data commit:** `9ea3003b8fbb5ad323db29a38ef73907a4d1df28`
>
> **Workflow run:** `36065570267`

## Finding corrected

The original Phase-8 bulk migration claimed to cover the full tracked Hint corpus but processed only
1,962 artifacts in the published, stress-1 and stress-random stores. A hostile repository-tree audit
found three additional canonical stores written through the same shared Hint I/O contract:

- `data/stress/hints-envelope/`: 124 artifacts;
- `data/families/hints/`: 788 artifacts;
- `data/families/phaseB/hints/`: 477 artifacts.

Those 1,389 artifacts were still schema v3.

## Executed repair

The migration tool now discovers canonical Hint directories mechanically. A full Actions checkout
found **six stores / 3,351 artifacts** and ran the existing semantic-preserving v4 transaction over
all of them. Exactly **1,389 files changed**. The result contains **269,670 Hints** and **845,435
provenance events**, represented as 1,355 sparse-inline and 1,996 interned artifacts.

For every artifact, decode → encode → decode preserved the expanded semantic hash and the
cross-resource join-identity hash. An immediate second full pass reported **0 changed files**.

The complete per-file manifest was uploaded as Actions artifact `10835949903`, digest
`sha256:a4f282fab7487c2ffe43980a4d680a2573cf760992d369994f0547297d895759`.
That convenience artifact expires, so the durable machine record beside this report also records how
to regenerate the exact manifest from the immutable pre-repair source commit.

## Corrected storage economics

The repair batch by itself changes 574,204,800 bytes to 574,394,797 bytes, because the small omitted
family/envelope artifacts do not individually benefit from the same v4 representation economics as
the large provenance-heavy stores.

The meaningful Phase-8 comparison is all six stores before **any** bulk v4 migration versus the final
all-six-store state:

- raw: **734,618,282 → 574,394,797 bytes**, down **160,223,485 bytes (21.81%)**;
- gzip: **23,131,040 → 21,364,458 bytes**, down **1,766,582 bytes (7.64%)**.

So the plan's material-storage-reduction exit remains satisfied, but only after correcting the
population denominator. “Every migrated file gets smaller” is not an invariant and should not be
claimed.

## Referee proof caveat

The temporary migration workflow included a whole-store referee step, but its shell used a pipeline
without `pipefail`. The validator's output artifact is empty, so that step is **not accepted as
closeout evidence**, despite GitHub marking the shell step successful.

The permanent hostile audit now runs both the six-store census and whole-store PLAY-referee validator
directly. Its first mechanically complete exact-head run then exposed a second validation issue:
65 family-store levels exceeded the ordinary player/editor 15x15 ceiling. Those are intentional
research-family dimensions, not corrupt Hint evidence. The validator now relaxes only that size
ceiling for the two canonical family stores while retaining the shared raw-level parser and the same
PLAY path referee; an oversized-family regression fixture covers the distinction.

Final Phase-8 closeout still requires the corrected whole-store validator to succeed on the exact
program-closing head.

## Durable evidence

- Machine summary: `reports/2026-09-24-hint-evidence-phase8-six-store-repair-001.json`.
- Original three-store migration report:
  `reports/2026-09-24-hint-evidence-phase8-bulk-migration-001.md`.
- Full hostile closeout:
  `reports/2026-09-24-hint-evidence-hostile-completion-audit-001.md`.
