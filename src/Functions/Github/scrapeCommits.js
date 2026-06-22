const checkAllCommits = require('./checkallcommits');
const sendCommitNotification = require('./sendcommitnotification');
const { logGithub } = require('./github-state');

const DEFAULT_GITHUB_POLL_INTERVAL_MS = 10000;
const MIN_GITHUB_POLL_INTERVAL_MS = 5000;
const parsedPollInterval = Number(process.env.GITHUB_POLL_INTERVAL_MS);
const GITHUB_POLL_INTERVAL_MS = Number.isFinite(parsedPollInterval) && parsedPollInterval >= MIN_GITHUB_POLL_INTERVAL_MS
  ? parsedPollInterval
  : DEFAULT_GITHUB_POLL_INTERVAL_MS;

function isIgnorableGithubError(err) {
  return err?.message?.toLowerCase().includes('socket hang up') ||
    err?.code === 'ECONNRESET';
}

async function scrapeCommits(client) {
  let pollCount = 0;

  // logGithub('log', `GitHub Commit watcher started. Polling GitHub every ${GITHUB_POLL_INTERVAL_MS / 1000} seconds.`);

  const runPoll = async () => {
    pollCount += 1;

    try {
      const { newCommits } = await checkAllCommits();

      for (const commit of newCommits.reverse()) {
        await sendCommitNotification(client, commit);
      }
    } catch (err) {
      if (isIgnorableGithubError(err)) {
        return;
      }

    //  logGithub('error', `Poll #${pollCount} failed. Retrying in ${GITHUB_POLL_INTERVAL_MS / 1000} seconds.`, err);
    } finally {
      setTimeout(runPoll, GITHUB_POLL_INTERVAL_MS);
    }
  };

  runPoll();
}

module.exports = scrapeCommits;
