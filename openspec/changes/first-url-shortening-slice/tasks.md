# Tasks

## 1. Server foundation and configuration

- [ ] 1.1 Create the Node.js entry point and startup scripts with no third-party dependencies; verify the documented start command launches the HTTP server.
- [ ] 1.2 Add configuration for the listen port, public base URL, and persistent data-file path; verify startup accepts valid settings and reports missing or invalid required settings clearly.
- [ ] 1.3 Add a `.gitignore` for generated data and local Node.js artifacts; verify the persistent data file and other generated files are ignored.
- [ ] 1.4 Create `README.md` with setup, configuration, and server start instructions; verify each documented command matches the available scripts.

## 2. Persistent short-link storage

- [ ] 2.1 Implement loading and atomic persistence of code-to-destination mappings using Node filesystem APIs; verify mappings survive closing and reopening the store.
- [ ] 2.2 Implement cryptographically random URL-safe code generation with collision checks; verify a collision preserves the existing destination and retries with a new code.
- [ ] 2.3 Add automated coverage for storage reload, write failures, and code collisions; verify the relevant test command passes.

## 3. Link creation interfaces

- [ ] 3.1 Implement destination parsing and HTTP/HTTPS-only validation shared by both interfaces; verify valid web URLs are accepted and malformed or unsupported schemes are rejected.
- [ ] 3.2 Implement `POST /api/shorten` with JSON input and JSON success/error responses using the configured public base URL; verify valid requests return a usable short URL and invalid requests return a client error.
- [ ] 3.3 Implement the HTML form at `GET /` and form submission at `POST /shorten`; verify submission displays the created short URL and invalid input displays an error.
- [ ] 3.4 Escape user-provided values rendered in HTML and add automated coverage for both creation interfaces; verify tests cover success, validation errors, and HTML escaping.

## 4. Redirects and end-to-end behavior

- [ ] 4.1 Implement `GET /:code` lookup, returning HTTP 301 with the stored destination in `Location` and HTTP 404 for an unknown code; verify both response cases.
- [ ] 4.2 Add integration coverage for creating a link, restarting the server, and following its redirect; verify the persisted link still returns HTTP 301 to the original destination.
- [ ] 4.3 Run the full verification command and review the README against the implemented routes and configuration; verify all documented behavior matches the running service.
