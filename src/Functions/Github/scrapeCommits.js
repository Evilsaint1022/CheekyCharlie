const checkAllCommits = require('./checkallcommits');
const sendCommitNotification = require('./sendcommitnotification');
const { logGithub } = require('./github-state');

const DEFAULT_GITHUB_POLL_INTERVAL_MS = 10000;
const MIN_GITHUB_POLL_INTERVAL_MS = 5000;
const parsedPollInterval = Number(process.env.GITHUB_POLL_INTERVAL_MS);
const GITHUB_POLL_INTERVAL_MS = Number.isFinite(parsedPollInterval) && parsedPollInterval >= MIN_GITHUB_POLL_INTERVAL_MS
  ? parsedPollInterval
  : DEFAULT_GITHUB_POLL_INTERVAL_MS;

async function scrapeCommits(client) {
  let pollCount = 0;

  logGithub('log', `Commit watcher started. Polling GitHub every ${GITHUB_POLL_INTERVAL_MS / 1000} seconds.`);

  const runPoll = async () => {
    pollCount += 1;
    const pollStartedAt = Date.now();

    try {
      const {
        newCommits,
        rateLimitRemaining,
        rateLimitResetAt
      } = await checkAllCommits();

      for (const commit of newCommits.reverse()) {
        await sendCommitNotification(client, commit);
      }

      if (newCommits.length > 0) {
        const durationMs = Date.now() - pollStartedAt;
        const rateLimitText = rateLimitRemaining ?? 'unknown';
        const resetText = rateLimitResetAt ? `, resets at ${rateLimitResetAt}` : '';

        logGithub(
          'log',
          `Poll #${pollCount} completed in ${durationMs}ms. Found ${newCommits.length} new commit(s). Rate limit remaining: ${rateLimitText}${resetText}`
        );
      }
    } catch (err) {
      logGithub('error', `Poll #${pollCount} failed. Retrying in ${GITHUB_POLL_INTERVAL_MS / 1000} seconds.`, err);
    } finally {
      setTimeout(runPoll, GITHUB_POLL_INTERVAL_MS);
    }
  };

  runPoll();
}

module.exports = scrapeCommits;
