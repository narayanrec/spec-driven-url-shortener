# Design

## Context

See proposal.md for motivation and specs/url-shortening/spec.md for required behavior. The repository currently contains OpenSpec planning files only, so this design establishes the initial server structure. The implementation is constrained to Node.js built-in modules and a single local application instance.

## Goals / Non-Goals

**Goals:**

- Keep the server and user interface small, using Node's HTTP, filesystem, crypto, and URL APIs.
- Make local development possible with a configurable port, public base URL, and data-file path.
- Preserve link mappings across process restarts.

**Non-Goals:**

- Multi-instance or distributed storage, user accounts, analytics, expiration, custom aliases, or link editing.
- An external database, frontend framework, or third-party runtime dependency.

## Decisions

### Use Node's built-in HTTP server for routing and the form

Use `node:http` to serve a small HTML form at `GET /` and handle its form submission at `POST /shorten`. Serve the API at `POST /api/shorten`, accepting a JSON body such as `{"url":"https://example.com/path"}` and returning JSON containing `code` and `shortUrl`. Handle short-link visits with `GET /:code`. Keep HTML and styles minimal and serve them directly from the server rather than introducing a bundler or framework. This avoids dependencies and keeps the first slice deployable as one process. A framework would offer more routing conveniences but is unnecessary for these few routes.

### Validate destinations with the built-in URL parser

Parse submitted values with the global `URL` API and accept only `http:` and `https:` protocols. Treat malformed values and unsupported protocols as client errors; the form should display a clear validation message and the API should return a 400 response with a small JSON error object. This validates the destination syntax without making network requests to it.

### Generate opaque codes with Node crypto

Use `node:crypto` to produce random URL-safe codes, then check the loaded mapping before insertion. On collision, generate another code. This is simple for a small initial service and avoids sequential identifiers that expose the number of created links. Sequential counters were considered but make enumeration easier.

### Persist mappings in a local JSON file

Use `node:fs/promises` to load and update a JSON object keyed by code. Choose the data-file location through an environment variable with a project-local default. Serialize updates so concurrent submissions in one process cannot overwrite each other, and write a temporary file followed by rename to reduce the chance of leaving a partially written store. This is adequate for a single instance and requires no database package. A database would better handle concurrent writers and larger datasets, but adds operational and dependency costs outside this slice.

### Configure the public base URL explicitly

Read the externally reachable origin from `PUBLIC_BASE_URL`, remove any trailing slash, and append the generated code when constructing returned links. Do not derive this origin from the incoming request's Host header, which may be untrusted or differ behind a proxy. Require the deployment to provide the public URL; use a documented localhost value for local development.

### Return a permanent redirect for known codes

Respond to `GET /:code` with status 301 and a `Location` header set from the stored destination. Return 404 for an unknown code. A 302 would allow destination changes more easily, but this slice has no editing behavior and the requested contract is permanent redirection.

## Risks / Trade-offs

- [A local JSON store supports only one application instance and can become slow as it grows] → Keep storage behind a small module boundary so a database can replace it in a later change.
- [A 301 can be cached by browsers and intermediaries] → Treat destinations as immutable in this slice and document that short links cannot be edited.
- [Public base URL or data-file configuration may be missing or invalid] → Validate required configuration at startup and fail with a clear message.
- [HTML form output can create a cross-site scripting risk if submitted values are reflected] → Escape user-provided text before rendering it and avoid inserting untrusted strings as HTML.

## Migration Plan

There is no existing service data to migrate. Configure `PUBLIC_BASE_URL` and the data-file location for the deployment, start the Node.js server, and retain the configured data file across restarts and deployments. Rollback consists of stopping the new server and restoring the prior deployment; links created by this slice will be unavailable if the new data file is discarded.
