// Guide-modal object cards. The 8 "how to play" object cards (icon + title + description) follow
// one repetitive markup pattern, so they're described as data here and rendered into the guide
// modal's #guideObjectGrid at boot via DOM construction (no innerHTML — passes
// check:raw-inner-html). Mirrors the editor-palette / modal-icons boot-builder pattern.
//
// The surrounding guide-modal structure (header, footer credit) stays in index.html. Rendered
// output is kept byte-faithful to the previous static markup (guideModal is a visual-regression
// baseline — see tests/visual.spec.mjs).

const SVG_NS = 'http://www.w3.org/2000/svg';

// title:     card heading (.card-header).
// def:       the #def-* sprite symbol id referenced by <use>.
// desc:      card body text (.card-description).
// color:     optional CSS custom property applied as the svg's `color` (drives currentColor).
// iconClass: svg class (default 'fill'); one card uses a drop-shadow variant.
// iconId:    optional id on the .card-icon container (preserved for markup fidelity).
export const GUIDE_CARDS = [
    { title: 'Gate',       def: 'def-gate',      color: '--theme-gate',
      desc: "Start point. In Edit Mode, a red cross-out marks gates with the wrong checkerboard parity to reach the true goal in the required length. Only one gate can be used at a time; Reset or Undo to try another start." },
    { title: 'Goal',       def: 'def-goal',      color: '--theme-goal',
      desc: 'Destination. Some goals may be decoys. There is only one true goal per level.' },
    { title: 'Block',      def: 'def-block',     color: '--theme-block',
      desc: 'Obstacle.' },
    { title: 'Visit Here', def: 'def-mustpass',  color: '--theme-pin', iconClass: 'w-full h-full drop-shadow-sm',
      desc: 'Your line must visit this square.' },
    { title: 'Filter',     def: 'def-filterH',   color: '--theme-filter',
      desc: 'One-way street. Some filters may flip when others are used.' },
    { title: 'Portal',     def: 'def-portal',    color: '--theme-portal',
      desc: 'Teleport your line to the identical portal. In Edit Mode, portal terminals can also get the red cross-out when their checkerboard parity cannot lead to the true goal in the required length; these parity warnings are hidden if any portal pair has matching-parity terminals.' },
    { title: 'Cross',      def: 'def-mustcross', color: '--theme-cross',
      desc: 'Create an intersection inside this square.' },
    { title: 'Goose',      def: 'def-goose',     iconId: 'legendGooseContainer',
      desc: 'Danger!' },
];

function buildGuideCard(doc: any, card: any) {
    const root = doc.createElement('div');
    root.className = 'card card-centered';

    const iconBox = doc.createElement('div');
    iconBox.className = 'card-icon';
    if (card.iconId) iconBox.id = card.iconId;

    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', card.iconClass || 'fill');
    if (card.color) svg.style.color = `var(${card.color})`;
    const use = doc.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${card.def}`);
    svg.appendChild(use);
    iconBox.appendChild(svg);

    const text = doc.createElement('div');
    text.className = 'card-text';
    const header = doc.createElement('span');
    header.className = 'card-header';
    header.textContent = card.title;
    const desc = doc.createElement('p');
    desc.className = 'card-description';
    desc.textContent = card.desc;
    text.appendChild(header);
    text.appendChild(desc);

    root.appendChild(iconBox);
    root.appendChild(text);
    return root;
}

/**
 * Render the guide object cards into the guide modal's `#guideObjectGrid`. Idempotent.
 * @param {Document} [doc=document]
 */
export function renderGuideCards(doc = (typeof document === 'undefined' ? null : document)) {
    const grid = doc?.getElementById?.('guideObjectGrid');
    if (!grid || grid.childElementCount > 0) return;
    for (const card of GUIDE_CARDS) grid.appendChild(buildGuideCard(doc, card));
}
