require('dotenv').config({ quiet: true });
const fetch = require('node-fetch');
const {
  owner,
  repo,
  getGithubState,
  saveGithubState
} = require('./github-state');

const GITHUB_COMMITS_URL = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=50`;
const GITHUB_REQUEST_TIMEOUT_MS = 15000;

async function checkAllCommits() {
  const state = await getGithubState();
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'CheekyCharlie'
  };

  if (process.env.GITHUB_KEY) {
    headers.Authorization = `token ${process.env.GITHUB_KEY}`;
  }

  if (state.etag) {
    headers['If-None-Match'] = state.etag;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GITHUB_COMMITS_URL, {
      headers,
      signal: controller.signal
    });

    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const rateLimitReset = response.headers.get('x-ratelimit-reset');
    const nextState = {
      ...state,
      etag: response.headers.get('etag') || state.etag,
      lastCheckedAt: new Date().toISOString()
    };

    if (response.status === 304) {
      await saveGithubState(nextState);
      return {
        newCommits: [],
        status: 'not-modified',
        rateLimitRemaining,
        rateLimitResetAt: rateLimitReset ? new Date(Number(rateLimitReset) * 1000).toISOString() : null
      };
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`GitHub API returned ${response.status} ${response.statusText}: ${errorBody.slice(0, 300)}`);
    }

    const commits = await response.json();

    if (!Array.isArray(commits)) {
      throw new Error('GitHub API returned a non-array commits payload.');
    }

    const newestCommitSha = commits[0]?.sha || null;
    const knownHeadIndex = state.lastHeadSha
      ? commits.findIndex((commit) => commit?.sha === state.lastHeadSha)
      : -1;

    nextState.lastHeadSha = newestCommitSha || state.lastHeadSha;
    await saveGithubState(nextState);

    if (!state.lastHeadSha && state.sentShas.length === 0) {
      return {
        newCommits: [],
        status: 'bootstrapped',
        rateLimitRemaining,
        rateLimitResetAt: rateLimitReset ? new Date(Number(rateLimitReset) * 1000).toISOString() : null
      };
    }

    let newCommits;

    if (knownHeadIndex >= 0) {
      newCommits = commits.slice(0, knownHeadIndex);
    } else {
      const sentShaSet = new Set(state.sentShas);
      newCommits = commits.filter((commit) => commit?.sha && !sentShaSet.has(commit.sha));
    }

    return {
      newCommits,
      status: 'ok',
      rateLimitRemaining,
      rateLimitResetAt: rateLimitReset ? new Date(Number(rateLimitReset) * 1000).toISOString() : null
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`GitHub commits request timed out after ${GITHUB_REQUEST_TIMEOUT_MS}ms.`);
    }

    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = checkAllCommits;
