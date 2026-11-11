# Proposal

## Why

The project needs its first usable URL-shortening flow: people must be able to submit a long URL and share a compact link that takes visitors to the original destination. Supporting both a web form and an HTTP API makes the core behavior usable by people and other software.

## What Changes

- Add URL submission through a web form and an HTTP API, returning a short URL on the configured public domain.
- Validate submitted URLs and return clear errors for invalid input.
- Generate short codes automatically and persist each code-to-destination mapping across server restarts.
- Redirect visits to a short URL permanently to the original HTTP or HTTPS URL.
- Reject submitted URLs that do not use HTTP or HTTPS.

## Capabilities

### New Capabilities

- `url-shortening`: Create short links, retain their destinations, and redirect visitors to those destinations.

### Modified Capabilities

None.

## Impact

This adds the Node.js server, web form, HTTP API, short-link storage, and redirect behavior. The public base URL must be configurable. The implementation must use Node.js built-in modules and add no third-party dependencies. The initial durable store is assumed to be a local file managed by the application.
