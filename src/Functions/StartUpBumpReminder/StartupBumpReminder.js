const db = require("./../../Handlers/database");

module.exports = async (client) => {
  try {
    const allConfigs = Object.entries(await db.bump.all());

    for (const [key, value] of allConfigs) {
      const { channelId, roleId } = value;

      const guildId = key.split('_').pop();
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;

      const guildKey = `${guild.name}_${guild.id}`;
      const cooldownKey = guildKey;

      const lastBump = await db.lastbump.get(cooldownKey);
      if (!lastBump) continue;

      const bumpCooldown = await db.bumpcooldown.get(cooldownKey);
      const reminderDelay = bumpCooldown ?? 2 * 60 * 60 * 1000; // default 2 hours

      const timePassed = Date.now() - lastBump;
      const timeLeft = reminderDelay - timePassed;

      const runReminder = async () => {
        try {
          const channel = await client.channels.fetch(channelId);
          if (!channel) return;
          await channel.send(`<@&${roleId}>\n**It's time to bump the server again! ❤️**`);
          console.log(`[⬆️] [BUMP] Startup reminder sent in ${guild.name}`);
        } catch (err) {
          console.error(`[⬆️] [BUMP] Failed to send startup reminder in ${guild.name}:`, err);
        }
      };

      const MAX_TIMEOUT = 2_147_483_647; // max safe setTimeout

      if (timeLeft <= 0) {
        // Time to send reminder immediately
        await runReminder();
      } else {
        // Schedule reminder respecting max timeout
        setTimeout(runReminder, Math.min(timeLeft, MAX_TIMEOUT));
      }
    }
  } catch (err) {
    console.error(`[⬆️] [BUMP] Error during startup bump sync:`, err);
  }
};
