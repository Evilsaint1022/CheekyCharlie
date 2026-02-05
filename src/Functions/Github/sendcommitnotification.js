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
const repoImagePath = path.join(__dirname, '../../Utilities/Github/repostoredimage.png');
const repoImage = await loadImage(repoImagePath);

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
    const centeredauthor =  `ㅤㅤㅤ🌿**${authorName}**🌿`;

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
      console.warn(`[⭐] [Github] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}]  Commit ${sha} already posted. Skipping.`);
      return;
    }

    // Fetch the Discord channel
    const channel = await client.channels.fetch(discordChannelId);
    if (!channel) {
      console.warn(
        `[⭐] [Github] [${new Date().toLocaleDateString('en-GB')}] [${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] Discord channel with ID ${discordChannelId} not found.`);
      return;
    }

    let repoImageUrl;

    if (owner && repo) {
      repoImageUrl = `https://opengraph.githubassets.com/1/${owner}/${repo}`;
    } else {
      repoImageUrl = repoImage;
    }

    console.log(
                `[⭐] [GITHUB] [${new Date().toLocaleDateString('en-GB')}] ` +
                `[${new Date().toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland" })}] ` +
                `Sending a new commit message in ${discordChannelId} - ${repoKey}: ${htmlUrl} `
            );

    const embed = new EmbedBuilder()
      .setDescription(`# 🌿**__${repo} Repo Updates__**🌿\nㅤ\n${commitlink}\nㅤ\n${middle}\n${centeredmessage}\nㅤ\n${centeredauthor}\n${bottom}`)
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
