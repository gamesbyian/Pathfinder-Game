from pathlib import Path

blocks = {
'reports/2026-09-13-solver-archaeology-backward-diversity-extinction-002.md': (
"Status: historical-evidence follow-up. This report does not change solver behavior or current workstream priority.",
"> **Status:** concluded-positive\n> **Last evidence:** 2026-09-13 — historical follow-up closed the tested static exact-k and backward-bridge forms while preserving one narrow unported retry-adaptation premise.\n> **Decision:** do not restore the tested backward-search forms; preserve the narrower adaptation premise only as historical evidence.\n> **Remaining gate:** require a present-day predictive signal before any revisit of the unported retry-adaptation premise."
),
'reports/2026-09-13-solver-archaeology-diversity-and-reference-lineage-001.md': (
"Status: OPEN / in-progress evidence note. Current priority remains `docs/solver-optimization-workstreams.md`; archaeology register: `docs/solver-archaeology-register.md`.",
"> **Status:** active\n> **Last evidence:** 2026-09-13 — the diversity/portfolio and reference-lineage archaeology targets were opened and evidence accumulation began.\n> **Decision:** continue the evidence note without changing solver behavior or current workstream priority.\n> **Remaining gate:** complete the stated excavation targets and reconcile durable findings into the archaeology register."
),
'reports/2026-09-13-solver-archaeology-february-external-memos-007.md': (
"Status: historical-evidence follow-up. This report preserves chronology corrections, early solver-state lessons, and external-research premises. It does not change solver behavior or current workstream priority.",
"> **Status:** concluded-positive\n> **Last evidence:** 2026-09-13 — retained history was traced back to 2026-02-25 and deleted external-research premises were recovered and reconciled.\n> **Decision:** preserve the chronology corrections and premises as historical evidence; make no solver or priority change from archaeology alone.\n> **Remaining gate:** any revived premise must earn a current, decision-bearing solver experiment before affecting policy."
),
'reports/2026-09-13-solver-archaeology-intersection-commitment-lineage-004.md': (
"Status: historical-evidence follow-up. This report separates the future-crossing premise from several bundled implementations and does not recommend restoring old production mechanisms.",
"> **Status:** concluded-positive\n> **Last evidence:** 2026-09-13 — archaeology separated the future-crossing premise from the bundled hard-prune and synthetic-anchor implementations.\n> **Decision:** preserve the premise/implementation distinction and do not restore the historical production mechanisms.\n> **Remaining gate:** require current residual evidence for a specific descendant before reopening intersection-commitment work."
),
'reports/2026-09-13-solver-archaeology-learning-handoff-003.md': (
"Status: historical-evidence follow-up. This report narrows several premises; it does not change current workstream priority or production behavior.",
"> **Status:** concluded-positive\n> **Last evidence:** 2026-09-13 — failure-learning and producer/consumer handoff mechanisms were separated into materially distinct historical classes.\n> **Decision:** preserve the narrowed premises and distinctions without changing current solver priority or production behavior.\n> **Remaining gate:** require a current producer/consumer failure signal before promoting any historical learning-handoff descendant."
),
'reports/2026-09-13-solver-archaeology-overlap-restart-retention-006.md': (
"Status: historical-evidence follow-up. This report does not change solver behavior or current workstream priority.",
"> **Status:** active\n> **Last evidence:** 2026-09-13 — overlap/restart archaeology confirmed an unfinished categorical-state retention line alongside closed historical mechanisms.\n> **Decision:** preserve the unfinished retention premise as a scoped research lead; make no production or priority change from archaeology alone.\n> **Remaining gate:** close the unfinished retention gate with current evidence before any solver-policy change."
),
'reports/2026-09-13-solver-archaeology-rename-aware-pass-001.md': (
"Status: INTERIM / evidence-preservation report. Current priority remains `docs/solver-optimization-workstreams.md`. The running premise register is `docs/solver-archaeology-register.md`.",
"> **Status:** active\n> **Last evidence:** 2026-09-13 — the rename-aware reverse pass began translating historical solver evidence through the August/September semantic migration.\n> **Decision:** continue the pass as evidence preservation; current solver priority remains owned by the workstream authority.\n> **Remaining gate:** finish the rename-aware pass and reconcile durable premises into the archaeology register."
),
'reports/2026-09-13-solver-archaeology-topology-family-response-005.md': (
"Status: historical-evidence follow-up. Both lines below are observer/analysis opportunities; neither justifies a production solver change by itself.",
"> **Status:** concluded-positive\n> **Last evidence:** 2026-09-13 — archaeology confirmed topology-class and family-response ideas as analysis/observer opportunities rather than production-ready mechanisms.\n> **Decision:** retain both lines as research opportunities; neither changes production solver policy by itself.\n> **Remaining gate:** require current observer/analysis evidence and a decision-bearing solver premise before either line can affect production."
),
}

for filename, (old, new) in blocks.items():
    p = Path(filename)
    text = p.read_text()
    if text.count(old) != 1:
        raise SystemExit(f'{filename}: expected exactly one legacy status line, found {text.count(old)}')
    p.write_text(text.replace(old, new, 1))
