const { Events } = require('discord.js');
const db = require("../../Handlers/database");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const targetBotId = '302050872383242240'; // Disboard bot ID

    // Load bump channel ID and role ID from DB
    const bumpChannelId = await db.bump.get('channelid');
    const bumpRoleId = await db.bump.get('role.id');

    // Exit if not from Disboard bot or not in the bump channel
    if (message.author.id !== targetBotId) return;
    if (message.channel.id !== bumpChannelId) return;

    try {
      // Send thank you message
      await message.channel.send(`You bumped the Server!\nThank you for Bumping ❤️`);

      const now = Date.now();
      const reminderDelay = 2 * 60 * 60 * 1000; // 2 hours

      // Save cooldown using key: guildName_guildId
      const cooldownKey = `${message.guild.name}_${message.guild.id}`;
      await db.bumpcooldown.save(cooldownKey, now);

      // Schedule reminder
      setTimeout(async () => {
        try {
          const lastBump = await db.bumpcooldown.get(cooldownKey);

          // Make sure 2 hours have passed before sending
          if (Date.now() - lastBump >= reminderDelay) {
            const bumpChannel = await message.client.channels.fetch(bumpChannelId);
            if (bumpChannel) {
              await bumpChannel.send(`<@&${bumpRoleId}> It's time to bump the server again! ❤️`);
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
