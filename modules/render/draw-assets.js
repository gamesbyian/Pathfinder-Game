// Pure canvas asset drawing — no APP references.
// AXIS_V must stay in sync with APP.Core.V (= 2).

const AXIS_V = 2;

export function drawRequiredPin(drawCtx, size, options = {}) {
    const color = options.isSatisfied ? options.themeColors.pin : options.themeColors.pinUnflipped;
    const accent = options.themeColors.pin || color;
    const alpha = options.isSatisfied ? 0.34 : 0.18;
    const radius = size * 0.16;

    drawCtx.save();
    drawCtx.translate(0, options.pinYOffset || 0);
    drawCtx.strokeStyle = color;
    drawCtx.fillStyle = color;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';

    drawCtx.globalAlpha = alpha;
    drawCtx.lineWidth = size * 0.08;
    drawCtx.beginPath();
    drawCtx.roundRect(-size * 0.28, -size * 0.28, size * 0.56, size * 0.56, radius);
    drawCtx.stroke();

    drawCtx.globalAlpha = options.isSatisfied ? 0.95 : 0.72;
    drawCtx.lineWidth = size * 0.08;
    drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.16, 0, Math.PI * 2); drawCtx.stroke();
    drawCtx.beginPath(); drawCtx.moveTo(0, -size * 0.34); drawCtx.lineTo(0, -size * 0.22); drawCtx.stroke();
    drawCtx.beginPath(); drawCtx.moveTo(0, size * 0.22); drawCtx.lineTo(0, size * 0.34); drawCtx.stroke();
    drawCtx.beginPath(); drawCtx.moveTo(-size * 0.34, 0); drawCtx.lineTo(-size * 0.22, 0); drawCtx.stroke();
    drawCtx.beginPath(); drawCtx.moveTo(size * 0.22, 0); drawCtx.lineTo(size * 0.34, 0); drawCtx.stroke();

    drawCtx.fillStyle = accent;
    drawCtx.globalAlpha = options.isSatisfied ? 1 : 0.5;
    drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.055, 0, Math.PI * 2); drawCtx.fill();
    drawCtx.restore();
}

export const DRAW_REGISTRY = {
    bomb(drawCtx, size, color, options = {}) {
        const goal = color || options.themeColors?.goal || '#ef4444';
        drawCtx.save();
        drawCtx.fillStyle = options.themeColors?.filter || '#0f172a';
        drawCtx.beginPath();
        drawCtx.roundRect(-size * 0.36, -size * 0.36, size * 0.72, size * 0.72, size * 0.18);
        drawCtx.fill();
        drawCtx.strokeStyle = goal;
        drawCtx.lineWidth = size * 0.08;
        drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.24, 0, Math.PI * 2); drawCtx.stroke();
        drawCtx.fillStyle = goal;
        drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.09, 0, Math.PI * 2); drawCtx.fill();
        drawCtx.strokeStyle = '#fde047';
        drawCtx.lineWidth = size * 0.07;
        drawCtx.lineCap = 'round';
        drawCtx.beginPath(); drawCtx.moveTo(-size * 0.20, -size * 0.20); drawCtx.lineTo(size * 0.20, size * 0.20); drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(size * 0.20, -size * 0.20); drawCtx.lineTo(-size * 0.20, size * 0.20); drawCtx.stroke();
        drawCtx.fillStyle = '#fde047';
        drawCtx.beginPath();
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI * 2 / 10;
            const r = i % 2 ? size * 0.07 : size * 0.14;
            const x = size * 0.28 + Math.cos(a) * r;
            const y = -size * 0.28 + Math.sin(a) * r;
            if (i === 0) drawCtx.moveTo(x, y); else drawCtx.lineTo(x, y);
        }
        drawCtx.closePath(); drawCtx.fill();
        drawCtx.restore();
    },
    goose(drawCtx, size, color, options = {}) {
        if (options.isCheatReveal) drawCtx.globalAlpha = 0.5;
        const mapX = (v) => -size / 2 + (v / 100 * size);
        const mapY = (v) => -size / 2 + (v / 100 * size);
        drawCtx.save();
        drawCtx.fillStyle = '#0f172a';
        drawCtx.beginPath();
        drawCtx.roundRect(mapX(8), mapY(8), size * 0.84, size * 0.84, size * 0.24);
        drawCtx.fill();
        drawCtx.fillStyle = '#ffffff';
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(24), mapY(61)); drawCtx.quadraticCurveTo(mapX(28), mapY(46), mapX(46), mapY(47));
        drawCtx.lineTo(mapX(62), mapY(47)); drawCtx.quadraticCurveTo(mapX(73), mapY(47), mapX(75), mapY(57));
        drawCtx.quadraticCurveTo(mapX(77), mapY(68), mapX(62), mapY(69)); drawCtx.lineTo(mapX(41), mapY(69));
        drawCtx.quadraticCurveTo(mapX(27), mapY(69), mapX(24), mapY(61)); drawCtx.fill();
        drawCtx.beginPath(); drawCtx.moveTo(mapX(26), mapY(56)); drawCtx.lineTo(mapX(13), mapY(47)); drawCtx.lineTo(mapX(31), mapY(52)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(58), mapY(48)); drawCtx.lineTo(mapX(58), mapY(28));
        drawCtx.quadraticCurveTo(mapX(58), mapY(19), mapX(68), mapY(19));
        drawCtx.quadraticCurveTo(mapX(78), mapY(19), mapX(78), mapY(29));
        drawCtx.lineTo(mapX(78), mapY(39)); drawCtx.lineTo(mapX(69), mapY(39)); drawCtx.lineTo(mapX(69), mapY(48)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.fillStyle = '#0f172a';
        drawCtx.beginPath(); drawCtx.arc(mapX(71), mapY(27), size * 0.024, 0, Math.PI * 2); drawCtx.fill();
        drawCtx.fillStyle = '#f97316';
        drawCtx.beginPath(); drawCtx.moveTo(mapX(78), mapY(32)); drawCtx.lineTo(mapX(91), mapY(36)); drawCtx.lineTo(mapX(78), mapY(40)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(43), mapY(69)); drawCtx.lineTo(mapX(38), mapY(82)); drawCtx.lineTo(mapX(50), mapY(82)); drawCtx.closePath();
        drawCtx.moveTo(mapX(58), mapY(69)); drawCtx.lineTo(mapX(53), mapY(82)); drawCtx.lineTo(mapX(65), mapY(82)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.strokeStyle = '#f97316';
        drawCtx.lineWidth = size * 0.05;
        drawCtx.lineCap = 'round';
        drawCtx.globalAlpha *= 0.9;
        drawCtx.beginPath(); drawCtx.moveTo(mapX(18), mapY(18)); drawCtx.lineTo(mapX(29), mapY(18)); drawCtx.moveTo(mapX(18), mapY(18)); drawCtx.lineTo(mapX(18), mapY(29)); drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(mapX(82), mapY(82)); drawCtx.lineTo(mapX(71), mapY(82)); drawCtx.moveTo(mapX(82), mapY(82)); drawCtx.lineTo(mapX(82), mapY(71)); drawCtx.stroke();
        drawCtx.restore();
    },
    prohibited(drawCtx, size) {
        drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.35, 0, Math.PI * 2); drawCtx.strokeStyle = '#ef4444'; drawCtx.lineWidth = size * 0.1; drawCtx.stroke();
        drawCtx.beginPath(); const lineLen = size * 0.25; drawCtx.moveTo(-lineLen, -lineLen); drawCtx.lineTo(lineLen, lineLen); drawCtx.stroke();
    },
    required(drawCtx, size, color, options = {}) {
        drawRequiredPin(drawCtx, size, options);
    },
    mustCross(drawCtx, size, color) {
        drawCtx.strokeStyle = color;
        drawCtx.globalAlpha = 0.45;
        drawCtx.lineWidth = size * 0.08;
        drawCtx.lineCap = 'round';
        drawCtx.lineJoin = 'round';
        const outer = size * 0.4, inner = size * 0.18;
        drawCtx.beginPath(); drawCtx.moveTo(-outer, -inner); drawCtx.lineTo(-inner, -inner); drawCtx.lineTo(-inner, -outer); drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(outer, -inner);  drawCtx.lineTo(inner, -inner);  drawCtx.lineTo(inner, -outer);  drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(-outer, inner);  drawCtx.lineTo(-inner, inner);  drawCtx.lineTo(-inner, outer);  drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(outer, inner);   drawCtx.lineTo(inner, inner);   drawCtx.lineTo(inner, outer);   drawCtx.stroke();
        drawCtx.globalAlpha = 0.22;
        drawCtx.beginPath(); drawCtx.moveTo(-size * 0.18, 0); drawCtx.lineTo(size * 0.18, 0); drawCtx.moveTo(0, -size * 0.18); drawCtx.lineTo(0, size * 0.18); drawCtx.stroke();
    },
    filter(drawCtx, size, color, options = {}) {
        if (options.axis === AXIS_V) drawCtx.rotate(Math.PI / 2);
        drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.28;
        const w = size * 0.45, t = size * 0.08;
        drawCtx.beginPath(); drawCtx.roundRect(-size / 2 + size * 0.1, -w / 2, size * 0.8, t, t / 2); drawCtx.fill();
        drawCtx.beginPath(); drawCtx.roundRect(-size / 2 + size * 0.1,  w / 2 - t, size * 0.8, t, t / 2); drawCtx.fill();
        drawCtx.globalAlpha = 0.48;
        drawCtx.beginPath(); drawCtx.arc(0, -w / 2 + t / 2, size * 0.045, 0, Math.PI * 2); drawCtx.fill();
        drawCtx.beginPath(); drawCtx.arc(0, w / 2 - t / 2, size * 0.045, 0, Math.PI * 2); drawCtx.fill();
    },
    flippingFilter(drawCtx, size, color, options = {}) {
        drawCtx.rotate(options.rotation || 0);
        if (options.axis === AXIS_V) drawCtx.rotate(Math.PI / 2);
        DRAW_REGISTRY.filter(drawCtx, size, color, { axis: 1 });
        drawCtx.globalAlpha = options.crossed ? 0.4 : 1.0;
        drawCtx.strokeStyle = color;
        drawCtx.fillStyle = color;
        drawCtx.lineWidth = size * 0.075;
        drawCtx.lineCap = 'round';
        drawCtx.beginPath();
        drawCtx.arc(0, 0, size * 0.18, -Math.PI * 0.2, Math.PI * 1.45, false);
        drawCtx.stroke();
        drawCtx.beginPath();
        drawCtx.moveTo(size * 0.18, size * 0.09);
        drawCtx.lineTo(size * 0.30, size * 0.05);
        drawCtx.lineTo(size * 0.24, -size * 0.07);
        drawCtx.closePath();
        drawCtx.fill();
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
