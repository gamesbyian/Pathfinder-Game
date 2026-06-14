# Firestore Security Model Notes

This document records the current Firestore authorization assumptions so future rule changes have a written product/security reference before they are implemented.

## Current access model

- Admin access is limited to an authenticated user whose token email matches the current admin email in `firestore.rules`.
- Per-user progress/session data under `/artifacts/{appId}/users/{uid}/data/{doc}` is readable and writable only by that authenticated `uid`.
- Pending submissions can be created only by an authenticated user whose `submittedBy` field matches `request.auth.uid`.
- Pending submissions are readable by any authenticated user for duplicate detection; updates are disabled; deletes are admin-only.
- Published levels are public-read and admin-write.

## Known risks and follow-ups

- The hard-coded admin email is intentionally characterized by tests, but it should eventually move to custom claims or a managed allowlist.
- Authenticated broad reads of pending submissions should be reviewed against a product threat model before adding richer submission metadata.
- The current tests are fast source-level characterization tests. If Firebase emulator tooling is added, keep equivalent behavioral assertions for the same access model.
