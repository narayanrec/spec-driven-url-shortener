# Proposal

## Why

Short links currently remain usable indefinitely, even when nobody visits them. Expiring inactive links limits stale mappings while allowing links that continue to receive visits to stay active.

## What Changes

- Track the last activity time for each short link, initialize it when the link is created, and refresh it when an active link is visited.
- Make a link unavailable after the end of its 90th UTC calendar day without a visit, returning HTTP 404.
- Allow physical deletion of expired link records to happen later; they must stop redirecting at the expiration cutoff.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `url-shortening`: Define inactivity tracking and expiration behavior for short-link visits.

## Impact

- Update the persistent link store to retain last activity timestamps and persist refreshed activity.
- Update short-link resolution to enforce expiration and return 404 for expired or deleted links.
- Existing stored links need a compatible initial activity timestamp when loaded; use the migration approach documented in the design.
- No new dependencies or API endpoints are required.
