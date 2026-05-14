const checkAllCommits = require('./checkallcommits');
const sendCommitNotification = require('./sendcommitnotification');
const { logGithub } = require('./github-state');

const GITHUB_POLL_INTERVAL_MS = 60000;

async function scrapeCommits(client) {
  let pollCount = 0;

  logGithub('log', `Commit watcher started. Polling GitHub every ${GITHUB_POLL_INTERVAL_MS / 1000} seconds.`);

  const runPoll = async () => {
    pollCount += 1;
    const pollStartedAt = Date.now();

    try {
      const {
        newCommits,
        status,
        rateLimitRemaining,
        rateLimitResetAt
      } = await checkAllCommits();

      for (const commit of newCommits.reverse()) {
        await sendCommitNotification(client, commit);
      }

      const durationMs = Date.now() - pollStartedAt;
      const rateLimitText = rateLimitRemaining ?? 'unknown';
      const resetText = rateLimitResetAt ? `, resets at ${rateLimitResetAt}` : '';

      if (newCommits.length > 0) {
        logGithub(
          'log',
          `Poll #${pollCount} completed in ${durationMs}ms. Found ${newCommits.length} new commit(s). Rate limit remaining: ${rateLimitText}${resetText}`
        );
      } else {
        logGithub(
          'log',
          `Poll #${pollCount} completed in ${durationMs}ms with status=${status}. No new commits. Rate limit remaining: ${rateLimitText}${resetText}`
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
