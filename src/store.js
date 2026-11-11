const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');

class LinkStore {
  constructor(filePath, { codeFactory = () => randomBytes(6).toString('base64url') } = {}) {
    this.filePath = filePath;
    this.codeFactory = codeFactory;
    this.links = Object.create(null);
    this.writeQueue = Promise.resolve();
  }

  async init() {
    let contents;
    try {
      contents = await fs.readFile(this.filePath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return this;
      throw new Error(`Unable to read link store at ${this.filePath}: ${error.message}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(contents);
    } catch {
      throw new Error(`Link store at ${this.filePath} contains invalid JSON.`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || Object.entries(parsed).some(([code, destination]) => !code || typeof destination !== 'string')) {
      throw new Error(`Link store at ${this.filePath} must be an object of short codes and destination URLs.`);
    }
    this.links = Object.assign(Object.create(null), parsed);
    return this;
  }

  get(code) {
    return this.links[code];
  }

  create(destination) {
    const operation = this.writeQueue.then(async () => {
      let code;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate = this.codeFactory();
        if (typeof candidate === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(candidate) && !(candidate in this.links)) {
          code = candidate;
          break;
        }
      }
      if (!code) throw new Error('Unable to generate a unique short code.');

      const nextLinks = { ...this.links, [code]: destination };
      await this.persist(nextLinks);
      this.links = Object.assign(Object.create(null), nextLinks);
      return code;
    });
    this.writeQueue = operation.catch(() => {});
    return operation;
  }

  async persist(links) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`;
    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(links, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => {});
      throw new Error(`Unable to persist link store at ${this.filePath}: ${error.message}`);
    }
  }
}

module.exports = { LinkStore };
