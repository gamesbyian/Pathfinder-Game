export function renderLevelRatingPane(draft = {}) {
    const tags = draft.tags instanceof Set ? draft.tags : new Set(draft.tags || []);
    document.querySelectorAll('#levelRatingPane .rating-tag-btn[data-tag]').forEach(btn => {
        btn.classList.toggle('selected', tags.has(btn.dataset.tag));
    });
    ['difficulty', 'fun'].forEach(scale => {
        const value = draft[scale] || 0;
        document.querySelectorAll(`#levelRatingPane .rating-scale-buttons[data-scale="${scale}"] button[data-value]`).forEach(btn => {
            btn.classList.toggle('selected', Number(btn.dataset.value) === value);
        });
    });
    const list = document.getElementById('levelRatingCustomTagList');
    if (list) {
        const chips = (draft.customTags || []).map(tag => {
            const chip = document.createElement('span');
            chip.className = 'rating-custom-tag-chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 type-2xs font-bold';
            chip.dataset.tag = tag;
            const label = document.createElement('span');
            label.textContent = tag;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'rating-custom-tag-remove-btn leading-none';
            removeBtn.textContent = '×';
            removeBtn.dataset.tag = tag;
            chip.append(label, removeBtn);
            return chip;
        });
        list.replaceChildren(...chips);
    }
}
