# Dependency-free URL shortener

A small URL shortener built with Node.js built-in modules. It provides a web form, a JSON API, durable local storage, and permanent redirects.

## Requirements

- Node.js 20 or later

## Setup and start

Clone or download the project, then start the server from the project directory:

```sh
npm start
```

No third-party packages need to be installed. By default, the server listens at `http://localhost:3000`, and link data is saved to `data/links.json`.

Open `http://localhost:3000` to use the web form. Set the following environment variables to customize the server:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port, from 1 to 65535 |
| `PUBLIC_BASE_URL` | `http://localhost:<PORT>` | Public HTTP or HTTPS origin used to construct short URLs |
| `DATA_FILE` | `data/links.json` | Path to the persistent JSON link store |

For example:

```sh
PORT=8080 PUBLIC_BASE_URL=https://sho.rt DATA_FILE=./data/links.json npm start
```

Keep the data file between restarts and deployments. The JSON store is intended for a single server instance.

## HTTP API

Create a short link with `POST /api/shorten`, sending JSON with a `url` property:

```sh
curl -X POST http://localhost:3000/api/shorten \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/a/long/path"}'
```

A successful response contains `code` and `shortUrl`. Invalid or unsupported destinations return HTTP 400 with a clear error. Only HTTP and HTTPS destinations are accepted.

Visiting an active short URL returns HTTP 301 to its original destination and refreshes its activity time. A link remains active through the end of the UTC calendar day 90 days after it was created or last visited. Expired and unknown codes return HTTP 404. Expired records may be deleted later; they stop redirecting at the expiration cutoff.

## Tests

Run the built-in Node.js test suite with:

```sh
npm test
```
