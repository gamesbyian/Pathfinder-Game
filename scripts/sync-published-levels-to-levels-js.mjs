#!/usr/bin/env node
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import vm from 'vm';

const root = process.cwd();
const appId = process.env.PATHFINDER_APP_ID || 'pathfinder-standalone';
const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'pathfinder-game-23e29';

function loadRawLevels(src) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: 'levels.js' });
  if (!Array.isArray(ctx.window.RAW_LEVELS)) throw new Error('levels.js did not define window.RAW_LEVELS');
  return ctx.window.RAW_LEVELS;
}

function normCoord(coord) { return { x: Number(coord?.x || 0), y: Number(coord?.y || 0) }; }
function cmp(a, b) { return (a.y - b.y) || (a.x - b.x); }
function sortCoords(coords) { return (Array.isArray(coords) ? coords : []).map(normCoord).sort(cmp); }
function sortAxis(coords) { return (Array.isArray(coords) ? coords : []).map(x => ({ ...normCoord(x), axis: String(x?.axis || '') })).sort((a,b)=>cmp(a,b)||a.axis.localeCompare(b.axis)); }
function sortPortals(portals) {
  return (Array.isArray(portals) ? portals : []).map(p => {
    const a = normCoord({ x: p?.x1, y: p?.y1 }); const b = normCoord({ x: p?.x2, y: p?.y2 });
    const pair = cmp(a,b) <= 0 ? [a,b] : [b,a];
    return { x1: pair[0].x, y1: pair[0].y, x2: pair[1].x, y2: pair[1].y };
  }).sort((a,b)=>(a.y1-b.y1)||(a.x1-b.x1)||(a.y2-b.y2)||(a.x2-b.x2));
}
function fingerprintSource(level) {
  return JSON.stringify({ version: 1, grid: { w: Number(level?.grid?.w || 0), h: Number(level?.grid?.h || 0) }, reqLen: Number(level?.reqLen || 0), reqInt: Number(level?.reqInt || 0), gates: sortCoords(level?.gates), goal: level?.goal ? normCoord(level.goal) : null, falseGoals: sortCoords(level?.falseGoals), blocks: sortCoords(level?.blocks), mustPass: sortCoords(level?.mustPass), mustCross: sortCoords(level?.mustCross), filters: sortAxis(level?.filters), flippingFilters: sortAxis(level?.flippingFilters), portals: sortPortals(level?.portals), geese: sortCoords(level?.geese) });
}
function ensureMetadata(level) {
  return { ...level, designerName: typeof level?.designerName === 'string' ? level.designerName : '', description: typeof level?.description === 'string' ? level.description : '', difficulty: Number.isInteger(level?.difficulty) && level.difficulty >= 1 && level.difficulty <= 10 ? level.difficulty : null };
}
function formatLevels(levels) {
  return `window.RAW_LEVELS = [\n${levels.map((level, i) => `    /* ${i + 1} */ ${JSON.stringify(ensureMetadata(level))}${i < levels.length - 1 ? ',' : ''}`).join('\n')}\n];\n`;
}
async function loadAdmin() {
  try { return await import('firebase-admin'); }
  catch (err) { throw new Error('Missing firebase-admin. Install it with `npm install --save-dev firebase-admin`, then rerun this script.'); }
}
async function main() {
  const levelsPath = path.join(root, 'levels.js');
  const existing = loadRawLevels(await readFile(levelsPath, 'utf8')).map(ensureMetadata);
  const seen = new Set(existing.map(fingerprintSource));
  const adminModule = await loadAdmin();
  const admin = adminModule.default || adminModule;
  if (!admin.apps?.length) admin.initializeApp({ projectId });
  const db = admin.firestore();
  const snap = await db.collection('artifacts').doc(appId).collection('published_levels').orderBy('sortOrder').get();
  let appended = 0, skipped = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const level = ensureMetadata(data.levelData || {});
    if (Array.isArray(level.hints)) level.hints = level.hints.map(h => typeof h === 'string' ? JSON.parse(h) : h);
    const fp = fingerprintSource(level);
    if (seen.has(fp)) { skipped++; continue; }
    seen.add(fp); existing.push(level); appended++;
  }
  await writeFile(levelsPath, formatLevels(existing));
  console.log(`Existing levels: ${existing.length - appended}`);
  console.log(`Published fetched: ${snap.docs.length}`);
  console.log(`Appended: ${appended}`);
  console.log(`Skipped duplicates: ${skipped}`);
  console.log('Wrote levels.js');
}
main().catch(err => { console.error(err.message || err); process.exit(1); });
