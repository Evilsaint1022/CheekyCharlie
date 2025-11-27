require('dotenv').config({ quiet: true });
const fetch = require('node-fetch');
const db = require('../../Handlers/database');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const { loadImage } = require('@napi-rs/canvas');

const owner = 'Evilsaint1022';
const repo = 'CheekyCharlie';
const discordChannelId = '1347795697369350244';
const repoKey = `${owner}_${repo}`;

const space = 'ㅤ'

async function sendCommitNotification(client, commit) {

// Load the welcome template and member avatar
      const repoimagepath = path.join(__dirname, '../../Utilities/Github/repostoredimage.png');
      const repoimage = await loadImage(repoimagepath);

  try {
    const sha = commit?.sha;
    const message = commit?.commit?.message;
    const htmlUrl = commit?.html_url;
    const authorName =
      commit?.commit?.author?.name ||
      commit?.author?.login ||
      'Unknown';

    const top =    `**─────────────────────────────────────**`;
    const middle = `ㅤㅤㅤ· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·ㅤㅤㅤ`;
    const bottom = `**─────────────────────────────────────**`;

    const centeredmessage = `ㅤㅤㅤ**${message}**`;
    const centeredauthor =  `ㅤㅤㅤ🌿**__The Author is ${authorName}__**`;

    if (!sha || !message || !htmlUrl) {
      return;
    }

    const commitlink = `ㅤㅤㅤ[_🔗・COMMIT LINK HERE_](${htmlUrl})`;

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

    if (!repoImageUrl) {
      repoImageUrl = repoimage;
    }

    const embed = new EmbedBuilder()
      .setDescription(`# 🌿 **__${repo} Updates__** 🌿\n${commitlink}\n${middle}\n${centeredmessage}\n${centeredauthor}\n${bottom}`)
      .setImage(repoImageUrl)
      .setColor(0xDE4949)
      .setTimestamp(new Date());

    await channel.send({ embeds: [embed] });

    // Save SHA to DB
    previousCommits.push(sha);
    await db.github.set(repoKey, previousCommits);

  } catch {
  }
}

module.exports = sendCommitNotification;
