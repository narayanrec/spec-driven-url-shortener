const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { LinkStore, expirationCutoff } = require('../src/store');

async function withTempDir(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'url-shortener-'));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('stores links and reloads them after reopening', async () => {
  await withTempDir(async (directory) => {
    const filePath = path.join(directory, 'links.json');
    const store = await new LinkStore(filePath, { codeFactory: () => 'abc123' }).init();
    assert.equal(await store.create('https://example.com/'), 'abc123');
    const stored = JSON.parse(await fs.readFile(filePath, 'utf8'));
    assert.equal(stored.abc123.destination, 'https://example.com/');
    assert.ok(Number.isFinite(Date.parse(stored.abc123.lastAccessedAt)));

    const reopened = await new LinkStore(filePath).init();
    assert.equal(reopened.get('abc123'), 'https://example.com/');
    assert.equal(reopened.getRecord('abc123').lastAccessedAt, stored.abc123.lastAccessedAt);
  });
});

test('loads legacy destination strings and upgrades them on the next write', async () => {
  await withTempDir(async (directory) => {
    const filePath = path.join(directory, 'links.json');
    await fs.writeFile(filePath, JSON.stringify({ legacy: 'https://example.com/old' }));
    const store = await new LinkStore(filePath, { codeFactory: () => 'new' }).init();
    assert.equal(store.get('legacy'), 'https://example.com/old');
    assert.ok(Number.isFinite(Date.parse(store.getRecord('legacy').lastAccessedAt)));

    await store.create('https://example.com/new');
    const stored = JSON.parse(await fs.readFile(filePath, 'utf8'));
    assert.equal(stored.legacy.destination, 'https://example.com/old');
    assert.ok(Number.isFinite(Date.parse(stored.legacy.lastAccessedAt)));
  });
});

test('refreshes activity durably and keeps memory unchanged when persistence fails', async () => {
  await withTempDir(async (directory) => {
    const filePath = path.join(directory, 'links.json');
    const store = await new LinkStore(filePath, { codeFactory: () => 'abc' }).init();
    await store.create('https://example.com/');
    const originalTimestamp = store.getRecord('abc').lastAccessedAt;
    const refreshedAt = new Date(Date.parse(originalTimestamp) + 1000);

    await store.touch('abc', refreshedAt);
    assert.equal(store.getRecord('abc').lastAccessedAt, refreshedAt.toISOString());
    const reopened = await new LinkStore(filePath).init();
    assert.equal(reopened.getRecord('abc').lastAccessedAt, refreshedAt.toISOString());

    store.persist = async () => { throw new Error('simulated disk error'); };
    const later = new Date(Date.parse(refreshedAt) + 1000);
    await assert.rejects(store.touch('abc', later), /simulated disk error/);
    assert.equal(store.getRecord('abc').lastAccessedAt, refreshedAt.toISOString());
  });
});

test('uses the end of the 90th UTC calendar day as the expiration cutoff', async () => {
  await withTempDir(async (directory) => {
    const filePath = path.join(directory, 'links.json');
    const store = await new LinkStore(filePath, { codeFactory: () => 'abc' }).init();
    await store.create('https://example.com/');
    const lastAccessedAt = '2026-01-01T20:45:00.000Z';
    store.links.abc.lastAccessedAt = lastAccessedAt;
    const cutoff = new Date(expirationCutoff(lastAccessedAt));

    assert.equal(cutoff.toISOString(), '2026-04-01T23:59:59.999Z');
    assert.ok(await store.touch('abc', cutoff));
    store.links.abc.lastAccessedAt = lastAccessedAt;

    const afterCutoff = new Date(cutoff.getTime() + 1);
    assert.equal(await store.touch('abc', afterCutoff), undefined);
    assert.equal(store.getRecord('abc').lastAccessedAt, lastAccessedAt);
  });
});

test('retries a generated collision without overwriting the existing link', async () => {
  await withTempDir(async (directory) => {
    const filePath = path.join(directory, 'links.json');
    const store = await new LinkStore(filePath, { codeFactory: () => 'same' }).init();
    await store.create('https://first.example/');
    const candidates = ['same', 'different'];
    store.codeFactory = () => candidates.shift();

    assert.equal(await store.create('https://second.example/'), 'different');
    assert.equal(store.get('same'), 'https://first.example/');
    assert.equal(store.get('different'), 'https://second.example/');
  });
});

test('does not add a link to memory when persistence fails', async () => {
  await withTempDir(async (directory) => {
    const store = await new LinkStore(path.join(directory, 'links.json'), { codeFactory: () => 'abc' }).init();
    store.persist = async () => { throw new Error('Unable to persist link store: simulated disk error'); };

    await assert.rejects(store.create('https://example.com/'), /Unable to persist link store/);
    assert.equal(store.get('abc'), undefined);
  });
});
