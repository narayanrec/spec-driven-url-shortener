const path = require('node:path');

function loadConfig(env = process.env) {
  const portValue = env.PORT || '3000';
  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const publicBaseValue = env.PUBLIC_BASE_URL || `http://localhost:${port}`;
  let publicBase;
  try {
    publicBase = new URL(publicBaseValue);
  } catch {
    throw new Error('PUBLIC_BASE_URL must be a valid HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(publicBase.protocol)
    || publicBase.username
    || publicBase.password
    || publicBase.pathname !== '/'
    || publicBase.search
    || publicBase.hash) {
    throw new Error('PUBLIC_BASE_URL must be an HTTP or HTTPS origin without credentials, path, query, or fragment.');
  }

  const dataFile = path.resolve(env.DATA_FILE || path.join(process.cwd(), 'data', 'links.json'));
  return { port, publicBaseUrl: publicBase.origin, dataFile };
}

module.exports = { loadConfig };
