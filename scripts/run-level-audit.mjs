#!/usr/bin/env node
// Local level-audit driver. Runs the same in-browser audit pipeline as
// scripts/run-audit-export.mjs (full hint-ladder per level, Playwright-driven
// Chromium against a local static server) but lets you target a subset of
// levels for fast iteration. Output JSON is schema-compatible with the
// official audits/raw/latest.json so existing analysis tools work.
//
// Usage:
//   node scripts/run-level-audit.mjs --levels=92
//   node scripts/run-level-audit.mjs --levels=92,108,134
//   node scripts/run-level-audit.mjs --levels=90-95
//   node scripts/run-level-audit.mjs --levels=all
//   node scripts/run-level-audit.mjs --levels=92 --output=audits/local/l92.json
//   node scripts/run-level-audit.mjs --levels=92 --timeout-ms=180000
//   node scripts/run-level-audit.mjs --levels=92 --headed
//
// Default output: audits/local/latest.json (overwritten each run) plus
// audits/local/history/{ISO timestamp}-{sha}.json (kept). When --levels=all
// the output schema matches audits/raw/latest.json exactly. For subsets,
// only the selected levels appear in payload.levels (with their original
// level numbers preserved).

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = Number(process.env.LEVEL_AUDIT_PORT || 4180);
const BASE_URL = `http://${HOST}:${PORT}`;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [k, ...rest] = arg.split('=');
      return [k, rest.join('=') ?? ''];
    })
);
const argFlags = new Set(args.filter((arg) => arg.startsWith('--') && !arg.includes('=')));

const parseLevelSpec = (spec) => {
  if (!spec || spec === 'all') return null; // null = run all levels
  const set = new Set();
  for (const part of spec.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const [from, to] = trimmed.split('-').map((v) => Number(v.trim()));
      if (Number.isFinite(from) && Number.isFinite(to)) {
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        for (let i = lo; i <= hi; i++) set.add(i);
      }
    } else {
      const n = Number(trimmed);
      if (Number.isFinite(n) && n > 0) set.add(n);
    }
  }
  return set.size > 0 ? set : null;
};

if (argFlags.has('--help') || argFlags.has('-h')) {
  console.log(`Usage:
  node scripts/run-level-audit.mjs [options]

Options:
  --levels=SPEC        Levels to audit. SPEC formats:
                         92                    single level
                         92,108,134            comma-separated list
                         90-95                 inclusive range
                         92,108,120-125        mixed
                         all (default)         every level
  --output=PATH        Output JSON path (default: audits/local/latest.json)
                       History copy is also written to <dir>/history/.
  --timeout-ms=N       Overall audit timeout (default: ${DEFAULT_TIMEOUT_MS})
  --headed             Run Chromium with UI (debugging only).
  --help, -h           This message.

Output schema matches audits/raw/latest.json so existing analysis scripts
(audit:analyze-failures, etc.) work against it.

Examples:
  npm run audit:levels -- --levels=92
  npm run audit:levels -- --levels=92,108 --output=audits/local/portals.json
  npm run audit:levels -- --levels=all --timeout-ms=2700000
`);
  process.exit(0);
}

const levelFilter = parseLevelSpec(argMap.get('--levels'));
const outputFile = argMap.get('--output') || 'audits/local/latest.json';
const timeoutMs = Number(argMap.get('--timeout-ms') || DEFAULT_TIMEOUT_MS);
const headed = argFlags.has('--headed');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.php': 'text/plain; charset=utf-8'
};

const resolvePath = (urlPath) => {
  const cleanPath = decodeURIComponent((urlPath || '/').split('?')[0]).replace(/^\/+/, '');
  const withDefault = cleanPath === '' ? 'index.html' : cleanPath;
  const fullPath = path.resolve(process.cwd(), withDefault);
  if (!fullPath.startsWith(process.cwd())) return null;
  return fullPath;
};

const startStaticServer = () => {
  const server = createServer(async (req, res) => {
    const fullPath = resolvePath(req.url || '/');
    if (!fullPath) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    try {
      const fileStat = await stat(fullPath);
      const filePath = fileStat.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => resolve(server));
  });
};

const utcStamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');

const getCommitSha = () => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'local';
  }
};

const run = async () => {
  const levelList = levelFilter ? Array.from(levelFilter).sort((a, b) => a - b) : null;
  console.log(`[level-audit] target: ${levelList ? levelList.join(',') : 'all'}`);
  console.log(`[level-audit] starting static server on ${BASE_URL}`);
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') {
      console.log(`[browser:${t}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    console.log(`[browser:pageerror] ${err?.message || err}`);
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => typeof window !== 'undefined'
        && typeof window.APP !== 'undefined'
        && typeof window.APP.Solver !== 'undefined'
        && typeof window.APP.LevelUtils !== 'undefined'
        && typeof window.APP.State?.ENGINE !== 'undefined'
    );

    // Enable dev mode (required to open the audit modal & click the audit
    // button). Detect the dev-mode toggle path through APP.State.ENGINE.
    await page.evaluate(() => {
      if (window.APP?.State?.ENGINE) {
        window.APP.State.ENGINE.isDevMode = true;
      }
    });

    // Install the level filter BEFORE clicking the audit button. The audit
    // loop (index.html runAudit) reads window.__AUDIT_LEVEL_FILTER and skips
    // levels not in the set. Setting to null/undefined runs the full audit.
    if (levelList) {
      await page.evaluate((levels) => {
        window.__AUDIT_LEVEL_FILTER = new Set(levels);
      }, levelList);
    } else {
      await page.evaluate(() => {
        window.__AUDIT_LEVEL_FILTER = null;
      });
    }

    // Best-effort close the guide if it's showing — same as run-audit-export.
    try { await page.click('#closeGuideX', { timeout: 1000 }); } catch {}

    // Open the audit modal and click the New Hint button.
    await page.click('#openAuditModalBtn');
    await page.click('#auditNewHintBtn');

    console.log(`[level-audit] audit running (timeout=${timeoutMs}ms)…`);

    // Wait for the audit to idle then for results to populate.
    await page.waitForFunction(
      () => {
        const txt = document.getElementById('auditProgressLabel')?.textContent?.trim() || '';
        return txt === 'Idle' || txt === 'Stopped.';
      },
      undefined,
      { timeout: timeoutMs }
    );
    await page.waitForFunction(
      () => {
        const txt = document.getElementById('auditReportRows')?.textContent?.trim() || '';
        return txt.length > 0 && txt !== 'Run a check to generate report.';
      },
      undefined,
      { timeout: timeoutMs }
    );

    // Extract the full export. Same pathway as the official audit script:
    // select 'full' export mode, click copy, read clipboard (fallback to
    // innerText if clipboard unavailable in headless).
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
    await page.selectOption('#auditExportMode', 'full');
    await page.click('#copyAuditExportBtn');

    let raw = '';
    try {
      raw = await page.evaluate(async () => {
        if (!navigator.clipboard?.readText) return '';
        return navigator.clipboard.readText();
      });
    } catch {}
    if (!raw?.trim()) {
      raw = await page.locator('#auditReportRows').innerText();
    }
    if (!raw?.trim()) {
      throw new Error('Audit export produced no output');
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      const preview = `${raw}`.trim().slice(0, 200).replace(/\s+/g, ' ');
      throw new Error(`Audit export is not valid JSON: ${err?.message || err}. Preview: ${preview}`);
    }

    // Add audit metadata: commit sha, timestamp, level filter, command line.
    const meta = {
      commitSha: getCommitSha(),
      timestamp: new Date().toISOString(),
      levelFilter: levelList ? levelList.slice() : 'all',
      timeoutMs,
      runner: 'scripts/run-level-audit.mjs'
    };
    payload.commitSha = payload.commitSha || meta.commitSha;
    payload.timestamp = payload.timestamp || meta.timestamp;
    payload.__localAuditMeta = meta;

    // Write outputs.
    const outputPath = path.resolve(process.cwd(), outputFile);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`[level-audit] wrote ${path.relative(process.cwd(), outputPath)}`);

    // Append to history dir at audits/local/history/.
    const historyDir = path.join(path.dirname(outputPath), 'history');
    await mkdir(historyDir, { recursive: true });
    const stamp = utcStamp();
    const shortSha = `${meta.commitSha || 'local'}`.slice(0, 12);
    const levelTag = levelList ? `L${levelList.join('-')}` : 'all';
    const historyName = `${stamp}-${shortSha}-${levelTag}.json`;
    const historyPath = path.join(historyDir, historyName);
    await writeFile(historyPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`[level-audit] history ${path.relative(process.cwd(), historyPath)}`);

    // Summary printout.
    const levels = Array.isArray(payload?.levels) ? payload.levels : [];
    const counts = {};
    for (const lvl of levels) {
      const s = lvl?.status || 'unknown';
      counts[s] = (counts[s] || 0) + 1;
    }
    console.log(`[level-audit] levelCount=${levels.length} statuses=${JSON.stringify(counts)}`);
    if (levelList && levels.length > 0) {
      for (const lvl of levels) {
        const attemptCount = lvl?.attemptCount ?? lvl?.newHint?.attemptCount ?? 0;
        console.log(`  L${lvl?.level}: status=${lvl?.status || 'unknown'} attempts=${attemptCount} timeMs=${lvl?.timeMs || lvl?.totalSolveTimeMs || 0}`);
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
