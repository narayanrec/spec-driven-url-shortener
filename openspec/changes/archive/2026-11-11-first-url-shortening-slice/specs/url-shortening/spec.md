# Spec Delta

## Purpose

This capability lets people and software turn HTTP or HTTPS URLs into durable, shareable short links and send visitors to the original destinations.

## ADDED Requirements

### Requirement: Users can create short links
The system SHALL accept a destination URL through a web form and an HTTP API and return a generated short URL on the configured public domain.

#### Scenario: Create a short link in the web form
- **WHEN** a user submits a valid destination URL through the web form
- **THEN** the system displays the generated short URL

#### Scenario: Create a short link through the API
- **WHEN** a client submits a valid destination URL through the HTTP API
- **THEN** the system returns the generated short URL in a successful response

### Requirement: Only HTTP and HTTPS destinations are accepted
The system SHALL accept only syntactically valid URLs whose scheme is HTTP or HTTPS and SHALL reject other schemes and invalid URL values.

#### Scenario: Reject an unsupported scheme
- **WHEN** a user or client submits a URL using a scheme other than HTTP or HTTPS
- **THEN** the system rejects the submission and reports that the destination is invalid

#### Scenario: Reject a malformed URL
- **WHEN** a user or client submits a value that cannot be parsed as an HTTP or HTTPS URL
- **THEN** the system rejects the submission and reports that the destination is invalid

### Requirement: Generated short codes are unique
The system SHALL generate a short code for each accepted destination and SHALL ensure that each code identifies only one stored destination.

#### Scenario: Generate a code without a collision
- **WHEN** a valid destination is submitted and its generated code is unused
- **THEN** the system stores the code with that destination and returns a short URL containing the code

#### Scenario: Handle a generated code collision
- **WHEN** a generated code already identifies a stored destination
- **THEN** the system generates another code and does not overwrite the existing mapping

### Requirement: Short-link mappings persist across restarts
The system SHALL retain each created short-code-to-destination mapping across server restarts.

#### Scenario: Resolve a link after restart
- **WHEN** the server restarts after a short link has been created and a visitor requests that link
- **THEN** the system uses the retained mapping to redirect to the original destination

### Requirement: Short URLs use the configured public domain
The system SHALL construct returned short URLs using the configured public base URL.

#### Scenario: Return a link on the configured domain
- **WHEN** a valid destination is submitted while a public base URL is configured
- **THEN** the returned short URL uses that base URL and the generated code

### Requirement: Visiting a short URL redirects permanently
The system SHALL respond to a request for a known short code with a permanent redirect to its stored destination.

#### Scenario: Redirect to a known destination
- **WHEN** a visitor requests a short URL containing a known code
- **THEN** the system responds with HTTP 301 and a Location header containing the original destination

#### Scenario: Request an unknown code
- **WHEN** a visitor requests a short URL containing a code with no stored mapping
- **THEN** the system responds with HTTP 404
