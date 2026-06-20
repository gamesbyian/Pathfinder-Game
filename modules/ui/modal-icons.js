// Shared modal-control icons. Every `.modal-close-btn` carried an identical inline close-X
// SVG; centralizing it here removes that duplication. The icon is built and appended to each
// empty close button at boot via DOM construction (no innerHTML — passes check:raw-inner-html).
// Per-button size is preserved via the optional data-icon-size attribute (default 24).

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildCloseIcon(doc, size) {
    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const use = doc.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#def-close');
    svg.appendChild(use);
    return svg;
}

/**
 * Append the close-X icon to every `.modal-close-btn` that doesn't already have one.
 * Idempotent; safe to call at boot before the modals are shown.
 * @param {Document} [doc=document]
 */
export function injectModalCloseIcons(doc = (typeof document === 'undefined' ? null : document)) {
    if (!doc?.querySelectorAll) return;
    for (const btn of doc.querySelectorAll('.modal-close-btn')) {
        if (btn.querySelector('svg')) continue;
        const size = Number(btn.dataset.iconSize) || 24;
        btn.appendChild(buildCloseIcon(doc, size));
    }
}
