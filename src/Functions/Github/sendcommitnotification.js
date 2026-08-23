// EXCLUDE
require('dotenv').config({ quiet: true });
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const {
  owner,
  repo,
  MAX_STORED_SHAS,
  getGithubState,
  saveGithubState,
  logGithub
} = require('./github-state');

// @@@@@@@@@@@@@@@@@@@@@@@@@@@@
// const discordChannelId = '1508843915577528441'; // This is for testing purposes.
// @@@@@@@@@@@@@@@@@@@@@@@@@@@@

const discordChannelId = '1500835312912564294'; // Production Channel for commit notifications.

async function sendCommitNotification(client, commit) {
  try {
    const sha = commit?.sha;
    const message = commit?.commit?.message?.trim();
    const htmlUrl = commit?.html_url;
    const authorName =
      commit?.commit?.author?.name ||
      commit?.author?.login ||
      'Unknown';

    if (!sha || !message || !htmlUrl) {
      logGithub('warn', 'Skipping commit notification because required commit fields were missing.');
      return;
    }

    const middle =    `**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**`;
    const formattedMessage = message.length > 1200
      ? `${message.slice(0, 1197)}...`
      : message;
    const centeredmessage = `***${formattedMessage}***`;
    const centeredauthor = `〉***The Author: \`${authorName}\`***`;
    const commitlink = `ㅤㅤㅤ[🔗 Commit Link Here](${htmlUrl})`;

    const state = await getGithubState();

    if (state.sentShas.includes(sha)) {
      return;
    }

    const channel = await client.channels.fetch(discordChannelId);
    if (!channel || !channel.isTextBased()) {
      logGithub('warn', `Discord channel ${discordChannelId} was not found or is not text-based.`);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    const imageUrl = `https://opengraph.githubassets.com/1/${owner}/${repo}/commit/${sha}?t=${Date.now()}`;

    const placeholderPath = path.join(__dirname, '../Utilities/Github/repostoredimage.png');

    let image;
    let attachment = null;

    try {
      const response = await fetch(imageUrl);

      if (response.ok) {
        image = imageUrl;
      } else {
        throw new Error(`GitHub image returned ${response.status}`);
      }
    } catch {
      if (fs.existsSync(placeholderPath)) {
        attachment = new AttachmentBuilder(placeholderPath, {
          name: 'repostoredimage.png'
        });

        image = 'attachment://repostoredimage.png';
      } else {
        logGithub('warn', `Placeholder image not found: ${placeholderPath}`);
      }
    }


    const embed = new EmbedBuilder()
      .setDescription(`## ***🌿 \`${repo} Updates\`*** 🌿\n### ${commitlink}\n${middle}\n${centeredmessage}\n\n${centeredauthor}\n${middle}`)
      .setImage(image)
      .setColor(0x207e37)
      .setTimestamp(new Date());

    await channel.send({ embeds: [embed], ...(attachment ? { files: [attachment] } : {})});

    const nextSentShas = [...state.sentShas.filter((savedSha) => savedSha !== sha), sha].slice(-MAX_STORED_SHAS);
    await saveGithubState({
      ...state,
      sentShas: nextSentShas,
      lastDeliveredAt: new Date().toISOString()
    });
  } catch (err) {
  //  logGithub('error', `Failed to send commit notification for ${commit?.sha || 'unknown commit'}.`, err);
  }
}

module.exports = sendCommitNotification;
