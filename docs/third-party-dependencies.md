# Third-party browser dependency policy

Pathfinder is currently deployed as a static browser app and still loads a small
set of third-party assets directly from CDNs in `index.html`. This is acceptable
only as a documented transitional state while the project decides whether to
bundle dependencies or pin CDN assets with SRI and a stricter CSP.

## Currently allowed external origins

- `https://cdn.tailwindcss.com` — Tailwind CDN runtime used by the static page.
- `https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js` — Tone.js audio.
- `https://www.gstatic.com/firebasejs/11.6.1/` — Firebase compat SDK modules.
- `https://fonts.googleapis.com` and `https://fonts.gstatic.com` — Google Fonts.

## Policy

- Add new external browser origins only with a PR explaining why the dependency
  cannot be bundled or self-hosted.
- Prefer pinned versions over floating URLs.
- Prefer bundling or SRI-pinned assets before tightening CSP.
- Keep `scripts/check-third-party-dependencies.mjs` updated when the allowlist is
  intentionally changed.
