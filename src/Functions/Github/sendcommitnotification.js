// EXCLUDE
require('dotenv').config({ quiet: true });
const { EmbedBuilder } = require('discord.js');
const {
  owner,
  repo,
  MAX_STORED_SHAS,
  getGithubState,
  saveGithubState,
  logGithub
} = require('./github-state');

const discordChannelId = '1500835312912564294';

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

    const middle =    `**✦━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━✦**`;
    const formattedMessage = message.length > 1200
      ? `${message.slice(0, 1197)}...`
      : message;
    const centeredmessage = `**${formattedMessage}**`;
    const centeredauthor = `〉**The Author: \`${authorName}\`**`;
    const commitlink = `ㅤㅤㅤ[🔗・_Commit Link Here_](${htmlUrl})`;

    const state = await getGithubState();

    if (state.sentShas.includes(sha)) {
      return;
    }

    const channel = await client.channels.fetch(discordChannelId);
    if (!channel || !channel.isTextBased()) {
      logGithub('warn', `Discord channel ${discordChannelId} was not found or is not text-based.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setDescription(`# 🌿 **__${repo} Updates__** 🌿\n‎\n### ${commitlink}\n‎\n${middle}\n‎\n${centeredmessage}\n${centeredauthor}\n‎\n${middle}`)
      .setImage(`https://opengraph.githubassets.com/1/${owner}/${repo}`)
      .setColor(0x207e37)
      .setTimestamp(new Date());

    await channel.send({ embeds: [embed] });

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
