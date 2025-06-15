const db = require('../../Handlers/database');

module.exports = async function updateStarboard(reaction) {
  const message = reaction.message;
  const guild = message.guild;
  if (!guild) return;

  const guildId = guild.id;
  const guildName = guild.name;
  const userId = message.author.id;
  const username = message.author.username;

  // Sanitize username by replacing dots with underscores
  const safeUsername = username.replace(/\./g, '_');

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

    // Use sanitized username for key
    const trackingIdKey = `${guildName}_${safeUsername}_${message.id}`;
    const storedUrl = await db.starboardids.get(trackingIdKey);

    // If count is below threshold and message exists, delete it
    if (currentCount < parseInt(starboardCount)) {
      if (storedUrl) {
        const oldId = storedUrl.split('/').pop();
        try {
          const oldMsg = await starboardChannel.messages.fetch(oldId);
          if (oldMsg) await oldMsg.delete();
        } catch (_) {}
        await db.starboardids.delete(trackingIdKey);
      }
      return;
    }

    const authorName = message.author.bot
      ? `${username} [🤖]`
      : username;

    let messageContent = message.content || "_No Message Content_";

    if ( message.stickers.size > 0 ) {

        if ( !message.content ) {

            messageContent = "[ Message contains stickers ]";

        }

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

    // Edit existing starboard post if it exists
    if (storedUrl) {
      const oldId = storedUrl.split('/').pop();
      try {
        const oldMsg = await starboardChannel.messages.fetch(oldId);
        if (oldMsg) {
          await oldMsg.edit({ content: lines.join('\n') });
          return;
        }
      } catch (_) {
        // Message no longer exists
      }
    }

    // Create a new starboard message
    const newMsg = await starboardChannel.send({ content: lines.join('\n') });
    await newMsg.react(emojiForReaction);

    const newUrl = `https://discord.com/channels/${guildId}/${starboardChannel.id}/${newMsg.id}`;
    await db.starboardids.set(trackingIdKey, newUrl);

  } catch (err) {
    console.error('Error in updateStarboard:', err);
  }
};
