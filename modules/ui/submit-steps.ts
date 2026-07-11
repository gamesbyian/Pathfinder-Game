// Submit-modal progress steps. The 4 submission steps (icon + label + detail) follow one
// repetitive markup pattern, so they're described as data here and rendered into the submit
// modal's #submitStepList at boot via DOM construction (no innerHTML — passes
// check:raw-inner-html). Mirrors the editor-palette / guide-cards boot-builder pattern.
//
// SUBMIT_STEP_IDS is the single source of truth for the step order/ids — modules/ui.js imports
// it for resetSubmitModal() so the id list isn't duplicated. Rendered output is byte-faithful to
// the previous static markup (submitModal is a visual-regression baseline — see visual.spec.mjs).

export const SUBMIT_STEPS = [
    { id: 'smStep-validate',  label: 'Validate structure' },
    { id: 'smStep-duplicate', label: 'Check duplicates' },
    { id: 'smStep-solve',     label: 'Find solutions' },
    { id: 'smStep-save',      label: 'Save to server' },
];

export const SUBMIT_STEP_IDS = SUBMIT_STEPS.map((step: any) => step.id);

function buildSubmitStep(doc: any, step: any) {
    const li = doc.createElement('li');
    li.id = step.id;
    li.className = 'submit-step';

    const icon = doc.createElement('div');
    icon.className = 'sm-icon';
    icon.textContent = '○';

    const body = doc.createElement('div');
    body.className = 'submit-step-body';
    const label = doc.createElement('p');
    label.className = 'sm-label';
    label.textContent = step.label;
    const countdown = doc.createElement('span');
    countdown.className = 'sm-countdown hidden';
    label.appendChild(countdown);
    const detail = doc.createElement('div');
    detail.className = 'sm-detail';
    body.appendChild(label);
    body.appendChild(detail);

    li.appendChild(icon);
    li.appendChild(body);
    return li;
}

/**
 * Render the submission progress steps into the submit modal's `#submitStepList`. Idempotent.
 * @param {Document} [doc=document]
 */
export function renderSubmitSteps(doc = (typeof document === 'undefined' ? null : document)) {
    const list = doc?.getElementById?.('submitStepList');
    if (!list || list.childElementCount > 0) return;
    for (const step of SUBMIT_STEPS) list.appendChild(buildSubmitStep(doc, step));
}
