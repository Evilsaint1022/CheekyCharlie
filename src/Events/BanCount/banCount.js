const { Events } = require('discord.js');
const db = require('../../Handlers/database'); // Main DB handler

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const guild = message.guild;
    const guildKey = `${guild.name}_${guild.id}`;
    const currentChannelId = message.channel.id;

    // Get ban channel from settings
    const guildSettings = await db.settings.get(guildKey);
    const banChannelId = guildSettings?.ban_channel;

    // If no ban channel set or message is NOT in the ban channel, ignore
    if (!banChannelId || currentChannelId !== banChannelId) return;

    // If message does not start with ^banned, delete it
    if (!message.content.startsWith('^banned')) {
      await message.delete().catch(() => {});
      return;
    }

    // Get last ban user ID
    const lastBanData = await db.lastban.get(guildKey);

    // If same user tries to send twice in a row, delete message and reply with warning
    if (lastBanData?.lastUserId === message.author.id) {
      await message.delete().catch(() => {});

      const reply = await message.channel.send({
        content: `⛔ You can't send a message twice in a row!\n\nPlease wait for another user to send a message.`,
        allowedMentions: { repliedUser: false }
      });

      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 5000);

      return;
    }

    // React with ✅ and update last ban
    await message.react('✅').catch(() => null);

    await db.lastban.set(guildKey, {
      lastUserId: message.author.id,
      timestamp: Date.now()
    });
  }
};
