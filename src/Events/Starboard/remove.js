const { Events } = require('discord.js');
const db = require('../../Handlers/database'); // Adjust to your DB file

module.exports = {
  name: Events.MessageReactionRemove,

  async execute(reaction, user) {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Failed to fetch reaction:', error);
        return;
      }
    }

    const message = reaction.message;
    const guild = message.guild;
    if (!guild) return;

    const guildId = guild.id;
    const guildName = guild.name;
    const emojiName = reaction.emoji.name;

    try {
      // Fetch starboard settings from database
      const starboardChannelId = await db.starboard.get(`${guildName}_${guildId}_starboardChannel`);
      const requiredCount = await db.starboard.get(`${guildName}_${guildId}_starboardCount`);
      const configuredEmoji = await db.starboard.get(`${guildName}_${guildId}_starboardEmoji`);

      if (!starboardChannelId || !requiredCount || !configuredEmoji) {
        return;
      }

      // Check if the reaction is the configured star emoji
      let emoji;
      if (configuredEmoji.includes(':')) {
        const emojiId = configuredEmoji.split(':')[2]?.slice(0, -1);
        emoji = guild.emojis.cache.get(emojiId);
      } else {
        emoji = configuredEmoji;
      }

      if (reaction.emoji.id !== emoji?.id && reaction.emoji.name !== emoji) {
        return;
      }

      // Load the starboard tracking URL from the db
      const trackingIdKey = `${guildName}_${message.author.username}`;
      const storedUrl = await db.starboardids.get(trackingIdKey);

      if (!storedUrl) {
        return;
      }

      // Extract the message ID from the URL
      const urlParts = storedUrl.split('/');
      const storedMessageId = urlParts[urlParts.length - 1];

      if (storedMessageId !== message.id) {
        return;
      }

      const currentReaction = message.reactions.cache.find(r => r.emoji.name === emojiName);
      const currentCount = currentReaction?.count || 0;

      if (currentCount < requiredCount) {
        const starboardChannel = guild.channels.cache.get(starboardChannelId);
        if (!starboardChannel) {
          return;
        }

        const starboardMessages = await starboardChannel.messages.fetch({ limit: 100 });
        const starboardPost = starboardMessages.find(m =>
          m.content.includes(storedUrl)
        );

        if (starboardPost) {
          await starboardPost.delete();
        } else {
        }

        await db.starboardids.delete(trackingIdKey);
      } else {
      }

    } catch (err) {
      console.error('Error in starboard post cleanup:', err);
    }
  },
};
