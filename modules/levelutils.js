export function installLevelUtils(APP) {
    APP.LevelUtils = (() => {
            const getRawLevels = () => APP.Data.getLevels();
            const resolvePortal = (level, key) => (level?.portalMap?.has(key) ? level.portalMap.get(key) : null);
            const PACK = (x, y) => (y << 16) | x;
            const UNPACK = (k) => ({ x: k & 0xFFFF, y: k >> 16 });
            const inBounds = (x, y, w, h) => x >= 0 && x < w && y >= 0 && y < h;
            const PORTAL_PAIR_PALETTE = ['#ef4444', '#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4', '#84cc16', '#f43f5e', '#14b8a6', '#eab308', '#6366f1', '#ec4899'];
            const getPortalPairIndex = (level, key) => { if (!level?.portalVisuals?.length) return -1; return level.portalVisuals.findIndex(pv => pv.k1 === key || pv.k2 === key); };
            const getPortalDisplayColor = (level, key, fallback = '#d946ef') => { const idx = getPortalPairIndex(level, key); if (idx < 0) return fallback; return PORTAL_PAIR_PALETTE[idx % PORTAL_PAIR_PALETTE.length]; };
            const expCoords = (items) => (Array.isArray(items) ? items : Array.from(items)).map(k => { const p = UNPACK(k); return {x: p.x + 1, y: p.y + 1}; });
            const isValidMove = (targetKey, state, level, options = {}) => {
                const {
                    isStrict = false,
                    allowJump = true,
                    forbidPortals = false,
                    mode = state?.mode,
                    armedFalseGoals = state?.armedFalseGoals,
                    flipCount = state?.flipCount || 0,
                    crossedSet = state?.crossedSet || state?.crossedFlippingFilters || new Map(),
                    checkHazards = isStrict,
                    checkFalseGoals = isStrict,
                    checkWinMetrics = isStrict,
                    disabledPrunes = [],
                    diagnostics = null
                } = options;
                const setReason = (reasonCode, detail = null) => {
                    if (!diagnostics || typeof diagnostics !== 'object') return false;
                    diagnostics.reasonCode = reasonCode;
                    if (detail !== null && detail !== undefined) diagnostics.reasonDetail = detail;
                    return false;
                };
                if (!level) return false;
                const path = state?.path || [];
                const counts = state?.visitedCounts || state?.counts || new Map();
                const usage = state?.cellUsage || state?.usage || new Map();
                const jumpSet = state?.isPortalJump || state?.jumpSet || new Set();

                const { x, y } = UNPACK(targetKey);
                const { w, h } = level.grid;
                if (!inBounds(x, y, w, h)) return setReason('invalid-oob');
                if (level.blockSet.has(targetKey)) return setReason('invalid-blocked');
                if (forbidPortals && level.portalMap?.has(targetKey)) return setReason('invalid-portal-legality', 'portal-terminal-forbidden');

                if (mode === APP.Core.EDITOR && checkHazards && level.gooseSet.has(targetKey)) return setReason('invalid-goose-hazard');

                const lastK = path[path.length - 1];
                if (lastK === undefined) {
                    if (diagnostics && typeof diagnostics === 'object') diagnostics.reasonCode = 'valid';
                    return true;
                }

                const lastP = UNPACK(lastK);
                const isPortalJumpCandidate = allowJump && level.portalMap.has(lastK) && resolvePortal(level, lastK).dest === targetKey;

                if (mode !== APP.Core.EDITOR) {
                    if (lastK === level.goalKey) return setReason('invalid-after-goal');
                    if (checkFalseGoals && armedFalseGoals?.has(lastK)) return setReason('invalid-false-goal-lock');
                    if (level.gateKeys.includes(targetKey)) return setReason('invalid-gate-reentry');
                } else if (path.length > 1 && level.gateKeys.includes(lastK)) {
                    return setReason('invalid-editor-gate-reentry');
                }

                if (allowJump && level.portalMap.has(lastK) && !jumpSet.has(path.length - 1) && !isPortalJumpCandidate) return setReason('invalid-portal-legality');
                if (mode !== APP.Core.EDITOR && level.portalMap?.has(targetKey) && (counts.get(targetKey) || 0) > 0) {
                    return setReason('invalid-portal-legality', 'portal-terminal-already-used');
                }
                if (!isPortalJumpCandidate && Math.abs(x - lastP.x) + Math.abs(y - lastP.y) !== 1) return setReason('invalid-adjacency');

                const axis = (y === lastP.y) ? APP.Core.H : APP.Core.V;
                if (!isPortalJumpCandidate) {
                    const u = usage.get(targetKey);
                    if (u && ((axis === APP.Core.H && u.h) || (axis === APP.Core.V && u.v))) return setReason('invalid-edge-reuse-target');

                    const uLast = usage.get(lastK);
                    if (uLast) {
                        let entryAxis = APP.Core.NONE;
                        if (path.length > 1 && !jumpSet.has(path.length - 1)) {
                            const prevP = UNPACK(path[path.length - 2]);
                            const lastPC = UNPACK(lastK);
                            entryAxis = (prevP.y === lastPC.y) ? APP.Core.H : APP.Core.V;
                        }
                        if (axis !== entryAxis) {
                            if ((axis === APP.Core.H && uLast.h) || (axis === APP.Core.V && uLast.v)) return setReason('invalid-edge-reuse-origin');
                        }
                    }
                }

                if (!isPortalJumpCandidate) {
                    let filterLast = level.filterMap.get(lastK);
                    if (filterLast === undefined && level.flippingFilterMap.has(lastK) && crossedSet.has(lastK)) {
                        const relevantFlipCount = crossedSet.get(lastK);
                        filterLast = (relevantFlipCount % 2 !== 0) ? (level.flippingFilterMap.get(lastK) === APP.Core.H ? APP.Core.V : APP.Core.H) : level.flippingFilterMap.get(lastK);
                    }
                    if (!disabledPrunes.includes('filterAxisStrict')) {
                        if (filterLast && filterLast !== axis) return setReason('invalid-by-filter-axis', 'origin-filter-axis-mismatch');
                    }

                    let filterTarget = level.filterMap.get(targetKey);
                    if (filterTarget === undefined && level.flippingFilterMap.has(targetKey) && crossedSet.has(targetKey)) {
                        const relevantFlipCount = crossedSet.get(targetKey);
                        const baseAxis = level.flippingFilterMap.get(targetKey);
                        filterTarget = (relevantFlipCount % 2 !== 0) ? (baseAxis === APP.Core.H ? APP.Core.V : APP.Core.H) : baseAxis;
                    }
                    if (!disabledPrunes.includes('filterAxisStrict')) {
                        if (filterTarget && filterTarget !== axis) return setReason('invalid-by-filter-axis', 'target-filter-axis-mismatch');
                    }
                }

                if (checkHazards && mode !== APP.Core.EDITOR && level.gooseSet.has(targetKey)) return setReason('invalid-goose-hazard');
                if (checkWinMetrics && mode !== APP.Core.EDITOR && targetKey === level.goalKey) {
                    const nextCounts = counts;
                    const mustPassOk = level.mustPassKeys.every(k => (nextCounts.get(k) || 0) > 0 || k === targetKey);
                    const mustCrossOk = level.mustCrossKeys.every(k => ((nextCounts.get(k) || 0) + (k === targetKey ? 1 : 0)) >= 2);
                    if (!mustPassOk || !mustCrossOk) return setReason('invalid-must-cross-impossibility');
                }

                if (diagnostics && typeof diagnostics === 'object') diagnostics.reasonCode = 'valid';
                return true;
            };

            function transformPoint(x, y, variant, W, H) { switch (variant) { case 0: return { tx: x, ty: y }; case 1: return { tx: H - 1 - y, ty: x }; case 2: return { tx: W - 1 - x, ty: H - 1 - y }; case 3: return { tx: y, ty: W - 1 - x }; case 4: return { tx: W - 1 - x, ty: y }; case 5: return { tx: x, ty: H - 1 - y }; case 6: return { tx: y, ty: x }; case 7: return { tx: H - 1 - y, ty: W - 1 - x }; default: return { tx: x, ty: y }; } }

            function inverseTransformPoint(tx, ty, variant, W, H) { switch (variant) { case 0: return { x: tx, y: ty }; case 1: return { x: ty, y: H - 1 - tx }; case 2: return { x: W - 1 - tx, y: H - 1 - ty }; case 3: return { x: W - 1 - ty, y: tx }; case 4: return { x: W - 1 - tx, y: ty }; case 5: return { x: tx, y: H - 1 - ty }; case 6: return { x: ty, y:tx }; case 7: return { x: W - 1 - ty, y: H - 1 - tx }; default: return { x: tx, y: ty }; } }

            function transformAxis(axis, variant) { const swaps = [1, 3, 6, 7]; if (swaps.includes(variant)) { if (axis === APP.Core.H) return APP.Core.V; if (axis === APP.Core.V) return APP.Core.H; } return axis; }

            function getGridCoord(e) { const canvas = APP.Renderer.getCanvas(); const rect = canvas.getBoundingClientRect(); const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel; if (!l) return {x:0, y:0}; const gridW = APP.State.ENGINE.viewport.swapped ? l.grid.h : l.grid.w, gridH = APP.State.ENGINE.viewport.swapped ? l.grid.w : l.grid.h; const tx = Math.max(0, Math.min(gridW - 1, Math.floor((e.clientX - rect.left) * (canvas.width / rect.width) / APP.State.ENGINE.viewport.cellW))); const ty = Math.max(0, Math.min(gridH - 1, Math.floor((e.clientY - rect.top) * (canvas.height / rect.height) / APP.State.ENGINE.viewport.cellH))); return APP.LevelUtils.inverseTransformPoint(tx, ty, APP.State.ENGINE.variant, l.grid.w, l.grid.h); }

            function canonicalCloneLevel(src, options = {}) {
                const includeHints = !!options.includeHints;
                const _goalKey = typeof src?.goalKey === 'number' ? src.goalKey : -1;
                const _gateKeys = Array.isArray(src?.gateKeys) ? src.gateKeys.slice() : [];
                const _unpack = (k) => APP.LevelUtils.UNPACK(k);
                const clone = {
                    id: typeof src?.id === 'number' ? src.id : 0,
                    grid: { w: Number(src?.grid?.w) || 0, h: Number(src?.grid?.h) || 0 },
                    reqLen: Number(src?.reqLen) || 0,
                    reqInt: Number(src?.reqInt) || 0,
                    goalKey: _goalKey,
                    goal: src?.goal ? { x: src.goal.x, y: src.goal.y } : (() => { const p = _unpack(_goalKey >= 0 ? _goalKey : 0); return { x: p.x + 1, y: p.y + 1 }; })(),
                    gateKeys: _gateKeys,
                    gates: Array.isArray(src?.gates) ? src.gates.map(g => ({ x: g.x, y: g.y })) : _gateKeys.map(k => { const p = _unpack(k); return { x: p.x + 1, y: p.y + 1 }; }),
                    blockSet: new Set(src?.blockSet || []),
                    gooseSet: new Set(src?.gooseSet || []),
                    falseGoalKeys: new Set(src?.falseGoalKeys || []),
                    mustPassKeys: Array.isArray(src?.mustPassKeys) ? src.mustPassKeys.slice() : [],
                    mustCrossKeys: Array.isArray(src?.mustCrossKeys) ? src.mustCrossKeys.slice() : [],
                    portalMap: new Map(),
                    filterMap: new Map(),
                    flippingFilterMap: new Map()
                };
                if (src?.portalMap?.forEach) src.portalMap.forEach((v, k) => clone.portalMap.set(k, v && typeof v === 'object' ? { dest: v.dest } : v));
                if (src?.filterMap?.forEach) src.filterMap.forEach((axis, k) => clone.filterMap.set(k, axis));
                if (src?.flippingFilterMap?.forEach) src.flippingFilterMap.forEach((axis, k) => clone.flippingFilterMap.set(k, axis));
                clone.portalVisuals = Array.isArray(src?.portalVisuals) ? src.portalVisuals.map(pv => ({ k1: pv.k1, k2: pv.k2, ...(pv.color != null ? { color: pv.color } : {}) })) : [];
                clone.hasParityBreaker = !!src?.hasParityBreaker;
                if (includeHints) clone.hints = Array.isArray(src?.hints) ? src.hints.map(h => Array.isArray(h) ? h.slice() : h) : [];
                return clone;
            }

            function deepCloneLevel(src) {
                const l = canonicalCloneLevel(src, { includeHints: true });
                l.portalVisuals = Array.isArray(src?.portalVisuals) ? src.portalVisuals.map((pv) => ({ k1: pv.k1, k2: pv.k2 })) : [];
                l.hasParityBreaker = !!src?.hasParityBreaker;
                return l;
            }

            function normalizeLevel(idx) { const levels = APP.LevelUtils.getRawLevels(); if (idx < 0 || idx >= levels.length) return null; const raw = levels[idx]; if (!raw) return null; const adj = (v) => v - 1; const l = { id: idx, grid: { ...raw.grid }, reqLen: raw.reqLen, reqInt: raw.reqInt, goalKey: APP.LevelUtils.PACK(adj(raw.goal.x), adj(raw.goal.y)), gateKeys: raw.gates.map(g => APP.LevelUtils.PACK(adj(g.x), adj(g.y))), blockSet: new Set(), gooseSet: new Set(), falseGoalKeys: new Set(), portalMap: new Map(), portalVisuals: [], filterMap: new Map(), flippingFilterMap: new Map(), mustPassKeys: raw.mustPass?.map(m => APP.LevelUtils.PACK(adj(m.x), adj(m.y))) || [], mustCrossKeys: raw.mustCross?.map(m => APP.LevelUtils.PACK(adj(m.x), adj(m.y))) || [], hints: raw.hints || [], hasParityBreaker: false }; (raw.blocks || []).forEach(w => l.blockSet.add(APP.LevelUtils.PACK(adj(w.x), adj(w.y)))); raw.geese?.forEach(m => l.gooseSet.add(APP.LevelUtils.PACK(adj(m.x), adj(m.y)))); raw.filters?.forEach(f => l.filterMap.set(APP.LevelUtils.PACK(adj(f.x), adj(f.y)), f.axis)); raw.flippingFilters?.forEach(f => l.flippingFilterMap.set(APP.LevelUtils.PACK(adj(f.x), adj(f.y)), f.axis)); raw.falseGoals?.forEach(g => l.falseGoalKeys.add(APP.LevelUtils.PACK(adj(g.x), adj(g.y)))); raw.portals?.forEach(p => { const k1 = APP.LevelUtils.PACK(adj(p.x1), adj(p.y1)), k2 = APP.LevelUtils.PACK(adj(p.x2), adj(p.y2)); l.portalMap.set(k1, { dest: k2 }); l.portalMap.set(k2, { dest: k1 }); l.portalVisuals.push({ k1, k2 }); const p1 = APP.LevelUtils.UNPACK(k1), p2 = APP.LevelUtils.UNPACK(k2); if (((p1.x + p1.y) % 2) !== ((p2.x + p2.y) % 2)) l.hasParityBreaker = true; }); return l; }

            function denormalizeLevel(level) {
                if (!level || !level.grid) return null;
                const toCoord = (k) => { const p = APP.LevelUtils.UNPACK(k); return { x: p.x + 1, y: p.y + 1 }; };
                const sortCoords = (arr) => arr.sort((a, b) => (a.y - b.y) || (a.x - b.x));
                const blocks = sortCoords(Array.from(level.blockSet || []).map(toCoord));
                const geese = sortCoords(Array.from(level.gooseSet || []).map(toCoord));
                const falseGoals = sortCoords(Array.from(level.falseGoalKeys || []).map(toCoord));
                const mustPass = sortCoords((level.mustPassKeys || []).map(toCoord));
                const mustCross = sortCoords((level.mustCrossKeys || []).map(toCoord));
                const filters = sortCoords(Array.from(level.filterMap?.entries?.() || []).map(([k, axis]) => ({ ...toCoord(k), axis })));
                const flippingFilters = sortCoords(Array.from(level.flippingFilterMap?.entries?.() || []).map(([k, axis]) => ({ ...toCoord(k), axis })));
                const seenPortals = new Set();
                const portals = [];
                (level.portalMap || new Map()).forEach((v, k) => {
                    if (!v || typeof v.dest !== 'number' || v.dest < 0) return;
                    const pair = [k, v.dest].sort((a, b) => a - b).join(':');
                    if (seenPortals.has(pair)) return;
                    seenPortals.add(pair);
                    const a = toCoord(k);
                    const b = toCoord(v.dest);
                    portals.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
                });
                portals.sort((a, b) => (a.y1 - b.y1) || (a.x1 - b.x1) || (a.y2 - b.y2) || (a.x2 - b.x2));

                return {
                    grid: { w: level.grid.w, h: level.grid.h },
                    gates: sortCoords((level.gateKeys || []).map(toCoord)),
                    goal: typeof level.goalKey === 'number' && level.goalKey >= 0 ? toCoord(level.goalKey) : null,
                    reqLen: level.reqLen || 0,
                    reqInt: level.reqInt || 0,
                    blocks,
                    geese,
                    falseGoals,
                    mustPass,
                    mustCross,
                    filters,
                    flippingFilters,
                    portals,
                    hints: Array.isArray(level.hints) ? level.hints : [],
                    levelId: typeof level.id === 'number' ? level.id + 1 : null
                };
            }

            function shiftLevel(l, dx, dy) { if (dx === 0 && dy === 0) return; const shift = (k) => { if (k === -1) return -1; const p = APP.LevelUtils.UNPACK(k); return APP.LevelUtils.PACK(p.x + dx, p.y + dy); }; l.goalKey = shift(l.goalKey); l.gateKeys = l.gateKeys.map(shift); l.falseGoalKeys = new Set(Array.from(l.falseGoalKeys).map(shift)); l.blockSet = new Set(Array.from(l.blockSet).map(shift)); l.gooseSet = new Set(Array.from(l.gooseSet).map(shift)); l.mustPassKeys = l.mustPassKeys.map(shift); l.mustCrossKeys = l.mustCrossKeys.map(shift); const newFilterMap = new Map(); l.filterMap.forEach((v, k) => newFilterMap.set(shift(k), v)); l.filterMap = newFilterMap; const newFlipMap = new Map(); l.flippingFilterMap.forEach((v, k) => newFlipMap.set(shift(k), v)); l.flippingFilterMap = newFlipMap; const newPortalMap = new Map(); l.portalMap.forEach((v, k) => { newPortalMap.set(shift(k), { dest: v.dest === -1 ? -1 : shift(v.dest) }); }); l.portalMap = newPortalMap; l.portalVisuals = l.portalVisuals.map(pv => ({ k1: shift(pv.k1), k2: shift(pv.k2) })); if (APP.State.ENGINE.editor.pendingPortal) { APP.State.ENGINE.editor.pendingPortal = shift(APP.State.ENGINE.editor.pendingPortal); } APP.State.ENGINE.path = APP.State.ENGINE.path.map(shift); APP.Engine.rebuildDerivedPathState(APP.State.ENGINE); l.hints = []; APP.State.ENGINE.hinter.pathList = []; }

            function changeGridSize(delta) { if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || !APP.State.ENGINE.editor.workingLevel) return; const l = APP.State.ENGINE.editor.workingLevel; const newSize = l.grid.w + delta; if (newSize < 6 || newSize > 15) { APP.UI.showMessage("Size limit reached", "text-amber-500 font-bold"); return; } const bounds = APP.LevelUtils.getLevelBounds(l); let shiftX = 0, shiftY = 0; if (bounds) { const width = bounds.maxX - bounds.minX + 1; const height = bounds.maxY - bounds.minY + 1; if (newSize < width || newSize < height) { APP.UI.showMessage("Cannot shrink: items blocking", "text-red-500 font-bold"); return; } if (bounds.maxX >= newSize) shiftX = newSize - 1 - bounds.maxX; if (bounds.maxY >= newSize) shiftY = newSize - 1 - bounds.maxY; } APP.Editor.saveEditorState(); if (shiftX !== 0 || shiftY !== 0) { APP.LevelUtils.shiftLevel(l, shiftX, shiftY); APP.State.ENGINE.editor.validTrapSpots.clear(); } l.grid.w = newSize; l.grid.h = newSize; const pathOutOfBounds = APP.State.ENGINE.path.some(k => { const p = APP.LevelUtils.UNPACK(k); return p.x < 0 || p.y < 0 || p.x >= newSize || p.y >= newSize; }); if (pathOutOfBounds) APP.Engine.PathNavigator.clear(APP.State.ENGINE); APP.State.ENGINE.editor.isModified = true; APP.UI.updateViewport(); APP.State.ENGINE.isDirty = true; APP.UI.showMessage(`Grid: ${newSize}x${newSize}`, "text-sky-600 font-bold"); }

            function transformLevel(l, coordMap, newW, newH, axisMap) { APP.Editor.saveEditorState(); const mapKey = (k) => { if (k === -1) return -1; const p = APP.LevelUtils.UNPACK(k); const tp = coordMap(p.x, p.y); return APP.LevelUtils.PACK(tp.x, tp.y); }; l.goalKey = mapKey(l.goalKey); l.gateKeys = l.gateKeys.map(mapKey); l.falseGoalKeys = new Set(Array.from(l.falseGoalKeys).map(mapKey)); l.blockSet = new Set(Array.from(l.blockSet).map(mapKey)); l.gooseSet = new Set(Array.from(l.gooseSet).map(mapKey)); l.mustPassKeys = l.mustPassKeys.map(mapKey); l.mustCrossKeys = l.mustCrossKeys.map(mapKey); const newFilterMap = new Map(); l.filterMap.forEach((v, k) => newFilterMap.set(mapKey(k), axisMap(v))); l.filterMap = newFilterMap; const newFlipMap = new Map(); l.flippingFilterMap.forEach((v, k) => newFlipMap.set(mapKey(k), axisMap(v))); l.flippingFilterMap = newFlipMap; const newPortalMap = new Map(); l.portalMap.forEach((v, k) => { newPortalMap.set(mapKey(k), { dest: v.dest === -1 ? -1 : mapKey(v.dest) }); }); l.portalMap = newPortalMap; l.portalVisuals = l.portalVisuals.map(pv => ({ k1: mapKey(pv.k1), k2: mapKey(pv.k2) })); if (APP.State.ENGINE.editor.pendingPortal) { APP.State.ENGINE.editor.pendingPortal = mapKey(APP.State.ENGINE.editor.pendingPortal); } APP.State.ENGINE.path = APP.State.ENGINE.path.map(mapKey); if(APP.State.ENGINE.activeGateKey) APP.State.ENGINE.activeGateKey = mapKey(APP.State.ENGINE.activeGateKey); APP.Engine.rebuildDerivedPathState(APP.State.ENGINE); l.grid.w = newW; l.grid.h = newH; l.hints = []; APP.State.ENGINE.hinter.pathList = []; APP.State.ENGINE.editor.validTrapSpots.clear(); APP.State.ENGINE.editor.isModified = true; APP.UI.updateViewport(); }

            function getLevelBounds(l) { let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; const update = (k) => { if (k === -1) return; const p = APP.LevelUtils.UNPACK(k); if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }; if (l.goalKey !== -1) update(l.goalKey); l.gateKeys.forEach(update); l.falseGoalKeys.forEach(update); l.blockSet.forEach(update); l.gooseSet.forEach(update); l.mustPassKeys.forEach(update); l.mustCrossKeys.forEach(update); l.filterMap.forEach((v, k) => update(k)); l.flippingFilterMap.forEach((v, k) => update(k)); l.portalMap.forEach((v, k) => update(k)); if (minX === Infinity) return null; return { minX, minY, maxX, maxY }; }

            function assertLevelShape(level) { if (!level) throw new Error("Level object is null"); if (level.goalKey === undefined || level.goalKey === -1) throw new Error("Level missing goal"); if (!Array.isArray(level.gateKeys) || level.gateKeys.length === 0) throw new Error("Level missing gates"); if (!level.grid || !level.grid.w || !level.grid.h) throw new Error("Grid dimensions missing"); }

        return {
            PACK, UNPACK, inBounds, expCoords, transformPoint, inverseTransformPoint,
            transformAxis, getGridCoord, canonicalCloneLevel, deepCloneLevel, normalizeLevel, denormalizeLevel,
            shiftLevel, changeGridSize, transformLevel, getLevelBounds, assertLevelShape, getRawLevels, resolvePortal, getPortalDisplayColor, isValidMove
        };
    })();
}
