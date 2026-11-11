# Tasks

## 1. Persist Link Activity

- [ ] 1.1 Change stored links to include destination and last activity timestamp, initialize timestamps on creation, and preserve loading of legacy string records; verify with store tests covering create, reload, and legacy data.
- [ ] 1.2 Persist timestamp refreshes through the store's serialized write path and keep in-memory state consistent on failures; verify with store tests for refresh persistence and failed writes.

## 2. Enforce Inactivity Expiration

- [ ] 2.1 Add UTC calendar-day expiration checks that keep links active through the end of the 90th day and reject them afterward without refreshing their timestamps; verify with boundary-focused server tests.
- [ ] 2.2 Refresh activity for each active-link request before redirecting, return 404 for expired links, and prevent redirect caching while preserving HTTP 301; verify with server tests for refresh, expiration, status, location, and cache headers.
- [ ] 2.3 Update README behavior documentation to describe the inactivity window, UTC cutoff, visit-based refresh, and 404 response; verify the docs match the implemented behavior.

## 3. Integration Verification

- [ ] 3.1 Run the full `npm test` suite and resolve regressions in link creation, persistence across restarts, and redirects.
