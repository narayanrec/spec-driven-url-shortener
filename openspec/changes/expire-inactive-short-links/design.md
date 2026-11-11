# Design

## Context

See proposal.md for motivation and specs/url-shortening/spec.md for the behavior contract. The JSON store currently maps each code directly to a destination URL. Redirects are HTTP 301 responses with a one-day public cache lifetime, so a browser can follow a cached redirect without contacting the server.

## Goals / Non-Goals

**Goals:**
- Persist last activity timestamps and enforce expiration across restarts.
- Ensure repeat visits reach the service so they can refresh activity.
- Continue to load links stored in the current string-value format.

**Non-Goals:**
- Add a background cleanup service. Expired records may remain on disk; resolution must reject them based on their timestamp.
- Change the short-link creation interfaces or the permanent redirect status.

## Decisions

- Store each link as an object containing its destination and `lastAccessedAt` UTC timestamp. Initialize the timestamp at creation and update it on every request that resolves to an active link.
- Define the cutoff as the end of the UTC calendar date 90 days after the last activity date. A request after that cutoff returns 404 and does not refresh activity. Use UTC date arithmetic, not the host's local timezone.
- On loading legacy entries whose values are destination strings, convert them in memory to records with `lastAccessedAt` set to the current UTC time, then persist the new format on the next store write. This preserves existing links for a full inactivity window after the upgrade because their historical activity times are unavailable.
- Persist a refreshed timestamp before sending the redirect. If persistence fails, do not send a redirect that would imply the activity was recorded; return the existing generic server error response.
- Set redirect responses to `Cache-Control: no-store` while keeping HTTP 301. This prevents clients from satisfying repeat visits from a cached redirect and bypassing activity tracking. A 302 redirect was considered but would change the existing permanent-redirect contract.
- Expiration is enforced during lookup. Opportunistic or scheduled deletion can be added later without changing link behavior.

## Risks / Trade-offs

- [Legacy links receive a fresh inactivity window because their prior access times are unknown] → Initialize their timestamp at first load after upgrade and document this migration behavior.
- [Persisting a timestamp for every redirect adds disk writes and can make redirects fail when storage is unavailable] → Keep the store's existing serialized write path and only redirect after durable persistence succeeds.
- [Older clients may have cached redirects before deployment] → New responses use `no-store`; previously cached redirects cannot refresh activity until clients contact the service again.

## Migration Plan

1. Load both the current string-value records and the new object records.
2. Assign the current UTC timestamp to legacy records when loading them.
3. Persist records in the new format on subsequent writes.
4. Rollback can restore the prior code, which must either tolerate object records or use a backup of the JSON data file; retain a backup before deployment.

