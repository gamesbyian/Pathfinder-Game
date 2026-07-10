// Pure canvas asset drawing — no APP references.
// AXIS_V must stay in sync with APP.Core.V (= 2).

import { LANDMARK_COLOR_KEYS } from '../domain/landmark-rules.js';

const AXIS_V = 2;

export function drawRequiredPin(drawCtx: any, size: any, options: any = {}) {
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
    drawCtx.fillStyle = '#94a3b8'; // theme-exempt: neutral pin post/shaft (material cue, like real pushpin metal) — the pin head below carries the themed color
    drawCtx.fill();
    drawCtx.beginPath();
    drawCtx.arc(0, -18, 7, 0, Math.PI * 2);
    drawCtx.fillStyle = options.isSatisfied ? options.themeColors.pin : options.themeColors.pinUnflipped;
    drawCtx.fill();
}

/**
 * Small "turn direction" badge: a filled circle with a curved arrow glyph inside, drawn
 * centered at the current transform origin (caller translates to the desired corner first).
 * Carries its own background circle — like {@link drawSatisfiedCheck} — so it stays legible
 * regardless of what landmark art sits behind it (some silhouettes, e.g. the lamppost, don't
 * reach into the corner at all). 'cw'/'ccw' draw a single arc with one arrowhead; 'either'
 * draws the same arc with an arrowhead at BOTH ends (one continuing clockwise, one continuing
 * counter-clockwise) so it reads as "a turn in either direction satisfies this."
 */
function drawTurnGlyph(drawCtx: any, r: any, dir: any, backdropColor: any, arrowColor: any) {
    drawCtx.save();
    drawCtx.beginPath();
    drawCtx.arc(0, 0, r, 0, Math.PI * 2);
    drawCtx.fillStyle = backdropColor;
    drawCtx.fill();

    const arcR = r * 0.56;
    const a0 = -Math.PI * 0.6, a1 = Math.PI * 0.6;
    const headLen = arcR * 0.62, headSpread = Math.PI * 0.72;
    const drawHead = (angle: number, travelAngle: number) => {
        const hx = Math.cos(angle) * arcR, hy = Math.sin(angle) * arcR;
        drawCtx.beginPath();
        drawCtx.moveTo(hx + Math.cos(travelAngle) * headLen, hy + Math.sin(travelAngle) * headLen);
        drawCtx.lineTo(hx + Math.cos(travelAngle + headSpread) * headLen * 0.65, hy + Math.sin(travelAngle + headSpread) * headLen * 0.65);
        drawCtx.lineTo(hx + Math.cos(travelAngle - headSpread) * headLen * 0.65, hy + Math.sin(travelAngle - headSpread) * headLen * 0.65);
        drawCtx.closePath();
        drawCtx.fill();
    };
    drawCtx.fillStyle = arrowColor;
    drawCtx.strokeStyle = arrowColor;
    drawCtx.lineWidth = arcR * 0.34;
    drawCtx.lineCap = 'round';
    if (dir === 'either') {
        drawCtx.beginPath();
        drawCtx.arc(0, 0, arcR, a0, a1, false);
        drawCtx.stroke();
        drawHead(a1, a1 + Math.PI / 2);
        drawHead(a0, a0 - Math.PI / 2);
    } else {
        if (dir === 'ccw') drawCtx.scale(-1, 1);
        drawCtx.beginPath();
        drawCtx.arc(0, 0, arcR, a0, a1, false);
        drawCtx.stroke();
        drawHead(a1, a1 + Math.PI / 2);
    }
    drawCtx.restore();
}

/**
 * Small "constraint satisfied" badge: a filled circle with a checkmark, centered at origin.
 * Reuses the same burst/check color pairing as the existing "level completed" badge
 * (def-completion in ui/svg-defs.ts) so a landmark's satisfied state reads the same in-grid
 * as it does in the level-select completed indicator.
 */
function drawSatisfiedCheck(drawCtx: any, r: any, backdropColor: any, checkColor: any) {
    drawCtx.save();
    drawCtx.beginPath();
    drawCtx.arc(0, 0, r, 0, Math.PI * 2);
    drawCtx.fillStyle = backdropColor;
    drawCtx.fill();
    drawCtx.strokeStyle = checkColor;
    drawCtx.lineWidth = r * 0.3;
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';
    drawCtx.beginPath();
    drawCtx.moveTo(-r * 0.5, r * 0.05);
    drawCtx.lineTo(-r * 0.1, r * 0.45);
    drawCtx.lineTo(r * 0.55, -r * 0.4);
    drawCtx.stroke();
    drawCtx.restore();
}

export const DRAW_REGISTRY: Record<string, any> = {
    // theme-exempt: the false-goal icon is a fixed hazard icon, drawn as a bomb (like the goose
    // below) — it should always read as "a bomb" rather than take on the theme's palette.
    falsegoal(drawCtx: any, size: any) {
        const scale = size / 100;
        drawCtx.scale(scale, scale);
        drawCtx.beginPath(); drawCtx.arc(0, 10, 25, 0, Math.PI * 2); drawCtx.fillStyle = '#334155'; drawCtx.fill(); // theme-exempt: see fn comment
        drawCtx.beginPath(); drawCtx.moveTo(0, -15); drawCtx.quadraticCurveTo(15, -30, 30, -25); drawCtx.strokeStyle = '#94a3b8'; drawCtx.lineWidth = 4; drawCtx.stroke(); // theme-exempt: see fn comment
        drawCtx.beginPath(); drawCtx.arc(30, -25, 5, 0, Math.PI * 2); drawCtx.fillStyle = '#ef4444'; drawCtx.fill(); // theme-exempt: see fn comment
        drawCtx.beginPath(); drawCtx.arc(30, -25, 2.5, 0, Math.PI * 2); drawCtx.fillStyle = '#fde047'; drawCtx.fill(); // theme-exempt: see fn comment
        drawCtx.beginPath(); drawCtx.moveTo(-5, -15); drawCtx.lineTo(5, -15); drawCtx.lineTo(5, -5); drawCtx.lineTo(-5, -5); drawCtx.closePath(); drawCtx.fillStyle = '#64748b'; drawCtx.fill(); // theme-exempt: see fn comment
    },
    // theme-exempt: the goose is a fixed hazard icon (black/white/orange, like a real goose) —
    // it should always read as "a goose" rather than take on the theme's palette.
    goose(drawCtx: any, size: any, color: any, options: any = {}) {
        if (options.isCheatReveal) drawCtx.globalAlpha = 0.5;
        const mapX = (v: any) => -size / 2 + (v / 100 * size);
        const mapY = (v: any) => -size / 2 + (v / 100 * size);
        drawCtx.fillStyle = '#000000'; // theme-exempt: see fn comment
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(30), mapY(0)); drawCtx.lineTo(mapX(70), mapY(0)); drawCtx.lineTo(mapX(100), mapY(30));
        drawCtx.lineTo(mapX(100), mapY(70)); drawCtx.lineTo(mapX(70), mapY(100)); drawCtx.lineTo(mapX(30), mapY(100));
        drawCtx.lineTo(mapX(0), mapY(70)); drawCtx.lineTo(mapX(0), mapY(30)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.fillStyle = '#FFFFFF'; // theme-exempt: see fn comment
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
        drawCtx.fillStyle = '#000000'; // theme-exempt: see fn comment
        drawCtx.beginPath(); drawCtx.arc(mapX(70), mapY(23), size * 0.02, 0, Math.PI * 2); drawCtx.fill();
        drawCtx.fillStyle = '#f97316'; // theme-exempt: see fn comment
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(75), mapY(29)); drawCtx.lineTo(mapX(88), mapY(32)); drawCtx.lineTo(mapX(75), mapY(35)); drawCtx.closePath(); drawCtx.fill();
        drawCtx.beginPath();
        drawCtx.moveTo(mapX(45), mapY(65)); drawCtx.lineTo(mapX(40), mapY(78)); drawCtx.lineTo(mapX(52), mapY(78)); drawCtx.closePath();
        drawCtx.moveTo(mapX(58), mapY(65)); drawCtx.lineTo(mapX(53), mapY(78)); drawCtx.lineTo(mapX(65), mapY(78)); drawCtx.closePath();
        drawCtx.fill();
    },
    // theme-exempt: universal "prohibited" red circle-slash, like a stop sign — a warning
    // symbol, not a themed UI accent.
    prohibited(drawCtx: any, size: any) {
        drawCtx.beginPath(); drawCtx.arc(0, 0, size * 0.35, 0, Math.PI * 2); drawCtx.strokeStyle = '#ef4444'; drawCtx.lineWidth = size * 0.1; drawCtx.stroke(); // theme-exempt: see fn comment
        drawCtx.beginPath(); const lineLen = size * 0.25; drawCtx.moveTo(-lineLen, -lineLen); drawCtx.lineTo(lineLen, lineLen); drawCtx.stroke();
    },
    required(drawCtx: any, size: any, color: any, options: any = {}) {
        drawRequiredPin(drawCtx, size, options);
    },
    mustCross(drawCtx: any, size: any, color: any) {
        drawCtx.strokeStyle = color; drawCtx.globalAlpha = 0.25; drawCtx.lineWidth = size * 0.08;
        const outer = size * 0.4, inner = size * 0.18;
        drawCtx.beginPath(); drawCtx.moveTo(-outer, -inner); drawCtx.lineTo(-inner, -inner); drawCtx.lineTo(-inner, -outer); drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(outer, -inner);  drawCtx.lineTo(inner, -inner);  drawCtx.lineTo(inner, -outer);  drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(-outer, inner);  drawCtx.lineTo(-inner, inner);  drawCtx.lineTo(-inner, outer);  drawCtx.stroke();
        drawCtx.beginPath(); drawCtx.moveTo(outer, inner);   drawCtx.lineTo(inner, inner);   drawCtx.lineTo(inner, outer);   drawCtx.stroke();
    },
    filter(drawCtx: any, size: any, color: any, options: any = {}) {
        if (options.axis === AXIS_V) drawCtx.rotate(Math.PI / 2);
        drawCtx.fillStyle = color; drawCtx.globalAlpha = 0.25;
        const w = size * 0.45, t = size * 0.08;
        drawCtx.fillRect(-size / 2 + size * 0.1, -w / 2, size * 0.8, t);
        drawCtx.fillRect(-size / 2 + size * 0.1,  w / 2 - t, size * 0.8, t);
    },
    flippingFilter(drawCtx: any, size: any, color: any, options: any = {}) {
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
    landmark(drawCtx: any, size: any, color: any, options: any = {}) {
        const { objectType = 'block', role = 'decorative', isSatisfied = false, themeColors = {} } = options;
        const s = size * 0.42;
        const baseColor = themeColors[LANDMARK_COLOR_KEYS[objectType]] || color;

        drawCtx.globalAlpha = 0.9;
        drawCtx.fillStyle = baseColor;

        if (objectType === 'park') {
            drawCtx.beginPath();
            drawCtx.roundRect(-s, -s, s * 2, s * 2, s * 0.35);
            drawCtx.fill();
            drawCtx.fillStyle = '#86efac'; // theme-exempt: material cue (tree foliage highlight) — the park's themed base color is already set above
            drawCtx.beginPath();
            drawCtx.moveTo(0, -s * 0.65);
            drawCtx.lineTo(-s * 0.5, s * 0.15);
            drawCtx.lineTo(s * 0.5, s * 0.15);
            drawCtx.closePath();
            drawCtx.fill();
            drawCtx.fillStyle = baseColor;
            drawCtx.fillRect(-s * 0.1, s * 0.15, s * 0.2, s * 0.4);
        } else if (objectType === 'fountain') {
            drawCtx.beginPath();
            drawCtx.arc(0, 0, s, 0, Math.PI * 2);
            drawCtx.fill();
            drawCtx.strokeStyle = '#bae6fd'; // theme-exempt: material cue (water highlight) — the fountain's themed base color is already set above
            drawCtx.lineWidth = size * 0.06;
            drawCtx.globalAlpha = 0.8;
            for (let a = 0; a < 4; a++) {
                const ang = a * Math.PI / 2;
                drawCtx.beginPath();
                drawCtx.moveTo(0, 0);
                drawCtx.lineTo(Math.cos(ang) * s * 0.6, Math.sin(ang) * s * 0.6);
                drawCtx.stroke();
            }
        } else if (objectType === 'lamppost') {
            drawCtx.fillRect(-s * 0.12, -s * 0.6, s * 0.24, s * 1.2);
            drawCtx.beginPath();
            drawCtx.arc(0, -s * 0.6, s * 0.28, 0, Math.PI * 2);
            drawCtx.fill();
            drawCtx.fillStyle = '#fef08a'; // theme-exempt: material cue (warm lamp glow) — the lamppost's themed base color is already set above
            drawCtx.globalAlpha = 0.7;
            drawCtx.beginPath();
            drawCtx.arc(0, -s * 0.6, s * 0.16, 0, Math.PI * 2);
            drawCtx.fill();
        } else if (objectType === 'statue') {
            drawCtx.beginPath();
            drawCtx.moveTo(0, -s);
            drawCtx.lineTo(s * 0.75, 0);
            drawCtx.lineTo(0, s);
            drawCtx.lineTo(-s * 0.75, 0);
            drawCtx.closePath();
            drawCtx.fill();
            drawCtx.strokeStyle = '#a1a1aa'; // theme-exempt: material cue (stone outline) — the statue's themed base color is already set above
            drawCtx.lineWidth = size * 0.04;
            drawCtx.globalAlpha = 0.8;
            drawCtx.stroke();
        } else {
            drawCtx.beginPath();
            drawCtx.roundRect(-s, -s, s * 2, s * 2, s * 0.2);
            drawCtx.fill();
            if (objectType === 'library') {
                drawCtx.strokeStyle = '#93c5fd'; // theme-exempt: material cue (shelf highlight) — the library's themed base color is already set above
                drawCtx.lineWidth = size * 0.06;
                drawCtx.globalAlpha = 0.8;
                for (let row = -1; row <= 1; row++) {
                    drawCtx.beginPath();
                    drawCtx.moveTo(-s * 0.55, row * s * 0.28);
                    drawCtx.lineTo(s * 0.55, row * s * 0.28);
                    drawCtx.stroke();
                }
            } else if (objectType === 'market') {
                drawCtx.fillStyle = '#fed7aa'; // theme-exempt: material cue (awning highlight) — the market's themed base color is already set above
                drawCtx.globalAlpha = 0.7;
                drawCtx.beginPath();
                drawCtx.moveTo(0, -s * 0.55);
                drawCtx.lineTo(s * 0.45, 0);
                drawCtx.lineTo(0, s * 0.55);
                drawCtx.lineTo(-s * 0.45, 0);
                drawCtx.closePath();
                drawCtx.fill();
            }
        }

        drawCtx.globalAlpha = 1.0;

        // Role corner badges (impassable landmark roles only): surround keeps its solid ring;
        // adjacentTurn gets a turn-direction glyph, bottom-right. Both get a "satisfied"
        // checkmark, bottom-left, when the current path already satisfies the constraint.
        if (role === 'surround' || role === 'adjacentTurn') {
            if (role === 'surround') {
                const overlayColor = isSatisfied ? (options.check || '#22c55e') : (themeColors.unsatisfied || '#f59e0b'); // theme-exempt: defensive fallback only; the real value is theme.check / theme.colors.unsatisfied
                drawCtx.strokeStyle = overlayColor;
                drawCtx.lineWidth = size * 0.055;
                drawCtx.globalAlpha = 0.8;
                drawCtx.beginPath();
                drawCtx.arc(0, 0, s * 1.18, 0, Math.PI * 2);
                drawCtx.stroke();
                drawCtx.globalAlpha = 1.0;
            } else {
                drawCtx.save();
                drawCtx.translate(s * 0.62, s * 0.62);
                drawTurnGlyph(drawCtx, s * 0.34, options.turnDir || 'either', themeColors.badge || '#334155', themeColors.badgeText || '#ffffff'); // theme-exempt: defensive fallback only; the real value is theme.colors.badge / badgeText
                drawCtx.restore();
            }
            if (isSatisfied) {
                drawCtx.save();
                drawCtx.translate(-s * 0.62, s * 0.62);
                drawSatisfiedCheck(drawCtx, s * 0.34, options.burst || '#ffffff', options.check || '#22c55e'); // theme-exempt: defensive fallback only; the real value is theme.burst / theme.check
                drawCtx.restore();
            }
        }
    },
    mustTurnLandmark(drawCtx: any, size: any, _color: any, options: any = {}) {
        const { dir = 'either', isSatisfied = false, themeColors = {} } = options;
        const s = size * 0.42;

        // Pediment (roof triangle)
        const peakY    = -s * 0.85;
        const roofBase = -s * 0.15;
        const bodyBot  =  s * 0.75;
        const baseColor = themeColors.landmarkLibrary || '#1d4ed8'; // theme-exempt: defensive fallback only; the real value is theme.colors.landmarkLibrary

        drawCtx.fillStyle = baseColor;
        drawCtx.globalAlpha = 0.92;
        drawCtx.beginPath();
        drawCtx.moveTo(0, peakY);
        drawCtx.lineTo(-s, roofBase);
        drawCtx.lineTo(s, roofBase);
        drawCtx.closePath();
        drawCtx.fill();

        // Inner pediment shade
        drawCtx.globalAlpha = 0.45;
        drawCtx.beginPath();
        drawCtx.moveTo(0, peakY + s * 0.18);
        drawCtx.lineTo(-s * 0.65, roofBase);
        drawCtx.lineTo(s * 0.65, roofBase);
        drawCtx.closePath();
        drawCtx.fill();

        // Building body
        drawCtx.fillStyle = baseColor;
        drawCtx.globalAlpha = 0.92;
        drawCtx.fillRect(-s, roofBase, s * 2, bodyBot - roofBase);

        // Steps
        drawCtx.globalAlpha = 0.85;
        drawCtx.fillRect(-s * 1.05, bodyBot, s * 2.1, s * 0.1);
        drawCtx.globalAlpha = 0.65;
        drawCtx.fillRect(-s * 1.15, bodyBot + s * 0.1, s * 2.3, s * 0.12);

        // Columns
        drawCtx.fillStyle = '#ffffff'; // theme-exempt: material cue (column highlight) — the building's themed base color is already set above
        drawCtx.globalAlpha = 0.2;
        for (const cx of [-0.65, -0.22, 0.22, 0.65]) {
            drawCtx.fillRect(cx * s - s * 0.06, roofBase, s * 0.12, bodyBot - roofBase);
        }

        // Turn-direction + satisfied corner badges (bottom-right / bottom-left), matching the
        // same small-badge treatment used on the other landmark objects (draw-assets.landmark).
        // Reset alpha first — the Columns loop above leaves it at 0.2.
        drawCtx.globalAlpha = 1.0;
        drawCtx.save();
        drawCtx.translate(s * 0.62, s * 0.62);
        drawTurnGlyph(drawCtx, s * 0.34, dir, themeColors.badge || '#334155', themeColors.badgeText || '#ffffff'); // theme-exempt: defensive fallback only; the real value is theme.colors.badge / badgeText
        drawCtx.restore();
        if (isSatisfied) {
            drawCtx.save();
            drawCtx.translate(-s * 0.62, s * 0.62);
            drawSatisfiedCheck(drawCtx, s * 0.34, options.burst || '#ffffff', options.check || '#22c55e'); // theme-exempt: defensive fallback only; the real value is theme.burst / theme.check
            drawCtx.restore();
        }
    },
};

// Returns a drawAsset(type, x, y, options) function bound to ctx/screenPosFn/viewport.
export function makeAssetDrawer(ctx: any, screenPosFn: any, viewport: any) {
    return function drawAsset(type: any, x: any, y: any, options: any = {}) {
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

export function drawScorchMark(ctx: any, cx: any, cy: any, s: any) {
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
export function drawMustPassOverflowOverlay(overlay: any, pins: any, themeColors: any, viewport: any, cvs: any, screenPosFn: any, gridW: any, gridH: any) {
    if (!overlay) return false;
    overlay.replaceChildren();
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

    pins.forEach(({ x, y, isHit }: any) => {
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
