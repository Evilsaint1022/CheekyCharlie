const { Events } = require('discord.js');
const db = require("../../Handlers/database");

const reminderDelay = 2 * 60 * 60 * 1000; // 2 hours
const reminderCheckInterval = 5 * 60 * 1000; // 5 minutes

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    const targetBotId = '302050872383242240';
    if (!message.guild) return;

    const guildKey = `${message.guild.name}_${message.guild.id}`;
    const cooldownKey = guildKey;

    try {
      const bumpDb = await db.bump.get();
      const bumpData = bumpDb[guildKey];
      if (!bumpData || !bumpData.channelId) return;

      const { channelId, roleId } = bumpData;

      if (message.author.id !== targetBotId || message.channel.id !== channelId) return;

      console.log(`[⬆️] [BUMP] ${guildKey} - Valid Bump Detected`);
      await message.channel.send(`**You bumped the Server!**\n**Thank you for Bumping ❤️**`);

      const now = Date.now();
      const userId = message.interaction?.user?.id || message.mentions.users.first()?.id || message.author.id;

      await db.lastbump.set(cooldownKey, {
        timestamp: now,
        userId,
        reminderSent: false
      });
    } catch (err) {
      console.error(`[⬆️] [BUMP] Error handling bump message:`, err);
    }
  },
};

module.exports.scheduleReminderLoop = function scheduleReminderLoop(client) {
  setInterval(async () => {
    const allBumps = await db.lastbump.get();
    const bumpDb = await db.bump.get();
    if (!allBumps || !bumpDb) return;

    const now = Date.now();

    for (const [cooldownKey, bumpInfo] of Object.entries(allBumps)) {
      const bumpData = bumpDb[cooldownKey];
      if (!bumpData || !bumpData.channelId) continue;

      const { channelId, roleId } = bumpData;
      const { timestamp, userId, reminderSent } = bumpInfo;

      if (!timestamp || !userId) continue;

      const timePassed = now - timestamp;

      if (timePassed >= reminderDelay && !reminderSent) {
        try {
          const channel = await client.channels.fetch(channelId);
          if (!channel) continue;

          const mention = roleId ? `<@&${roleId}>` : `<@${userId}>`;
          await channel.send(`${mention}\n**It's time to bump the server again! ❤️**`);
          console.log(`[⬆️] [BUMP] Reminder sent for ${cooldownKey}`);

          await db.lastbump.set(cooldownKey, {
            ...bumpInfo,
            reminderSent: true
          });
        } catch (err) {
          console.error(`[⬆️] [BUMP] Failed to send reminder for ${cooldownKey}:`, err);
        }
      }
    }
  }, reminderCheckInterval);
};
