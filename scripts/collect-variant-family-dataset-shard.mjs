#!/usr/bin/env node
/**
 * Per-shard driver for collect-variant-family-dataset.yml. For each (level, mode) task in this
 * shard's slice (from plan-variant-family-dataset-shard.mjs): family-generate -> portfolio-solve-sweep --save-hints
 * -> hint-workbench --write-levels (extra solution-diversity pass beyond the first solve). Persists
 * progress after every task (never only at the end -- CLAUDE.md's batch-tool policy) via the same
 * shard-NN.log / shard-NN-summary.jsonl shape family-census-parse-shard-logs.mjs already parses,
 * extended with a `mode` field.
 *
 * Self-throttles against a wall-clock budget (--max-wall-ms) rather than relying solely on the
 * job-level timeout-minutes backstop: the 2026-08-07 census run's shard 1 sat hung for hours past
 * every per-command `timeout` wrapper for a reason never fully diagnosed (log content for a
 * still-running job isn't retrievable via the GitHub API). Checking elapsed wall time before
 * starting each new task and stopping early leaves time for staging/upload to run normally instead
 * of depending entirely on the job timeout's post-cancellation grace period.
 *
 * Usage: node scripts/collect-variant-family-dataset-shard.mjs --shard-file=<path to shard JSON slice>
 *   --nn=<01-60> --progress=<log file> --summary=<jsonl file>
 *   [--budget-ms=86400000] [--node-budget=36000000] [--workers=4] [--seed=20260807]
 *   [--variant-count=10] [--max-wall-ms=20400000] [--run-id=<id>] [--shard-count=60]
 *   [--workflow=collect-variant-family-dataset.yml]
 *
 * MANIFEST EMISSION (experiment-manifest-lib.mjs's validateFamilyEvaluationRunManifest): on
 * completion this writes a validator-compliant family evaluation run manifest to
 * logs/family-census/wide-shard-<NN>/manifest.json, listing every solve-*.json this shard produced
 * as `outputArtifacts` and every family-*.json it generated as `sourceGenerationArtifacts` --
 * family-index-lib.mjs's buildFamilyIndex discovers it by filename (any `manifest.json` under
 * logs/family-census/) and joins it back to the matching evidence rows via outputArtifacts, giving
 * every solve in the dataset its solver commit/budgets/seed provenance instead of leaving it
 * evidence with no recorded producer. `--run-id` should be the SAME value across every shard of one
 * dispatch (e.g. the GitHub Actions run id) so family-index-lib.mjs's per-run shard-agreement check
 * groups them as one run; omitting it skips manifest emission entirely (a local ad hoc rerun that
 * doesn't care about dataset provenance), it is never defaulted to something synthetic that would
 * silently fabricate run identity. `--shard-count` must match the workflow's own total shard count
 * (its own `inputs.shards`) -- a mismatched count fails validateFamilyEvaluationRunManifest's
 * one-based-index-within-count check rather than writing a manifest that under/overstates the run's
 * shape.
 *
 * Budget defaults (2026-08-07 update) match the CURRENT production corpus-2 routine baseline
 * (.github/workflows/solver-stress-refresh.yml's corpus2_node_budget=36000000,
 * corpus2_budget_ms=86400000/non-binding -- see reports/2026-08-01-budget-vs-algorithm.md for why
 * the old 8000ms/20M protocol this script originally used was WALL-CLOCK BINDING, not just a
 * lower ceiling: some of the 2026-08-06 fragile-robust census's "robust" (0/22) classifications
 * may be under-resourced rather than genuinely combinatorially hard). --work-budget is REQUIRED
 * alongside a non-binding --budget-ms, not optional: without it, portfolio-solve-sweep.mjs derives
 * workBudget from budget-ms alone (x DEFAULT_WORK_PER_MS), which at a 24h deadline makes workBudget
 * effectively infinite -- the ladder's own per-attempt fair-division never binds, so the FIRST
 * attempt tried is free to run all the way to --node-budget by itself, leaving every later
 * attempt (repair, diversity, admissible-order) exactly 0 nodes (CLAUDE.md's "near-twin
 * starvation" gotcha). Derived as node-budget x 1.34, the same ratio
 * solver-stress-refresh.yml/solver-highbudget-unsolved-sweep.yml already use.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildFamilyEvaluationRunManifest } from './experiment-manifest-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const SHARD_FILE = args.get('--shard-file');
const NN = args.get('--nn') || '00';
const PROGRESS = args.get('--progress') || `logs/family-census/wide-shard-${NN}.log`;
const SUMMARY = args.get('--summary') || `logs/family-census/wide-shard-${NN}-summary.jsonl`;
const BUDGET_MS = args.get('--budget-ms') || '86400000';
const NODE_BUDGET = args.get('--node-budget') || '36000000';
const WORK_BUDGET = args.get('--work-budget') || String(Math.round(Number(NODE_BUDGET) * 1.34));
const WORKERS = args.get('--workers') || '4';
const SEED = args.get('--seed') || '20260807';
const VARIANT_COUNT = args.get('--variant-count') || '10';
const MAX_WALL_MS = Number(args.get('--max-wall-ms') || 20_400_000); // 340 min default
// Manifest emission is opt-in via --run-id: omitted (every ad hoc/local invocation) is a no-op,
// never a synthetic/fabricated run identity -- see this file's own header comment.
const RUN_ID = args.get('--run-id') || null;
const SHARD_COUNT = Number(args.get('--shard-count') || 60);
const WORKFLOW = args.get('--workflow') || 'collect-variant-family-dataset.yml';
const MANIFEST_OUT = `logs/family-census/wide-shard-${NN}/manifest.json`;

mkdirSync(path.dirname(PROGRESS), { recursive: true });
mkdirSync('data/families/hints', { recursive: true });

const startedAt = Date.now();
const nowStamp = () => new Date().toISOString().slice(11, 19);
const log = (line) => { appendFileSync(PROGRESS, line + '\n'); };
const summarize = (obj) => { appendFileSync(SUMMARY, JSON.stringify(obj) + '\n'); };

function run(cmd, cmdArgs, timeoutMs) {
    try {
        const out = execFileSync(cmd, cmdArgs, {
            timeout: timeoutMs, killSignal: 'SIGKILL', encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { ok: true, out };
    } catch (err) {
        return { ok: false, out: (err.stdout || '') + (err.stderr || ''), error: err.message };
    }
}

const MODE_ABBR = { symmetry: 'sym', 'local-mutant': 'lm', swap: 'swap', 'group-reshuffle': 'gr', 'constrained-shuffle': 'cs' };

function solvedCount(file) {
    try {
        const d = JSON.parse(readFileSync(file, 'utf8'));
        const levels = d.levels || [];
        return { solved: levels.filter((l) => l.ok).length, total: levels.length };
    } catch {
        return { solved: null, total: null };
    }
}

const shard = JSON.parse(readFileSync(path.resolve(process.cwd(), SHARD_FILE), 'utf8'));
log(`[${nowStamp()}] SHARD START ${shard.length} level(s)`);

// Manifest provenance, tracked only for artifacts THIS run actually wrote -- a (level, mode) task
// the idempotency skip above found already present (family + solve both exist) is NOT added here:
// it was produced by some EARLIER run under that run's own commit/budgets, and re-claiming it under
// this run's manifest would misattribute its provenance (the exact "misleading evidence" the
// manifest contract exists to prevent). Sets, not arrays: the same familyFile can legitimately be
// touched by more than one mode in future generator revisions without a duplicate entry.
const outputArtifacts = new Set();
const sourceGenerationArtifacts = new Set();
const corporaSeen = new Set();
const familiesSeen = new Set();
const manifestStartedAt = new Date().toISOString();

let stoppedEarly = false;
for (const entry of shard) {
    if (Date.now() - startedAt > MAX_WALL_MS) { stoppedEarly = true; break; }
    const { id, corpus, corpusPath, modes, group } = entry;
    corporaSeen.add(corpus);
    familiesSeen.add(`${corpus}:${id}`);
    log(`[${nowStamp()}] START ${id}`);
    for (const mode of modes) {
        if (Date.now() - startedAt > MAX_WALL_MS) { stoppedEarly = true; break; }
        const abbr = MODE_ABBR[mode];
        // Per-corpus subdirectory, NOT flat data/families/: family-generate.mjs's sibling-id
        // scheme strips the parent id's leading letter (SIBLING_ID_PREFIX = F<digits>-<mode>-),
        // so published P00001 / corpus-1 S00001 / corpus-2 R00001 all mint "F00001-<mode>-NN".
        // hintsDirFor() (level-data-io.mjs) derives the hints directory from the --out file's own
        // dirname, so separating corpora into their own subdirectory (each getting its own
        // sibling hints/ dir) avoids three different levels' hints colliding in one shared file --
        // no change needed to the shared generator/hint-io tooling.
        mkdirSync(`data/families/${corpus}`, { recursive: true });
        const familyFile = `data/families/${corpus}/family-${id}-${abbr}.json`;
        // Per-corpus subdirectory, same reasoning as familyFile above: corpus-1's stress-levels.json
        // and corpus-2's stress-levels-random.json can (and, confirmed 2026-08-08, do -- R02000)
        // independently contain a level with the same bare id. A flat `solve-${id}-${abbr}.json`
        // path let one corpus's real solve attempt silently overwrite the other's under the same
        // filename -- both landed as "unsolved" so no solved data was lost, but one corpus's actual
        // 36M-node attempt was discarded and never recorded. See
        // reports/families/2026-08-08-r02000-id-collision-fix.md.
        mkdirSync(`logs/family-census/${corpus}`, { recursive: true });
        const solveOutExisting = `logs/family-census/${corpus}/solve-${id}-${abbr}.json`;
        log(`  [${nowStamp()}] mode=${mode}`);

        // Idempotency: a re-dispatch of this workflow (e.g. a targeted backfill after a stuck
        // shard) would otherwise regenerate on top of an already-committed family (family-
        // generate.mjs APPENDS new siblings to an existing --out file rather than replacing it)
        // and re-solve the whole thing from scratch -- wasted compute for a (level,mode) task this
        // branch already has. Checked against the committed family file itself (not just the solve
        // result), since a family file that exists with no matching solve result means generation
        // succeeded but solving didn't finish -- worth actually retrying, not skipping.
        if (existsSync(familyFile) && existsSync(solveOutExisting)) {
            const { solved, total } = solvedCount(solveOutExisting);
            log(`    already have this (family + solve result exist) -- skipping regeneration/re-solve`);
            summarize({ id, mode, solved, total });
            continue;
        }

        const genArgs = ['scripts/run-bundled.mjs', 'scripts/family-generate.mjs', '--',
            `--parent-corpus=${corpusPath}`, `--parent=${id}`, `--mode=${mode}`,
            `--seed=${SEED}`, `--out=${familyFile}`];
        if (mode !== 'symmetry') genArgs.push(`--count=${VARIANT_COUNT}`);
        if (mode === 'group-reshuffle') genArgs.push(`--group=${group}`);
        const gen = run('node', genArgs, 300_000);
        if (!gen.ok) { log(`    generate failed: ${gen.error}`); log((gen.out || '').slice(-2000)); continue; }
        if (!existsSync(familyFile)) { log(`    generate produced 0 variants (no file written) -- skipping solve/hint-workbench`); summarize({ id, mode, solved: 0, total: 0 }); continue; }

        const solveOut = solveOutExisting;
        // 3h hard ceiling per sweep call: generous headroom over the realistic case (node-budget
        // is the real governing constraint now that budget-ms/work-budget are non-binding), but
        // still a genuine finite backstop -- execFileSync's own timeout+SIGKILL, not an external
        // `timeout` wrapper (the mechanism behind the census's still-undiagnosed shard-1 hang).
        const solve = run('node', ['scripts/run-bundled.mjs', 'scripts/portfolio-solve-sweep.mjs', '--',
            `--corpus=${familyFile}`, '--scheduler-mode=production', `--budget-ms=${BUDGET_MS}`,
            `--node-budget=${NODE_BUDGET}`, `--work-budget=${WORK_BUDGET}`, `--workers=${WORKERS}`,
            '--save-hints', `--out=${solveOut}`], 10_800_000);
        if (!solve.ok) log(`    solve failed/timed out: ${solve.error}`);
        // Reached this point past the generate-failure/zero-variant early-continues above, so the
        // family file genuinely is this run's own fresh output. The solve output is recorded only
        // if it actually exists on disk (portfolio-solve-sweep.mjs may still have written partial
        // results even when `solve.ok` is false, e.g. a timeout mid-sweep) -- matching solvedCount's
        // own existsSync-guarded read just below, not the exit-code check alone.
        sourceGenerationArtifacts.add(familyFile);
        if (existsSync(solveOut)) outputArtifacts.add(solveOut);

        const variantN = mode === 'symmetry' ? 7 : VARIANT_COUNT;
        const hw = run('node', ['scripts/run-bundled.mjs', 'scripts/hint-workbench.mjs', '--',
            `--levels-json=${familyFile}`, `--levels=pos:1-${variantN}`,
            '--preset=enumerate-targeted', '--wall-ms=15000', '--write-levels', '--yes=true'], 120_000);
        if (!hw.ok) log(`    hint-workbench failed/timed out: ${hw.error}`);

        const { solved, total } = solvedCount(solveOut);
        summarize({ id, mode, solved, total });
        log(`    ${mode}: solved=${solved}/${total}`);
    }
    log(`[${nowStamp()}] DONE ${id}`);
}

log(`[${nowStamp()}] SHARD END${stoppedEarly ? ' (stopped early: wall-clock budget reached)' : ''}`);
console.log(`Shard ${NN} finished${stoppedEarly ? ' EARLY (budget)' : ''}: ${shard.length} level(s) in slice.`);

// Manifest emission (opt-in via --run-id; see this file's own header comment for why a missing
// --run-id is a silent no-op rather than a fabricated identity). A shard that produced NOTHING new
// (every task idempotency-skipped) still writes a valid, empty-artifact manifest -- an accurate
// record that this run/shard contributed no new evidence, not a reason to omit provenance.
if (RUN_ID) {
    const manifest = buildFamilyEvaluationRunManifest({
        runId: RUN_ID, tool: 'collect-variant-family-dataset-shard.mjs', workflow: WORKFLOW,
        corpora: [...corporaSeen].sort(), families: [...familiesSeen].sort(),
        trove: { manifest: 'data/families/variant-family-dataset-manifest.json', shardFile: SHARD_FILE },
        solverPolicy: { mode: 'production', profile: null, config: null, flags: {}, strictTotalWorkBudget: false },
        budgets: { workUnits: Number(WORK_BUDGET), nodeCeiling: Number(NODE_BUDGET), wallDeadlineMs: Number(BUDGET_MS) },
        seeds: [Number(SEED)], shardCount: SHARD_COUNT, shardIndex: Number(NN),
        startedAt: manifestStartedAt, completedAt: new Date().toISOString(),
        outputArtifacts: [...outputArtifacts].sort(),
        sourceGenerationArtifacts: [...sourceGenerationArtifacts].sort(),
    });
    mkdirSync(path.dirname(MANIFEST_OUT), { recursive: true });
    writeFileSync(MANIFEST_OUT, `${JSON.stringify(manifest, null, 2)}\n`);
    log(`[${nowStamp()}] wrote run manifest ${MANIFEST_OUT} (${outputArtifacts.size} output artifact(s))`);
    console.log(`Wrote run manifest ${MANIFEST_OUT}: runId=${RUN_ID} shard=${Number(NN)}/${SHARD_COUNT} outputArtifacts=${outputArtifacts.size}`);
}
