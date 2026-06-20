// Editor object-palette items. The 12 placeable-object tools follow one repetitive markup
// pattern, so they're described as data here and rendered into the (#editorPalette)
// .palette-grid at boot via DOM construction (no innerHTML — passes check:raw-inner-html).
// The surrounding palette structure and the line/grid tool buttons stay in index.html.

const SVG_NS = 'http://www.w3.org/2000/svg';

// type:  the data-type the editor toolbar binds on (editor.handlePaletteToolPointerDown).
// group: present on expandable tools (data-group → variant popup); also adds the chevron
//        and the .palette-group-icon class (colored by object identity, not active theme).
// color: optional CSS custom property applied as the svg's `color` (drives currentColor).
// def:   the #def-* sprite symbol id referenced by <use>.
export const EDITOR_PALETTE_TOOLS = [
    { type: 'gate',      label: 'Gate',        color: '--theme-gate',   def: 'def-gate' },
    { type: 'goal',      label: 'Goal',        color: '--theme-goal',   def: 'def-goal' },
    { type: 'falseGoal', label: 'Bomb',                                 def: 'def-falsegoal' },
    { type: 'block',     label: 'Block',       color: '--theme-block',  def: 'def-block' },
    { type: 'mustCross', label: 'Must Cross',  color: '--theme-cross',  def: 'def-mustcross' },
    { type: 'goose',     label: 'Goose',                                def: 'def-goose' },
    { type: 'portal',    label: 'Portal',      color: '--theme-portal', def: 'def-portal' },
    { type: 'mustPass',  label: 'Visit / Turn', group: 'visit',    color: '--theme-pin',    def: 'def-mustpass' },
    { type: 'filterH',   label: 'Filter',       group: 'filter',   color: '--theme-filter', def: 'def-filterH' },
    { type: 'flipH',     label: 'Flip Filter',  group: 'flip',     color: '--theme-filter', def: 'def-flipH' },
    { type: 'park',      label: 'Surround',     group: 'surround', color: '--theme-pin',    def: 'def-park' },
    { type: 'fountain',  label: 'Adj. Turn',    group: 'adjTurn',  color: '--theme-portal', def: 'def-fountain' },
];

function buildPaletteItem(doc, tool) {
    const item = doc.createElement('div');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', tool.label);
    item.className = tool.group ? 'palette-item palette-expandable' : 'palette-item';
    item.dataset.type = tool.type;
    if (tool.group) item.dataset.group = tool.group;
    item.title = tool.label;

    const svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    if (tool.color) svg.style.color = `var(${tool.color})`;

    const use = doc.createElementNS(SVG_NS, 'use');
    if (tool.group) use.setAttribute('class', 'palette-group-icon');
    use.setAttribute('href', `#${tool.def}`);
    svg.appendChild(use);
    item.appendChild(svg);

    if (tool.group) {
        const chevron = doc.createElement('span');
        chevron.className = 'expand-chevron';
        chevron.textContent = '▾';
        item.appendChild(chevron);
    }
    return item;
}

/**
 * Render the object-palette tools into `#editorPalette .palette-grid`. Idempotent and safe
 * to call before first paint (must run before editor-toolbar-controller binds the items).
 * @param {Document} [doc=document]
 */
export function renderEditorPaletteItems(doc = (typeof document === 'undefined' ? null : document)) {
    const grid = doc?.querySelector?.('#editorPalette .palette-grid');
    if (!grid || grid.childElementCount > 0) return;
    for (const tool of EDITOR_PALETTE_TOOLS) grid.appendChild(buildPaletteItem(doc, tool));
}
