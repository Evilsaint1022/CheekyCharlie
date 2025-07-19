require('dotenv').config();
const fetch = require('node-fetch');
const db = require('../../Handlers/database');

const owner = 'Evilsaint1022';
const repo = 'CheekyCharlie';
const discordChannelId = '1347795697369350244';
const repoKey = `${owner}_${repo}`;

async function sendCommitNotification(client, commit) {
  try {
    const sha = commit?.sha;
    const message = commit?.commit?.message;
    const htmlUrl = commit?.html_url;
    const authorName =
      commit?.commit?.author?.name ||
      commit?.author?.login ||
      'Unknown';

    if (!sha || !message || !htmlUrl) {
      return;
    }

    // Load previously saved commits
    let previousCommits = await db.github.get(repoKey);
    if (!Array.isArray(previousCommits)) {
      previousCommits = previousCommits ? [previousCommits] : [];
    }

    // Skip if already sent
    if (previousCommits.includes(sha)) {
      console.log(`[Github] Commit ${sha} already posted. Skipping.`);
      return;
    }

    // Send message to Discord
    const channel = await client.channels.fetch(discordChannelId);
    await channel.send(
      `# ⭐ New Update to \`${repo}\`\nㅤ\n**${message}**\n\`By ${authorName}\`\n\n🔗 [GITHUB-LINK](${htmlUrl})`
    );

    // Save SHA to DB
    previousCommits.push(sha);
    await db.github.set(repoKey, previousCommits);

    console.log(`[Github] Commit ${sha} sent and saved.`);
  } catch (err) {
    console.error(`[Github] Failed to send commit notification: ${err.message}`);
  }
}

module.exports = sendCommitNotification;
