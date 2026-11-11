const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadConfig } = require('../src/config');
const { createAppServer } = require('../src/server');
const { LinkStore } = require('../src/store');

async function openServer(dataFile) {
  const config = loadConfig({ PORT: '3000', PUBLIC_BASE_URL: 'https://short.example', DATA_FILE: dataFile });
  const store = await new LinkStore(dataFile).init();
  const server = createAppServer({ config, store });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return { server, store, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

async function withTempDir(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'url-shortener-http-'));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('serves the web form and returns clear, escaped validation errors', async () => {
  await withTempDir(async (directory) => {
    const { server, baseUrl } = await openServer(path.join(directory, 'links.json'));
    try {
      const home = await fetch(`${baseUrl}/`);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /<form action="\/shorten" method="post">/);

      const invalid = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ url: 'javascript:<script>alert("x")</script>' }),
      });
      const html = await invalid.text();
      assert.equal(invalid.status, 400);
      assert.match(html, /Please provide a valid HTTP or HTTPS URL/);
      assert.match(html, /&lt;script&gt;/);
      assert.doesNotMatch(html, /<script>alert/);

      const valid = await fetch(`${baseUrl}/shorten`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ url: 'https://example.com/long/path' }),
      });
      assert.equal(valid.status, 200);
      assert.match(await valid.text(), /https:\/\/short\.example\/[A-Za-z0-9_-]+/);
    } finally {
      await closeServer(server);
    }
  });
});

test('creates short links through JSON API and returns useful errors', async () => {
  await withTempDir(async (directory) => {
    const { server, baseUrl } = await openServer(path.join(directory, 'links.json'));
    try {
      const valid = await fetch(`${baseUrl}/api/shorten`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/path' }),
      });
      assert.equal(valid.status, 201);
      const result = await valid.json();
      assert.match(result.code, /^[A-Za-z0-9_-]+$/);
      assert.equal(result.shortUrl, `https://short.example/${result.code}`);

      const invalid = await fetch(`${baseUrl}/api/shorten`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'ftp://example.com/file' }),
      });
      assert.equal(invalid.status, 400);
      assert.match((await invalid.json()).error, /valid HTTP or HTTPS URL/);

      const malformed = await fetch(`${baseUrl}/api/shorten`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid json',
      });
      assert.equal(malformed.status, 400);
      assert.match((await malformed.json()).error, /valid JSON/);
    } finally {
      await closeServer(server);
    }
  });
});

test('returns a permanent redirect for known codes and 404 for unknown codes', async () => {
  await withTempDir(async (directory) => {
    const { server, baseUrl, store } = await openServer(path.join(directory, 'links.json'));
    try {
      const code = await store.create('https://example.com/original');
      const redirect = await fetch(`${baseUrl}/${code}`, { redirect: 'manual' });
      assert.equal(redirect.status, 301);
      assert.equal(redirect.headers.get('location'), 'https://example.com/original');

      const missing = await fetch(`${baseUrl}/unknown-code`, { redirect: 'manual' });
      assert.equal(missing.status, 404);
    } finally {
      await closeServer(server);
    }
  });
});

test('retains links and redirects after the server is restarted', async () => {
  await withTempDir(async (directory) => {
    const dataFile = path.join(directory, 'links.json');
    const first = await openServer(dataFile);
    let code;
    try {
      const response = await fetch(`${first.baseUrl}/api/shorten`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/survives-restart' }),
      });
      assert.equal(response.status, 201);
      code = (await response.json()).code;
    } finally {
      await closeServer(first.server);
    }

    const second = await openServer(dataFile);
    try {
      const redirect = await fetch(`${second.baseUrl}/${code}`, { redirect: 'manual' });
      assert.equal(redirect.status, 301);
      assert.equal(redirect.headers.get('location'), 'https://example.com/survives-restart');
    } finally {
      await closeServer(second.server);
    }
  });
});
