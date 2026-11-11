# Spec Delta

## MODIFIED Requirements

### Requirement: Visiting a short URL redirects permanently
The system SHALL respond to a request for an active short code with a permanent redirect to its stored destination and SHALL return HTTP 404 for an unknown, expired, or deleted short code.

#### Scenario: Redirect to a known destination
- **WHEN** a visitor requests a short URL containing a known code that has not expired
- **THEN** the system responds with HTTP 301 and a Location header containing the original destination

#### Scenario: Request an unknown code
- **WHEN** a visitor requests a short URL containing a code with no stored mapping
- **THEN** the system responds with HTTP 404

#### Scenario: Request an expired code
- **WHEN** a visitor requests a short URL whose link has been inactive beyond its expiration cutoff
- **THEN** the system responds with HTTP 404

## ADDED Requirements

### Requirement: Short links expire after inactivity
The system SHALL make a short link unavailable after the end of its 90th UTC calendar day without activity.

#### Scenario: Initialize inactivity time when creating a link
- **WHEN** the system creates a short link
- **THEN** it records the current UTC time as the link's last activity time

#### Scenario: Refresh inactivity time when visiting an active link
- **WHEN** a visitor requests a known short link before its expiration cutoff
- **THEN** the system records the current UTC time as the link's last activity time

#### Scenario: Expire a link after 90 calendar days without a visit
- **WHEN** a short link has not been visited by the end of its 90th UTC calendar day since its last activity
- **THEN** the system stops redirecting the link and returns HTTP 404 for requests to it

#### Scenario: Allow physical cleanup after expiration
- **WHEN** a short link has passed its expiration cutoff
- **THEN** the system may delete its stored record later, while continuing to return HTTP 404 for requests to the link
