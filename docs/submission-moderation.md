# Level Submission + Moderation

## Submission payload contract (`POST /api/submit_level.php`)
JSON object:
- `submitterName` (optional string, max 120)
- `submitterEmail` (optional valid email)
- `notes` (optional string, max 2000)
- `level` (required object in canonical editor format)
  - includes `grid`, `gates`, `goal`, `reqLen`, `reqInt`, object sets, and `hints`
  - hints are deduplicated + validated client-side and capped to 5

Response:
- `{ ok, submissionId, createdAt, emailNotified }`

## Moderation workflow
- Open `review_submissions.html` (redirects to `index.html?review=1`).
- Pending submissions load from `GET /api/review_submissions.php`.
- Use editor tools normally to modify the level state in review mode.
- Buttons:
  - **Add Hint**: rebuilds hint list from currently valid hints/session path.
  - **Approve**: `POST /api/review_submissions.php` with `action=approve` and current edited level.
  - **Reject**: `POST /api/review_submissions.php` with `action=reject`.

## Storage
- SQLite DB at `data/submissions.sqlite`
- `submissions` table stores submission metadata, payload, status, review action metadata.
- Pending queue = rows where `status='pending'`.

## Approval to `levels.js`
- Approval appends as the next sequential level number comment (`/* N */`) at end of `window.RAW_LEVELS`.
- File lock (`flock`) is used while appending to guard concurrent approvals.

## Email configuration
- `PATHFINDER_MAIL_MODE` (`mail` currently supported)
- `PATHFINDER_MAIL_FROM` (from header)
- `PATHFINDER_SUBMISSION_ALERT_TO` (defaults to `ian.wallace@shaw.ca`)

## Operational notes
- Origin host check rejects cross-origin requests.
- JSON-only content type for write endpoints.
- Payload size limit and SQLite-backed rate limiting are enabled.
