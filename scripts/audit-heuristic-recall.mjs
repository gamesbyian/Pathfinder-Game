#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const HOST = '127.0.0.1';
const PORT = Number(process.env.HEURISTIC_RECALL_PORT || 4175);
const BASE_URL = `http://${HOST}:${PORT}`;
const DEFAULT_LEVELS = [92, 108, 134];

const args = process.argv.slice(2);
const argMap = new Map(
  args
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [k, v] = arg.split('=');
      return [k, v ?? ''];
    })
);

const levels = (() => {
  const raw = argMap.get('--levels');
  if (!raw) return DEFAULT_LEVELS;
  return raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
})();

const outputFile = argMap.get('--output') || 'audits/heuristic-recall/latest.json';

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

const run = async () => {
  const server = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof APP !== 'undefined' && typeof SolverCore !== 'undefined' && typeof Referee !== 'undefined');

    const payload = await page.evaluate(async ({ levelsToAudit }) => {
      const buildPreparedLevel = (levelNumber) => {
        const levelRaw = APP.LevelUtils.normalizeLevel(levelNumber - 1);
        const level = Object.create(levelRaw);
        level.solverProfile = Referee.normalizeSolverProfile(Referee.buildLevelProfile(level));

        const distMap = SolverCore._buildDistMap(level);
        level.distMapForSolver = distMap;
        level.mustPassIndex = new Map();
        level.mustPassDistMaps = [];
        level.mustPassToGoalDist = [];
        for (let i = 0; i < level.mustPassKeys.length; i++) {
          const key = level.mustPassKeys[i];
          level.mustPassIndex.set(key, i);
          level.mustPassDistMaps.push(SolverCore._buildOptimisticDistMap(level, [key]));
          level.mustPassToGoalDist.push(distMap.get(key) ?? Infinity);
        }

        level.mustCrossIndex = new Map();
        level.mustCrossDistMaps = [];
        level.mustCrossToGoalDist = [];
        for (let i = 0; i < level.mustCrossKeys.length; i++) {
          const key = level.mustCrossKeys[i];
          level.mustCrossIndex.set(key, i);
          level.mustCrossDistMaps.push(SolverCore._buildOptimisticDistMap(level, [key]));
          level.mustCrossToGoalDist.push(distMap.get(key) ?? Infinity);
        }

        const transitKeys = [];
        const seenTransit = new Set();
        const pushTransit = (k) => {
          if (!Number.isFinite(k) || seenTransit.has(k)) return;
          seenTransit.add(k);
          transitKeys.push(k);
        };
        level.mustCrossKeys.forEach(pushTransit);
        pushTransit(level.goalKey);
        if (level.portalMap instanceof Map) level.portalMap.forEach((_, k) => pushTransit(k));
        const transitDistMaps = transitKeys.map((k) => SolverCore._buildOptimisticDistMap(level, [k]));
        const keyToIdx = new Map(transitKeys.map((k, i) => [k, i]));
        const matrix = Array.from({ length: transitKeys.length }, () => Array(transitKeys.length).fill(Infinity));
        for (let i = 0; i < transitKeys.length; i++) {
          matrix[i][i] = 0;
          for (let j = i + 1; j < transitKeys.length; j++) {
            const d = transitDistMaps[i].get(transitKeys[j]);
            const val = Number.isFinite(d) ? d : Infinity;
            matrix[i][j] = val;
            matrix[j][i] = val;
          }
        }
        level.mustCrossTransit = {
          ready: transitKeys.length > 0,
          keys: transitKeys,
          keyToIdx,
          matrix,
          distMapsByKey: new Map(transitKeys.map((k, i) => [k, transitDistMaps[i]]))
        };

        level.objectiveNodes = [];
        for (let i = 0; i < level.mustPassKeys.length; i++) {
          level.objectiveNodes.push({ key: level.mustPassKeys[i], type: 'mustPass', localIdx: i });
        }
        for (let i = 0; i < level.mustCrossKeys.length; i++) {
          level.objectiveNodes.push({ key: level.mustCrossKeys[i], type: 'mustCross', localIdx: i });
        }
        level.objectiveDistMaps = level.objectiveNodes.map((n) => SolverCore._buildOptimisticDistMap(level, [n.key]));

        level._popcountMask = (mask) => {
          let count = 0;
          let m = mask;
          while (m !== 0n) {
            count += Number(m & 1n);
            m >>= 1n;
          }
          return count;
        };

        level.flipperIndex = new Map();
        let fIdx = 0;
        level.flippingFilterMap.forEach((_, k) => level.flipperIndex.set(k, fIdx++));

        level.hasParityBreaker = false;
        level.parityBreakers = [];
        level.parityDistMaps = [];
        const flipperSet = new Set();
        level.portalMap.forEach((v, k) => {
          const p1 = APP.LevelUtils.UNPACK(k);
          const p2 = APP.LevelUtils.UNPACK(v.dest);
          if (((p1.x + p1.y) % 2) !== ((p2.x + p2.y) % 2)) {
            level.hasParityBreaker = true;
            level.parityBreakers.push(k);
            level.parityDistMaps.push(SolverCore._buildOptimisticDistMap(level, [k]));
          } else {
            flipperSet.add(k);
          }
        });
        level.flippingFilterMap.forEach((_, k) => flipperSet.add(k));

        const flipperDistMap = SolverCore._buildFlipperDistMap(level, flipperSet);
        level.gateSet = new Set(level.gateKeys || []);
        return { level, distMap, flipperDistMap };
      };

      const createState = (level, startKey, searchCtx) => {
        const keyCount = searchCtx.keyCount;
        const mustCount = level.mustPassKeys.length;
        const mustCrossCount = level.mustCrossKeys.length;
        const state = {
          path: [startKey],
          countsArr: new Uint16Array(keyCount),
          usageBits: new Uint8Array(keyCount),
          ints: 0,
          jumpMarks: new Uint8Array(Math.max(2, level.reqLen + 3)),
          jumpCount: 0,
          flipCount: 0,
          flipParity: 0,
          crossedFlippersAt: new Int16Array(keyCount),
          undoLog: new Array(Math.max(64, level.reqLen * 24) * 3),
          logCursor: 0,
          nonZeroCounts: 0,
          nonZeroUsage: 0,
          flipperCrossMask: 0n,
          flipperParityAtCrossMask: 0n,
          mustMask: mustCount > 0 ? ((1n << BigInt(mustCount)) - 1n) : 0n,
          mustCrossMask: mustCrossCount > 0 ? ((1n << BigInt(mustCrossCount)) - 1n) : 0n,
          mustCrossCounts: mustCrossCount > 0 ? new Uint8Array(mustCrossCount) : null,
          floodVisited: new Uint8Array(keyCount),
          floodQueue: new Int32Array(keyCount),
          remainingSteps: 0,
          phase: 'harvest',
          phaseLastSwitchLen: 0,
          urgencyScalar: 0,
          phasePolicy: SolverCore._resolvePhasePolicy(level, {}),
          phaseTimeline: [],
          bridgeState: null,
          bridgeStateSnapshot: null,
          activeObjectiveId: -1,
          recentMoveEntropy: 0,
          recentTurnbackCount: 0,
          recentAxisFlipCount: 0,
          recentDirRepeatCount: 0,
          startGateArchetype: null,
          objectiveTrackId: null,
          objectiveTrackKeys: [],
          knotCrossBudget: Math.max(0, Math.ceil((level.reqInt || 0) * 0.7)),
          nonKnotCrossCap: level.reqInt || 0,
          commitmentHorizon: 0,
          commitmentStepsLeft: 0,
          commitmentDir: -1,
          commitmentAxis: -1,
          knotShapeProgress: 0,
          perimeterSpanSignature: 0,
          memoHash0: 0,
          memoHash1: 0,
          memoHashKey: '',
          memoStrictKey: '',
          hashDirty: true
        };
        if ((level.portalMap?.size || 0) > 0) state.portal = SolverCore._createPortalState(level, {});
        state.crossedFlippersAt.fill(-1);
        SolverCore._makeTypedStateViews(state, searchCtx);
        const startIdx = searchCtx.keyToIdx(startKey);
        state.countsArr[startIdx] = 1;
        state.nonZeroCounts = 1;
        const startMustIdx = level.mustPassIndex?.get(startKey);
        if (startMustIdx !== undefined) state.mustMask &= ~(1n << BigInt(startMustIdx));
        const startCrossIdx = level.mustCrossIndex?.get(startKey);
        if (startCrossIdx !== undefined && state.mustCrossCounts) state.mustCrossCounts[startCrossIdx] = 1;
        return state;
      };

      const options = {
        scoringMode: 'modern',
        portalBiasMode: 'adaptiveMustCross',
        structuralMode: false,
        orderingPolicy: 'default',
        enableLowExpansionProbe: true,
        disabledPrunes: []
      };

      const dominantDriver = (rows = []) => {
        const sorted = rows.slice().sort((a, b) => Math.abs(Number(b?.contribution) || 0) - Math.abs(Number(a?.contribution) || 0));
        if (sorted.length === 0) return null;
        const d = sorted[0];
        return { feature: d.feature || null, contribution: Number(d.contribution) || 0 };
      };

      const perLevel = [];
      for (const levelNum of levelsToAudit) {
        const { level, distMap, flipperDistMap } = buildPreparedLevel(levelNum);
        const hintPath = Array.isArray(level.hints?.[0]) ? level.hints[0] : [];
        if (hintPath.length < 2) {
          perLevel.push({ level: levelNum, error: 'missing hint path', steps: [] });
          continue;
        }

        const startKey = hintPath[0];
        const searchCtx = SolverCore._createSearchContext(level);
        const scratch = { mustBoundCache: new Map(), crossDistCache: new Map() };
        const state = createState(level, startKey, searchCtx);
        const usageFreq = SavedHintArchitecture.makePassCellUsageSeed();
        const stepRows = [];

        for (let i = 0; i < hintPath.length - 1; i++) {
          const current = hintPath[i];
          const expectedNext = hintPath[i + 1];
          if (state.path[state.path.length - 1] !== current) {
            stepRows.push({
              step: i,
              expectedNext,
              error: 'state/path desync',
              correctRank: -1,
              topWrongCell: null,
              topWrongComponent: null
            });
            break;
          }

          const debugStats = {
            prune: {},
            branchesTried: 0,
            rootSuppressionLog: [],
            notes: []
          };
          const ranked = SolverCore._getNeighbors(current, state, distMap, flipperDistMap, usageFreq, level, options, scratch, searchCtx, debugStats);
          const correctRank = ranked.findIndex((k) => k === expectedNext);
          const topCell = ranked.length > 0 ? ranked[0] : null;
          const topWrongCell = (topCell !== null && topCell !== expectedNext)
            ? topCell
            : (ranked.find((k) => k !== expectedNext) ?? null);

          let topWrongComponent = null;
          const moveScores = Array.isArray(debugStats.rootMoveScores) ? debugStats.rootMoveScores : [];
          if (topWrongCell !== null) {
            const scoreRow = moveScores.find((r) => r.key === topWrongCell);
            if (scoreRow?.drivers) topWrongComponent = dominantDriver(scoreRow.drivers);
          }

          stepRows.push({
            step: i,
            from: current,
            expectedNext,
            candidateCount: ranked.length,
            correctRank,
            topCell,
            topWrongCell,
            topWrongComponent,
            note: i === 0 ? null : 'driver attribution is only available at depth0 in current solver telemetry'
          });

          const isPortalJump = level.portalMap?.get(current)?.dest === expectedNext;
          SolverCore._pushStateZeroAlloc(state, searchCtx, expectedNext, !!isPortalJump, level, options, null);
        }

        perLevel.push({
          level: levelNum,
          hintLength: hintPath.length,
          steps: stepRows,
          summary: {
            stepsAudited: stepRows.length,
            rank0Hits: stepRows.filter((r) => r.correctRank === 0).length,
            missed: stepRows.filter((r) => r.correctRank < 0).length
          }
        });
      }

      return {
        generatedAt: new Date().toISOString(),
        levels: perLevel
      };
    }, { levelsToAudit: levels });

    const outPath = path.resolve(outputFile);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');

    console.log(`Heuristic recall audit written to ${path.relative(process.cwd(), outPath)}`);
    for (const row of payload.levels) {
      if (row.error) {
        console.log(`- level ${row.level}: ERROR ${row.error}`);
        continue;
      }
      console.log(`- level ${row.level}: steps=${row.summary.stepsAudited}, rank0Hits=${row.summary.rank0Hits}, missed=${row.summary.missed}`);
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
};

run().catch((err) => {
  console.error('[heuristic-recall-audit] failed:', err?.stack || err);
  process.exit(1);
});
