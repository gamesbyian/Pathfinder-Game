# Audit Analysis Playbook

Use this playbook when you want to measure solver changes and decide whether an observed result is a real improvement or run-to-run variance.

## Commands

### 1) Produce a fresh full audit export

```bash
npm run audit:newhint:full
```

### 2) Analyze latest window (default = last 3 raw exports)

```bash
npm run audit:analyze-failures
```

### 3) Analyze a wider window

```bash
node scripts/analyze-audit-failures.mjs --window 5
```

### 4) Track a different borderline level

```bash
node scripts/analyze-audit-failures.mjs --level 74
```

### 5) Compare explicit files directly

```bash
node scripts/analyze-audit-failures.mjs 2026-03-28T22-37-50Z-6ccd6b9bd89e.json 2026-03-28T23-20-53Z-ae7d45424ab9.json
```

## Interpreting output

- `persistent` failures (present in all runs) are best targets for core solver upgrades.
- `volatile` failures (only in some runs) indicate borderline cases and ordering/budget sensitivity.
- Level trajectory output helps verify if a level is deterministically broken or fluctuating.

## Prompt template for Codex

Use this after solver changes:

> I changed solver code. Please run a full audit analysis.\
> 1) Compare newest run vs previous run and vs a last-3 baseline.\
> 2) Report net solve delta, introduced failures, recovered failures, persistent failures, and volatile failures.\
> 3) Classify each changed level as likely deterministic change vs variance.\
> 4) Focus on borderline behavior for level 50 (or level X).\
> 5) Propose next solver-general improvements only (no level-specific behavior, no hint-guided behavior).

## 2× budget experiment prompt

If you want to test "is this mainly budget-limited?":

> Temporarily run a 2× max-time/budget experiment for full audits, execute 3 runs, and compare against the last 3 baseline runs.\
> Report which failures became stable solves, which remained persistent, how many stayed volatile, and the time-cost increase.

Use this experiment as a diagnostic, not automatically as the long-term runtime policy.
