const { Events } = require('discord.js');
const db = require("../../Handlers/database");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const targetBotId = '302050872383242240'; // Disboard bot ID

    const guildKey = `${message.guild.name}_${message.guild.id}`;

    try {
      const bumpData = await db.bump.get(guildKey);

      if (!bumpData || !bumpData.channelId || !bumpData.roleId) {
        return;
      }

      const bumpChannelId = bumpData.channelId;
      const bumpRoleId = bumpData.roleId;

      // Exit if not from Disboard bot or not in the bump channel
      if (message.author.id !== targetBotId) return;
      if (message.channel.id !== bumpChannelId) return;

      // Send thank you message
      await message.channel.send(`You bumped the Server!\nThank you for Bumping ❤️`);

      const now = Date.now();
      const reminderDelay = 2 * 60 * 60 * 1000; // 2 hours

      const cooldownKey = `${message.guild.name}_${message.guild.id}`;
      await db.bumpcooldown.set(cooldownKey, now);
      await db.lastbump.set(cooldownKey, now); // ✅ Store bump time in lastbump.json

      // Schedule reminder
      setTimeout(async () => {
        try {
          const lastBump = await db.bumpcooldown.get(cooldownKey);
          const timePassed = Date.now() - lastBump;

          if (timePassed >= reminderDelay) {
            const bumpChannel = await message.client.channels.fetch(bumpChannelId);
            if (bumpChannel) {
              await bumpChannel.send(`<@&${bumpRoleId}>\n**It's time to bump the server again! ❤️**`);
            }
          }
        } catch (reminderError) {
          console.error('Failed to send bump reminder:', reminderError);
        }
      }, reminderDelay);
    } catch (error) {
      console.error('Failed to handle bump message:', error);
    }
  },
};
