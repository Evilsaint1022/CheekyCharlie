const db = require('../../Handlers/database');

const owner = 'Evilsaint1022';
const repo = 'CheekyCharlie';
const repoKey = `${owner}_${repo}`;
const MAX_STORED_SHAS = 250;

function formatGithubTimestamp(date = new Date()) {
  return `[${date.toLocaleDateString('en-GB')}] ` +
    `[${date.toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland' })}]`;
}

function logGithub(level, message, details) {
  const method = typeof console[level] === 'function' ? level : 'log';
  const prefix = `[⭐] [GITHUB] ${formatGithubTimestamp()}`;

  if (details !== undefined) {
    console[method](`${prefix} ${message}`, details);
    return;
  }

  console[method](`${prefix} ${message}`);
}

function createDefaultGithubState() {
  return {
    sentShas: [],
    etag: null,
    lastHeadSha: null,
    lastCheckedAt: null,
    lastDeliveredAt: null
  };
}

function normalizeGithubState(rawState) {
  if (Array.isArray(rawState)) {
    return {
      ...createDefaultGithubState(),
      sentShas: rawState
        .filter((sha) => typeof sha === 'string' && sha.length > 0)
        .slice(-MAX_STORED_SHAS)
    };
  }

  if (!rawState || typeof rawState !== 'object') {
    return createDefaultGithubState();
  }

  return {
    sentShas: Array.isArray(rawState.sentShas)
      ? rawState.sentShas
        .filter((sha) => typeof sha === 'string' && sha.length > 0)
        .slice(-MAX_STORED_SHAS)
      : [],
    etag: typeof rawState.etag === 'string' ? rawState.etag : null,
    lastHeadSha: typeof rawState.lastHeadSha === 'string' ? rawState.lastHeadSha : null,
    lastCheckedAt: typeof rawState.lastCheckedAt === 'string' ? rawState.lastCheckedAt : null,
    lastDeliveredAt: typeof rawState.lastDeliveredAt === 'string' ? rawState.lastDeliveredAt : null
  };
}

async function getGithubState() {
  const rawState = await db.github.get(repoKey);
  return normalizeGithubState(rawState);
}

async function saveGithubState(state) {
  const normalizedState = normalizeGithubState(state);
  await db.github.set(repoKey, normalizedState);
  return normalizedState;
}

module.exports = {
  owner,
  repo,
  repoKey,
  MAX_STORED_SHAS,
  getGithubState,
  saveGithubState,
  logGithub
};
