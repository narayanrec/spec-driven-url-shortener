const http = require('node:http');
const { loadConfig } = require('./config');
const { LinkStore } = require('./store');
const { parseDestination } = require('./urls');

const MAX_BODY_BYTES = 10 * 1024;
const INVALID_URL_MESSAGE = 'Please provide a valid HTTP or HTTPS URL.';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHome({ error = '', shortUrl = '', input = '' } = {}) {
  const result = shortUrl
    ? `<p class="result">Your short URL: <a href="${escapeHtml(shortUrl)}">${escapeHtml(shortUrl)}</a></p>`
    : '';
  const errorMessage = error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>URL shortener</title>
  <style>
    body { font: 16px system-ui, sans-serif; margin: 3rem auto; max-width: 42rem; padding: 0 1rem; }
    input { box-sizing: border-box; font: inherit; padding: .6rem; width: 100%; }
    button { cursor: pointer; font: inherit; margin-top: .75rem; padding: .55rem .9rem; }
    .error { color: #a01818; }
    .result { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <h1>Shorten a URL</h1>
  <form action="/shorten" method="post">
    <label for="url">Long URL</label>
    <input id="url" name="url" type="url" value="${escapeHtml(input)}" placeholder="https://example.com/a/long/path" required>
    <button type="submit">Create short URL</button>
  </form>
  ${errorMessage}
  ${result}
</body>
</html>`;
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, { 'content-type': 'text/html; charset=utf-8', 'x-content-type-options': 'nosniff' });
  response.end(html);
}

function sendJson(response, statusCode, value) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (tooLarge) {
        const error = new Error('Request body is too large.');
        error.statusCode = 413;
        reject(error);
        return;
      }
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', reject);
  });
}

function createAppServer({ config, store, clock = () => new Date() }) {
  return http.createServer((request, response) => {
    handleRequest(request, response, { config, store, clock }).catch(() => {
      if (!response.headersSent) sendJson(response, 500, { error: 'An internal server error occurred.' });
      else response.destroy();
    });
  });
}

async function handleRequest(request, response, { config, store, clock }) {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (request.method === 'GET' && pathname === '/') {
    sendHtml(response, 200, renderHome());
    return;
  }

  if (request.method === 'POST' && pathname === '/api/shorten') {
    let input;
    try {
      input = JSON.parse(await readBody(request));
    } catch (error) {
      const statusCode = error.statusCode || 400;
      sendJson(response, statusCode, { error: statusCode === 413 ? error.message : 'Request body must be valid JSON.' });
      return;
    }
    await createLink(input && input.url, response, { config, store, interfaceType: 'api' });
    return;
  }

  if (request.method === 'POST' && pathname === '/shorten') {
    let form;
    try {
      form = new URLSearchParams(await readBody(request));
    } catch (error) {
      sendHtml(response, error.statusCode || 400, renderHome({ error: error.message }));
      return;
    }
    await createLink(form.get('url'), response, { config, store, interfaceType: 'form' });
    return;
  }

  if (request.method === 'GET' && /^\/[A-Za-z0-9_-]{1,64}$/.test(pathname)) {
    const code = pathname.slice(1);
    const link = await store.touch(code, clock());
    if (!link) {
      sendHtml(response, 404, '<!doctype html><html lang="en"><title>Not found</title><h1>Short URL not found</h1></html>');
      return;
    }
    response.writeHead(301, { location: link.destination, 'cache-control': 'no-store' });
    response.end();
    return;
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  response.end('Not found.\n');
}

async function createLink(value, response, { config, store, interfaceType }) {
  const destination = parseDestination(value);
  if (!destination) {
    if (interfaceType === 'api') sendJson(response, 400, { error: INVALID_URL_MESSAGE });
    else sendHtml(response, 400, renderHome({ error: INVALID_URL_MESSAGE, input: typeof value === 'string' ? value : '' }));
    return;
  }

  const code = await store.create(destination);
  const shortUrl = `${config.publicBaseUrl}/${code}`;
  if (interfaceType === 'api') {
    sendJson(response, 201, { code, shortUrl });
  } else {
    sendHtml(response, 200, renderHome({ shortUrl }));
  }
}

async function start() {
  const config = loadConfig();
  const store = await new LinkStore(config.dataFile).init();
  const server = createAppServer({ config, store });
  server.on('error', (error) => {
    process.stderr.write(`Unable to start URL shortener: ${error.message}\n`);
    process.exitCode = 1;
  });
  server.listen(config.port, () => {
    process.stdout.write(`URL shortener listening on port ${config.port}\n`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = { createAppServer, escapeHtml, renderHome };
