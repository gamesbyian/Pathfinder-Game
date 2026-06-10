// Pure canvas asset drawing — no APP references.
// AXIS_V must stay in sync with APP.Core.V (= 2).

const AXIS_V = 2;

export function drawRequiredPin(drawCtx, size, options = {}) {
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

export const DRAW_REGISTRY = {
    bomb(drawCtx, size) {
        const scale = size / 100;
        drawCtx.scale(scale, scale);
        drawCtx.beginPath(); drawCtx.arc(0, 10, 25, 0, Math.PI * 2); drawCtx.fillStyle = '#334155'; drawCtx.fill();
        drawCtx.beginPath(); drawCtx.moveTo(0, -15); drawCtx.quadraticCurveTo(15, -30, 30, -25); drawCtx.strokeStyle = '#94a3b8'; drawCtx.lineWidth = 4; drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.arc(30, -25, 5, 0, Math.PI * 2); drawCtx.fillStyle = '#ef4444'; drawCtx.fill();
        drawCtx.beginPath(); drawCtx.arc(30, -25, 2.5, 0, Math.PI * 2); drawCtx.fillStyle = '#fde047'; drawCtx.fill();
        drawCtx.beginPath(); drawCtx.moveTo(-5, -15); drawCtx.lineTo(5, -15); drawCtx.lineTo(5, -5); drawCtx.lineTo(-5, -5); drawCtx.closePath(); drawCtx.fillStyle = '#64748b'; drawCtx.fill();
    },
    goose(drawCtx, size, color, options = {}) {
        if (options.isCheatReveal) drawCtx.globalAlpha = 0.5;
        const mapX = (v) => -size / 2 + (v / 100 * size);
        const mapY = (v) => -size / 2 + (v / 100 * size);
        drawCtx.fillStyle = '#000000';
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(30), mapY(0)); drawCtx.lineTo(mapX(70), mapY(0)); drawCtx.lineTo(mapX(100), mapY(30));
        drawCtx.lineTo(mapX(100), mapY(70)); drawCtx.lineTo(mapX(70), mapY(100)); drawCtx.lineTo(mapX(30), mapY(100));
        drawCtx.lineTo(mapX(0), mapY(70)); drawCtx.lineTo(mapX(0), mapY(30)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.fillStyle = '#FFFFFF';
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(25), mapY(60)); drawCtx.quadraticCurveTo(mapX(25), mapY(45), mapX(45), mapY(45));
        drawCtx.lineTo(mapX(65), mapY(45)); drawCtx.quadraticCurveTo(mapX(75), mapY(45), mapX(75), mapY(55));
        drawCtx.quadraticCurveTo(mapX(75), mapY(65), mapX(65), mapY(65)); drawCtx.lineTo(mapX(40), mapY(65));
        drawCtx.quadraticCurveTo(mapX(25), mapY(65), mapX(25), mapY(60)); drawCtx.fill();
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(25), mapY(55)); drawCtx.lineTo(mapX(15), mapY(45)); drawCtx.lineTo(mapX(30), mapY(55)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(60), mapY(45)); drawCtx.lineTo(mapX(60), mapY(25));
        drawCtx.quadraticCurveTo(mapX(60), mapY(18), mapX(68), mapY(18));
        drawCtx.quadraticCurveTo(mapX(75), mapY(18), mapX(75), mapY(25));
        drawCtx.lineTo(mapX(75), mapY(35)); drawCtx.lineTo(mapX(68), mapY(35)); drawCtx.lineTo(mapX(68), mapY(45)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.fillStyle = '#000000';
        drawCtx.beginPath(); drawCtx.arc(mapX(70), mapY(23), size * 0.02, 0, Math.PI * 2); drawCtx.fill();
        drawCtx.fillStyle = '#f97316';
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(75), mapY(29)); drawCtx.lineTo(mapX(88), mapY(32)); drawCtx.lineTo(mapX(75), mapY(35)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(45), mapY(65)); drawCtx.lineTo(mapX(40), mapY(78)); drawCtx.lineTo(mapX(52), mapY(78)); drawCtx.closePath();
        drawCtx.moveTo(mapX(58), mapY(65)); drawCtx.lineTo(mapX(53), mapY(78)); drawCtx.lineTo(mapX(65), mapY(78)); drawCtx.closePath();
        drawCtx.fill();
    },
    prohibited(drawCtx, size) {
        drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.35, 0, Math.PI * 2); drawCtx.strokeStyle = '#ef4444'; drawCtx.lineWidth = size * 0.1; drawCtx.stroke();
        drawCtx.beginPath(); const lineLen = size * 0.25; drawCtx.moveTo(-lineLen, -lineLen); drawCtx.lineTo(lineLen, lineLen); drawCtx.stroke();
    },
    required(drawCtx, size, color, options = {}) {
        drawRequiredPin(drawCtx, size, options);
    },
    mustCross(drawCtx, size, color) {
        drawCtx.strokeStyle = color; drawCtx.globalAlpha = 0.25; drawCtx.lineWidth = size * 0.08;
        const outer = size * 0.4, inner = size * 0.18;
        drawCtx.beginPath(); drawCtx.moveTo(-outer, -inner); drawCtx.lineTo(-inner, -inner); drawCtx.lineTo(-inner, -outer); drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(outer, -inner);  drawCtx.lineTo(inner, -inner);  drawCtx.lineTo(inner, -outer);  drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(-outer, inner);  drawCtx.lineTo(-inner, inner);  drawCtx.lineTo(-inner, outer);  drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(outer, inner);   drawCtx.lineTo(inner, inner);   drawCtx.lineTo(inner, outer);   drawCtx.stroke();
    },
    filter(drawCtx, size, color, options = {}) {
        if (options.axis === AXIS_V) drawCtx.rotate(Math.PI / 2);
        drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.25;
        const w = size * 0.45, t = size * 0.08;
        drawCtx.fillRect(-size / 2 + size * 0.1, -w / 2, size * 0.8, t);
        drawCtx.fillRect(-size / 2 + size * 0.1,  w / 2 - t, size * 0.8, t);
    },
    flippingFilter(drawCtx, size, color, options = {}) {
        drawCtx.rotate(options.rotation || 0);
        if (options.axis === AXIS_V) drawCtx.rotate(Math.PI / 2);
        drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.25;
        const w = size * 0.45, t = size * 0.08;
        drawCtx.fillRect(-size / 2 + size * 0.1, -w / 2, size * 0.8, t);
        drawCtx.fillRect(-size / 2 + size * 0.1,  w / 2 - t, size * 0.8, t);
        drawCtx.globalAlpha = options.crossed ? 0.4 : 1.0;
        drawCtx.fillStyle = color;
        drawCtx.font = `900 ${size * 0.45}px sans-serif`;
        drawCtx.textAlign = 'center';
        drawCtx.textBaseline = 'middle';
        drawCtx.fillText('↺', 0, 0);
    },
};

// Returns a drawAsset(type, x, y, options) function bound to ctx/screenPosFn/viewport.
export function makeAssetDrawer(ctx, screenPosFn, viewport) {
    return function drawAsset(type, x, y, options = {}) {
        const drawer = DRAW_REGISTRY[type];
        if (!drawer) return;
        const { sx, sy } = screenPosFn(x, y);
        const size = options.size ?? viewport.cellW;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.beginPath();
        drawer(ctx, size, options.color, options);
        ctx.restore();
    };
}

export function drawScorchMark(ctx, cx, cy, s) {
    ctx.save();
    ctx.translate(cx, cy);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.4);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    const radii = [0.35, 0.15, 0.4, 0.2, 0.3, 0.15, 0.35, 0.2, 0.4, 0.15, 0.3, 0.25, 0.35, 0.15, 0.4, 0.2];
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = s * radii[i];
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// Returns true when layout dimensions are not yet ready, signalling the caller
// to schedule a re-render (equivalent to the original isDirty = true guard).
export function drawMustPassOverflowOverlay(overlay, pins, themeColors, viewport, cvs, screenPosFn, gridW, gridH) {
    if (!overlay) return false;
    overlay.innerHTML = '';
    if (!pins || !pins.length) return false;

    const canvasRect = cvs.getBoundingClientRect();
    const paneRect   = overlay.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height || !paneRect.width || !paneRect.height || !cvs.width || !cvs.height) {
        return true; // layout not ready — caller should re-render next frame
    }

    const scaleX = canvasRect.width  / cvs.width;
    const scaleY = canvasRect.height / cvs.height;
    const cssCellW = (viewport.cellW || (cvs.width  / gridW)) * scaleX;
    const cssCellH = (viewport.cellH || (cvs.height / gridH)) * scaleY;
    const markerCanvasSize = Math.max(cssCellW, cssCellH) * 1.5;

    pins.forEach(({ x, y, isHit }) => {
        const { sx, sy } = screenPosFn(x, y);
        const cssX = canvasRect.left - paneRect.left + sx * scaleX;
        const cssY = canvasRect.top  - paneRect.top  + sy * scaleY;

        const pinCanvas = document.createElement('canvas');
        pinCanvas.width  = Math.max(1, Math.round(markerCanvasSize * window.devicePixelRatio));
        pinCanvas.height = Math.max(1, Math.round(markerCanvasSize * window.devicePixelRatio));
        pinCanvas.style.position        = 'absolute';
        pinCanvas.style.left            = `${cssX - markerCanvasSize / 2}px`;
        pinCanvas.style.top             = `${cssY - markerCanvasSize / 2}px`;
        pinCanvas.style.width           = `${markerCanvasSize}px`;
        pinCanvas.style.height          = `${markerCanvasSize}px`;
        pinCanvas.style.backgroundColor = 'transparent';
        pinCanvas.style.pointerEvents   = 'none';

        const pinCtx = pinCanvas.getContext('2d');
        if (!pinCtx) return;
        pinCtx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        pinCtx.translate(markerCanvasSize / 2, markerCanvasSize / 2);
        drawRequiredPin(pinCtx, Math.min(cssCellW, cssCellH), { isSatisfied: isHit, themeColors });

        overlay.appendChild(pinCanvas);
    });
    return false;
}
