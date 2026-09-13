from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}')
    p.write_text(text.replace(old, new, 1))

replace_once(
    'scripts/solver-parallel/race-stage-parity-node-test.mjs',
    "        'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry', 'late-repair-search',\n        'guidance-goal-distance-retry', 'late-repair-multiseed-retry',\n",
    "        'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry', 'late-repair-search',\n        'late-repair-must-turn-biased-retry', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry',\n",
)
replace_once(
    'scripts/solver-parallel/race.mjs',
    "// repair-elite-prefix-dfs-retry, must-cross-neighbor-prune-disabled-retry, late-repair-search, repair-shrink-\n// recovery) is sequential-only — this file does not reimplement a different, narrower ladder for\n",
    "// repair-elite-prefix-dfs-retry, must-cross-neighbor-prune-disabled-retry, late-repair-search,\n// late-repair-must-turn-biased-retry, repair-shrink-recovery) is sequential-only — this file does\n// not reimplement a different, narrower ladder for\n",
)
