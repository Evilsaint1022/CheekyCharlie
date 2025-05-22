const { Events } = require('discord.js');
const db = require("../../Handlers/database");

const reminderDelay = 2 * 60 * 60 * 1000;

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[READY] ${client.user.tag} is online — syncing bump reminders...`);

    try {
      const allConfigs = await db.bump.all(); // Returns [{ key, value }]
      for (const { key, value } of allConfigs) {
        const { channelId, roleId } = value;
        const cooldownKey = key;

        const lastBump = await db.bumpcooldown.get(cooldownKey);
        if (!lastBump) continue;

        const timePassed = Date.now() - lastBump;
        const timeLeft = reminderDelay - timePassed;

        const runReminder = async () => {
          try {
            const channel = await client.channels.fetch(channelId);
            if (channel) {
              await channel.send(`<@&${roleId}>\n**It's time to bump the server again! ❤️**`);
              console.log(`[BUMP] Startup reminder sent in ${channelId}`);
            }
          } catch (err) {
            console.error(`[BUMP] Failed to send startup reminder:`, err);
          }
        };

        if (timeLeft <= 0) {
          await runReminder();
        } else {
          setTimeout(runReminder, timeLeft);
        }
      }
    } catch (err) {
      console.error(`[BUMP] Error during startup bump sync:`, err);
    }
  },
};
