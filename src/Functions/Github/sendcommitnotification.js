require('dotenv').config({ quiet: true });
const fetch = require('node-fetch');
const db = require('../../Handlers/database');
const { EmbedBuilder } = require('discord.js');

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

    const top = `╭─── 🌿 ${repo} - Updates ───╮`;
    const middle = padText(`· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`);
    const bottom = `╰─────────────────────────────────╯`;

    const centeredmessage = padText(`${message}`);

    function padText(text, padLength = 3) {
        return `${space}`.repeat(padLength) + text + `${space}`.repeat(padLength);
        }

        const space = 'ㅤ'

    if (!sha || !message || !htmlUrl) {
      return;
    }

    const commitlink = padText(`[_🔗COMMIT LINK HERE_](${htmlUrl})`);

    // Load previously saved commits
    let previousCommits = await db.github.get(repoKey);
    if (!Array.isArray(previousCommits)) {
      previousCommits = previousCommits ? [previousCommits] : [];
    }

    // Skip if already sent
    if (previousCommits.includes(sha)) {
      console.warn(`[Github] Commit ${sha} already posted. Skipping.`);
      return;
    }

    // Fetch the Discord channel
    const channel = await client.channels.fetch(discordChannelId);
    if (!channel) {
      console.warn(`[Github] Discord channel with ID ${discordChannelId} not found.`);
      return;
    }

    // Construct the embed
    const repoImageUrl = `https://opengraph.githubassets.com/1/${owner}/${repo}`;
    const embed = new EmbedBuilder()
      .setTitle(`**${top}**`)
      .setDescription(`\n\n${commitlink}\n\n${middle}\n\`${centeredmessage}\`\n${middle}\n\n**By ${authorName}**\n\n**${bottom}**`)
      .setImage(repoImageUrl)
      .setColor(0xFFFFFF)
      .setTimestamp(new Date());

    await channel.send({ embeds: [embed] });

    // Save SHA to DB
    previousCommits.push(sha);
    await db.github.set(repoKey, previousCommits);

  } catch {
    // No logging here per request (all console.error removed)
  }
}

module.exports = sendCommitNotification;
