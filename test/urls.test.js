const assert = require('node:assert/strict');
const test = require('node:test');
const { parseDestination } = require('../src/urls');

test('accepts and normalizes HTTP and HTTPS URLs', () => {
  assert.equal(parseDestination(' https://example.com/a b '), 'https://example.com/a%20b');
  assert.equal(parseDestination('http://localhost:3000'), 'http://localhost:3000/');
});

test('rejects malformed, empty, and unsupported URL values', () => {
  for (const value of ['', '   ', 'not a URL', 'javascript:alert(1)', 'file:///etc/passwd', null]) {
    assert.equal(parseDestination(value), null, `expected ${String(value)} to be rejected`);
  }
});
