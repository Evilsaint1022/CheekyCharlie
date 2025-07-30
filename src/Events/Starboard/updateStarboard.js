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

  try {
    const [
      starboardChannelId,
      configuredEmoji,
      starboardCount
    ] = await Promise.all([
      db.starboard.get(`${guildName}_${guildId}_starboardChannel`),
      db.starboard.get(`${guildName}_${guildId}_starboardEmoji`),
      db.starboard.get(`${guildName}_${guildId}_starboardCount`),
    ]);

    if (!starboardChannelId || !configuredEmoji || !starboardCount) return;

    const starboardChannel = guild.channels.cache.get(starboardChannelId);
    if (!starboardChannel || message.channel.id === starboardChannelId) return;

    let emojiName = configuredEmoji;
    let emojiForReaction = configuredEmoji;

    if (configuredEmoji.includes(':')) {
      const emojiId = configuredEmoji.split(':')[2]?.slice(0, -1);
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

    // Load current tracking list for the guild
    const trackingList = (await db.starboardids.get(guildKey)) || [];

    const entryIndex = trackingList.findIndex(entry =>
      entry.user === safeUsername && entry.messageId === messageId
    );

    const storedUrl = entryIndex !== -1 ? trackingList[entryIndex].url : null;

    if (currentCount < parseInt(starboardCount)) {
      // Below threshold, delete from starboard and remove entry
      if (storedUrl) {
        const oldId = storedUrl.split('/').pop();
        try {
          const oldMsg = await starboardChannel.messages.fetch(oldId);
          if (oldMsg) await oldMsg.delete();
        } catch (_) {}
        trackingList.splice(entryIndex, 1); // Remove entry from array
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

    const lines = [
      `${reaction.emoji.toString()} | **${currentCount}** | ${message.url}`,
      `**Author:** ${authorName}`,
      `**Content:** ${messageContent}`,
    ];

    if (message.attachments.size > 0) {
      lines.push(`**Attachments:**`);
      for (const attachment of message.attachments.values()) {
        lines.push(attachment.url);
      }
    }

    // Edit old starboard post if it exists
    if (storedUrl) {
      const oldId = storedUrl.split('/').pop();
      try {
        const oldMsg = await starboardChannel.messages.fetch(oldId);
        if (oldMsg) {
          await oldMsg.edit({ content: lines.join('\n') });
          return;
        }
      } catch (_) {
        // Post is missing, fallthrough to recreate it
      }
    }

    // Create a new starboard message
    const newMsg = await starboardChannel.send({ content: lines.join('\n') });
    await newMsg.react(emojiForReaction);

    const newUrl = `https://discord.com/channels/${guildId}/${starboardChannel.id}/${newMsg.id}`;

    // Save or update entry
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
