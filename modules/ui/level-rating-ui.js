import { addClasses, removeClasses } from './dom.js';

const SELECTED_TAG_CLASSES     = ['bg-indigo-600', 'text-white'];
const UNSELECTED_TAG_CLASSES   = ['bg-slate-200', 'text-slate-600'];
const SELECTED_SCALE_CLASSES   = ['bg-emerald-600', 'text-white'];
const UNSELECTED_SCALE_CLASSES = ['bg-slate-200', 'text-slate-600'];

export function renderLevelRatingPane(draft = {}) {
    const tags = draft.tags instanceof Set ? draft.tags : new Set(draft.tags || []);
    document.querySelectorAll('#levelRatingPane .rating-tag-btn[data-tag]').forEach(btn => {
        const selected = tags.has(btn.dataset.tag);
        removeClasses(btn, selected ? UNSELECTED_TAG_CLASSES : SELECTED_TAG_CLASSES);
        addClasses(btn, selected ? SELECTED_TAG_CLASSES : UNSELECTED_TAG_CLASSES);
    });
    ['difficulty', 'fun'].forEach(scale => {
        const value = draft[scale] || 0;
        document.querySelectorAll(`#levelRatingPane .rating-scale-buttons[data-scale="${scale}"] button[data-value]`).forEach(btn => {
            const selected = Number(btn.dataset.value) === value;
            removeClasses(btn, selected ? UNSELECTED_SCALE_CLASSES : SELECTED_SCALE_CLASSES);
            addClasses(btn, selected ? SELECTED_SCALE_CLASSES : UNSELECTED_SCALE_CLASSES);
        });
    });
    const list = document.getElementById('levelRatingCustomTagList');
    if (list) {
        const chips = (draft.customTags || []).map(tag => {
            const chip = document.createElement('span');
            chip.className = 'rating-custom-tag-chip inline-flex items-center gap-1 bg-slate-200 text-slate-700 rounded-full px-2.5 py-1 text-[0.65rem] font-bold';
            chip.dataset.tag = tag;
            const label = document.createElement('span');
            label.textContent = tag;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'rating-custom-tag-remove-btn leading-none text-slate-500 hover:text-red-500';
            removeBtn.textContent = '×';
            removeBtn.dataset.tag = tag;
            chip.append(label, removeBtn);
            return chip;
        });
        list.replaceChildren(...chips);
    }
}
