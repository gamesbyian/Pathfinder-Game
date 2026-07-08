// Pure path drawing — no APP references.
// screenPosFn: (gridX, gridY) => { sx, sy }
// cellW is used to compute pixel-space jump-travel for rainbow coloring.

import { UNPACK } from '../domain/cell-key.js';

// strokeStyle is unused when isCaution is true (cautionColor/cautionOutline drive the stroke
// instead), so callers in that mode may pass undefined.
export function drawPath(ctx: any, pathArr: number[], isJumpSet: Set<number>, strokeStyle: string | undefined, width: number, isCaution: boolean, screenPosFn: (x: number, y: number) => { sx: number, sy: number }, cellW: number, cautionColor = '#fbbf24', cautionOutline = '#000000') { // theme-exempt: defensive defaults mirroring theme-normalizer's own t.caution fallback; callers always pass the real theme value
    if (!pathArr.length) return;
    ctx.save();
    ctx.lineWidth  = width;
    ctx.lineCap    = isCaution ? 'butt' : 'round';
    ctx.lineJoin   = 'round';

    const drawDot = (sx: number, sy: number, color: string | undefined) => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(sx, sy, width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    const getCautionSegmentEndpoints = () => {
        const indices = [0];
        for (let i = 1; i < pathArr.length; i++) {
            if (isJumpSet.has(i)) indices.push(i - 1, i);
        }
        indices.push(pathArr.length - 1);
        return [...new Set(indices)].map(idx => {
            const p = UNPACK(pathArr[idx]);
            return screenPosFn(p.x, p.y);
        });
    };

    if (pathArr.length === 1 && !isCaution) {
        const start = UNPACK(pathArr[0]);
        const sStart = screenPosFn(start.x, start.y);
        drawDot(sStart.sx, sStart.sy, strokeStyle === 'rainbow' ? '#ff0000' : strokeStyle); // theme-exempt: first color of the intentional multi-color "rainbow" path style (classic theme)
        ctx.restore();
        return;
    }

    if (isCaution) {
        const trace = () => {
            const start  = UNPACK(pathArr[0]);
            const sStart = screenPosFn(start.x, start.y);
            ctx.beginPath();
            ctx.moveTo(sStart.sx, sStart.sy);
            ctx.lineTo(sStart.sx, sStart.sy);
            for (let i = 1; i < pathArr.length; i++) {
                const p = UNPACK(pathArr[i]);
                const s = screenPosFn(p.x, p.y);
                if (isJumpSet.has(i)) { ctx.moveTo(s.sx, s.sy); ctx.lineTo(s.sx, s.sy); }
                else                  { ctx.lineTo(s.sx, s.sy); }
            }
        };
        ctx.strokeStyle = cautionColor;
        trace();
        ctx.stroke();
        ctx.strokeStyle = cautionOutline;
        ctx.setLineDash([width, width]);
        trace();
        ctx.stroke();
        ctx.setLineDash([]);
        getCautionSegmentEndpoints().forEach(({ sx, sy }) => drawDot(sx, sy, cautionColor));

    } else if (strokeStyle === 'rainbow') {
        const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3']; // theme-exempt: the intentional multi-color "rainbow" path style, selected by theme.path === 'rainbow' (classic theme)
        let totalLength = 0;
        const segments = [];
        for (let i = 1; i < pathArr.length; i++) {
            if (isJumpSet.has(i)) continue;
            const p1 = UNPACK(pathArr[i - 1]);
            const p2 = UNPACK(pathArr[i]);
            const s1 = screenPosFn(p1.x, p1.y);
            const s2 = screenPosFn(p2.x, p2.y);
            const len = Math.hypot(s2.sx - s1.sx, s2.sy - s1.sy);
            segments.push({ s1, s2, len });
            totalLength += len;
        }

        const start  = UNPACK(pathArr[0]);
        const sStart = screenPosFn(start.x, start.y);
        drawDot(sStart.sx, sStart.sy, colors[0]);

        let curTravel = 0;
        segments.forEach(seg => {
            const t          = (curTravel + seg.len / 2) / Math.max(totalLength, 1);
            const colorIndex = Math.floor(t * colors.length) % colors.length;
            ctx.strokeStyle  = colors[colorIndex];
            ctx.beginPath();
            ctx.moveTo(seg.s1.sx, seg.s1.sy);
            ctx.lineTo(seg.s2.sx, seg.s2.sy);
            ctx.stroke();
            curTravel += seg.len;
        });

        let jumpTravel = 0;
        for (let i = 1; i < pathArr.length; i++) {
            if (isJumpSet.has(i)) {
                const p          = UNPACK(pathArr[i]);
                const s          = screenPosFn(p.x, p.y);
                const t          = jumpTravel / Math.max(totalLength, 1);
                const colorIndex = Math.floor(t * colors.length) % colors.length;
                drawDot(s.sx, s.sy, colors[colorIndex]);
            } else {
                const p1 = UNPACK(pathArr[i - 1]);
                const p2 = UNPACK(pathArr[i]);
                jumpTravel += Math.hypot(p2.x - p1.x, p2.y - p1.y) * cellW;
            }
        }

    } else {
        ctx.strokeStyle = strokeStyle;
        const trace = () => {
            const start  = UNPACK(pathArr[0]);
            const sStart = screenPosFn(start.x, start.y);
            ctx.beginPath();
            ctx.moveTo(sStart.sx, sStart.sy);
            ctx.lineTo(sStart.sx, sStart.sy);
            for (let i = 1; i < pathArr.length; i++) {
                const p = UNPACK(pathArr[i]);
                const s = screenPosFn(p.x, p.y);
                if (isJumpSet.has(i)) { ctx.moveTo(s.sx, s.sy); ctx.lineTo(s.sx, s.sy); }
                else                  { ctx.lineTo(s.sx, s.sy); }
            }
        };
        trace();
        ctx.stroke();
    }

    ctx.restore();
}
