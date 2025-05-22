const { Events } = require('discord.js');
const db = require("../../Handlers/database");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const targetBotId = '302050872383242240'; // Disboard bot ID

    // Ensure it's in a guild
    if (!message.guild) return;

    const guildKey = `${message.guild.name}_${message.guild.id}`;

    try {
      const bumpData = await db.bump.get(guildKey);

      if (!bumpData || !bumpData.channelId || !bumpData.roleId) {
        console.log(`[BUMP] Missing bump config for: ${guildKey}`);
        return;
      }

      const bumpChannelId = bumpData.channelId;
      const bumpRoleId = bumpData.roleId;

      // Exit if not from Disboard bot or not in the bump channel
      if (message.author.id !== targetBotId) return;
      if (message.channel.id !== bumpChannelId) return;

      console.log(`[BUMP] Valid bump detected in ${guildKey}`);

      // Send thank you message
      await message.channel.send(`You bumped the Server!\nThank you for Bumping ❤️`);

      const now = Date.now();
      const reminderDelay = 2 * 60 * 60 * 1000; // 2 hours — change to 10 * 1000 for testing

      const cooldownKey = `${message.guild.name}_${message.guild.id}`;
      await db.bumpcooldown.set(cooldownKey, now);
      await db.lastbump.set(cooldownKey, now);

      // Schedule reminder
      setTimeout(async () => {
        try {
          console.log(`[BUMP] Reminder timer triggered for ${guildKey}`);

          const lastBump = await db.bumpcooldown.get(cooldownKey);
          console.log(`[BUMP] Last bump timestamp: ${lastBump}`);

          const timePassed = Date.now() - lastBump;
          if (timePassed >= reminderDelay) {
            const bumpChannel = await message.client.channels.fetch(bumpChannelId).catch(err => {
              console.error(`[BUMP] Failed to fetch bumpChannel (${bumpChannelId}):`, err);
              return null;
            });

            if (bumpChannel) {
              const reminderMsg = `<@&${bumpRoleId}>\n**It's time to bump the server again! ❤️**`;

              bumpChannel.send(reminderMsg).catch(err => {
                console.error(`[BUMP] Failed to send bump reminder in ${bumpChannelId}:`, err);
              });
            } else {
              console.warn(`[BUMP] Could not send reminder, bumpChannel is null`);
            }
          }
        } catch (reminderError) {
          console.error('[BUMP] Failed during reminder timeout:', reminderError);
        }
      }, reminderDelay);
    } catch (error) {
      console.error('[BUMP] Failed to handle bump message:', error);
    }
  },
};
