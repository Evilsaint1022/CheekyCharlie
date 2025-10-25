const db = require('../../Handlers/database');

module.exports = async function updateStarboard(reaction) {
  const message = reaction.message;
  const guild = message.guild;
  if (!guild) return;

  const guildId = guild.id;
  const guildName = guild.name;
  const userId = message.author.id;
  const username = message.author.username;

  const safeUsername = username.replace(/\./g, '_');
  const messageId = message.id;
  const guildKey = `${guildName}_${guildId}`; // Guild key for storage

  function padText(text, padLength = 3) {
        return `${space}`.repeat(padLength) + text + `${space}`.repeat(padLength);
        }

        const space = 'ㅤ'

  try {
    const config = await db.starboard.get(guildKey);
    if (!config || !config.starboardChannel || !config.starboardEmoji || !config.starboardCount) return;

    const { starboardChannel, starboardEmoji, starboardCount } = config;

    const starboardChannelObj = guild.channels.cache.get(starboardChannel);
    if (!starboardChannelObj || message.channel.id === starboardChannel) return;

    let emojiName = starboardEmoji;
    let emojiForReaction = starboardEmoji;

    if (starboardEmoji.includes(':')) {
      const emojiId = starboardEmoji.split(':')[2]?.slice(0, -1);
      const emoji = guild.emojis.cache.get(emojiId);
      if (!emoji) return;
      emojiName = emoji.name;
      emojiForReaction = emoji;
    }

    const emojiInCache = guild.emojis.cache.find(e => e.name === emojiName);
    const matchedEmoji =
      reaction.emoji.name === emojiName || reaction.emoji.id === emojiInCache?.id;

    if (!matchedEmoji) return;

    const currentReaction = message.reactions.cache.find(r =>
      r.emoji.name === emojiName || r.emoji.id === emojiInCache?.id
    );
    const currentCount = currentReaction?.count || 0;

    const trackingList = (await db.starboardids.get(guildKey)) || [];

    const entryIndex = trackingList.findIndex(entry =>
      entry.user === safeUsername && entry.messageId === messageId
    );

    const storedUrl = entryIndex !== -1 ? trackingList[entryIndex].url : null;

    if (currentCount < parseInt(starboardCount)) {
      if (storedUrl) {
        const oldId = storedUrl.split('/').pop();
        try {
          const oldMsg = await starboardChannelObj.messages.fetch(oldId);
          if (oldMsg) await oldMsg.delete();
        } catch (_) {}
        trackingList.splice(entryIndex, 1);
        await db.starboardids.set(guildKey, trackingList);
      }
      return;
    }

    const authorName = message.author.bot
      ? `${username} [🤖]`
      : username;

    let messageContent = message.content || "_No Message Content_";

    if (message.stickers.size > 0 && !message.content) {
      messageContent = "[ Message contains stickers ]";
    }

    const middle = padText(`· · - ┈┈━━ ˚ . 🌿 . ˚ ━━┈┈ - · ·`);

    const lines = [
      `**╭───────── 🌿 STARBOARD ──────────╮**`,
      padText(`${space}`),
      `${middle}`,
      padText(`${space}`),
      padText(`${starboardEmoji} | **${currentCount}** | ${message.url}`),
      padText(`**Author:** ${authorName}`),
      `ㅤㅤㅤ**Content:** ${messageContent}`,
      padText(`${space}`),
      `${middle}`,
      padText(`${space}`),
      `**╰─────────────────────────────────╯**`,
    ];

    if (message.attachments.size > 0) {
      lines.push(`**Attachments:**`);
      for (const attachment of message.attachments.values()) {
        lines.push(attachment.url);
      }
    }

    if (storedUrl) {
      const oldId = storedUrl.split('/').pop();
      try {
        const oldMsg = await starboardChannelObj.messages.fetch(oldId);
        if (oldMsg) {
          await oldMsg.edit({ content: lines.join('\n') });
          return;
        }
      } catch (_) {
        // Continue to post a new one if original is deleted
      }
    }

    const newMsg = await starboardChannelObj.send({ content: lines.join('\n') });
    await newMsg.react(emojiForReaction);

    const newUrl = `https://discord.com/channels/${guildId}/${starboardChannelObj.id}/${newMsg.id}`;

    if (entryIndex !== -1) {
      trackingList[entryIndex].url = newUrl;
    } else {
      trackingList.push({
        user: safeUsername,
        messageId,
        url: newUrl
      });
    }

    await db.starboardids.set(guildKey, trackingList);

  } catch (err) {
    console.error('Error in updateStarboard:', err);
  }
};