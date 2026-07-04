// Icon sprite sheet: the SVG <defs> symbol definitions referenced by <use href="#def-*">
// throughout index.html. Extracted from inline index.html markup so the document is shell +
// landmarks only; injected into the DOM at boot by injectSvgDefs() before first paint.
//
// These symbols are static, trusted markup (no user/server data). Injection uses DOMParser
// node construction rather than innerHTML, so it passes check:raw-inner-html.

export const SVG_DEFS_MARKUP = `<svg xmlns="http://www.w3.org/2000/svg" id="iconSpriteSheet" style="display:none" aria-hidden="true">
    <defs>
        <g id="def-gate"><g transform="rotate(-45 50 50)" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M25 30 L50 55 L25 80" /><path d="M55 30 L80 55 L55 80" /></g></g>
        <g id="def-nav-next" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M25 20 L55 50 L25 80"/><path d="M52 20 L82 50 L52 80"/></g>
        <g id="def-nav-prev" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M75 20 L45 50 L75 80"/><path d="M48 20 L18 50 L48 80"/></g>
        <g id="def-goal"><circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" stroke-width="10" /><circle cx="50" cy="50" r="14" fill="currentColor" /></g>
        <g id="def-falsegoal"><circle cx="50" cy="60" r="25" fill="#334155"/><path d="M 50 35 Q 60 20 75 15" fill="none" stroke="#94a3b8" stroke-width="4"/><circle cx="75" cy="15" r="5" fill="#ef4444"/><circle cx="75" cy="15" r="2.5" fill="#fde047"/><path d="M 45 35 L 55 35 L 55 45 L 45 45 Z" fill="#64748b"/></g>
        <g id="def-block"><rect x="5" y="5" width="90" height="90" rx="20" fill="currentColor" /><g fill="var(--theme-block-dot)"><circle cx="25" cy="25" r="5" /><circle cx="50" cy="25" r="5" /><circle cx="75" cy="25" r="5" /><circle cx="25" cy="50" r="5" /><circle cx="50" cy="50" r="5" /><circle cx="75" cy="50" r="5" /><circle cx="25" cy="75" r="5" /><circle cx="50" cy="75" r="5" /><circle cx="75" cy="75" r="5" /></g></g>
        <g id="def-mustcross"><g stroke="currentColor" stroke-width="8" opacity="0.4" fill="none"><path d="M15 35 L35 35 L35 15" /><path d="M85 35 L65 35 L65 15" /><path d="M15 65 L35 65 L35 85" /><path d="M85 65 L65 65 L65 85" /></g></g>
        <g id="def-goose"><path d="M30 0 L70 0 L100 30 L100 70 L70 100 L30 100 L0 70 L0 30" fill="#000" /><path d="M25 60 Q25 45 45 45 L65 45 Q75 45 75 55 Q75 65 65 65 L40 65 Q25 65 25 60" fill="#fff" /><path d="M25 55 L15 45 L30 55 Z" fill="#fff" /><path d="M60 45 L60 25 Q60 18 68 18 Q75 18 75 25 L75 35 L68 35 L68 35 L68 45 Z" fill="#fff" /><circle cx="70" cy="23" r="2" fill="#000" /><path d="M75 29 L88 32 L75 35 Z" fill="#f97316" /><path d="M45 65 L40 78 L52 78 Z M58 65 L53 78 L65 78 Z" fill="#f97316" /></g>
        <g id="def-portal"><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="10" stroke-dasharray="10, 8" /><circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.15" /></g>
        <g id="def-mustpass"><g transform="translate(50, 75) rotate(-15) scale(2.4)"><path d="M-1 0 L1 0 L1.5 -12 L-1.5 -12 Z" fill="#94a3b8" /><circle cx="0" cy="-18" r="7" fill="currentColor" /></g></g>
        <g id="def-filterH"><rect x="10" y="25" width="80" height="15" fill="currentColor" opacity="0.3" /><rect x="10" y="60" width="80" height="15" fill="currentColor" opacity="0.3" /></g>
        <g id="def-filterV"><rect x="25" y="10" width="15" height="80" fill="currentColor" opacity="0.3" /><rect x="60" y="10" width="15" height="80" fill="currentColor" opacity="0.3" /></g>
        <g id="def-flipH"><use href="#def-filterH"/><text x="50" y="55" font-size="45" font-weight="900" font-family="sans-serif" text-anchor="middle" fill="currentColor">↺</text></g>
        <g id="def-flipV"><use href="#def-filterV"/><text x="50" y="55" font-size="45" font-weight="900" font-family="sans-serif" text-anchor="middle" fill="currentColor">↺</text></g>
        <g id="def-mustturn"><polygon points="7,42 50,10 93,42" fill="currentColor"/><polygon points="22,42 50,24 78,42" fill="currentColor" opacity="0.55"/><rect x="11" y="42" width="78" height="39" fill="currentColor"/><rect x="7" y="81" width="86" height="5" rx="1" fill="currentColor" opacity="0.85"/><rect x="3" y="86" width="94" height="7" rx="1" fill="currentColor" opacity="0.65"/><rect x="17" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="37" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="57" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="77" y="44" width="6" height="37" fill="white" opacity="0.2"/><path d="M18,62 L30,49 L30,57 L70,57 L70,49 L82,62 L70,75 L70,67 L30,67 L30,75 Z" fill="white" opacity="0.92"/></g>
        <g id="def-mustturnccw"><polygon points="7,42 50,10 93,42" fill="currentColor"/><polygon points="22,42 50,24 78,42" fill="currentColor" opacity="0.55"/><rect x="11" y="42" width="78" height="39" fill="currentColor"/><rect x="7" y="81" width="86" height="5" rx="1" fill="currentColor" opacity="0.85"/><rect x="3" y="86" width="94" height="7" rx="1" fill="currentColor" opacity="0.65"/><rect x="17" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="37" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="57" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="77" y="44" width="6" height="37" fill="white" opacity="0.2"/><path d="M18,62 L32,49 L32,57 L82,57 L82,67 L32,67 L32,75 Z" fill="white" opacity="0.92"/></g>
        <g id="def-mustturncw"><polygon points="7,42 50,10 93,42" fill="currentColor"/><polygon points="22,42 50,24 78,42" fill="currentColor" opacity="0.55"/><rect x="11" y="42" width="78" height="39" fill="currentColor"/><rect x="7" y="81" width="86" height="5" rx="1" fill="currentColor" opacity="0.85"/><rect x="3" y="86" width="94" height="7" rx="1" fill="currentColor" opacity="0.65"/><rect x="17" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="37" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="57" y="44" width="6" height="37" fill="white" opacity="0.2"/><rect x="77" y="44" width="6" height="37" fill="white" opacity="0.2"/><path d="M82,62 L68,49 L68,57 L18,57 L18,67 L68,67 L68,75 Z" fill="white" opacity="0.92"/></g>
        <g id="def-park"><rect x="20" y="56" width="60" height="32" rx="6" fill="currentColor"/><polygon points="50,16 26,58 74,58" fill="currentColor"/><polygon points="50,30 36,58 64,58" fill="currentColor" opacity="0.45"/><rect x="45" y="58" width="10" height="22" fill="white" opacity="0.25"/></g>
        <g id="def-market"><rect x="14" y="42" width="72" height="46" rx="6" fill="currentColor"/><polygon points="50,14 88,42 12,42" fill="currentColor" opacity="0.55"/><polygon points="50,48 66,62 50,76 34,62" fill="white" opacity="0.3"/></g>
        <g id="def-fountain"><circle cx="50" cy="56" r="32" fill="currentColor"/><circle cx="50" cy="56" r="32" fill="none" stroke="white" stroke-width="3" opacity="0.3"/><g stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.7"><line x1="50" y1="56" x2="50" y2="26"/><line x1="50" y1="56" x2="80" y2="56"/><line x1="50" y1="56" x2="50" y2="86"/><line x1="50" y1="56" x2="20" y2="56"/></g><circle cx="50" cy="56" r="9" fill="white" opacity="0.35"/></g>
        <g id="def-lamppost"><rect x="44" y="38" width="12" height="48" fill="currentColor"/><rect x="20" y="84" width="60" height="8" rx="3" fill="currentColor" opacity="0.6"/><circle cx="50" cy="26" r="17" fill="currentColor"/><circle cx="50" cy="26" r="9" fill="white" opacity="0.45"/></g>
        <g id="def-close"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></g>
        <g id="def-completion">
            <path d="M88.558,49.96c0-0.885-0.435-1.663-1.097-2.151l0.014-0.024l-9.324-5.383l5.367-9.296l-0.018-0.011c0.328-0.752,0.315-1.643-0.127-2.408c-0.443-0.766-1.208-1.223-2.025-1.314v-0.026H70.58V18.61h-0.022c-0.092-0.816-0.549-1.58-1.314-2.022c-0.767-0.443-1.658-0.456-2.412-0.125l-0.013-0.023l-9.481,5.474l-5.25-9.094l-0.019,0.011c-0.488-0.66-1.265-1.094-2.149-1.094c-0.885,0-1.664,0.435-2.151,1.097l-0.024-0.014l-5.337,9.244l-9.19-5.306l-0.011,0.019c-0.753-0.328-1.643-0.315-2.408,0.127c-0.767,0.442-1.223,1.208-1.315,2.025h-0.027v10.674H18.845v0.021c-0.816,0.092-1.58,0.549-2.022,1.314c-0.442,0.766-0.455,1.657-0.126,2.41l-0.023,0.014l5.246,9.087l-9.394,5.424l0.011,0.019c-0.66,0.488-1.094,1.265-1.094,2.149c0,0.885,0.435,1.664,1.097,2.151l-0.014,0.024l9.324,5.383l-5.367,9.296l0.019,0.011c-0.328,0.753-0.315,1.643,0.127,2.408c0.443,0.766,1.208,1.223,2.025,1.314v0.027H29.42V81.39h0.022c0.092,0.816,0.549,1.58,1.314,2.022c0.767,0.443,1.658,0.455,2.412,0.125l0.013,0.023l9.481-5.474l5.25,9.094l0.019-0.011c0.488,0.66,1.265,1.094,2.149,1.094c0.885,0,1.664-0.435,2.151-1.096l0.023,0.013l5.337-9.244l9.191,5.306l0.011-0.019c0.753,0.328,1.643,0.315,2.408-0.127c0.767-0.442,1.223-1.208,1.315-2.025h0.027V70.398h10.613v-0.021c0.816-0.092,1.58-0.549,2.022-1.314c0.442-0.766,0.455-1.658,0.126-2.411l0.023-0.013l-5.246-9.087l9.394-5.424l-0.011-0.019C88.124,51.622,88.558,50.844,88.558,49.96z" fill="var(--theme-burst)"/>
            <path d="M35 48 L45 58 L65 38" fill="none" stroke="var(--theme-check)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
    </defs>
</svg>`;

/**
 * Inject the icon sprite sheet into the document (idempotent). Safe to call before the
 * static <use href="#def-*"> elements render — SVG <use> is a live reference and resolves
 * once its target symbol is present in the document.
 * @param {Document} [doc=document]
 * @returns {?SVGElement} the injected sprite <svg>, or null if unavailable/already present.
 */
export function injectSvgDefs(doc = (typeof document === 'undefined' ? null : document)) {
    if (!doc || !doc.body) return null;
    if (doc.getElementById('iconSpriteSheet')) return doc.getElementById('iconSpriteSheet');
    const parsed = new DOMParser().parseFromString(SVG_DEFS_MARKUP, 'image/svg+xml');
    const node = doc.importNode(parsed.documentElement, true);
    doc.body.insertBefore(node, doc.body.firstChild);
    return node;
}
