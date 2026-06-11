// Full scene rendering consuming a render model — no APP references.

import { UNPACK }                        from '../domain/cell-key.js';
import { transformPoint, transformAxis } from '../domain/geometry.js';
import { getPortalDisplayColor }         from '../domain/portal-utils.js';
import {
    makeAssetDrawer, drawScorchMark,
    drawMustPassOverflowOverlay,
} from './draw-assets.js';
import { drawPath } from './draw-path.js';

function makeScreenPosFn(model) {
    const { viewport, variant, level } = model;
    return function screenPos(cx, cy) {
        const { tx, ty } = transformPoint(cx, cy, variant, level.grid.w, level.grid.h);
        return { sx: (tx + 0.5) * viewport.cellW, sy: (ty + 0.5) * viewport.cellH };
    };
}

export function renderScene(ctx, model, { cvs, mustPassOverlay }) {
    const { viewport: vp, level, theme: th } = model;

    if (mustPassOverlay) mustPassOverlay.innerHTML = '';
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

    // --- Editor trap spots ---
    if (model.isEditorMode && model.editorValidTrapSpots.size > 0) {
        model.editorValidTrapSpots.forEach(k => {
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
    level.filterMap.forEach((axis, k) => {
        const p = UNPACK(k);
        drawAsset('filter', p.x, p.y, { axis: transformAxis(axis, model.variant), color: th.colors.filter });
    });

    // --- Flipping filters ---
    level.flippingFilterMap.forEach((baseAxis, k) => {
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
            axis:     transformAxis(baseAxis, model.variant),
            color:    th.colors.filter,
            rotation: currentVisualFlips * (Math.PI / 2),
            crossed,
        });
    });

    // --- Must-cross markers ---
    level.mustCrossKeys.forEach(k => { const p = UNPACK(k); drawAsset('mustCross', p.x, p.y, { color: th.colors.cross }); });

    // --- Blocks ---
    level.blockSet.forEach(k => {
        const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
        const cx = sx - vp.cellW / 2, cy = sy - vp.cellH / 2, cr = vp.cellW * 0.2;
        ctx.fillStyle = th.colors.block;
        ctx.beginPath(); ctx.roundRect(cx + 1, cy + 1, vp.cellW - 2, vp.cellH - 2, cr); ctx.fill();
        ctx.fillStyle = th.grid;
        for (let r = 1; r <= 3; r++) for (let c = 1; c <= 3; c++) {
            ctx.beginPath(); ctx.arc(cx + c * 0.25 * vp.cellW, cy + r * 0.25 * vp.cellH, vp.cellW * 0.045, 0, Math.PI * 2); ctx.fill();
        }
    });

    // --- Portals ---
    level.portalVisuals.forEach(pv => {
        const color = getPortalDisplayColor(level, pv.k1, th.colors.portal);
        ctx.strokeStyle = color;
        ctx.lineWidth = vp.cellW * 0.1;
        ctx.setLineDash([vp.cellW * 0.1, vp.cellW * 0.08]);
        [UNPACK(pv.k1), UNPACK(pv.k2)].forEach(p => {
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
    model.ripples.forEach(r => {
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
    level.gateKeys.forEach(k => {
        const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
        ctx.save();
        ctx.translate(sx, sy); ctx.rotate(-Math.PI / 4);
        const color = (model.activeGateKey === k || !model.activeGateKey) ? th.colors.gate : '#94a3b8';
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

    // --- Player path ---
    if (model.path.length) {
        drawPath(ctx, model.path, model.isPortalJump, model.strokeStyle, vp.cellW * 0.25, false, screenPosFn, vp.cellW);
    }

    // --- Hint overlay ---
    if (model.hintActive) {
        ctx.save();
        ctx.globalAlpha = model.hintAlpha;
        const dp = model.hintDisplayPath;
        const hintsJumps = new Set();
        for (let i = 1; i < dp.length; i++) {
            const p1 = UNPACK(dp[i - 1]), p2 = UNPACK(dp[i]);
            if (Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) > 1) hintsJumps.add(i);
        }
        drawPath(ctx, dp, hintsJumps, '#22c55e', vp.cellW * 0.3, true, screenPosFn, vp.cellW);
        ctx.restore();
    }

    // --- mustPass pins ---
    model.mustPassOnCanvas.forEach(({ x, y, isHit }) => {
        drawAsset('required', x, y, { isSatisfied: isHit, themeColors: th.colors });
    });
    if (model.mustPassInOverlay.length > 0) {
        const gridW = vp.swapped ? level.grid.h : level.grid.w;
        const gridH = vp.swapped ? level.grid.w : level.grid.h;
        if (drawMustPassOverflowOverlay(mustPassOverlay, model.mustPassInOverlay, th.colors, vp, cvs, screenPosFn, gridW, gridH)) {
            needsRedraw = true;
        }
    }

    // --- False goals ---
    level.falseGoalKeys.forEach(k => {
        const p = UNPACK(k), { sx, sy } = screenPosFn(p.x, p.y);
        if (model.armedFalseGoals.has(k)) {
            ctx.save();
            ctx.strokeStyle = th.colors.goal; ctx.lineWidth = vp.cellW * 0.1;
            ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.32, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = th.colors.goal;
            ctx.beginPath(); ctx.arc(sx, sy, vp.cellW * 0.14, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (model.detonatedFalseGoals.has(k)) {
            drawScorchMark(ctx, sx, sy, vp.cellW);
        } else if (model.isEditorMode || model.isReviewMode) {
            drawAsset('bomb', p.x, p.y);
        }
    });

    // --- Geese ---
    level.gooseSet.forEach(k => {
        if (model.revealedGeese.has(k) || model.cheatActive || model.isEditorMode || model.isReviewMode) {
            const p = UNPACK(k);
            drawAsset('goose', p.x, p.y, { isCheatReveal: model.cheatActive && !model.revealedGeese.has(k) });
        }
    });

    return { needsRedraw };
}
