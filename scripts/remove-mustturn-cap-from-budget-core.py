from pathlib import Path
p = Path('modules/solver/stage-budget-core.ts')
text = p.read_text()
block = """\n/** Default-off integration-test dose for the additive must-turn-biased retry immediately\n * after late-repair-search. 7M is the smallest matched-node dose that reproduced both\n * R02768 (1,179,294) and R02180 (6,206,072) while same-dose standard repair failed.\n * Keep separate from REPAIR_LATE_PROBE_NODE_BUDGET until population economics earn promotion. */\nexport const REPAIR_LATE_MUSTTURN_BIASED_RETRY_NODE_BUDGET = 7_000_000;\n"""
if text.count(block) != 1:
    raise SystemExit(f'expected one experiment-cap block, found {text.count(block)}')
p.write_text(text.replace(block, '', 1))
