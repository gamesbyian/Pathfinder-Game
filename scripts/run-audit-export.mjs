import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;
const AUDIT_TIMEOUT_MS = Number(process.env.AUDIT_TIMEOUT_MS || 15 * 60 * 1000);

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
      const stat = await import('node:fs/promises').then((m) => m.stat(fullPath));
      const filePath = stat.isDirectory() ? path.join(fullPath, 'index.html') : fullPath;
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

const waitForAuditIdle = async (page) => {
  await page.waitForFunction(
    () => {
      const txt = document.getElementById('auditProgressLabel')?.textContent?.trim() || '';
      return txt === 'Idle' || txt === 'Stopped.';
    },
    { timeout: AUDIT_TIMEOUT_MS }
  );
};

const waitForAuditResult = async (page) => {
  await page.waitForFunction(
    () => {
      const txt = document.getElementById('auditReportRows')?.textContent?.trim() || '';
      return txt.length > 0 && txt !== 'Run a check to generate report.';
    },
    { timeout: AUDIT_TIMEOUT_MS }
  );
};

const utcStamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');

const summarizeMetrics = (payload, commitSha) => {
  const levels = Array.isArray(payload?.levels) ? payload.levels : [];
  const timeVals = levels.map((row) => row?.timeMs).filter((n) => Number.isFinite(n));
  const solveVals = levels.map((row) => row?.totalSolveTimeMs).filter((n) => Number.isFinite(n));
  const countBy = (field, target) => levels.filter((row) => `${row?.[field] || ''}` === target).length;

  return {
    timestamp: new Date().toISOString(),
    commitSha,
    runType: payload?.runType || 'unknown',
    exportMode: payload?.exportMode || 'unknown',
    levelCount: levels.length,
    statusCounts: {
      success: countBy('status', 'success'),
      timeout: countBy('status', 'timeout'),
      noSolutionInconclusive: countBy('status', 'no-solution-inconclusive'),
      noSolutionProven: countBy('status', 'no-solution-proven'),
      aborted: countBy('status', 'aborted'),
      error: levels.filter((row) => row?.error).length
    },
    qualitySignals: {
      producedHintValidCount: levels.filter((row) => row?.producedHintValid === true).length,
      contradictionRecoveryActivatedCount: levels.filter((row) => row?.contradictionRecoveryActivated === true).length,
      preExpansionAbortUnexpectedExceptionCount: levels.filter((row) => row?.preExpansionAbort === 'unexpected-exception').length
    },
    performance: {
      hintTimeMsAvg: timeVals.length ? Math.round(timeVals.reduce((a, b) => a + b, 0) / timeVals.length) : null,
      totalSolveTimeMsAvg: solveVals.length ? Math.round(solveVals.reduce((a, b) => a + b, 0) / solveVals.length) : null,
      maxSolveTimeMs: solveVals.length ? Math.max(...solveVals) : null
    }
  };
};

const run = async () => {
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  let page;
  try {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });

    await page.click('#guideBtn');
    await page.locator('#devToggleBtn').click();
    await page.click('#closeGuideX');
    await page.click('#openAuditModalBtn');
    await page.click('#auditNewHintBtn');

    await waitForAuditIdle(page);
    await waitForAuditResult(page);

    await page.selectOption('#auditExportMode', 'full');
    await page.click('#copyAuditExportBtn');

    const raw = await page.locator('#auditReportRows').innerText();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Audit export is not valid JSON: ${err?.message || err}`);
    }

    const stamp = utcStamp();
    const shortSha = `${process.env.GITHUB_SHA || process.env.AUDIT_GIT_SHA || 'local'}`.slice(0, 12);

    const rawDir = path.join(process.cwd(), 'audits', 'raw');
    const metricsDir = path.join(process.cwd(), 'audits', 'metrics');
    await mkdir(rawDir, { recursive: true });
    await mkdir(metricsDir, { recursive: true });

    const rawFileName = `${stamp}-${shortSha}.json`;
    const rawFilePath = path.join(rawDir, rawFileName);
    const latestRawPath = path.join(rawDir, 'latest.json');

    await writeFile(rawFilePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await writeFile(latestRawPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    const metrics = summarizeMetrics(payload, process.env.GITHUB_SHA || 'local');
    const metricsFileName = `${stamp}-${shortSha}.json`;
    const metricsFilePath = path.join(metricsDir, metricsFileName);
    const latestMetricsPath = path.join(metricsDir, 'latest.json');

    await writeFile(metricsFilePath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
    await writeFile(latestMetricsPath, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');

    let history = [];
    const historyPath = path.join(metricsDir, 'history.ndjson');
    try {
      const existing = await readFile(historyPath, 'utf8');
      history = existing.split('\n').filter(Boolean);
    } catch {}
    history.push(JSON.stringify(metrics));
    await writeFile(historyPath, `${history.join('\n')}\n`, 'utf8');

    console.log(`Audit export written: ${path.relative(process.cwd(), rawFilePath)}`);
    console.log(`Metrics written: ${path.relative(process.cwd(), metricsFilePath)}`);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
};

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
