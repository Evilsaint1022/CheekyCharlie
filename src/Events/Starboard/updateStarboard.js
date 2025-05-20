const db = require('../../Handlers/database');

module.exports = async function updateStarboard(reaction) {
  const message = reaction.message;
  const guild = message.guild;
  if (!guild) return;

  const guildId = guild.id;
  const guildName = guild.name;

  try {
    const [starboardChannelId, configuredEmoji] = await Promise.all([
      db.starboard.get(`${guildName}_${guildId}_starboardChannel`),
      db.starboard.get(`${guildName}_${guildId}_starboardEmoji`),
    ]);

    if (!starboardChannelId || !configuredEmoji) return;

    const starboardChannel = guild.channels.cache.get(starboardChannelId);
    if (!starboardChannel || message.channel.id === starboardChannelId) return;

    // Get emoji name/id
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
      reaction.emoji.name === emojiName ||
      reaction.emoji.id === emojiInCache?.id;

    if (!matchedEmoji) return;

    const currentReaction = message.reactions.cache.find(r =>
      r.emoji.name === emojiName || r.emoji.id === emojiInCache?.id
    );
    const currentCount = currentReaction?.count || 0;

    const trackingIdKey = `𝐅𝐨𝐮𝐫-𝐒𝐪𝐮𝐚𝐫𝐞_${message.author.username}`;
    const storedUrl = await db.starboardids.get(trackingIdKey);

    // Remove if reaction count dropped to 0
    if (currentCount === 0 && storedUrl) {
      const oldId = storedUrl.split('/').pop();
      try {
        const oldMsg = await starboardChannel.messages.fetch(oldId);
        if (oldMsg) await oldMsg.delete();
      } catch (_) {}
      await db.starboardids.delete(trackingIdKey);
      return;
    }

    // Otherwise, delete previous and repost with updated count
    if (storedUrl) {
      const oldId = storedUrl.split('/').pop();
      try {
        const oldMsg = await starboardChannel.messages.fetch(oldId);
        if (oldMsg) await oldMsg.delete();
      } catch (_) {}
      await db.starboardids.delete(trackingIdKey);
    }

    const authorName = message.author.bot
      ? `${message.author.username} [🤖]`
      : message.author.username;

    const lines = [
      `${reaction.emoji.toString()} | **${currentCount}** | ${message.url}`,
      `**Author:** ${authorName}`,
      `**Content:** ${message.content || "_No Message Content_"}`,
    ];

    if (message.attachments.size > 0) {
      lines.push(`**Attachments:**`);
      for (const attachment of message.attachments.values()) {
        lines.push(attachment.url);
      }
    }

    const newMsg = await starboardChannel.send({ content: lines.join('\n') });
    await newMsg.react(emojiForReaction);

    const newUrl = `https://discord.com/channels/${guildId}/${starboardChannel.id}/${newMsg.id}`;
    await db.starboardids.set(trackingIdKey, newUrl);

  } catch (err) {
    console.error('Error in updateStarboard:', err);
  }
};
