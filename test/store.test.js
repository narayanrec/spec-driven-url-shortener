const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { LinkStore } = require('../src/store');

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

    const reopened = await new LinkStore(filePath).init();
    assert.equal(reopened.get('abc123'), 'https://example.com/');
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
