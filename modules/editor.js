export function installEditor(APP) {
    APP.Editor = (() => {
        let refs = { ENGINE: null, UI: null };
        const bind = ({ ENGINE: engineRef, UI: uiRef }) => { refs = { ENGINE: engineRef, UI: uiRef }; };
        const init = bind;

            function pickUpObject(k) { if(APP.State.ENGINE.editor.isPencilMode) return null; saveEditorState(); APP.State.ENGINE.editor.draggedFromGrid = true; APP.State.ENGINE.editor.validTrapSpots.clear(); const l = APP.State.ENGINE.editor.workingLevel; l.hints = []; if (l.gateKeys.includes(k)) { l.gateKeys = l.gateKeys.filter(gk => gk !== k); APP.State.ENGINE.isDirty = true; return {type:'gate'}; } if (l.goalKey === k) { l.goalKey = -1; APP.State.ENGINE.isDirty = true; return {type:'goal'}; } if (l.falseGoalKeys.has(k)) { l.falseGoalKeys.delete(k); APP.State.ENGINE.isDirty = true; return {type:'falseGoal'}; } if (l.blockSet.has(k)) { l.blockSet.delete(k); APP.State.ENGINE.isDirty = true; return {type:'block'}; } if (l.gooseSet.has(k)) { l.gooseSet.delete(k); APP.State.ENGINE.isDirty = true; return {type:'goose'}; } if (l.mustPassKeys.includes(k)) { l.mustPassKeys = l.mustPassKeys.filter(mk => mk !== k); APP.State.ENGINE.isDirty = true; return {type:'mustPass'}; } if (l.mustCrossKeys.includes(k)) { l.mustCrossKeys = l.mustCrossKeys.filter(mk => mk !== k); APP.State.ENGINE.isDirty = true; return {type:'mustCross'}; } if (l.filterMap.has(k)) { const a = l.filterMap.get(k); l.filterMap.delete(k); APP.State.ENGINE.isDirty = true; return {type: a === APP.Core.H ? 'filterH' : 'filterV'}; } if (l.flippingFilterMap.has(k)) { const a = l.flippingFilterMap.get(k); l.flippingFilterMap.delete(k); APP.State.ENGINE.isDirty = true; return {type: a === APP.Core.H ? 'flipH' : 'flipV'}; } if (l.portalMap.has(k)) { const port = l.portalMap.get(k); l.portalMap.delete(k); if (APP.State.ENGINE.editor.pendingPortal === k) { APP.State.ENGINE.editor.pendingPortal = null; APP.UI.showMessage("Portal Cancelled", "text-slate-500"); } else { l.portalVisuals = l.portalVisuals.filter(pv => pv.k1 !== k && pv.k2 !== k); const otherK = port.dest; if (otherK !== -1 && l.portalMap.has(otherK)) { l.portalMap.get(otherK).dest = -1; APP.State.ENGINE.editor.pendingPortal = otherK; APP.UI.showMessage("Portal unpaired! Place next terminal.", "text-fuchsia-600 font-bold"); } } APP.State.ENGINE.isDirty = true; return {type: 'portal'}; } APP.State.ENGINE.editor.undoStack.pop(); APP.State.ENGINE.editor.draggedFromGrid = false; return null; }

            function placeEditorObject(k) { const l = APP.State.ENGINE.editor.workingLevel; const toolType = APP.State.ENGINE.editor.draggedObject ? APP.State.ENGINE.editor.draggedObject.type : APP.State.ENGINE.editor.selectedTool; if (!toolType) return; if (APP.State.ENGINE.editor.pendingPortal && toolType !== 'portal' && toolType !== 'eraser') { APP.UI.showMessage("Finish portal pair first!", "text-red-600 font-bold"); return; } if (l.gateKeys.includes(k) || l.goalKey === k || l.falseGoalKeys.has(k) || l.blockSet.has(k) || l.gooseSet.has(k) || l.filterMap.has(k) || l.flippingFilterMap.has(k) || l.portalMap.has(k) || l.mustPassKeys.includes(k) || l.mustCrossKeys.includes(k)) { if (toolType === 'eraser') { pickUpObject(k); return; } return APP.UI.showMessage("Occupied", "text-red-500"); } if (toolType === 'eraser') return; saveEditorState(); APP.State.ENGINE.editor.validTrapSpots.clear(); l.hints = []; switch(toolType) { case 'gate': l.gateKeys.push(k); break; case 'goal': l.goalKey = k; break; case 'falseGoal': l.falseGoalKeys.add(k); break; case 'block': l.blockSet.add(k); break; case 'mustPass': l.mustPassKeys.push(k); break; case 'mustCross': l.mustCrossKeys.push(k); break; case 'goose': l.gooseSet.add(k); break; case 'filterH': l.filterMap.set(k, APP.Core.H); break; case 'filterV': l.filterMap.set(k, APP.Core.V); break; case 'flipH': l.flippingFilterMap.set(k, APP.Core.H); break; case 'flipV': l.flippingFilterMap.set(k, APP.Core.V); break; case 'portal': if (!APP.State.ENGINE.editor.pendingPortal) { APP.State.ENGINE.editor.pendingPortal = k; l.portalMap.set(k, { dest: -1 }); APP.UI.showMessage("Place second terminal.", "text-fuchsia-600 font-bold"); } else { const k1 = APP.State.ENGINE.editor.pendingPortal; if (k === k1) return; l.portalMap.set(k1, { dest: k }); l.portalMap.set(k, { dest: k1 }); l.portalVisuals.push({ k1, k2: k }); APP.State.ENGINE.editor.pendingPortal = null; APP.UI.showMessage("Portal paired.", "text-fuchsia-600 font-bold"); } break; } APP.State.ENGINE.editor.draggedObject = null; APP.State.ENGINE.isDirty = true; }


            function validateLevelDetailed(l, opts = {}) {
                const reasons = [];
                if (!l) return { ok: false, reasons: ["Level missing"] };
                const allowGateLess = !!opts.allowGateLess;
                const { w, h } = l.grid;
                const inGrid = (k) => { const p = APP.LevelUtils.UNPACK(k); return APP.LevelUtils.inBounds(p.x, p.y, w, h); };
                const addOOB = (label, key) => { const p = APP.LevelUtils.UNPACK(key); reasons.push(`Out of bounds: ${label} (${p.x + 1},${p.y + 1})`); };
                const gateSet = new Set(l.gateKeys);
                // Count orthogonal sides reachable by the path (not blocked by edge/obstacle/filter)
                const accessibleSides = (cx, cy, gatesBlock = false) => {
                    // A flipping filter not adjacent to this cell can be crossed first,
                    // flipping all others — so it exempts adjacent blocking flipping filters.
                    const adjKeys = new Set([[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => APP.LevelUtils.PACK(cx+dx, cy+dy)));
                    const hasFreeFlip = Array.from(l.flippingFilterMap.keys()).some(fk => !adjKeys.has(fk));
                    let n = 0;
                    for (const [dx, dy, horiz] of [[1,0,true],[-1,0,true],[0,1,false],[0,-1,false]]) {
                        const nx = cx + dx, ny = cy + dy;
                        if (!APP.LevelUtils.inBounds(nx, ny, w, h)) continue;
                        const nk = APP.LevelUtils.PACK(nx, ny);
                        if (l.blockSet.has(nk) || l.gooseSet.has(nk) || l.falseGoalKeys.has(nk)) continue;
                        if (gatesBlock && gateSet.has(nk)) continue;
                        const ba = horiz ? APP.Core.V : APP.Core.H;
                        if (l.filterMap.get(nk) === ba) continue;
                        if (!hasFreeFlip && l.flippingFilterMap.get(nk) === ba) continue;
                        n++;
                    }
                    return n;
                };

                if (!allowGateLess && (!Array.isArray(l.gateKeys) || l.gateKeys.length === 0)) reasons.push("No gates");
                if (l.goalKey === -1 || l.goalKey === undefined) reasons.push("Goal missing");
                if (APP.State.ENGINE.editor.pendingPortal) reasons.push("Portal terminals incomplete");

                l.gateKeys.forEach(k => { if (!inGrid(k)) addOOB('gate', k); });
                if (l.goalKey !== -1 && l.goalKey !== undefined && !inGrid(l.goalKey)) addOOB('goal', l.goalKey);
                l.mustPassKeys.forEach(k => { if (!inGrid(k)) addOOB('mustPass', k); });
                l.mustCrossKeys.forEach(k => { if (!inGrid(k)) addOOB('mustCross', k); });
                l.gooseSet.forEach(k => { if (!inGrid(k)) addOOB('goose', k); });
                l.blockSet.forEach(k => { if (!inGrid(k)) addOOB('block', k); });

                let unpaired = false;
                l.portalMap.forEach((v, k) => {
                    if (!l.portalMap.has(v.dest)) unpaired = true;
                    if (!inGrid(k)) addOOB('portal', k);
                    if (v.dest !== -1 && !inGrid(v.dest)) addOOB('portal', v.dest);
                });
                if (unpaired) reasons.push("Portal terminals incomplete");

                // MustCross structural checks
                // Pre-compute: cells orthogonally adjacent to any mustCross
                const mustCrossAdjCells = new Set();
                for (const mk of l.mustCrossKeys) {
                    if (!inGrid(mk)) continue;
                    const mp = APP.LevelUtils.UNPACK(mk);
                    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])
                        mustCrossAdjCells.add(APP.LevelUtils.PACK(mp.x+dx, mp.y+dy));
                }
                // A flipping filter not adjacent to any mustCross can be crossed first,
                // theoretically flipping the blocking ones before the path reaches them.
                const hasFreeFlip = Array.from(l.flippingFilterMap.keys()).some(fk => !mustCrossAdjCells.has(fk));

                for (const k of l.mustCrossKeys) {
                    if (!inGrid(k)) continue;
                    const p = APP.LevelUtils.UNPACK(k);
                    if (l.blockSet.has(k)) reasons.push(`MustCross overlaps block at (${p.x + 1},${p.y + 1})`);
                    if (p.x === 0 || p.x === w - 1 || p.y === 0 || p.y === h - 1) reasons.push(`MustCross on grid edge at (${p.x + 1},${p.y + 1})`);
                    const left = APP.LevelUtils.PACK(p.x-1,p.y), right = APP.LevelUtils.PACK(p.x+1,p.y);
                    const up = APP.LevelUtils.PACK(p.x,p.y-1), down = APP.LevelUtils.PACK(p.x,p.y+1);
                    if ([left,right,up,down].some(nk => l.blockSet.has(nk))) reasons.push(`Block adjacent to MustCross at (${p.x + 1},${p.y + 1})`);
                    if ([left,right,up,down].some(nk => l.gooseSet.has(nk))) reasons.push(`Goose adjacent to MustCross at (${p.x + 1},${p.y + 1})`);
                    if ([left,right].some(nk => l.filterMap.get(nk) === APP.Core.V)) reasons.push(`Vertical filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
                    if ([up,down].some(nk => l.filterMap.get(nk) === APP.Core.H)) reasons.push(`Horizontal filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
                    if (!hasFreeFlip) {
                        if ([left,right].some(nk => l.flippingFilterMap.get(nk) === APP.Core.V)) reasons.push(`Flipping V-filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
                        if ([up,down].some(nk => l.flippingFilterMap.get(nk) === APP.Core.H)) reasons.push(`Flipping H-filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
                    }
                    const inBoundsDiags = [[1,1],[1,-1],[-1,1],[-1,-1]]
                        .filter(([dx,dy]) => APP.LevelUtils.inBounds(p.x+dx, p.y+dy, w, h))
                        .map(([dx,dy]) => APP.LevelUtils.PACK(p.x+dx, p.y+dy));
                    if (inBoundsDiags.some(dk => l.filterMap.has(dk) || l.flippingFilterMap.has(dk)))
                        reasons.push(`Filter diagonally adjacent to MustCross at (${p.x + 1},${p.y + 1})`);
                }

                // Gate accessibility: needs at least one open orthogonal side to start
                for (const gk of l.gateKeys) {
                    if (!inGrid(gk)) continue;
                    const p = APP.LevelUtils.UNPACK(gk);
                    if (accessibleSides(p.x, p.y, true) === 0) reasons.push(`Gate completely surrounded at (${p.x + 1},${p.y + 1})`);
                }
                // Goal accessibility: needs at least one open orthogonal side to enter
                if (l.goalKey !== -1 && l.goalKey !== undefined && inGrid(l.goalKey)) {
                    const p = APP.LevelUtils.UNPACK(l.goalKey);
                    if (accessibleSides(p.x, p.y, true) === 0) reasons.push(`Goal completely surrounded at (${p.x + 1},${p.y + 1})`);
                }
                // MustPass accessibility: needs at least 2 open sides to enter and exit
                for (const mk of l.mustPassKeys) {
                    if (!inGrid(mk)) continue;
                    const p = APP.LevelUtils.UNPACK(mk);
                    if (accessibleSides(p.x, p.y) < 2) reasons.push(`MustPass blocked on 3+ sides at (${p.x + 1},${p.y + 1})`);
                }

                const barrier = (k) => l.blockSet.has(k);
                const reachableFrom = (startKey) => {
                    if (startKey === -1 || startKey === undefined || barrier(startKey)) return new Set();
                    const q = [startKey];
                    const visited = new Set([startKey]);
                    let head = 0;
                    while (head < q.length) {
                        const k = q[head++];
                        const p = APP.LevelUtils.UNPACK(k);
                        const nks = [[0,1],[0,-1],[1,0],[-1,0]].map(([dx,dy]) => APP.LevelUtils.PACK(p.x+dx, p.y+dy));
                        const portal = APP.LevelUtils.resolvePortal(l, k);
                        if (portal && portal.dest !== -1) nks.push(portal.dest);
                        for (const nk of nks) {
                            const np = APP.LevelUtils.UNPACK(nk);
                            if (APP.LevelUtils.inBounds(np.x, np.y, w, h) && !visited.has(nk) && !barrier(nk)) {
                                visited.add(nk);
                                q.push(nk);
                            }
                        }
                    }
                    return visited;
                };
                if (l.goalKey !== -1 && l.goalKey !== undefined && !barrier(l.goalKey) && Array.isArray(l.gateKeys) && l.gateKeys.length > 0) {
                    const goalReach = reachableFrom(l.goalKey);
                    const hasConnectedGate = l.gateKeys.some(gk => goalReach.has(gk));
                    if (!hasConnectedGate) reasons.push("Grid partitioned by barriers");
                }

                return { ok: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
            }


            function validateLevel(l) {
                const res = validateLevelDetailed(l);
                if (!res.ok) APP.UI.showMessage(res.reasons[0], "text-red-500 font-bold");
                return res.ok;
            }

            function saveEditorState() { APP.State.ENGINE.editor.isModified = true; APP.State.ENGINE.editor.undoStack.push(APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.editor.workingLevel)); if (APP.State.ENGINE.editor.undoStack.length > 50) APP.State.ENGINE.editor.undoStack.shift(); APP.State.ENGINE.hinter.pathList = []; }

            function restoreEditorState() { if (APP.State.ENGINE.editor.undoStack.length === 0) return; APP.State.ENGINE.editor.isModified = true; APP.State.ENGINE.editor.workingLevel = APP.State.ENGINE.editor.undoStack.pop(); let newPending = null; APP.State.ENGINE.editor.workingLevel.portalMap.forEach((v, k) => { if (v.dest === -1) newPending = k; }); APP.State.ENGINE.editor.pendingPortal = newPending; APP.State.ENGINE.hinter.pathList = []; APP.State.ENGINE.editor.validTrapSpots.clear(); APP.State.ENGINE.isDirty = true; APP.UI.showMessage("Undo Grid Action", "text-slate-500"); }


            async function generateLevelString() {
                const l = APP.State.ENGINE.editor.workingLevel;
                const isValid = validateLevel(l);
                const reqLen = parseInt(APP.UI.getValue('editReqLen')) || 0;
                const reqInt = parseInt(APP.UI.getValue('editReqInt')) || 0;
                const validateHintPath = (candidatePath) => {
                    const levelForValidation = APP.LevelUtils.deepCloneLevel(l);
                    levelForValidation.reqLen = reqLen;
                    levelForValidation.reqInt = reqInt;
                    return APP.Solver.validateCandidatePath(levelForValidation, candidatePath);
                };
                const normalizedHints = [];
                const seen = new Set();
                const pushUniqueHint = (candidatePath) => {
                    const validation = validateHintPath(candidatePath);
                    if (!validation?.ok) return;
                    const path = validation.path;
                    const key = JSON.stringify(path);
                    if (seen.has(key)) return;
                    seen.add(key);
                    normalizedHints.push(path);
                };

                const savedHints = Array.isArray(l.hints) ? l.hints : [];
                savedHints.forEach(pushUniqueHint);

                const liveHints = Array.isArray(APP.State.ENGINE.foundHintsSinceLoad) ? APP.State.ENGINE.foundHintsSinceLoad : [];
                liveHints.forEach(pushUniqueHint);

                if (APP.State.ENGINE.path.length > 1) pushUniqueHint(APP.State.ENGINE.path);

                const exportedHints = normalizedHints.slice(0, 5);
                applyMetadataFromUI(l);

                const out = {
                    grid: l.grid,
                    gates: APP.LevelUtils.expCoords(l.gateKeys),
                    goal: { x: APP.LevelUtils.UNPACK(l.goalKey).x + 1, y: APP.LevelUtils.UNPACK(l.goalKey).y + 1 },
                    falseGoals: APP.LevelUtils.expCoords(l.falseGoalKeys),
                    reqLen,
                    reqInt,
                    designerName: l.designerName || '',
                    description: l.description || '',
                    difficulty: l.difficulty ?? null,
                    blocks: APP.LevelUtils.expCoords(l.blockSet),
                    mustPass: APP.LevelUtils.expCoords(l.mustPassKeys),
                    mustCross: APP.LevelUtils.expCoords(l.mustCrossKeys),
                    filters: Array.from(l.filterMap.entries()).map(([k, axis]) => ({ x: APP.LevelUtils.UNPACK(k).x + 1, y: APP.LevelUtils.UNPACK(k).y + 1, axis })),
                    flippingFilters: Array.from(l.flippingFilterMap.entries()).map(([k, axis]) => ({ x: APP.LevelUtils.UNPACK(k).x + 1, y: APP.LevelUtils.UNPACK(k).y + 1, axis })),
                    portals: l.portalVisuals.map(pv => ({ x1: APP.LevelUtils.UNPACK(pv.k1).x + 1, y1: APP.LevelUtils.UNPACK(pv.k1).y + 1, x2: APP.LevelUtils.UNPACK(pv.k2).x + 1, y2: APP.LevelUtils.UNPACK(pv.k2).y + 1 })),
                    geese: APP.LevelUtils.expCoords(l.gooseSet),
                    hints: exportedHints
                };

                const json = JSON.stringify(out).replace(/\"([^\"]+)\":/g, '$1:').replace(/\s/g, '').slice(1, -1);
                APP.UI.setSolutionOutput(json);
                await APP.UI.copyText(json, { fallbackElId: 'solutionOutput' });
                APP.State.ENGINE.editor.isModified = false;
                if (isValid) {
                    APP.UI.showMessage("Data Generated & Copied!", "text-white font-black");
                } else {
                    setTimeout(() => APP.UI.showMessage("Data Copied (Check Errors!)", "text-white font-black"), 1500);
                }
            }

            function applyMetadataFromUI(level = refs.ENGINE?.editor?.workingLevel) {
                if (!level) return;
                level.designerName = (refs.UI.getValue('levelDesignerInput', '') || '').trim();
                level.description = (refs.UI.getValue('levelDescriptionInput', '') || '').trim();
                const rawDifficulty = refs.UI.getValue('levelDifficultyInput', '');
                const n = parseInt(rawDifficulty, 10);
                level.difficulty = Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : null;
            }

            function syncMetadataFieldsFromLevel(level = refs.ENGINE?.editor?.workingLevel) {
                refs.UI.setInputValue('levelDesignerInput', level?.designerName || '');
                refs.UI.setInputValue('levelDescriptionInput', level?.description || '');
                refs.UI.setInputValue('levelDifficultyInput', level?.difficulty ?? '');
            }


        return {
            init,
            enterEditorMode() { APP.Engine.switchMode(APP.Core.EDITOR); },
            exitEditorMode() { APP.Engine.switchMode(APP.Core.PLAY); },
            loadWorkingLevel(fromLevelObjOrBlank) { refs.ENGINE.editor.workingLevel = APP.LevelUtils.deepCloneLevel(fromLevelObjOrBlank); refs.ENGINE.editor.isModified = false; },
            commitWorkingLevel() { refs.ENGINE.level = APP.LevelUtils.deepCloneLevel(refs.ENGINE.editor.workingLevel); refs.ENGINE.editor.isModified = false; },
            applyMetricsFromUI() {
                if (!refs.ENGINE?.editor?.workingLevel) return;
                const clampMetric = (n) => Number.isFinite(n) ? Math.max(0, Math.min(999, Math.floor(n))) : 0;
                refs.ENGINE.editor.workingLevel.reqLen = clampMetric(parseInt(refs.UI.getValue('editReqLen'), 10));
                refs.ENGINE.editor.workingLevel.reqInt = clampMetric(parseInt(refs.UI.getValue('editReqInt'), 10));
                applyMetadataFromUI(refs.ENGINE.editor.workingLevel);
            },
            setObjectAt(k, obj) {
                refs.ENGINE.editor.draggedObject = obj;
                return placeEditorObject(k);
            },
            removeObjectAt(k) {
                refs.ENGINE.editor.draggedObject = null;
                return pickUpObject(k);
            },
            validateWorkingLevel() {
                return validateLevelDetailed(refs.ENGINE.editor.workingLevel);
            },
            setTrapSpots(spots = new Set()) {
                refs.ENGINE.editor.validTrapSpots = spots || new Set();
            },
            resetWorkingGrid() {
                this.saveEditorState();
                const l = refs.ENGINE.editor.workingLevel;
                Object.assign(l, {gateKeys: [], goalKey: -1, falseGoalKeys: new Set(), blockSet: new Set(), gooseSet: new Set(), mustPassKeys: [], mustCrossKeys: [], filterMap: new Map(), flippingFilterMap: new Map(), portalMap: new Map(), portalVisuals: []});
                APP.Engine.PathNavigator.clear(refs.ENGINE);
                refs.ENGINE.isDirty = true;
            },
            createNewLevel() {
                refs.ENGINE.editor.workingLevel = { grid: { w: 10, h: 10 }, reqLen: 0, reqInt: 0, goalKey: -1, falseGoalKeys: new Set(), gateKeys: [], blockSet: new Set(), gooseSet: new Set(), portalMap: new Map(), portalVisuals: [], filterMap: new Map(), flippingFilterMap: new Map(), mustPassKeys: [], mustCrossKeys: [], hints: [], designerName: '', description: '', difficulty: null };
                APP.Engine.PathNavigator.clear(refs.ENGINE);
                refs.UI.setSolutionOutput('');
                refs.ENGINE.hinter.pathList = [];
                refs.ENGINE.editor.pendingPortal = null;
                refs.ENGINE.editor.validTrapSpots.clear();
                refs.UI.setModalContent('levelTitle', '??', 'text');
                refs.UI.setInputValue('editReqLen', 0);
                refs.UI.setInputValue('editReqInt', 0);
                syncMetadataFieldsFromLevel(refs.ENGINE.editor.workingLevel);
                refs.ENGINE.editor.isPencilMode = false;
                APP.Engine.updatePencilState(); // Cross-module call: state updater is owned by APP.Engine.
                refs.ENGINE.editor.isModified = true;
                APP.UI.updateViewport();
            },
            markEditorInputsDirty() {
                refs.ENGINE.hinter.pathList = [];
                refs.ENGINE.editor.validTrapSpots.clear();
                refs.ENGINE.editor.isModified = true;
            },
            handlePaletteToolPointerDown(toolType, options = {}) {
                if (refs.ENGINE.mode !== APP.Core.EDITOR && refs.ENGINE.mode !== APP.Core.REVIEW) return;
                if (refs.ENGINE.overlayState !== APP.Core.OVERLAY_NONE) return;
                refs.ENGINE.editor.draggedFromGrid = false;
                refs.ENGINE.editor.emptyClickCount = 0;
                if (refs.ENGINE.editor.pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
                    refs.UI.showMessage('Finish portal pair!', 'text-white font-black');
                    return;
                }
                const forceActivate = !!options.forceActivate;
                if (refs.ENGINE.editor.selectedTool === toolType && !forceActivate) {
                    refs.ENGINE.editor.selectedTool = null;
                    refs.UI.setPaletteSelectedByType(toolType, false);
                    refs.ENGINE.editor.draggedObject = null;
                    APP.Engine.setLogicState(APP.Core.IDLE);
                } else {
                    refs.ENGINE.editor.selectedTool = toolType;
                    refs.ENGINE.editor.draggedObject = { type: toolType };
                    APP.Engine.setLogicState(APP.Core.EDIT_DRAG);
                    refs.UI.clearPaletteSelection();
                    refs.UI.setPaletteSelectedByType(toolType, true);
                }
                refs.ENGINE.editor.isPencilMode = false;
                APP.Engine.updatePencilState(); // Cross-module call: state updater is owned by APP.Engine.
            },
            togglePencilMode() {
                if (refs.ENGINE.overlayState !== APP.Core.OVERLAY_NONE) return;
                refs.ENGINE.editor.isPencilMode = !refs.ENGINE.editor.isPencilMode;
                if (refs.ENGINE.editor.isPencilMode) {
                    refs.ENGINE.editor.selectedTool = null;
                    refs.UI.clearPaletteSelection();
                } else {
                    APP.Engine.setLogicState(APP.Core.IDLE);
                }
                APP.Engine.updatePencilState(); // Cross-module call: state updater is owned by APP.Engine.
            },
            setWorkingHints(hints = []) { if (refs.ENGINE?.editor?.workingLevel) refs.ENGINE.editor.workingLevel.hints = hints; },
            pickUpObject(k) { return pickUpObject(k); },
            placeEditorObject(k) { return placeEditorObject(k); },
            validateLevelDetailed(level) { return validateLevelDetailed(level); },
            saveEditorState() { return saveEditorState(); },
            restoreEditorState() { return restoreEditorState(); },
            validateLevel(level) { return validateLevel(level); },
            generateLevelString() { return generateLevelString(); },
            setLogicState(newState) { return APP.Engine.setLogicState(newState); },
            setOverlayState(newState) { return APP.Engine.setOverlayState(newState); },
            getRealLength(state = APP.State.ENGINE) { return APP.Engine.getRealLength(state); },
            rebuildDerivedPathState(state = APP.State.ENGINE) { return APP.Engine.rebuildDerivedPathState(state); },
            assertStateConsistency(state = APP.State.ENGINE) { return APP.Engine.assertStateConsistency(state); },
            updatePencilState() { return APP.Engine.updatePencilState(); },
            applyMetadataFromUI,
            syncMetadataFieldsFromLevel
        };
    })();

    APP.Editor.init({ ENGINE: APP.State.ENGINE, UI: APP.UI });
}
