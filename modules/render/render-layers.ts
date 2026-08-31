// Full scene rendering consuming a render model — no APP references.

import { UNPACK }                        from '../domain/cell-key.js';
import { transformPoint, transformAxis, transformTurnDir } from '../domain/geometry.js';
import { getPortalDisplayColor, resolvePortal } from '../domain/portal-utils.js';
import {
    makeAssetDrawer, drawScorchMark,
    drawMustPassOverflowOverlay,
} from './draw-assets.js';
import { drawPath } from './draw-path.js';

function makeScreenPosFn(model: any) {
    const { viewport, orientation, level } = model;
    return function screenPos(cx: any, cy: any) {
        const { tx, ty } = transformPoint(cx, cy, orientation, level.grid.w, level.grid.h);
        return { sx: (tx + 0.5) * viewport.cellW, sy: (ty + 0.5) * viewport.cellH };
    };
}

const PERSISTED_HEATMAP_ALPHA = 0.3;

function drawHeatmapOverlay(ctx: any, screenPosFn: any, vp: any, cells: any, alpha: any) {
    if (!cells.length || alpha <= 0) return;
    ctx.save();
    for (const { x, y, intensity } of cells) {
        const { sx, sy } = screenPosFn(x, y);
        const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2;
        const hue = 50 - intensity * 50;
        ctx.globalAlpha = alpha * (0.2 + intensity * 0.6);
        ctx.fillStyle = `hsl(${hue}, 90%, 50%)`;
        ctx.fillRect(cx + 1, cy + 1, vp.cellW - 2, vp.cellH - 2);
    }
    ctx.restore();
}

export function renderScene(ctx: any, model: any, { cvs, mustPassOverlay }: any) {
    const { viewport: vp, level, theme: th } = model;

    if (mustPassOverlay) mustPassOverlay.replaceChildren();
    if (!vp.cellW || !level) {
        if (th) { ctx.fillStyle = th.canvasBg; ctx.fillRect(0, 0, cvs.width, cvs.height); }
        return { needsRedraw: false };
    }

    let needsRedraw = false;
    const screenPosFn = makeScreenPosFn(model);
    const drawAsset   = makeAssetDrawer(ctx, screenPosFn, vp);

    // --- Background ---
    ctx.fillStyle = th.canvasBg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    // --- Grid lines ---
    const W = level.grid.w, H = level.grid.h;
    const dispW = vp.swapped ? H : W, dispH = vp.swapped ? W : H;
    const inset = vp.cellW * 0.25;
    ctx.beginPath();
    ctx.strokeStyle = th.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= dispW; i++) { const x = i * vp.cellW; ctx.moveTo(x, inset); ctx.lineTo(x, cvs.height - inset); }
    for (let i = 0; i <= dispH; i++) { const y = i * vp.cellH; ctx.moveTo(inset, y); ctx.lineTo(cvs.width - inset, y); }
    ctx.stroke();

    // --- Heat map overlays (persisted first, then live — both beneath all objects/paths) ---
    if (model.persistedHeatmapActive) {
        drawHeatmapOverlay(ctx, screenPosFn, vp, model.persistedHeatmapCells, PERSISTED_HEATMAP_ALPHA);
    }
    if (model.heatmapActive) {
        drawHeatmapOverlay(ctx, screenPosFn, vp, model.heatmapCells, model.heatmapAlpha);
    }

    // --- Editor trap-spot parity candidates (faint: "not ruled out yet") ---
    // Drawn beneath the confirmed-spot style; a cell upgrades to the solid dashed
    // outline the moment the trap scan confirms it. Candidates clear when a sweep
    // completes, so a lone faint outline always means "scan still undecided here".
    if (model.isEditorMode && model.editorFalseGoalTriggerParityCandidates.size > 0) {
        model.editorFalseGoalTriggerParityCandidates.forEach((k: any) => {
            if (model.editorTriggerableFalseGoalCells.has(k)) return;
            const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
            const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2;
            ctx.save();
            ctx.strokeStyle = th.colors.goal + '50';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([vp.cellW * 0.08, vp.cellW * 0.12]);
            ctx.strokeRect(cx + 3, cy + 3, vp.cellW - 6, vp.cellH - 6);
            ctx.restore();
        });
    }

    // --- Editor trap spots ---
    if (model.isEditorMode && model.editorTriggerableFalseGoalCells.size > 0) {
        model.editorTriggerableFalseGoalCells.forEach((k: any) => {
            const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
            const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2;
            ctx.save();
            ctx.fillStyle = th.colors.goal + '40';
            ctx.fillRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4);
            ctx.strokeStyle = th.colors.goal;
            ctx.lineWidth = 3;
            ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.1]);
            ctx.strokeRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4);
            ctx.restore();
        });
    }

    // --- Filters ---
    level.filterMap.forEach((axis: any, k: any) => {
        const p = UNPACK(k);
        drawAsset('filter', p.x, p.y, { axis: transformAxis(axis, model.orientation), color: th.colors.filter });
    });

    // --- Flipping filters ---
    level.flippingFilterMap.forEach((baseAxis: any, k: any) => {
        const p = UNPACK(k);
        const crossed = model.hintActive
            ? model.hintCrossedFlippingFilters.has(k)
            : model.crossedFlippingFilters.has(k);
        const targetFlips = model.hintActive
            ? (crossed ? model.hintCrossedFlippingFilters.get(k) : model.hintDisplayFlipCount)
            : (crossed ? model.crossedFlippingFilters.get(k)     : model.flipCount);
        const currentVisualFlips = (!model.hintActive && !crossed)
            ? model.visualFlipCount
            : targetFlips;
        drawAsset('flippingFilter', p.x, p.y, {
            axis:     transformAxis(baseAxis, model.orientation),
            color:    th.colors.filter,
            rotation: currentVisualFlips * (Math.PI / 2),
            crossed,
        });
    });

    // --- Must-cross markers ---
    level.mustCrossKeys.forEach((k: any) => { const p = UNPACK(k); drawAsset('mustCross', p.x, p.y, { color: th.colors.cross }); });

    // --- Surround neighbor highlights (unvisited neighbors of surround landmarks) ---
    if (model.unsatisfiedSurroundNeighbors?.size > 0) {
        model.unsatisfiedSurroundNeighbors.forEach((nk: any) => {
            const p = UNPACK(nk), { sx, sy } = screenPosFn(p.x, p.y);
            const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2;
            ctx.save();
            ctx.fillStyle = `${th.colors.unsatisfied}30`;
            ctx.fillRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4);
            ctx.strokeStyle = th.colors.unsatisfied;
            ctx.lineWidth = 2;
            ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.1]);
            ctx.strokeRect(cx + 2, cy + 2, vp.cellW - 4, vp.cellH - 4);
            ctx.restore();
        });
    }

    // --- Blocks ---
    level.blockSet.forEach((k: any) => {
        if (level.landmarkMeta?.has(k)) return; // drawn separately as landmark
        const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
        const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2, cr = vp.cellW * 0.2;
        ctx.fillStyle = th.colors.block;
        ctx.beginPath(); ctx.roundRect(cx + 1, cy + 1, vp.cellW - 2, vp.cellH - 2, cr); ctx.fill();
        ctx.fillStyle = th.grid;
        for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) {
            ctx.beginPath(); ctx.arc(cx + c * 0.25 * vp.cellW, cy + r * 0.25 * vp.cellH, vp.cellW * 0.045, 0, Math.PI * 2); ctx.fill();
        }
    });

    // --- Landmarks (impassable: surround, adjacentTurn, decorative) ---
    if (level.landmarkMeta?.size > 0) {
        const adjTurnDirByKey = new Map((level.adjacentTurnKeys || []).map((k: any, i: any) => [k, (level.adjacentTurnDirs || [])[i]]));
        level.landmarkMeta.forEach(({ objectType, role }: any, k: any) => {
            if (!level.blockSet.has(k)) return; // passable landmarks drawn elsewhere
            const p = UNPACK(k);
            const isSatisfied = model.landmarkSatisfiedState?.get(k) ?? false;
            const turnDir = adjTurnDirByKey.get(k) as any;
            drawAsset('landmark', p.x, p.y, {
                objectType, role, isSatisfied, turnDir: transformTurnDir(turnDir, model.orientation), color: th.colors.block,
                themeColors: th.colors, burst: th.burst, check: th.check,
            });
        });
    }

    // --- Portals ---
    level.portalVisuals.forEach((pv: any) => {
        const color = getPortalDisplayColor(level, pv.k1, th.colors.portal);
        ctx.strokeStyle = color;
        ctx.lineWidth = vp.cellW * 0.1;
        ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]);
        [UNPACK(pv.k1), UNPACK(pv.k2)].forEach((p: any) => {
            const { sx, sy } = screenPosFn(p.x, p.y);
            ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.3, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = color + '25';
            ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]);
            if (model.showParityWarnings && !model.hasFlippingPortal && (p.x + p.y) % 2 !== model.targetParity) {
                drawAsset('prohibited', p.x, p.y);
            }
        });
    });
    ctx.setLineDash([]);

    // --- Pending portal (editor) ---
    if (model.editorPendingPortal) {
        const pp = UNPACK(model.editorPendingPortal), { sx, sy } = screenPosFn(pp.x, pp.y);
        ctx.strokeStyle = th.colors.portal; ctx.lineWidth = vp.cellW * 0.1;
        ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]);
        ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.3, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = th.colors.portal + '25';
        ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.2, 0, Math.PI * 2); ctx.fill();
    }

    // --- Ripples ---
    const now = Date.now();
    model.ripples.forEach((r: any) => {
        const pct = (now - r.startTime) / 600;
        const { sx, sy } = screenPosFn(r.x, r.y);
        ctx.save();
        ctx.globalAlpha = 1 - pct;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * (0.3 + pct * 1.2), 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    });

    // --- Gates ---
    level.gateKeys.forEach((k: any) => {
        const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
        ctx.save();
        ctx.translate(sx, sy); ctx.rotate(-Math.PI / 4);
        const color = (model.activeGateKey === k || !model.activeGateKey) ? th.colors.gate : th.grid;
        ctx.strokeStyle = color; ctx.lineWidth = vp.cellW * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 0; i < 2; i++) {
            const offset = (i - 0.5) * vp.cellW * 0.32;
            ctx.beginPath();
            ctx.moveTo(offset - vp.cellW * 0.1, -vp.cellW * 0.2);
            ctx.lineTo(offset + vp.cellW * 0.1, 0);
            ctx.lineTo(offset - vp.cellW * 0.1,  vp.cellW * 0.2);
            ctx.stroke();
        }
        ctx.restore();
        if (model.showParityWarnings && !model.hasFlippingPortal && (p.x + p.y) % 2 !== model.targetParity) {
            drawAsset('prohibited', p.x, p.y);
        }
    });

    // --- Goal ---
    if (level.goalKey !== -1) {
        const goalP = UNPACK(level.goalKey), sGoal = screenPosFn(goalP.x, goalP.y);
        ctx.save();
        ctx.strokeStyle = th.colors.goal; ctx.lineWidth = vp.cellW * 0.1;
        ctx.beginPath(); ctx.arc(sGoal.sx, sGoal.sy, vp.cellW * 0.32, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = th.colors.goal;
        ctx.beginPath(); ctx.arc(sGoal.sx, sGoal.sy, vp.cellW * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // --- Persisted hint overlay ---
    if (model.persistedHintActive && model.persistedHintPath.length) {
        const offsetPx = vp.cellW * 0.05;
        const offsetPosFn = (gx: any, gy: any) => {
            const { sx, sy } = screenPosFn(gx, gy);
            return { sx: sx + offsetPx, sy: sy + offsetPx };
        };
        const dp = model.persistedHintPath;
        const persistedJumps = new Set<number>();
        for (let i = 1; i < dp.length; i++) {
            const portal = resolvePortal(level, dp[i - 1]);
            if (portal && portal.dest === dp[i]) persistedJumps.add(i);
        }
        ctx.save();
        ctx.globalAlpha = 0.38;
        // strokeStyle (4th arg) is ignored when isCaution=true — drawPath uses cautionColor/
        // cautionOutline instead — so there's no real color to pass here.
        drawPath(ctx, dp, persistedJumps, undefined, vp.cellW * 0.3, true, offsetPosFn, vp.cellW, th.caution?.path, th.caution?.outline);
        ctx.restore();
    }

    // --- Player path ---
    if (model.path.length) {
        drawPath(ctx, model.path, model.isPortalJump, model.strokeStyle, vp.cellW * 0.25, false, screenPosFn, vp.cellW);
    }

    // --- Hint overlay ---
    if (model.hintActive) {
        ctx.save();
        ctx.globalAlpha = model.hintAlpha;
        const dp = model.hintDisplayPath;
        const hintsJumps = new Set<number>();
        for (let i = 1; i < dp.length; i++) {
            const portal = resolvePortal(level, dp[i - 1]);
            if (portal && portal.dest === dp[i]) hintsJumps.add(i);
        }
        // strokeStyle (4th arg) is ignored when isCaution=true — see the persisted-hint call above.
        drawPath(ctx, dp, hintsJumps, undefined, vp.cellW * 0.3, true, screenPosFn, vp.cellW, th.caution?.path, th.caution?.outline);
        ctx.restore();
    }

    // --- mustPass pins ---
    model.mustPassOnCanvas.forEach(({ x, y, isHit }: any) => {
        drawAsset('required', x, y, { isSatisfied: isHit, themeColors: th.colors });
    });
    if (model.mustPassInOverlay.length > 0) {
        const gridW = vp.swapped ? level.grid.h : level.grid.w;
        const gridH = vp.swapped ? level.grid.w : level.grid.h;
        if (drawMustPassOverflowOverlay(mustPassOverlay, model.mustPassInOverlay, th.colors, vp, cvs, screenPosFn, gridW, gridH)) {
            needsRedraw = true;
        }
    }

    // --- MustTurn library landmarks (passable cells with turn constraints) ---
    if (level.mustPassTurnDirs?.size > 0) {
        level.mustPassTurnDirs.forEach((dir: any, k: any) => {
            const p = UNPACK(k);
            const isSatisfied = model.landmarkSatisfiedState?.get(k) ?? false;
            drawAsset('mustTurnLandmark', p.x, p.y, {
                dir: transformTurnDir(dir, model.orientation), isSatisfied,
                themeColors: th.colors, burst: th.burst, check: th.check,
            });
        });
    }

    // --- False goals ---
    level.falseGoalKeys.forEach((k: any) => {
        const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
        if (model.isEditorMode || model.isReviewMode) {
            drawAsset('falsegoal', p.x, p.y);
        } else if (model.isPlayMode && model.armedFalseGoals.has(k)) {
            ctx.save();
            ctx.strokeStyle = th.colors.goal; ctx.lineWidth = vp.cellW * 0.1;
            ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.32, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = th.colors.goal;
            ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.14, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (model.isPlayMode && model.detonatedFalseGoals.has(k)) {
            drawScorchMark(ctx, sx, sy, vp.cellW);
        }
    });

    // --- Geese ---
    level.gooseSet.forEach((k: any) => {
        if (model.revealedGeese.has(k) || model.cheatActive || model.isEditorMode || model.isReviewMode) {
            const p = UNPACK(k);
            drawAsset('goose', p.x, p.y, { isCheatReveal: model.cheatActive && !model.revealedGeese.has(k) });
        }
    });

    return { needsRedraw };
}
