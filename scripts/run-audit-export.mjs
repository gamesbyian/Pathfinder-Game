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
    undefined,
    { timeout: AUDIT_TIMEOUT_MS }
  );
};

const waitForAuditResult = async (page) => {
  await page.waitForFunction(
    () => {
      const txt = document.getElementById('auditReportRows')?.textContent?.trim() || '';
      return txt.length > 0 && txt !== 'Run a check to generate report.';
    },
    undefined,
    { timeout: AUDIT_TIMEOUT_MS }
  );
};

const utcStamp = () => new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');

const summarizeMetrics = (payload, commitSha) => {
  const levels = Array.isArray(payload?.levels) ? payload.levels : [];

  const timeVals = [];
  const solveVals = [];

  const statusCounts = {
    success: 0,
    timeout: 0,
    noSolutionInconclusive: 0,
    noSolutionProven: 0,
    aborted: 0,
    error: 0
  };

  const qualitySignals = {
    producedHintValidCount: 0,
    contradictionRecoveryActivatedCount: 0,
    preExpansionAbortUnexpectedExceptionCount: 0
  };

  const failingLevelNumbers = new Set();
  const failingDetails = [];
  const failingByStatus = {
    timeout: 0,
    noSolutionInconclusive: 0,
    noSolutionProven: 0,
    aborted: 0,
    error: 0
  };

  const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  levels.forEach((row, index) => {
    const status = `${row?.status || ''}`;
    const hasError = Boolean(row?.error);

    if (status === 'success') statusCounts.success += 1;
    if (status === 'timeout') statusCounts.timeout += 1;
    if (status === 'no-solution-inconclusive') statusCounts.noSolutionInconclusive += 1;
    if (status === 'no-solution-proven') statusCounts.noSolutionProven += 1;
    if (status === 'aborted') statusCounts.aborted += 1;
    if (hasError) statusCounts.error += 1;

    if (row?.producedHintValid === true) qualitySignals.producedHintValidCount += 1;
    if (row?.contradictionRecoveryActivated === true) qualitySignals.contradictionRecoveryActivatedCount += 1;
    if (row?.preExpansionAbort === 'unexpected-exception') qualitySignals.preExpansionAbortUnexpectedExceptionCount += 1;

    const timeMs = toFiniteNumber(row?.timeMs);
    if (timeMs !== null) timeVals.push(timeMs);

    const totalSolveTimeMs = toFiniteNumber(row?.totalSolveTimeMs);
    if (totalSolveTimeMs !== null) solveVals.push(totalSolveTimeMs);

    const levelNumber =
      toFiniteNumber(row?.levelNumber) ??
      toFiniteNumber(row?.level) ??
      toFiniteNumber(row?.id) ??
      index + 1;

    const isFailing = status !== 'success' || hasError;
    if (!isFailing) return;

    failingLevelNumbers.add(levelNumber);
    failingDetails.push({ levelNumber, status, hasError });

    if (hasError) {
      failingByStatus.error += 1;
      return;
    }

    if (status === 'timeout') {
      failingByStatus.timeout += 1;
    } else if (status === 'no-solution-inconclusive') {
      failingByStatus.noSolutionInconclusive += 1;
    } else if (status === 'no-solution-proven') {
      failingByStatus.noSolutionProven += 1;
    } else if (status === 'aborted') {
      failingByStatus.aborted += 1;
    } else {
      failingByStatus.error += 1;
    }
  });

  return {
    timestamp: new Date().toISOString(),
    commitSha,
    runType: payload?.runType || 'unknown',
    exportMode: payload?.exportMode || 'unknown',
    levelCount: levels.length,
    statusCounts,
    failingLevels: {
      total: failingDetails.length,
      byStatus: failingByStatus,
      levelNumbers: Array.from(failingLevelNumbers).sort((a, b) => a - b),
      details: failingDetails
    },
    qualitySignals,
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

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
    await page.selectOption('#auditExportMode', 'full');
    await page.click('#copyAuditExportBtn');

    let raw = '';
    try {
      raw = await page.evaluate(async () => {
        if (!navigator.clipboard?.readText) return '';
        return navigator.clipboard.readText();
      });
    } catch {
      raw = '';
    }
    if (!raw?.trim()) {
      raw = await page.locator('#auditReportRows').innerText();
    }
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      const preview = `${raw || ''}`.trim().slice(0, 160).replace(/\s+/g, ' ');
      throw new Error(`Audit export is not valid JSON: ${err?.message || err}. Preview: ${preview || '(empty)'}`);
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
