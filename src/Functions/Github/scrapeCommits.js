const checkAllCommits = require('./checkallcommits');
const sendCommitNotification = require('./sendcommitnotification');

async function scrapeCommits(client) {

  while (true) {
    try {
      const newCommits = await checkAllCommits();

      for (const commit of newCommits.reverse()) {
        await sendCommitNotification(client, commit);
      }

      if (newCommits.length === 0) {
      }

    } catch (err) {
      return[];
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

module.exports = scrapeCommits;
