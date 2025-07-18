const checkAllCommits = require('./checkallcommits');
const sendCommitNotification = require('./sendcommitnotification');

async function scrapeCommits(client) {

  while (true) {
    try {
      const newCommits = await checkAllCommits();

      for (const commit of newCommits.reverse()) {
        console.log('[GITHUB] New commit found:', commit.sha);
        await sendCommitNotification(client, commit);
      }

      if (newCommits.length === 0) {
      }

    } catch (err) {
      console.error('[GITHUB] Error during commit check:', err);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

module.exports = scrapeCommits;
