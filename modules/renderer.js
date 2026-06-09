export function installRenderer(APP) {
    APP.Renderer = (() => {

                const cvs = document.getElementById('gameCanvas');

                const ctx = cvs.getContext('2d');



                function getScreenPos(cx, cy) { const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel; const { tx, ty } = APP.LevelUtils.transformPoint(cx, cy, APP.State.ENGINE.variant, l.grid.w, l.grid.h); return { sx: (tx + 0.5) * APP.State.ENGINE.viewport.cellW, sy: (ty + 0.5) * APP.State.ENGINE.viewport.cellH }; }

                function drawRequiredPin(drawCtx, size, options = {}) {
                    const tilt = options.isSatisfied ? 15 : -15;
                    const pinYOffset = options.pinYOffset || 0;
                    drawCtx.translate(0, pinYOffset);
                    drawCtx.rotate(tilt * Math.PI / 180);
                    const scale = size / 35;
                    drawCtx.scale(scale, scale);
                    drawCtx.beginPath();
                    drawCtx.moveTo(-1, 0);
                    drawCtx.lineTo(1, 0);
                    drawCtx.lineTo(1.5, -12);
                    drawCtx.lineTo(-1.5, -12);
                    drawCtx.closePath();
                    drawCtx.fillStyle = '#94a3b8';
                    drawCtx.fill();
                    drawCtx.beginPath();
                    drawCtx.arc(0, -18, 7, 0, Math.PI * 2);
                    drawCtx.fillStyle = options.isSatisfied ? options.themeColors.pin : options.themeColors.pinUnflipped;
                    drawCtx.fill();
                }

                const DRAW_REGISTRY = {
                    bomb(drawCtx, size) { const scale = size / 100; drawCtx.scale(scale, scale); drawCtx.beginPath(); drawCtx.arc(0, 10, 25, 0, Math.PI * 2); drawCtx.fillStyle = '#334155'; drawCtx.fill(); drawCtx.beginPath(); drawCtx.moveTo(0, -15); drawCtx.quadraticCurveTo(15, -30, 30, -25); drawCtx.strokeStyle = '#94a3b8'; drawCtx.lineWidth = 4; drawCtx.stroke(); drawCtx.beginPath(); drawCtx.arc(30, -25, 5, 0, Math.PI * 2); drawCtx.fillStyle = '#ef4444'; drawCtx.fill(); drawCtx.beginPath(); drawCtx.arc(30, -25, 2.5, 0, Math.PI * 2); drawCtx.fillStyle = '#fde047'; drawCtx.fill(); drawCtx.beginPath(); drawCtx.moveTo(-5, -15); drawCtx.lineTo(5, -15); drawCtx.lineTo(5, -5); drawCtx.lineTo(-5, -5); drawCtx.closePath(); drawCtx.fillStyle = '#64748b'; drawCtx.fill(); },
                    goose(drawCtx, size, color, options = {}) { if (options.isCheatReveal) drawCtx.globalAlpha = 0.5; const mapX = (v) => -size / 2 + (v / 100 * size), mapY = (v) => -size / 2 + (v / 100 * size); drawCtx.fillStyle = '#000000'; drawCtx.beginPath(); drawCtx.moveTo(mapX(30), mapY(0)); drawCtx.lineTo(mapX(70), mapY(0)); drawCtx.lineTo(mapX(100), mapY(30)); drawCtx.lineTo(mapX(100), mapY(70)); drawCtx.lineTo(mapX(70), mapY(100)); drawCtx.lineTo(mapX(30), mapY(100)); drawCtx.lineTo(mapX(0), mapY(70)); drawCtx.lineTo(mapX(0), mapY(30)); drawCtx.closePath(); drawCtx.fill(); drawCtx.fillStyle = '#FFFFFF'; drawCtx.beginPath(); drawCtx.moveTo(mapX(25), mapY(60)); drawCtx.quadraticCurveTo(mapX(25), mapY(45), mapX(45), mapY(45)); drawCtx.lineTo(mapX(65), mapY(45)); drawCtx.quadraticCurveTo(mapX(75), mapY(45), mapX(75), mapY(55)); drawCtx.quadraticCurveTo(mapX(75), mapY(65), mapX(65), mapY(65)); drawCtx.lineTo(mapX(40), mapY(65)); drawCtx.quadraticCurveTo(mapX(25), mapY(65), mapX(25), mapY(60)); drawCtx.fill(); drawCtx.beginPath(); drawCtx.moveTo(mapX(25), mapY(55)); drawCtx.lineTo(mapX(15), mapY(45)); drawCtx.lineTo(mapX(30), mapY(55)); drawCtx.closePath(); drawCtx.fill(); drawCtx.beginPath(); drawCtx.moveTo(mapX(60), mapY(45)); drawCtx.lineTo(mapX(60), mapY(25)); drawCtx.quadraticCurveTo(mapX(60), mapY(18), mapX(68), mapY(18)); drawCtx.quadraticCurveTo(mapX(75), mapY(18), mapX(75), mapY(25)); drawCtx.lineTo(mapX(75), mapY(35)); drawCtx.lineTo(mapX(68), mapY(35)); drawCtx.lineTo(mapX(68), mapY(45)); drawCtx.closePath(); drawCtx.fill(); drawCtx.fillStyle = '#000000'; drawCtx.beginPath(); drawCtx.arc(mapX(70), mapY(23), size * 0.02, 0, Math.PI * 2); drawCtx.fill(); drawCtx.fillStyle = '#f97316'; drawCtx.beginPath(); drawCtx.moveTo(mapX(75), mapY(29)); drawCtx.lineTo(mapX(88), mapY(32)); drawCtx.lineTo(mapX(75), mapY(35)); drawCtx.closePath(); drawCtx.fill(); drawCtx.beginPath(); drawCtx.moveTo(mapX(45), mapY(65)); drawCtx.lineTo(mapX(40), mapY(78)); drawCtx.lineTo(mapX(52), mapY(78)); drawCtx.closePath(); drawCtx.moveTo(mapX(58), mapY(65)); drawCtx.lineTo(mapX(53), mapY(78)); drawCtx.lineTo(mapX(65), mapY(78)); drawCtx.closePath(); drawCtx.fill(); },
                    prohibited(drawCtx, size) { drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.35, 0, Math.PI * 2); drawCtx.strokeStyle = '#ef4444'; drawCtx.lineWidth = size * 0.1; drawCtx.stroke(); drawCtx.beginPath(); const lineLen = size * 0.25; drawCtx.moveTo(-lineLen, -lineLen); drawCtx.lineTo(lineLen, lineLen); drawCtx.stroke(); },
                    required(drawCtx, size, color, options = {}) { drawRequiredPin(drawCtx, size, options); },
                    mustCross(drawCtx, size, color) { drawCtx.strokeStyle = color; drawCtx.globalAlpha = 0.25; drawCtx.lineWidth = size * 0.08; const outer = size * 0.4, inner = size * 0.18; drawCtx.beginPath(); drawCtx.moveTo(-outer, -inner); drawCtx.lineTo(-inner, -inner); drawCtx.lineTo(-inner, -outer); drawCtx.stroke(); drawCtx.beginPath(); drawCtx.moveTo(outer, -inner); drawCtx.lineTo(inner, -inner); drawCtx.lineTo(inner, -outer); drawCtx.stroke(); drawCtx.beginPath(); drawCtx.moveTo(-outer, inner); drawCtx.lineTo(-inner, inner); drawCtx.lineTo(-inner, outer); drawCtx.stroke(); drawCtx.beginPath(); drawCtx.moveTo(outer, inner); drawCtx.lineTo(inner, inner); drawCtx.lineTo(inner, outer); drawCtx.stroke(); },
                    filter(drawCtx, size, color, options = {}) { if (options.axis === APP.Core.V) drawCtx.rotate(Math.PI / 2); drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.25; const w = size * 0.45, t = size * 0.08; drawCtx.fillRect(-size / 2 + size * 0.1, -w / 2, size * 0.8, t); drawCtx.fillRect(-size / 2 + size * 0.1, w / 2 - t, size * 0.8, t); },
                    flippingFilter(drawCtx, size, color, options = {}) { drawCtx.rotate(options.rotation || 0); if (options.axis === APP.Core.V) drawCtx.rotate(Math.PI / 2); drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.25; const w = size * 0.45, t = size * 0.08; drawCtx.fillRect(-size / 2 + size * 0.1, -w / 2, size * 0.8, t); drawCtx.fillRect(-size / 2 + size * 0.1, w / 2 - t, size * 0.8, t); drawCtx.globalAlpha = options.crossed ? 0.4 : 1.0; drawCtx.fillStyle = color; drawCtx.font = `900 ${size * 0.45}px sans-serif`; drawCtx.textAlign = 'center'; drawCtx.textBaseline = 'middle'; drawCtx.fillText('↺', 0, 0); }
                };

                function drawAsset(type, x, y, options = {}) { const drawer = DRAW_REGISTRY[type]; if (!drawer) return; const { sx, sy } = getScreenPos(x, y); const size = options.size ?? APP.State.ENGINE.viewport.cellW; ctx.save(); ctx.translate(sx, sy); ctx.beginPath(); drawer(ctx, size, options.color, options); ctx.restore(); }

                function drawPath(pathArr, isJumpSet, strokeStyle, width, isCaution = false) {
                    if (!pathArr.length) return;
                    ctx.save();
                    ctx.lineWidth = width;
                    ctx.lineCap = isCaution ? 'butt' : 'round';
                    ctx.lineJoin = 'round';

                    const drawDot = (sx, sy, color) => {
                        ctx.save();
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(sx, sy, width / 2, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    };

                    const getCautionSegmentEndpoints = () => {
                        if (!pathArr.length) return [];
                        const endpointIndices = [0];
                        for (let i = 1; i < pathArr.length; i++) {
                            if (isJumpSet.has(i)) {
                                endpointIndices.push(i - 1, i);
                            }
                        }
                        endpointIndices.push(pathArr.length - 1);
                        return [...new Set(endpointIndices)].map(idx => {
                            const p = APP.LevelUtils.UNPACK(pathArr[idx]);
                            return getScreenPos(p.x, p.y);
                        });
                    };

                    if (pathArr.length === 1 && !isCaution) {
                        const start = APP.LevelUtils.UNPACK(pathArr[0]);
                        const sStart = getScreenPos(start.x, start.y);
                        drawDot(sStart.sx, sStart.sy, (strokeStyle === 'rainbow') ? '#ff0000' : strokeStyle);
                        ctx.restore();
                        return;
                    }

                    if (isCaution) {
                        const trace = () => {
                            const start = APP.LevelUtils.UNPACK(pathArr[0]);
                            const sStart = getScreenPos(start.x, start.y);
                            ctx.beginPath();
                            ctx.moveTo(sStart.sx, sStart.sy);
                            ctx.lineTo(sStart.sx, sStart.sy);
                            for (let i = 1; i < pathArr.length; i++) {
                                const p = APP.LevelUtils.UNPACK(pathArr[i]);
                                const s = getScreenPos(p.x, p.y);
                                if (isJumpSet.has(i)) {
                                    ctx.moveTo(s.sx, s.sy);
                                    ctx.lineTo(s.sx, s.sy);
                                } else {
                                    ctx.lineTo(s.sx, s.sy);
                                }
                            }
                        };

                        ctx.strokeStyle = '#fbbf24';
                        trace();
                        ctx.stroke();

                        ctx.strokeStyle = '#000000';
                        ctx.setLineDash([width, width]);
                        trace();
                        ctx.stroke();
                        ctx.setLineDash([]);

                        getCautionSegmentEndpoints().forEach(({ sx, sy }) => {
                            drawDot(sx, sy, '#fbbf24');
                        });
                    } else if (APP.State.ENGINE.rainbowActive) {
                        const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
                        let totalLength = 0;
                        const segments = [];
                        for (let i = 1; i < pathArr.length; i++) {
                            if (isJumpSet.has(i)) continue;
                            const p1 = APP.LevelUtils.UNPACK(pathArr[i - 1]);
                            const p2 = APP.LevelUtils.UNPACK(pathArr[i]);
                            const s1 = getScreenPos(p1.x, p1.y);
                            const s2 = getScreenPos(p2.x, p2.y);
                            const dx = s2.sx - s1.sx;
                            const dy = s2.sy - s1.sy;
                            const len = Math.hypot(dx, dy);
                            segments.push({ s1, s2, len });
                            totalLength += len;
                        }

                        const start = APP.LevelUtils.UNPACK(pathArr[0]);
                        const sStart = getScreenPos(start.x, start.y);
                        drawDot(sStart.sx, sStart.sy, colors[0]);

                        let curTravel = 0;
                        segments.forEach(seg => {
                            const mid = curTravel + seg.len / 2;
                            const t = mid / Math.max(totalLength, 1);
                            const colorIndex = Math.floor(t * colors.length) % colors.length;
                            ctx.strokeStyle = colors[colorIndex];
                            ctx.beginPath();
                            ctx.moveTo(seg.s1.sx, seg.s1.sy);
                            ctx.lineTo(seg.s2.sx, seg.s2.sy);
                            ctx.stroke();
                            curTravel += seg.len;
                        });

                        let jumpTravel = 0;
                        for (let i = 1; i < pathArr.length; i++) {
                            if (isJumpSet.has(i)) {
                                const p = APP.LevelUtils.UNPACK(pathArr[i]);
                                const s = getScreenPos(p.x, p.y);
                                const t = jumpTravel / Math.max(totalLength, 1);
                                const colorIndex = Math.floor(t * colors.length) % colors.length;
                                drawDot(s.sx, s.sy, colors[colorIndex]);
                            } else {
                                const p1 = APP.LevelUtils.UNPACK(pathArr[i - 1]);
                                const p2 = APP.LevelUtils.UNPACK(pathArr[i]);
                                jumpTravel += Math.hypot(p2.x - p1.x, p2.y - p1.y) * APP.State.ENGINE.viewport.cellW;
                            }
                        }
                    } else {
                        ctx.strokeStyle = strokeStyle;
                        const trace = () => {
                            const start = APP.LevelUtils.UNPACK(pathArr[0]);
                            const sStart = getScreenPos(start.x, start.y);
                            ctx.beginPath();
                            ctx.moveTo(sStart.sx, sStart.sy);
                            ctx.lineTo(sStart.sx, sStart.sy);
                            for (let i = 1; i < pathArr.length; i++) {
                                const p = APP.LevelUtils.UNPACK(pathArr[i]);
                                const s = getScreenPos(p.x, p.y);
                                if (isJumpSet.has(i)) {
                                    ctx.moveTo(s.sx, s.sy);
                                    ctx.lineTo(s.sx, s.sy);
                                } else {
                                    ctx.lineTo(s.sx, s.sy);
                                }
                            }
                        };
                        trace();
                        ctx.stroke();
                    }

                    ctx.restore();
                }

                function drawScorchMark(ctx, cx, cy, s) { ctx.save(); ctx.translate(cx, cy); const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.4); grad.addColorStop(0, 'rgba(0,0,0,0.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = grad; ctx.beginPath(); const radii = [0.35, 0.15, 0.4, 0.2, 0.3, 0.15, 0.35, 0.2, 0.4, 0.15, 0.3, 0.25, 0.35, 0.15, 0.4, 0.2]; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = s * radii[i]; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.restore(); }

                function drawMustPassOverflowOverlay(pins, th, vp) {
                    const overlay = document.getElementById('mustPassOverlay');
                    if (!overlay) return;
                    overlay.innerHTML = '';
                    if (!pins || !pins.length) return;
                    const canvasRect = cvs.getBoundingClientRect();
                    const paneRect = overlay.getBoundingClientRect();
                    if (!canvasRect.width || !canvasRect.height || !paneRect.width || !paneRect.height || !cvs.width || !cvs.height) {
                        APP.State.ENGINE.isDirty = true;
                        return;
                    }

                    const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                    if (!l) return;
                    const gridW = APP.State.ENGINE.viewport.swapped ? l.grid.h : l.grid.w;
                    const gridH = APP.State.ENGINE.viewport.swapped ? l.grid.w : l.grid.h;

                    const scaleX = canvasRect.width / cvs.width;
                    const scaleY = canvasRect.height / cvs.height;
                    const cssCellW = (vp.cellW || (cvs.width / gridW)) * scaleX;
                    const cssCellH = (vp.cellH || (cvs.height / gridH)) * scaleY;
                    const markerCanvasSize = Math.max(cssCellW, cssCellH) * 1.5;

                    pins.forEach(({ x, y, isHit }) => {
                        const { sx, sy } = getScreenPos(x, y);
                        const cssX = canvasRect.left - paneRect.left + sx * scaleX;
                        const cssY = canvasRect.top - paneRect.top + sy * scaleY;

                        const pinCanvas = document.createElement('canvas');
                        pinCanvas.width = Math.max(1, Math.round(markerCanvasSize * window.devicePixelRatio));
                        pinCanvas.height = Math.max(1, Math.round(markerCanvasSize * window.devicePixelRatio));
                        pinCanvas.style.position = 'absolute';
                        pinCanvas.style.left = `${cssX - markerCanvasSize / 2}px`;
                        pinCanvas.style.top = `${cssY - markerCanvasSize / 2}px`;
                        pinCanvas.style.width = `${markerCanvasSize}px`;
                        pinCanvas.style.height = `${markerCanvasSize}px`;
                        pinCanvas.style.backgroundColor = 'transparent';
                        pinCanvas.style.pointerEvents = 'none';

                        const pinCtx = pinCanvas.getContext('2d');
                        if (!pinCtx) return;
                        pinCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
                        pinCtx.translate(markerCanvasSize / 2, markerCanvasSize / 2);
                        drawRequiredPin(pinCtx, Math.min(cssCellW, cssCellH), { isSatisfied: isHit, themeColors: th.colors });

                        overlay.appendChild(pinCanvas);
                    });
                }

                function render() {

                const vp = APP.State.ENGINE.viewport, l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel; const mustPassOverlay = document.getElementById('mustPassOverlay'); if (mustPassOverlay) mustPassOverlay.innerHTML = ''; if (!vp.cellW || !l) { const clearTh = APP.Themes.THEMES[APP.Themes.getCurrentTheme()]; if (clearTh) { ctx.fillStyle = clearTh.canvasBg; ctx.fillRect(0, 0, cvs.width, cvs.height); } return; } const th = APP.Themes.THEMES[APP.Themes.getCurrentTheme()]; ctx.fillStyle = th.canvasBg; ctx.fillRect(0, 0, cvs.width, cvs.height); const W = l.grid.w, H = l.grid.h, dispW = APP.State.ENGINE.viewport.swapped ? H : W, dispH = APP.State.ENGINE.viewport.swapped ? W : H, inset = vp.cellW * 0.25; ctx.beginPath(); ctx.strokeStyle = th.grid; ctx.lineWidth = 1; for (let i = 0; i <= dispW; i++) { const x = i * vp.cellW; ctx.moveTo(x, inset); ctx.lineTo(x, cvs.height - inset); } for (let i = 0; i <= dispH; i++) { const y = i * vp.cellH; ctx.moveTo(inset, y); ctx.lineTo(cvs.width - inset, y); } ctx.stroke();



                if (APP.State.ENGINE.mode === APP.Core.EDITOR && APP.State.ENGINE.editor.validTrapSpots && APP.State.ENGINE.editor.validTrapSpots.size > 0) { APP.State.ENGINE.editor.validTrapSpots.forEach(k => { const p = APP.LevelUtils.UNPACK(k), { sx, sy } = getScreenPos(p.x, p.y); const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2; ctx.save(); ctx.fillStyle = th.colors.goal + '40'; ctx.fillRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4); ctx.strokeStyle = th.colors.goal; ctx.lineWidth = 3; ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.1]); ctx.strokeRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4); ctx.restore(); }); }



                let showParityWarnings = false, invalidGateKeys = new Set(), invalidPortalTerminalKeys = new Set();

                if ((APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW || APP.State.ENGINE.cheatActive) && l.goalKey !== -1) {
                    if (APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW) l.reqLen = parseInt(APP.UI.getValue('editReqLen')) || l.reqLen || 0;
                    if ((l.reqLen || 0) > 0 || APP.State.ENGINE.path.length > 0 || APP.State.ENGINE.cheatActive) {
                        invalidGateKeys = APP.LevelUtils.getParityInvalidGateKeys(l);
                        invalidPortalTerminalKeys = APP.LevelUtils.getParityInvalidPortalTerminalKeys(l);
                        showParityWarnings = invalidGateKeys.size > 0 || invalidPortalTerminalKeys.size > 0;
                    }
                }



                const hintOverlayActive = APP.State.ENGINE.overlayState === APP.Core.HINT_ANIMATING && APP.State.ENGINE.hinter.pathList.length;
                let hintPath = [];
                let hintDisplayPath = [];
                const hintCrossedFlippingFilters = new Map();
                let hintDisplayFlipCount = 0;
                if (hintOverlayActive) {
                    hintPath = APP.State.ENGINE.hinter.pathList[APP.State.ENGINE.hinter.currentPathIdx] || [];
                    hintDisplayPath = hintPath.slice(0, Math.floor(APP.State.ENGINE.hinter.index));
                    for (const key of hintDisplayPath) {
                        if (l.flippingFilterMap.has(key) && !hintCrossedFlippingFilters.has(key)) {
                            hintCrossedFlippingFilters.set(key, hintDisplayFlipCount);
                            hintDisplayFlipCount++;
                        }
                    }
                }

                l.filterMap.forEach((axis, k) => { const p = APP.LevelUtils.UNPACK(k); drawAsset('filter', p.x, p.y, { axis: APP.LevelUtils.transformAxis(axis, APP.State.ENGINE.variant), color: th.colors.filter }); });



                l.flippingFilterMap.forEach((baseAxis, k) => {

                    const p = APP.LevelUtils.UNPACK(k);

                    const crossed = hintOverlayActive ? hintCrossedFlippingFilters.has(k) : APP.State.ENGINE.crossedFlippingFilters.has(k);

                    const targetFlips = hintOverlayActive
                        ? (crossed ? hintCrossedFlippingFilters.get(k) : hintDisplayFlipCount)
                        : (crossed ? APP.State.ENGINE.crossedFlippingFilters.get(k) : APP.State.ENGINE.flipCount);

                    let currentVisualFlips = targetFlips;

                    if (!hintOverlayActive && !crossed && APP.State.ENGINE.visualFlipCount !== undefined) { currentVisualFlips = APP.State.ENGINE.visualFlipCount; }

                    const rotation = currentVisualFlips * (Math.PI / 2);

                    drawAsset('flippingFilter', p.x, p.y, { axis: APP.LevelUtils.transformAxis(baseAxis, APP.State.ENGINE.variant), color: th.colors.filter, rotation, crossed });

                });



                l.mustCrossKeys.forEach(k => { const p = APP.LevelUtils.UNPACK(k); drawAsset('mustCross', p.x, p.y, { color: th.colors.cross }); });

                l.blockSet.forEach(k => { const p = APP.LevelUtils.UNPACK(k), { sx, sy } = getScreenPos(p.x, p.y); const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2, cr = vp.cellW * 0.2; ctx.fillStyle = th.colors.block; ctx.beginPath(); ctx.roundRect(cx + 1, cy + 1, vp.cellW - 2, vp.cellH - 2, cr); ctx.fill(); ctx.fillStyle = th.grid; for(let r=1;r<=3;r++) for(let c=1;c<=3;c++) { ctx.beginPath(); ctx.arc(cx+(c*0.25*vp.cellW),cy+(r*0.25*vp.cellH),vp.cellW*0.045,0,Math.PI*2); ctx.fill(); } });



                l.portalVisuals.forEach(pv => { const color = APP.LevelUtils.getPortalDisplayColor(l, pv.k1, th.colors.portal); ctx.strokeStyle = color; ctx.lineWidth = vp.cellW * 0.1; ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]); [APP.LevelUtils.UNPACK(pv.k1), APP.LevelUtils.UNPACK(pv.k2)].forEach(p => { const { sx, sy } = getScreenPos(p.x, p.y); ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = color + '25'; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]); if (showParityWarnings && invalidPortalTerminalKeys.has(APP.LevelUtils.PACK(p.x, p.y))) drawAsset('prohibited', p.x, p.y); }); }); ctx.setLineDash([]);



                if (APP.State.ENGINE.editor.pendingPortal) { const pp = APP.LevelUtils.UNPACK(APP.State.ENGINE.editor.pendingPortal), { sx, sy } = getScreenPos(pp.x, pp.y); ctx.strokeStyle = th.colors.portal; ctx.lineWidth = vp.cellW * 0.1; ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]); ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = th.colors.portal + '25'; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.2, 0, Math.PI * 2); ctx.fill(); }




                const now = Date.now(); APP.State.ENGINE.ripples = APP.State.ENGINE.ripples.filter(r => now - r.startTime < 600); APP.State.ENGINE.ripples.forEach(r => { const pct = (now - r.startTime) / 600, { sx, sy } = getScreenPos(r.x, r.y); ctx.save(); ctx.globalAlpha = 1 - pct; ctx.strokeStyle = r.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * (0.3 + pct * 1.2), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });



                l.gateKeys.forEach(k => { const p = APP.LevelUtils.UNPACK(k), { sx, sy } = getScreenPos(p.x, p.y); ctx.save(); ctx.translate(sx, sy); ctx.rotate(-Math.PI / 4); const color = (APP.State.ENGINE.activeGateKey === k || !APP.State.ENGINE.activeGateKey) ? th.colors.gate : '#94a3b8'; ctx.strokeStyle = color; ctx.lineWidth = vp.cellW * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for(let i=0; i<2; i++) { const offset = (i - 0.5) * vp.cellW * 0.32; ctx.beginPath(); ctx.moveTo(offset - vp.cellW * 0.1, -vp.cellW * 0.2); ctx.lineTo(offset + vp.cellW * 0.1, 0); ctx.lineTo(offset - vp.cellW * 0.1, vp.cellW * 0.2); ctx.stroke(); } ctx.restore(); if (showParityWarnings && invalidGateKeys.has(k)) drawAsset('prohibited', p.x, p.y); });



                if (l.goalKey !== -1) { const goalP = APP.LevelUtils.UNPACK(l.goalKey), sGoal = getScreenPos(goalP.x, goalP.y); ctx.save(); ctx.strokeStyle = th.colors.goal; ctx.lineWidth = vp.cellW * 0.1; ctx.beginPath(); ctx.arc(sGoal.sx, sGoal.sy, vp.cellW * 0.32, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = th.colors.goal; ctx.beginPath(); ctx.arc(sGoal.sx, sGoal.sy, vp.cellW * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }



                if (APP.State.ENGINE.path.length) { const stroke = APP.State.ENGINE.rainbowActive ? 'rainbow' : th.path; drawPath(APP.State.ENGINE.path, APP.State.ENGINE.isPortalJump, stroke, vp.cellW * 0.25); }



                if (hintOverlayActive) {

                    ctx.save(); ctx.globalAlpha = APP.State.ENGINE.hinter.alpha;

                    const hPath = hintPath, displayPath = hintDisplayPath, hintsJumps = new Set();

                    for(let i=1; i<displayPath.length; i++){ const p1 = APP.LevelUtils.UNPACK(displayPath[i-1]), p2 = APP.LevelUtils.UNPACK(displayPath[i]); if (Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) > 1) hintsJumps.add(i); }

                    drawPath(displayPath, hintsJumps, '#22c55e', vp.cellW * 0.3, true);

                    ctx.restore();

                }




                const mustPassOverlayPins = []; l.mustPassKeys.forEach(k => { const p = APP.LevelUtils.UNPACK(k); const isHit = APP.State.ENGINE.visitedCounts.get(k) > 0; const transformed = APP.LevelUtils.transformPoint(p.x, p.y, APP.State.ENGINE.variant, l.grid.w, l.grid.h); if (transformed.ty === 0) { mustPassOverlayPins.push({ x: p.x, y: p.y, isHit }); return; } drawAsset('required', p.x, p.y, { isSatisfied: isHit, themeColors: th.colors }); }); if (mustPassOverlayPins.length > 0) drawMustPassOverflowOverlay(mustPassOverlayPins, th, vp);

                l.falseGoalKeys.forEach(k => { const p = APP.LevelUtils.UNPACK(k), { sx, sy } = getScreenPos(p.x, p.y); if (APP.State.ENGINE.armedFalseGoals.has(k)) { ctx.save(); ctx.strokeStyle = th.colors.goal; ctx.lineWidth = vp.cellW * 0.1; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.32, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = th.colors.goal; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } else if (APP.State.ENGINE.detonatedFalseGoals.has(k)) { drawScorchMark(ctx, sx, sy, vp.cellW); } else if (APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW) { drawAsset('bomb', p.x, p.y); } });



                l.gooseSet.forEach(k => { if (APP.State.ENGINE.revealedGeese.has(k) || APP.State.ENGINE.cheatActive || (APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW)) { const p = APP.LevelUtils.UNPACK(k); drawAsset('goose', p.x, p.y, { isCheatReveal: APP.State.ENGINE.cheatActive && !APP.State.ENGINE.revealedGeese.has(k) }); } });



                if (APP.State.ENGINE.mode === APP.Core.PLAY) { const curLen = APP.Engine.getRealLength(APP.State.ENGINE); APP.UI.renderMetricsPanel({ currentLen: curLen, reqLen: l.reqLen, currentInt: APP.State.ENGINE.intersections, reqInt: l.reqInt }); }

                else if (APP.State.ENGINE.mode === APP.Core.EDITOR) { const curLen = APP.Engine.getRealLength(APP.State.ENGINE); const lMet = document.getElementById('editCopyMetrics'); if (lMet) lMet.innerText = `Set (${curLen}/${APP.State.ENGINE.intersections})`; }

            }



                return {

                    render,

                    getScreenPos,

                    drawPath,

                    drawScorchMark,

                    getCanvas: () => cvs,

                    getContext: () => ctx

                };

            })();

}
