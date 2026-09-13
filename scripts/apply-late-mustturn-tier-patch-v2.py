from pathlib import Path

source_path = Path('scripts/apply-late-mustturn-tier-patch.py')
source = source_path.read_text()
old = '''p = Path('modules/solver/stage-id-normalization.mjs')
text = p.read_text()
old = "'late-repair-search', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry'"
if text.count(old) != 2:
    raise SystemExit(f"stage-id-normalization: expected two list occurrences, found {text.count(old)}")
p.write_text(text.replace(old, "'late-repair-search', 'late-repair-must-turn-biased-retry', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry'"))
'''
new = '''replace_once(
    'modules/solver/stage-id-normalization.mjs',
    "'must-cross-neighbor-prune-disabled-retry', 'late-repair-search', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry', 'legacy-latency-portfolio-pass'",
    "'must-cross-neighbor-prune-disabled-retry', 'late-repair-search', 'late-repair-must-turn-biased-retry', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry', 'legacy-latency-portfolio-pass'",
)
replace_once(
    'modules/solver/stage-id-normalization.mjs',
    "    'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry', 'late-repair-search',\\n    'guidance-goal-distance-retry', 'late-repair-multiseed-retry',",
    "    'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry', 'late-repair-search',\\n    'late-repair-must-turn-biased-retry', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry',",
)
'''
if source.count(old) != 1:
    raise SystemExit(f'wrapper expected one faulty stage-id block, found {source.count(old)}')
source = source.replace(old, new, 1)
exec(compile(source, str(source_path), 'exec'))
