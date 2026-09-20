#!/usr/bin/env node
/**
 * Aggregates the collect-variant-family-dataset.yml workflow's per-(level,mode) summary lines
 * (logs/family-census/wide-shard-*-summary.jsonl, one line per {id, mode, solved, total}) into a
 * compact coverage/solve-rate report, joined against data/families/variant-family-dataset-manifest.json
 * for corpus. Unlike the fragile-robust census, this run's purpose is building a general reusable
 * variant-family dataset (levels + hints + per-attempt telemetry across corpora/modes), not testing
 * one specific hypothesis -- so the report here is a coverage/health check, not a research finding.
 *
 * Usage: node scripts/merge-variant-family-dataset-shards.mjs --in-dir=logs/family-census
 *   [--manifest=data/families/variant-family-dataset-manifest.json] [--out=<report.md>]
 *
 * The failure-provenance attempts consolidation (below) is chunked at ~40MB/file
 * (ATTEMPTS_CHUNK_BYTES) -- the 2026-08-07 first run's unchunked corpus2 file came out at 170.60MB,
 * which GitHub's server-side pre-receive hook hard-rejects at 100MB/file (GH001), atomically
 * failing the ENTIRE combine commit (including the other 59 shards' legitimate levels/hints data,
 * not just the oversized file). 40MB leaves comfortable margin under that cap.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const IN_DIR = args.get('--in-dir') || 'logs/family-census';
const MANIFEST = args.get('--manifest') || 'data/families/variant-family-dataset-manifest.json';
// New runs single-write the stable canonical Phase-15E report path. Genuine historical
// 2026-08-07-wide-trove-* artifacts remain frozen and are discovered by family-index-lib.mjs.
const OUT = args.get('--out') || 'reports/families/variant-family-dataset-summary.md';
const ATTEMPTS_DIR = path.resolve(process.cwd(), 'reports/families');
const CANONICAL_ATTEMPT_RE = /^variant-family-dataset-attempts-[A-Za-z0-9_-]+-part\d+\.json$/;

const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), MANIFEST), 'utf8'));
const taskKey = (corpus, id, mode) => `${corpus}|${id}|${mode}`;
const levelKey = (corpus, id) => `${corpus}|${id}`;
const manifestTaskKeys = new Set();
const corporaById = new Map();
const taskCorporaByBareKey = new Map();
for (const entry of manifest) {
    if (!corporaById.has(entry.id)) corporaById.set(entry.id, new Set());
    corporaById.get(entry.id).add(entry.corpus);
    for (const mode of entry.modes) {
        const key = taskKey(entry.corpus, entry.id, mode);
        if (manifestTaskKeys.has(key)) throw new Error(`duplicate manifest task identity: ${key}`);
        manifestTaskKeys.add(key);
        const bareKey = `${entry.id}|${mode}`;
        if (!taskCorporaByBareKey.has(bareKey)) taskCorporaByBareKey.set(bareKey, new Set());
        taskCorporaByBareKey.get(bareKey).add(entry.corpus);
    }
}
function uniqueCorpusForId(id) {
    const corpora = corporaById.get(id);
    return corpora?.size === 1 ? [...corpora][0] : null;
}

// Deduped by (id, mode), keeping the LAST occurrence: collect-variant-family-dataset-shard.mjs's
// progress files are append-only (appendFileSync), and a re-dispatch of an already-committed shard re-checks
// out that shard's summary file WITH its prior committed lines already in it -- every task the
// shard re-visits (even ones its own idempotency check skips regenerating) gets logged a second
// time. Confirmed 2026-08-07: shard 1's summary file, re-touched by the shard-8/enrich-existing
// backfill dispatch, had exactly 2x lines for every one of its 128 tasks. Without deduping here,
// re-dispatching a partially-complete run silently inflates every solve-rate number in the report
// (a task counted N times for N dispatches that ever touched its shard), even though the underlying
// data files themselves stay correctly deduplicated by the idempotency check.
const rowByKey = new Map();
const ambiguousLegacySummaryRows = [];
const inDirAbs = path.resolve(process.cwd(), IN_DIR);
if (existsSync(inDirAbs)) {
    for (const file of readdirSync(inDirAbs).filter((f) => /^wide-shard-\d+-summary\.jsonl$/.test(f))) {
        const text = readFileSync(path.join(inDirAbs, file), 'utf8');
        for (const line of text.split('\n')) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                let corpus = parsed.corpus ?? null;
                if (corpus == null) {
                    const candidates = taskCorporaByBareKey.get(`${parsed.id}|${parsed.mode}`) ?? new Set();
                    if (candidates.size === 1) corpus = [...candidates][0];
                    else {
                        ambiguousLegacySummaryRows.push({ file, id: parsed.id, mode: parsed.mode, candidateCorpora: [...candidates].sort() });
                        continue;
                    }
                }
                const key = taskKey(corpus, parsed.id, parsed.mode);
                if (!manifestTaskKeys.has(key)) {
                    throw new Error(`summary row is not an authored manifest task: ${key}`);
                }
                rowByKey.set(key, { ...parsed, corpus });
            } catch (err) {
                if (err instanceof SyntaxError) continue; // partial last line from a killed shard
                throw err;
            }
        }
    }
}
const rows = [...rowByKey.values()];

const expectedTasks = manifestTaskKeys.size;
console.log(`Parsed ${rows.length} namespaced (level,mode) result(s) against ${expectedTasks} expected tasks.`);
if (ambiguousLegacySummaryRows.length) {
    console.log(`Excluded ${ambiguousLegacySummaryRows.length} ambiguous legacy summary row(s) whose bare id/mode exists in multiple corpora.`);
}

const byCorpus = {};
const byMode = {};
for (const r of rows) {
    (byCorpus[r.corpus] ??= []).push(r);
    (byMode[r.mode] ??= []).push(r);
}

function summarize(rowsSubset, label) {
    const withTotal = rowsSubset.filter((r) => r.total > 0);
    const levels = new Set(rowsSubset.map((r) => r.id)).size;
    const solvedVariants = withTotal.reduce((a, r) => a + r.solved, 0);
    const totalVariants = withTotal.reduce((a, r) => a + r.total, 0);
    const tasksWithZeroVariants = rowsSubset.length - withTotal.length;
    return `| ${label} | ${rowsSubset.length} | ${levels} | ${solvedVariants}/${totalVariants} | ${totalVariants ? (100 * solvedVariants / totalVariants).toFixed(1) : '-'}% | ${tasksWithZeroVariants} |`;
}

const lines = [];
lines.push('# Variant-family dataset: generation + solve + hint-extraction coverage');
lines.push('');
lines.push(`${rows.length}/${expectedTasks} namespaced (corpus, level, mode) tasks completed (${manifest.length} levels in manifest across published/corpus1/corpus2).`);
if (ambiguousLegacySummaryRows.length) {
    lines.push('');
    lines.push(`**Legacy identity warning:** ${ambiguousLegacySummaryRows.length} bare-id summary row(s) were excluded because the same id/mode is authored in multiple corpora. They cannot be assigned safely without corpus identity.`);
}
lines.push('');
lines.push('A "0-variant" task is a level with no eligible objects for that mode (e.g. local-mutant');
lines.push('on a level with zero movable objects) -- expected, not a failure.');
lines.push('');
lines.push('## By corpus');
lines.push('');
lines.push('| Corpus | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |');
lines.push('|---|---|---|---|---|---|');
for (const [c, rs] of Object.entries(byCorpus)) lines.push(summarize(rs, c));
lines.push('');
lines.push('## By mode');
lines.push('');
lines.push('| Mode | Tasks | Levels | Variants solved | Solve rate | 0-variant tasks |');
lines.push('|---|---|---|---|---|---|');
for (const [m, rs] of Object.entries(byMode)) lines.push(summarize(rs, m));
lines.push('');

const missingTaskKeys = new Set(manifestTaskKeys);
const missingLevelKeys = new Set(manifest.map((e) => levelKey(e.corpus, e.id)));
for (const [key, row] of rowByKey) {
    missingTaskKeys.delete(key);
    missingLevelKeys.delete(levelKey(row.corpus, row.id));
}
lines.push(`## Coverage gaps`);
lines.push('');
lines.push(`${missingTaskKeys.size} manifest task(s) are incomplete. First 50:`);
lines.push('');
lines.push([...missingTaskKeys].slice(0, 50).join(', ') || '(none)');
lines.push('');
lines.push(`${missingLevelKeys.size} namespaced manifest level(s) have zero completed tasks. First 50:`);
lines.push('');
lines.push([...missingLevelKeys].slice(0, 50).join(', ') || '(none)');

// Failure provenance: solve-<id>-<abbr>.json (portfolio-solve-sweep's own --out format,
// {summary, levels:[{...full per-attempt record: attempts, failedStrategies, nodesExpanded,
// winningConfig, ...}]}) already carries the WHY behind every unsolved variant, not just pass/
// fail -- it's just scattered across ~7800 small per-task files with no index. This merges every
// one's single level entry (tagged with parentId/mode/corpus) into per-corpus combined files in
// the SAME {levels:[...]} shape scripts/stress/rank-levels.mjs and
// scripts/stress/cluster-unsolved-failures.mjs already know how to read, so this dataset's failure
// data is queryable with the existing corpus-analysis tooling, not just readable.
const ABBR_TO_MODE = { sym: 'symmetry', lm: 'local-mutant', swap: 'swap', gr: 'group-reshuffle', cs: 'constrained-shuffle' };
const solveFileRe = /^solve-([A-Za-z]\d+)-(sym|lm|swap|gr|cs)\.json$/;
const KNOWN_CORPUS_DIRS = new Set(['published', 'corpus1', 'corpus2']);
const attemptsByCorpus = {};
function ingestSolveFile(filePath, file, corpusOverride) {
    const m = solveFileRe.exec(file);
    if (!m) return;
    const [, parentId, abbr] = m;
    // corpusOverride (the subdirectory a solve file lives in, e.g. logs/family-census/corpus2/)
    // is authoritative and disambiguates same-id collisions across corpora (confirmed 2026-08-08:
    // corpus-1's stress-levels.json and corpus-2's stress-levels-random.json both independently
    // contain an id "R02000" -- a flat, non-namespaced solve path let one corpus's real solve
    // attempt silently overwrite the other's). Falls back to the id->corpus manifest lookup only
    // for the legacy flat files predating the per-corpus solve-output layout.
    const corpus = corpusOverride ?? uniqueCorpusForId(parentId) ?? 'unknown';
    let parsed;
    try { parsed = JSON.parse(readFileSync(filePath, 'utf8')); } catch { return; }
    for (const levelResult of parsed.levels || []) {
        (attemptsByCorpus[corpus] ??= []).push({
            ...levelResult,
            parentId,
            parentCorpus: corpus,
            mode: ABBR_TO_MODE[abbr],
        });
    }
}
if (existsSync(inDirAbs)) {
    for (const entry of readdirSync(inDirAbs, { withFileTypes: true })) {
        if (entry.isFile()) {
            ingestSolveFile(path.join(inDirAbs, entry.name), entry.name, null);
        } else if (entry.isDirectory() && KNOWN_CORPUS_DIRS.has(entry.name)) {
            const subDir = path.join(inDirAbs, entry.name);
            for (const file of readdirSync(subDir)) ingestSolveFile(path.join(subDir, file), file, entry.name);
        }
    }
}
const ATTEMPTS_CHUNK_BYTES = 40 * 1024 * 1024; // ~40MB/file, well under GitHub's 100MB hard cap
// Stable filenames are reused across current runs. Remove only prior canonical chunks before
// writing so a smaller rerun cannot leave stale partNN files masquerading as current evidence.
// Historical wide-trove chunks are permanent read-only evidence and are never touched here.
mkdirSync(ATTEMPTS_DIR, { recursive: true });
for (const file of readdirSync(ATTEMPTS_DIR)) {
    if (CANONICAL_ATTEMPT_RE.test(file)) unlinkSync(path.join(ATTEMPTS_DIR, file));
}
let totalAttemptRecords = 0;
let totalAttemptFiles = 0;
for (const [corpus, levels] of Object.entries(attemptsByCorpus)) {
    let part = 1;
    let buf = [];
    let bufBytes = 0;
    const flush = () => {
        if (!buf.length) return;
        const outPath = path.resolve(process.cwd(),
            `reports/families/variant-family-dataset-attempts-${corpus}-part${String(part).padStart(2, '0')}.json`);
        writeFileSync(outPath, JSON.stringify({ levels: buf }));
        console.log(`Wrote ${buf.length} full attempt record(s) (~${(bufBytes / 1024 / 1024).toFixed(1)}MB) to ${outPath}.`);
        totalAttemptFiles++;
        part++; buf = []; bufBytes = 0;
    };
    for (const levelResult of levels) {
        const recordBytes = Buffer.byteLength(JSON.stringify(levelResult), 'utf8');
        if (bufBytes + recordBytes > ATTEMPTS_CHUNK_BYTES && buf.length) flush();
        buf.push(levelResult);
        bufBytes += recordBytes;
    }
    flush();
    totalAttemptRecords += levels.length;
}
lines.push('');
lines.push('## Failure provenance');
lines.push('');
lines.push(`${totalAttemptRecords} full per-variant attempt records (attempts, failedStrategies, nodesExpanded,`);
lines.push(`winningConfig -- not just solved/total) consolidated into ${totalAttemptFiles} file(s):`);
lines.push('`reports/families/variant-family-dataset-attempts-<corpus>-part<NN>.json`, chunked at ~40MB/file');
lines.push('(GitHub hard-rejects any single pushed file over 100MB) -- concatenate a corpus\'s parts\' `levels`');
lines.push('arrays to reconstruct the full per-corpus set. Each part is independently in the same');
lines.push('`{levels:[...]}` shape `scripts/stress/rank-levels.mjs` / `cluster-unsolved-failures.mjs` already read.');

writeFileSync(path.resolve(process.cwd(), OUT), lines.join('\n') + '\n');
console.log(`Wrote ${OUT}.`);
