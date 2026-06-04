export function installEngine(APP) {
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
                    flippingFilter(drawCtx, size, color, options = {}) { drawCtx.rotate(options.rotation || 0); if (options.axis === APP.Core.V) drawCtx.rotate(Math.PI / 2); drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.25; const w = size * 0.45, t = size * 0.08; drawCtx.fillRect(-size / 2 + size * 0.1, -w / 2, size * 0.8, t); drawCtx.fillRect(-size / 2 + size * 0.1, w / 2 - t, size * 0.8, t); if (APP.State.ENGINE.mode === APP.Core.EDITOR) { drawCtx.globalAlpha = options.crossed ? 0.4 : 1.0; drawCtx.fillStyle = color; drawCtx.font = `900 ${size * 0.45}px sans-serif`; drawCtx.textAlign = 'center'; drawCtx.textBaseline = 'middle'; drawCtx.fillText('↺', 0, 0); } }
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
                                drawDot(s.sx, s.sy, colorIndex >= 0 ? colors[colorIndex] : colors[0]);
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

                const vp = APP.State.ENGINE.viewport, l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel; const mustPassOverlay = document.getElementById('mustPassOverlay'); if (mustPassOverlay) mustPassOverlay.innerHTML = ''; if (!vp.cellW || !l) return; const th = APP.Themes.THEMES[APP.Themes.getCurrentTheme()]; ctx.fillStyle = th.canvasBg; ctx.fillRect(0, 0, cvs.width, cvs.height); const W = l.grid.w, H = l.grid.h, dispW = APP.State.ENGINE.viewport.swapped ? H : W, dispH = APP.State.ENGINE.viewport.swapped ? W : H, inset = vp.cellW * 0.25; ctx.beginPath(); ctx.strokeStyle = th.grid; ctx.lineWidth = 1; for (let i = 0; i <= dispW; i++) { const x = i * vp.cellW; ctx.moveTo(x, inset); ctx.lineTo(x, cvs.height - inset); } for (let i = 0; i <= dispH; i++) { const y = i * vp.cellH; ctx.moveTo(inset, y); ctx.lineTo(cvs.width - inset, y); } ctx.stroke();



                if (APP.State.ENGINE.mode === APP.Core.EDITOR && APP.State.ENGINE.editor.validTrapSpots && APP.State.ENGINE.editor.validTrapSpots.size > 0) { APP.State.ENGINE.editor.validTrapSpots.forEach(k => { const p = APP.LevelUtils.UNPACK(k), { sx, sy } = getScreenPos(p.x, p.y); const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2; ctx.save(); ctx.fillStyle = th.colors.goal + '40'; ctx.fillRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4); ctx.strokeStyle = th.colors.goal; ctx.lineWidth = 3; ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.1]); ctx.strokeRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4); ctx.restore(); }); }



                let reqLen = 0, showParityWarnings = false, targetParity = 0, hasFlippingPortal = false;

                if ((APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.cheatActive) && l.goalKey !== -1) {

                    reqLen = APP.State.ENGINE.mode === APP.Core.EDITOR ? (parseInt(APP.UI.getValue('editReqLen')) || 0) : l.reqLen;

                    if (reqLen > 0 || APP.State.ENGINE.path.length > 0 || APP.State.ENGINE.cheatActive) {

                        showParityWarnings = true; const gp = APP.LevelUtils.UNPACK(l.goalKey); targetParity = (gp.x + gp.y + reqLen) % 2;

                        l.portalVisuals.forEach(pv => { const p1 = APP.LevelUtils.UNPACK(pv.k1), p2 = APP.LevelUtils.UNPACK(pv.k2); if ((p1.x + p1.y) % 2 === (p2.x + p2.y) % 2) hasFlippingPortal = true; });

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



                l.portalVisuals.forEach(pv => { const color = APP.LevelUtils.getPortalDisplayColor(l, pv.k1, th.colors.portal); ctx.strokeStyle = color; ctx.lineWidth = vp.cellW * 0.1; ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]); [APP.LevelUtils.UNPACK(pv.k1), APP.LevelUtils.UNPACK(pv.k2)].forEach(p => { const { sx, sy } = getScreenPos(p.x, p.y); ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = color + '25'; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]); if (showParityWarnings && !hasFlippingPortal) { if ((p.x + p.y) % 2 !== targetParity) drawAsset('prohibited', p.x, p.y); } }); }); ctx.setLineDash([]);



                if (APP.State.ENGINE.editor.pendingPortal) { const pp = APP.LevelUtils.UNPACK(APP.State.ENGINE.editor.pendingPortal), { sx, sy } = getScreenPos(pp.x, pp.y); ctx.strokeStyle = th.colors.portal; ctx.lineWidth = vp.cellW * 0.1; ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]); ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.3, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = th.colors.portal + '25'; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.2, 0, Math.PI * 2); ctx.fill(); }




                const now = Date.now(); APP.State.ENGINE.ripples = APP.State.ENGINE.ripples.filter(r => now - r.startTime < 600); APP.State.ENGINE.ripples.forEach(r => { const pct = (now - r.startTime) / 600, { sx, sy } = getScreenPos(r.x, r.y); ctx.save(); ctx.globalAlpha = 1 - pct; ctx.strokeStyle = r.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * (0.3 + pct * 1.2), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });



                l.gateKeys.forEach(k => { const p = APP.LevelUtils.UNPACK(k), { sx, sy } = getScreenPos(p.x, p.y); ctx.save(); ctx.translate(sx, sy); ctx.rotate(-Math.PI / 4); const color = (APP.State.ENGINE.activeGateKey === k || !APP.State.ENGINE.activeGateKey) ? th.colors.gate : '#94a3b8'; ctx.strokeStyle = color; ctx.lineWidth = vp.cellW * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; for(let i=0; i<2; i++) { const offset = (i - 0.5) * vp.cellW * 0.32; ctx.beginPath(); ctx.moveTo(offset - vp.cellW * 0.1, -vp.cellW * 0.2); ctx.lineTo(offset + vp.cellW * 0.1, 0); ctx.lineTo(offset - vp.cellW * 0.1, vp.cellW * 0.2); ctx.stroke(); } ctx.restore(); if (showParityWarnings && !hasFlippingPortal) { if ((p.x + p.y) % 2 !== targetParity) drawAsset('prohibited', p.x, p.y); } });



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

                l.falseGoalKeys.forEach(k => { const p = APP.LevelUtils.UNPACK(k), { sx, sy } = getScreenPos(p.x, p.y); if (APP.State.ENGINE.armedFalseGoals.has(k)) { ctx.save(); ctx.strokeStyle = th.colors.goal; ctx.lineWidth = vp.cellW * 0.1; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.32, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = th.colors.goal; ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.14, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } else if (APP.State.ENGINE.detonatedFalseGoals.has(k)) { drawScorchMark(ctx, sx, sy, vp.cellW); } else if (APP.State.ENGINE.mode === APP.Core.EDITOR) { drawAsset('bomb', p.x, p.y); } });



                l.gooseSet.forEach(k => { if (APP.State.ENGINE.revealedGeese.has(k) || APP.State.ENGINE.cheatActive || APP.State.ENGINE.mode === APP.Core.EDITOR) { const p = APP.LevelUtils.UNPACK(k); drawAsset('goose', p.x, p.y, { isCheatReveal: APP.State.ENGINE.cheatActive && !APP.State.ENGINE.revealedGeese.has(k) }); } });



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

    APP.Engine = (() => {
        let refs = { ENGINE: null, UI: null };
        const bind = ({ ENGINE: engineRef, UI: uiRef }) => { refs = { ENGINE: engineRef, UI: uiRef }; };
        const init = bind;

            function areWinMetricsSatisfied(state = APP.State.ENGINE, level = (state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel)) {
                if (!level || !state.path.length) return false;
                const curLen = APP.Engine.getRealLength(state);
                if (curLen !== level.reqLen || state.intersections !== level.reqInt) return false;
                const allMustPass = level.mustPassKeys.every(k => state.visitedCounts.get(k) > 0);
                const allMustCross = level.mustCrossKeys.every(k => (state.visitedCounts.get(k) || 0) >= 2);
                return allMustPass && allMustCross;
            }

            function wouldCreateBlockedTIntersection(state, key, level) {
                if (!state || !level || state.path.length === 0) return false;
                const lastK = state.path[state.path.length - 1];
                const from = APP.LevelUtils.UNPACK(lastK);
                const to = APP.LevelUtils.UNPACK(key);
                const axis = (to.y === from.y) ? APP.Core.H : APP.Core.V;
                const usageAtTarget = state.cellUsage.get(key) || { h: false, v: false };
                const revisitCount = state.visitedCounts.get(key) || 0;
                const perpendicularUsed = axis === APP.Core.H ? usageAtTarget.v : usageAtTarget.h;
                const currentAxisUsed = axis === APP.Core.H ? usageAtTarget.h : usageAtTarget.v;
                if (revisitCount <= 0 || !perpendicularUsed || currentAxisUsed) return false;

                const dirX = Math.sign(to.x - from.x);
                const dirY = Math.sign(to.y - from.y);
                const forwardX = to.x + dirX;
                const forwardY = to.y + dirY;
                if (!APP.LevelUtils.inBounds(forwardX, forwardY, level.grid.w, level.grid.h)) return true;

                const forwardKey = APP.LevelUtils.PACK(forwardX, forwardY);
                const simulatedAfterEnter = simulateTapRouteStep(state, key, level, { skipTIntersectionCheck: true });
                if (!simulatedAfterEnter) return false;
                const simulatedForward = simulateTapRouteStep(simulatedAfterEnter.state, forwardKey, level, { skipTIntersectionCheck: true });
                if (!simulatedForward) return true;
                if (simulatedForward.result === "goose") {
                    return state.revealedGeese?.has(forwardKey) || false;
                }
                return false;
            }

            function processStep(key) {
                const activeLevel = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                if (APP.State.ENGINE.path.length > 1 && key === APP.State.ENGINE.path[APP.State.ENGINE.path.length - 2]) {
                    APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, APP.State.ENGINE.path.length - 2);
                    APP.Core.SOUND_BUS.play("E4", "32n");
                    return "valid";
                }
                if ([APP.Core.HAZARD_TRIGGERED].includes(APP.State.ENGINE.logicState) && APP.State.ENGINE.mode !== APP.Core.EDITOR) return null;
                if (!APP.LevelUtils.isValidMove(key, APP.State.ENGINE, activeLevel, {
                    isStrict: true,
                    mode: APP.State.ENGINE.mode,
                    allowJump: true,
                    checkWinMetrics: false,
                    checkHazards: false,
                    checkFalseGoals: true,
                    armedFalseGoals: APP.State.ENGINE.armedFalseGoals
                })) {
                    return null;
                }

                if (wouldCreateBlockedTIntersection(APP.State.ENGINE, key, activeLevel)) return null;

                APP.State.ENGINE.isDirty = true;
                if (APP.State.ENGINE.mode === APP.Core.EDITOR) APP.State.ENGINE.editor.isModified = true;

                if (APP.State.ENGINE.mode !== APP.Core.EDITOR && activeLevel.gooseSet.has(key)) {
                    APP.State.ENGINE.undoStack.push(createSnapshot());
                    if(APP.State.ENGINE.undoStack.length > 200) APP.State.ENGINE.undoStack.shift();
                    const headKey = APP.State.ENGINE.path[APP.State.ENGINE.path.length - 1];
                    const headVisitCount = headKey === undefined ? 0 : (APP.State.ENGINE.visitedCounts.get(headKey) || 0);
                    const justCreatedIntersection = APP.State.ENGINE.path.length > 1 && headVisitCount > 1;
                    if (justCreatedIntersection) {
                        APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, APP.State.ENGINE.path.length - 2);
                    }
                    const gooseAlreadyRevealed = APP.State.ENGINE.revealedGeese.has(key);
                    APP.State.ENGINE.revealedGeese.add(key);
                    if (gooseAlreadyRevealed) return null;
                    triggerJumpScare();
                    APP.Engine.setLogicState(APP.Core.HAZARD_TRIGGERED);
                    APP.Core.SOUND_BUS.play("C2", "8n");
                    return "goose";
                }

                APP.State.ENGINE.undoStack.push(createSnapshot());
                if(APP.State.ENGINE.undoStack.length > 200) APP.State.ENGINE.undoStack.shift();
                APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, key, false);
                if (APP.State.ENGINE.armedFalseGoals.has(key) && checkFalseGoalCondition()) {
                    triggerBombDetonation(key);
                    return "detonate";
                }
                const portal = APP.LevelUtils.resolvePortal(activeLevel, key);
                if (portal && portal.dest !== -1) {
                    APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, portal.dest, true);
                    if (APP.State.ENGINE.armedFalseGoals.has(portal.dest) && checkFalseGoalCondition()) {
                        triggerBombDetonation(portal.dest);
                        return "detonate";
                    }
                    const portalColor = APP.LevelUtils.getPortalDisplayColor(activeLevel, key, APP.Themes.THEMES[APP.Themes.getCurrentTheme()]?.colors?.portal || '#d946ef');
                    APP.State.ENGINE.ripples.push({x: APP.LevelUtils.UNPACK(key).x, y: APP.LevelUtils.UNPACK(key).y, startTime: Date.now(), color: portalColor});
                    APP.State.ENGINE.ripples.push({x: APP.LevelUtils.UNPACK(portal.dest).x, y: APP.LevelUtils.UNPACK(portal.dest).y, startTime: Date.now(), color: portalColor});
                    APP.Core.SOUND_BUS.play("A5", "16n");
                    APP.Engine.setLogicState(APP.Core.PORTAL_PAUSE);
                    checkWinCondition();
                    return "portal";
                }
                APP.Core.SOUND_BUS.play("G4", "32n");
                checkWinCondition();
                return "valid";
            }


            const buildStraightPathSteps = (headPos, target) => {
                const dx = target.x - headPos.x;
                const dy = target.y - headPos.y;
                if (dx !== 0 && dy !== 0) return [];
                const pathSteps = [];
                if (dx !== 0) {
                    for (let i = 1; i <= Math.abs(dx); i++) pathSteps.push(APP.LevelUtils.PACK(headPos.x + Math.sign(dx) * i, headPos.y));
                } else if (dy !== 0) {
                    for (let i = 1; i <= Math.abs(dy); i++) pathSteps.push(APP.LevelUtils.PACK(headPos.x, headPos.y + Math.sign(dy) * i));
                }
                return pathSteps;
            };

            const cloneTapRouteState = (state) => ({
                mode: state.mode,
                path: [...state.path],
                isPortalJump: new Set(state.isPortalJump),
                visitedCounts: new Map(state.visitedCounts),
                cellUsage: new Map(Array.from(state.cellUsage.entries(), ([k, u]) => [k, { h: !!u.h, v: !!u.v }])),
                intersections: state.intersections,
                flipCount: state.flipCount,
                crossedFlippingFilters: new Map(state.crossedFlippingFilters),
                activeGateKey: state.activeGateKey,
                armedFalseGoals: new Set(state.armedFalseGoals || [])
            });

            const rebuildTapRouteDerivedState = (state, level) => {
                state.visitedCounts = new Map();
                state.cellUsage = new Map();
                state.intersections = 0;
                state.flipCount = 0;
                state.crossedFlippingFilters = new Map();
                for (let i = 0; i < state.path.length; i++) {
                    const k = state.path[i];
                    const c = state.visitedCounts.get(k) || 0;
                    if (c > 0 && k !== state.activeGateKey && (level && k !== level.goalKey)) state.intersections++;
                    state.visitedCounts.set(k, c + 1);
                    if (i > 0 && !state.isPortalJump.has(i)) {
                        const prevK = state.path[i - 1];
                        const p1 = APP.LevelUtils.UNPACK(prevK), p2 = APP.LevelUtils.UNPACK(k);
                        const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V;
                        const mark = (key, ax) => {
                            const u = state.cellUsage.get(key) || { h: false, v: false };
                            if (ax === APP.Core.H) u.h = true; else u.v = true;
                            state.cellUsage.set(key, u);
                        };
                        mark(prevK, axis);
                        mark(k, axis);
                    }
                    if (level && level.flippingFilterMap.has(k) && !state.crossedFlippingFilters.has(k)) {
                        state.crossedFlippingFilters.set(k, state.flipCount);
                        state.flipCount++;
                    }
                }
            };

            const pushTapRouteStep = (state, key, isJump, level) => {
                const lastK = state.path[state.path.length - 1];
                if (lastK !== undefined && !isJump) {
                    const p1 = APP.LevelUtils.UNPACK(lastK), p2 = APP.LevelUtils.UNPACK(key);
                    const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V;
                    const mark = (k, ax) => { const u = state.cellUsage.get(k) || { h: false, v: false }; if (ax === APP.Core.H) u.h = true; else u.v = true; state.cellUsage.set(k, u); };
                    mark(lastK, axis); mark(key, axis);
                }
                const count = state.visitedCounts.get(key) || 0;
                if (count > 0 && key !== state.activeGateKey && (level && key !== level.goalKey)) state.intersections++;
                state.visitedCounts.set(key, count + 1);
                state.path.push(key);
                if (isJump) state.isPortalJump.add(state.path.length - 1);
                if (level && level.flippingFilterMap.has(key) && !state.crossedFlippingFilters.has(key)) {
                    state.crossedFlippingFilters.set(key, state.flipCount);
                    state.flipCount++;
                }
            };

            function simulateTapRouteStep(baseState, key, level, options = {}) {
                const nextState = cloneTapRouteState(baseState);
                if (nextState.path.length > 1 && key === nextState.path[nextState.path.length - 2]) {
                    nextState.path.pop();
                    const prevLen = nextState.path.length;
                    nextState.isPortalJump = new Set(Array.from(nextState.isPortalJump).filter(i => i < prevLen));
                    rebuildTapRouteDerivedState(nextState, level);
                    return { state: nextState, result: "valid" };
                }
                if (!APP.LevelUtils.isValidMove(key, nextState, level, {
                    isStrict: true,
                    mode: nextState.mode,
                    allowJump: true,
                    checkWinMetrics: false,
                    checkHazards: false,
                    checkFalseGoals: true,
                    armedFalseGoals: nextState.armedFalseGoals,
                    flipCount: nextState.flipCount,
                    crossedSet: nextState.crossedFlippingFilters
                })) return null;
                if (!options.skipTIntersectionCheck && wouldCreateBlockedTIntersection(nextState, key, level)) return null;
                if (nextState.mode !== APP.Core.EDITOR && level.gooseSet.has(key)) return { state: nextState, result: "goose" };
                pushTapRouteStep(nextState, key, false, level);
                if (nextState.armedFalseGoals.has(key) && APP.Engine.areWinMetricsSatisfied(nextState, level)) return { state: nextState, result: "detonate" };
                const portal = APP.LevelUtils.resolvePortal(level, key);
                if (portal && portal.dest !== -1) {
                    pushTapRouteStep(nextState, portal.dest, true, level);
                    if (nextState.armedFalseGoals.has(portal.dest) && APP.Engine.areWinMetricsSatisfied(nextState, level)) return { state: nextState, result: "detonate" };
                    return { state: nextState, result: "portal" };
                }
                return { state: nextState, result: "valid" };
            }

            function findTapRoute(target, options = {}) {
                const level = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                if (!level || !APP.State.ENGINE.path.length) return null;
                const targetKey = APP.LevelUtils.PACK(target.x, target.y);
                const startState = cloneTapRouteState(APP.State.ENGINE);
                const startKey = startState.path[startState.path.length - 1];
                if (targetKey === startKey) return [];
                const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                const maxExpansions = options.maxExpansions || Math.max(200, level.grid.w * level.grid.h * 40);
                const queue = [{ state: startState, inputs: [] }];
                const seen = new Set([`${startKey}|${startState.path.join('.')}`]);
                let expansions = 0;
                while (queue.length > 0 && expansions < maxExpansions) {
                    const cur = queue.shift();
                    expansions++;
                    const headKey = cur.state.path[cur.state.path.length - 1];
                    const head = APP.LevelUtils.UNPACK(headKey);
                    for (const [dx, dy] of dirs) {
                        const nk = APP.LevelUtils.PACK(head.x + dx, head.y + dy);
                        const sim = simulateTapRouteStep(cur.state, nk, level);
                        if (!sim || sim.result === "goose" || sim.result === "detonate") continue;
                        const newInputs = [...cur.inputs, nk];
                        if (nk === targetKey) return newInputs;
                        const nextKey = sim.state.path[sim.state.path.length - 1];
                        if (nextKey === targetKey) return newInputs;
                        const sig = `${nextKey}|${sim.state.path.join('.')}`;
                        if (seen.has(sig)) continue;
                        seen.add(sig);
                        queue.push({ state: sim.state, inputs: newInputs });
                    }
                }
                return null;
            }

            function attemptMoveTo(target, opts = {}) { if (APP.State.ENGINE.mode === APP.Core.EDITOR && !APP.State.ENGINE.editor.isPencilMode) return; if (!APP.State.ENGINE.path.length) return; const headPos = APP.LevelUtils.UNPACK(APP.State.ENGINE.path[APP.State.ENGINE.path.length - 1]); if (APP.State.ENGINE.logicState === APP.Core.PORTAL_PAUSE) { if (target.x !== headPos.x || target.y !== headPos.y) APP.Engine.setLogicState(APP.Core.DRAGGING); else return; } if (target.x === headPos.x && target.y === headPos.y) return; const pathSteps = buildStraightPathSteps(headPos, target); for (const step of pathSteps) { const result = processStep(step); if (result === null || result === "goose" || result === "detonate") break; } if (pathSteps.length > 0) APP.State.ENGINE.isDirty = true; }

            function checkWinCondition() { if (checkWinConditionImpl(APP.State.ENGINE.path, APP.State.ENGINE.level, APP.State.ENGINE.mode, APP.State.ENGINE.logicState, APP.State.ENGINE.isPortalJump, APP.State.ENGINE.visitedCounts, APP.State.ENGINE.intersections)) { APP.Engine.setLogicState(APP.Core.RESOLVED); APP.UI.renderWinExportPanel({ solutionOutput: JSON.stringify(APP.State.ENGINE.path).replace(/\s/g, ''), showExportArea: APP.State.ENGINE.isDevMode }); if (APP.State.ENGINE.mode === APP.Core.PLAY) APP.Persistence.markLevelComplete(APP.State.ENGINE.levelIdx); APP.UI.openModal('winModal'); APP.Core.SOUND_BUS.play("C5", "8n"); } }

            function checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections) { if (!path.length || [APP.Core.HAZARD_TRIGGERED].includes(logicState) || mode === APP.Core.EDITOR) return false; const last = path[path.length - 1]; if (last !== level.goalKey) return false; const stubState = { mode, level, editor: { workingLevel: level }, path, isPortalJump, visitedCounts, intersections }; return APP.Engine.areWinMetricsSatisfied(stubState, level); }

            function checkFalseGoalCondition() {
                const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
                if (!l) return false;
                return areWinMetricsSatisfied(APP.State.ENGINE, l);
            }


            function triggerJumpScare() {
                APP.UI.showGooseJumpScare();
                APP.Engine.setOverlayState(APP.Core.GOOSE_OVERLAY);
                setTimeout(() => {
                    APP.UI.hideGooseJumpScare();
                    APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                }, 2500);
            }


            function triggerBombDetonation(key) {
                APP.State.ENGINE.armedFalseGoals.delete(key);
                APP.State.ENGINE.detonatedFalseGoals.add(key);
                APP.Engine.setOverlayState(APP.Core.FALSE_GOAL_ANIMATING);
                APP.UI.showBombDetonation();
                APP.Core.SOUND_BUS.play("C2", "8n");
                setTimeout(() => {
                    APP.UI.showBombDetonation({ explodedMarkup: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="var(--theme-bomb-blast-ring)" stroke-width="10" stroke-dasharray="10 5" class="animate-ping"/><path d="M 50 10 L 50 90 M 10 50 L 90 50 M 20 20 L 80 80 M 20 80 L 80 20" stroke="var(--theme-bomb-blast-rays)" stroke-width="8"/></svg>` });
                    APP.Core.SOUND_BUS.play("F1", "4n");
                    setTimeout(() => {
                        APP.UI.hideBombDetonation({ resetMarkup: `<svg viewBox="0 0 100 100"><use href="#def-falsegoal"/></svg>` });
                        APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                    }, 1000);
                }, 1000);
            }



            function createSnapshot() { return { path: [...APP.State.ENGINE.path], isPortalJump: new Set(APP.State.ENGINE.isPortalJump), activeGateKey: APP.State.ENGINE.activeGateKey, logicState: APP.State.ENGINE.logicState, detonatedFalseGoals: new Set(APP.State.ENGINE.detonatedFalseGoals) }; }

            function applySnapshot(snap) { APP.State.ENGINE.path = [...snap.path]; APP.State.ENGINE.isPortalJump = new Set(snap.isPortalJump); APP.State.ENGINE.activeGateKey = snap.activeGateKey; const restoredLogicState = snap.logicState === APP.Core.HAZARD_TRIGGERED ? APP.Core.IDLE : snap.logicState; APP.Engine.setLogicState(APP.Core.IDLE); if (restoredLogicState !== APP.Core.IDLE) APP.Engine.setLogicState(restoredLogicState); APP.State.ENGINE.detonatedFalseGoals = new Set(snap.detonatedFalseGoals); const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel; const armed = new Set(l?.falseGoalKeys || []); APP.State.ENGINE.detonatedFalseGoals.forEach(k => armed.delete(k)); APP.State.ENGINE.armedFalseGoals = armed; APP.Engine.rebuildDerivedPathState(APP.State.ENGINE); APP.State.ENGINE.isDirty = true; APP.UI.showMessage("", ""); }

            function updatePlayModeLayout() { if (APP.State.ENGINE.mode !== APP.Core.PLAY) return; APP.UI.setClassState('exportArea', 'hidden', !APP.State.ENGINE.isDevMode); APP.UI.setClassState('devCopyBtn', 'hidden', !APP.State.ENGINE.isDevMode); APP.UI.setClassState('devGenBtn', 'hidden', !APP.State.ENGINE.isDevMode); APP.UI.setClassState('modeToggleBtn', 'hidden', !APP.State.ENGINE.isDevMode); }

            function switchMode(newMode) { const isEd = newMode === APP.Core.EDITOR; APP.State.ENGINE.mode = newMode; APP.UI.setSolutionOutput(''); APP.Engine.setLogicState(APP.Core.IDLE); APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE); APP.Engine.PathNavigator.clear(APP.State.ENGINE); APP.State.ENGINE.undoStack = []; APP.State.ENGINE.revealedGeese.clear(); APP.State.ENGINE.gooseEncounteredThisLevel = false; APP.State.ENGINE.armedFalseGoals.clear(); APP.State.ENGINE.detonatedFalseGoals.clear(); document.getElementById('editorPalette').classList.toggle('hidden', !isEd); document.getElementById('playMetrics').classList.toggle('hidden', isEd); document.getElementById('editorMetrics').classList.toggle('hidden', !isEd); document.getElementById('gameButtonGrid').classList.toggle('hidden', isEd); document.getElementById('editorButtonGrid').classList.toggle('hidden', !isEd); const exportArea = document.getElementById('exportArea'); document.getElementById('editCopyBtn').classList.toggle('hidden', !isEd); document.getElementById('editGenBtn').classList.toggle('hidden', !isEd); APP.UI.setButtonState('editGenBtn', { enabled: true }); document.getElementById('devCopyBtn').classList.toggle('hidden', isEd || !APP.State.ENGINE.isDevMode); document.getElementById('devGenBtn').classList.toggle('hidden', isEd || !APP.State.ENGINE.isDevMode); if (isEd) { APP.State.ENGINE.variant = 0; APP.State.ENGINE.editor.workingLevel = APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.level); APP.State.ENGINE.editor.isPencilMode = false; APP.State.ENGINE.editor.undoStack = []; APP.State.ENGINE.editor.validTrapSpots.clear(); APP.State.ENGINE.editor.emptyClickCount = 0; APP.UI.setInputValue('editReqLen', APP.State.ENGINE.editor.workingLevel.reqLen || 0); APP.UI.setInputValue('editReqInt', APP.State.ENGINE.editor.workingLevel.reqInt || 0); APP.State.ENGINE.editor.isModified = false; exportArea.classList.remove('hidden'); updatePencilState(); } else { updatePlayModeLayout(); APP.Engine.loadLevel(APP.State.ENGINE.levelIdx, { keepVariant: true }); } APP.UI.updateAppScale(); APP.UI.updateViewport(); APP.UI.syncEditorPalettePlacement(); APP.Persistence.updateCompletionUI(); APP.UI.showMessage("", ""); APP.State.ENGINE.isDirty = true; }

            function updatePencilState() {
                const btn = document.getElementById('editPencilBtn');
                if (!btn) return;
                const svg = btn.querySelector('svg');
                if (!svg) return;

                const inactivePencilIcon = '<g><g><g><path d="M459.113,31.24c-41.654-41.654-109.199-41.654-150.853,0L21.647,317.854c-3.425,3.425-5.583,7.915-6.118,12.729L0.447,466.348c-1.509,13.587,9.971,25.068,23.558,23.558l135.765-15.083c4.815-0.535,9.304-2.693,12.729-6.118L399.827,241.38c0.007-0.007,0.016-0.013,0.023-0.021l59.264-59.264c20.827-20.827,31.241-48.127,31.24-75.427C490.354,79.368,479.941,52.068,459.113,31.24z M428.943,151.923l-44.18,44.18l-90.512-90.512l44.179-44.179c24.991-24.992,65.521-24.992,90.513,0c12.495,12.495,18.743,28.875,18.744,45.255C447.687,123.048,441.439,139.428,428.943,151.923z M147.622,433.245L45.797,444.557l11.312-101.825L264.081,135.76l90.513,90.513L147.622,433.245z"/><path d="M232.839,448h-21.333c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h21.333c11.782,0,21.333-9.551,21.333-21.333C254.172,457.551,244.621,448,232.839,448z"/><path d="M467.506,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C488.839,457.551,479.288,448,467.506,448z"/><path d="M360.839,448h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667c11.782,0,21.333-9.551,21.333-21.333C382.172,457.551,372.621,448,360.839,448z"/></g></g></g>';
                const activePencilIcon = '<g><g><g><path d="M254.172,447.945h-21.333c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h21.333c11.797,0,21.333-9.557,21.333-21.333S265.97,447.945,254.172,447.945z"/><path d="M467.506,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S479.303,447.945,467.506,447.945z"/><path d="M360.839,447.945h-42.667c-11.797,0-21.333,9.557-21.333,21.333s9.536,21.333,21.333,21.333h42.667c11.797,0,21.333-9.557,21.333-21.333S372.636,447.945,360.839,447.945z"/><path d="M459.109,182.04c41.579-41.6,41.579-109.269,0-150.848c-41.6-41.6-109.291-41.579-150.848,0l-44.181,44.181l150.848,150.848L459.109,182.04z"/><path d="M21.652,317.799c-3.435,3.435-5.589,7.915-6.123,12.736L0.446,466.3c-0.704,6.443,1.536,12.843,6.123,17.429c4.011,4.032,9.451,6.251,15.083,6.251c0.789,0,1.557-0.043,2.347-0.128l135.787-15.083c4.8-0.533,9.301-2.688,12.715-6.123L384.766,256.38L233.918,105.532L21.652,317.799z"/></g></g></g>';

                btn.classList.toggle('selected', APP.State.ENGINE.editor.isPencilMode);
                svg.setAttribute('viewBox', APP.State.ENGINE.editor.isPencilMode ? '0 0 490.612 490.612' : '0 0 490.667 490.667');
                svg.setAttribute('fill', 'currentColor');
                svg.setAttribute('stroke', 'none');
                svg.innerHTML = APP.State.ENGINE.editor.isPencilMode ? activePencilIcon : inactivePencilIcon;
            }

            function loadLevel(idx, keepVariant = false) {

                if (APP.State.ENGINE.activeSolverController) return;

                const levels = APP.Data.getLevels();

                if (!levels || !APP.Data.getLevel(idx)) return;



                APP.State.ENGINE.levelIdx = idx;

                const isEditor = APP.State.ENGINE.mode === APP.Core.EDITOR;

                if (isEditor) { APP.State.ENGINE.variant = 0; }

                else if (!keepVariant) { APP.State.ENGINE.variant = Math.floor(Math.random() * 8); }




                APP.Engine.setLogicState(APP.Core.IDLE);

                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);



                APP.State.ENGINE.level = APP.LevelUtils.normalizeLevel(idx);

                APP.LevelUtils.assertLevelShape(APP.State.ENGINE.level);

                APP.Engine.PathNavigator.clear(APP.State.ENGINE);

                APP.State.ENGINE.undoStack = [];

                APP.State.ENGINE.revealedGeese.clear();

                APP.State.ENGINE.ripples = [];

                APP.State.ENGINE.gooseEncounteredThisLevel = false;

                APP.State.ENGINE.armedFalseGoals = new Set(APP.State.ENGINE.level.falseGoalKeys || []);

                APP.State.ENGINE.detonatedFalseGoals = new Set();

                APP.State.ENGINE.foundHintsSinceLoad = [];
                APP.State.ENGINE.hinter.pathList = [];
                APP.State.ENGINE.hinter.currentPathIdx = 0;
                APP.State.ENGINE.hinter.source = 'none';
                APP.State.ENGINE.hinter.index = 0;
                APP.State.ENGINE.hinter.alpha = 0;
                APP.State.ENGINE.hinter.holdStartMs = 0;
                APP.State.ENGINE.hinter.blinkStartMs = 0;
                APP.State.ENGINE.hinter.fadeStartMs = 0;

                if (isEditor) {

                    APP.State.ENGINE.editor.workingLevel = APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.level);

                    APP.State.ENGINE.editor.isPencilMode = false;

                    APP.State.ENGINE.editor.undoStack = [];

                    APP.State.ENGINE.editor.validTrapSpots.clear();

                    APP.State.ENGINE.editor.emptyClickCount = 0;

                    APP.UI.setInputValue('editReqLen', APP.State.ENGINE.editor.workingLevel.reqLen || 0);

                    APP.UI.setInputValue('editReqInt', APP.State.ENGINE.editor.workingLevel.reqInt || 0);

                    APP.State.ENGINE.editor.isModified = false;

                    updatePencilState();

                }

                APP.UI.updateLevelDisplay(idx, false);

                APP.UI.closeModal('winModal');

                APP.UI.showMessage("", "");
                APP.UI.setSolutionOutput('');

                APP.UI.updateAppScale();

                APP.UI.updateViewport();

                APP.Persistence.updateCompletionUI();
                APP.Persistence.persistSessionState();
                APP.State.ENGINE.isDirty = true;

            }

            function loop() {
                if (APP.State.ENGINE.overlayState === APP.Core.HINT_ANIMATING && APP.State.ENGINE.hinter.pathList.length) {
                    const hPath = APP.State.ENGINE.hinter.pathList[APP.State.ENGINE.hinter.currentPathIdx];
                    const hintNowMs = Date.now();
                    const hintHoldDurationMs = 2700;
                    const hintBlinkCount = 3;
                    const hintBlinkCycleMs = 800;
                    const hintFadeDurationMs = 900;

                    APP.State.ENGINE.hinter.index += 0.285;

                    if (APP.State.ENGINE.hinter.index >= hPath.length) {
                        APP.State.ENGINE.hinter.index = hPath.length;
                        if (!APP.State.ENGINE.hinter.holdStartMs) APP.State.ENGINE.hinter.holdStartMs = hintNowMs;
                    }

                    const holdElapsedMs = APP.State.ENGINE.hinter.holdStartMs ? (hintNowMs - APP.State.ENGINE.hinter.holdStartMs) : 0;
                    const holdComplete = APP.State.ENGINE.hinter.holdStartMs && holdElapsedMs >= hintHoldDurationMs;

                    if (holdComplete && !APP.State.ENGINE.hinter.blinkStartMs) APP.State.ENGINE.hinter.blinkStartMs = hintNowMs;

                    if (APP.State.ENGINE.hinter.blinkStartMs && !APP.State.ENGINE.hinter.fadeStartMs) {
                        const blinkElapsedMs = hintNowMs - APP.State.ENGINE.hinter.blinkStartMs;
                        const blinkWindowMs = hintBlinkCount * hintBlinkCycleMs;
                        if (blinkElapsedMs < blinkWindowMs) {
                            const blinkPhase = (blinkElapsedMs % hintBlinkCycleMs) / hintBlinkCycleMs;
                            APP.State.ENGINE.hinter.alpha = 0.25 + (0.75 * (0.5 + 0.5 * Math.cos(blinkPhase * Math.PI * 2)));
                        } else {
                            APP.State.ENGINE.hinter.fadeStartMs = hintNowMs;
                            APP.State.ENGINE.hinter.alpha = 1;
                        }
                    }

                    if (APP.State.ENGINE.hinter.fadeStartMs) {
                        const fadeElapsedMs = hintNowMs - APP.State.ENGINE.hinter.fadeStartMs;
                        APP.State.ENGINE.hinter.alpha = Math.max(0, 1 - (fadeElapsedMs / hintFadeDurationMs));
                        if (APP.State.ENGINE.hinter.alpha <= 0) {
                            APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                            APP.UI.showMessage("", "");
                        }
                    }
                }
                if (APP.State.ENGINE.visualFlipCount !== undefined) {
                    if (APP.State.ENGINE.visualFlipCount < APP.State.ENGINE.flipCount) { APP.State.ENGINE.visualFlipCount = Math.min(APP.State.ENGINE.flipCount, APP.State.ENGINE.visualFlipCount + 0.15); APP.State.ENGINE.isDirty = true; }
                    else if (APP.State.ENGINE.visualFlipCount > APP.State.ENGINE.flipCount) { APP.State.ENGINE.visualFlipCount = Math.max(APP.State.ENGINE.flipCount, APP.State.ENGINE.visualFlipCount - 0.15); APP.State.ENGINE.isDirty = true; }
                }
                const hasContinuousAnimation = APP.State.ENGINE.ripples.length > 0 || APP.State.ENGINE.overlayState === APP.Core.HINT_ANIMATING;
                if (hasContinuousAnimation) APP.State.ENGINE.isDirty = true;
                const shouldRender = APP.State.ENGINE.isDirty || hasContinuousAnimation;
                if (shouldRender) {
                    APP.State.ENGINE.isDirty = false;
                    APP.Renderer.render();
                }
                requestAnimationFrame(loop);
            }

            function getRealLength(state = APP.State.ENGINE) { return state.path.length > 0 ? state.path.length - 1 - state.isPortalJump.size : 0; }

            function rebuildDerivedPathState(state = APP.State.ENGINE) {
                const oldFlipCount = state.flipCount;
                state.visitedCounts.clear(); state.cellUsage.clear(); state.intersections = 0; state.flipCount = 0; state.crossedFlippingFilters.clear(); const l = state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel; if (state.path.length === 0) { if (oldFlipCount !== 0) state.lastFlipTime = Date.now(); return; }
                for (let i = 0; i < state.path.length; i++) {
                    const k = state.path[i]; const c = state.visitedCounts.get(k) || 0; if (c > 0 && k !== state.activeGateKey && (l && k !== l.goalKey)) { state.intersections++; } state.visitedCounts.set(k, c + 1);
                    if (i > 0 && !state.isPortalJump.has(i)) { const prevK = state.path[i-1]; const p1 = APP.LevelUtils.UNPACK(prevK), p2 = APP.LevelUtils.UNPACK(k); const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V; let uPrev = state.cellUsage.get(prevK) || { h: false, v: false }; if (axis === APP.Core.H) uPrev.h = true; else uPrev.v = true; state.cellUsage.set(prevK, uPrev); let uCur = state.cellUsage.get(k) || { h: false, v: false }; if (axis === APP.Core.H) uCur.h = true; else uCur.v = true; state.cellUsage.set(k, uCur); }
                    if (l && l.flippingFilterMap.has(k) && !state.crossedFlippingFilters.has(k)) { state.crossedFlippingFilters.set(k, state.flipCount); state.flipCount++; }
                }
                if (state.flipCount !== oldFlipCount) state.lastFlipTime = Date.now();
            }

            function assertStateConsistency(state = APP.State.ENGINE) { if (!state.isDevMode) return; const l = state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel; if (!l) return; const originalIntersections = state.intersections; const originalCounts = new Map(state.visitedCounts); rebuildDerivedPathState(state); if (originalIntersections !== state.intersections) { console.error("Invariant broken: Intersections mismatch."); } originalCounts.forEach((v, k) => { if (state.visitedCounts.get(k) !== v) console.error("Invariant broken: Visited count mismatch."); }); }

            const PathNavigator = {
                pushStep(state, key, isJump) {
                    const l = state.mode === APP.Core.PLAY ? state.level : state.editor.workingLevel; const lastK = state.path[state.path.length - 1];
                    if (lastK !== undefined && !isJump) { const p1 = APP.LevelUtils.UNPACK(lastK), p2 = APP.LevelUtils.UNPACK(key); const axis = (p2.y === p1.y) ? APP.Core.H : APP.Core.V; const mark = (k, ax) => { let u = state.cellUsage.get(k) || { h: false, v: false }; if (ax === APP.Core.H) u.h = true; else u.v = true; state.cellUsage.set(k, u); }; mark(lastK, axis); mark(key, axis); }
                    const count = state.visitedCounts.get(key) || 0; if (count > 0 && key !== state.activeGateKey && (l && key !== l.goalKey)) { state.intersections++; } state.visitedCounts.set(key, count + 1); state.path.push(key); if (isJump) state.isPortalJump.add(state.path.length - 1); state.isDirty = true;
                    if (l && l.flippingFilterMap.has(key) && !state.crossedFlippingFilters.has(key)) { state.crossedFlippingFilters.set(key, state.flipCount); state.flipCount++; state.lastFlipTime = Date.now(); }
                    assertStateConsistency(state);
                },
                truncateTo(state, targetIdx) {
                    if (targetIdx < -1 || targetIdx >= state.path.length - 1) return; state.path.splice(targetIdx + 1); const newJumps = new Set(); for (const j of state.isPortalJump) if (j <= targetIdx) newJumps.add(j); state.isPortalJump = newJumps;
                    if (state.path.length === 0) { state.activeGateKey = null; } if ([APP.Core.DRAGGING, APP.Core.PORTAL_PAUSE, APP.Core.HAZARD_TRIGGERED].includes(state.logicState)) { APP.Engine.setLogicState(APP.Core.IDLE); } if (state.mode === APP.Core.EDITOR) state.editor.isModified = true; state.isDirty = true; rebuildDerivedPathState(state); assertStateConsistency(state);
                },
                clear(state) { state.path = []; state.isPortalJump.clear(); state.activeGateKey = null; if ([APP.Core.DRAGGING, APP.Core.PORTAL_PAUSE, APP.Core.HAZARD_TRIGGERED].includes(state.logicState)) { APP.Engine.setLogicState(APP.Core.IDLE); } if (state.mode === APP.Core.EDITOR) state.editor.isModified = true; state.isDirty = true; rebuildDerivedPathState(state); assertStateConsistency(state); }
            };

            const VALID_LOGIC_TRANSITIONS = {
                [APP.Core.IDLE]: [APP.Core.DRAGGING, APP.Core.EDIT_DRAG, APP.Core.THEME_DRAG, APP.Core.RESOLVED],
                [APP.Core.DRAGGING]: [APP.Core.IDLE, APP.Core.PORTAL_PAUSE, APP.Core.RESOLVED, APP.Core.HAZARD_TRIGGERED],
                [APP.Core.PORTAL_PAUSE]: [APP.Core.DRAGGING, APP.Core.IDLE],
                [APP.Core.RESOLVED]: [APP.Core.IDLE],
                [APP.Core.HAZARD_TRIGGERED]: [APP.Core.IDLE],
                [APP.Core.EDIT_DRAG]: [APP.Core.IDLE],
                [APP.Core.THEME_DRAG]: [APP.Core.IDLE]
            };

            function setLogicState(newState) {
                if (!VALID_LOGIC_TRANSITIONS[APP.State.ENGINE.logicState].includes(newState) && newState !== APP.Core.IDLE) {
                    console.warn(`Blocked Logic Transition: ${APP.State.ENGINE.logicState} -> ${newState}`);
                    return false;
                }

                if (APP.State.ENGINE.logicState === APP.Core.EDIT_DRAG && newState !== APP.Core.EDIT_DRAG) {
                    APP.UI.EditorDragGhost.update({ visible: false });
                }

                APP.State.ENGINE.logicState = newState;
                return true;
            }

            // setOverlayState updates state only; APP.UI.applyOverlayState renders it.
            function setOverlayState(newState) {
                if (APP.State.ENGINE.overlayState === newState) return true;
                if (APP.State.ENGINE.overlayState === APP.Core.HINT_ANIMATING && newState !== APP.Core.HINT_ANIMATING) {
                    APP.State.ENGINE.hinter.alpha = 0;
                    APP.State.ENGINE.hinter.holdStartMs = 0;
                    APP.State.ENGINE.hinter.blinkStartMs = 0;
                    APP.State.ENGINE.hinter.fadeStartMs = 0;
                }

                APP.State.ENGINE.overlayState = newState;
                APP.State.ENGINE.isDirty = true;
                APP.UI.setSolverAbortRequested(APP.State.ENGINE.solverAbortRequested);
                APP.UI.applyOverlayState(newState);

                return true;
            }

        return {
            init,
            bind,
            loadLevel(levelObjOrIdx, options = {}) {
                if (typeof levelObjOrIdx === 'number') return loadLevel(levelObjOrIdx, !!options.keepVariant);
                if (!refs.ENGINE) return;
                const mode = options.mode || refs.ENGINE.mode;
                if (mode === APP.Core.PLAY) refs.ENGINE.level = levelObjOrIdx;
                else refs.ENGINE.editor.workingLevel = levelObjOrIdx;
                this.resetRunState({ keepLevel: true });
            },
            resetRunState({ keepLevel = true } = {}) {
                if (!refs.ENGINE) return;
                APP.Engine.PathNavigator.clear(refs.ENGINE);
                refs.ENGINE.undoStack = [];
                refs.ENGINE.revealedGeese.clear();
                refs.ENGINE.ripples = [];
                refs.ENGINE.gooseEncounteredThisLevel = false;
                if (!keepLevel) refs.ENGINE.level = null;
                refs.ENGINE.armedFalseGoals = new Set((refs.ENGINE.level?.falseGoalKeys) || []);
                refs.ENGINE.detonatedFalseGoals = new Set();
            },
            handlePrimaryGridInput(k, opts) { return attemptMoveTo(k, opts); },
            handleCellClick(k, opts) { return attemptMoveTo(k, opts); },
            attemptMoveTo(target, opts) { return attemptMoveTo(target, opts); },
            processStep(key) { return processStep(key); },
            checkWinCondition() { return checkWinCondition(); },
            areWinMetricsSatisfied(state, level) { return areWinMetricsSatisfied(state, level); },
            checkFalseGoalCondition() { return checkFalseGoalCondition(); },
            triggerJumpScare() { return triggerJumpScare(); },
            triggerBombDetonation(key) { return triggerBombDetonation(key); },
            createSnapshot() { return createSnapshot(); },
            applySnapshot(snap) { return applySnapshot(snap); },
            checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections) { return checkWinConditionImpl(path, level, mode, logicState, isPortalJump, visitedCounts, intersections); },
            getPackedPath() { return [...(refs.ENGINE?.path || [])]; },
            getIntersections() { return refs.ENGINE?.intersections ?? 0; },
            updatePlayModeLayout,
            loop,
            switchMode,
            setLogicState,
            setOverlayState,
            getRealLength,
            rebuildDerivedPathState,
            assertStateConsistency,
            updatePencilState,
            PathNavigator
        };
    })();

    APP.Engine.init({ ENGINE: APP.State.ENGINE, UI: APP.UI });
}
